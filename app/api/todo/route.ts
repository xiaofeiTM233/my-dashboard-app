import type { NextRequest } from "next/server";

/**
 * 滴答清单 Open API 代理（最近 7 天 + 置顶）。
 *
 * 环境变量：
 *   DIDA_ACCESS_TOKEN  必填
 *   DIDA_API_BASE      可选，默认 https://api.dida365.com/open/v1
 */

const API_BASE = (
  process.env.DIDA_API_BASE || "https://api.dida365.com/open/v1"
).replace(/\/+$/, "");

const UPSTREAM_TIMEOUT = 15_000;

export const dynamic = "force-dynamic";

interface TickTickTask {
  id: string;
  title: string;
  content?: string;
  desc?: string;
  dueDate?: string | null;
  startDate?: string | null;
  status?: number;
  completedTime?: string | null;
  projectId?: string;
  priority?: number;
  tags?: string[];
  timeZone?: string;
  isAllDay?: boolean;
  parent?: string | null;
  pinned?: boolean;
  reminders?: string[];
  repeatFlag?: string;
}

interface TickTickProject {
  id: string;
  name: string;
  kind?: string;
  closed?: boolean;
  color?: string;
  sortOrder?: number;
}

export interface TodoTaskDto {
  id: string;
  title: string;
  status: number;
  dueDate?: string;
  startDate?: string;
  isAllDay: boolean;
  projectId: string;
  projectName: string;
  projectColor: string;
  priority: number;
  tags: string[];
  pinned: boolean;
  hasReminder: boolean;
  hasSub: boolean;
  parentId?: string;
  /** 本地日历日 YYYY-MM-DD，用于分组 */
  dayKey: string;
  /** HH:mm，全天任务为空 */
  time: string;
  overdue: boolean;
}

export interface TodoGroupDto {
  key: string;
  title: string;
  subtitle: string;
  count: number;
  tasks: TodoTaskDto[];
}

export interface TodoListPayload {
  days: number;
  total: number;
  groups: TodoGroupDto[];
  inboxId: string | null;
  projects: { id: string; name: string; color: string }[];
}

export interface TodoDetailDto {
  id: string;
  title: string;
  content: string;
  desc: string;
  status: number;
  dueDate?: string;
  startDate?: string;
  isAllDay: boolean;
  projectId: string;
  projectName: string;
  projectColor: string;
  priority: number;
  tags: string[];
  pinned: boolean;
  hasReminder: boolean;
  repeatFlag?: string;
  completedTime?: string;
  time: string;
  dayKey: string;
  overdue: boolean;
}

function authHeaders() {
  const token = process.env.DIDA_ACCESS_TOKEN;
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function GET(request: NextRequest) {
  const headers = authHeaders();
  if (!headers) {
    return fail("未配置环境变量 DIDA_ACCESS_TOKEN", 500);
  }

  const { searchParams } = request.nextUrl;
  const taskId = searchParams.get("id");
  const projectId = searchParams.get("projectId");

  // 单任务详情：GET /open/v1/project/{projectId}/task/{taskId}
  if (taskId) {
    if (!projectId) {
      return fail("缺少 projectId", 400);
    }
    try {
      const detail = await fetchTaskDetail(headers, projectId, taskId);
      return Response.json(
        { ok: true, data: detail },
        { headers: { "Cache-Control": "no-store" } },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取任务详情失败";
      return fail(message, 502);
    }
  }

  const days = Math.min(Math.max(Number(searchParams.get("days")) || 7, 1), 14);

  try {
    const payload = await buildListPayload(headers, days);
    return ok(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "请求滴答清单失败";
    return fail(message, 502);
  }
}

export async function POST(request: NextRequest) {
  const headers = authHeaders();
  if (!headers) {
    return fail("未配置环境变量 DIDA_ACCESS_TOKEN", 500);
  }

  let body: { title?: string; dueDate?: string; projectId?: string };
  try {
    body = await request.json();
  } catch {
    return fail("请求体不是合法 JSON", 400);
  }

  const title = (body.title ?? "").trim();
  if (!title) return fail("任务标题不能为空", 400);

  try {
    const payload: Record<string, unknown> = { title };
    if (body.projectId) payload.projectId = body.projectId;
    if (body.dueDate) payload.dueDate = body.dueDate;

    const res = await fetch(`${API_BASE}/task`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`创建任务失败（${res.status}）`);
    }
    const created = await res.json();
    return Response.json(
      { ok: true, data: created },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "创建任务失败";
    return fail(message, 502);
  }
}

export async function PATCH(request: NextRequest) {
  const headers = authHeaders();
  if (!headers) {
    return fail("未配置环境变量 DIDA_ACCESS_TOKEN", 500);
  }

  let body: {
    id?: string;
    projectId?: string;
    status?: number;
    title?: string;
    tasks?: { id: string; projectId: string }[];
  };
  try {
    body = await request.json();
  } catch {
    return fail("请求体不是合法 JSON", 400);
  }

  // 批量完成：{ status: 2, tasks: [{ id, projectId }] }
  if (Array.isArray(body.tasks) && body.tasks.length > 0) {
    if (body.status !== 2) {
      return fail("批量操作仅支持完成任务（status=2）", 400);
    }
    if (body.tasks.length > 100) {
      return fail("单次最多批量完成 100 项", 400);
    }
    // 限制并发，避免突发请求触发上游限流
    const queue = [...body.tasks];
    const failedIds: string[] = [];
    let success = 0;
    const worker = async () => {
      while (queue.length > 0) {
        const t = queue.shift()!;
        try {
          await completeTask(headers, t.projectId, t.id);
          success += 1;
        } catch {
          failedIds.push(t.id);
        }
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    return Response.json(
      { ok: true, data: { success, failed: failedIds.length, failedIds } },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const id = body.id;
  if (!id) return fail("缺少任务 id", 400);
  const projectId = body.projectId;
  if (!projectId) return fail("缺少 projectId", 400);

  try {
    // 完成任务：POST /open/v1/project/{projectId}/task/{taskId}/complete
    if (body.status === 2) {
      await completeTask(headers, projectId, id);
      return Response.json(
        { ok: true, data: { id, status: 2 } },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // 取消完成 / 改标题：先按文档路径读任务，再 POST /open/v1/task/{taskId}
    const getRes = await fetch(
      `${API_BASE}/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(id)}`,
      { headers, cache: "no-store" },
    );
    if (!getRes.ok) {
      const text = await getRes.text().catch(() => "");
      throw new Error(
        `读取任务失败（${getRes.status}）${text ? `: ${text.slice(0, 200)}` : ""}`,
      );
    }
    const task = (await getRes.json()) as TickTickTask;

    const next: Record<string, unknown> = {
      id,
      projectId,
      title: (typeof body.title === "string" && body.title.trim()) || task.title,
      priority: task.priority ?? 0,
      status: typeof body.status === "number" ? body.status : task.status ?? 0,
      isAllDay: Boolean(task.isAllDay),
      timeZone: task.timeZone || "Asia/Shanghai",
      tags: task.tags ?? [],
    };
    if (task.dueDate) next.dueDate = task.dueDate;
    if (task.startDate) next.startDate = task.startDate;
    if (task.content) next.content = task.content;
    if (task.desc) next.desc = task.desc;
    if (task.reminders) next.reminders = task.reminders;
    if (task.repeatFlag) next.repeatFlag = task.repeatFlag;
    if (typeof body.status === "number" && body.status === 0) {
      next.completedTime = null;
    } else if (task.completedTime) {
      next.completedTime = task.completedTime;
    }

    const updateRes = await fetch(`${API_BASE}/task/${encodeURIComponent(id)}`, {
      method: "POST",
      headers,
      body: JSON.stringify(next),
    });
    if (!updateRes.ok) {
      const text = await updateRes.text().catch(() => "");
      throw new Error(
        `更新任务失败（${updateRes.status}）${text ? `: ${text.slice(0, 200)}` : ""}`,
      );
    }
    const updated = await updateRes.json();
    return Response.json(
      { ok: true, data: updated },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新任务失败";
    return fail(message, 502);
  }
}

async function completeTask(
  headers: Record<string, string>,
  projectId: string,
  id: string,
) {
  // 文档：POST /open/v1/project/{projectId}/task/{taskId}/complete
  const res = await fetch(
    `${API_BASE}/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(id)}/complete`,
    { method: "POST", headers },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `完成任务失败（${res.status}）${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }
}

async function fetchTaskDetail(
  headers: Record<string, string>,
  projectId: string,
  taskId: string,
): Promise<TodoDetailDto> {
  // 文档：GET /open/v1/project/{projectId}/task/{taskId}
  const res = await fetch(
    `${API_BASE}/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`,
    { headers, cache: "no-store" },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `获取任务详情失败（${res.status}）${text ? `: ${text.slice(0, 200)}` : ""}`,
    );
  }
  const task = (await res.json()) as TickTickTask;

  let projectName = "收集箱";
  let projectColor = "#A6A6A6";
  const pRes = await fetch(
    `${API_BASE}/project/${encodeURIComponent(projectId)}`,
    { headers, cache: "no-store" },
  );
  if (pRes.ok) {
    const project = (await pRes.json()) as TickTickProject;
    projectName = project.name || projectName;
    projectColor = normalizeColor(project.color);
  }

  const due = parseDate(task.dueDate);
  const start = parseDate(task.startDate);
  const anchor = due ?? start;
  const now = Date.now();

  return {
    id: task.id,
    title: (task.title ?? "").trim() || "无标题",
    content: task.content ?? "",
    desc: task.desc ?? "",
    status: task.status ?? 0,
    dueDate: task.dueDate ?? undefined,
    startDate: task.startDate ?? undefined,
    isAllDay: Boolean(task.isAllDay),
    projectId,
    projectName,
    projectColor,
    priority: typeof task.priority === "number" ? task.priority : 0,
    tags: task.tags ?? [],
    pinned: Boolean(task.pinned),
    hasReminder: (task.reminders?.length ?? 0) > 0,
    repeatFlag: task.repeatFlag || undefined,
    completedTime: task.completedTime ?? undefined,
    time: formatTime(anchor, task.isAllDay),
    dayKey: anchor ? formatDayKey(anchor) : "",
    overdue:
      anchor != null &&
      !isSameDay(anchor, new Date()) &&
      anchor.getTime() < now &&
      (task.status ?? 0) !== 2,
  };
}

async function buildListPayload(
  headers: Record<string, string>,
  days: number,
): Promise<TodoListPayload> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT);

  try {
    const projectsRes = await fetch(`${API_BASE}/project`, {
      cache: "no-store",
      signal: controller.signal,
      headers,
    });
    if (!projectsRes.ok) {
      throw new Error(`获取项目列表失败（${projectsRes.status}）`);
    }
    const projects = ((await projectsRes.json()) as TickTickProject[]) ?? [];
    const liveProjects = projects.filter((p) => !p.closed);
    const projectMap = new Map(liveProjects.map((p) => [p.id, p]));
    const inbox = liveProjects.find((p) => p.kind === "inbox") ?? null;

    const fetched = await Promise.allSettled(
      liveProjects.map(async (project) => {
        const res = await fetch(
          `${API_BASE}/project/${encodeURIComponent(project.id)}/data`,
          {
            cache: "no-store",
            signal: controller.signal,
            headers,
          },
        );
        if (!res.ok) return { project, tasks: [] as TickTickTask[] };
        const data = (await res.json()) as { tasks?: TickTickTask[] };
        return { project, tasks: data.tasks ?? [] };
      }),
    );

    const allTasks: TickTickTask[] = [];
    for (const result of fetched) {
      if (result.status === "fulfilled") {
        allTasks.push(...result.value.tasks);
      }
    }

    const range = getDayRange(days);
    const now = Date.now();

    const dtoList: TodoTaskDto[] = [];
    for (const task of allTasks) {
      if (task.status === 2) continue;
      if (task.parent) continue; // 子任务先不单独展示，避免与父任务重复

      const project = task.projectId
        ? projectMap.get(task.projectId)
        : undefined;
      const due = parseDate(task.dueDate);
      const start = parseDate(task.startDate);
      const anchor = due ?? start;
      const dayKey = anchor ? formatDayKey(anchor) : "";
      const pinned = Boolean(task.pinned);
      const inRange =
        anchor != null &&
        anchor.getTime() >= range.start.getTime() &&
        anchor.getTime() < range.end.getTime();

      // 无日期且未置顶的不进「最近 7 天」；有日期但已过期也展示
      const overdue =
        anchor != null && !isSameDay(anchor, new Date()) && anchor.getTime() < now;

      if (!pinned && !inRange && !overdue) continue;
      if (!pinned && !anchor) continue;

      dtoList.push({
        id: task.id,
        title: (task.title ?? "").trim() || "无标题",
        status: task.status ?? 0,
        dueDate: task.dueDate ?? undefined,
        startDate: task.startDate ?? undefined,
        isAllDay: Boolean(task.isAllDay),
        projectId: task.projectId || inbox?.id || "",
        projectName: project?.name || "收集箱",
        projectColor: normalizeColor(project?.color),
        priority: typeof task.priority === "number" ? task.priority : 0,
        tags: task.tags ?? [],
        pinned,
        hasReminder: (task.reminders?.length ?? 0) > 0,
        hasSub: allTasks.some((child) => child.parent === task.id),
        parentId: task.parent ?? undefined,
        dayKey,
        time: formatTime(anchor, task.isAllDay),
        overdue: overdue && !pinned,
      });
    }

    const pinnedTasks = dtoList
      .filter((t) => t.pinned)
      .sort((a, b) => compareTask(a, b, true));

    const byDay = new Map<string, TodoTaskDto[]>();
    for (const task of dtoList) {
      if (task.pinned || !task.dayKey) continue;
      const list = byDay.get(task.dayKey) ?? [];
      list.push(task);
      byDay.set(task.dayKey, list);
    }

    const groups: TodoGroupDto[] = [];
    if (pinnedTasks.length > 0) {
      groups.push({
        key: "pinned",
        title: "已置顶",
        subtitle: "",
        count: pinnedTasks.length,
        tasks: pinnedTasks,
      });
    }

    for (let i = 0; i < range.keys.length; i++) {
      const key = range.keys[i];
      const tasks = (byDay.get(key) ?? []).sort((a, b) =>
        compareTask(a, b, i === 0),
      );
      if (tasks.length === 0) continue;
      const date = range.dates[i];
      groups.push({
        key,
        title: range.titles[i],
        subtitle: WEEKDAYS[date.getDay()],
        count: tasks.length,
        tasks,
      });
    }

    // 已逾期但不在未来 N 天窗口里的，补在置顶后、今天前
    const overdueTasks = dtoList
      .filter((t) => t.overdue && !t.pinned && t.dayKey && !range.keySet.has(t.dayKey))
      .sort((a, b) => compareTask(a, b, false));
    if (overdueTasks.length > 0) {
      groups.splice(pinnedTasks.length > 0 ? 1 : 0, 0, {
        key: "overdue",
        title: "已逾期",
        subtitle: "",
        count: overdueTasks.length,
        tasks: overdueTasks,
      });
    }

    const total = groups.reduce((sum, g) => sum + g.count, 0);

    return {
      days,
      total,
      groups,
      inboxId: inbox?.id ?? null,
      projects: liveProjects.map((p) => ({
        id: p.id,
        name: p.name,
        color: normalizeColor(p.color),
      })),
    };
  } finally {
    clearTimeout(timer);
  }
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function getDayRange(days: number) {
  const start = startOfDay(new Date());
  const dates: Date[] = [];
  const keys: string[] = [];
  const titles: string[] = [];
  const keySet = new Set<string>();

  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
    const key = formatDayKey(d);
    keys.push(key);
    keySet.add(key);
    if (i === 0) titles.push("今天");
    else if (i === 1) titles.push("明天");
    else titles.push(`${d.getMonth() + 1}月${d.getDate()}日`);
  }

  const end = new Date(start);
  end.setDate(start.getDate() + days);
  return { start, end, dates, keys, titles, keySet };
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatTime(anchor: Date | null, isAllDay?: boolean): string {
  if (!anchor || isAllDay) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(anchor.getHours())}:${pad(anchor.getMinutes())}`;
}

function normalizeColor(color?: string): string {
  if (!color) return "#A6A6A6";
  if (color.startsWith("#")) return color;
  return `#${color}`;
}

function compareTask(a: TodoTaskDto, b: TodoTaskDto, todayFirst: boolean) {
  // 按时间排序，同时间再按优先级
  const ta = a.dueDate || a.startDate || "";
  const tb = b.dueDate || b.startDate || "";
  if (ta !== tb) {
    if (!ta) return 1;
    if (!tb) return -1;
    return ta < tb ? -1 : 1;
  }

  if (todayFirst && a.time !== b.time) {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time < b.time ? -1 : 1;
  }

  const pa = a.priority || 0;
  const pb = b.priority || 0;
  if (pa !== pb) return pb - pa;

  return a.title.localeCompare(b.title, "zh-CN");
}

function ok(data: TodoListPayload) {
  return Response.json(
    { ok: true, data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function fail(message: string, status: number) {
  return Response.json(
    { ok: false, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

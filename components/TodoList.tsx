"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  Alert,
  App,
  Button,
  ConfigProvider,
  Empty,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  CheckSquareOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import WidgetCard from "@/components/WidgetCard";
import { useListStyles } from "@/lib/useListStyles";

interface TodoTask {
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
  dayKey: string;
  time: string;
  overdue: boolean;
}

interface TodoDetail extends TodoTask {
  content: string;
  desc: string;
  repeatFlag?: string;
  completedTime?: string;
}

interface TodoGroup {
  key: string;
  title: string;
  subtitle: string;
  count: number;
  tasks: TodoTask[];
}

interface TodoListPayload {
  days: number;
  total: number;
  groups: TodoGroup[];
  inboxId: string | null;
  projects: { id: string; name: string; color: string }[];
}

interface TodoListProps {
  days?: number;
  refreshInterval?: number;
}

/** 勾选框描边色：优先级 / 默认 */
const CHECK_BORDER: Record<number, string> = {
  5: "#ff4d4f",
  3: "#faad14",
  1: "#4A7AFF",
  0: "#c9c9ce",
};

/** 标签底色（按名称稳定取色） */
const TAG_PALETTE = [
  "#f5a623",
  "#7ed321",
  "#4A7AFF",
  "#bd10e0",
  "#50e3c2",
  "#ff6b81",
  "#9b9b9b",
];

function tagColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

function formatRefreshTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())} 更新`;
}

/** 本地列表缓存：key 为 days，重挂载/切换页签时秒开，30 秒内不重复请求 */
const listCache = new Map<
  string,
  { payload: TodoListPayload; fetchedAt: number }
>();
const LIST_CACHE_TTL = 30 * 1000;

/** 左侧卡片：滴答清单「最近 N 天」任务列表 */
function TodoListInner({
  days = 7,
  refreshInterval = 5 * 60 * 1000,
}: TodoListProps) {
  useListStyles();
  const { message } = App.useApp();
  const [payload, setPayload] = useState<TodoListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  /** 点击后本地先打勾的 id，列表刷新到服务端状态后清空 */
  const [optimisticChecked, setOptimisticChecked] = useState<
    Record<string, boolean>
  >({});
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TodoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(
    null,
  );
  const popupRef = useRef<HTMLDivElement | null>(null);

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const collapsedInitRef = useRef(false);

  const load = useCallback(
    async (force = false) => {
      // 命中本地缓存直接渲染
      if (!force) {
        const hit = listCache.get(String(days));
        if (hit && Date.now() - hit.fetchedAt < LIST_CACHE_TTL) {
          setPayload(hit.payload);
          setRefreshedAt(new Date(hit.fetchedAt));
          setError(null);
          setLoading(false);
          return;
        }
      }

      const requestId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/todo?days=${days}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          data?: TodoListPayload;
        };
        if (requestId !== requestIdRef.current) return;
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.message || "获取任务失败");
        }
        setPayload(json.data);
        listCache.set(String(days), {
          payload: json.data,
          fetchedAt: Date.now(),
        });
        setRefreshedAt(new Date());
        // 以服务端状态为准，清掉乐观勾选（重复任务完成会生成同 id 的新实例）
        setOptimisticChecked({});
        if (!collapsedInitRef.current) {
          collapsedInitRef.current = true;
          const nextCollapsed: Record<string, boolean> = {};
          for (const g of json.data.groups) {
            nextCollapsed[g.key] = g.title !== "今天";
          }
          setCollapsed(nextCollapsed);
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "获取任务失败");
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [days],
  );

  useEffect(() => {
    // 优先用本地缓存秒开，过期或不命中才拉新
    void load();
  }, [load]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => void load(true), refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval, load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleToggle = async (task: TodoTask) => {
    if (busyIds[task.id]) return;
    setBusyIds((prev) => ({ ...prev, [task.id]: true }));
    const nextStatus = task.status === 2 ? 0 : 2;

    // 本地先打勾 / 取消勾选，不立刻改列表
    if (nextStatus === 2) {
      setOptimisticChecked((prev) => ({ ...prev, [task.id]: true }));
    } else {
      setOptimisticChecked((prev) => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
    }

    try {
      const res = await fetch("/api/todo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          projectId: task.projectId,
          status: nextStatus,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "更新任务失败");
      }
      message.success(nextStatus === 2 ? "已完成任务" : "已恢复为未完成");
      await load(true);
    } catch (err) {
      // 失败回滚勾选状态
      setOptimisticChecked((prev) => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
      message.error(err instanceof Error ? err.message : "更新任务失败");
    } finally {
      setBusyIds((prev) => {
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
    }
  };

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  /** 当前展开分组里的任务（多选只作用于可见行） */
  const visibleTasks: TodoTask[] = [];
  for (const g of payload?.groups ?? []) {
    if (!collapsed[g.key]) visibleTasks.push(...g.tasks);
  }
  const selectedCount = selectedIds.size;

  const enterSelectMode = () => {
    setSelectedIds(new Set());
    setSelectMode(true);
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    // Ctrl 点选也会走到这里：自动进入多选模式
    setSelectMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchComplete = async () => {
    if (batchBusy || selectedCount === 0) return;
    const selected = visibleTasks.filter((t) => selectedIds.has(t.id));
    if (selected.length === 0) return;

    setBatchBusy(true);
    // 本地先全部打勾
    setOptimisticChecked((prev) => {
      const next = { ...prev };
      for (const t of selected) next[t.id] = true;
      return next;
    });

    try {
      const res = await fetch("/api/todo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: 2,
          tasks: selected.map((t) => ({ id: t.id, projectId: t.projectId })),
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: { success?: number; failed?: number; failedIds?: string[] };
      };
      if (!res.ok || !json.ok) {
        throw new Error(json.message || "批量完成任务失败");
      }
      await load(true);
      const failedIds = json.data?.failedIds ?? [];
      if (failedIds.length > 0) {
        // 失败的保持选中，便于一键重试
        message.warning(
          `已批量完成 ${json.data?.success ?? 0} 项，${failedIds.length} 项失败，可点击确认按钮重试`,
        );
        setSelectedIds(new Set(failedIds));
      } else {
        message.success(`已批量完成 ${selected.length} 项任务`);
        exitSelectMode();
      }
    } catch (err) {
      // 失败回滚勾选状态
      setOptimisticChecked((prev) => {
        const next = { ...prev };
        for (const t of selected) delete next[t.id];
        return next;
      });
      message.error(err instanceof Error ? err.message : "批量完成任务失败");
    } finally {
      setBatchBusy(false);
    }
  };

  const openDetail = async (task: TodoTask, rect: DOMRect) => {
    setDetailId(task.id);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);

    const width = 360;
    const gap = 12;
    let left = rect.right + gap;
    let top = rect.top;
    if (left + width > window.innerWidth - 12) {
      left = Math.max(12, rect.left - width - gap);
    }
    const maxTop = Math.max(12, window.innerHeight - 280);
    top = Math.min(Math.max(12, top - 8), maxTop);
    setPopupPos({ top, left });

    try {
      const res = await fetch(
        `/api/todo?id=${encodeURIComponent(task.id)}&projectId=${encodeURIComponent(task.projectId)}`,
      );
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        data?: TodoDetail;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.message || "获取任务详情失败");
      }
      setDetail(json.data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "获取任务详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailId(null);
    setDetail(null);
    setDetailError(null);
    setPopupPos(null);
  };

  // 点击浮层外部关闭
  useEffect(() => {
    if (!detailId) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popupRef.current?.contains(target)) return;
      if ((target as Element)?.closest?.("[data-todo-row-title]")) return;
      closeDetail();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [detailId]);

  // 多选模式下按 Esc 退出
  useEffect(() => {
    if (!selectMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitSelectMode();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectMode]);

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#4A7AFF" } }}>
      <WidgetCard
        className="h-full w-full min-w-0"
        contentClassName="flex h-full w-full min-w-0 flex-col overflow-hidden"
      >
        {/* 列表 */}
        <div className="dx-scroll dx-list-body">
          {error && !payload ? (
            <Alert
              className="dx-pad-sm"
              type="error"
              showIcon
              title={error}
              action={
                <Button size="small" onClick={() => void load(true)}>
                  重试
                </Button>
              }
            />
          ) : loading && !payload ? (
            <div className="dx-pad-md">
              <Skeleton active title={false} paragraph={{ rows: 10 }} />
            </div>
          ) : (payload?.groups.length ?? 0) === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="最近没有任务"
              className="dx-pad-lg"
            />
          ) : (
            (payload?.groups ?? []).map((group) => {
              const isCollapsed = collapsed[group.key];
              return (
                <section key={group.key}>
                  <button
                    type="button"
                    className="dx-group-btn"
                    onClick={() => toggleCollapse(group.key)}
                  >
                    <span
                      aria-hidden
                      className={`dx-caret${isCollapsed ? "" : " is-open"}`}
                    />
                    {group.key === "pinned" && (
                      <span style={{ fontSize: 12 }}>📌</span>
                    )}
                    <span className="dx-group-title">{group.title}</span>
                    {group.subtitle && (
                      <span className="dx-group-sub">{group.subtitle}</span>
                    )}
                    <span className="dx-group-count">{group.count}</span>
                  </button>

                  {!isCollapsed &&
                    group.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        busy={Boolean(busyIds[task.id])}
                        checked={Boolean(optimisticChecked[task.id])}
                        selectMode={selectMode}
                        selected={selectedIds.has(task.id)}
                        onToggle={() => void handleToggle(task)}
                        onSelect={() => toggleSelected(task.id)}
                        onOpen={(rect) => void openDetail(task, rect)}
                      />
                    ))}
                </section>
              );
            })
          )}
        </div>

        {payload && (
          <div className="dx-foot">
            <span>共 {payload.total} 条</span>
            <span className="dx-foot-actions">
              {refreshedAt && <span>{formatRefreshTime(refreshedAt)}</span>}
              <Tooltip
                title={
                  selectMode
                    ? selectedCount > 0
                      ? `完成已选 ${selectedCount} 项`
                      : "取消多选"
                    : "多选（Ctrl+点击行）"
                }
              >
                <Button
                  type="text"
                  size="small"
                  icon={
                    selectMode ? (
                      selectedCount > 0 ? (
                        <CheckCircleOutlined />
                      ) : (
                        <CloseCircleOutlined />
                      )
                    ) : (
                      <CheckSquareOutlined />
                    )
                  }
                  loading={batchBusy}
                  onClick={() => {
                    if (!selectMode) enterSelectMode();
                    else if (selectedCount > 0) void handleBatchComplete();
                    else exitSelectMode();
                  }}
                  aria-label={
                    selectMode
                      ? selectedCount > 0
                        ? "完成已选任务"
                        : "取消多选"
                      : "多选"
                  }
                />
              </Tooltip>
              <Tooltip title="刷新">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={loading && !!payload}
                  onClick={() => void load(true)}
                  aria-label="刷新"
                />
              </Tooltip>
            </span>
          </div>
        )}
      </WidgetCard>

      {detailId &&
        popupPos &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              ref={popupRef}
              role="dialog"
              aria-label="任务详情"
              className="dx-popup dx-scroll"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                top: popupPos.top,
                left: popupPos.left,
              }}
            >
              {detailLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : detailError ? (
                <Alert type="error" showIcon title={detailError} />
              ) : detail ? (
                <div>
                  <div className="dx-popup-head">
                    <button
                      type="button"
                      className="dx-check-lg"
                      aria-label={
                        detail.status === 2 ? "标记未完成" : "标记完成"
                      }
                      onClick={() => {
                        void handleToggle(detail);
                        closeDetail();
                      }}
                      style={
                        {
                          "--dx-check-color":
                            CHECK_BORDER[detail.priority] ?? CHECK_BORDER[0],
                        } as CSSProperties
                      }
                    />
                    <div className="dx-popup-body">
                      <div className="dx-popup-title">{detail.title}</div>
                      <div className="dx-popup-meta">
                        <span
                          className="dx-popup-dot"
                          style={{ background: detail.projectColor }}
                        />
                        <span
                          style={{ fontSize: 13, color: "rgba(0,0,0,0.55)" }}
                        >
                          {detail.projectName}
                        </span>
                        {detail.tags.map((tag) => (
                          <span
                            key={tag}
                            className="dx-tag"
                            style={{ background: tagColor(tag) }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="dx-popup-meta">
                        {(detail.dueDate || detail.startDate) && (
                          <Tag
                            color={detail.overdue ? "red" : "blue"}
                            style={{ marginInlineEnd: 0 }}
                          >
                            {formatDetailDue(detail)}
                          </Tag>
                        )}
                        <Tag
                          style={{
                            marginInlineEnd: 0,
                            color: PRIORITY_TEXT[detail.priority]?.color,
                            background: PRIORITY_TEXT[detail.priority]?.bg,
                            borderColor: "transparent",
                          }}
                        >
                          {PRIORITY_TEXT[detail.priority]?.label ?? "无优先级"}
                        </Tag>
                        {detail.pinned && <Tag color="gold">已置顶</Tag>}
                        {detail.hasReminder && <Tag>有提醒</Tag>}
                        {detail.repeatFlag && <Tag color="purple">重复</Tag>}
                      </div>
                    </div>
                  </div>

                  {(detail.content || detail.desc) && (
                    <div className="dx-popup-content">
                      {detail.content || detail.desc}
                    </div>
                  )}

                  {!detail.content && !detail.desc && (
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      暂无备注
                    </Typography.Text>
                  )}
                </div>
              ) : null}
            </div>
          </>,
          document.body,
        )}
    </ConfigProvider>
  );
}

export default function TodoList(props: TodoListProps) {
  return (
    <App
      style={{ height: "100%", width: "100%" }}
      rootClassName="h-full w-full"
    >
      <TodoListInner {...props} />
    </App>
  );
}

const PRIORITY_TEXT: Record<
  number,
  { label: string; color: string; bg: string }
> = {
  5: { label: "高优先级", color: "#cf1322", bg: "#fff1f0" },
  3: { label: "中优先级", color: "#d46b08", bg: "#fff7e6" },
  1: { label: "低优先级", color: "#0958d9", bg: "#e6f4ff" },
  0: { label: "无优先级", color: "rgba(0,0,0,0.65)", bg: "rgba(0,0,0,0.04)" },
};

function formatDetailDue(detail: TodoDetail): string {
  const raw = detail.dueDate || detail.startDate;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (detail.isAllDay || !detail.time) return datePart;
  return `${datePart} ${detail.time}`;
}

function TaskRow({
  task,
  busy,
  checked,
  selectMode,
  selected,
  onToggle,
  onSelect,
  onOpen,
}: {
  task: TodoTask;
  busy: boolean;
  checked: boolean;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onOpen: (rect: DOMRect) => void;
}) {
  const border = CHECK_BORDER[task.priority] ?? CHECK_BORDER[0];
  const isChecked = checked || task.status === 2;
  const timeColor = task.overdue
    ? "#ff4d4f"
    : task.dayKey === formatTodayKey()
      ? "rgba(0,0,0,0.65)"
      : "rgba(0,0,0,0.4)";

  return (
    <div
      className={`dx-list-row${selectMode ? " is-select-mode" : ""}${selected ? " is-selected" : ""}`}
      style={{ borderLeft: `3px solid ${task.projectColor}` }}
      onClick={(e) => {
        // 多选模式整行点击选中；普通模式按住 Ctrl/Cmd 点行多选
        if (selectMode || e.ctrlKey || e.metaKey) onSelect();
      }}
    >
      <button
        type="button"
        className={`dx-check${(selectMode ? selected : isChecked) ? " is-checked" : ""}`}
        aria-label={
          selectMode
            ? selected
              ? "取消选择"
              : "选择任务"
            : isChecked
              ? "标记未完成"
              : "标记完成"
        }
        disabled={selectMode ? false : busy}
        onClick={(e) => {
          e.stopPropagation();
          if (selectMode) onSelect();
          else onToggle();
        }}
        style={
          {
            "--dx-check-color": selectMode ? "#4A7AFF" : border,
          } as CSSProperties
        }
      >
        {selectMode ? (selected ? "✓" : "") : isChecked ? "✓" : ""}
      </button>

      <div
        data-todo-row-title
        className={`dx-task-title${!selectMode && isChecked ? " is-done" : ""}`}
        onClick={(e) => {
          if (selectMode || e.ctrlKey || e.metaKey) return; // 交给行级处理选中
          onOpen(e.currentTarget.getBoundingClientRect());
        }}
        title={task.title}
      >
        {task.hasSub && (
          <span
            aria-hidden
            style={{
              display: "inline-block",
              marginRight: 4,
              color: "rgba(0,0,0,0.35)",
              fontSize: 10,
            }}
          >
            ▸
          </span>
        )}
        {task.title}
      </div>

      <div className="dx-task-meta">
        {task.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="dx-tag"
            style={{ background: tagColor(tag) }}
          >
            {tag}
          </span>
        ))}
        {task.tags.length > 2 && (
          <span
            style={{
              fontSize: 11,
              color: "rgba(0,0,0,0.35)",
              flexShrink: 0,
            }}
          >
            +{task.tags.length - 2}
          </span>
        )}
        <span className="dx-meta-text">{task.projectName}</span>
        {task.hasReminder && (
          <span aria-hidden style={{ fontSize: 11, opacity: 0.45, flexShrink: 0 }}>
            🔔
          </span>
        )}
        {(task.dueDate || task.startDate) && (
          <span
            className="dx-meta-text"
            style={{
              color: timeColor,
              fontWeight: task.overdue ? 600 : 400,
              flexShrink: 0,
            }}
          >
            {formatDueLabel(task)}
          </span>
        )}
      </div>
    </div>
  );
}

function formatTodayKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDueLabel(task: TodoTask): string {
  const raw = task.dueDate || task.startDate;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = `${d.getMonth() + 1}月${d.getDate()}日`;
  if (task.isAllDay || !task.time) return datePart;
  return task.time;
}

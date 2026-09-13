"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { ReloadOutlined } from "@ant-design/icons";
import WidgetCard from "@/components/WidgetCard";

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

/** 左侧卡片：滴答清单「最近 N 天」任务列表 */
function TodoListInner({
  days = 7,
  refreshInterval = 5 * 60 * 1000,
}: TodoListProps) {
  const { message } = App.useApp();
  const [payload, setPayload] = useState<TodoListPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  /** 点击后本地先打勾的 id，等接口成功再真正移除 */
  const [optimisticChecked, setOptimisticChecked] = useState<
    Record<string, boolean>
  >({});
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

  const load = useCallback(
    async (force = false) => {
      const requestId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const query = `?days=${days}${force ? "&refresh=1" : ""}`;
        const res = await fetch(`/api/todo${query}`, {
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
        setRefreshedAt(new Date());
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
    void load();
  }, [load]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => void load(), refreshInterval);
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

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#4A7AFF" } }}>
      <WidgetCard
        className="h-full w-full min-w-0"
        contentClassName="flex h-full w-full min-w-0 flex-col overflow-hidden"
      >
        {/* 列表 */}
        <div
          className="hot-list-scroll"
          style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingTop: 4 }}
        >
          {error && !payload ? (
            <Alert
              style={{ margin: 12 }}
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
            <div style={{ padding: 16 }}>
              <Skeleton active title={false} paragraph={{ rows: 10 }} />
            </div>
          ) : (payload?.groups.length ?? 0) === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="最近没有任务"
              style={{ padding: 24 }}
            />
          ) : (
            (payload?.groups ?? []).map((group) => {
              const isCollapsed = collapsed[group.key];
              return (
                <section key={group.key}>
                  <button
                    type="button"
                    onClick={() => toggleCollapse(group.key)}
                    style={{
                      width: "100%",
                      margin: 0,
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px 4px",
                      textAlign: "left",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        display: "inline-block",
                        width: 0,
                        height: 0,
                        flexShrink: 0,
                        borderLeft: "5px solid rgba(0, 0, 0, 0.45)",
                        borderTop: "4px solid transparent",
                        borderBottom: "4px solid transparent",
                        transform: isCollapsed ? "none" : "rotate(90deg)",
                        transition: "transform 0.15s",
                      }}
                    />
                    {group.key === "pinned" && (
                      <span style={{ fontSize: 12 }}>📌</span>
                    )}
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
                      {group.title}
                    </span>
                    {group.subtitle && (
                      <span
                        style={{ fontSize: 13, color: "rgba(0,0,0,0.45)" }}
                      >
                        {group.subtitle}
                      </span>
                    )}
                    <span
                      style={{ fontSize: 12, color: "rgba(0,0,0,0.35)" }}
                    >
                      {group.count}
                    </span>
                  </button>

                  {!isCollapsed &&
                    group.tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        busy={Boolean(busyIds[task.id])}
                        checked={Boolean(optimisticChecked[task.id])}
                        onToggle={() => void handleToggle(task)}
                        onOpen={(rect) => void openDetail(task, rect)}
                      />
                    ))}
                </section>
              );
            })
          )}
        </div>

        {payload && (
          <div
            style={{
              padding: "6px 8px 6px 14px",
              borderTop: "1px solid rgba(255, 255, 255, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              fontSize: 11,
              color: "rgba(0,0,0,0.45)",
            }}
          >
            <span>共 {payload.total} 条</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {refreshedAt && <span>{formatRefreshTime(refreshedAt)}</span>}
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
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: "fixed",
                top: popupPos.top,
                left: popupPos.left,
                width: 360,
                maxHeight: "min(70vh, 520px)",
                overflowY: "auto",
                zIndex: 1000,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.55)",
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                boxShadow: "0 8px 28px rgba(0,0,0,0.14)",
                padding: "14px 16px",
              }}
              className="hot-list-scroll"
            >
              {detailLoading ? (
                <Skeleton active paragraph={{ rows: 4 }} />
              ) : detailError ? (
                <Alert type="error" showIcon title={detailError} />
              ) : detail ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <button
                      type="button"
                      aria-label={
                        detail.status === 2 ? "标记未完成" : "标记完成"
                      }
                      onClick={() => {
                        void handleToggle(detail);
                        closeDetail();
                      }}
                      style={{
                        width: 18,
                        height: 18,
                        marginTop: 3,
                        flexShrink: 0,
                        borderRadius: 4,
                        border: `1.5px solid ${CHECK_BORDER[detail.priority] ?? CHECK_BORDER[0]}`,
                        background: "transparent",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          lineHeight: "22px",
                          wordBreak: "break-word",
                        }}
                      >
                        {detail.title}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: detail.projectColor,
                          }}
                        />
                        <span
                          style={{ fontSize: 13, color: "rgba(0,0,0,0.55)" }}
                        >
                          {detail.projectName}
                        </span>
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
                      {detail.tags.length > 0 && (
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                          }}
                        >
                          {detail.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                fontSize: 12,
                                lineHeight: "18px",
                                padding: "0 8px",
                                borderRadius: 4,
                                color: "#fff",
                                background: tagColor(tag),
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {(detail.content || detail.desc) && (
                    <div
                      style={{
                        borderTop: "1px solid rgba(0,0,0,0.06)",
                        paddingTop: 12,
                        fontSize: 13,
                        lineHeight: 1.6,
                        color: "rgba(0,0,0,0.75)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        maxHeight: 200,
                        overflowY: "auto",
                      }}
                    >
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
  onToggle,
  onOpen,
}: {
  task: TodoTask;
  busy: boolean;
  checked: boolean;
  onToggle: () => void;
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
      className="todo-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 14px 6px 10px",
        borderLeft: `3px solid ${task.projectColor}`,
        minHeight: 32,
      }}
    >
      <button
        type="button"
        aria-label={isChecked ? "标记未完成" : "标记完成"}
        disabled={busy}
        onClick={onToggle}
        style={{
          width: 16,
          height: 16,
          flexShrink: 0,
          borderRadius: 4,
          border: `1.5px solid ${isChecked ? border : border}`,
          background: isChecked ? border : "transparent",
          cursor: busy ? "wait" : "pointer",
          padding: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 11,
          lineHeight: 1,
          transition: "background-color 0.15s",
        }}
      >
        {isChecked ? "✓" : ""}
      </button>

      <div
        data-todo-row-title
        onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
        title={task.title}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          lineHeight: "20px",
          color: isChecked ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.88)",
          textDecoration: isChecked ? "line-through" : "none",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          cursor: "pointer",
        }}
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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
          gap: 4,
          maxWidth: "52%",
          overflow: "hidden",
        }}
      >
        {task.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            style={{
              fontSize: 11,
              lineHeight: "16px",
              padding: "0 6px",
              borderRadius: 4,
              color: "#fff",
              background: tagColor(tag),
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
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
        <span
          style={{
            fontSize: 12,
            color: "rgba(0,0,0,0.4)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            minWidth: 0,
          }}
        >
          {task.projectName}
        </span>
        {task.hasReminder && (
          <span
            aria-hidden
            style={{ fontSize: 11, opacity: 0.45, flexShrink: 0 }}
          >
            🔔
          </span>
        )}
        {(task.dueDate || task.startDate) && (
          <span
            style={{
              fontSize: 12,
              color: timeColor,
              whiteSpace: "nowrap",
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

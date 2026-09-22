"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  ConfigProvider,
  Empty,
  Skeleton,
  Tooltip,
  Typography,
} from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import WidgetCard from "@/components/WidgetCard";
import {
  DEFAULT_HOT_SOURCE,
  HOT_TAB_SOURCES,
  isHotTabSourceId,
} from "@/lib/hotSources";
import { useListStyles } from "@/lib/useListStyles";

interface HotItem {
  id: string;
  title: string;
  desc?: string;
  cover?: string;
  author?: string;
  hot?: number;
  timestamp?: number;
  url: string;
  mobileUrl?: string;
}

interface HotPayload {
  sourceId: string;
  name: string;
  type: string;
  description?: string;
  link?: string;
  total: number;
  updateTime?: string | number;
  fromCache?: boolean;
  items: HotItem[];
}

interface HotListProps {
  /** 默认信息源，取自 lib/hotSources.ts 的 id */
  defaultSource?: string;
  /** 拉取条数 */
  limit?: number;
  /** 自动刷新间隔（毫秒），0 表示不自动刷新 */
  refreshInterval?: number;
}

const STORAGE_KEY = "dashboard:hot-source";

/** 前三名背景色 */
const RANK_BG = ["#ff4d4f", "#ff7a45", "#faad14"] as const;

/** 右上角热榜卡片：接入 DailyHotApi，支持切换信息源。 */
export default function HotList({
  defaultSource = DEFAULT_HOT_SOURCE,
  limit = 30,
  refreshInterval = 10 * 60 * 1000,
}: HotListProps) {
  useListStyles();
  const [sourceId, setSourceId] = useState(() =>
    isHotTabSourceId(defaultSource) ? defaultSource : DEFAULT_HOT_SOURCE,
  );
  const [payload, setPayload] = useState<HotPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (id: string, force = false) => {
      const requestId = ++requestIdRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const query = `?limit=${limit}${force ? "&refresh=1" : ""}`;
        const res = await fetch(`/api/hot/${encodeURIComponent(id)}${query}`, {
          signal: controller.signal,
        });
        const json = (await res.json()) as {
          ok?: boolean;
          message?: string;
          data?: HotPayload;
        };
        if (requestId !== requestIdRef.current) return;
        if (!res.ok || !json.ok || !json.data) {
          throw new Error(json.message || "获取热榜失败");
        }
        setPayload(json.data);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "获取热榜失败");
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [limit],
  );

  // 读取上次选择的信息源
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && isHotTabSourceId(saved)) {
      setSourceId(saved);
    }
  }, []);

  useEffect(() => {
    void load(sourceId);
  }, [sourceId, load]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const timer = setInterval(() => void load(sourceId), refreshInterval);
    return () => clearInterval(timer);
  }, [refreshInterval, sourceId, load]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleSelect = (id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    if (id === sourceId) {
      void load(id, true);
      return;
    }
    setPayload(null);
    setSourceId(id);
  };

  return (
    <ConfigProvider theme={{ token: { colorPrimary: "#4A7AFF" } }}>
      <WidgetCard
        className="h-full w-full min-w-0"
        contentClassName="flex h-full w-full min-w-0 flex-col overflow-hidden"
      >
        {/* 头部：Tab 切换平台 */}
        <div className="dx-head">
          <div
            className="dx-scroll-x-none"
            role="tablist"
            aria-label="热榜平台"
          >
            {HOT_TAB_SOURCES.map((item, index) => {
              const active = item.id === sourceId;
              return (
                <Fragment key={item.id}>
                  {index > 0 && <span aria-hidden className="dx-tab-sep" />}
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`dx-tab${active ? " is-active" : ""}`}
                    onClick={() => handleSelect(item.id)}
                  >
                    {item.name}
                  </button>
                </Fragment>
              );
            })}
          </div>
        </div>

        {/* 列表 */}
        <div className="dx-scroll">
          {error && !payload ? (
            <Empty className="dx-state" description={error}>
              <Button size="small" onClick={() => void load(sourceId, true)}>
                重试
              </Button>
            </Empty>
          ) : loading && !payload ? (
            <div className="dx-pad-md">
              <Skeleton active title={false} paragraph={{ rows: 12 }} />
            </div>
          ) : (payload?.items?.length ?? 0) === 0 ? (
            <Empty className="dx-state" description="当前信息源暂无数据" />
          ) : (
            <div>
              {(payload?.items ?? []).map((item, index) => {
                const hotLabel = formatHot(item.hot);
                const link = item.mobileUrl || item.url;
                return (
                  <div key={`${item.id}-${index}`} className="dx-hot-row">
                    <span
                      className="dx-rank"
                      style={
                        index < 3
                          ? { background: RANK_BG[index], color: "#fff" }
                          : undefined
                      }
                    >
                      {index + 1}
                    </span>
                    <Typography.Link
                      href={link || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dx-hot-title"
                    >
                      <Typography.Paragraph
                        ellipsis={{ rows: 2, tooltip: item.title }}
                      >
                        {item.title}
                      </Typography.Paragraph>
                    </Typography.Link>
                    {hotLabel && (
                      <Typography.Text type="secondary" className="dx-hot-value">
                        {hotLabel}
                      </Typography.Text>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部：更新时间 + 刷新 */}
        {payload && (
          <div className="dx-foot">
            <span>共 {payload.total} 条</span>
            <span className="dx-foot-actions">
              <span>{formatUpdateTime(payload.updateTime)}</span>
              <Tooltip title="刷新">
                <Button
                  type="text"
                  size="small"
                  icon={<ReloadOutlined />}
                  loading={loading}
                  onClick={() => void load(sourceId, true)}
                  aria-label="刷新"
                />
              </Tooltip>
            </span>
          </div>
        )}
      </WidgetCard>
    </ConfigProvider>
  );
}

function formatHot(hot?: number): string {
  if (hot === undefined || hot === null || !Number.isFinite(hot) || hot <= 0) {
    return "";
  }
  if (hot >= 1e8) return `${(hot / 1e8).toFixed(1)} 亿`;
  if (hot >= 1e4) return `${(hot / 1e4).toFixed(1)} 万`;
  return String(hot);
}

function formatUpdateTime(value?: string | number): string {
  if (value === undefined || value === null || value === "") return "";
  const date = typeof value === "number" ? new Date(value) : new Date(String(value));
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())} 更新`;
}

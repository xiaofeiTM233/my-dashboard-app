/**
 * 扩展侧配置的读写。
 *
 * 这些值在网页版来自 `.env`；插件没有服务端，改存 `chrome.storage.local`，
 * 并在加载路由模块前注入回 `globalThis.process.env`，让 `app/api/*` 里
 * 既有的 `process.env.XXX` 读取原样生效——不需要为插件另写一份实现。
 */

export type ExtensionEnv = {
  DAILYHOT_API_BASE?: string;
  DIDA_API_BASE?: string;
  DIDA_ACCESS_TOKEN?: string;
};

const STORAGE_KEY = "dashboard.env";

type StorageHost = {
  storage?: {
    local?: {
      get(keys: string[]): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
};

function area() {
  const host = globalThis as { browser?: StorageHost; chrome?: StorageHost };
  return host.browser?.storage?.local ?? host.chrome?.storage?.local ?? null;
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/** 只认白名单键，避免把任意对象灌进 process.env */
function pickEnv(raw: unknown): ExtensionEnv {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const env: ExtensionEnv = {
    DAILYHOT_API_BASE: asOptionalString(source.DAILYHOT_API_BASE),
    DIDA_API_BASE: asOptionalString(source.DIDA_API_BASE),
    DIDA_ACCESS_TOKEN: asOptionalString(source.DIDA_ACCESS_TOKEN),
  };
  if (!env.DIDA_ACCESS_TOKEN) delete env.DIDA_ACCESS_TOKEN;
  if (!env.DAILYHOT_API_BASE) delete env.DAILYHOT_API_BASE;
  if (!env.DIDA_API_BASE) delete env.DIDA_API_BASE;
  return env;
}

export async function readExtensionEnv(): Promise<ExtensionEnv> {
  const store = area();
  if (!store) return {};
  const stored = await store.get([STORAGE_KEY]);
  return pickEnv(stored[STORAGE_KEY]);
}

export async function writeExtensionEnv(next: ExtensionEnv): Promise<ExtensionEnv> {
  const store = area();
  if (!store) return {};
  const cleaned = pickEnv(next);
  await store.set({ [STORAGE_KEY]: cleaned });
  return cleaned;
}

/**
 * 注入目标全局。
 *
 * `wxt.config.ts` 里把 `process.env` 的构建期替换目标改成了
 * `globalThis.__DASHBOARD_ENV__`，所以路由代码读到的是这个对象而不是 `process`。
 * 必须先于任何 `import("@/app/api/...")` 完成赋值：路由里的 `API_BASE` 是模块顶层
 * 常量，只在首次求值时读一次。
 */
const ENV_GLOBAL = "__DASHBOARD_ENV__";

type EnvRecord = Record<string, string | undefined>;

function envTarget(): EnvRecord {
  const host = globalThis as Record<string, unknown>;
  if (typeof host[ENV_GLOBAL] !== "object" || host[ENV_GLOBAL] === null) {
    host[ENV_GLOBAL] = {};
  }
  return host[ENV_GLOBAL] as EnvRecord;
}

/** 提前把全局占位成空对象，避免替换后的代码读到 undefined */
export function ensureEnvGlobal(): void {
  envTarget();
}

/**
 * 必须在 `import("@/app/api/...")` 之前 await 调用。
 * 令牌是路由在调用时读取的，所以改完令牌只需刷新页面（重新走一次本函数）。
 */
export async function seedProcessEnv(): Promise<ExtensionEnv> {
  const env = await readExtensionEnv();
  Object.assign(envTarget(), env);
  return env;
}

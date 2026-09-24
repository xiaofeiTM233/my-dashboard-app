import type { NextRequest } from "next/server";
import { ensureEnvGlobal, seedProcessEnv } from "@/ext/envStore";

/**
 * 让 `app/api/*` 里已有的路由处理函数直接在扩展页里跑，从而不必为插件
 * 复制一份接口逻辑：组件照旧 `fetch('/api/...')`，我们只把落在扩展自身
 * 源上的 `/api/*` 请求截下来交给对应处理函数，并把返回的 `Response`
 * 原样交回——`res.ok` / `res.json()` 的用法完全不变。
 *
 * 路由内部对上游的 `fetch(https://...)` 是绝对地址，不会被这里截获，
 * 跨域由 manifest 的 host_permissions 放开。
 */

type Handler = (
  request: NextRequest,
  context?: { params: Promise<Record<string, string>> },
) => Promise<Response>;

interface ExtensionRoutes {
  hot: { GET: Handler };
  calendar: { GET: Handler };
  todo: { GET: Handler; POST: Handler; PATCH: Handler };
}

let routes: ExtensionRoutes | null = null;

/**
 * 路由处理函数只读取 `request.nextUrl` 与 `request.json()`，
 * 因此这里给出这两个成员即可，无需构造完整的 NextRequest。
 */
function syntheticRequest(url: URL, init?: RequestInit): NextRequest {
  return {
    nextUrl: url,
    json: async () =>
      JSON.parse(typeof init?.body === "string" ? init.body : "{}"),
  } as unknown as NextRequest;
}

/** 只有指向扩展自身页面的 `/api/*` 才需要接管 */
function localApiUrl(input: RequestInfo | URL, init?: RequestInit): Promise<Response> | null {
  if (routes === null) return null;
  const raw =
    typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let url: URL;
  try {
    url = new URL(raw, location.href);
  } catch {
    return null;
  }
  if (url.origin !== location.origin || !url.pathname.startsWith("/api/")) return null;

  const request = syntheticRequest(url, init);
  const method = (init?.method ?? "GET").toUpperCase();
  const path = url.pathname;

  if (path.startsWith("/api/hot/")) {
    const source = decodeURIComponent(path.slice("/api/hot/".length));
    return routes.hot.GET(request, { params: Promise.resolve({ source }) });
  }
  if (path === "/api/calendar") return routes.calendar.GET(request);
  if (path === "/api/todo") {
    if (method === "POST") return routes.todo.POST(request);
    if (method === "PATCH") return routes.todo.PATCH(request);
    return routes.todo.GET(request);
  }
  return Promise.resolve(
    Response.json({ ok: false, message: `扩展内未注册的接口：${path}` }, { status: 404 }),
  );
}

/**
 * 先注入 env 再 import 路由：三个路由里的 `API_BASE` 是模块顶层常量，
 * 早于任何一次调用求值。顺序收在这里，调用方无法破坏。
 */
export async function installExtensionApiBridge() {
  ensureEnvGlobal();
  await seedProcessEnv();
  const [hot, calendar, todo] = await Promise.all([
    import("@/app/api/hot/[source]/route"),
    import("@/app/api/calendar/route"),
    import("@/app/api/todo/route"),
  ]);
  routes = { hot, calendar, todo } as unknown as ExtensionRoutes;

  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    return localApiUrl(input, init) ?? nativeFetch(input as RequestInfo, init);
  }) as typeof fetch;
}

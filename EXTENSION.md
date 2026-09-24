# 浏览器插件构建（WXT）

网页版仍是主线，本文件只说明插件这条附加链路。

## 前提：不改 `app/` `components/` `lib/` `public/`

插件侧全部代码放在新增的 `ext/` 与 `entrypoints/` 里，通过两个运行时桥接复用你已有的实现，
因此**接口逻辑只有一份，且就在 `app/api/*/route.ts` 里**：

1. **`ext/apiBridge.ts`** — 动态 import 三个 route 模块，patch 扩展页的 `globalThis.fetch`，
   把落在扩展自身源上的 `/api/*` 请求翻译成对 `GET/POST/PATCH` 的调用（只给出路由真正读取的
   `request.nextUrl` 与 `request.json()`），再把路由返回的 `Response` 原样交回组件。
   组件里的 `fetch('/api/hot/…')`、`res.ok`、`res.json()` 用法完全不变。
   成立的前提：三个路由对 `next/server` 只有 `import type`（编译期擦除），其余是 `Response.json`
   与顶层常量，因此可以在浏览器里求值。
2. **`ext/envStore.ts`** — 网页版的 `.env` 三个变量在插件里存 `chrome.storage.local['dashboard.env']`，
   再注入到一个全局对象给路由读。

   **坑：** Vite 默认把源码里的 `process.env` 在构建期整体替换成字面量 `{}`，产物变成
   `({}).DIDA_ACCESS_TOKEN`，运行时往 `globalThis.process.env` 写值完全没人读（表现为设置页保存了
   令牌、界面仍提示"未配置环境变量"）。所以 `wxt.config.ts` 里有
   `define: { "process.env": "globalThis.__DASHBOARD_ENV__" }`，把替换目标改成一个真实存在的全局。
   改动这个 define 或 `envStore` 里的 `ENV_GLOBAL` 名字时两边必须一致。

   注入发生在 newtab 启动时（`installExtensionApiBridge` 里 `await seedProcessEnv()` 之后才
   `import` 路由，顺序不可调换，因为路由里的 `API_BASE` 是模块顶层常量、只求值一次）。
   因此**设置页保存后，任何已打开的标签页都要刷新或重开才生效**，包括只改令牌。
3. **`ext/suggestionJsonp.ts`** — `components/SearchBar.tsx` 用注入外部 `<script>` 的 JSONP 拿百度搜索
   建议，而 MV3 扩展页 CSP 是 `script-src 'self'`，会被直接拒绝。这里拦 `HTMLScriptElement.src` 的
   setter：命中建议接口时改用 `fetch` 取文本，只截取其中的 `s` 数组解析（外层是键不带引号的 JS
   字面量，整段 `JSON.parse` 会失败；扩展页也不能 `eval`），再按浏览器应有的时序回调组件注册的
   `cb` 函数。组件本身不改。

## 命令

```bash
npm run ext:dev      # 监听源码，持续重建到 .output/chrome-mv3
npm run ext:run      # 同上并自动拉起已装载本扩展的 Chromium
npm run ext:build    # 一次性构建
npm run ext:zip      # 打包可分发 zip
npm run typecheck:ext
```

装载：`chrome://extensions` → 开发者模式 → 「加载已解压的扩展程序」→ 选 `.output/chrome-mv3`。

插件不依赖网页版后端：新标签页在本地直接请求上游，跨域由 `wxt.config.ts` 的 `host_permissions`
放开。**新增上游域名必须同步补进 `host_permissions`**，否则请求会被静默拦下。

设置项在 `chrome://extensions` → 本扩展「详情 → 扩展程序设置」。

## 双构建的配置边界

`tsconfig.json` 归 Next（`exclude` 掉了 `.wxt` / `.output` / `entrypoints` / `ext`，否则
`next build` 会把插件侧文件一起类型检查而报错）；`tsconfig.wxt.json` 继承 `.wxt/tsconfig.json`
并额外纳入 `app/page.tsx`、`app/api/**/*.ts`。这两份配置是双构建唯一无法消除的重复。

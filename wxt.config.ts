import { defineConfig } from "wxt";

import tailwindcss from "@tailwindcss/vite";

/**
 * 浏览器插件构建（与 Next 网页版并存，共用 components/ 与 lib/）。
 *
 * 插件不依赖任何自建后端：数据层在新标签页里直连上游，
 * 所需域名见下方 host_permissions——新增上游域名必须同步补到这里，
 * 否则请求会被静默拦下。
 */
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
    define: {
      /*
       * Vite 默认把 `process.env` 整体替换成字面量 `{}`，产物里变成
       * `({}).DIDA_ACCESS_TOKEN`，运行时注入就彻底失效了。改成指向一个真实
       * 存在的全局对象，`ext/envStore` 从扩展设置页写入的值才会被 app/api 路由读到。
       */
      "process.env": "globalThis.__DASHBOARD_ENV__",
    },
  }),
  // WXT 会整体覆盖 options_ui，manifest 里写不开，只能在生成后改
  hooks: {
    "build:manifestGenerated": (_wxt, manifest) => {
      if (manifest.options_ui) manifest.options_ui.open_in_tab = true;
    },
  },
  manifest: {
    name: "飞小RAN | 新标签页",
    description: "新标签页仪表盘：时钟、搜索、热榜、万年历与滴答清单。",
    permissions: ["storage"],
    host_permissions: [
      // DailyHotApi 公共实例；自建服务在扩展设置页填写地址，需同步声明域名
      "https://daily-hot-api.02000721.xyz/*",
      "http://localhost:*/*",
      "http://127.0.0.1:*/*",
      // 百度万年历 / 百度搜索建议
      "https://opendata.baidu.com/*",
      "https://suggestion.baidu.com/*",
      // 滴答清单 Open API（国内 / 国际）
      "https://api.dida365.com/*",
      "https://api.ticktick.com/*",
      // 新标签页视频背景
      "https://eo.hitfun.top/*",
    ],
  },
});

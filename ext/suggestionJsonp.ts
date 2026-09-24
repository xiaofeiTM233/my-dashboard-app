/**
 * 让 `components/SearchBar.tsx` 里的 JSONP 搜索建议在扩展页继续可用。
 *
 * 组件用 `document.createElement('script')` + 外部 src 拿百度建议，而 MV3
 * 扩展页的 CSP 是 `script-src 'self'`，注入外部脚本会被直接拒绝。这里不改组件，
 * 而是拦下 `HTMLScriptElement.src` 的赋值：命中建议接口时改用 fetch 取回文本，
 * 剥掉 JSONP 外壳后按浏览器应有的时序手动回调。
 *
 * 只做「取 JSON + 调回调」，不执行任何远端代码，因此不受 CSP 约束。
 */

const SUGGEST_HOST = "suggestion.baidu.com";

/**
 * 接口返回 ``cb({q:"手机",p:false,s:["手机银行", …]})``：外层是**键不带引号的 JS
 * 对象字面量**，整段 JSON.parse 会失败；而 `s` 数组本身元素都是合法 JSON 字符串，
 * 所以只截取该数组来解析。扩展页 CSP 禁止 eval，不能靠执行代码拿数据。
 */
function extractSuggestionList(text: string): string[] {
  const match = /"?\bs\b"?\s*:\s*(\[[\s\S]*?\])/.exec(text);
  if (!match) return [];
  try {
    const list: unknown = JSON.parse(match[1]);
    return Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function fulfillSuggestion(rawUrl: string) {
  const url = new URL(rawUrl);
  const callbackName = url.searchParams.get("cb");
  const host = globalThis as Record<string, unknown>;

  // 组件在赋完 src 之后才注册回调、再 appendChild，所以回调必须留到下一个宏任务
  const respond = (suggestions: string[]) => {
    setTimeout(() => {
      const callback = callbackName ? host[callbackName] : undefined;
      if (typeof callback === "function") (callback as (data: unknown) => void)({ s: suggestions });
    }, 0);
  };

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`suggest ${res.status}`);
    respond(extractSuggestionList(await res.text()));
  } catch {
    respond([]);
  }
}

export function installSuggestionJsonpBridge() {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src");
  const originalSet = descriptor?.set;
  if (!descriptor?.get || !originalSet) return;

  Object.defineProperty(HTMLScriptElement.prototype, "src", {
    configurable: true,
    enumerable: descriptor.enumerable,
    get: descriptor.get,
    set(value: string) {
      const raw = String(value);
      if (raw.includes(SUGGEST_HOST)) {
        // 不写 src 属性：脚本元素仍会被组件 appendChild，但其回调结束后
        // removeChild 需要它真的在文档里，所以这里保持组件自身的流程不变。
        void fulfillSuggestion(raw);
        return;
      }
      originalSet.call(this, raw);
    },
  });
}

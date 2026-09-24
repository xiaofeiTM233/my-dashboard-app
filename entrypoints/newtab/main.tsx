import { createRoot } from "react-dom/client";
import Home from "@/app/page";
import { installExtensionApiBridge } from "@/ext/apiBridge";
import { installSuggestionJsonpBridge } from "@/ext/suggestionJsonp";
import "@/app/globals.css";
import "@/app/mytab.css";

const container = document.getElementById("root");

if (container) {
  // 桥接必须在首次渲染前就位：组件的 effect 一挂载就会发 /api 请求
  void installExtensionApiBridge().then(() => {
    installSuggestionJsonpBridge();
    createRoot(container).render(<Home />);
  });
}

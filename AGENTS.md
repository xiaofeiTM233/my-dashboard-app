<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 禁止生成图片

不要调用图像生成工具（ImageGen）。任何情况下都不要自己生成图标、插画、配图或占位素材。

需要图片时：向用户要文件路径，或等用户明确指定。**不要自行生成一张来替代。**

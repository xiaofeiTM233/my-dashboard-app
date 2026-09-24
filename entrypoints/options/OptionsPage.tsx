import { useEffect, useState } from "react";
import { App as AntdApp, Button, Form, Input, Typography } from "antd";
import {
  readExtensionEnv,
  writeExtensionEnv,
  type ExtensionEnv,
} from "@/ext/envStore";

const { Title, Paragraph } = Typography;

/**
 * 插件版没有服务端，网页版写在 `.env` 里的三个变量在这里落进
 * `chrome.storage.local`，再由 `ext/envStore` 注入回 `process.env`。
 * 留空即沿用路由里的默认值（与 `.env.example` 保持一致）。
 */
const DEFAULTS = {
  DAILYHOT_API_BASE: "https://daily-hot-api.02000721.xyz",
  DIDA_API_BASE: "https://api.dida365.com/open/v1",
};

export default function OptionsPage() {
  return (
    <AntdApp>
      <SettingsForm />
    </AntdApp>
  );
}

function SettingsForm() {
  const { message } = AntdApp.useApp();
  const [form] = Form.useForm<ExtensionEnv>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void readExtensionEnv().then((env) => {
      if (alive) form.setFieldsValue(env);
    });
    return () => {
      alive = false;
    };
  }, [form]);

  const onFinish = async (values: ExtensionEnv) => {
    setSaving(true);
    try {
      await writeExtensionEnv(values);
      message.success("已保存，重新打开新标签页后生效");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: 32 }}>
      <Title level={3}>仪表盘设置</Title>
      <Paragraph type="secondary">
        仅保存在本机扩展存储中，不写入代码仓库、也不随打包结果分发给他人。
        任意一项改动都要刷新或重新打开新标签页才会生效。
      </Paragraph>
      <Form form={form} layout="vertical" onFinish={(values) => void onFinish(values)}>
        <Form.Item
          name="DAILYHOT_API_BASE"
          label="DailyHotApi 服务地址"
          extra={`留空则使用 ${DEFAULTS.DAILYHOT_API_BASE}。自建地址的域名必须已写在 wxt.config.ts 的 host_permissions 中。`}
        >
          <Input placeholder={DEFAULTS.DAILYHOT_API_BASE} allowClear />
        </Form.Item>
        <Form.Item
          name="DIDA_API_BASE"
          label="滴答清单 Open API 地址"
          extra={`留空则使用 ${DEFAULTS.DIDA_API_BASE}；国际版填 https://api.ticktick.com/open/v1`}
        >
          <Input placeholder={DEFAULTS.DIDA_API_BASE} allowClear />
        </Form.Item>
        <Form.Item
          name="DIDA_ACCESS_TOKEN"
          label="滴答清单 Access Token"
          extra="在 https://developer.ticktick.com 注册应用并完成 OAuth 后获取。未填写时任务卡片会提示未配置。"
        >
          <Input.Password placeholder="粘贴访问令牌" autoComplete="off" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            保存
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

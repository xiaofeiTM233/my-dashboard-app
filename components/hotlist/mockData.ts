// components/hotlist/mockData.ts
import type { HotItem } from "@/components/hotlist/types";

/**
 * 模拟数据 —— 微博热搜风格
 * 接入真实数据时，可按后端结构映射成 HotItem[] 即可。
 * 这里提供 9+ 条，足以覆盖 2x2 / 2x3 / 3x3 三种规格。
 */
export const mockHotItems: HotItem[] = [
  {
    id: "1",
    title: "全国多地迎来明显降温天气",
    hot: 4821300,
    tag: { text: "沸", type: "boil" },
    url: "#",
  },
  {
    id: "2",
    title: "国产新能源车型出海再创新高",
    hot: 3910500,
    tag: { text: "热", type: "hot" },
    url: "#",
  },
  {
    id: "3",
    title: "人工智能大模型开源生态持续扩大",
    hot: 3256700,
    tag: { text: "热", type: "hot" },
    url: "#",
  },
  {
    id: "4",
    title: "城市夜经济点亮夏日消费新场景",
    hot: 2891200,
    tag: { text: "新", type: "new" },
    url: "#",
  },
  {
    id: "5",
    title: "高校科研团队取得关键突破",
    hot: 2548800,
    url: "#",
  },
  {
    id: "6",
    title: "全民健身热潮席卷各地社区",
    hot: 2213400,
    tag: { text: "新", type: "new" },
    url: "#",
  },
  {
    id: "7",
    title: "乡村文旅融合催生特色小镇",
    hot: 1987600,
    url: "#",
  },
  {
    id: "8",
    title: "夜间高铁班次加密方便出行",
    hot: 1765200,
    url: "#",
  },
  {
    id: "9",
    title: "数字人民币试点场景再扩容",
    hot: 1543100,
    tag: { text: "广", type: "ad" },
    url: "#",
  },
  {
    id: "10",
    title: "夏季农产品丰收带动农民增收",
    hot: 1329800,
    url: "#",
  },
  {
    id: "11",
    title: "青少年科技赛事圆满落幕",
    hot: 1104500,
    url: "#",
  },
  {
    id: "12",
    title: "老旧小区改造提升居民幸福感",
    hot: 982300,
    url: "#",
  },
];

/** 按规格裁剪条目数：2x2=4 / 2x3=6 / 3x3=9 */
export function sliceBySize(
  items: HotItem[],
  size: "2x2" | "2x3" | "3x3"
): HotItem[] {
  const count = size === "2x2" ? 4 : size === "2x3" ? 6 : 9;
  return items.slice(0, count);
}

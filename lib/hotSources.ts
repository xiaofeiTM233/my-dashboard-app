/**
 * DailyHotApi 信息源目录
 * @see https://github.com/imsyy/DailyHotApi
 *
 * 每个热榜对应上游的一个路由，即 `GET {base}/{id}`。
 * 分类仅用于前端选择器分组展示。
 */

export type HotCategory =
  | "热门资讯"
  | "科技数码"
  | "社区讨论"
  | "影音娱乐"
  | "游戏"
  | "其他";

export interface HotSource {
  /** 对应 DailyHotApi 的路由名，即 GET {base}/{id} */
  id: string;
  /** 展示名称 */
  name: string;
  /** 榜单类型，如「热搜榜」 */
  type: string;
  category: HotCategory;
}

export const HOT_CATEGORIES: HotCategory[] = [
  "热门资讯",
  "科技数码",
  "社区讨论",
  "影音娱乐",
  "游戏",
  "其他",
];

export const HOT_SOURCES: HotSource[] = [
  // 热门资讯
  { id: "weibo", name: "微博", type: "热搜榜", category: "热门资讯" },
  { id: "zhihu", name: "知乎", type: "热榜", category: "热门资讯" },
  { id: "baidu", name: "百度", type: "热搜榜", category: "热门资讯" },
  { id: "toutiao", name: "今日头条", type: "热榜", category: "热门资讯" },
  { id: "douyin", name: "抖音", type: "热点榜", category: "热门资讯" },
  { id: "kuaishou", name: "快手", type: "热点榜", category: "热门资讯" },
  { id: "qq-news", name: "腾讯新闻", type: "热点榜", category: "热门资讯" },
  { id: "sina-news", name: "新浪新闻", type: "热点榜", category: "热门资讯" },
  { id: "netease-news", name: "网易新闻", type: "热点榜", category: "热门资讯" },
  { id: "thepaper", name: "澎湃新闻", type: "热榜", category: "热门资讯" },
  { id: "sina", name: "新浪网", type: "热榜", category: "热门资讯" },
  { id: "huxiu", name: "虎嗅", type: "24小时", category: "热门资讯" },
  { id: "ifanr", name: "爱范儿", type: "快讯", category: "热门资讯" },
  { id: "zhihu-daily", name: "知乎日报", type: "推荐榜", category: "热门资讯" },

  // 科技数码
  { id: "ithome", name: "IT之家", type: "热榜", category: "科技数码" },
  { id: "ithome-xijiayi", name: "IT之家喜加一", type: "最新动态", category: "科技数码" },
  { id: "36kr", name: "36氪", type: "热榜", category: "科技数码" },
  { id: "juejin", name: "稀土掘金", type: "热榜", category: "科技数码" },
  { id: "sspai", name: "少数派", type: "热榜", category: "科技数码" },
  { id: "guokr", name: "果壳", type: "热门文章", category: "科技数码" },
  { id: "csdn", name: "CSDN", type: "排行榜", category: "科技数码" },
  { id: "51cto", name: "51CTO", type: "推荐榜", category: "科技数码" },
  { id: "nodeseek", name: "NodeSeek", type: "最新动态", category: "科技数码" },
  { id: "jianshu", name: "简书", type: "热门推荐", category: "科技数码" },
  { id: "hellogithub", name: "HelloGitHub", type: "Trending", category: "科技数码" },
  { id: "geekpark", name: "极客公园", type: "热榜", category: "科技数码" },
  { id: "hackernews", name: "Hacker News", type: "热榜", category: "科技数码" },
  { id: "producthunt", name: "Product Hunt", type: "热榜", category: "科技数码" },
  { id: "linuxdo", name: "Linux.do", type: "最新动态", category: "科技数码" },

  // 社区讨论
  { id: "v2ex", name: "V2EX", type: "主题榜", category: "社区讨论" },
  { id: "ngabbs", name: "NGA", type: "热帖", category: "社区讨论" },
  { id: "hupu", name: "虎扑", type: "步行街热帖", category: "社区讨论" },
  { id: "tieba", name: "百度贴吧", type: "热议榜", category: "社区讨论" },
  { id: "douban-group", name: "豆瓣小组", type: "讨论精选", category: "社区讨论" },
  { id: "hostloc", name: "全球主机交流", type: "榜单", category: "社区讨论" },
  { id: "52pojie", name: "吾爱破解", type: "榜单", category: "社区讨论" },
  { id: "coolapk", name: "酷安", type: "热榜", category: "社区讨论" },
  { id: "newsmth", name: "水木社区", type: "热帖", category: "社区讨论" },
  { id: "dgtle", name: "数字尾巴", type: "热榜", category: "社区讨论" },
  { id: "smzdm", name: "什么值得买", type: "热榜", category: "社区讨论" },
  { id: "yystv", name: "游研社", type: "热榜", category: "社区讨论" },

  // 影音娱乐
  { id: "bilibili", name: "哔哩哔哩", type: "热门榜", category: "影音娱乐" },
  { id: "acfun", name: "AcFun", type: "排行榜", category: "影音娱乐" },
  { id: "douban-movie", name: "豆瓣电影", type: "新片榜", category: "影音娱乐" },
  { id: "weread", name: "微信读书", type: "飙升榜", category: "影音娱乐" },

  // 游戏
  { id: "miyoushe", name: "米游社", type: "最新消息", category: "游戏" },
  { id: "genshin", name: "原神", type: "最新消息", category: "游戏" },
  { id: "honkai", name: "崩坏3", type: "最新动态", category: "游戏" },
  { id: "starrail", name: "崩坏星穹铁道", type: "最新动态", category: "游戏" },
  { id: "lol", name: "英雄联盟", type: "更新公告", category: "游戏" },
  { id: "gameres", name: "游戏研究社", type: "热榜", category: "游戏" },

  // 其他
  { id: "weatheralarm", name: "中央气象台", type: "气象预警", category: "其他" },
  { id: "earthquake", name: "中国地震台", type: "地震速报", category: "其他" },
  { id: "history", name: "历史上的今天", type: "月-日", category: "其他" },
  { id: "nytimes", name: "纽约时报", type: "热榜", category: "其他" },
];

const SOURCE_MAP = new Map(HOT_SOURCES.map((item) => [item.id, item]));

export const DEFAULT_HOT_SOURCE = "weibo";

/** 热榜卡片顶部 Tab 的信息源（按展示顺序） */
export const HOT_TAB_SOURCE_IDS = [
  "weibo",
  "douyin",
  "zhihu",
  "bilibili",
  "ithome",
  "juejin",
  "toutiao",
] as const;

export type HotTabSourceId = (typeof HOT_TAB_SOURCE_IDS)[number];

/** 按路由名查找信息源，未收录时返回 undefined */
export function getHotSource(id: string | null | undefined): HotSource | undefined {
  if (!id) return undefined;
  return SOURCE_MAP.get(id);
}

/** Tab 用的信息源列表（过滤掉未收录 id） */
export const HOT_TAB_SOURCES: HotSource[] = HOT_TAB_SOURCE_IDS.map((id) =>
  getHotSource(id),
).filter((item): item is HotSource => Boolean(item));

export function isHotTabSourceId(id: string | null | undefined): boolean {
  return !!id && (HOT_TAB_SOURCE_IDS as readonly string[]).includes(id);
}

// app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";

// 搜索引擎配置
const searchEngines = [
  { id: "baidu", name: "百度", icon: "/baidu.png", icon2: "/baidu_2.png", url: "https://www.baidu.com/s?wd=" },
  { id: "bing", name: "必应", icon: "/bing.png", icon2: "/bing_2.png", url: "https://www.bing.com/search?q=" },
  { id: "google", name: "谷歌", icon: "/google.png", icon2: "/google_2.png", url: "https://www.google.com/search?q=" },
];

export default function Home() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [currentEngine, setCurrentEngine] = useState(searchEngines[1]);
  const [showEngineSelector, setShowEngineSelector] = useState(false);
  const isInitialMount = useRef(true);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 首次挂载时设置初始时间
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setCurrentTime(new Date());
    }

    // 每秒更新时间
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return { hours, minutes, seconds };
  };

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  const formatWeekday = (date: Date) => {
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    return weekdays[date.getDay()];
  };

  // 防抖函数，限制 API 调用频率
  const debounce = <T extends (...args: never[]) => unknown>(func: T, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // 从百度 API 获取搜索建议
  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // 使用 JSONP 调用百度建议 API
      const callbackName = `baidu_suggestion_${Date.now()}`;
      const script = document.createElement("script");
      script.src = `https://suggestion.baidu.com/su?p=3&ie=UTF-8&cb=${callbackName}&wd=${encodeURIComponent(query)}`;

      // 创建回调函数
      (window as unknown as Record<string, unknown>)[callbackName] = (data: { s?: string[] }) => {
        if (data && data.s) {
          setSuggestions(data.s);
          setShowSuggestions(data.s.length > 0);
          setSelectedIndex(-1);
        }
        // 清理资源
        document.head.removeChild(script);
        delete (window as unknown as Record<string, unknown>)[callbackName];
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // 防抖版本的 fetchSuggestions
  const debouncedFetchSuggestions = debounce(fetchSuggestions, 300);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedFetchSuggestions(value);
  };

  // 处理建议项点击
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // 使用当前搜索引擎在新标签页中打开搜索
    window.open(`${currentEngine.url}${encodeURIComponent(suggestion)}`, "_blank");
  };

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else if (searchQuery.trim()) {
          window.open(`${currentEngine.url}${encodeURIComponent(searchQuery)}`, "_blank");
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.open(`${currentEngine.url}${encodeURIComponent(searchQuery)}`, "_blank");
    }
  };

  // 点击外部区域时关闭建议列表和引擎选择器
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowEngineSelector(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const { hours, minutes, seconds } = currentTime
    ? formatTime(currentTime)
    : { hours: "--", minutes: "--", seconds: "--" };
  const dateStr = currentTime ? formatDate(currentTime) : "";
  const weekdayStr = currentTime ? formatWeekday(currentTime) : "";

  return (
    <div className="icon-s icon-home-small home h-full w-full">
      {/* 视频背景 */}
      <section className="home-wallpaper h-full w-full">
        <video
          className="h-full w-full object-cover"
          src="https://eo.hitfun.top/bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="mask absolute top-0 left-0 h-full w-full transition-colors" style={{ backgroundColor: "rgba(0, 0, 0, 0.03)", backdropFilter: "blur(0px)" }}></div>
      </section>

      {/* 主要内容覆盖层 */}
      <div className="home-main absolute top-0 left-0 h-full w-full transition-transform duration-300">
        <section className="page-active absolute flex h-full w-full flex-col items-center">
          {/* 时钟显示 */}
          <div className="mt-[28.5vh] flex font-[family-name:var(--font-mind-demi-bold)] text-[130px] leading-[100px] text-[rgba(245,245,250,0.8)] max-md:text-[70px] max-md:leading-[70px]">
            <p className="flex-shrink-0 text-right">{hours}</p>
            <span>:</span>
            <p className="flex-shrink-0 text-center">{minutes}</p>
            <span>:</span>
            <p className="w-[170px] flex-shrink-0 text-left max-md:w-[90px]">{seconds}</p>
          </div>

          {/* 日期显示 */}
          <p className="absolute top-[calc(28.5vh+128px)] font-[family-name:var(--font-mind-regular)] text-[32px] leading-[39px] text-[rgba(245,245,250,0.8)] max-md:top-[calc(28.5vh+80px)] max-md:text-[20px]">
            <span>{dateStr}&nbsp;&nbsp;</span>
            <span>{weekdayStr}</span>
          </p>
        </section>

        {/* 搜索栏 */}
        <section
          ref={searchBoxRef}
          className="absolute-center top-[12vh] w-[568px] max-w-[86vw] transition-opacity duration-100 focus-within:opacity-100"
          style={{ width: "567.6px" }}
        >
          <form
            className="relative border-opacity-10 bg-opacity-60 search-box flex h-[52px] items-center rounded-[12px] border-[1px] border-solid border-color-white bg-color-m1 transition-colors duration-100 focus-within:bg-opacity-80 focus-within:!opacity-100 dark:focus-within:bg-opacity-70 w-full"
            style={{ opacity: 1 }}
            onSubmit={handleSubmit}
          >
            {/* 搜索引擎图标 */}
            <div className="flex h-full w-[52px] items-center justify-center">
              <div
                className="flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[8px] bg-opacity-80 hover:bg-color-white hover:bg-opacity-80"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEngineSelector(!showEngineSelector);
                }}
              >
                <section
                  className="flex items-center justify-center overflow-hidden bg-cover h-[24px] w-[24px] rounded-[6px]"
                  style={{
                    backgroundImage: `url("${currentEngine.icon}")`,
                  }}
                />
              </div>
            </div>

            {/* 搜索输入框 */}
            <input
              id="search_input"
              tabIndex={1}
              className="h-full grow bg-[transparent] py-[12px] pl-[4px] pr-[42px] text-[16px] text-color-t1 placeholder:text-color-t1 placeholder:text-opacity-40"
              type="search"
              placeholder="输入搜索内容"
              autoComplete="off"
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchQuery.trim() && suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
            />
            {/* 清除按钮 */}
            {searchQuery && (
              <div className="absolute top-0 right-0 flex h-full w-[52px] items-center justify-center hi-demand" data-v-7655e2c3="">
                <button
                  tabIndex={-1}
                  type="button"
                  className="h-[32px] w-[32px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery("");
                    setShowSuggestions(false);
                    setSuggestions([]);
                  }}
                >
                  <i className="iconfont icon-clear_merge_icon text-[16px] text-color-t2 duration-150"></i>
                </button>
              </div>
            )}
          </form>

          {/* 搜索建议列表 */}
          {showSuggestions && suggestions.length > 0 && (
            <section className="suggest-box glass-card mt-[4px] overflow-hidden border-color-white border-opacity-40 text-[14px] dark:border-opacity-10 w-full" style={{ backgroundColor: 'rgb(var(--color-m1) / 0.8)' }}>
              <div className="wrapper">
                <ul className="list overflow-auto py-[4px]">
                  {/* 搜索引擎选项 */}
                  {searchEngines.map((engine) => (
                    <li key={engine.id} className="li mx-[8px] my-[4px] flex h-[36px] cursor-pointer items-center justify-between rounded-[8px] transition-colors hover:bg-color-m2 hover:bg-opacity-[0.06] dark:hover:bg-opacity-10" style={{ backgroundColor: 'rgb(255 255 255 / 0.8)' }} onClick={(e) => { e.stopPropagation(); window.open(`${engine.url}${encodeURIComponent(searchQuery)}`, "_blank"); }}>
                      <div className="ml-[8px] flex max-w-[60%] flex-grow items-center">
                        <section className="hi-icon flex items-center justify-center overflow-hidden bg-cover h-[24px] w-[24px] rounded-[6px]" style={{ backgroundImage: `url("${engine.icon2}")` }}></section>
                        <span className="ml-[12px] max-w-[70%] overflow-hidden text-ellipsis whitespace-nowrap text-color-blue">{searchQuery}</span>
                      </div>
                      <div className="text-dot mr-[12px] flex max-w-[40%] items-center">
                        <span className="text-dot text-[12px] text-color-t3">{engine.name}</span>
                        <i className="iconfont icon-arrow_icon ml-[12px] text-[12px] text-color-blue"></i>
                      </div>
                    </li>
                  ))}
                  {/* 搜索建议项 */}
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className={`bg-color-m2 bg-opacity-0 li mx-[8px] my-[4px] flex h-[36px] cursor-pointer items-center rounded-[8px] px-[8px] transition-colors hover:bg-opacity-[0.06] ${index === selectedIndex ? "bg-opacity-[0.06]" : ""
                        }`}

                      onClick={(e) => {
                        e.stopPropagation();
                        handleSuggestionClick(suggestion);
                      }}
                    >
                      <i className="iconfont icon-magnifier_icon mr-[16px] text-[20px] text-color-t3"></i>
                      <div className="max-w-[80%] overflow-hidden text-ellipsis whitespace-nowrap text-color-t2">
                        {suggestion}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {/* 引擎选择器 */}
          {showEngineSelector && (
            <section className="engine-box glass-card mt-[4px] border-color-white border-opacity-40 bg-color-m1 bg-opacity-80 px-[20px] pt-[20px] pb-[24px] dark:border-opacity-10 dark:bg-opacity-70 w-full" data-v-7ac19e27="">
              <div className="wrapper text-[12px]" data-v-7ac19e27="">
                <ul className="relative grid grid-cols-[repeat(auto-fill,48px)] gap-[20px]" data-v-7ac19e27="">
                  {searchEngines.map((engine) => (
                    <li key={engine.id} className="search-drop flex flex-col items-center" data-v-7ac19e27="">
                      <div
                        className="group cursor-pointer icon search-drag relative flex h-[48px] w-[48px] items-center justify-center rounded-[12px] bg-color-white bg-opacity-80 transition-colors hover:bg-opacity-100 dark:bg-opacity-[0.06] dark:hover:bg-opacity-20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentEngine(engine);
                          setShowEngineSelector(false);
                        }}
                        data-v-7ac19e27=""
                      >
                        <section className="hi-icon flex items-center justify-center overflow-hidden bg-cover h-[24px] w-[24px] rounded-[6px]" data-v-7ac19e27="" style={{ backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: `url("${engine.icon}")` }}></section>
                      </div>
                      <div className="mt-[4px] w-[60px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-color-t3" data-v-7ac19e27="">
                        {engine.name}
                      </div>
                    </li>
                  ))}
                  <li className="flex flex-col items-center" data-v-7ac19e27="">
                    <div className="icon flex h-[48px] w-[48px] cursor-pointer items-center justify-center rounded-[12px] bg-color-white bg-opacity-80 transition-colors hover:bg-opacity-100 dark:bg-opacity-[0.06] dark:hover:bg-opacity-20" data-v-7ac19e27="">
                      <i className="iconfont icon-plus_large_icon text-[24px] text-color-t3" data-v-7ac19e27=""></i>
                    </div>
                    <div className="mt-[4px] w-[60px] overflow-hidden text-ellipsis whitespace-nowrap text-center text-color-t3" data-v-7ac19e27="">
                      添加
                    </div>
                  </li>
                </ul>
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}

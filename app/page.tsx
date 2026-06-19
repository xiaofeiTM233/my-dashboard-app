"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Set initial time on first mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setCurrentTime(new Date());
    }

    // Update time every second
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

  // Debounce function to limit API calls
  const debounce = <T extends (...args: never[]) => unknown>(func: T, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Fetch suggestions from Baidu API
  const fetchSuggestions = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Use JSONP to call Baidu suggestion API
      const callbackName = `baidu_suggestion_${Date.now()}`;
      const script = document.createElement("script");
      script.src = `https://suggestion.baidu.com/su?p=3&ie=UTF-8&cb=${callbackName}&wd=${encodeURIComponent(query)}`;

      // Create callback function
      (window as unknown as Record<string, unknown>)[callbackName] = (data: { s?: string[] }) => {
        if (data && data.s) {
          setSuggestions(data.s);
          setShowSuggestions(data.s.length > 0);
          setSelectedIndex(-1);
        }
        // Clean up
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

  // Debounced version of fetchSuggestions
  const debouncedFetchSuggestions = debounce(fetchSuggestions, 300);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedFetchSuggestions(value);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // Open search in new tab
    window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(suggestion)}`, "_blank");
  };

  // Handle keyboard navigation
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
          window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(searchQuery)}`, "_blank");
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        break;
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(searchQuery)}`, "_blank");
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
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
      {/* === Video Background === */}
      <section className="home-wallpaper h-full w-full">
        <video
          className="h-full w-full object-cover"
          src="https://eo.hitfun.top/bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </section>

      {/* === Main Content Overlay === */}
      <div className="home-main absolute top-0 left-0 h-full w-full transition-transform duration-300">
        <section className="page-active absolute flex h-full w-full flex-col items-center">
          {/* === Clock Display === */}
          <div className="mt-[28.5vh] flex font-[family-name:var(--font-mind-demi-bold)] text-[130px] leading-[100px] text-[rgba(245,245,250,0.8)] max-md:text-[70px] max-md:leading-[70px]">
            <p className="flex-shrink-0 text-right">{hours}</p>
            <span>:</span>
            <p className="flex-shrink-0 text-center">{minutes}</p>
            <span>:</span>
            <p className="w-[170px] flex-shrink-0 text-left max-md:w-[90px]">{seconds}</p>
          </div>

          {/* === Date Display === */}
          <p className="absolute top-[calc(28.5vh+128px)] font-[family-name:var(--font-mind-regular)] text-[32px] leading-[39px] text-[rgba(245,245,250,0.8)] max-md:top-[calc(28.5vh+80px)] max-md:text-[20px]">
            <span>{dateStr}&nbsp;&nbsp;</span>
            <span>{weekdayStr}</span>
          </p>
        </section>

        {/* === Search Bar === */}
        <section
          className="absolute-center top-[12vh] w-[568px] max-w-[86vw] transition-opacity duration-100 focus-within:opacity-100"
          style={{ width: "567.6px" }}
        >
          <form
            className="border-opacity-10 bg-opacity-60 search-box flex h-[52px] items-center rounded-[12px] border-[1px] border-solid border-color-white bg-color-m1 transition-colors duration-100 focus-within:bg-opacity-80 focus-within:!opacity-100 dark:focus-within:bg-opacity-70 w-full"
            style={{ opacity: 1 }}
            onSubmit={handleSubmit}
          >
            {/* Search Engine Icon */}
            <div className="flex h-full w-[52px] items-center justify-center">
              <div className="flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-[8px] bg-opacity-80 hover:bg-white/80">
                <section
                  className="flex items-center justify-center overflow-hidden bg-cover h-[24px] w-[24px] rounded-[6px]"
                  style={{
                    backgroundImage:
                      'url("https://static.wetab.link/user-custom-icon/zh/644b78ec2a77ac35cd5059c5/user-custom-icon1isknn3l5l3vhd0tb59123a90bv.png?imageMogr2/thumbnail/48x/format/webp/blur/1x0/quality/100|imageslim")',
                  }}
                />
              </div>
            </div>

            {/* Search Input */}
            <input
              tabIndex={1}
              className="h-full grow bg-transparent py-[12px] pl-[4px] pr-[42px] text-[16px] text-color-t1 placeholder:text-color-t1 placeholder:opacity-40 outline-none"
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
          </form>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <section className="suggest-box glass-card mt-[4px] overflow-hidden border-color-white border-opacity-40 text-[14px] dark:border-opacity-10 w-full" style={{ backgroundColor: 'rgb(var(--color-m1) / 0.8)' }} data-v-4d25fa4c="">
              <div className="wrapper" data-v-4d25fa4c="">
                <ul className="list overflow-auto py-[4px]" data-v-4d25fa4c="">
                  {/* Search Engine Options */}
                  <li className="li mx-[8px] my-[4px] flex h-[36px] cursor-pointer items-center justify-between rounded-[8px] transition-colors hover:bg-color-m2 hover:bg-opacity-[0.06] dark:hover:bg-opacity-10" style={{ backgroundColor: 'rgb(255 255 255 / 0.8)' }} data-v-4d25fa4c="" onClick={(e) => { e.stopPropagation(); window.open(`https://www.baidu.com/s?wd=${encodeURIComponent(searchQuery)}`, "_blank"); }}>
                    <div className="ml-[8px] flex max-w-[60%] flex-grow items-center" data-v-4d25fa4c="">
                      <section className="hi-icon flex items-center justify-center overflow-hidden bg-cover h-[24px] w-[24px] rounded-[6px]" data-v-4d25fa4c="" style={{ backgroundImage: 'url("https://static.wetab.link/user-custom-icon/zh/644b78ec2a77ac35cd5059c5/user-custom-icon1gv3d9j69tz2m6qofnx45jsswdt.png?imageMogr2/thumbnail/48x/format/webp/blur/1x0/quality/100|imageslim")' }}></section>
                      <span className="ml-[12px] max-w-[70%] overflow-hidden text-ellipsis whitespace-nowrap text-color-blue" data-v-4d25fa4c="">{searchQuery}</span>
                    </div>
                    <div className="text-dot mr-[12px] flex max-w-[40%] items-center" data-v-4d25fa4c="">
                      <span className="text-dot text-[12px] text-color-t3" data-v-4d25fa4c="">百度</span>
                      <i className="iconfont icon-arrow_icon ml-[12px] text-[12px] text-color-blue" data-v-4d25fa4c=""></i>
                    </div>
                  </li>
                  <li className="li mx-[8px] my-[4px] flex h-[36px] cursor-pointer items-center justify-between rounded-[8px] transition-colors hover:bg-color-m2 hover:bg-opacity-[0.06] dark:hover:bg-opacity-10" style={{ backgroundColor: 'rgb(255 255 255 / 0.8)' }} data-v-4d25fa4c="" onClick={(e) => { e.stopPropagation(); window.open(`https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`, "_blank"); }}>
                    <div className="ml-[8px] flex max-w-[60%] flex-grow items-center" data-v-4d25fa4c="">
                      <section className="hi-icon flex items-center justify-center overflow-hidden bg-cover h-[24px] w-[24px] rounded-[6px]" data-v-4d25fa4c="" style={{ backgroundImage: 'url("https://static.wetab.link/user-custom-icon/zh/644b78ec2a77ac35cd5059c5/user-custom-icon1gv3da3l8ata1fr5fdeo17znucs.png?imageMogr2/thumbnail/48x/format/webp/blur/1x0/quality/100|imageslim")' }}></section>
                      <span className="ml-[12px] max-w-[70%] overflow-hidden text-ellipsis whitespace-nowrap text-color-blue" data-v-4d25fa4c="">{searchQuery}</span>
                    </div>
                    <div className="text-dot mr-[12px] flex max-w-[40%] items-center" data-v-4d25fa4c="">
                      <span className="text-dot text-[12px] text-color-t3" data-v-4d25fa4c="">Bing</span>
                      <i className="iconfont icon-arrow_icon ml-[12px] text-[12px] text-color-blue" data-v-4d25fa4c=""></i>
                    </div>
                  </li>
                  {/* Search Suggestions */}
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className={`bg-color-m2 bg-opacity-0 li mx-[8px] my-[4px] flex h-[36px] cursor-pointer items-center rounded-[8px] px-[8px] transition-colors hover:bg-opacity-[0.06] ${
                        index === selectedIndex ? "bg-opacity-[0.06]" : ""
                      }`}
                      data-v-4d25fa4c=""
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSuggestionClick(suggestion);
                      }}
                    >
                      <i className="iconfont icon-magnifier_icon mr-[16px] text-[20px] text-color-t3" data-v-4d25fa4c=""></i>
                      <div className="max-w-[80%] overflow-hidden text-ellipsis whitespace-nowrap text-color-t2" data-v-4d25fa4c="">
                        {suggestion}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}

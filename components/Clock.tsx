"use client";

import { useState, useEffect, useRef } from "react";

export default function Clock() {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setCurrentTime(new Date());
    }

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

  const { hours, minutes, seconds } = currentTime
    ? formatTime(currentTime)
    : { hours: "--", minutes: "--", seconds: "--" };
  const dateStr = currentTime ? formatDate(currentTime) : "";
  const weekdayStr = currentTime ? formatWeekday(currentTime) : "";

  return (
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
  );
}

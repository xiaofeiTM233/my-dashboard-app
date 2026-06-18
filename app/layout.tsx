import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Home",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="body-root h-full fixed top-0 bottom-0 left-0 right-0 overflow-hidden leading-[1.414] text-[14px] select-none">
        {children}
      </body>
    </html>
  );
}

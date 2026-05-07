import Image from "next/image";
import { BackgroundDecoration } from "@/components/bookshelf/BackgroundDecoration";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-noise liquid-page relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <BackgroundDecoration />
      <div className="relative z-10 grid w-full max-w-5xl items-center gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="liquid-panel hidden min-h-[34rem] rounded-2xl p-8 lg:block">
          <div className="liquid-hairline absolute inset-x-8 top-0 h-px" />
          <div className="relative flex h-full flex-col justify-between">
            <div>
              <Image src="/logo.svg" alt="ZB Reader" width={74} height={74} />
              <h1 className="mt-6 max-w-sm text-4xl font-semibold leading-tight tracking-tight text-foreground">
                安静、清透的个人 EPUB 阅读空间
              </h1>
              <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
                保存阅读进度、管理个人书架，并在桌面与移动设备上保持熟悉的阅读节奏。
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["EPUB", "进度同步", "分类书架"].map((item) => (
                <div key={item} className="liquid-stat rounded-xl px-3 py-3 text-sm font-medium text-foreground">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-[22rem] sm:max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

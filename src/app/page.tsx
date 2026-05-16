import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Volume2, 
  RefreshCw, 
  Zap, 
  Github,
  Layout,
  ChevronRight
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Navbar */}
      <header className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="relative size-8 overflow-hidden rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="size-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">ZB Reader</span>
          </div>
          <nav className="flex items-center gap-4">
          </nav>
        </div>
      </header>

      <main className="flex-1 pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col items-center text-center">
              <div className="animate-fade-in inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Zap className="size-3 text-cta" />
                <span>全新 2.0 版本现已发布</span>
              </div>
              <h1 className="mt-8 text-4xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
                沉浸式阅读 <br />
                <span className="text-muted-foreground">不仅仅是文字</span>
              </h1>
              <p className="mt-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
                ZB Reader 是一款专为爱书之人打造的在线阅读器。
                支持智能语音朗读与多端进度同步，让您的阅读体验更加纯粹、高效。
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link href="/login">
                  <Button size="lg" className="h-14 px-8 text-lg font-semibold shadow-lg shadow-primary/20">
                    开始阅读
                    <ChevronRight className="ml-1 size-5" />
                  </Button>
                </Link>
                <Link href="https://github.com/zuoban/zb-reader" target="_blank">
                  <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-semibold">
                    <Github className="mr-2 size-5" />
                    GitHub
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Background shapes */}
          <div className="absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="animate-blob size-[500px] rounded-full bg-cta/10 blur-[120px]" />
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-muted/30 py-24 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-4 p-6 rounded-3xl bg-background border border-border/50 shadow-sm transition-all hover:shadow-md">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10">
                  <Volume2 className="size-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">智能语音朗读</h3>
                <p className="text-muted-foreground">
                  内置多种自然音色，支持语速调节与定时关闭。闭上眼睛，让故事在耳边流淌，享受听书乐趣。
                </p>
              </div>
              <div className="flex flex-col gap-4 p-6 rounded-3xl bg-background border border-border/50 shadow-sm transition-all hover:shadow-md">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10">
                  <RefreshCw className="size-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">多端云同步</h3>
                <p className="text-muted-foreground">
                  书架与阅读进度在云端加密同步。无论是在电脑、平板还是手机，阅读体验永不中断。
                </p>
              </div>
              <div className="flex flex-col gap-4 p-6 rounded-3xl bg-background border border-border/50 shadow-sm transition-all hover:shadow-md">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10">
                  <Layout className="size-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">极致定制化</h3>
                <p className="text-muted-foreground">
                  自由调节字体、行高、页边距与背景色。配合纸张纹理效果，打造专属您的舒适阅读空间。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Preview Section */}
        <section className="py-24 sm:py-32 overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col items-center gap-16">
              <div className="text-center">
                <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">优雅的阅读界面</h2>
                <p className="mt-4 text-lg text-muted-foreground">每一处像素都为内容而生，拒绝干扰，专注于文字本身。</p>
              </div>
              <div className="relative w-full max-w-5xl">
                <div className="aspect-[16/10] overflow-hidden rounded-3xl border border-border shadow-2xl bg-background">
                  <div className="flex h-10 items-center gap-2 border-b border-border bg-muted/30 px-4">
                    <div className="size-3 rounded-full bg-border" />
                    <div className="size-3 rounded-full bg-border" />
                    <div className="size-3 rounded-full bg-border" />
                    <div className="ml-4 h-5 w-48 rounded-md bg-muted/50" />
                  </div>
                  <div className="p-8 sm:p-16 h-full bg-background paper-texture overflow-y-auto">
                    <div className="max-w-2xl mx-auto flex flex-col gap-8">
                      <h2 className="font-heading text-4xl italic tracking-tight">第一章：纯粹的愉悦</h2>
                      <div className="flex flex-col gap-6 text-xl leading-relaxed text-foreground/90 font-serif">
                        <p>真正伟大的阅读体验，在于能够跨越媒介的限制，触及灵魂的深处。当我们打开一本好书时，现实世界便悄然退去，只留下心与文字的共鸣。</p>
                        <p>在 ZB Reader 中，我们试图找回那种最初的感动。没有弹窗干扰，没有繁琐的层级，只有你与作者之间的对话。这种简洁并非缺失，而是一种极致的聚焦。</p>
                        <p>配合智能朗读技术，即使在忙碌的通勤途中，您依然可以沉浸在文学的海洋里。进度自动保存，情感无缝衔接。</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Floating UI Mocks */}
                <div className="absolute -right-8 top-1/4 hidden lg:block w-64 rounded-2xl border border-border bg-background/80 p-4 shadow-xl backdrop-blur-md">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-cta/20 flex items-center justify-center">
                      <Volume2 className="size-5 text-cta" />
                    </div>
                    <div>
                      <div className="text-sm font-bold">正在朗读</div>
                      <div className="text-xs text-muted-foreground">王建平 - 标准男声</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-end gap-1 h-6">
                    <div className="h-2 flex-1 rounded-full bg-cta" />
                    <div className="h-4 flex-1 rounded-full bg-cta" />
                    <div className="h-3 flex-1 rounded-full bg-cta" />
                    <div className="h-5 flex-1 rounded-full bg-cta" />
                    <div className="h-2 flex-1 rounded-full bg-cta" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 sm:py-32">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[2.5rem] bg-primary px-6 py-20 text-center text-primary-foreground sm:px-12 sm:py-32">
              <h2 className="text-3xl font-bold tracking-tight sm:text-6xl">开启您的私人书架</h2>
              <p className="mx-auto mt-6 max-w-xl text-lg opacity-80 sm:text-xl">
                立即开始管理您的电子书收藏，享受多端无缝阅读的乐趣。
              </p>
              {/* Decorative elements */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 size-96 rounded-full bg-white/5 blur-3xl" />
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 size-96 rounded-full bg-white/5 blur-3xl" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center gap-4 text-center text-xs text-muted-foreground">
            <div className="flex items-center gap-6">
              <span>© {new Date().getFullYear()} ZB Reader</span>
              <Link 
                href="https://github.com/zuoban/zb-reader" 
                target="_blank"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Github className="size-3.5" />
                GitHub
              </Link>
            </div>
            <p className="opacity-50">使用 Next.js & Tailwind CSS 构建</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

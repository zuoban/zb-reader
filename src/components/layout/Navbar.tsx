"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { Library, LogOut, Moon, Sun, User } from "lucide-react";
import { UploadButton } from "@/components/bookshelf/UploadButton";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/layout/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NavbarProps {
  onUploadComplete?: () => void;
  className?: string;
}

export function Navbar({ onUploadComplete, className }: NavbarProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const handleThemeToggle = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    try {
      await fetch("/api/reader-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: newTheme === "dark" ? "dark" : "light",
        }),
      });
    } catch {
      // ignore
    }
  };

  return (
    <header className={cn("sticky top-2 z-50 w-full sm:top-4", className)}>
      <nav className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="relative flex h-14 items-center justify-between overflow-hidden rounded-[1.25rem] border border-white/30 bg-white/40 px-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl saturate-150 transition-all duration-500 hover:border-white/40 hover:bg-white/50 sm:h-16 sm:rounded-[1.5rem] sm:px-4 dark:border-white/10 dark:bg-black/20 dark:hover:border-white/20 dark:hover:bg-black/30">
          {/* Dynamic Light Reflection Edge */}
          <div className="liquid-hairline absolute inset-x-4 top-0 h-px opacity-80" />
          
          {/* Left: Brand / Logo Area */}
          <Link
            href="/bookshelf"
            className="group relative flex min-w-0 items-center gap-3.5 rounded-2xl px-2 py-1.5 transition-all duration-400 ease-out hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:outline-none dark:hover:bg-white/5"
          >
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
              <div className="absolute inset-0 scale-75 rounded-full bg-indigo-500/10 blur-xl transition-transform duration-500 group-hover:scale-110" />
              <Image
                src="/logo.svg"
                alt="ZB Reader"
                width={42}
                height={42}
                priority
                className="relative z-10 transition-transform duration-500 ease-out group-hover:scale-[1.12]"
              />
            </div>
            <div className="hidden min-w-0 flex-col sm:flex">
              <span className="font-heading text-[0.95rem] font-bold tracking-tight text-foreground/90 transition-colors duration-400 group-hover:text-indigo-500">
                ZB Reader
              </span>
              <span className="text-[9px] font-bold tracking-[0.15em] text-muted-foreground/60 uppercase">
                Reading Space
              </span>
            </div>
          </Link>

          {/* Right: Actions Area */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex items-center gap-1.5 rounded-[1.25rem] bg-black/5 p-1 transition-all duration-400 dark:bg-white/5">
              {onUploadComplete && (
                <UploadButton
                  onUploadComplete={onUploadComplete}
                  variant="ghost"
                  className="h-9 gap-2 rounded-xl border border-white/20 bg-white/40 px-3 text-xs font-bold shadow-sm transition-all duration-400 hover:scale-[1.02] hover:bg-white/60 hover:shadow-md sm:h-10 sm:px-5 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                />
              )}

              {/* Refined Single Theme Toggle Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleThemeToggle}
                aria-label="切换主题"
                className="group relative h-9 w-9 overflow-hidden rounded-xl border border-white/20 bg-white/40 shadow-sm transition-all duration-500 hover:scale-105 hover:bg-white/60 hover:shadow-md sm:h-10 sm:w-10 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                
                <div className="relative z-10 flex h-full w-full items-center justify-center">
                  <Sun className="h-[19px] w-[19px] text-amber-500 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] dark:rotate-[120deg] dark:scale-0 dark:opacity-0" />
                  <Moon className="absolute h-[18px] w-[18px] text-indigo-400 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] -rotate-[120deg] scale-0 opacity-0 dark:rotate-0 dark:scale-100 dark:opacity-100" />
                </div>
                <span className="sr-only">切换主题</span>
              </Button>
            </div>

            {session?.user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label="打开用户菜单"
                    className="relative h-9.5 w-9.5 shrink-0 rounded-full p-0.5 transition-all duration-400 hover:scale-105 hover:ring-2 hover:ring-indigo-500/30 sm:h-11 sm:w-11"
                  >
                    <Avatar className="h-full w-full border border-white/30 shadow-sm">
                      <AvatarImage src={session.user.avatar || undefined} alt={session.user.username || "用户头像"} />
                      <AvatarFallback className="bg-indigo-500/10 font-bold text-sm text-indigo-600">
                        {session.user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={12}
                  className="w-60 overflow-hidden rounded-[1.25rem] border-white/20 bg-white/70 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-200 dark:bg-slate-900/80"
                >
                  <div className="flex items-center gap-3.5 px-3 py-4">
                    <Avatar className="h-12 w-12 border-2 border-indigo-500/20 shadow-lg">
                      <AvatarImage src={session.user.avatar || undefined} alt={session.user.username || "用户头像"} />
                      <AvatarFallback className="bg-indigo-500/10 font-bold text-indigo-600">
                        {session.user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <p className="truncate text-[0.95rem] font-bold text-foreground leading-tight">{session.user.username}</p>
                      <p className="truncate text-[11px] font-medium text-muted-foreground/80 mt-1 uppercase tracking-wider">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="mx-2 bg-foreground/5" />
                  <div className="space-y-1 p-1">
                    <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-3 px-3 transition-all hover:bg-indigo-500/10">
                      <Link href="/bookshelf" className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                          <Library className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-sm font-bold">我的书架</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-xl py-3 px-3 transition-all hover:bg-indigo-500/10">
                      <Link href="/profile" className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10 text-slate-500">
                          <User className="h-4.5 w-4.5" />
                        </div>
                        <span className="text-sm font-bold">个人资料</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="mx-2 bg-foreground/5" />
                  <div className="p-1">
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                      className="cursor-pointer rounded-xl py-3 px-3 text-destructive font-bold transition-all hover:bg-destructive/10"
                    >
                      <LogOut className="mr-3 h-4.5 w-4.5" />
                      <span className="text-sm">退出登录</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

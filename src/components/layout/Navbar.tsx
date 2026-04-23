"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { Library, LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { UploadButton } from "@/components/bookshelf/UploadButton";
import { Button } from "@/components/ui/button";
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
    <header className={cn("sticky top-2 z-50 w-full sm:top-3", className)}>
      <nav className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="surface-glass surface-elevated relative flex h-14 items-center justify-between overflow-hidden rounded-2xl px-2.5 transition-all duration-300 sm:h-15 sm:px-3">
          <div className="liquid-hairline pointer-events-none absolute inset-x-3 top-0 h-px" />

          {/* Logo */}
          <Link
            href="/bookshelf"
            className="group relative flex min-w-0 items-center gap-3 rounded-xl px-1.5 py-1 transition-all duration-200 hover:bg-background/34 focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:outline-none"
          >
            <div className="liquid-control relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-shadow duration-300">
              <Image
                src="/logo.svg"
                alt="ZB Reader"
                width={26}
                height={26}
                className="transition-transform duration-300 group-hover:scale-[1.08]"
              />
            </div>
            <div className="hidden min-w-0 flex-col sm:flex">
              <span className="font-heading text-[0.95rem] font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-[color:var(--cta)]">
                ZB Reader
              </span>
              <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
                阅读空间
              </span>
            </div>
          </Link>

          {/* Actions */}
          <div className="top-action-group relative flex items-center gap-1 rounded-2xl p-1">
            {onUploadComplete && (
              <UploadButton
                onUploadComplete={onUploadComplete}
                variant="ghost"
                className="top-action-primary h-8.5 gap-1.5 rounded-xl px-2.5 text-xs font-medium transition-all duration-200 sm:h-9 sm:gap-2 sm:px-3"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleThemeToggle}
              aria-label="切换主题"
              className="top-icon-button relative h-8.5 w-8.5 rounded-xl transition-all duration-200 sm:h-9 sm:w-9"
            >
              <Sun className="h-[17px] w-[17px] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[17px] w-[17px] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
              <span className="sr-only">切换主题</span>
            </Button>

            {session?.user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label="打开用户菜单"
                    className="top-icon-button relative h-8.5 w-8.5 rounded-full p-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[color:var(--cta)]/50 focus-visible:ring-offset-2 sm:h-9 sm:w-9"
                  >
                    <Avatar className="h-7.5 w-7.5 sm:h-8 sm:w-8">
                      <AvatarImage src={session.user.avatar || undefined} alt={session.user.username || "用户头像"} />
                      <AvatarFallback className="bg-gradient-to-br from-[color:var(--cta)]/30 to-primary/10 text-primary font-semibold text-sm">
                        {session.user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="w-56 border-border/70 bg-card/95 shadow-[0_8px_32px_-12px_color-mix(in_oklab,var(--foreground)_30%,transparent)] backdrop-blur-2xl animate-in fade-in-0 zoom-in-95 duration-200"
                >
                  <div className="flex items-center gap-3 px-3 py-3.5">
                    <Avatar className="h-11 w-11 border-2 border-[color:var(--cta)]/20 shadow-[0_2px_8px_-2px_color-mix(in_oklab,var(--cta)_25%,transparent)]">
                      <AvatarImage src={session.user.avatar || undefined} alt={session.user.username || "用户头像"} />
                      <AvatarFallback className="bg-gradient-to-br from-[color:var(--cta)]/30 to-primary/10 text-primary font-semibold">
                        {session.user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col justify-center">
                      <p className="truncate font-semibold text-foreground text-sm leading-tight">{session.user.username}</p>
                      <p className="truncate text-xs text-muted-foreground leading-tight mt-0.5">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <div className="py-1.5 px-1.5">
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5 px-3 transition-colors hover:bg-accent/60 focus:bg-accent/60">
                      <Link href="/bookshelf" className="flex items-center gap-2.5">
                        <Library className="h-4 w-4 text-[color:var(--cta)]" />
                        <span className="text-sm font-medium">我的书架</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5 px-3 transition-colors hover:bg-accent/60 focus:bg-accent/60">
                      <Link href="/profile" className="flex items-center gap-2.5">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">个人资料</span>
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <div className="py-1.5 px-1.5 pb-2">
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                      className="cursor-pointer rounded-lg py-2.5 px-3 text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="mr-2.5 h-4 w-4" />
                      <span className="text-sm font-medium">退出登录</span>
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

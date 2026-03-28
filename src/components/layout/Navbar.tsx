"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { Upload, Moon, Sun, LogOut, User, Library } from "lucide-react";
import { useTheme } from "next-themes";
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
  onUploadClick?: () => void;
  className?: string;
}

export function Navbar({ onUploadClick, className }: NavbarProps) {
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
    <header className={cn("sticky top-3 z-50 w-full", className)}>
      <nav className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="relative flex h-14 items-center justify-between overflow-hidden rounded-[1.15rem] border border-border/60 bg-background/86 px-3.5 shadow-[0_16px_36px_-30px_color-mix(in_oklab,var(--foreground)_14%,transparent)] backdrop-blur-xl transition-all duration-300 sm:px-5">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />
          {/* Logo */}
          <Link
            href="/bookshelf"
            className="group relative flex items-center gap-3 transition-all duration-200"
          >
            <div className="relative flex h-9 w-9 items-center justify-center">
              <Image
                src="/logo.svg"
                alt="ZB Reader"
                width={36}
                height={36}
                className="transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <div className="hidden flex-col sm:flex">
              <span className="font-heading text-[1.05rem] font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
                ZB Reader
              </span>
              <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
                阅读空间
              </span>
            </div>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onUploadClick && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onUploadClick}
                className="h-9 gap-2 rounded-full border-primary/18 bg-background/92 px-3.5 text-foreground shadow-[0_10px_20px_-20px_color-mix(in_oklab,var(--foreground)_12%,transparent)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/6 hover:text-primary"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">上传书籍</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleThemeToggle}
              className="relative h-9 w-9 rounded-full border border-border/60 bg-background/92 transition-all duration-200 hover:border-border hover:bg-muted/70"
            >
              <Sun className="h-4.5 w-4.5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4.5 w-4.5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
              <span className="sr-only">切换主题</span>
            </Button>

            {session?.user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full border border-border/60 bg-background/92 p-0 transition-all duration-200 hover:border-primary/35 hover:bg-muted/70 hover:shadow-[0_14px_28px_-24px_color-mix(in_oklab,var(--foreground)_14%,transparent)]"
                  >
                    <Avatar className="h-7.5 w-7.5 sm:h-8 sm:w-8">
                      <AvatarImage src={session.user.avatar || undefined} alt={session.user.username || "用户头像"} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold text-sm">
                        {session.user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-border/50 bg-background/95 backdrop-blur-xl">
                  <div className="flex items-center gap-3 p-3">
                    <Avatar className="h-11 w-11 border-2 border-primary/20">
                      <AvatarImage src={session.user.avatar || undefined} alt={session.user.username || "用户头像"} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary font-semibold">
                        {session.user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5 leading-none">
                      <p className="font-semibold text-foreground text-sm">{session.user.username}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[140px]">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg mx-1">
                    <Link href="/bookshelf" className="flex items-center gap-2 py-2">
                      <Library className="h-4 w-4 text-muted-foreground" />
                      <span>我的书架</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="cursor-pointer rounded-lg mx-1">
                    <Link href="/profile" className="flex items-center gap-2 py-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>个人资料</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                    className="cursor-pointer text-destructive focus:text-destructive rounded-lg mx-1 mb-1"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>退出登录</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

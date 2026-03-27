"use client";

import Link from "next/link";
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
    <header className={cn("sticky top-4 z-50 w-full px-4 sm:px-6 lg:px-8", className)}>
      <nav className="mx-auto max-w-7xl">
        <div className="flex h-16 items-center justify-between rounded-2xl border border-border/40 bg-background/80 px-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-all duration-300 sm:px-6 dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          {/* Logo */}
          <Link 
            href="/bookshelf" 
            className="group flex items-center gap-3 transition-all duration-200"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 group-hover:shadow-primary/40 group-hover:scale-105">
              <Library className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="hidden flex-col sm:flex">
              <span className="font-heading text-lg font-bold tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
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
                variant="default" 
                size="sm" 
                onClick={onUploadClick}
                className="h-9 gap-2 rounded-full bg-primary px-4 text-primary-foreground shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">上传书籍</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleThemeToggle}
              className="relative h-9 w-9 rounded-full border border-border/50 bg-muted/50 transition-all duration-200 hover:bg-muted hover:border-border"
            >
              <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
              <span className="sr-only">切换主题</span>
            </Button>

            {session?.user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-9 w-9 rounded-full border-2 border-border/50 p-0 transition-all duration-200 hover:border-primary/50 hover:shadow-md sm:h-10 sm:w-10"
                  >
                    <Avatar className="h-8 w-8 sm:h-9 sm:w-9">
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

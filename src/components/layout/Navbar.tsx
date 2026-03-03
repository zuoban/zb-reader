"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { BookOpen, Upload, Moon, Sun, LogOut, User } from "lucide-react";
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

interface NavbarProps {
  onUploadClick?: () => void;
}

export function Navbar({ onUploadClick }: NavbarProps) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  // Sync theme change with reader settings API
  const handleThemeToggle = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    // Sync with reader settings
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
    <header className="sticky top-2 sm:top-4 z-50 mx-2 sm:mx-4 lg:mx-auto max-w-7xl">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-6 rounded-2xl border border-border/40 bg-card/80 backdrop-blur-xl shadow-lg">
        <Link 
          href="/bookshelf" 
          className="flex items-center gap-2 sm:gap-3 group cursor-pointer transition-all duration-200"
        >
          <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20 transition-all duration-200">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" className="text-primary">
              <rect x="4" y="4" width="32" height="32" rx="3" stroke="currentColor" strokeWidth="2" fill="none"/>
              <line x1="12" y1="12" x2="28" y2="12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="28" y1="12" x2="12" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="12" y1="28" x2="28" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="20" cy="20" r="2" fill="currentColor"/>
            </svg>
          </div>
          <span className="font-heading font-bold text-lg sm:text-xl text-foreground group-hover:text-primary transition-colors duration-200">
            ZB Reader
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {onUploadClick && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onUploadClick}
              className="gap-2 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 h-9 sm:h-9"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">上传书籍</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleThemeToggle}
            className="relative cursor-pointer transition-all duration-200 hover:shadow-md h-9 w-9"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100" />
            <span className="sr-only">切换主题</span>
          </Button>

          {session?.user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full cursor-pointer transition-all duration-200 hover:shadow-md p-0"
                >
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-primary/20">
                    <AvatarImage src={session.user.avatar || undefined} alt={session.user.username || "用户头像"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm sm:text-base">
                      {session.user.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center justify-start gap-3 p-3">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={session.user.avatar || undefined} alt={session.user.username || "用户头像"} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {session.user.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-semibold text-foreground">{session.user.username}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {session.user.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/bookshelf" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    <span>我的书架</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>个人资料</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>退出登录</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

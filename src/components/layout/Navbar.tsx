"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Library, LogOut, Moon, Sun, Tags, User } from "lucide-react";
import { UploadButton } from "@/components/bookshelf/UploadButton";
import { CategoryManagerDialog } from "@/components/bookshelf/CategoryManagerDialog";
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
  const [showCategoryManager, setShowCategoryManager] = useState(false);

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
    <header className={cn("sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/50", className)}>
      <nav className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Brand / Logo Area */}
          <Link
            href="/bookshelf"
            className="group flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="font-heading text-xl font-bold italic">Z</span>
            </div>
            <div className="hidden flex-col sm:flex">
              <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                ZB Reader
              </span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase leading-none">
                Serene Reading
              </span>
            </div>
          </Link>

          {/* Right: Actions Area */}
          <div className="flex items-center gap-2 sm:gap-4">
            {onUploadComplete && (
              <UploadButton
                onUploadComplete={onUploadComplete}
                variant="ghost"
                className="h-10 rounded-full border border-border bg-background px-4 text-xs font-bold transition-all hover:bg-muted sm:px-6"
              />
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={handleThemeToggle}
              aria-label="切换主题"
              className="h-10 w-10 rounded-full border border-border bg-background transition-all hover:bg-muted"
            >
              <Sun className="h-[18px] w-[18px] text-foreground dark:hidden" />
              <Moon className="hidden h-[18px] w-[18px] text-foreground dark:block" />
              <span className="sr-only">切换主题</span>
            </Button>

            {session?.user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full border border-border p-0.5 transition-all hover:ring-2 hover:ring-primary/20"
                  >
                    <Avatar className="h-full w-full">
                      <AvatarImage src={session.user.avatar || undefined} alt={session.user.username || "用户头像"} />
                      <AvatarFallback className="bg-muted font-bold text-xs text-muted-foreground">
                        {session.user.username?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={12}
                  className="w-64 rounded-xl border border-border bg-popover p-1 shadow-2xl"
                >
                  <div className="px-4 py-4">
                    <div className="flex flex-col space-y-1">
                      <p className="truncate font-heading text-sm font-bold text-foreground leading-none">
                        {session.user.username}
                      </p>
                      <p className="truncate text-[11px] font-medium text-muted-foreground italic">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-1">
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/bookshelf" className="flex items-center gap-3">
                        <Library className="h-4 w-4" />
                        <span className="text-sm font-medium">我的书架</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="cursor-pointer">
                      <Link href="/profile" className="flex items-center gap-3">
                        <User className="h-4 w-4" />
                        <span className="text-sm font-medium">个人资料</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer flex items-center gap-3"
                      onClick={() => setShowCategoryManager(true)}
                    >
                      <Tags className="h-4 w-4" />
                      <span className="text-sm font-medium">分类管理</span>
                    </DropdownMenuItem>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="p-1">
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
                      className="cursor-pointer flex items-center gap-3 text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="text-sm font-medium">退出登录</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </nav>

      <CategoryManagerDialog
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
      />
    </header>
  );
}

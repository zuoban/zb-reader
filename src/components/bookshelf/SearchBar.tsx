"use client";

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="group relative w-full sm:w-[320px]">
      <div className="pointer-events-none absolute inset-y-1 left-1 right-1 rounded-[1.1rem] bg-gradient-to-r from-white/18 via-transparent to-white/8 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 dark:from-white/8 dark:to-white/4" />
      <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-150 group-focus-within:text-primary" />
      <Input
        placeholder="搜索书名或作者..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-2xl border-border/55 bg-background/60 pl-11 pr-4 text-[15px] shadow-[0_14px_40px_-32px_color-mix(in_oklab,var(--foreground)_28%,transparent)] backdrop-blur-md transition-all duration-200 placeholder:text-muted-foreground/80 focus-visible:border-primary/40 focus-visible:bg-background/82 sm:h-12"
      />
    </div>
  );
}

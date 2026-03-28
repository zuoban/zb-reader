"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="group relative w-full">
      <div className="pointer-events-none absolute inset-y-1 left-1 right-1 rounded-[1rem] bg-gradient-to-r from-primary/8 via-transparent to-sky-500/6 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 dark:from-primary/10 dark:to-sky-400/8" />
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-150 group-focus-within:text-primary" />
      <Input
        placeholder="搜索书名或作者..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-[1.1rem] border-border/60 bg-background/88 pl-12 pr-12 text-[15px] shadow-[0_12px_28px_-24px_color-mix(in_oklab,var(--foreground)_12%,transparent)] transition-all duration-200 placeholder:text-muted-foreground/75 focus-visible:border-primary/45 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/12"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="清空搜索"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full text-muted-foreground/80 hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

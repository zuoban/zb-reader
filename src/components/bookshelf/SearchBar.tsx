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
      <div className="pointer-events-none absolute inset-y-1 left-1 right-1 rounded-xl bg-gradient-to-r from-[color:var(--cta)]/12 via-transparent to-teal-700/8 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 dark:to-teal-300/8" />
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-150 group-focus-within:text-[color:var(--cta)]" />
      <Input
        placeholder="搜索书名或作者..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl border-border/70 bg-background/72 pl-12 pr-12 text-[15px] shadow-[0_14px_30px_-26px_color-mix(in_oklab,var(--foreground)_18%,transparent)] transition-all duration-200 placeholder:text-muted-foreground/75 focus-visible:border-ring/55 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/18"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="清空搜索"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-lg text-muted-foreground/80 hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

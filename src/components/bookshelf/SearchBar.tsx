"use client";

import { useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { debounce } from "@/lib/utils";
import type { DebouncedFunction } from "@/lib/utils";

interface SearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<DebouncedFunction<[string]> | null>(null);

  searchRef.current ??= debounce((q: string) => {
    onSearch(q);
  }, 400);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    searchRef.current?.(value);
  };

  const handleClear = () => {
    searchRef.current?.cancel();
    setQuery("");
    onSearch("");
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute left-3 flex h-full items-center text-muted-foreground/60">
        <Search className="h-4 w-4" />
      </div>
      <Input
        type="text"
        placeholder="搜索书名或作者..."
        value={query}
        onChange={handleChange}
        className="h-10 rounded-full border-border/60 bg-background/50 backdrop-blur-md pl-9 pr-9 text-sm shadow-sm transition-all duration-300 focus:border-primary/50 focus:bg-background/80 focus:ring-4 focus:ring-primary/5 dark:bg-muted/20 dark:focus:bg-muted/40"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 flex h-full items-center text-muted-foreground/40 hover:text-muted-foreground/80"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

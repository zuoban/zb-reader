"use client";

import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    return () => {
      searchRef.current?.cancel();
    };
  }, []);

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
      <div className="pointer-events-none absolute left-3 flex h-full items-center text-muted-foreground">
        <Search className="h-4 w-4" />
      </div>
      <Input
        type="text"
        placeholder="搜索书名或作者..."
        value={query}
        onChange={handleChange}
        className="bookshelf-search-input h-10 rounded-lg pl-10 pr-10 text-sm"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="清空搜索"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

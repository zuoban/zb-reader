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
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
      <Input
        placeholder="搜索书名或作者..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl pl-10 pr-4"
      />
    </div>
  );
}

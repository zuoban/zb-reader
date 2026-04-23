"use client";

import { memo } from "react";
import {
  List,
  Bookmark,
  StickyNote,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TocItem } from "@/types/reader";
import { TocTab, BookmarksTab, NotesTab } from "./panels";

interface SidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: "toc" | "bookmarks" | "notes";
  onTabChange: (tab: "toc" | "bookmarks" | "notes") => void;
  toc: TocItem[];
  currentHref?: string;
  bookmarks: Array<{
    id: string;
    label: string;
    location: string;
    progress: number;
    createdAt: string;
  }>;
  notes: Array<{
    id: string;
    selectedText: string;
    content: string;
    color: string;
    location: string;
    createdAt: string;
  }>;
  onTocItemClick: (href: string) => void;
  onBookmarkClick: (location: string) => void;
  onBookmarkDelete: (id: string) => void;
  onBookmarkEdit: (id: string, label: string) => void;
  onNoteClick: (location: string) => void;
  onNoteDelete: (id: string) => void;
  onNoteEdit: (id: string, content: string, color: string) => void;
}

export const SidePanel = memo(function SidePanel({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  toc,
  currentHref,
  bookmarks,
  notes,
  onTocItemClick,
  onBookmarkClick,
  onBookmarkDelete,
  onBookmarkEdit,
  onNoteClick,
  onNoteDelete,
  onNoteEdit,
}: SidePanelProps) {
  const handleClose = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showBackground={false}
        className="reader-liquid-surface w-[85vw] sm:w-[340px] border-r p-0 rounded-r-2xl"
        style={{ color: "var(--reader-text)" }}
      >
        <SheetHeader className="px-5 py-4 border-b" style={{ borderColor: "color-mix(in srgb, var(--reader-border) 72%, transparent)" }}>
          <SheetTitle className="sr-only">侧边栏</SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => onTabChange(v as "toc" | "bookmarks" | "notes")}
          className="flex flex-col h-full"
        >
          <TabsList
            className="reader-liquid-control mx-5 mt-4 grid h-11 grid-cols-3 rounded-xl p-1 gap-1"
          >
            <TabsTrigger
              value="toc"
              className="gap-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-[var(--reader-card-bg)]/70 data-[state=active]:text-[var(--reader-primary)] data-[state=active]:shadow-sm"
            >
              <List className="size-4" />
              <span className="hidden sm:inline">目录</span>
            </TabsTrigger>
            <TabsTrigger
              value="bookmarks"
              className="gap-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-[var(--reader-card-bg)]/70 data-[state=active]:text-[var(--reader-primary)] data-[state=active]:shadow-sm"
            >
              <Bookmark className="size-4" />
              <span className="hidden sm:inline">书签</span>
              {bookmarks.length > 0 && (
                <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--reader-primary)] text-white">
                  {bookmarks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="gap-2 rounded-lg text-sm font-medium transition-all data-[state=active]:bg-[var(--reader-card-bg)]/70 data-[state=active]:text-[var(--reader-primary)] data-[state=active]:shadow-sm"
            >
              <StickyNote className="size-4" />
              <span className="hidden sm:inline">笔记</span>
              {notes.length > 0 && (
                <span className="ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[var(--reader-primary)] text-white">
                  {notes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="toc" className="mt-0 flex-1 overflow-hidden">
            <TocTab
              toc={toc}
              currentHref={currentHref}
              onTocItemClick={onTocItemClick}
              onClose={handleClose}
            />
          </TabsContent>

          <TabsContent value="bookmarks" className="mt-0 flex-1 overflow-hidden">
            <BookmarksTab
              bookmarks={bookmarks}
              onBookmarkClick={onBookmarkClick}
              onBookmarkDelete={onBookmarkDelete}
              onBookmarkEdit={onBookmarkEdit}
              onClose={handleClose}
            />
          </TabsContent>

          <TabsContent value="notes" className="mt-0 flex-1 overflow-hidden">
            <NotesTab
              notes={notes}
              onNoteClick={onNoteClick}
              onNoteDelete={onNoteDelete}
              onNoteEdit={onNoteEdit}
              onClose={handleClose}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
});

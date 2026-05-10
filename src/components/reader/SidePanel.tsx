"use client";

import { memo } from "react";
import {
  Sheet,
  SheetContent,
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
        side="bottom"
        showBackground={false}
        className="max-h-[85vh] h-[75vh] overflow-hidden rounded-t-[32px] border-t border-[color-mix(in_srgb,var(--reader-text)_8%,transparent)] bg-[var(--reader-bg)]/98 p-0 shadow-2xl backdrop-blur-xl sm:mx-auto sm:max-w-xl xl:max-w-2xl"
        style={{ color: "var(--reader-text)" }}
      >
        <div className="sr-only">
          <SheetTitle>资源库</SheetTitle>
        </div>

        <div className="flex flex-col h-full">
          <div className="flex flex-col items-center pt-5 shrink-0">
          <div className="w-10 h-1.25 rounded-full bg-[var(--reader-text)]/15 mb-1" />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => onTabChange(v as "toc" | "bookmarks" | "notes")}
          className="flex flex-1 min-h-0 flex-col"
        >
          <div className="px-6 mt-2 shrink-0">
            <TabsList
              className="grid h-11 grid-cols-3 rounded-[18px] bg-[var(--reader-text)]/5 p-1 gap-1"
            >
              <TabsTrigger
                value="toc"
                className="rounded-[15px] text-[12px] font-bold tracking-tight transition-all duration-300 data-[state=active]:bg-[var(--reader-bg)] data-[state=active]:text-[var(--reader-primary)] data-[state=active]:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.15)] dark:data-[state=active]:shadow-[0_8px_25px_-6px_rgba(0,0,0,0.4)]"
              >
                目录
              </TabsTrigger>
              <TabsTrigger
                value="bookmarks"
                className="rounded-[15px] text-[12px] font-bold tracking-tight transition-all duration-300 data-[state=active]:bg-[var(--reader-bg)] data-[state=active]:text-[var(--reader-primary)] data-[state=active]:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.15)] dark:data-[state=active]:shadow-[0_8px_25px_-6px_rgba(0,0,0,0.4)]"
              >
                书签
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-[15px] text-[12px] font-bold tracking-tight transition-all duration-300 data-[state=active]:bg-[var(--reader-bg)] data-[state=active]:text-[var(--reader-primary)] data-[state=active]:shadow-[0_8px_20px_-6px_rgba(0,0,0,0.15)] dark:data-[state=active]:shadow-[0_8px_25px_-6px_rgba(0,0,0,0.4)]"
              >
                笔记
              </TabsTrigger>
            </TabsList>
          </div>

            <TabsContent value="toc" className="mt-0 flex-1 min-h-0 overflow-hidden outline-none">
              <TocTab
                toc={toc}
                currentHref={currentHref}
                onTocItemClick={onTocItemClick}
                onClose={handleClose}
              />
            </TabsContent>

            <TabsContent value="bookmarks" className="mt-0 flex-1 min-h-0 overflow-hidden outline-none">
              <BookmarksTab
                bookmarks={bookmarks}
                onBookmarkClick={onBookmarkClick}
                onBookmarkDelete={onBookmarkDelete}
                onBookmarkEdit={onBookmarkEdit}
                onClose={handleClose}
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-0 flex-1 min-h-0 overflow-hidden outline-none">
              <NotesTab
                notes={notes}
                onNoteClick={onNoteClick}
                onNoteDelete={onNoteDelete}
                onNoteEdit={onNoteEdit}
                onClose={handleClose}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
});

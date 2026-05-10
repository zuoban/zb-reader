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
        className="!w-[min(94vw,420px)] !max-w-[calc(100vw-0.5rem)] overflow-hidden rounded-r-none border-r border-border bg-[var(--reader-bg)] p-0 shadow-2xl sm:!w-[420px] md:!w-[480px]"
        style={{ color: "var(--reader-text)" }}
      >
        <SheetHeader className="px-6 py-8 border-b border-border/50">
          <SheetTitle className="font-heading text-xl font-bold tracking-tight text-[var(--reader-text)]">
            Library
          </SheetTitle>
        </SheetHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => onTabChange(v as "toc" | "bookmarks" | "notes")}
          className="flex h-full min-w-0 flex-col"
        >
          <TabsList
            className="mx-6 mt-6 grid h-10 grid-cols-3 rounded-md bg-[var(--reader-text)]/5 p-1 gap-1"
          >
            <TabsTrigger
              value="toc"
              className="rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all data-[state=active]:bg-[var(--reader-bg)] data-[state=active]:text-[var(--reader-text)] data-[state=active]:shadow-sm"
            >
              CONTENTS
            </TabsTrigger>
            <TabsTrigger
              value="bookmarks"
              className="rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all data-[state=active]:bg-[var(--reader-bg)] data-[state=active]:text-[var(--reader-text)] data-[state=active]:shadow-sm"
            >
              MARKS
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="rounded-sm text-[10px] font-bold tracking-widest uppercase transition-all data-[state=active]:bg-[var(--reader-bg)] data-[state=active]:text-[var(--reader-text)] data-[state=active]:shadow-sm"
            >
              NOTES
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

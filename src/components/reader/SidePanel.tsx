"use client";

import { memo } from "react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TocTab, BookmarksTab, NotesTab } from "./panels";

import { useBookData, useReaderUI, useNavigation, useAnnotation } from "./providers";

const sidePanelTabClass = cn(
  "group relative h-8 min-w-0 flex-none cursor-pointer gap-2 px-3 text-[13px] font-medium tracking-wide transition-all duration-300",
  "text-[var(--reader-muted-text)] hover:text-[var(--reader-text)]",
  "data-[state=active]:text-[var(--reader-primary)]",
  "data-[state=active]:after:absolute data-[state=active]:after:bottom-0 data-[state=active]:after:left-2 data-[state=active]:after:right-2",
  "data-[state=active]:after:h-[2px] data-[state=active]:after:bg-[var(--reader-primary)] data-[state=active]:after:rounded-full",
  "after:hidden",
  "focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0"
);

function TabCount({ count }: { count: number }) {
  const label = count > 999 ? "999+" : String(count);

  return (
    <span className="shrink-0 text-[10px] font-bold leading-none tabular-nums px-1.5 py-0.5 rounded-md transition-all duration-300"
      style={{
        color: "var(--reader-muted-text)",
        opacity: 0.5,
        background: "color-mix(in srgb, var(--reader-text) 5%, transparent)",
      }}>
      {label}
    </span>
  );
}

export const SidePanel = memo(function SidePanel() {
  const { bookmarks, notes } = useBookData();
  const { 
    sidePanelOpen: open, 
    setSidePanelOpen: onOpenChange, 
    activeTab, 
    setActiveTab: onTabChange,
    toc,
    currentHref
  } = useReaderUI();
  const { 
    handleTocItemClick, 
    handleBookmarkClick, 
    handleNoteClick 
  } = useNavigation();
  const { 
    handleBookmarkDelete, 
    handleBookmarkEdit, 
    handleNoteDelete, 
    handleNoteEdit 
  } = useAnnotation();

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
          <div className="px-5 pt-3 pb-0 shrink-0">
            <TabsList
              variant="line"
              className="h-9 w-full justify-start gap-0 bg-transparent p-0 border-b border-[color-mix(in_srgb,var(--reader-text)_8%,transparent)]"
            >
              <TabsTrigger
                value="toc"
                className={sidePanelTabClass}
              >
                <span className="min-w-0 truncate">目录</span>
                <TabCount count={toc.length} />
              </TabsTrigger>
              <TabsTrigger
                value="bookmarks"
                className={sidePanelTabClass}
              >
                <span className="min-w-0 truncate">书签</span>
                <TabCount count={bookmarks.length} />
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className={sidePanelTabClass}
              >
                <span className="min-w-0 truncate">笔记</span>
                <TabCount count={notes.length} />
              </TabsTrigger>
            </TabsList>
          </div>

            <TabsContent value="toc" className="mt-0 flex-1 min-h-0 overflow-hidden outline-none">
              <TocTab
                toc={toc}
                currentHref={currentHref}
                onTocItemClick={handleTocItemClick}
                onClose={handleClose}
              />
            </TabsContent>

            <TabsContent value="bookmarks" className="mt-0 flex-1 min-h-0 overflow-hidden outline-none">
              <BookmarksTab
                bookmarks={bookmarks.map(b => ({
                    id: b.id,
                    label: b.label || "未命名书签",
                    location: b.location as string,
                    progress: b.progress || 0,
                    createdAt: b.createdAt
                }))}
                onBookmarkClick={handleBookmarkClick}
                onBookmarkDelete={handleBookmarkDelete}
                onBookmarkEdit={handleBookmarkEdit}
                onClose={handleClose}
              />
            </TabsContent>

            <TabsContent value="notes" className="mt-0 flex-1 min-h-0 overflow-hidden outline-none">
              <NotesTab
                notes={notes.map(n => ({
                    id: n.id,
                    selectedText: n.selectedText || "",
                    content: n.content || "",
                    color: n.color || "#facc15",
                    location: n.location as string,
                    createdAt: n.createdAt
                }))}
                onNoteClick={handleNoteClick}
                onNoteDelete={handleNoteDelete}
                onNoteEdit={handleNoteEdit}
                onClose={handleClose}
              />
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
});

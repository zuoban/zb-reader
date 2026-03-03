"use client";

import { useState } from "react";
import {
  List,
  Bookmark,
  StickyNote,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface TocItem {
  label: string;
  href: string;
  id?: string;
  level?: number;
  subitems?: TocItem[];
}

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

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TocItemRow({
  item,
  level = 0,
  currentHref,
  onTocItemClick,
  onClose,
}: {
  item: TocItem;
  level?: number;
  currentHref?: string;
  onTocItemClick: (href: string) => void;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.subitems && item.subitems.length > 0;

  const isActive =
    currentHref &&
    (item.href === currentHref ||
      currentHref.startsWith(item.href?.split("#")[0]));

  return (
    <div>
      <div className="flex items-center group">
        {hasChildren ? (
          <button
            className={cn(
              "shrink-0 p-1 rounded-lg transition-colors cursor-pointer"
            )}
            style={{ color: "var(--reader-muted-text)" }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>
        ) : (
          <span className="shrink-0 w-[22px]" />
        )}

        <button
          className={cn(
            "flex-1 text-left px-2 py-1.5 rounded-lg text-sm transition-colors truncate cursor-pointer"
          )}
          style={{
            paddingLeft: `${level * 12 + 8}px`,
            color: isActive
              ? "var(--reader-primary, #0891B2)"
              : "var(--reader-text)",
            background: isActive
              ? "var(--reader-primary-light, rgba(8,145,178,0.1))"
              : "transparent",
          }}
          onClick={() => {
            onTocItemClick(item.href);
            onClose();
          }}
          title={item.label}
        >
          {item.label}
        </button>
      </div>

      {hasChildren && expanded && (
        <div className="ml-1">
          {item.subitems!.map((child, index) => (
            <TocItemRow
              key={child.id || `${child.href}-${index}`}
              item={child}
              level={level + 1}
              currentHref={currentHref}
              onTocItemClick={onTocItemClick}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function SidePanel({
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
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(
    null
  );
  const [editingBookmarkLabel, setEditingBookmarkLabel] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [editingNoteColor, setEditingNoteColor] = useState("");

  const noteColors = ["#facc15", "#4ade80", "#60a5fa", "#f87171", "#c084fc"];

  function countTocItems(items: TocItem[]): number {
    return items.reduce(
      (acc, item) =>
        acc + 1 + (item.subitems ? countTocItems(item.subitems) : 0),
      0
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[88vw] sm:w-80 p-0 backdrop-blur-xl border-r"
        style={{
          background: "var(--reader-card-bg)",
          borderColor: "var(--reader-border)",
        }}
      >
        <SheetHeader className="px-4 pt-4 pb-0">
          <SheetTitle className="sr-only">侧边栏</SheetTitle>
        </SheetHeader>
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            onTabChange(v as "toc" | "bookmarks" | "notes")
          }
          className="flex flex-col h-full"
        >
          <TabsList
            className="mx-4 mt-2"
            style={{ background: "var(--reader-border)" }}
          >
            <TabsTrigger
              value="toc"
              className="gap-1.5"
              style={{
                color: "var(--reader-muted-text)",
                "--tw-ring-color": "var(--reader-primary, #0891B2)",
              } as React.CSSProperties}
            >
              <List className="size-4" />
              目录
            </TabsTrigger>
            <TabsTrigger
              value="bookmarks"
              className="gap-1.5"
              style={{ color: "var(--reader-muted-text)" }}
            >
              <Bookmark className="size-4" />
              书签
              {bookmarks.length > 0 && (
                <span
                  className="ml-0.5 text-[10px] rounded-full px-1.5"
                  style={{ background: "var(--reader-border)" }}
                >
                  {bookmarks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="gap-1.5"
              style={{ color: "var(--reader-muted-text)" }}
            >
              <StickyNote className="size-4" />
              笔记
              {notes.length > 0 && (
                <span
                  className="ml-0.5 text-[10px] rounded-full px-1.5"
                  style={{ background: "var(--reader-border)" }}
                >
                  {notes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="toc" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-3">
                {toc.length === 0 ? (
                  <p
                    className="text-sm text-center py-8"
                    style={{ color: "var(--reader-muted-text)" }}
                  >
                    暂无目录
                  </p>
                ) : (
                  <>
                    <p
                      className="text-xs px-2 mb-2"
                      style={{ color: "var(--reader-muted-text)" }}
                    >
                      共 {countTocItems(toc)} 章
                    </p>
                    {toc.map((item, index) => (
                      <TocItemRow
                        key={item.id || `${item.href}-${index}`}
                        item={item}
                        currentHref={currentHref}
                        onTocItemClick={onTocItemClick}
                        onClose={() => onOpenChange(false)}
                      />
                    ))}
                  </>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent
            value="bookmarks"
            className="mt-0 flex-1 overflow-hidden"
          >
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {bookmarks.length === 0 ? (
                  <p
                    className="text-sm text-center py-8"
                    style={{ color: "var(--reader-muted-text)" }}
                  >
                    暂无书签
                  </p>
                ) : (
                  bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className={cn(
                        "group rounded-xl p-3 transition-colors cursor-pointer border"
                      )}
                      style={{
                        background: "var(--reader-card-bg)",
                        borderColor: "var(--reader-border)",
                      }}
                    >
                      {editingBookmarkId === bookmark.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingBookmarkLabel}
                            onChange={(e) =>
                              setEditingBookmarkLabel(e.target.value)
                            }
                            className="h-8 text-sm rounded-lg"
                            style={{
                              background: "var(--reader-card-bg)",
                              borderColor: "var(--reader-border)",
                              color: "var(--reader-text)",
                            }}
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg cursor-pointer"
                            style={{ color: "var(--reader-primary, #0891B2)" }}
                            onClick={() => {
                              onBookmarkEdit(
                                bookmark.id,
                                editingBookmarkLabel
                              );
                              setEditingBookmarkId(null);
                            }}
                          >
                            <Check className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg cursor-pointer"
                            style={{ color: "var(--reader-muted-text)" }}
                            onClick={() => setEditingBookmarkId(null)}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer"
                          onClick={() => {
                            onBookmarkClick(bookmark.location);
                            onOpenChange(false);
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <p
                              className="text-sm font-medium truncate flex-1"
                              style={{ color: "var(--reader-text)" }}
                            >
                              {bookmark.label}
                            </p>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg cursor-pointer"
                                style={{ color: "var(--reader-muted-text)" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingBookmarkId(bookmark.id);
                                  setEditingBookmarkLabel(bookmark.label);
                                }}
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg cursor-pointer"
                                style={{ color: "var(--reader-destructive, #ef4444)" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBookmarkDelete(bookmark.id);
                                }}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className="text-xs"
                              style={{ color: "var(--reader-muted-text)" }}
                            >
                              {(bookmark.progress * 100).toFixed(2)}%
                            </span>
                            <span
                              className="text-xs"
                              style={{ color: "var(--reader-muted-text)" }}
                            >
                              {formatDate(bookmark.createdAt)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="notes" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {notes.length === 0 ? (
                  <p
                    className="text-sm text-center py-8"
                    style={{ color: "var(--reader-muted-text)" }}
                  >
                    暂无笔记
                  </p>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        "group rounded-xl p-3 transition-colors cursor-pointer border"
                      )}
                      style={{
                        background: "var(--reader-card-bg)",
                        borderColor: "var(--reader-border)",
                      }}
                    >
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <div
                            className="text-xs pl-2 border-l-2 line-clamp-2 rounded"
                            style={{
                              borderColor: editingNoteColor,
                              color: "var(--reader-muted-text)",
                            }}
                          >
                            {note.selectedText}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {noteColors.map((c) => (
                              <button
                                key={c}
                                className={cn(
                                  "size-5 rounded-full border-2 transition-transform cursor-pointer",
                                  editingNoteColor === c
                                    ? "scale-110"
                                    : "border-transparent hover:scale-105"
                                )}
                                style={{
                                  backgroundColor: c,
                                  borderColor:
                                    editingNoteColor === c
                                      ? "var(--reader-text)"
                                      : "transparent",
                                }}
                                onClick={() => setEditingNoteColor(c)}
                              />
                            ))}
                          </div>
                          <Textarea
                            value={editingNoteContent}
                            onChange={(e) =>
                              setEditingNoteContent(e.target.value)
                            }
                            className="text-sm min-h-[60px] rounded-lg"
                            style={{
                              background: "var(--reader-card-bg)",
                              borderColor: "var(--reader-border)",
                              color: "var(--reader-text)",
                            }}
                            autoFocus
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-lg cursor-pointer"
                              style={{ color: "var(--reader-muted-text)" }}
                              onClick={() => setEditingNoteId(null)}
                            >
                              取消
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-lg cursor-pointer"
                              style={{
                                background: "var(--reader-primary, #0891B2)",
                                color: "#ffffff",
                              }}
                              onClick={() => {
                                onNoteEdit(
                                  note.id,
                                  editingNoteContent,
                                  editingNoteColor
                                );
                                setEditingNoteId(null);
                              }}
                            >
                              保存
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="cursor-pointer"
                          onClick={() => {
                            onNoteClick(note.location);
                            onOpenChange(false);
                          }}
                        >
                          <div
                            className="text-xs pl-2 border-l-2 line-clamp-2 mb-1.5 rounded"
                            style={{
                              borderColor: note.color,
                              color: "var(--reader-muted-text)",
                            }}
                          >
                            {note.selectedText}
                          </div>
                          <p
                            className="text-sm line-clamp-3"
                            style={{ color: "var(--reader-text)" }}
                          >
                            {note.content}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span
                              className="text-xs"
                              style={{ color: "var(--reader-muted-text)" }}
                            >
                              {formatDate(note.createdAt)}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg cursor-pointer"
                                style={{ color: "var(--reader-muted-text)" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNoteId(note.id);
                                  setEditingNoteContent(note.content);
                                  setEditingNoteColor(note.color);
                                }}
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-lg cursor-pointer"
                                style={{ color: "var(--reader-destructive, #ef4444)" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNoteDelete(note.id);
                                }}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

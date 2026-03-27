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
      <div className="group flex items-center">
        {hasChildren ? (
          <button
            className="shrink-0 rounded-md p-1 transition-colors cursor-pointer"
            style={{ color: "var(--reader-muted-text)" }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="size-4" />
            ) : (
              <ChevronRight className="size-4" />
            )}
          </button>
        ) : (
          <span className="shrink-0 w-6" />
        )}

        <button
          className={cn(
            "flex-1 cursor-pointer truncate rounded-md px-2 py-1.5 text-left text-sm transition-colors"
          )}
          style={{
            paddingLeft: `${level * 8 + 8}px`,
            color: isActive ? "var(--reader-primary)" : "var(--reader-text)",
            background: isActive ? "color-mix(in srgb, var(--reader-primary) 8%, transparent)" : "transparent",
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
        <div>
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
        className="w-[85vw] sm:w-[320px] border-r p-0"
        style={{
          background: "var(--reader-bg)",
          borderColor: "var(--reader-border)",
        }}
      >
        <SheetHeader className="px-4 py-3 border-b" style={{ borderColor: "var(--reader-border)" }}>
          <SheetTitle className="sr-only">侧边栏</SheetTitle>
        </SheetHeader>
        
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            onTabChange(v as "toc" | "bookmarks" | "notes")
          }
          className="flex flex-col h-full"
        >
          {/* 标签切换 */}
          <TabsList
            className="mx-4 mt-3 grid h-10 grid-cols-3 rounded-lg p-1"
            style={{
              background: "color-mix(in srgb, var(--reader-text) 5%, transparent)",
            }}
          >
            <TabsTrigger
              value="toc"
              className="gap-1.5 rounded-md text-sm transition-all data-[state=active]:bg-[var(--reader-card-bg)] data-[state=active]:text-[var(--reader-text)]"
            >
              <List className="size-4" />
              <span className="hidden sm:inline">目录</span>
            </TabsTrigger>
            <TabsTrigger
              value="bookmarks"
              className="gap-1.5 rounded-md text-sm transition-all data-[state=active]:bg-[var(--reader-card-bg)] data-[state=active]:text-[var(--reader-text)]"
            >
              <Bookmark className="size-4" />
              <span className="hidden sm:inline">书签</span>
              {bookmarks.length > 0 && (
                <span className="ml-0.5 text-xs">{bookmarks.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="gap-1.5 rounded-md text-sm transition-all data-[state=active]:bg-[var(--reader-card-bg)] data-[state=active]:text-[var(--reader-text)]"
            >
              <StickyNote className="size-4" />
              <span className="hidden sm:inline">笔记</span>
              {notes.length > 0 && (
                <span className="ml-0.5 text-xs">{notes.length}</span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* 目录内容 */}
          <TabsContent value="toc" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {toc.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: "var(--reader-text)" }}>
                      暂无目录
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--reader-muted-text)" }}>
                      这本书暂时没有可用的章节导航
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="mb-2 px-2 text-xs" style={{ color: "var(--reader-muted-text)" }}>
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

          {/* 书签内容 */}
          <TabsContent value="bookmarks" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {bookmarks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: "var(--reader-text)" }}>
                      暂无书签
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--reader-muted-text)" }}>
                      读到关键位置时记一枚书签，会更容易回来看
                    </p>
                  </div>
                ) : (
                  bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className="group rounded-lg border p-3 transition-colors hover:bg-[color-mix(in_srgb,var(--reader-text)_3%,transparent)]"
                      style={{ borderColor: "var(--reader-border)" }}
                    >
                      {editingBookmarkId === bookmark.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingBookmarkLabel}
                            onChange={(e) =>
                              setEditingBookmarkLabel(e.target.value)
                            }
                            className="h-8 text-sm rounded-md flex-1"
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
                            aria-label="保存"
                            className="h-8 w-8 rounded-md"
                            style={{ color: "var(--reader-primary)" }}
                            onClick={() => {
                              onBookmarkEdit(
                                bookmark.id,
                                editingBookmarkLabel
                              );
                              setEditingBookmarkId(null);
                            }}
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="取消"
                            className="h-8 w-8 rounded-md"
                            style={{ color: "var(--reader-muted-text)" }}
                            onClick={() => setEditingBookmarkId(null)}
                          >
                            <X className="size-4" />
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
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium" style={{ color: "var(--reader-text)" }}>
                                {bookmark.label}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span
                                  className="text-xs"
                                  style={{ color: "var(--reader-primary)" }}
                                >
                                  {(bookmark.progress * 100).toFixed(1)}%
                                </span>
                                <span className="text-xs" style={{ color: "var(--reader-muted-text)" }}>
                                  {formatDate(bookmark.createdAt)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="编辑"
                                className="h-7 w-7 rounded-md"
                                style={{ color: "var(--reader-muted-text)" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingBookmarkId(bookmark.id);
                                  setEditingBookmarkLabel(bookmark.label);
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="删除"
                                className="h-7 w-7 rounded-md"
                                style={{ color: "var(--reader-destructive, #ef4444)" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBookmarkDelete(bookmark.id);
                                }}
                              >
                                <Trash2 className="size-3.5" />
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

          {/* 笔记内容 */}
          <TabsContent value="notes" className="mt-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {notes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm" style={{ color: "var(--reader-text)" }}>
                      暂无笔记
                    </p>
                    <p className="mt-1 text-xs" style={{ color: "var(--reader-muted-text)" }}>
                      选中文字后可以快速记录想法和摘录
                    </p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="group rounded-lg border p-3 transition-colors hover:bg-[color-mix(in_srgb,var(--reader-text)_3%,transparent)]"
                      style={{ borderColor: "var(--reader-border)" }}
                    >
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <div
                            className="text-xs pl-2 border-l-2 line-clamp-2"
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
                                  "size-5 rounded-full border-2 transition-colors"
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
                            className="text-sm min-h-[60px] rounded-md"
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
                              className="rounded-md text-xs"
                              style={{ color: "var(--reader-muted-text)" }}
                              onClick={() => setEditingNoteId(null)}
                            >
                              取消
                            </Button>
                            <Button
                              size="sm"
                              className="rounded-md text-xs"
                              style={{
                                background: "var(--reader-primary)",
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
                            className="mb-2 rounded-md border-l-2 pl-2 text-xs line-clamp-2"
                            style={{
                              borderColor: note.color,
                              color: "var(--reader-muted-text)",
                            }}
                          >
                            {note.selectedText}
                          </div>
                          <p className="text-sm line-clamp-3" style={{ color: "var(--reader-text)" }}>
                            {note.content}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs" style={{ color: "var(--reader-muted-text)" }}>
                              {formatDate(note.createdAt)}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="编辑"
                                className="h-7 w-7 rounded-md"
                                style={{ color: "var(--reader-muted-text)" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingNoteId(note.id);
                                  setEditingNoteContent(note.content);
                                  setEditingNoteColor(note.color);
                                }}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="删除"
                                className="h-7 w-7 rounded-md"
                                style={{ color: "var(--reader-destructive, #ef4444)" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNoteDelete(note.id);
                                }}
                              >
                                <Trash2 className="size-3.5" />
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

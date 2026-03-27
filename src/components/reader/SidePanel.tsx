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
      <div className="group flex items-center gap-1">
        {hasChildren ? (
          <button
            className={cn(
              "shrink-0 rounded-lg p-1 transition-colors duration-150 cursor-pointer hover:bg-[var(--reader-primary-light)] text-muted-foreground"
            )}
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
            "flex-1 cursor-pointer truncate rounded-2xl px-3 py-2.5 text-left text-sm transition-all duration-200"
          )}
          style={{
            paddingLeft: `${level * 12 + 12}px`,
            color: isActive ? "var(--reader-primary)" : "var(--reader-text)",
            background: isActive
              ? "linear-gradient(135deg, color-mix(in srgb, var(--reader-primary) 11%, transparent) 0%, color-mix(in srgb, var(--reader-card-bg) 80%, white 20%) 100%)"
              : "transparent",
            boxShadow: isActive
              ? "0 14px 28px -24px color-mix(in srgb, var(--reader-text) 28%, transparent)"
              : "none",
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
  const panelSurface =
    "linear-gradient(180deg, color-mix(in srgb, var(--reader-bg) 92%, white 8%) 0%, color-mix(in srgb, var(--reader-bg) 97%, var(--reader-text) 3%) 100%)";
  const panelBorder = "color-mix(in srgb, var(--reader-text) 8%, transparent)";
  const panelCardSurface =
    "linear-gradient(180deg, color-mix(in srgb, var(--reader-card-bg) 84%, white 16%) 0%, color-mix(in srgb, var(--reader-card-bg) 96%, transparent) 100%)";
  const panelMutedSurface =
    "color-mix(in srgb, var(--reader-text) 5%, transparent)";
  const tabMeta =
    activeTab === "toc"
      ? { label: "目录导航", count: countTocItems(toc), helper: "快速跳转到任意章节" }
      : activeTab === "bookmarks"
        ? { label: "阅读标记", count: bookmarks.length, helper: "继续回到你停下的位置" }
        : { label: "随手笔记", count: notes.length, helper: "保留你的摘录与想法" };

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
        className="animate-reader-fade-up w-[92vw] overflow-hidden border-r p-0 sm:w-[26rem]"
        style={{
          background: panelSurface,
          borderColor: panelBorder,
          boxShadow:
            "18px 0 52px -40px color-mix(in srgb, var(--reader-text) 35%, transparent)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{
            background:
              "linear-gradient(180deg, color-mix(in srgb, white 55%, transparent) 0%, transparent 100%)",
          }}
        />
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="sr-only">侧边栏</SheetTitle>
        </SheetHeader>
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            onTabChange(v as "toc" | "bookmarks" | "notes")
          }
          className="flex flex-col h-full bg-transparent"
        >
          <div className="px-5 pt-3">
            <div
              className="animate-reader-surface relative overflow-hidden rounded-[26px] border px-4 py-4 backdrop-blur-xl"
              style={{
                background: panelCardSurface,
                borderColor: panelBorder,
                boxShadow:
                  "0 20px 36px -28px color-mix(in srgb, var(--reader-text) 26%, transparent)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-x-4 top-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, color-mix(in srgb, white 68%, transparent) 22%, color-mix(in srgb, white 34%, transparent) 50%, transparent 100%)",
                }}
              />
              <p
                className="text-[11px] font-medium tracking-[0.18em]"
                style={{ color: "var(--reader-muted-text)" }}
              >
                {tabMeta.label}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--reader-text)" }}
                >
                  {activeTab === "toc"
                    ? "阅读目录"
                    : activeTab === "bookmarks"
                      ? "书签收藏"
                      : "读书笔记"}
                </h2>
                <span
                  className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                  style={{
                    background:
                      "color-mix(in srgb, var(--reader-primary) 8%, transparent)",
                    borderColor:
                      "color-mix(in srgb, var(--reader-primary) 12%, transparent)",
                    color: "var(--reader-primary)",
                  }}
                >
                  {tabMeta.count}
                </span>
              </div>
              <p
                className="mt-1.5 text-sm"
                style={{ color: "var(--reader-muted-text)" }}
              >
                {tabMeta.helper}
              </p>
            </div>
          </div>
          <TabsList
            className="mx-5 mt-4 grid h-13 grid-cols-3 rounded-[20px] p-1.5"
            style={{
              background: panelMutedSurface,
              border: `1px solid ${panelBorder}`,
              boxShadow:
                "inset 0 1px 0 color-mix(in srgb, white 45%, transparent)",
            }}
          >
            <TabsTrigger
              value="toc"
              className="gap-1.5 rounded-[16px] border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:shadow-none data-[state=active]:text-[var(--reader-text)] data-[state=active]:bg-[var(--reader-card-bg)]"
            >
              <List className="size-4" />
              <span className="hidden sm:inline">目录</span>
            </TabsTrigger>
            <TabsTrigger
              value="bookmarks"
              className="gap-1.5 rounded-[16px] border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:shadow-none data-[state=active]:text-[var(--reader-text)] data-[state=active]:bg-[var(--reader-card-bg)]"
            >
              <Bookmark className="size-4" />
              <span className="hidden sm:inline">书签</span>
              {bookmarks.length > 0 && (
                <span
                  className="ml-0.5 rounded-full px-1.5 text-[10px]"
                  style={{
                    background: "color-mix(in srgb, var(--reader-text) 10%, transparent)",
                  }}
                >
                  {bookmarks.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="gap-1.5 rounded-[16px] border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:shadow-none data-[state=active]:text-[var(--reader-text)] data-[state=active]:bg-[var(--reader-card-bg)]"
            >
              <StickyNote className="size-4" />
              <span className="hidden sm:inline">笔记</span>
              {notes.length > 0 && (
                <span
                  className="ml-0.5 rounded-full px-1.5 text-[10px]"
                  style={{
                    background: "color-mix(in srgb, var(--reader-text) 10%, transparent)",
                  }}
                >
                  {notes.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="toc" className="mt-0 flex-1 overflow-hidden bg-transparent">
            <ScrollArea className="h-full">
              <div className="p-5 pt-4" style={{ background: "transparent" }}>
                {toc.length === 0 ? (
                  <div
                    className="rounded-[24px] border px-5 py-8 text-center"
                    style={{
                      background: panelCardSurface,
                      borderColor: panelBorder,
                      boxShadow:
                        "0 18px 34px -28px color-mix(in srgb, var(--reader-text) 20%, transparent)",
                    }}
                  >
                    <p className="text-sm" style={{ color: "var(--reader-text)" }}>
                      暂无目录
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--reader-muted-text)" }}
                    >
                      这本书暂时没有可用的章节导航
                    </p>
                  </div>
                ) : (
                  <>
                    <p
                      className="mb-3 px-3 text-xs"
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
            className="mt-0 flex-1 overflow-hidden bg-transparent"
          >
            <ScrollArea className="h-full">
              <div className="space-y-2.5 p-5 pt-4" style={{ background: "transparent" }}>
                {bookmarks.length === 0 ? (
                  <div
                    className="rounded-[24px] border px-5 py-8 text-center"
                    style={{
                      background: panelCardSurface,
                      borderColor: panelBorder,
                      boxShadow:
                        "0 18px 34px -28px color-mix(in srgb, var(--reader-text) 20%, transparent)",
                    }}
                  >
                    <p className="text-sm" style={{ color: "var(--reader-text)" }}>
                      暂无书签
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--reader-muted-text)" }}
                    >
                      读到关键位置时记一枚书签，会更容易回来看
                    </p>
                  </div>
                ) : (
                  bookmarks.map((bookmark) => (
                    <div
                      key={bookmark.id}
                      className={cn(
                        "group cursor-pointer rounded-[24px] border p-4 transition-all duration-200 hover:-translate-y-0.5"
                      )}
                      style={{
                        background: panelCardSurface,
                        borderColor: panelBorder,
                        boxShadow:
                          "0 16px 28px -26px color-mix(in srgb, var(--reader-text) 24%, transparent)",
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
                            aria-label="保存"
                            className="h-8 w-8 rounded-lg cursor-pointer"
                            style={{ color: "var(--reader-primary)" }}
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
                            aria-label="取消"
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
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {bookmark.label}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span
                                  className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                                  style={{
                                    color: "var(--reader-primary)",
                                    borderColor:
                                      "color-mix(in srgb, var(--reader-primary) 12%, transparent)",
                                    background:
                                      "color-mix(in srgb, var(--reader-primary) 7%, transparent)",
                                  }}
                                >
                                  {(bookmark.progress * 100).toFixed(1)}%
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(bookmark.createdAt)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="编辑"
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
                                aria-label="删除"
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
                          <div
                            className="mt-3 h-1.5 overflow-hidden rounded-full"
                            style={{
                              background:
                                "color-mix(in srgb, var(--reader-text) 9%, transparent)",
                            }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(100, Math.max(0, bookmark.progress * 100))}%`,
                                background:
                                  "linear-gradient(90deg, color-mix(in srgb, var(--reader-primary) 88%, white 12%) 0%, var(--reader-primary) 100%)",
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="notes" className="mt-0 flex-1 overflow-hidden bg-transparent">
            <ScrollArea className="h-full">
              <div className="space-y-2.5 p-5 pt-4" style={{ background: "transparent" }}>
                {notes.length === 0 ? (
                  <div
                    className="rounded-[24px] border px-5 py-8 text-center"
                    style={{
                      background: panelCardSurface,
                      borderColor: panelBorder,
                      boxShadow:
                        "0 18px 34px -28px color-mix(in srgb, var(--reader-text) 20%, transparent)",
                    }}
                  >
                    <p className="text-sm" style={{ color: "var(--reader-text)" }}>
                      暂无笔记
                    </p>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: "var(--reader-muted-text)" }}
                    >
                      选中文字后可以快速记录想法和摘录
                    </p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className={cn(
                        "group cursor-pointer rounded-[24px] border p-4 transition-all duration-200 hover:-translate-y-0.5"
                      )}
                      style={{
                        background: panelCardSurface,
                        borderColor: panelBorder,
                        boxShadow:
                          "0 16px 28px -26px color-mix(in srgb, var(--reader-text) 24%, transparent)",
                      }}
                    >
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <div
                            className="text-xs pl-2 border-l-2 line-clamp-2 rounded text-muted-foreground"
                            style={{
                              borderColor: editingNoteColor,
                            }}
                          >
                            {note.selectedText}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {noteColors.map((c) => (
                              <button
                                key={c}
                                className={cn(
                                  "size-5 rounded-full border-2 transition-colors duration-150 cursor-pointer hover:opacity-90"
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
                            className="mb-2 rounded-[14px] border px-3 py-2 text-xs line-clamp-2"
                            style={{
                              borderColor: "color-mix(in srgb, var(--reader-text) 8%, transparent)",
                              background:
                                "color-mix(in srgb, var(--reader-text) 3%, transparent)",
                              color: "var(--reader-muted-text)",
                              boxShadow: `inset 3px 0 0 ${note.color}`,
                            }}
                          >
                            {note.selectedText}
                          </div>
                          <p
                            className="text-sm line-clamp-3 text-foreground"
                          >
                            {note.content}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(note.createdAt)}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="编辑"
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
                                aria-label="删除"
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

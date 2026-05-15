import { useState, memo, useRef, useCallback } from "react";
import { StickyNote, Trash2, Pencil, Quote, X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/reader/EmptyState";

interface NoteItem {
  id: string;
  selectedText: string;
  content: string;
  color: string;
  location: string;
  createdAt: string;
}

interface NotesTabProps {
  notes: NoteItem[];
  onNoteClick: (location: string) => void;
  onNoteDelete: (id: string) => void;
  onNoteEdit: (id: string, content: string, color: string) => void;
  onClose: () => void;
}

const NOTE_COLORS = ["#facc15", "#4ade80", "#60a5fa", "#f87171", "#c084fc"];

export const NotesTab = memo(function NotesTab({
  notes,
  onNoteClick,
  onNoteDelete,
  onNoteEdit,
  onClose: _onClose,
}: NotesTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingColor, setEditingColor] = useState("");
  const parentRef = useRef<HTMLDivElement>(null);

  const filteredNotes = notes.filter(Boolean);

  const editingNote = editingId ? filteredNotes.find((n) => n.id === editingId) : null;

  const rowVirtualizer = useVirtualizer({
    count: filteredNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  const startEditing = useCallback((note: NoteItem) => {
    setEditingId(note.id);
    setEditingContent(note.content || "");
    setEditingColor(note.color || "#facc15");
  }, []);

  const saveEdit = useCallback(() => {
    if (editingId) {
      onNoteEdit(editingId, editingContent, editingColor);
      setEditingId(null);
    }
  }, [editingId, editingContent, editingColor, onNoteEdit]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
  }, []);

  return (
    <div className="relative flex h-full flex-col">
      {/* Main scrollable content */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-12"
        style={{ display: editingId ? "none" : undefined }}
      >
        {filteredNotes.length === 0 ? (
          <div className="pt-10">
            <EmptyState
              icon={StickyNote}
              title="暂无笔记"
              description="选中文字后可以快速记录想法和摘录"
            />
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const note = filteredNotes[virtualRow.index];

              return (
                <div
                  key={virtualRow.key}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div
                    className={cn(
                      "group relative rounded-xl transition-all duration-200 overflow-hidden cursor-pointer",
                      "hover:shadow-md"
                    )}
                    style={{
                      background: "color-mix(in srgb, var(--reader-card-bg) 60%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--reader-border) 30%, transparent)",
                      marginBottom: "10px",
                    }}
                    onClick={() => {
                      onNoteClick(note.location);
                      _onClose();
                    }}
                  >
                    {/* Top color accent strip */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px]"
                      style={{ background: note.color }}
                    />

                    {/* Quoted text section */}
                    <div
                      className="px-3.5 pt-4 pb-2.5"
                      style={{
                        background: `color-mix(in srgb, ${note.color} 5%, transparent)`,
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Quote
                          className="size-3 shrink-0 mt-0.5"
                          style={{ color: note.color, opacity: 0.5 }}
                        />
                        <p
                          className="text-[12px] leading-relaxed line-clamp-2"
                          style={{
                            color: "var(--reader-muted-text)",
                            borderLeft: `2px solid ${note.color}`,
                            paddingLeft: "8px",
                          }}
                        >
                          {note.selectedText}
                        </p>
                      </div>
                    </div>

                    {/* Divider line */}
                    {note.content && note.content.trim().length > 0 && (
                      <div className="px-3.5">
                        <div
                          className="h-px"
                          style={{
                            background: `linear-gradient(90deg, ${note.color}40, transparent)`,
                          }}
                        />
                      </div>
                    )}

                    {/* Note content section */}
                    {note.content && note.content.trim().length > 0 && (
                      <div className="px-3.5 py-2.5">
                        <p className="text-[13px] leading-relaxed" style={{ color: "var(--reader-text)" }}>
                          {note.content}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="px-3.5 pb-2.5 flex items-center justify-between">
                      <span
                        className="text-[10px] tabular-nums"
                        style={{ color: "var(--reader-text)", opacity: 0.35 }}
                      >
                        {formatDate(note.createdAt)}
                      </span>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 rounded-lg shrink-0"
                          style={{ color: "var(--reader-text)", opacity: 0.3 }}
                          aria-label="编辑笔记"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(note);
                          }}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 rounded-lg shrink-0"
                          style={{ color: "var(--reader-destructive, #ef4444)", opacity: 0.3 }}
                          aria-label="删除笔记"
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editing panel - shown when editing, replaces scroll area */}
      {editingNote && (
        <div className="flex flex-1 flex-col bg-[var(--reader-bg)] min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full" style={{ background: editingColor }} />
              <span className="text-sm font-medium" style={{ color: "var(--reader-text)" }}>
                编辑笔记
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 rounded-lg"
              style={{ color: "var(--reader-muted-text)" }}
              onClick={cancelEdit}
            >
              <X className="size-4" />
            </Button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4 min-h-0">
            {/* Quote preview */}
            <div>
              <p
                className="text-[11px] pl-3 py-2 border-l-[2px] line-clamp-3 italic leading-snug rounded-r-md"
                style={{
                  borderColor: editingColor,
                  color: "var(--reader-muted-text)",
                  background: `color-mix(in srgb, ${editingColor} 6%, transparent)`,
                }}
              >
                {editingNote.selectedText}
              </p>
            </div>

            {/* Color picker */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    className="size-7 cursor-pointer rounded-full transition-all duration-150 hover:scale-110"
                    style={{
                      backgroundColor: c,
                      boxShadow: editingColor === c
                        ? `0 0 0 2px var(--reader-bg), 0 0 0 3.5px ${c}`
                        : "none",
                      transform: editingColor === c ? "scale(1.1)" : undefined,
                    }}
                    aria-label={`选择标注颜色 ${c}`}
                    onClick={() => setEditingColor(c)}
                  />
                ))}
              </div>
            </div>

            {/* Textarea */}
            <Textarea
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              className="text-sm w-full rounded-lg resize-none"
              style={{
                color: "var(--reader-text)",
                background: "color-mix(in srgb, var(--reader-text) 3%, transparent)",
                border: "1px solid color-mix(in srgb, var(--reader-border) 30%, transparent)",
                minHeight: "100px",
              }}
              placeholder="添加笔记..."
              autoFocus
            />
          </div>

          {/* Footer buttons */}
          <div className="px-5 pb-5 pt-3 flex items-center gap-3 shrink-0 border-t" style={{ borderColor: "color-mix(in srgb, var(--reader-text) 8%, transparent)" }}>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-sm flex-1 h-10"
              style={{ color: "var(--reader-muted-text)" }}
              onClick={cancelEdit}
            >
              取消
            </Button>
            <Button
              size="sm"
              className="rounded-xl text-sm flex-1 h-10 shadow-none"
              style={{
                background: "var(--reader-primary)",
                color: "var(--reader-bg)",
                fontWeight: 500,
              }}
              onClick={saveEdit}
            >
              保存
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

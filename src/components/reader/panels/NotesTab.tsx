import { useState, memo, useRef } from "react";
import { StickyNote, Trash2, Pencil } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
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

  const rowVirtualizer = useVirtualizer({
    count: filteredNotes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Notes can be tall
    overscan: 5,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Header Section */}
      <div className="flex shrink-0 items-center gap-3 p-5 pb-3">
        <span
          className="text-[10px] font-semibold tracking-[0.15em] uppercase"
          style={{ color: "var(--reader-text)", opacity: 0.75 }}
        >
          我的笔记 · Notes
        </span>
      </div>

      <div 
        ref={parentRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-5 pb-12"
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
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  paddingBottom: "12px",
                }}
              >
                <div
                  className="group rounded-lg transition-all duration-200 h-full"
                  style={{
                    background: "color-mix(in srgb, var(--reader-card-bg) 55%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--reader-border) 40%, transparent)",
                    boxShadow: "0 1px 2px color-mix(in srgb, var(--reader-text) 4%, transparent)",
                    padding: "14px",
                  }}
                >
                  {editingId === note.id ? (
                    <div className="space-y-3">
                      <div
                        className="text-xs pl-3 border-l-3 line-clamp-2 italic"
                        style={{ borderColor: editingColor, color: "var(--reader-muted-text)" }}
                      >
                        {note.selectedText}
                      </div>
                      <div className="flex items-center gap-2">
                        {NOTE_COLORS.map((c) => (
                          <button
                            key={c}
                            className="size-6 cursor-pointer rounded-full border-2 transition-all duration-200 hover:scale-110"
                            style={{
                              backgroundColor: c,
                              borderColor: editingColor === c ? "var(--reader-text)" : "transparent",
                            }}
                            aria-label={`选择标注颜色 ${c}`}
                            onClick={() => setEditingColor(c)}
                          />
                        ))}
                      </div>
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="text-sm min-h-[80px] rounded-lg"
                        style={{ color: "var(--reader-text)" }}
                        autoFocus
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-xs"
                          style={{ color: "var(--reader-muted-text)" }}
                          onClick={() => setEditingId(null)}
                        >
                          取消
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-lg text-xs"
                          style={{ background: "var(--reader-primary)", color: "var(--reader-bg)" }}
                          onClick={() => {
                            onNoteEdit(note.id, editingContent, editingColor);
                            setEditingId(null);
                          }}
                        >
                          保存
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer flex flex-col h-full"
                      onClick={() => {
                        onNoteClick(note.location);
                        _onClose();
                      }}
                    >
                      <div
                        className="mb-2 rounded-r-lg border-l-[3px] py-1.5 pl-3 text-[11px] leading-relaxed line-clamp-2 shrink-0"
                        style={{
                          borderColor: note.color,
                          color: "var(--reader-muted-text)",
                          background: "color-mix(in srgb, var(--reader-text) 6%, transparent)",
                        }}
                      >
                        {note.selectedText}
                      </div>
                      {note.content && note.content.trim().length > 0 && (
                        <p className="text-[13px] leading-relaxed mb-2" style={{ color: "var(--reader-text)" }}>
                          {note.content}
                        </p>
                      )}
                      <div
                        className="flex items-center justify-between mt-auto pt-2 shrink-0"
                      >
                        <span className="text-[10px]" style={{ color: "var(--reader-text)", opacity: 0.5 }}>
                          {formatDate(note.createdAt)}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 rounded-lg shrink-0"
                            style={{ color: "var(--reader-text)", opacity: 0.35 }}
                            aria-label="编辑笔记"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(note.id);
                              setEditingContent(note.content || "");
                              setEditingColor(note.color || "#facc15");
                            }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 rounded-lg shrink-0"
                            style={{ color: "var(--reader-destructive, #ef4444)", opacity: 0.35 }}
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
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
});

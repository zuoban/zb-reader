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
    estimateSize: () => 140, // Notes can be tall
    overscan: 5,
  });

  return (
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
                  className="reader-liquid-surface group rounded-xl p-4 transition-all duration-200 hover:-translate-y-0.5 h-full"
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
                          className="reader-liquid-control rounded-lg text-xs"
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
                        className="mb-3 rounded-lg border-l-[3px] py-2 pl-3 text-xs line-clamp-2 italic shrink-0"
                        style={{
                          borderColor: note.color,
                          color: "var(--reader-muted-text)",
                          background: "color-mix(in srgb, var(--reader-card-bg) 46%, transparent)",
                        }}
                      >
                        {note.selectedText}
                      </div>
                      <p className="text-sm line-clamp-3 font-medium flex-1" style={{ color: "var(--reader-text)" }}>
                        {note.content || ""}
                      </p>
                      <div
                        className="flex items-center justify-between mt-3 pt-3 border-t shrink-0"
                        style={{ borderColor: "var(--reader-border)" }}
                      >
                        <span className="text-xs" style={{ color: "var(--reader-muted-text)" }}>
                          {formatDate(note.createdAt)}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="reader-liquid-control h-8 w-8 rounded-lg"
                            style={{ color: "var(--reader-muted-text)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(note.id);
                              setEditingContent(note.content || "");
                              setEditingColor(note.color || "#facc15");
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg border border-red-300/18 bg-[linear-gradient(180deg,rgba(255,120,120,0.18),rgba(255,120,120,0.07))] hover:bg-[linear-gradient(180deg,rgba(255,120,120,0.24),rgba(255,120,120,0.11))]"
                            style={{ color: "var(--reader-destructive, #ef4444)" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onNoteDelete(note.id);
                            }}
                          >
                            <Trash2 className="size-4" />
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
  );
});

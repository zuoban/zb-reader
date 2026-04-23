import { useState, memo } from "react";
import { StickyNote, Trash2, Pencil } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

  return (
    <ScrollArea className="h-full">
      <div className="p-5 space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-12">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
              style={{ background: "color-mix(in srgb, var(--reader-text) 5%, transparent)" }}
            >
              <StickyNote className="size-8" style={{ color: "var(--reader-muted-text)" }} />
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--reader-text)" }}>
              暂无笔记
            </p>
            <p className="mt-1.5 text-xs" style={{ color: "var(--reader-muted-text)" }}>
              选中文字后可以快速记录想法和摘录
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="group rounded-xl border p-4 transition-all duration-200 hover:shadow-sm"
              style={{ borderColor: "var(--reader-border)", background: "var(--reader-card-bg)" }}
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
                        className="size-6 rounded-full border-2 transition-all duration-200 hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: editingColor === c ? "var(--reader-text)" : "transparent",
                        }}
                        onClick={() => setEditingColor(c)}
                      />
                    ))}
                  </div>
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="text-sm min-h-[80px] rounded-lg"
                    style={{ background: "var(--reader-bg)", borderColor: "var(--reader-border)", color: "var(--reader-text)" }}
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
                      style={{ background: "var(--reader-primary)", color: "#ffffff" }}
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
                  className="cursor-pointer"
                  onClick={() => {
                    onNoteClick(note.location);
                    _onClose();
                  }}
                >
                  <div
                    className="mb-3 rounded-lg border-l-[3px] pl-3 text-xs line-clamp-2 italic bg-[color-mix(in_srgb,var(--reader-bg)_50%,transparent)] py-2"
                    style={{ borderColor: note.color, color: "var(--reader-muted-text)" }}
                  >
                    {note.selectedText}
                  </div>
                  <p className="text-sm line-clamp-3 font-medium" style={{ color: "var(--reader-text)" }}>
                    {note.content}
                  </p>
                  <div
                    className="flex items-center justify-between mt-3 pt-3 border-t"
                    style={{ borderColor: "var(--reader-border)" }}
                  >
                    <span className="text-xs" style={{ color: "var(--reader-muted-text)" }}>
                      {formatDate(note.createdAt)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-[color-mix(in_srgb,var(--reader-text)_8%,transparent)]"
                        style={{ color: "var(--reader-muted-text)" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(note.id);
                          setEditingContent(note.content);
                          setEditingColor(note.color);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
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
          ))
        )}
      </div>
    </ScrollArea>
  );
});

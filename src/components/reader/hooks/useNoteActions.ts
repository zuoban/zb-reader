import { useCallback } from "react";
import { toast } from "sonner";

interface SelectionMenu {
  visible: boolean;
  position: { x: number; y: number };
  cfiRange: string;
  text: string;
}

interface NoteEditor {
  open: boolean;
  selectedText: string;
  cfiRange: string;
  initialContent?: string;
  initialColor?: string;
  editingId?: string;
}

interface Note {
  id: string;
  bookId: string;
  userId: string;
  location: string;
  selectedText: string | null;
  content: string | null;
  color: string | null;
  progress: number | null;
  pageNumber: number | null;
  createdAt: string;
  updatedAt: string;
}

interface Highlight {
  cfiRange: string;
  color: string;
  id: string;
}

type StateSetter<T> = T | ((prev: T) => T);

interface UseNoteActionsParams {
  bookId: string;
  selectionMenu: SelectionMenu;
  noteEditor: NoteEditor;
  progressRef: React.MutableRefObject<number>;
  currentPage: number | undefined;
  onHighlightAdded: (highlight: Highlight) => void;
  onHighlightRemoved: (tempId: string) => void;
  onHighlightUpdated: (tempId: string, updates: Partial<Highlight>) => void;
  onNoteAdded: (note: Note) => void;
  onNoteRemoved: (id: string) => void;
  onNoteUpdated: (id: string, updates: Partial<Note>) => void;
  setSelectionMenu: (value: StateSetter<SelectionMenu>) => void;
  setNoteEditor: (value: StateSetter<NoteEditor>) => void;
}

interface UseNoteActionsReturn {
  handleHighlight: (color: string) => Promise<void>;
  handleAddNote: () => void;
  handleCopyText: () => void;
  handleSaveNote: (content: string, color: string) => Promise<void>;
  handleNoteDelete: (id: string) => Promise<void>;
  handleNoteEdit: (id: string, content: string, color: string) => Promise<void>;
}

/**
 * Handles note/highlight CRUD operations with optimistic UI updates.
 *
 * @param params.bookId - The current book's ID
 * @param params.selectionMenu - Current text selection state
 * @param params.noteEditor - Current note editor state
 * @param params.progressRef - Ref holding the current reading progress
 * @param params.currentPage - Current page number
 * @param params.onHighlightAdded - Called when a new highlight is created
 * @param params.onHighlightRemoved - Called when a highlight is removed
 * @param params.onHighlightUpdated - Called when a highlight is updated
 * @param params.onNoteAdded - Called when a new note is created
 * @param params.onNoteRemoved - Called when a note is deleted
 * @param params.onNoteUpdated - Called when a note is updated
 * @param params.setSelectionMenu - Setter for selection menu state
 * @param params.setNoteEditor - Setter for note editor state
 */
export function useNoteActions({
  bookId,
  selectionMenu,
  noteEditor,
  progressRef,
  currentPage,
  onHighlightAdded,
  onHighlightRemoved,
  onHighlightUpdated,
  onNoteAdded,
  onNoteRemoved,
  onNoteUpdated,
  setSelectionMenu,
  setNoteEditor,
}: UseNoteActionsParams): UseNoteActionsReturn {
  const handleHighlight = useCallback(
    async (color: string) => {
      const { cfiRange, text } = selectionMenu;
      if (!cfiRange) return;

      // Optimistically add highlight immediately for instant visual feedback
      const tempId = `temp-${Date.now()}`;
      onHighlightAdded({ cfiRange, color, id: tempId });
      setSelectionMenu((prev) => ({ ...prev, visible: false }));

      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookId,
            location: cfiRange,
            selectedText: text,
            color,
            progress: progressRef.current,
            pageNumber: currentPage,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          onNoteAdded(data.note);
          // Replace temp highlight with real id
          onHighlightUpdated(tempId, { id: data.note.id });
          toast.success("已添加高亮");
        } else {
          // Remove optimistic highlight on failure
          onHighlightRemoved(tempId);
        }
      } catch {
        onHighlightRemoved(tempId);
        toast.error("操作失败");
      }
    },
    [selectionMenu, bookId, currentPage]
  );

  const handleAddNote = useCallback(() => {
    setNoteEditor({
      open: true,
      selectedText: selectionMenu.text,
      cfiRange: selectionMenu.cfiRange,
    });
    setSelectionMenu((prev) => ({ ...prev, visible: false }));
  }, [selectionMenu]);

  const handleCopyText = useCallback(() => {
    navigator.clipboard.writeText(selectionMenu.text);
    toast.success("已复制");
    setSelectionMenu((prev) => ({ ...prev, visible: false }));
  }, [selectionMenu.text]);

  const handleSaveNote = useCallback(
    async (content: string, color: string) => {
      if (noteEditor.editingId) {
        // Edit existing note — optimistically update highlight color
        onHighlightUpdated(noteEditor.editingId, { color });
        try {
          await fetch(`/api/notes/${noteEditor.editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, color }),
          });
          onNoteUpdated(noteEditor.editingId, { content, color });
          toast.success("已更新笔记");
        } catch {
          toast.error("更新失败");
        }
      } else {
        // Create new note — optimistic highlight
        const tempId = `temp-${Date.now()}`;
        if (noteEditor.cfiRange) {
          onHighlightAdded({ cfiRange: noteEditor.cfiRange, color, id: tempId });
        }
        try {
          const res = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              bookId,
              location: noteEditor.cfiRange,
              selectedText: noteEditor.selectedText,
              content,
              color,
              progress: progressRef.current,
              pageNumber: currentPage,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            onNoteAdded(data.note);
            onHighlightUpdated(tempId, { id: data.note.id });
            toast.success("已添加笔记");
          } else {
            onHighlightRemoved(tempId);
          }
        } catch {
          onHighlightRemoved(tempId);
          toast.error("操作失败");
        }
      }
      setNoteEditor({ open: false, selectedText: "", cfiRange: "" });
    },
    [noteEditor, bookId, currentPage]
  );

  const handleNoteDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notes/${id}`, { method: "DELETE" });
      onNoteRemoved(id);
      toast.success("已删除笔记");
    } catch {
      toast.error("删除失败");
    }
  }, []);

  const handleNoteEdit = useCallback(
    async (id: string, content: string, color: string) => {
      try {
        await fetch(`/api/notes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, color }),
        });
        onNoteUpdated(id, { content, color });
        toast.success("已更新笔记");
      } catch {
        toast.error("更新失败");
      }
    },
    []
  );

  return {
    handleHighlight,
    handleAddNote,
    handleCopyText,
    handleSaveNote,
    handleNoteDelete,
    handleNoteEdit,
  };
}

"use client";

import { useState } from "react";

export interface ReaderSelectionMenuState {
  visible: boolean;
  position: { x: number; y: number };
  cfiRange: string;
  text: string;
}

export interface ReaderNoteEditorState {
  open: boolean;
  selectedText: string;
  cfiRange: string;
  initialContent?: string;
  initialColor?: string;
  editingId?: string;
}

export function useReaderSelectionState() {
  const [selectionMenu, setSelectionMenu] = useState<ReaderSelectionMenuState>({
    visible: false,
    position: { x: 0, y: 0 },
    cfiRange: "",
    text: "",
  });
  const [selectionMenuKey, setSelectionMenuKey] = useState(0);
  const [noteEditor, setNoteEditor] = useState<ReaderNoteEditorState>({
    open: false,
    selectedText: "",
    cfiRange: "",
  });

  return {
    noteEditor,
    selectionMenu,
    selectionMenuKey,
    setNoteEditor,
    setSelectionMenu,
    setSelectionMenuKey,
  };
}

"use client";

import { IdleCountdownWarning } from "@/components/reader/IdleCountdownWarning";
import { ReaderCanvas } from "@/components/reader/ReaderCanvas";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { SidePanel } from "@/components/reader/SidePanel";
import { ReadingSettings } from "@/components/reader/ReadingSettings";
import { TextSelectionMenu } from "@/components/reader/TextSelectionMenu";
import { NoteEditor } from "@/components/reader/NoteEditor";
import { ReaderTtsLayer } from "@/components/reader/ReaderTtsLayer";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import {
  ReaderProviders,
  useBookData,
  useReaderUI,
  useReaderSettings,
} from "@/components/reader/providers";

function ReaderContent() {
  const { book, loading, bookData, bookUrl } = useBookData();
  const { idleCountdown } = useReaderUI();
  const { currentTheme, readerTheme } = useReaderSettings();

  if (loading || !book || (!bookData && !bookUrl)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={`isolate h-screen w-screen overflow-hidden paper-texture ${currentTheme.bg}`}
      data-reader-theme={readerTheme}
      style={{
        "--reader-bg": currentTheme.solidBg,
        "--reader-card-bg": currentTheme.cardBg,
        "--reader-text": currentTheme.text,
        "--reader-muted-text": currentTheme.mutedText,
        "--reader-border": currentTheme.border,
        "--reader-shadow": currentTheme.shadow,
        "--reader-primary": currentTheme.primary,
        "--reader-primary-light": currentTheme.primaryLight,
        "--reader-destructive": currentTheme.destructive,
      } as React.CSSProperties}
    >
      {/* Subtle Top & Bottom Fade */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-[var(--reader-bg)] to-transparent opacity-80" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-[var(--reader-bg)] to-transparent opacity-80" />

      <ReaderCanvas />

      <ReaderToolbar />

      <SidePanel />

      <ReadingSettings />

      <TextSelectionMenu />

      <NoteEditor />

      <ReaderTtsLayer />

      <IdleCountdownWarning seconds={idleCountdown} />

      <Toaster />
    </div>
  );
}

export default function ReaderPage() {
  return (
    <ReaderProviders>
      <ReaderContent />
    </ReaderProviders>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { IdleCountdownWarning } from "@/components/reader/IdleCountdownWarning";
import { ReaderCanvas } from "@/components/reader/ReaderCanvas";

import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import {
  ReaderProviders,
  useBookData,
  useReaderUI,
  useReaderSettings,
} from "@/components/reader/providers";

const SidePanel = dynamic(
  () => import("@/components/reader/SidePanel").then((m) => m.SidePanel),
  { ssr: false }
);

const ReadingSettings = dynamic(
  () => import("@/components/reader/ReadingSettings").then((m) => m.ReadingSettings),
  { ssr: false }
);

const TextSelectionMenu = dynamic(
  () => import("@/components/reader/TextSelectionMenu").then((m) => m.TextSelectionMenu),
  { ssr: false }
);

const NoteEditor = dynamic(
  () => import("@/components/reader/NoteEditor").then((m) => m.NoteEditor),
  { ssr: false }
);

const ReaderTtsLayer = dynamic(
  () => import("@/components/reader/ReaderTtsLayer").then((m) => m.ReaderTtsLayer),
  { ssr: false }
);

/**
 * Preconnect and prefetch lightweight resources for reader loading.
 *
 * Note: EPUB file prefetch is intentionally excluded here because:
 * 1. It would trigger a separate download that bypasses IndexedDB cache
 * 2. The actual EPUB download and caching is handled in useReaderBookData hook
 * 3. We only preconnect to warm up the TCP connection, not download the file
 */
function ResourcePreloader() {
  const params = useParams();
  const bookId = params.bookId as string;

  useEffect(() => {
    // Preconnect to origin for faster subsequent requests
    const preconnect = document.createElement("link");
    preconnect.rel = "preconnect";
    preconnect.href = window.location.origin;
    document.head.appendChild(preconnect);

    // Prefetch lightweight bootstrap API (returns JSON, not binary)
    const prefetchBootstrap = document.createElement("link");
    prefetchBootstrap.rel = "prefetch";
    prefetchBootstrap.as = "fetch";
    prefetchBootstrap.href = `/api/reader/bootstrap?bookId=${bookId}`;
    prefetchBootstrap.crossOrigin = "anonymous";
    document.head.appendChild(prefetchBootstrap);

    // Prefetch reader-settings API
    const prefetchSettings = document.createElement("link");
    prefetchSettings.rel = "prefetch";
    prefetchSettings.as = "fetch";
    prefetchSettings.href = "/api/reader-settings";
    prefetchSettings.crossOrigin = "anonymous";
    document.head.appendChild(prefetchSettings);

    return () => {
      // Removing <link> elements doesn't cancel in-flight requests,
      // but keeps the DOM clean for subsequent mounts (e.g. bookId change).
      document.head.removeChild(preconnect);
      document.head.removeChild(prefetchBootstrap);
      document.head.removeChild(prefetchSettings);
    };
  }, [bookId]);

  return null;
}

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
      <ReaderCanvas />

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
      <ResourcePreloader />
      <ReaderContent />
    </ReaderProviders>
  );
}

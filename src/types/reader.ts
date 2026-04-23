/** Table of contents item from EPUB parsing. */
export interface TocItem {
  label: string;
  href: string;
  id?: string;
  level?: number;
  subitems?: TocItem[];
}

/** Text paragraph visible in the reader viewport for TTS and navigation. */
export interface ReaderParagraph {
  id: string;
  text: string;
  location?: string;
}

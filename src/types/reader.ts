/** Table of contents item from EPUB parsing. */
export interface TocItem {
  label: string;
  href: string;
  id?: string;
  level?: number;
  subitems?: TocItem[];
}

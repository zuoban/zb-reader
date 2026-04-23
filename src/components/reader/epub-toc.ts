import type { TocItem } from "@/types/reader";

interface RawTocItem {
  label: string;
  href: string;
  id?: string;
  subitems?: RawTocItem[];
}

export function parseEpubToc(items: RawTocItem[]): TocItem[] {
  return items.map((item) => ({
    label: item.label.trim(),
    href: item.href,
    id: item.id || undefined,
    ...(item.subitems && item.subitems.length > 0
      ? { subitems: parseEpubToc(item.subitems) }
      : {}),
  }));
}

export type { RawTocItem };

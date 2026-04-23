/**
 * 在元素内查找文本并创建 Range
 * 用于 TTS 高亮和文本选择功能
 */
export function findTextRange(element: Node, searchText: string): Range | null {
  const normalizedSearch = searchText.replace(/\s+/g, "").trim();
  if (!normalizedSearch) return null;

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

  const textNodes: Text[] = [];
  let node: Node | null;

  while ((node = walker.nextNode())) {
    textNodes.push(node as Text);
  }

  let fullText = "";
  const nodeOffsets: { node: Text; start: number; end: number }[] = [];

  for (const textNode of textNodes) {
    const text = textNode.textContent || "";
    nodeOffsets.push({
      node: textNode,
      start: fullText.length,
      end: fullText.length + text.length,
    });
    fullText += text;
  }

  const normalizedFullText = fullText.replace(/\s+/g, "");

  const index = normalizedFullText.indexOf(normalizedSearch);
  if (index === -1) return null;

  let charCount = 0;
  let startOffset = -1;
  let endOffset = -1;

  for (let i = 0; i < fullText.length; i++) {
    if (fullText[i].trim()) {
      if (charCount === index && startOffset === -1) {
        startOffset = i;
      }
      if (charCount === index + normalizedSearch.length - 1 && endOffset === -1) {
        endOffset = i + 1;
        break;
      }
      charCount++;
    }
  }

  if (startOffset === -1 || endOffset === -1) return null;

  let startNode: Text | null = null;
  let endNode: Text | null = null;
  let startNodeOffset = 0;
  let endNodeOffset = 0;

  for (const { node, start, end } of nodeOffsets) {
    if (start <= startOffset && startOffset < end) {
      startNode = node;
      startNodeOffset = startOffset - start;
    }
    if (start < endOffset && endOffset <= end) {
      endNode = node;
      endNodeOffset = endOffset - start;
    }
  }

  if (!startNode || !endNode) return null;

  const range = document.createRange();
  range.setStart(startNode, startNodeOffset);
  range.setEnd(endNode, endNodeOffset);

  return range;
}

/**
 * 在元素内查找文本并创建 Range
 * 用于 TTS 高亮和文本选择功能
 */
export function findTextRange(
  element: Node,
  searchText: string,
  occurrenceIndex = 0
): Range | null {
  // 对于代码块或长文本，使用更精确的匹配策略
  const isLikelyCodeBlock = searchText.includes('{') || searchText.includes('}') || searchText.includes('function') || searchText.includes('const ') || searchText.includes('let ') || searchText.includes('var ');

  // 代码块使用保留空白的匹配策略
  const normalizedSearch = isLikelyCodeBlock
    ? searchText.trim()
    : searchText.replace(/\s+/g, "").trim();

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

  // 代码块使用保留空白的归一化
  const normalizedFullText = isLikelyCodeBlock
    ? fullText.trim()
    : fullText.replace(/\s+/g, "");

  const indexes: number[] = [];
  let searchFrom = 0;
  while (searchFrom <= normalizedFullText.length - normalizedSearch.length) {
    const nextIndex = normalizedFullText.indexOf(normalizedSearch, searchFrom);
    if (nextIndex === -1) break;
    indexes.push(nextIndex);
    searchFrom = nextIndex + Math.max(1, normalizedSearch.length);
  }

  const index = indexes[occurrenceIndex] ?? indexes[0] ?? -1;
  if (index === -1) return null;

  // 代码块使用保留空白的偏移计算
  let charCount = 0;
  let startOffset = -1;
  let endOffset = -1;

  if (isLikelyCodeBlock) {
    // 代码块：直接按字符位置匹配
    for (let i = 0; i < fullText.length; i++) {
      if (charCount === index && startOffset === -1) {
        startOffset = i;
      }
      if (charCount === index + normalizedSearch.length - 1 && endOffset === -1) {
        endOffset = i + 1;
        break;
      }
      charCount++;
    }
  } else {
    // 非代码块：跳过空白字符匹配
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

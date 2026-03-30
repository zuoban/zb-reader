export interface Sentence {
  text: string;
  paragraphId: string;
  location?: string;
}

export interface ReaderParagraph {
  id: string;
  text: string;
  location?: string;
}

// 常见缩写词列表（小写）
const ABBREVIATIONS = new Set([
  // 英文称谓
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  // 拉丁缩写
  "etc",
  "ie",
  "eg",
  "vs",
  "vol",
  "vols",
  // 商业
  "inc",
  "ltd",
  "corp",
  // 地址
  "st",
  "ave",
  "rd",
  "blvd",
  // 月份
  "jan",
  "feb",
  "mar",
  "apr",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
  // 星期
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
  // 时间
  "am",
  "pm",
  // 其他
  "no",
  "nos",
]);

// 引号字符
const QUOTES = ['"', "'", "'", "'", '"', '"', "「", "」", "『", "』", "【", "】"];

/**
 * 智能句子分割
 *
 * 规则：
 * 1. 中文终止符：。！？… 以及 ...
 * 2. 英文终止符：. ! ?
 * 3. 引号内不分割（保护整句对话）
 * 4. 保护数字（3.14）和缩写词（Mr.）
 * 5. 超长句子（>maxLength）在合适位置强制分割
 */
export function splitIntoSentences(text: string, maxLength = 500): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // 预处理：保护特殊内容
  const protectedRanges: Array<{ start: number; end: number; type: string }> = [];

  // 保护 URL
  const urlRegex = /https?:\/\/[^\s]+/g;
  let match;
  while ((match = urlRegex.exec(text)) !== null) {
    protectedRanges.push({ start: match.index, end: match.index + match[0].length, type: "url" });
  }

  // 保护数字（包括版本号如 v1.0, 2.5x）
  const numberRegex = /\d+\.\d+[xX]?/g;
  while ((match = numberRegex.exec(text)) !== null) {
    // 检查是否与URL重叠
    const isOverlapping = protectedRanges.some(
      (r) => r.start <= match!.index && r.end >= match!.index + match![0].length
    );
    if (!isOverlapping) {
      protectedRanges.push({
        start: match.index,
        end: match.index + match[0].length,
        type: "number",
      });
    }
  }

  // 保护引号内的内容（简单方案：找到引号对，标记内部为protected）
  const quoteStack: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (QUOTES.includes(char)) {
      if (quoteStack.length === 0) {
        quoteStack.push(i);
      } else {
        const start = quoteStack.pop();
        if (start !== undefined) {
          protectedRanges.push({ start, end: i + 1, type: "quote" });
        }
      }
    }
  }

  // 保护缩写词（检查 . 前面是否是缩写）
  const wordBeforeDotRegex = /\b([a-zA-Z]+)\./g;
  while ((match = wordBeforeDotRegex.exec(text)) !== null) {
    const word = match[1].toLowerCase();
    if (ABBREVIATIONS.has(word)) {
      // 检查是否与其他保护区域重叠
      const dotIndex = match.index + match[1].length;
      const isOverlapping = protectedRanges.some(
        (r) => r.start <= dotIndex && r.end > dotIndex
      );
      if (!isOverlapping) {
        protectedRanges.push({
          start: dotIndex,
          end: dotIndex + 1,
          type: "abbrev",
        });
      }
    }
  }

  // 排序保护范围
  protectedRanges.sort((a, b) => a.start - b.start);

  // 构建句子终止符位置列表
  const sentenceEndPositions: number[] = [];

  // 中文终止符和省略号
  const chineseEndRegex = /[。！？]|\.{3}|…/g;
  while ((match = chineseEndRegex.exec(text)) !== null) {
    const endPos = match.index + match[0].length;
    // 检查是否在保护区域内
    const isProtected = protectedRanges.some(
      (r) => r.start < endPos && r.end >= match!.index
    );
    if (!isProtected) {
      sentenceEndPositions.push(endPos);
    }
  }

  // 英文终止符（.!?）
  const englishEndRegex = /[.!?]/g;
  while ((match = englishEndRegex.exec(text)) !== null) {
    const pos = match.index;
    const endPos = pos + 1;

    // 检查是否是缩写词的一部分
    const isAbbrevDot = protectedRanges.some(
      (r) => r.type === "abbrev" && r.start === pos && r.end === endPos
    );
    if (isAbbrevDot) continue;

    // 检查是否在保护区域内
    const isProtected = protectedRanges.some(
      (r) => r.start <= pos && r.end > pos && r.type !== "abbrev"
    );
    if (!isProtected) {
      sentenceEndPositions.push(endPos);
    }
  }

  // 排序终止位置
  sentenceEndPositions.sort((a, b) => a - b);

  // 分割句子
  const sentences: string[] = [];
  let lastEnd = 0;

  for (const endPos of sentenceEndPositions) {
    if (endPos > lastEnd) {
      const sentence = text.slice(lastEnd, endPos).trim();
      if (sentence.length > 0) {
        // 检查是否需要强制分割（超长句子）
        if (sentence.length > maxLength) {
          const chunks = forceSplitLongSentence(sentence, maxLength);
          sentences.push(...chunks);
        } else {
          sentences.push(sentence);
        }
      }
      lastEnd = endPos;
    }
  }

  // 处理最后一段（如果没有终止符）
  if (lastEnd < text.length) {
    const lastSentence = text.slice(lastEnd).trim();
    if (lastSentence.length > 0) {
      if (lastSentence.length > maxLength) {
        const chunks = forceSplitLongSentence(lastSentence, maxLength);
        sentences.push(...chunks);
      } else {
        sentences.push(lastSentence);
      }
    }
  }

  return sentences.filter((s) => s.length > 0);
}

/**
 * 强制分割超长句子
 * 在标点或空格处分割，尽量保持语义完整
 */
function forceSplitLongSentence(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > maxLength) {
    // 优先在标点处分割（逗号、分号、冒号）
    const splitPositions: number[] = [];

    // 查找所有标点位置
    const punctRegex = /[，,；;：:]/g;
    let match;
    while ((match = punctRegex.exec(remaining)) !== null) {
      if (match.index > 0 && match.index < maxLength) {
        splitPositions.push(match.index + 1);
      }
    }

    // 如果没有合适标点，找空格
    if (splitPositions.length === 0) {
      const spaceRegex = /\s/g;
      while ((match = spaceRegex.exec(remaining)) !== null) {
        if (match.index > 0 && match.index < maxLength) {
          splitPositions.push(match.index + 1);
        }
      }
    }

    // 选择最合适的位置（尽可能靠后但不超过maxLength）
    let splitPos = maxLength;
    if (splitPositions.length > 0) {
      splitPos = splitPositions[splitPositions.length - 1];
    }

    // 确保至少分割出一些内容
    if (splitPos <= 0) {
      splitPos = Math.min(maxLength, Math.floor(remaining.length / 2));
    }

    const chunk = remaining.slice(0, splitPos).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    remaining = remaining.slice(splitPos).trim();
  }

  if (remaining.length > 0) {
    chunks.push(remaining);
  }

  return chunks;
}

/**
 * 将段落列表转换为句子列表
 */
export function paragraphsToSentences(
  paragraphs: ReaderParagraph[],
  maxLength = 500
): Sentence[] {
  const sentences: Sentence[] = [];

  for (const paragraph of paragraphs) {
    const text = paragraph.text.trim();
    if (text.length === 0) continue;

    const sentenceTexts = splitIntoSentences(text, maxLength);

    for (const sentenceText of sentenceTexts) {
      if (sentenceText.trim().length > 0) {
        sentences.push({
          text: sentenceText.trim(),
          paragraphId: paragraph.id,
          location: paragraph.location,
        });
      }
    }
  }

  return sentences;
}

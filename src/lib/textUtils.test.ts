import { describe, expect, it } from "vitest";
import {
  getTtsSentenceKey,
  paragraphsToSentences,
  type ReaderParagraph,
} from "@/lib/textUtils";

describe("paragraphsToSentences", () => {
  it("assigns sentence indexes within each paragraph", () => {
    const paragraphs: ReaderParagraph[] = [
      {
        id: "p1",
        text: "重复。重复。",
        location: "epubcfi(/6/2)",
      },
      {
        id: "p2",
        text: "下一段。",
        location: "epubcfi(/6/4)",
      },
    ];

    const sentences = paragraphsToSentences(paragraphs);

    expect(sentences.map((sentence) => sentence.sentenceIndexInParagraph)).toEqual([
      0,
      1,
      0,
    ]);
  });

  it("builds distinct TTS keys for repeated sentence text", () => {
    const [first, second] = paragraphsToSentences([
      {
        id: "p1",
        text: "重复。重复。",
        location: "epubcfi(/6/2)",
      },
    ]);

    expect(first.text).toBe(second.text);
    expect(getTtsSentenceKey(first, 0)).not.toBe(getTtsSentenceKey(second, 1));
  });

  it("keeps code blocks as a single sentence with index zero", () => {
    const [sentence] = paragraphsToSentences([
      {
        id: "code-1",
        text: "const a = 1;\nconst b = 2;",
        isCodeBlock: true,
      },
    ]);

    expect(sentence.text).toBe("const a = 1;\nconst b = 2;");
    expect(sentence.sentenceIndexInParagraph).toBe(0);
    expect(sentence.isCodeBlock).toBe(true);
  });
});

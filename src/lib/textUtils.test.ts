import { describe, expect, it } from "vitest";
import {
  getTtsSentenceKey,
  paragraphsToSentences,
  splitIntoSentences,
  type ReaderParagraph,
} from "@/lib/textUtils";

describe("splitIntoSentences", () => {
  it("does not split inside URLs", () => {
    expect(
      splitIntoSentences(
        "项目地址是 https://reader.example.com/books/123?rate=1.25。也可以打开 www.example.org/docs/page.html 查看。"
      )
    ).toEqual([
      "项目地址是 https://reader.example.com/books/123?rate=1.25。",
      "也可以打开 www.example.org/docs/page.html 查看。",
    ]);
  });

  it("does not split inside decimal numbers", () => {
    expect(splitIntoSentences("音量设为 0.75，语速是 1.25。下一句。")).toEqual([
      "音量设为 0.75，语速是 1.25。",
      "下一句。",
    ]);
  });

  it("does not split inside email addresses", () => {
    expect(splitIntoSentences("请发到 reader.support@example.co.uk。收到后回复。")).toEqual([
      "请发到 reader.support@example.co.uk。",
      "收到后回复。",
    ]);
  });

  it("does not split inside personal name initials", () => {
    expect(splitIntoSentences("Alan J. Perlis 说过这句话。下一句。")).toEqual([
      "Alan J. Perlis 说过这句话。",
      "下一句。",
    ]);
  });
});

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

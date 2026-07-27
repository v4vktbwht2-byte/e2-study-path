const JAPANESE_CHARACTER_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const JAPANESE_CHARACTER_SEQUENCE_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu;
const LATIN_CHARACTER_PATTERN = /\p{Script=Latin}/u;

export interface ContentTextSegment {
  text: string;
  language?: "en";
}

/**
 * ページ既定は日本語。日本語を含まない教材文字列だけ英語として明示し、
 * screen readerが英語の発音規則へ切り替えられるようにする。
 */
export function contentTextLanguage(text: string): "en" | undefined {
  return JAPANESE_CHARACTER_PATTERN.test(text) ? undefined : "en";
}

/**
 * 英文と日本語が同じ教材文字列に含まれる場合も、英語部分だけを
 * screen readerへ明示できる表示用セグメントに分割する。
 */
export function segmentContentText(text: string): readonly ContentTextSegment[] {
  const segments: ContentTextSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(JAPANESE_CHARACTER_SEQUENCE_PATTERN)) {
    const matchIndex = match.index;
    if (matchIndex > cursor) {
      const leading = text.slice(cursor, matchIndex);
      segments.push({
        text: leading,
        ...(LATIN_CHARACTER_PATTERN.test(leading) ? { language: "en" as const } : {}),
      });
    }

    segments.push({ text: match[0] });
    cursor = matchIndex + match[0].length;
  }

  if (cursor < text.length) {
    const trailing = text.slice(cursor);
    segments.push({
      text: trailing,
      ...(LATIN_CHARACTER_PATTERN.test(trailing) ? { language: "en" as const } : {}),
    });
  }

  if (segments.length === 0) {
    return [
      {
        text,
        ...(contentTextLanguage(text) === "en" ? { language: "en" as const } : {}),
      },
    ];
  }

  return segments.reduce<ContentTextSegment[]>((merged, segment) => {
    const previous = merged.at(-1);
    if (previous !== undefined && previous.language === segment.language) {
      previous.text += segment.text;
    } else {
      merged.push({ ...segment });
    }
    return merged;
  }, []);
}

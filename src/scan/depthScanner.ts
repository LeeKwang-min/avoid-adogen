import type { LineDepth } from '../types';

/**
 * 한 줄의 들여쓰기를 잰다.
 *
 * visualCols와 charCount를 분리하는 이유: depth 판정은 시각적 열 수로 해야 하고,
 * 이미지 폭은 문자 수(ch) 기준으로 계산해야 한다. 탭이 섞이면 두 값이 달라진다.
 */
export function scanLine(text: string, line: number, tabSize: number): LineDepth {
  let visualCols = 0;
  let charCount = 0;
  let usesTab = false;

  for (const ch of text) {
    if (ch === ' ') {
      visualCols += 1;
      charCount += 1;
    } else if (ch === '\t') {
      usesTab = true;
      // 다음 탭스톱까지 채운다.
      visualCols += tabSize - (visualCols % tabSize);
      charCount += 1;
    } else {
      break;
    }
  }

  const isBlank = charCount === text.length;

  return { line, visualCols, charCount, usesTab, isBlank };
}

export function scanLines(texts: string[], startLine: number, tabSize: number): LineDepth[] {
  return texts.map((text, i) => scanLine(text, startLine + i, tabSize));
}

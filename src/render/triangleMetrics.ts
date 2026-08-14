import type { LineDepth, Triangle, TriangleMetrics } from '../types';

/**
 * 삼각형의 크기를 잰다.
 *
 * maxWidth는 이미지 폭(ch)과 비교할 값이라 실제로 여백이 존재하는 줄만 센다.
 * 빈 줄은 여백이 0이고, 탭 줄은 문자 수와 시각적 폭이 달라서 둘 다 제외한다.
 *
 * lineCount는 제외된 줄까지 세어 삼각형의 세로 크기를 그대로 반영한다.
 * 이미지는 absolute 배치라 중간에 빈 줄이 있어도 그 위를 지나가면 된다.
 */
export function measure(triangle: Triangle, depths: LineDepth[]): TriangleMetrics | null {
  let maxWidth = -1;

  for (const d of depths) {
    if (d.line < triangle.startLine || d.line > triangle.endLine) continue;
    if (d.isBlank || d.usesTab) continue;
    if (d.charCount > maxWidth) {
      maxWidth = d.charCount;
    }
  }

  if (maxWidth < 0) {
    return null;
  }

  return {
    anchorLine: triangle.peakLine,
    maxWidth,
    lineCount: triangle.endLine - triangle.startLine + 1,
  };
}

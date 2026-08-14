import type { Design, Placement, TriangleMetrics } from '../types';

/**
 * 여백에 들어가는 가장 높은 티어를 고른다.
 * designs는 tier 내림차순이어야 한다(ALL_DESIGNS가 그렇다).
 *
 * 폭과 줄 수를 모두 만족해야 한다. 폭만 넓고 세로가 짧으면 이미지가 삼각형을
 * 세로로 넘쳐 코드 위를 덮는다.
 */
export function selectDesign(
  metrics: TriangleMetrics,
  designs: Design[]
): Placement | null {
  for (const design of designs) {
    if (metrics.maxWidth >= design.minWidth && metrics.lineCount >= design.minLines) {
      return { design, line: metrics.anchorLine };
    }
  }
  return null;
}

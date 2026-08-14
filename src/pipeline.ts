import type { AdogenConfig } from './config';
import { ALL_DESIGNS } from './designs';
import { selectDesign } from './render/designSelector';
import { measure } from './render/triangleMetrics';
import { scanLines } from './scan/depthScanner';
import { findTriangles } from './scan/triangleFinder';
import type { Placement } from './types';

/**
 * 줄 텍스트 배열 → 그릴 이미지 배치 목록.
 *
 * vscode 타입이 전혀 등장하지 않으므로 픽스처 문자열만으로 전체 흐름을 검증할 수 있다.
 */
export function computePlacements(
  texts: string[],
  startLine: number,
  tabSize: number,
  config: AdogenConfig
): Placement[] {
  const depths = scanLines(texts, startLine, tabSize);
  const triangles = findTriangles(depths, {
    minDepth: config.minDepth,
    minLines: config.minLines,
    tabSize,
  });

  const placements: Placement[] = [];
  for (const triangle of triangles) {
    const metrics = measure(triangle, depths);
    if (metrics === null) continue;

    const placement = selectDesign(metrics, ALL_DESIGNS);
    if (placement === null) continue;

    placements.push(placement);
  }

  // triangles가 이미 peakVisualCols 내림차순이므로 앞에서 자르면 깊은 것이 남는다.
  return config.maxConcurrent > 0 ? placements.slice(0, config.maxConcurrent) : placements;
}

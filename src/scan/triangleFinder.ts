import type { FinderOptions, LineDepth, Triangle } from '../types';

/** 빈 줄 몇 개가 연속되면 확장을 끊을지 */
const BLANK_RUN_LIMIT = 2;

/**
 * peak 기준 확장으로 삼각형을 찾는다.
 *
 * 완벽한 단조 증감을 요구하면 같은 depth의 문장이 여러 줄 이어지는 정상 코드에서
 * 거의 아무것도 잡히지 않는다. 그래서 "가장 깊은 줄에서 위아래로, depth가 늘지
 * 않는 동안 계속 확장"하는 방식을 쓴다.
 */
export function findTriangles(depths: LineDepth[], opts: FinderOptions): Triangle[] {
  const byLine = new Map<number, LineDepth>();
  for (const d of depths) {
    byLine.set(d.line, d);
  }

  const candidates = collectPeaks(depths);
  const found: Triangle[] = [];

  for (const peak of candidates) {
    const startLine = expand(byLine, peak, -1);
    const endLine = expand(byLine, peak, +1);

    const lineCount = endLine - startLine + 1;
    const minVisualCols = opts.minDepth * opts.tabSize;

    if (peak.visualCols < minVisualCols) continue;
    if (lineCount < opts.minLines) continue;

    found.push({
      startLine,
      peakLine: peak.line,
      endLine,
      peakVisualCols: peak.visualCols,
    });
  }

  return dedupeOverlaps(found);
}

/**
 * peak 후보 = 직전 non-blank 줄보다 깊은 줄.
 * 플래토(같은 depth 연속)에서는 첫 줄만 후보가 된다.
 */
function collectPeaks(depths: LineDepth[]): LineDepth[] {
  const peaks: LineDepth[] = [];
  let prev: LineDepth | undefined;

  for (const d of depths) {
    if (d.isBlank) continue;
    if (prev === undefined || d.visualCols > prev.visualCols) {
      peaks.push(d);
    }
    prev = d;
  }

  return peaks;
}

/**
 * peak에서 한 방향으로 확장한다.
 * depth가 늘지 않는 동안(감소하거나 같으면) 계속 나아가고, 늘어나면 멈춘다.
 * 반환값은 포함된 마지막 non-blank 줄 번호다 — 경계의 빈 줄은 삼각형에 넣지 않는다.
 */
function expand(byLine: Map<number, LineDepth>, peak: LineDepth, step: -1 | 1): number {
  let lastIncluded = peak.line;
  let reference = peak.visualCols;
  let blankRun = 0;

  for (let line = peak.line + step; ; line += step) {
    const d = byLine.get(line);
    if (d === undefined) break;

    if (d.isBlank) {
      blankRun += 1;
      if (blankRun >= BLANK_RUN_LIMIT) break;
      continue;
    }

    blankRun = 0;
    if (d.visualCols > reference) break;

    reference = d.visualCols;
    lastIncluded = line;
  }

  return lastIncluded;
}

/**
 * 구간이 겹치는 삼각형 중 줄 수가 많은 쪽을 남긴다.
 * 줄 수가 같으면 더 깊은 쪽.
 */
function dedupeOverlaps(triangles: Triangle[]): Triangle[] {
  const sorted = [...triangles].sort((a, b) => {
    const aLines = a.endLine - a.startLine;
    const bLines = b.endLine - b.startLine;
    if (aLines !== bLines) return bLines - aLines;
    return b.peakVisualCols - a.peakVisualCols;
  });

  const kept: Triangle[] = [];
  for (const t of sorted) {
    const overlaps = kept.some((k) => t.startLine <= k.endLine && k.startLine <= t.endLine);
    if (!overlaps) kept.push(t);
  }

  return kept.sort((a, b) => b.peakVisualCols - a.peakVisualCols);
}

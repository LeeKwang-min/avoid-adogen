import * as assert from 'assert';
import { measure } from '../src/render/triangleMetrics';
import type { LineDepth, Triangle } from '../src/types';

function depth(line: number, charCount: number, extra: Partial<LineDepth> = {}): LineDepth {
  return {
    line,
    visualCols: charCount,
    charCount,
    usesTab: false,
    isBlank: false,
    ...extra,
  };
}

const triangle: Triangle = {
  startLine: 0,
  peakLine: 3,
  endLine: 6,
  peakVisualCols: 6,
};

const depths = [
  depth(0, 0),
  depth(1, 2),
  depth(2, 4),
  depth(3, 6),
  depth(4, 4),
  depth(5, 2),
  depth(6, 0),
];

describe('measure', () => {
  it('가장 넓은 여백을 maxWidth로 쓴다', () => {
    const m = measure(triangle, depths)!;
    assert.strictEqual(m.maxWidth, 6);
  });

  it('lineCount는 삼각형 전체 줄 수다', () => {
    const m = measure(triangle, depths)!;
    assert.strictEqual(m.lineCount, 7);
  });

  it('anchorLine은 peakLine이다', () => {
    const m = measure(triangle, depths)!;
    assert.strictEqual(m.anchorLine, 3);
  });

  it('빈 줄은 maxWidth 계산에서 제외한다', () => {
    // 빈 줄이 charCount 99를 갖고 있어도 무시해야 한다
    const withBlank = [...depths, depth(4, 99, { isBlank: true })];
    const m = measure(triangle, withBlank)!;
    assert.strictEqual(m.maxWidth, 6);
  });

  it('탭을 쓴 줄은 maxWidth 계산에서 제외한다', () => {
    const withTab = [...depths, depth(5, 99, { usesTab: true })];
    const m = measure(triangle, withTab)!;
    assert.strictEqual(m.maxWidth, 6);
  });

  it('삼각형 범위 밖의 줄은 무시한다', () => {
    const withOutside = [depth(-1, 99), ...depths, depth(7, 99)];
    const m = measure(triangle, withOutside)!;
    assert.strictEqual(m.maxWidth, 6);
  });

  it('lineCount는 제외된 줄까지 세어 삼각형의 세로 크기를 반영한다', () => {
    // 빈 줄이 중간에 있어도 이미지가 걸칠 세로 공간은 그대로다
    const withHole = [
      depth(0, 0),
      depth(1, 2),
      depth(2, 0, { isBlank: true }),
      depth(3, 6),
      depth(4, 4),
      depth(5, 2),
      depth(6, 0),
    ];
    const m = measure(triangle, withHole)!;
    assert.strictEqual(m.lineCount, 7);
    assert.strictEqual(m.maxWidth, 6);
  });

  it('칠할 줄이 하나도 없으면 null', () => {
    const allExcluded = [
      depth(0, 0, { isBlank: true }),
      depth(1, 2, { usesTab: true }),
      depth(2, 4, { isBlank: true }),
      depth(3, 6, { usesTab: true }),
      depth(4, 4, { isBlank: true }),
      depth(5, 2, { usesTab: true }),
      depth(6, 0, { isBlank: true }),
    ];
    assert.strictEqual(measure(triangle, allExcluded), null);
  });
});

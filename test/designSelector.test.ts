import * as assert from 'assert';
import { selectDesign } from '../src/render/designSelector';
import type { Design, TriangleMetrics } from '../src/types';

function design(tier: number, minWidth: number, minLines: number): Design {
  return {
    tier,
    name: `t${tier}`,
    svg: '<svg/>',
    widthCh: minWidth,
    heightEm: minLines,
    minWidth,
    minLines,
  };
}

const BIG = design(3, 20, 8);
const MID = design(2, 14, 5);
const SMALL = design(1, 8, 3);
const DESIGNS = [BIG, MID, SMALL];

function metrics(maxWidth: number, lineCount: number, anchorLine = 42): TriangleMetrics {
  return { anchorLine, maxWidth, lineCount };
}

describe('selectDesign', () => {
  it('조건을 만족하는 가장 높은 티어를 고른다', () => {
    const p = selectDesign(metrics(30, 12), DESIGNS)!;
    assert.strictEqual(p.design.tier, 3);
  });

  it('폭이 모자라면 낮은 티어로 내려간다', () => {
    const p = selectDesign(metrics(15, 12), DESIGNS)!;
    assert.strictEqual(p.design.tier, 2);
  });

  it('줄 수가 모자라면 낮은 티어로 내려간다', () => {
    const p = selectDesign(metrics(30, 6), DESIGNS)!;
    assert.strictEqual(p.design.tier, 2);
  });

  it('폭과 줄 수 둘 중 하나만 모자라도 내려간다', () => {
    const p = selectDesign(metrics(30, 4), DESIGNS)!;
    assert.strictEqual(p.design.tier, 1);
  });

  it('경계값은 통과시킨다', () => {
    const p = selectDesign(metrics(20, 8), DESIGNS)!;
    assert.strictEqual(p.design.tier, 3);
  });

  it('하나도 안 들어가면 null', () => {
    assert.strictEqual(selectDesign(metrics(7, 2), DESIGNS), null);
  });

  it('anchorLine을 배치 줄로 옮긴다', () => {
    const p = selectDesign(metrics(30, 12, 77), DESIGNS)!;
    assert.strictEqual(p.line, 77);
  });
});

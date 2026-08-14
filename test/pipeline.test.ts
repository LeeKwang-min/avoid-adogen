import * as assert from 'assert';
import type { AdogenConfig } from '../src/config';
import { computePlacements } from '../src/pipeline';

const BASE: AdogenConfig = {
  enabled: true,
  minDepth: 4,
  minLines: 5,
  maxConcurrent: 0,
  languages: [],
};

/**
 * depth까지 올라갔다 내려오는 계단 코드를 만든다.
 * 가장 깊은 줄의 들여쓰기는 depth * indentSize 칸이다.
 */
function staircase(depth: number, indentSize = 2): string[] {
  const lines: string[] = [];
  for (let d = 0; d <= depth; d++) {
    lines.push(' '.repeat(d * indentSize) + `open${d}`);
  }
  for (let d = depth - 1; d >= 0; d--) {
    lines.push(' '.repeat(d * indentSize) + `close${d}`);
  }
  return lines;
}

function run(texts: string[], config: Partial<AdogenConfig> = {}, tabSize = 2) {
  return computePlacements(texts, 0, tabSize, { ...BASE, ...config });
}

describe('computePlacements', () => {
  it('depth 4는 tier1(구슬)이 된다', () => {
    // 여백 8칸 → orb(minWidth 8)만 들어간다
    const placements = run(staircase(4));
    assert.strictEqual(placements.length, 1);
    assert.strictEqual(placements[0].design.name, 'orb');
  });

  it('depth 8은 tier2(클래식)가 된다', () => {
    // 여백 16칸 → classic(minWidth 14)까지, flare(20)는 못 들어간다
    const placements = run(staircase(8));
    assert.strictEqual(placements.length, 1);
    assert.strictEqual(placements[0].design.name, 'classic');
  });

  it('depth 12는 tier3(플레어)가 된다', () => {
    // 여백 24칸 → flare(minWidth 20)가 들어간다
    const placements = run(staircase(12));
    assert.strictEqual(placements.length, 1);
    assert.strictEqual(placements[0].design.name, 'flare');
  });

  it('minDepth에 못 미치면 아무것도 안 나온다', () => {
    assert.strictEqual(run(staircase(3)).length, 0);
  });

  it('배치 줄은 가장 깊은 줄이다', () => {
    const placements = run(staircase(8));
    // staircase(8)은 0~8이 여는 계단이므로 peak가 line 8
    assert.strictEqual(placements[0].line, 8);
  });

  it('떨어진 삼각형 두 개를 모두 잡는다', () => {
    const texts = [...staircase(8), '', '', ...staircase(8)];
    assert.strictEqual(run(texts).length, 2);
  });

  it('maxConcurrent로 개수를 제한한다', () => {
    const texts = [...staircase(8), '', '', ...staircase(8)];
    assert.strictEqual(run(texts, { maxConcurrent: 1 }).length, 1);
  });

  it('maxConcurrent가 0이면 제한하지 않는다', () => {
    const texts = [...staircase(8), '', '', ...staircase(8)];
    assert.strictEqual(run(texts, { maxConcurrent: 0 }).length, 2);
  });

  it('maxConcurrent가 걸리면 깊은 쪽을 남긴다', () => {
    const texts = [...staircase(5), '', '', ...staircase(12)];
    const placements = run(texts, { maxConcurrent: 1 });
    assert.strictEqual(placements.length, 1);
    assert.strictEqual(placements[0].design.name, 'flare');
  });

  it('tabSize 4에서는 더 얕은 depth로도 티어가 올라간다', () => {
    // depth 4 × tabSize 4 = 16칸 → classic
    const placements = run(staircase(4, 4), {}, 4);
    assert.strictEqual(placements[0].design.name, 'classic');
  });

  it('탭으로 들여쓴 코드는 여백 폭을 잴 수 없어 제외된다', () => {
    const texts = staircase(8).map((line) => {
      const indent = line.length - line.trimStart().length;
      return '\t'.repeat(indent / 2) + line.trimStart();
    });
    assert.strictEqual(run(texts).length, 0);
  });

  it('startLine 오프셋을 배치 줄에 반영한다', () => {
    const placements = computePlacements(staircase(8), 100, 2, BASE);
    assert.strictEqual(placements[0].line, 108);
  });
});

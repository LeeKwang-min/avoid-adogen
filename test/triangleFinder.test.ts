import * as assert from 'assert';
import { scanLines } from '../src/scan/depthScanner';
import { findTriangles } from '../src/scan/triangleFinder';
import type { FinderOptions } from '../src/types';

const OPTS: FinderOptions = { minDepth: 3, minLines: 5, tabSize: 2 };

/** 템플릿 리터럴을 줄 배열로. 앞뒤 빈 줄을 떼어낸다. */
function lines(src: string): string[] {
  const arr = src.split('\n');
  while (arr.length && arr[0].trim() === '') arr.shift();
  while (arr.length && arr[arr.length - 1].trim() === '') arr.pop();
  return arr;
}

function find(src: string, opts: FinderOptions = OPTS) {
  return findTriangles(scanLines(lines(src), 0, opts.tabSize), opts);
}

describe('findTriangles', () => {
  it('증가 → peak → 감소를 하나의 삼각형으로 잡는다', () => {
    const ts = find(`
a
  b
    c
      d
    e
  f
g
`);
    assert.strictEqual(ts.length, 1);
    assert.strictEqual(ts[0].startLine, 0);
    assert.strictEqual(ts[0].peakLine, 3);
    assert.strictEqual(ts[0].endLine, 6);
    assert.strictEqual(ts[0].peakVisualCols, 6);
  });

  it('같은 depth가 이어지는 플래토를 허용한다', () => {
    const ts = find(`
a
  b
    c
      d
      d2
      d3
    e
  f
`);
    assert.strictEqual(ts.length, 1);
    // 플래토 첫 줄만 peak 후보가 된다
    assert.strictEqual(ts[0].peakLine, 3);
    assert.strictEqual(ts[0].startLine, 0);
    assert.strictEqual(ts[0].endLine, 7);
  });

  it('minDepth에 못 미치면 버린다', () => {
    const ts = find(`
a
  b
    c
  d
a
`);
    assert.strictEqual(ts.length, 0);
  });

  it('minLines에 못 미치면 버린다', () => {
    const ts = find(`
a
  b
    c
      d
`);
    assert.strictEqual(ts.length, 0);
  });

  it('빈 줄 1개는 확장을 끊지 않는다', () => {
    // 줄 번호: 0:a 1:b 2:c 3:d 4:(빈) 5:e 6:f
    const ts = find(`
a
  b
    c
      d

    e
  f
`);
    assert.strictEqual(ts.length, 1);
    assert.strictEqual(ts[0].startLine, 0);
    assert.strictEqual(ts[0].endLine, 6);
  });

  it('빈 줄 2개 연속이면 거기서 끊는다', () => {
    const ts = find(`
a
  b
    c
      d
      d2


    e
  f
`);
    assert.strictEqual(ts.length, 1);
    // 빈 줄 2개 앞의 마지막 non-blank 줄에서 끝난다
    assert.strictEqual(ts[0].endLine, 4);
  });

  it('확장이 멈출 때 경계의 빈 줄을 삼각형에 넣지 않는다', () => {
    // 줄 번호: 0:a 1:b 2:c 3:d 4:e 5:(빈) 6:deep
    // line6이 더 깊어서 확장이 멈추는데, 그 앞의 빈 줄(5)까지 먹지 않고
    // 마지막 non-blank인 line4에서 끝나야 한다.
    const ts = find(`
a
  b
    c
      d
    e

          deep
`);
    assert.strictEqual(ts.length, 1);
    assert.strictEqual(ts[0].endLine, 4);
  });

  it('겹치는 삼각형은 줄 수가 많은 쪽만 남긴다', () => {
    // 두 개의 봉우리가 한 구간에서 겹친다
    const ts = find(`
a
  b
    c
      d
        e
      f
    g
      h
    i
  j
`);
    assert.strictEqual(ts.length, 1);
    assert.strictEqual(ts[0].peakVisualCols, 8);
  });

  it('떨어져 있는 삼각형 두 개는 둘 다 남긴다', () => {
    const ts = find(`
a
  b
    c
      d
    e
  f
a


a
  b
    c
      d
    e
  f
`);
    assert.strictEqual(ts.length, 2);
  });

  it('peakVisualCols 내림차순으로 반환한다', () => {
    const ts = find(`
a
  b
    c
      d
    e
  f
a


a
  b
    c
      d
        e
          f
        g
      h
    i
  j
`);
    assert.strictEqual(ts.length, 2);
    assert.ok(ts[0].peakVisualCols > ts[1].peakVisualCols);
  });
});

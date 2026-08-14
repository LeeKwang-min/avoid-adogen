import * as assert from 'assert';
import { scanLine, scanLines } from '../src/scan/depthScanner';

describe('scanLine', () => {
  it('들여쓰기 없는 줄', () => {
    const d = scanLine('foo', 0, 4);
    assert.strictEqual(d.line, 0);
    assert.strictEqual(d.visualCols, 0);
    assert.strictEqual(d.charCount, 0);
    assert.strictEqual(d.usesTab, false);
    assert.strictEqual(d.isBlank, false);
  });

  it('공백 2칸', () => {
    const d = scanLine('  foo', 3, 4);
    assert.strictEqual(d.line, 3);
    assert.strictEqual(d.visualCols, 2);
    assert.strictEqual(d.charCount, 2);
    assert.strictEqual(d.usesTab, false);
  });

  it('탭 1개는 tabSize만큼의 시각적 열을 차지하지만 문자는 1개다', () => {
    const d = scanLine('\tfoo', 0, 4);
    assert.strictEqual(d.visualCols, 4);
    assert.strictEqual(d.charCount, 1);
    assert.strictEqual(d.usesTab, true);
  });

  it('탭은 다음 탭스톱까지만 채운다', () => {
    // 공백 2칸 뒤의 탭은 4열까지만 채우므로 총 4열, 문자는 3개
    const d = scanLine('  \tfoo', 0, 4);
    assert.strictEqual(d.visualCols, 4);
    assert.strictEqual(d.charCount, 3);
    assert.strictEqual(d.usesTab, true);
  });

  it('탭스톱을 정확히 채운 뒤의 탭은 tabSize를 통째로 더한다', () => {
    const d = scanLine('    \tfoo', 0, 4);
    assert.strictEqual(d.visualCols, 8);
    assert.strictEqual(d.charCount, 5);
  });

  it('빈 줄', () => {
    const d = scanLine('', 7, 4);
    assert.strictEqual(d.isBlank, true);
    assert.strictEqual(d.visualCols, 0);
    assert.strictEqual(d.charCount, 0);
  });

  it('공백만 있는 줄도 isBlank다', () => {
    const d = scanLine('    ', 7, 4);
    assert.strictEqual(d.isBlank, true);
    assert.strictEqual(d.charCount, 4);
  });
});

describe('scanLines', () => {
  it('startLine부터 줄 번호를 매긴다', () => {
    const ds = scanLines(['a', '  b', '    c'], 10, 2);
    assert.deepStrictEqual(
      ds.map((d) => [d.line, d.visualCols]),
      [
        [10, 0],
        [11, 2],
        [12, 4],
      ]
    );
  });
});

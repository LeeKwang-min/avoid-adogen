import * as assert from 'assert';
import { isLanguageEnabled, readConfig } from '../src/config';

/** vscode.WorkspaceConfiguration을 흉내내는 최소 스텁 */
function source(values: Record<string, unknown>) {
  return {
    get<T>(key: string, fallback: T): T {
      return (key in values ? values[key] : fallback) as T;
    },
  };
}

describe('readConfig', () => {
  it('설정이 비면 기본값을 쓴다', () => {
    const c = readConfig(source({}));
    assert.strictEqual(c.enabled, true);
    assert.strictEqual(c.minDepth, 4);
    assert.strictEqual(c.minLines, 5);
    assert.strictEqual(c.maxConcurrent, 0);
    assert.deepStrictEqual(c.languages, []);
  });

  it('설정값을 읽는다', () => {
    const c = readConfig(source({ minDepth: 7, maxConcurrent: 2 }));
    assert.strictEqual(c.minDepth, 7);
    assert.strictEqual(c.maxConcurrent, 2);
  });

  it('enabled를 false로 끌 수 있다', () => {
    assert.strictEqual(readConfig(source({ enabled: false })).enabled, false);
  });

  it('minDepth는 1 아래로 내려가지 않는다', () => {
    assert.strictEqual(readConfig(source({ minDepth: 0 })).minDepth, 1);
    assert.strictEqual(readConfig(source({ minDepth: -5 })).minDepth, 1);
  });

  it('minLines는 1 아래로 내려가지 않는다', () => {
    assert.strictEqual(readConfig(source({ minLines: 0 })).minLines, 1);
  });

  it('maxConcurrent는 음수를 0으로 만든다', () => {
    assert.strictEqual(readConfig(source({ maxConcurrent: -3 })).maxConcurrent, 0);
  });

  it('숫자가 아닌 값은 기본값으로 떨어진다', () => {
    assert.strictEqual(readConfig(source({ minDepth: 'seven' })).minDepth, 4);
  });

  it('소수는 내림한다', () => {
    assert.strictEqual(readConfig(source({ minDepth: 6.7 })).minDepth, 6);
  });

  it('languages가 배열이 아니면 빈 배열', () => {
    assert.deepStrictEqual(readConfig(source({ languages: 'typescript' })).languages, []);
  });

  it('languages에서 문자열이 아닌 원소를 걸러낸다', () => {
    assert.deepStrictEqual(
      readConfig(source({ languages: ['dart', 42, 'typescript', null] })).languages,
      ['dart', 'typescript']
    );
  });
});

describe('isLanguageEnabled', () => {
  it('빈 배열이면 전부 허용', () => {
    assert.strictEqual(isLanguageEnabled('dart', []), true);
  });

  it('목록에 있으면 허용', () => {
    assert.strictEqual(isLanguageEnabled('dart', ['dart', 'typescript']), true);
  });

  it('목록에 없으면 거부', () => {
    assert.strictEqual(isLanguageEnabled('json', ['dart', 'typescript']), false);
  });
});

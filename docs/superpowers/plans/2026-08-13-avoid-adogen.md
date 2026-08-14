# avoid-adogen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 코드 depth가 깊어져 생긴 왼쪽 삼각형 여백에 파동권 도트 아트를 그려, 리팩터링 시점을 시각적으로 알려주는 VS Code 익스텐션을 만든다.

**Architecture:** 들여쓰기 공백 문자 구간에 `Range`를 걸고 `backgroundColor`를 칠해 여백을 픽셀 그리드로 쓴다. 핵심 로직(스캔·삼각형 판정·캔버스 추출·티어 선택)은 vscode API를 import하지 않는 순수 함수로 두어 VS Code 없이 단위 테스트한다. vscode 의존은 `decorationPainter`와 `extension` 두 파일에만 있다.

**Tech Stack:** TypeScript(strict, CommonJS), esbuild, mocha + ts-node, `@vscode/vsce`

## Global Constraints

- Node 20 이상. `engines.vscode`는 `^1.85.0`.
- TypeScript `strict: true`. `module: commonjs`(VS Code 익스텐션은 CJS만 로드한다).
- `src/scan/**`, `src/render/canvasFitter.ts`, `src/render/tierSelector.ts`, `src/render/palette.ts`, `src/sprites/**`, `src/types.ts`는 **`vscode`를 import하지 않는다.** 이 제약이 깨지면 단위 테스트가 전부 실행 불가가 된다.
- **git 저장소를 만들지 않는다.** Task 11까지 `git init`을 실행하지 않으며, 커밋은 Task 11에서 단 한 번 한다. (사용자 지시: 최종 결과물을 보고 한 번에 올린다)
- 아트는 전부 자체 창작. 원본 스트리트 파이터 스프라이트를 참조·트레이싱·다운로드하지 않는다.
- 팔레트 기본값은 아래 5개를 그대로 쓴다:
  1. `rgba(90, 170, 255, 0.25)` — 외곽 글로우
  2. `rgba(120, 200, 255, 0.45)` — 중간
  3. `rgba(40, 45, 60, 0.65)` — 실루엣
  4. `rgba(200, 235, 255, 0.75)` — 코어
  5. `rgba(255, 255, 255, 0.9)` — 하이라이트
- 스프라이트 `grid` 문자는 `.`(투명)과 `1`~`5`(팔레트 인덱스)만 허용한다.
- 설정 키 접두사는 `avoidAdogen.`이다.

---

### Task 1: 프로젝트 스캐폴딩

빈 폴더에서 F5로 로드되는 최소 익스텐션을 만든다. 이후 모든 태스크가 이 위에 올라간다.

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.js`
- Create: `.mocharc.json`
- Create: `.gitignore`
- Create: `.vscode/launch.json`
- Create: `.vscodeignore`
- Create: `src/extension.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `activate(context: vscode.ExtensionContext): void`, `deactivate(): void` — Task 10이 이 파일을 전면 교체한다.

- [ ] **Step 1: `package.json` 작성**

```json
{
  "name": "avoid-adogen",
  "displayName": "Avoid Adogen",
  "description": "코드가 너무 깊어지면 여백에 파동권이 나타납니다",
  "version": "0.0.1",
  "private": true,
  "engines": {
    "vscode": "^1.85.0",
    "node": ">=20"
  },
  "categories": ["Other"],
  "main": "./dist/extension.js",
  "activationEvents": ["onStartupFinished"],
  "contributes": {},
  "scripts": {
    "compile": "node esbuild.js",
    "watch": "node esbuild.js --watch",
    "test": "mocha",
    "package": "npm run compile && vsce package"
  },
  "devDependencies": {
    "@types/mocha": "^10.0.6",
    "@types/node": "^20.11.0",
    "@types/vscode": "^1.85.0",
    "@vscode/vsce": "^2.24.0",
    "esbuild": "^0.20.0",
    "mocha": "^10.3.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: `tsconfig.json` 작성**

`test`를 include에 넣어야 ts-node가 테스트 파일의 타입을 해석한다.

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "out",
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUnusedLocals": true,
    "noImplicitReturns": true
  },
  "include": ["src/**/*.ts", "test/**/*.ts"],
  "exclude": ["node_modules", "dist", "out"]
}
```

- [ ] **Step 3: `esbuild.js` 작성**

`vscode`는 런타임이 주입하므로 반드시 external이다. 번들에 넣으면 로드가 실패한다.

```js
const esbuild = require('esbuild');

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  logLevel: 'info',
};

async function main() {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
  } else {
    await esbuild.build(options);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: `.mocharc.json` 작성**

```json
{
  "require": ["ts-node/register"],
  "spec": ["test/**/*.test.ts"],
  "timeout": 5000
}
```

- [ ] **Step 5: `.gitignore`와 `.vscodeignore` 작성**

`.gitignore`:

```
node_modules/
dist/
out/
*.vsix
```

`.vscodeignore`:

```
.vscode/**
src/**
test/**
docs/**
node_modules/**
esbuild.js
tsconfig.json
.mocharc.json
**/*.map
```

- [ ] **Step 6: `.vscode/launch.json` 작성**

F5로 익스텐션 개발 호스트를 띄우기 위한 설정이다.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

`preLaunchTask`를 넣지 않는다. `tasks.json`을 만들지 않으므로 `${defaultBuildTask}`를 참조하면 F5가 "빌드 태스크를 찾을 수 없다"로 실패한다. 대신 F5 전에 `npm run compile`을 직접 실행한다(이 계획의 모든 수동 검증 스텝이 그렇게 지시한다).

- [ ] **Step 7: 최소 `src/extension.ts` 작성**

```ts
import * as vscode from 'vscode';

let output: vscode.OutputChannel;

export function activate(_context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel('Avoid Adogen');
  output.appendLine('avoid-adogen activated');
}

export function deactivate(): void {
  output?.dispose();
}
```

- [ ] **Step 8: 의존성 설치**

Run: `npm install`
Expected: 에러 없이 완료. `node_modules/`가 생긴다.

- [ ] **Step 9: 빌드 확인**

Run: `npm run compile`
Expected: `dist/extension.js`가 생성된다.

- [ ] **Step 10: F5 로드 확인 (수동)**

VS Code에서 이 폴더를 열고 F5를 누른다. 새 창(Extension Development Host)이 열리면 명령 팔레트에서 `Output: Focus on Output View`를 실행하고 드롭다운에서 `Avoid Adogen`을 고른다.
Expected: `avoid-adogen activated` 한 줄이 보인다.

이게 안 되면 이후 모든 태스크의 수동 검증이 불가능하므로 여기서 반드시 해결한다.

---

### Task 2: 스파이크 — 여백 셀 페인팅이 실제로 되는가

설계 전체가 "들여쓰기 공백에 `backgroundColor`를 칠하면 코드가 밀리지 않는다"는 가정 위에 서 있다. 이 태스크는 그 가정을 눈으로 확인한다.

**이 태스크의 코드는 버린다.** Task 9에서 제대로 만들 때 삭제한다. 목적은 검증 결과를 문서에 남기는 것이다.

**Files:**
- Create: `src/spike.ts` (Task 9에서 삭제)
- Modify: `src/extension.ts` (Task 10에서 전면 교체)
- Create: `docs/superpowers/specs/2026-08-13-spike-results.md`
- Create: `fixtures/deep.ts`

**Interfaces:**
- Consumes: Task 1의 `activate`
- Produces: 없음(버리는 코드). 검증 결과 문서만 남는다.

- [ ] **Step 1: 테스트용 깊은 코드 픽스처 작성**

`fixtures/deep.ts` — 공백 2칸 들여쓰기, depth 9까지 내려간 뒤 올라온다. Task 11의 통합 확인에서도 재사용한다.

```ts
export function handleSubmit(): void {
  validate(data, () => {
    api.post(url, body, () => {
      store.update(res, () => {
        ui.refresh(state, () => {
          notify.send(msg, () => {
            track.event(name, () => {
              logger.info('done', () => {
                finish();
              });
            });
          });
        });
      });
    });
  });
}
```

- [ ] **Step 2: 스파이크 코드 작성**

활성 에디터의 6~12번째 줄 들여쓰기 공백에 색 4종을 하드코딩으로 칠한다.

```ts
import * as vscode from 'vscode';

const COLORS = [
  'rgba(90, 170, 255, 0.25)',
  'rgba(120, 200, 255, 0.45)',
  'rgba(200, 235, 255, 0.75)',
  'rgba(255, 255, 255, 0.9)',
];

export function runSpike(): vscode.Disposable[] {
  const types = COLORS.map((backgroundColor) =>
    vscode.window.createTextEditorDecorationType({ backgroundColor })
  );

  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return types;
  }

  // 6~12번째 줄(0-based 5~11)의 들여쓰기 공백을 색별로 칠한다.
  const buckets: vscode.Range[][] = types.map(() => []);
  for (let line = 5; line <= 11; line++) {
    if (line >= editor.document.lineCount) {
      break;
    }
    const text = editor.document.lineAt(line).text;
    const indent = text.length - text.trimStart().length;
    for (let col = 0; col < indent; col++) {
      const bucket = col % types.length;
      buckets[bucket].push(new vscode.Range(line, col, line, col + 1));
    }
  }

  types.forEach((type, i) => editor.setDecorations(type, buckets[i]));
  return types;
}
```

- [ ] **Step 3: `extension.ts`에서 스파이크 호출**

```ts
import * as vscode from 'vscode';
import { runSpike } from './spike';

let output: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel('Avoid Adogen');
  output.appendLine('avoid-adogen activated');

  context.subscriptions.push(
    vscode.commands.registerCommand('avoidAdogen.spike', () => {
      const disposables = runSpike();
      context.subscriptions.push(...disposables);
    })
  );
}

export function deactivate(): void {
  output?.dispose();
}
```

`package.json`의 `contributes`에 명령을 등록한다:

```json
"contributes": {
  "commands": [
    {
      "command": "avoidAdogen.spike",
      "title": "Avoid Adogen: Run Spike"
    }
  ]
}
```

- [ ] **Step 4: S1 검증 — 코드가 밀리지 않는가 (수동)**

Run: `npm run compile`, 그다음 F5. 개발 호스트에서 `fixtures/deep.ts`를 열고 명령 팔레트에서 `Avoid Adogen: Run Spike` 실행.

Expected: 들여쓰기 영역에 세로 줄무늬 색띠가 나타나고, **코드 텍스트의 가로 위치는 1픽셀도 변하지 않는다.**

**여기서 코드가 밀리면 설계의 전제가 깨진 것이다.** 계획 실행을 멈추고 사용자에게 보고한다. 대안(`before` + negative margin)은 별도 스파이크가 필요하다.

- [ ] **Step 5: S2 검증 — 들여쓰기 안내선과의 겹침 (수동)**

개발 호스트 설정에서 `editor.guides.indentation`을 `true`로 두고 스파이크를 다시 실행한다.

Expected: 색띠와 세로 안내선이 함께 보인다. 어느 쪽이 위에 그려지는지, 안내선이 그림을 관통해 보기 싫은 정도인지 기록한다.

- [ ] **Step 6: S3 검증 — 선택 영역·현재 줄 하이라이트와의 겹침 (수동)**

칠해진 줄에 커서를 두고(현재 줄 하이라이트), 그 줄의 들여쓰기를 드래그 선택한다.

Expected: 색띠가 완전히 가려지는지, 반투명하게 섞여 보이는지 기록한다.

- [ ] **Step 7: S4 검증 — 한 줄에 여러 색 (수동)**

Expected: 한 줄 안에서 4가지 색이 열마다 번갈아 보인다. 색이 섞이거나 하나만 이기는 현상이 없어야 한다.

- [ ] **Step 8: 검증 결과 기록**

`docs/superpowers/specs/2026-08-13-spike-results.md`에 S1~S4 각각의 결과를 적는다. 형식:

```markdown
# 스파이크 결과 (2026-08-13)

## S1 — 들여쓰기 공백 Range에 backgroundColor
결과: PASS / FAIL
관찰: (코드 밀림 여부, 색이 보이는 범위)

## S2 — 들여쓰기 안내선 겹침
결과: (어느 쪽이 위인지)
대응: (팔레트 알파를 올릴 필요가 있는가)

## S3 — 선택 영역·현재 줄 하이라이트 겹침
결과:
대응:

## S4 — 한 줄에 여러 색
결과: PASS / FAIL
관찰:
```

추측을 적지 않는다. 실제로 본 것만 적는다.

- [ ] **Step 9: 전체 테스트 실행**

Run: `npm run test`
Expected: `Error: No test files found: "test/**/*.test.ts"`로 **실패한다.** mocha는 테스트 파일이 0개일 때 0 passing이 아니라 에러로 종료한다. 이 시점에서는 정상이며 Task 3에서 첫 테스트 파일이 생기면 해결된다.

---

### Task 3: 타입 정의와 depthScanner

각 줄의 들여쓰기를 재는 순수 함수. `Range`가 문자 인덱스 기준이므로 시각적 열 수(`visualCols`)와 문자 수(`charCount`)를 반드시 분리해서 반환한다.

**Files:**
- Create: `src/types.ts`
- Create: `src/scan/depthScanner.ts`
- Create: `test/depthScanner.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `LineDepth`, `Triangle`, `Canvas`, `CanvasRow`, `Sprite`, `PaintCell`, `Placement`, `FinderOptions` 타입 (Task 4~10 전부가 사용)
  - `scanLine(text: string, line: number, tabSize: number): LineDepth`
  - `scanLines(texts: string[], startLine: number, tabSize: number): LineDepth[]`

- [ ] **Step 1: `src/types.ts` 작성**

계획 전체에서 쓰는 타입을 한곳에 모은다. 이 파일은 타입만 담고 로직이 없다.

```ts
export type LineDepth = {
  /** 0-based 문서 줄 번호 */
  line: number;
  /** tabSize 확장 후 시각적 들여쓰기 열 수. depth 판정에 쓴다. */
  visualCols: number;
  /** 선행 공백 문자 개수. Range 인덱스에 쓴다. */
  charCount: number;
  /** 선행 공백에 탭이 하나라도 있으면 true */
  usesTab: boolean;
  /** 빈 줄이거나 공백만 있는 줄 */
  isBlank: boolean;
};

export type Triangle = {
  startLine: number;
  peakLine: number;
  endLine: number;
  peakVisualCols: number;
};

export type CanvasRow = {
  line: number;
  /** 이 줄에서 사용 가능한 셀 수 = charCount */
  width: number;
};

export type Canvas = {
  /** 칠할 수 있는 줄만. 위에서 아래 순서. */
  rows: CanvasRow[];
  /** rows 배열에서 peak 줄의 인덱스 */
  peakRowIndex: number;
};

export type Sprite = {
  tier: number;
  /** 각 문자: '.' = 투명, '1'~'5' = 팔레트 인덱스 */
  grid: string[];
  width: number;
  height: number;
};

export type PaintCell = {
  line: number;
  /** 문자 인덱스 */
  col: number;
  /** 1~5 */
  paletteIndex: number;
};

export type Placement = {
  sprite: Sprite;
  /** 불투명 셀만 */
  cells: PaintCell[];
};

export type FinderOptions = {
  minDepth: number;
  minLines: number;
  tabSize: number;
};
```

- [ ] **Step 2: 실패하는 테스트 작성**

`test/depthScanner.test.ts`:

```ts
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
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Cannot find module '../src/scan/depthScanner'`

- [ ] **Step 4: 구현**

`src/scan/depthScanner.ts`:

```ts
import type { LineDepth } from '../types';

/**
 * 한 줄의 들여쓰기를 잰다.
 *
 * visualCols와 charCount를 분리하는 이유: depth 판정은 시각적 열 수로 해야 하고,
 * decoration의 Range는 문자 인덱스로 걸어야 한다. 탭이 섞이면 두 값이 달라진다.
 */
export function scanLine(text: string, line: number, tabSize: number): LineDepth {
  let visualCols = 0;
  let charCount = 0;
  let usesTab = false;

  for (const ch of text) {
    if (ch === ' ') {
      visualCols += 1;
      charCount += 1;
    } else if (ch === '\t') {
      usesTab = true;
      // 다음 탭스톱까지 채운다.
      visualCols += tabSize - (visualCols % tabSize);
      charCount += 1;
    } else {
      break;
    }
  }

  const isBlank = charCount === text.length;

  return { line, visualCols, charCount, usesTab, isBlank };
}

export function scanLines(texts: string[], startLine: number, tabSize: number): LineDepth[] {
  return texts.map((text, i) => scanLine(text, startLine + i, tabSize));
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 8 passing

---

### Task 4: triangleFinder

depth 배열에서 삼각형 구간을 찾는다. 완벽한 단조 증감을 요구하면 실제 코드에서 거의 안 잡히므로 peak 기준 확장 방식을 쓴다.

**Files:**
- Create: `src/scan/triangleFinder.ts`
- Create: `test/triangleFinder.test.ts`

**Interfaces:**
- Consumes: `LineDepth`, `Triangle`, `FinderOptions` (Task 3), `scanLines` (Task 3, 테스트에서만)
- Produces: `findTriangles(depths: LineDepth[], opts: FinderOptions): Triangle[]` — Task 10이 호출한다. 반환 배열은 `peakVisualCols` 내림차순이다.

- [ ] **Step 1: 실패하는 테스트 작성**

테스트 입력은 코드 문자열로 만든다. 좌표를 손으로 세는 것보다 읽기 쉽고, `scanLines`와의 결합도 함께 검증된다.

`test/triangleFinder.test.ts`:

```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Cannot find module '../src/scan/triangleFinder'`

- [ ] **Step 3: 구현**

`src/scan/triangleFinder.ts`:

```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — depthScanner 8개 + triangleFinder 10개

---

### Task 5: canvasFitter — 폐기

> 5차 스파이크에서 렌더링 방식이 SVG 이미지로 바뀌면서 무효가 됐다. 문서 끝의 **"설계 변경 (5차 스파이크 이후)"** 을 따른다. 아래 내용은 히스토리로만 남긴다.

삼각형에서 실제로 칠할 수 있는 줄만 골라 셀 그리드를 만든다. 빈 줄과 탭 줄을 제외하는 곳이 여기다.

**Files:**
- Create: `src/render/canvasFitter.ts`
- Create: `test/canvasFitter.test.ts`

**Interfaces:**
- Consumes: `Canvas`, `CanvasRow`, `LineDepth`, `Triangle` (Task 3)
- Produces: `fitCanvas(triangle: Triangle, depths: LineDepth[]): Canvas | null` — Task 10이 호출한다. 칠할 줄이 없으면 `null`.

- [ ] **Step 1: 실패하는 테스트 작성**

`test/canvasFitter.test.ts`:

```ts
import * as assert from 'assert';
import { fitCanvas } from '../src/render/canvasFitter';
import type { LineDepth, Triangle } from '../src/types';

function depth(
  line: number,
  charCount: number,
  extra: Partial<LineDepth> = {}
): LineDepth {
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

describe('fitCanvas', () => {
  it('줄별 사용 가능 폭을 charCount로 채운다', () => {
    const depths = [
      depth(0, 0),
      depth(1, 2),
      depth(2, 4),
      depth(3, 6),
      depth(4, 4),
      depth(5, 2),
      depth(6, 0),
    ];
    const canvas = fitCanvas(triangle, depths)!;
    assert.deepStrictEqual(
      canvas.rows.map((r) => [r.line, r.width]),
      [
        [0, 0],
        [1, 2],
        [2, 4],
        [3, 6],
        [4, 4],
        [5, 2],
        [6, 0],
      ]
    );
    assert.strictEqual(canvas.peakRowIndex, 3);
  });

  it('빈 줄을 제외한다', () => {
    const depths = [
      depth(0, 0),
      depth(1, 2),
      depth(2, 0, { isBlank: true }),
      depth(3, 6),
      depth(4, 4),
      depth(5, 2),
      depth(6, 0),
    ];
    const canvas = fitCanvas(triangle, depths)!;
    assert.deepStrictEqual(
      canvas.rows.map((r) => r.line),
      [0, 1, 3, 4, 5, 6]
    );
    // peak(3번 줄)은 rows에서 2번 인덱스로 밀렸다
    assert.strictEqual(canvas.peakRowIndex, 2);
  });

  it('탭을 쓴 줄을 제외한다', () => {
    const depths = [
      depth(0, 0),
      depth(1, 2, { usesTab: true }),
      depth(2, 4),
      depth(3, 6),
      depth(4, 4),
      depth(5, 2),
      depth(6, 0),
    ];
    const canvas = fitCanvas(triangle, depths)!;
    assert.deepStrictEqual(
      canvas.rows.map((r) => r.line),
      [0, 2, 3, 4, 5, 6]
    );
  });

  it('peak 줄이 제외되면 가장 가까운 줄을 peakRowIndex로 쓴다', () => {
    const depths = [
      depth(0, 0),
      depth(1, 2),
      depth(2, 4),
      depth(3, 6, { isBlank: true }),
      depth(4, 4),
      depth(5, 2),
      depth(6, 0),
    ];
    const canvas = fitCanvas(triangle, depths)!;
    assert.deepStrictEqual(
      canvas.rows.map((r) => r.line),
      [0, 1, 2, 4, 5, 6]
    );
    // 3번 줄이 없으므로 거리 1인 2번과 4번 중 위쪽(2번) = 인덱스 2
    assert.strictEqual(canvas.peakRowIndex, 2);
  });

  it('삼각형 범위 밖의 줄은 무시한다', () => {
    const depths = [
      depth(-1, 99),
      depth(0, 0),
      depth(1, 2),
      depth(2, 4),
      depth(3, 6),
      depth(4, 4),
      depth(5, 2),
      depth(6, 0),
      depth(7, 99),
    ];
    const canvas = fitCanvas(triangle, depths)!;
    assert.strictEqual(canvas.rows.length, 7);
    assert.strictEqual(canvas.rows[0].line, 0);
    assert.strictEqual(canvas.rows[6].line, 6);
  });

  it('칠할 줄이 하나도 없으면 null', () => {
    const depths = [
      depth(0, 0, { isBlank: true }),
      depth(1, 2, { isBlank: true }),
      depth(2, 4, { usesTab: true }),
      depth(3, 6, { isBlank: true }),
      depth(4, 4, { usesTab: true }),
      depth(5, 2, { isBlank: true }),
      depth(6, 0, { isBlank: true }),
    ];
    assert.strictEqual(fitCanvas(triangle, depths), null);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Cannot find module '../src/render/canvasFitter'`

- [ ] **Step 3: 구현**

`src/render/canvasFitter.ts`:

```ts
import type { Canvas, CanvasRow, LineDepth, Triangle } from '../types';

/**
 * 삼각형에서 셀 그리드를 뽑는다.
 *
 * 제외 대상:
 * - 빈 줄: 공백 문자가 0개라 Range를 걸 수 없다.
 * - 탭 줄: 탭 1문자가 tabSize 열을 차지해서 셀 단위 제어가 불가능하다.
 *
 * 제외된 줄은 스프라이트 행을 소비하지 않으므로 그림이 세로로 조금 벌어질 수 있다.
 * 끊기지는 않는다.
 */
export function fitCanvas(triangle: Triangle, depths: LineDepth[]): Canvas | null {
  const rows: CanvasRow[] = [];

  for (const d of depths) {
    if (d.line < triangle.startLine || d.line > triangle.endLine) continue;
    if (d.isBlank || d.usesTab) continue;
    rows.push({ line: d.line, width: d.charCount });
  }

  if (rows.length === 0) return null;

  return { rows, peakRowIndex: nearestRowIndex(rows, triangle.peakLine) };
}

/**
 * peakLine에 가장 가까운 row의 인덱스.
 * peak 줄 자체가 제외됐을 때(공백만 있는 줄이 가장 깊을 수 있다) 필요하다.
 * 거리가 같으면 위쪽을 택한다.
 */
function nearestRowIndex(rows: CanvasRow[], peakLine: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < rows.length; i++) {
    const distance = Math.abs(rows[i].line - peakLine);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }

  return best;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 24 passing

---

### Task 6: 스프라이트 데이터 — 폐기

> 도트 그리드는 SVG로 대체됐다. 문서 끝의 **"설계 변경 (5차 스파이크 이후)"** 을 따른다.

티어별 도트 아트. 셀이 세로로 2.5배 길기 때문에 가로 스케일 자동 보정을 하지 않는다 — 자동 보정은 저해상도 도트를 뭉갠다. 사람이 눈으로 보며 그린다.

**Files:**
- Create: `src/sprites/tier1.ts`
- Create: `src/sprites/tier2.ts`
- Create: `src/sprites/tier3.ts`
- Create: `src/sprites/index.ts`
- Create: `test/sprites.test.ts`

**Interfaces:**
- Consumes: `Sprite` (Task 3)
- Produces:
  - `makeSprite(tier: number, grid: string[]): Sprite`
  - `TIER1`, `TIER2`, `TIER3`: `Sprite`
  - `ALL_SPRITES: Sprite[]` — tier 내림차순. Task 7이 소비한다.

- [ ] **Step 1: 실패하는 테스트 작성**

데이터 무결성을 테스트로 못 박는다. 나중에 도트를 다듬을 때(Task 11) 오타로 팔레트 범위를 벗어나면 여기서 잡힌다.

`test/sprites.test.ts`:

```ts
import * as assert from 'assert';
import { ALL_SPRITES, makeSprite, TIER1, TIER2, TIER3 } from '../src/sprites';

describe('makeSprite', () => {
  it('grid에서 width와 height를 계산한다', () => {
    const s = makeSprite(9, ['12', '.1.', '1']);
    assert.strictEqual(s.tier, 9);
    assert.strictEqual(s.height, 3);
    assert.strictEqual(s.width, 3);
  });
});

describe('스프라이트 데이터', () => {
  const sprites = [TIER1, TIER2, TIER3];

  it('grid 문자는 . 과 1~5 뿐이다', () => {
    for (const s of sprites) {
      for (const row of s.grid) {
        assert.ok(
          /^[.1-5]*$/.test(row),
          `tier${s.tier}에 허용되지 않은 문자: ${JSON.stringify(row)}`
        );
      }
    }
  });

  it('불투명 셀이 하나 이상 있다', () => {
    for (const s of sprites) {
      const opaque = s.grid.join('').replace(/\./g, '').length;
      assert.ok(opaque > 0, `tier${s.tier}가 전부 투명하다`);
    }
  });

  it('티어가 높을수록 크다', () => {
    assert.ok(TIER2.width > TIER1.width);
    assert.ok(TIER3.width > TIER2.width);
    assert.ok(TIER2.height >= TIER1.height);
    assert.ok(TIER3.height >= TIER2.height);
  });

  it('ALL_SPRITES는 tier 내림차순이다', () => {
    assert.deepStrictEqual(
      ALL_SPRITES.map((s) => s.tier),
      [3, 2, 1]
    );
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Cannot find module '../src/sprites'`

- [ ] **Step 3: `makeSprite` 헬퍼 작성**

티어 데이터 파일들이 이 함수를 import하므로 먼저 만든다. 순환 import를 피하려고 `index.ts`가 아닌 별도 파일에 둔다.

`src/sprites/makeSprite.ts`:

```ts
import type { Sprite } from '../types';

/**
 * grid에서 width/height를 계산해 Sprite를 만든다.
 * 행 길이가 서로 달라도 되며, 짧은 행의 나머지는 투명으로 취급한다.
 */
export function makeSprite(tier: number, grid: string[]): Sprite {
  const width = grid.reduce((max, row) => Math.max(max, row.length), 0);
  return { tier, grid, width, height: grid.length };
}
```

- [ ] **Step 4: 티어별 데이터 작성**

`src/sprites/tier1.ts` — 기 모음. 작은 구슬.

```ts
import { makeSprite } from './makeSprite';

/** 기 모음 — depth가 얕을 때 뜨는 작은 구슬 */
export const TIER1 = makeSprite(1, [
  '.4.',
  '424',
  '.4.',
]);
```

`src/sprites/tier2.ts` — 파동권. 구슬 + 오른쪽 궤적.

```ts
import { makeSprite } from './makeSprite';

/** 파동권 — 구슬과 코드 쪽으로 뻗는 궤적 */
export const TIER2 = makeSprite(2, [
  '....121....',
  '..12421..11',
  '.1245421.21',
  '..12421..11',
  '....121....',
]);
```

`src/sprites/tier3.ts` — 아도겐. 도복 실루엣 + 파동권.

원본 스프라이트를 참조하지 않은 자체 디자인이다. 왼쪽에 도복 실루엣이 서 있고, 오른쪽(코드 방향)으로 파동권을 쏜다.

```ts
import { makeSprite } from './makeSprite';

/** 아도겐 — 도복 실루엣이 코드를 향해 파동권을 쏜다 */
export const TIER3 = makeSprite(3, [
  '..33.....121....',
  '.3333..12421..11',
  '.33333.1245421.21',
  '..3333.12421..11.',
  '..33.3...121.....',
  '.33..3...........',
  '.3...33..........',
]);
```

- [ ] **Step 5: `index.ts` 작성**

```ts
import type { Sprite } from '../types';
import { TIER1 } from './tier1';
import { TIER2 } from './tier2';
import { TIER3 } from './tier3';

export { makeSprite } from './makeSprite';
export { TIER1, TIER2, TIER3 };

/** tier 내림차순. tierSelector가 이 순서로 시도한다. */
export const ALL_SPRITES: Sprite[] = [TIER3, TIER2, TIER1];
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 29 passing

`tier3`은 1~2행이 16자, 3~7행이 17자로 행 길이가 고르지 않다. `width`는 최대 길이인 17이 되고 짧은 행의 나머지는 투명으로 취급된다. 의도된 동작이며 테스트가 통과한다.

---

### Task 7: tierSelector — 폐기

> 셀 단위 fit 검사가 크기 비교로 단순화됐다. 문서 끝의 **"설계 변경 (5차 스파이크 이후)"** 을 따른다.

캔버스에 들어가는 가장 큰 티어를 고르고 셀 좌표를 만든다.

**Files:**
- Create: `src/render/tierSelector.ts`
- Create: `test/tierSelector.test.ts`

**Interfaces:**
- Consumes: `Canvas`, `PaintCell`, `Placement`, `Sprite` (Task 3), `ALL_SPRITES` (Task 6)
- Produces: `selectTier(canvas: Canvas, sprites: Sprite[]): Placement | null` — Task 10이 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

가로 배치 규칙을 명시적으로 검증한다: **열 0은 비우고 열 1부터 시작**한다. 코드와 아도겐 사이가 아니라 화면 왼쪽 끝에 여유를 준다.

`test/tierSelector.test.ts`:

```ts
import * as assert from 'assert';
import { makeSprite } from '../src/sprites';
import { selectTier } from '../src/render/tierSelector';
import type { Canvas, Sprite } from '../src/types';

/** 모든 줄이 같은 폭인 사각 캔버스 */
function canvas(rowCount: number, width: number, peakRowIndex = 0): Canvas {
  const rows = Array.from({ length: rowCount }, (_, i) => ({ line: i, width }));
  return { rows, peakRowIndex };
}

const SMALL: Sprite = makeSprite(1, ['.1.', '121', '.1.']);
const BIG: Sprite = makeSprite(2, ['..11..', '.1221.', '..11..']);
const SPRITES = [BIG, SMALL];

describe('selectTier', () => {
  it('들어가면 가장 높은 티어를 고른다', () => {
    const p = selectTier(canvas(5, 20, 2), SPRITES)!;
    assert.strictEqual(p.sprite.tier, 2);
  });

  it('폭이 부족하면 낮은 티어로 내려간다', () => {
    // BIG은 최우측 불투명 셀이 인덱스 4 → 필요 폭 6. SMALL은 인덱스 2 → 필요 폭 4.
    const p = selectTier(canvas(5, 5, 2), SPRITES)!;
    assert.strictEqual(p.sprite.tier, 1);
  });

  it('세로가 부족하면 낮은 티어로 내려간다', () => {
    const tall = makeSprite(9, ['1', '1', '1', '1', '1']);
    const p = selectTier(canvas(3, 20, 1), [tall, SMALL])!;
    assert.strictEqual(p.sprite.tier, 1);
  });

  it('하나도 안 들어가면 null', () => {
    assert.strictEqual(selectTier(canvas(2, 2, 0), SPRITES), null);
  });

  it('열 0은 비우고 열 1부터 그린다', () => {
    const p = selectTier(canvas(5, 20, 2), [SMALL])!;
    const cols = p.cells.map((c) => c.col);
    assert.strictEqual(Math.min(...cols), 1);
  });

  it('투명 셀은 cells에 넣지 않는다', () => {
    const p = selectTier(canvas(5, 20, 2), [SMALL])!;
    // SMALL의 불투명 셀은 5개('.1.' 1개 + '121' 3개 + '.1.' 1개)
    assert.strictEqual(p.cells.length, 5);
  });

  it('팔레트 인덱스를 셀에 옮긴다', () => {
    const p = selectTier(canvas(5, 20, 2), [SMALL])!;
    const center = p.cells.find((c) => c.paletteIndex === 2);
    assert.ok(center, '팔레트 인덱스 2인 셀이 있어야 한다');
  });

  it('peak 줄을 스프라이트 세로 중심에 맞춘다', () => {
    // rows 10개, peak는 인덱스 5, 높이 3 → 시작 인덱스 4
    const p = selectTier(canvas(10, 20, 5), [SMALL])!;
    const paintedLines = [...new Set(p.cells.map((c) => c.line))].sort((a, b) => a - b);
    assert.deepStrictEqual(paintedLines, [4, 5, 6]);
  });

  it('peak가 맨 위면 캔버스 안으로 밀어 넣는다', () => {
    const p = selectTier(canvas(10, 20, 0), [SMALL])!;
    const paintedLines = [...new Set(p.cells.map((c) => c.line))].sort((a, b) => a - b);
    assert.deepStrictEqual(paintedLines, [0, 1, 2]);
  });

  it('peak가 맨 아래면 캔버스 안으로 밀어 넣는다', () => {
    const p = selectTier(canvas(10, 20, 9), [SMALL])!;
    const paintedLines = [...new Set(p.cells.map((c) => c.line))].sort((a, b) => a - b);
    assert.deepStrictEqual(paintedLines, [7, 8, 9]);
  });

  it('줄마다 폭이 다른 삼각형 캔버스에서 좁은 줄이 걸리면 실패한다', () => {
    const rows = [
      { line: 0, width: 20 },
      { line: 1, width: 2 }, // 이 줄이 BIG을 막는다
      { line: 2, width: 20 },
    ];
    const p = selectTier({ rows, peakRowIndex: 1 }, [BIG, SMALL]);
    assert.strictEqual(p, null);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Cannot find module '../src/render/tierSelector'`

- [ ] **Step 3: 구현**

`src/render/tierSelector.ts`:

```ts
import type { Canvas, PaintCell, Placement, Sprite } from '../types';

/** 화면 왼쪽 끝에 비워둘 열 수 */
const LEFT_MARGIN = 1;

/**
 * 캔버스에 들어가는 가장 높은 티어를 고른다.
 * sprites는 tier 내림차순이어야 한다(ALL_SPRITES가 그렇다).
 */
export function selectTier(canvas: Canvas, sprites: Sprite[]): Placement | null {
  for (const sprite of sprites) {
    const cells = tryFit(canvas, sprite);
    if (cells !== null) {
      return { sprite, cells };
    }
  }
  return null;
}

/**
 * 스프라이트를 캔버스에 배치해본다.
 * 성공하면 불투명 셀 목록, 실패하면 null.
 */
function tryFit(canvas: Canvas, sprite: Sprite): PaintCell[] | null {
  if (canvas.rows.length < sprite.height) return null;

  const startRow = clampStartRow(canvas, sprite);
  const cells: PaintCell[] = [];

  for (let r = 0; r < sprite.height; r++) {
    const row = canvas.rows[startRow + r];
    const gridRow = sprite.grid[r];

    for (let g = 0; g < gridRow.length; g++) {
      const ch = gridRow[g];
      if (ch === '.') continue;

      const col = LEFT_MARGIN + g;
      // 이 줄의 여백을 넘어가면 이 티어는 실패다.
      if (col >= row.width) return null;

      cells.push({ line: row.line, col, paletteIndex: Number(ch) });
    }
  }

  return cells;
}

/** peak 줄을 스프라이트 세로 중심에 맞추고, 캔버스 경계 안으로 밀어 넣는다. */
function clampStartRow(canvas: Canvas, sprite: Sprite): number {
  const centered = canvas.peakRowIndex - Math.floor((sprite.height - 1) / 2);
  const maxStart = canvas.rows.length - sprite.height;
  return Math.max(0, Math.min(centered, maxStart));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 40 passing

---

### Task 8: 팔레트와 셀 병합 — 폐기 (태스크 자체가 사라짐)

> 색이 SVG 안에 있으므로 팔레트도, 셀 병합도 필요 없다. 이 태스크는 대체되지 않고 삭제됐다.

`decorationPainter`에서 순수 로직만 떼어내 먼저 테스트한다. 색별 Range 병합은 성능의 핵심이면서 vscode 없이 검증 가능하다.

**Files:**
- Create: `src/render/palette.ts`
- Create: `src/render/mergeCells.ts`
- Create: `test/palette.test.ts`
- Create: `test/mergeCells.test.ts`

**Interfaces:**
- Consumes: `PaintCell` (Task 3)
- Produces:
  - `DEFAULT_PALETTE: readonly string[]` (5개)
  - `resolvePalette(configured: unknown): string[]`
  - `PaintRange = { line: number; startCol: number; endCol: number }`
  - `mergeCells(cells: PaintCell[]): Map<number, PaintRange[]>` — 키는 팔레트 인덱스(1~5)

- [ ] **Step 1: 팔레트 테스트 작성**

`test/palette.test.ts`:

```ts
import * as assert from 'assert';
import { DEFAULT_PALETTE, resolvePalette } from '../src/render/palette';

describe('resolvePalette', () => {
  it('기본 팔레트는 5색이다', () => {
    assert.strictEqual(DEFAULT_PALETTE.length, 5);
  });

  it('설정이 없으면 기본값', () => {
    assert.deepStrictEqual(resolvePalette(undefined), [...DEFAULT_PALETTE]);
  });

  it('설정이 5색이면 그대로 쓴다', () => {
    const custom = ['a', 'b', 'c', 'd', 'e'];
    assert.deepStrictEqual(resolvePalette(custom), custom);
  });

  it('설정이 모자라면 뒤를 기본값으로 채운다', () => {
    const result = resolvePalette(['x', 'y']);
    assert.deepStrictEqual(result, ['x', 'y', DEFAULT_PALETTE[2], DEFAULT_PALETTE[3], DEFAULT_PALETTE[4]]);
  });

  it('설정이 넘치면 앞 5개만 쓴다', () => {
    const result = resolvePalette(['a', 'b', 'c', 'd', 'e', 'f', 'g']);
    assert.deepStrictEqual(result, ['a', 'b', 'c', 'd', 'e']);
  });

  it('배열이 아니면 기본값으로 떨어진다', () => {
    assert.deepStrictEqual(resolvePalette('nope'), [...DEFAULT_PALETTE]);
    assert.deepStrictEqual(resolvePalette(null), [...DEFAULT_PALETTE]);
  });

  it('문자열이 아닌 원소는 기본값으로 대체한다', () => {
    const result = resolvePalette(['a', 42, 'c', null, 'e']);
    assert.deepStrictEqual(result, ['a', DEFAULT_PALETTE[1], 'c', DEFAULT_PALETTE[3], 'e']);
  });
});
```

- [ ] **Step 2: 병합 테스트 작성**

`test/mergeCells.test.ts`:

```ts
import * as assert from 'assert';
import { mergeCells } from '../src/render/mergeCells';
import type { PaintCell } from '../src/types';

function cell(line: number, col: number, paletteIndex: number): PaintCell {
  return { line, col, paletteIndex };
}

describe('mergeCells', () => {
  it('같은 줄 같은 색 인접 셀을 하나로 합친다', () => {
    const merged = mergeCells([cell(0, 1, 1), cell(0, 2, 1), cell(0, 3, 1)]);
    assert.deepStrictEqual(merged.get(1), [{ line: 0, startCol: 1, endCol: 4 }]);
  });

  it('떨어진 셀은 따로 둔다', () => {
    const merged = mergeCells([cell(0, 1, 1), cell(0, 5, 1)]);
    assert.deepStrictEqual(merged.get(1), [
      { line: 0, startCol: 1, endCol: 2 },
      { line: 0, startCol: 5, endCol: 6 },
    ]);
  });

  it('색이 다르면 인접해도 합치지 않는다', () => {
    const merged = mergeCells([cell(0, 1, 1), cell(0, 2, 2)]);
    assert.deepStrictEqual(merged.get(1), [{ line: 0, startCol: 1, endCol: 2 }]);
    assert.deepStrictEqual(merged.get(2), [{ line: 0, startCol: 2, endCol: 3 }]);
  });

  it('줄이 다르면 합치지 않는다', () => {
    const merged = mergeCells([cell(0, 1, 1), cell(1, 1, 1)]);
    assert.strictEqual(merged.get(1)!.length, 2);
  });

  it('입력 순서가 섞여 있어도 합친다', () => {
    const merged = mergeCells([cell(0, 3, 1), cell(0, 1, 1), cell(0, 2, 1)]);
    assert.deepStrictEqual(merged.get(1), [{ line: 0, startCol: 1, endCol: 4 }]);
  });

  it('빈 입력은 빈 Map', () => {
    assert.strictEqual(mergeCells([]).size, 0);
  });

  it('쓰이지 않은 색은 키가 없다', () => {
    const merged = mergeCells([cell(0, 1, 3)]);
    assert.strictEqual(merged.has(1), false);
    assert.strictEqual(merged.has(3), true);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Cannot find module '../src/render/palette'` 및 `mergeCells`

- [ ] **Step 4: 팔레트 구현**

`src/render/palette.ts`:

```ts
/**
 * 팔레트 인덱스 1~5에 대응하는 색.
 * rgba로 두는 이유: 반투명이라야 라이트·다크 테마 양쪽에서 배경과 자연스럽게 섞인다.
 */
export const DEFAULT_PALETTE = [
  'rgba(90, 170, 255, 0.25)', // 1 외곽 글로우
  'rgba(120, 200, 255, 0.45)', // 2 중간
  'rgba(40, 45, 60, 0.65)', // 3 실루엣
  'rgba(200, 235, 255, 0.75)', // 4 코어
  'rgba(255, 255, 255, 0.9)', // 5 하이라이트
] as const;

/**
 * 사용자 설정을 검증해 항상 5색 배열을 돌려준다.
 * 설정값은 신뢰할 수 없으므로(사용자가 손으로 쓴다) 원소 단위로 확인한다.
 */
export function resolvePalette(configured: unknown): string[] {
  const source = Array.isArray(configured) ? configured : [];
  return DEFAULT_PALETTE.map((fallback, i) => {
    const value = source[i];
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  });
}
```

- [ ] **Step 5: 병합 구현**

`src/render/mergeCells.ts`:

```ts
import type { PaintCell } from '../types';

export type PaintRange = {
  line: number;
  /** 포함 */
  startCol: number;
  /** 제외 */
  endCol: number;
};

/**
 * 같은 줄에서 같은 색인 인접 셀을 하나의 Range로 합친다.
 * '▓▓▓'는 Range 3개가 아니라 1개다. setDecorations에 넘기는 Range 수를 줄인다.
 */
export function mergeCells(cells: PaintCell[]): Map<number, PaintRange[]> {
  const result = new Map<number, PaintRange[]>();

  const sorted = [...cells].sort(
    (a, b) => a.paletteIndex - b.paletteIndex || a.line - b.line || a.col - b.col
  );

  for (const c of sorted) {
    const ranges = result.get(c.paletteIndex) ?? [];
    const last = ranges[ranges.length - 1];

    if (last !== undefined && last.line === c.line && last.endCol === c.col) {
      last.endCol = c.col + 1;
    } else {
      ranges.push({ line: c.line, startCol: c.col, endCol: c.col + 1 });
    }

    result.set(c.paletteIndex, ranges);
  }

  return result;
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 54 passing

---

### Task 9: DecorationPainter — 폐기

> 배경색 Range 대신 이미지 decoration을 쓴다. 문서 끝의 **"설계 변경 (5차 스파이크 이후)"** 을 따른다.

vscode API를 만지는 첫 실제 코드. DecorationType 생명주기 관리가 핵심이다. 매번 생성하면 누수가 난다.

Task 2의 스파이크 코드를 여기서 삭제한다.

**Files:**
- Create: `src/render/decorationPainter.ts`
- Delete: `src/spike.ts`
- Modify: `src/extension.ts` (스파이크 명령 제거)
- Modify: `package.json` (스파이크 명령 등록 제거)

**Interfaces:**
- Consumes: `Placement` (Task 3), `mergeCells` (Task 8). 팔레트는 문자열 배열로 생성자에서 받으므로 `resolvePalette`를 직접 쓰지 않는다 — 그 호출은 Task 10의 `config.ts`에 있다.
- Produces:
  - `class DecorationPainter`
    - `constructor(palette: string[])`
    - `paint(editor: vscode.TextEditor, placements: Placement[]): void`
    - `clear(editor: vscode.TextEditor): void`
    - `dispose(): void`

- [ ] **Step 1: 구현**

`src/render/decorationPainter.ts`:

```ts
import * as vscode from 'vscode';
import type { Placement } from '../types';
import { mergeCells } from './mergeCells';

/**
 * 팔레트 색마다 DecorationType을 하나씩 만들어 재사용한다.
 *
 * createTextEditorDecorationType을 프레임마다 호출하면 누수가 난다.
 * 팔레트가 바뀔 때만 dispose하고 새 인스턴스를 만든다.
 */
export class DecorationPainter {
  private readonly types: vscode.TextEditorDecorationType[];

  constructor(palette: string[]) {
    this.types = palette.map((backgroundColor) =>
      vscode.window.createTextEditorDecorationType({
        backgroundColor,
        // 스크롤·편집으로 range가 밀려도 decoration이 늘어나지 않게 한다.
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
      })
    );
  }

  paint(editor: vscode.TextEditor, placements: Placement[]): void {
    const cells = placements.flatMap((p) => p.cells);
    const merged = mergeCells(cells);

    // 쓰이지 않은 색도 빈 배열로 덮어써야 이전 프레임의 잔상이 지워진다.
    this.types.forEach((type, i) => {
      const paletteIndex = i + 1;
      const ranges = (merged.get(paletteIndex) ?? []).map(
        (r) => new vscode.Range(r.line, r.startCol, r.line, r.endCol)
      );
      editor.setDecorations(type, ranges);
    });
  }

  clear(editor: vscode.TextEditor): void {
    for (const type of this.types) {
      editor.setDecorations(type, []);
    }
  }

  dispose(): void {
    for (const type of this.types) {
      type.dispose();
    }
  }
}
```

- [ ] **Step 2: 스파이크 코드 삭제**

Run: `rm src/spike.ts`

`src/extension.ts`를 Task 1의 최소 버전으로 되돌린다(스파이크 명령 제거):

```ts
import * as vscode from 'vscode';

let output: vscode.OutputChannel;

export function activate(_context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel('Avoid Adogen');
  output.appendLine('avoid-adogen activated');
}

export function deactivate(): void {
  output?.dispose();
}
```

`package.json`의 `contributes`를 비운다:

```json
"contributes": {},
```

- [ ] **Step 3: 빌드와 테스트 확인**

Run: `npm run compile && npm run test`
Expected: 컴파일 성공, 54 passing. 스파이크 삭제로 깨진 참조가 없어야 한다.

---

### Task 10: 익스텐션 조립

설정을 읽고 이벤트를 구독해 파이프라인을 돌린다. `extension.ts`를 전면 교체한다.

**Files:**
- Create: `src/config.ts`
- Create: `src/pipeline.ts`
- Modify: `src/extension.ts` (전면 교체)
- Modify: `package.json` (`contributes.configuration` 추가)
- Create: `test/config.test.ts`

**Interfaces:**
- Consumes: 앞선 모든 태스크의 산출물
- Produces:
  - `AdogenConfig = { enabled: boolean; minDepth: number; minLines: number; maxConcurrent: number; languages: string[]; palette: string[] }`
  - `readConfig(raw: ConfigSource): AdogenConfig`
  - `isLanguageEnabled(languageId: string, languages: string[]): boolean`
  - `computePlacements(texts: string[], startLine: number, tabSize: number, config: AdogenConfig): Placement[]`

- [ ] **Step 1: 설정 테스트 작성**

`vscode.WorkspaceConfiguration`을 직접 쓰면 테스트가 불가능하므로, `get(key, default)` 하나만 요구하는 최소 인터페이스로 받는다.

`test/config.test.ts`:

```ts
import * as assert from 'assert';
import { isLanguageEnabled, readConfig } from '../src/config';
import { DEFAULT_PALETTE } from '../src/render/palette';

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
    assert.deepStrictEqual(c.palette, [...DEFAULT_PALETTE]);
  });

  it('설정값을 읽는다', () => {
    const c = readConfig(source({ minDepth: 7, maxConcurrent: 2 }));
    assert.strictEqual(c.minDepth, 7);
    assert.strictEqual(c.maxConcurrent, 2);
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

  it('languages가 배열이 아니면 빈 배열', () => {
    assert.deepStrictEqual(readConfig(source({ languages: 'typescript' })).languages, []);
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test`
Expected: FAIL — `Cannot find module '../src/config'`

- [ ] **Step 3: 설정 구현**

`src/config.ts`:

```ts
import { resolvePalette } from './render/palette';

export type AdogenConfig = {
  enabled: boolean;
  minDepth: number;
  minLines: number;
  maxConcurrent: number;
  languages: string[];
  palette: string[];
};

/** vscode.WorkspaceConfiguration이 만족하는 최소 인터페이스. 테스트를 위해 좁혀 받는다. */
export type ConfigSource = {
  get<T>(key: string, fallback: T): T;
};

export function readConfig(raw: ConfigSource): AdogenConfig {
  return {
    enabled: raw.get('enabled', true) !== false,
    minDepth: positiveInt(raw.get<unknown>('minDepth', 4), 4, 1),
    minLines: positiveInt(raw.get<unknown>('minLines', 5), 5, 1),
    maxConcurrent: positiveInt(raw.get<unknown>('maxConcurrent', 0), 0, 0),
    languages: stringArray(raw.get<unknown>('languages', [])),
    palette: resolvePalette(raw.get<unknown>('palette', undefined)),
  };
}

/** 빈 목록은 "전부 허용"을 뜻한다. */
export function isLanguageEnabled(languageId: string, languages: string[]): boolean {
  return languages.length === 0 || languages.includes(languageId);
}

function positiveInt(value: unknown, fallback: number, min: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.floor(value));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}
```

- [ ] **Step 4: 파이프라인 구현**

`src/pipeline.ts` — 순수 함수로 두어 나중에 테스트를 추가할 수 있게 한다. vscode를 import하지 않는다.

```ts
import { scanLines } from './scan/depthScanner';
import { findTriangles } from './scan/triangleFinder';
import { fitCanvas } from './render/canvasFitter';
import { selectTier } from './render/tierSelector';
import { ALL_SPRITES } from './sprites';
import type { AdogenConfig } from './config';
import type { Placement } from './types';

/**
 * 줄 텍스트 배열 → 그릴 스프라이트 배치 목록.
 *
 * 스캔·판정·배치를 한 줄로 잇는 곳. vscode 타입이 전혀 등장하지 않으므로
 * 픽스처 문자열만으로 전체 흐름을 테스트할 수 있다.
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
    const canvas = fitCanvas(triangle, depths);
    if (canvas === null) continue;

    const placement = selectTier(canvas, ALL_SPRITES);
    if (placement === null) continue;

    placements.push(placement);
  }

  // triangles가 이미 peakVisualCols 내림차순이므로 앞에서 자르면 깊은 것이 남는다.
  return config.maxConcurrent > 0 ? placements.slice(0, config.maxConcurrent) : placements;
}
```

- [ ] **Step 5: `extension.ts` 전면 교체**

```ts
import * as vscode from 'vscode';
import { isLanguageEnabled, readConfig, type AdogenConfig } from './config';
import { computePlacements } from './pipeline';
import { DecorationPainter } from './render/decorationPainter';
import type { Placement } from './types';

const DEBOUNCE_MS = 100;

let output: vscode.OutputChannel;
let painter: DecorationPainter | undefined;
let config: AdogenConfig;
let timer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel('Avoid Adogen');
  context.subscriptions.push(output);

  config = readConfig(vscode.workspace.getConfiguration('avoidAdogen'));
  painter = new DecorationPainter(config.palette);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => schedule()),
    vscode.window.onDidChangeTextEditorVisibleRanges(() => schedule()),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) schedule();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('avoidAdogen')) return;
      reload();
    }),
    { dispose: () => clearTimer() }
  );

  schedule();
}

export function deactivate(): void {
  clearTimer();
  painter?.dispose();
  painter = undefined;
}

/** 팔레트가 바뀌면 DecorationType을 다시 만들어야 한다. */
function reload(): void {
  config = readConfig(vscode.workspace.getConfiguration('avoidAdogen'));
  painter?.dispose();
  painter = new DecorationPainter(config.palette);
  schedule();
}

function schedule(): void {
  clearTimer();
  timer = setTimeout(run, DEBOUNCE_MS);
}

function clearTimer(): void {
  if (timer !== undefined) {
    clearTimeout(timer);
    timer = undefined;
  }
}

/**
 * 장난 익스텐션이 에디터를 방해하면 안 된다.
 * 어떤 실패든 decoration을 지우고 조용히 물러난다. 알림을 띄우지 않는다.
 */
function run(): void {
  const editor = vscode.window.activeTextEditor;
  if (editor === undefined || painter === undefined) return;

  try {
    if (!config.enabled || !isLanguageEnabled(editor.document.languageId, config.languages)) {
      painter.clear(editor);
      return;
    }

    const placements = collectVisiblePlacements(editor);
    painter.paint(editor, placements);
  } catch (err) {
    painter.clear(editor);
    output.appendLine(`render failed: ${err instanceof Error ? err.stack : String(err)}`);
  }
}

/**
 * visibleRanges만 스캔한다. 파일이 1만 줄이어도 매번 40~50줄만 읽으므로
 * 파일 크기는 성능에 영향을 주지 않는다.
 */
function collectVisiblePlacements(editor: vscode.TextEditor): Placement[] {
  const tabSize = resolveTabSize(editor);
  const placements: Placement[] = [];

  for (const range of editor.visibleRanges) {
    const texts: string[] = [];
    for (let line = range.start.line; line <= range.end.line; line++) {
      texts.push(editor.document.lineAt(line).text);
    }
    placements.push(...computePlacements(texts, range.start.line, tabSize, config));
  }

  return placements;
}

function resolveTabSize(editor: vscode.TextEditor): number {
  const raw = editor.options.tabSize;
  return typeof raw === 'number' && raw > 0 ? raw : 4;
}
```

- [ ] **Step 6: `package.json`에 설정 등록**

```json
"contributes": {
  "configuration": {
    "title": "Avoid Adogen",
    "properties": {
      "avoidAdogen.enabled": {
        "type": "boolean",
        "default": true,
        "description": "아도겐 표시 여부"
      },
      "avoidAdogen.minDepth": {
        "type": "number",
        "default": 4,
        "minimum": 1,
        "description": "아도겐이 등장하는 최소 코드 depth"
      },
      "avoidAdogen.minLines": {
        "type": "number",
        "default": 5,
        "minimum": 1,
        "description": "삼각형으로 인정할 최소 줄 수"
      },
      "avoidAdogen.maxConcurrent": {
        "type": "number",
        "default": 0,
        "minimum": 0,
        "description": "동시에 표시할 최대 개수 (0 = 무제한)"
      },
      "avoidAdogen.languages": {
        "type": "array",
        "items": { "type": "string" },
        "default": [],
        "description": "대상 언어 ID 목록 (빈 배열 = 모든 언어)"
      },
      "avoidAdogen.palette": {
        "type": "array",
        "items": { "type": "string" },
        "default": [
          "rgba(90, 170, 255, 0.25)",
          "rgba(120, 200, 255, 0.45)",
          "rgba(40, 45, 60, 0.65)",
          "rgba(200, 235, 255, 0.75)",
          "rgba(255, 255, 255, 0.9)"
        ],
        "description": "팔레트 색 5개 (외곽 글로우 / 중간 / 실루엣 / 코어 / 하이라이트)"
      }
    }
  }
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm run test`
Expected: PASS — 64 passing

- [ ] **Step 8: 실제 동작 확인 (수동)**

Run: `npm run compile`, 그다음 F5. 개발 호스트에서 `fixtures/deep.ts`를 연다.

Expected: depth가 깊은 구간의 왼쪽 여백에 파동권이 나타난다. 스크롤하면 따라온다. 코드는 밀리지 않는다.

안 보이면 순서대로 확인한다:
1. Output 패널의 `Avoid Adogen` 채널에 `render failed`가 있는가
2. `avoidAdogen.minDepth`를 2로 낮추면 보이는가 (픽스처의 depth가 부족한 경우)
3. `avoidAdogen.minLines`를 3으로 낮추면 보이는가

- [ ] **Step 9: 설정 반영 확인 (수동)**

개발 호스트 설정에서 `avoidAdogen.enabled`를 `false`로 바꾼다.
Expected: 아도겐이 즉시 사라진다. `true`로 되돌리면 다시 나타난다.

`avoidAdogen.palette`의 첫 색을 `rgba(255, 0, 0, 0.5)`로 바꾼다.
Expected: 외곽 글로우가 빨갛게 바뀐다. DecorationType 재생성이 동작한다는 뜻이다.

---

### Task 11: 통합 확인, 도트 다듬기, 패키징, 첫 커밋

실제 코드에서 보면서 스프라이트를 다듬는다. 저해상도 도트 아트는 눈으로 보는 것 말고 검증 방법이 없다.

**Files:**
- Modify: `src/sprites/tier1.ts`, `src/sprites/tier2.ts`, `src/sprites/tier3.ts` (도트 다듬기)
- Create: `README.md`
- Create: `fixtures/deep.dart`
- Modify: `docs/superpowers/specs/2026-08-13-spike-results.md` (최종 관찰 추가)

**Interfaces:**
- Consumes: 전체
- Produces: `avoid-adogen-0.0.1.vsix`, git 저장소와 첫 커밋

- [ ] **Step 1: Dart 픽스처 작성**

들여쓰기 기반 판정이 언어에 무관하다는 걸 실제로 확인한다. Flutter의 위젯 중첩은 이 익스텐션의 핵심 사용처다.

`fixtures/deep.dart`:

```dart
Widget build(BuildContext context) {
  return Scaffold(
    body: SafeArea(
      child: Column(
        children: [
          Expanded(
            child: ListView.builder(
              itemBuilder: (context, index) {
                return Padding(
                  padding: const EdgeInsets.all(8),
                  child: Card(
                    child: ListTile(
                      title: Text('item $index'),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    ),
  );
}
```

- [ ] **Step 2: TS·Dart 양쪽에서 눈으로 확인 (수동)**

Run: `npm run compile`, F5. 개발 호스트에서 `fixtures/deep.ts`와 `fixtures/deep.dart`를 각각 연다.

Expected: 양쪽 모두 아도겐이 나타난다. Dart 쪽은 들여쓰기 2칸이라 depth가 더 깊게 잡힌다.

- [ ] **Step 3: 티어 3단계 전부 확인 (수동)**

`avoidAdogen.minDepth`를 낮춰가며 tier1 → tier2 → tier3이 각각 나타나는 조건을 찾는다. 각 티어가 실제로 뜨는지 확인한다.

한 번도 뜨지 않는 티어가 있으면 그 스프라이트의 `width`가 너무 커서 어떤 여백에도 안 들어가는 것이다. 폭을 줄인다.

- [ ] **Step 4: 도트 다듬기**

셀이 세로로 2.5배 길기 때문에 계획서에서 정사각형으로 보였던 도트가 화면에서는 가로로 납작해 보인다. 실제 화면을 보면서 `tier1.ts`, `tier2.ts`, `tier3.ts`의 grid를 수정한다.

다듬을 때 지킬 것:
- `.`과 `1`~`5`만 쓴다 (`test/sprites.test.ts`가 검증한다)
- 팔레트 3번(실루엣)은 tier3에서만 쓴다
- 구슬 중심은 4~5번(코어·하이라이트), 외곽은 1~2번

수정 후 Run: `npm run test`
Expected: PASS — 스프라이트 데이터 무결성 테스트가 통과해야 한다.

- [ ] **Step 5: 스파이크 결과 문서에 최종 관찰 추가**

`docs/superpowers/specs/2026-08-13-spike-results.md` 끝에 추가한다:

```markdown
## 최종 관찰 (Task 11)

- 들여쓰기 안내선과의 실제 겹침 정도:
- 팔레트 알파를 조정했는가:
- 티어별로 실제 등장하는 depth 조건:
- 다듬은 뒤 tier3이 알아볼 만한가:
```

빈칸을 채운다. 실제로 본 것만 적는다.

- [ ] **Step 6: README 작성**

`README.md`:

```markdown
# Avoid Adogen

코드가 너무 깊어지면 왼쪽 여백에 파동권이 나타납니다.

## 어떻게 동작하나

들여쓰기가 계단처럼 깊어지면 왼쪽에 삼각형 여백이 생깁니다. 그 여백은 실제
공백 문자라서, 거기에 색을 칠해 도트 아트를 그릴 수 있습니다. 코드를 밀거나
파일 내용을 건드리지 않습니다.

여백이 클수록 큰 아도겐이 들어갑니다.

| depth | 표시 |
|---|---|
| 얕음 | 기 모음 (작은 구슬) |
| 중간 | 파동권 (구슬 + 궤적) |
| 깊음 | 아도겐 (실루엣 + 파동권) |

임계값을 따로 정할 필요가 없습니다. 아도겐이 보이면 너무 깊다는 뜻입니다.

## 지원 언어

들여쓰기만 보기 때문에 언어를 가리지 않습니다. TypeScript, JavaScript, Dart,
Python, YAML 등에서 그대로 동작합니다.

**공백 들여쓰기만 지원합니다.** 탭으로 들여쓴 줄은 건너뜁니다. 탭 1문자가
여러 열을 차지해서 셀 단위로 그림을 그릴 수 없기 때문입니다. prettier와
dartfmt는 공백이 기본값이라 대부분의 프로젝트에서는 문제가 없습니다.

## 설정

| 키 | 기본값 | 설명 |
|---|---|---|
| `avoidAdogen.enabled` | `true` | 표시 여부 |
| `avoidAdogen.minDepth` | `4` | 아도겐이 등장하는 최소 depth |
| `avoidAdogen.minLines` | `5` | 삼각형으로 인정할 최소 줄 수 |
| `avoidAdogen.maxConcurrent` | `0` | 동시 표시 개수 (0 = 무제한) |
| `avoidAdogen.languages` | `[]` | 대상 언어 ID (빈 배열 = 전부) |
| `avoidAdogen.palette` | 5색 | 외곽 / 중간 / 실루엣 / 코어 / 하이라이트 |

팀 컨벤션에 맞춰 `minDepth`를 조정하면 컨벤션 알림으로도 쓸 수 있습니다.

## 설치

```bash
npm install
npm run package
```

생성된 `avoid-adogen-0.0.1.vsix`를 VS Code에서 설치합니다:
명령 팔레트 → `Extensions: Install from VSIX...`

## 개발

```bash
npm run test     # 단위 테스트 (VS Code 불필요)
npm run watch    # 빌드 감시
```

F5로 익스텐션 개발 호스트를 띄우고 `fixtures/deep.ts`를 열면 확인할 수 있습니다.

## 아트

모든 도트 아트는 자체 창작물입니다. 기존 게임 스프라이트를 사용하지 않았습니다.
```

- [ ] **Step 7: 전체 테스트와 빌드 최종 확인**

Run: `npm run test && npm run compile`
Expected: 전체 테스트 통과, 컴파일 성공.

- [ ] **Step 8: vsix 패키징**

Run: `npm run package`

Expected: `avoid-adogen-0.0.1.vsix` 생성.

`vsce`가 `repository` 필드 없음이나 `LICENSE` 없음을 경고할 수 있다. 로컬 설치에는 문제가 없으므로 경고는 무시하고 진행한다. 에러로 실패하면 `vsce package --allow-missing-repository`를 쓴다.

- [ ] **Step 9: 실제 설치 확인 (수동)**

명령 팔레트 → `Extensions: Install from VSIX...` → 생성된 vsix 선택. VS Code를 재시작하고 깊은 코드가 있는 실제 프로젝트 파일을 연다.

Expected: 개발 호스트가 아닌 일반 VS Code에서도 아도겐이 나타난다.

- [ ] **Step 10: git 저장소 생성과 첫 커밋**

여기가 이 계획에서 git을 처음 만지는 지점이다. 지금까지 저장소가 없었다.

```bash
git init
git add .
git status
```

`git status`로 `node_modules/`, `dist/`, `*.vsix`가 스테이지에 없는지 확인한다. 있으면 `.gitignore`를 고치고 `git reset`으로 다시 스테이징한다.

```bash
git commit -m "feat: 코드 depth가 깊어지면 여백에 아도겐을 그리는 익스텐션

들여쓰기 공백 구간에 Range를 걸고 backgroundColor를 칠해 여백을 픽셀
그리드로 사용한다. 여백 크기가 depth에 정비례하므로 들어가는 최대 티어를
고르는 규칙 하나로 임계값 튜닝을 대체했다.

핵심 로직은 vscode API를 import하지 않는 순수 함수로 분리해 VS Code 없이
단위 테스트한다.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 11: 커밋 확인**

Run: `git log --stat -1`
Expected: 커밋 하나, `node_modules`나 `dist`가 포함되지 않음.

---

## 설계 변경 (5차 스파이크 이후)

근거는 `docs/superpowers/specs/2026-08-13-spike-results.md`에 있다. 요약하면 셀 배경색 페인팅으로는 임팩트가 나오지 않아 **SVG 이미지 방식으로 전환**했다.

확정된 렌더링 방식:

```ts
before: {
  contentIconPath: <data URI SVG>,
  width: '16ch',
  height: '6em',
  margin: '0 -16ch 0 0',
  textDecoration: 'none; position: absolute; transform: translateY(-42%); z-index: 0;',
}
```

`position: absolute`가 이미지를 라인 박스에서 빼내므로 코드가 밀리지 않고 여러 줄에 걸쳐 그려진다. 음수 마진만으로는 실패한다(4차 스파이크 A 방식이 코드를 밀었다).

### 사라지는 것

- `src/render/canvasFitter.ts` — 셀 그리드
- `src/sprites/**` — 도트 그리드, `makeSprite`
- `src/render/tierSelector.ts` — 셀 단위 fit 검사
- `src/render/palette.ts`, `src/render/mergeCells.ts` — 색이 SVG 안에 있다
- `PaintCell`, `Canvas`, `CanvasRow`, `Sprite` 타입
- `avoidAdogen.palette` 설정

### 새 모듈 구조

| 모듈 | 입력 → 출력 | vscode 의존 |
|---|---|---|
| `scan/depthScanner` | 변경 없음 | 없음 |
| `scan/triangleFinder` | 변경 없음 | 없음 |
| `render/triangleMetrics` | `Triangle` + `LineDepth[]` → `TriangleMetrics \| null` | 없음 |
| `designs/*` | SVG 원문 + 티어 크기 상수 | 없음 |
| `render/designSelector` | `TriangleMetrics` + `Design[]` → `Placement \| null` | 없음 |
| `render/imagePainter` | `Placement[]` → `setDecorations` | 있음 |
| `pipeline`, `config`, `extension` | 변경 없음(팔레트 제거) | 일부 |

### 새 타입

```ts
export type TriangleMetrics = {
  /** 이미지를 놓을 줄. 삼각형의 peak. */
  anchorLine: number;
  /** 삼각형 안에서 가장 넓은 여백의 문자 수 */
  maxWidth: number;
  /** 삼각형이 차지하는 줄 수 */
  lineCount: number;
};

export type Design = {
  tier: number;
  name: string;
  /** data URI로 인코딩할 SVG 원문 */
  svg: string;
  /** CSS width. 문자 폭 기준이라 폰트 설정에 정확히 비례한다. */
  widthCh: number;
  /** CSS height. em 단위. 줄 높이와는 폰트 설정에 따라 어긋날 수 있다. */
  heightEm: number;
  /** 이 디자인을 쓰려면 필요한 최소 여백 폭 */
  minWidth: number;
  /** 이 디자인을 쓰려면 필요한 최소 줄 수 */
  minLines: number;
};

export type Placement = {
  design: Design;
  line: number;
};
```

### 티어 정의

| 티어 | 디자인 | 크기 | 최소 여백 폭 | 최소 줄 수 | tabSize 2에서 |
|---|---|---|---|---|---|
| 1 | 구슬 (기 모음) | 8ch × 3em | 8 | 3 | depth 4 |
| 2 | 클래식 파동권 | 14ch × 6em | 14 | 5 | depth 7 |
| 3 | 플레어 (관통 광선) | 20ch × 9em | 20 | 8 | depth 10 |

`width`/`height`가 `DecorationType`에 고정되므로 크기를 삼각형마다 바꾸면 타입이 무한히 늘어난다. 티어당 하나로 고정해 `DecorationType`을 3개로 유지한다.

세로 크기(em)는 줄 높이와 정확히 맞지 않는다. `1em`은 `fontSize` 기준이고 줄 높이는 `lineHeight` 설정에 달렸기 때문이다. 이미지가 삼각형을 조금 넘거나 작게 보일 수 있는데, `absolute` 배치라 넘쳐도 코드를 밀지 않으므로 수용한다. 가로(`ch`)는 문자 폭 기준이라 정확하다.

### 새 Task 정의

**Task 5 — `render/triangleMetrics.ts`**
`measure(triangle, depths): TriangleMetrics | null`. 삼각형 범위에서 빈 줄·탭 줄을 제외한 뒤 `maxWidth`(최대 `charCount`)를 구하고, `lineCount`는 `endLine - startLine + 1`, `anchorLine`은 `triangle.peakLine`. 유효한 줄이 하나도 없으면 `null`.

**Task 6 — `src/designs/`**
`orb.ts`(신규 제작), `classic.ts`, `flare.ts`, `index.ts`. 5차 스파이크의 `SVG_CLASSIC`·`SVG_FLARE`를 그대로 옮기고, 공통 `<defs>`를 `defs.ts`로 분리한다. `svgUri(svg): string`로 base64 data URI를 만든다. 테스트는 SVG 문자열 무결성(`<svg` 시작, `</svg>` 종료, viewBox 존재)과 `ALL_DESIGNS`가 tier 내림차순인지 확인한다.

**Task 7 — `render/designSelector.ts`**
`selectDesign(metrics, designs): Placement | null`. tier 내림차순으로 시도해 `maxWidth >= minWidth && lineCount >= minLines`인 첫 디자인을 채택한다.

**Task 9 — `render/imagePainter.ts`**
`class ImagePainter`. 생성자에서 `ALL_DESIGNS`마다 `DecorationType`을 하나씩 만든다. `paint(editor, placements)`는 티어별로 `Range(line, 0, line, 0)` 배열을 모아 `setDecorations`한다. 쓰이지 않은 티어도 빈 배열로 덮어써 잔상을 지운다.

**Task 10 — 설정에서 `palette` 제거**
나머지 5개(`enabled`, `minDepth`, `minLines`, `maxConcurrent`, `languages`)는 그대로다.

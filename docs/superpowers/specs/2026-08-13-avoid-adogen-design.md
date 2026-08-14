# avoid-adogen 설계 문서

작성일: 2026-08-13

## 무엇을 만드는가

코드 depth가 깊어져 왼쪽에 삼각형 여백이 생기면, 그 여백에 파동권(아도겐) 도트 아트를 그려 보여주는 VS Code 익스텐션.

여백이 클수록 더 큰 아도겐이 들어간다. 그래서 "아도겐이 보인다 = 너무 깊다"가 그대로 신호가 되고, 반대로 "아도겐을 완성시키려고 일부러 깊게 짜기"라는 농담도 성립한다.

## 왜 이 방식인가

### 왜 들여쓰기 기반인가

depth 판정에 AST를 쓰지 않는다. 이유:

1. 이 익스텐션이 반응하는 대상은 **화면에 보이는 삼각형**이다. 시각적 들여쓰기가 곧 판정 기준이어야 개념이 일치한다.
2. 파서가 0개라 TS/JS/Dart/Python/YAML이 전부 공짜로 지원된다. 주 사용 언어인 TS와 Dart를 동시에 커버하는 데 별도 작업이 없다.
3. prettier·dartfmt를 쓰는 환경에서는 들여쓰기가 사실상 구문 중첩과 일치한다.

트레이드오프: 포매터를 안 쓰거나 들여쓰기가 깨진 코드에서는 오탐이 난다. 감수한다.

### 왜 여백에 그릴 수 있는가

삼각형의 왼쪽 여백은 빈 공간이 아니라 **실제 들여쓰기 공백 문자**다. 그 공백 구간에 `Range`를 걸고 `backgroundColor`를 칠하면 텍스트를 삽입하지 않으므로 코드가 밀리지 않는다. `indent-rainbow`가 들여쓰기를 색칠하는 것과 같은 메커니즘이다.

`before` decoration은 쓰지 않는다. 가상 텍스트를 삽입하는 방식이라 코드가 오른쪽으로 밀려 삼각형 자체가 망가진다.

결과적으로 **여백 = 셀 픽셀 그리드**가 된다. 셀 하나는 대략 가로 7px × 세로 19px(기본 14px 폰트)로 세로가 2.5배 길다.

### 왜 티어 승급인가

캔버스 크기가 depth에 정비례하므로, "여백에 들어가는 최대 티어를 고른다"는 규칙 하나로 임계값 튜닝이 사라진다. depth 4의 작은 구슬과 depth 9의 완성된 아도겐이 자연스럽게 다른 강도의 피드백이 된다.

## 아키텍처

### 모듈 구조

핵심 로직을 vscode API에서 완전히 분리한다. 7개 모듈 중 5개가 순수 함수여서 VS Code를 띄우지 않고 단위 테스트할 수 있다.

| 모듈 | 입력 → 출력 | vscode 의존 |
|---|---|---|
| `scan/depthScanner` | 줄 텍스트 + tabSize → `LineDepth[]` | 없음 |
| `scan/triangleFinder` | `LineDepth[]` + 설정 → `Triangle[]` | 없음 |
| `render/canvasFitter` | `Triangle` + `LineDepth[]` → `Canvas` | 없음 |
| `render/tierSelector` | `Canvas` + 스프라이트 목록 → `Placement \| null` | 없음 |
| `sprites/*` | 도트 데이터 (문자 그리드 상수) | 없음 |
| `render/decorationPainter` | `Placement[]` → `setDecorations` | 있음 |
| `extension` | 이벤트 구독 · 디바운스 · 파이프라인 조립 | 있음 |

각 모듈의 책임:

- **depthScanner** — 각 줄의 선행 공백을 세고, 탭 사용 여부와 빈 줄 여부를 판정한다. 시각적 열 수와 문자 수를 구분해서 반환한다(Range는 문자 인덱스 기준이므로 둘 다 필요).
- **triangleFinder** — depth 배열에서 peak을 찾고 위아래로 확장해 삼각형 구간을 만든다. 겹치는 구간을 정리한다.
- **canvasFitter** — 삼각형 구간에서 실제로 칠할 수 있는 줄만 골라 셀 그리드를 만든다. 빈 줄·탭 줄을 제외하는 곳이 여기다.
- **tierSelector** — 티어를 높은 것부터 시도해 캔버스에 들어가는 첫 스프라이트를 고르고, 배치 좌표를 계산한다.
- **decorationPainter** — 팔레트 색별로 셀을 묶고, 같은 색 인접 셀을 하나의 Range로 병합해 `setDecorations`를 호출한다. DecorationType 생명주기를 관리한다.

### 파일 구조

```
avoid-adogen/
  package.json
  tsconfig.json
  esbuild.js
  README.md
  src/
    extension.ts
    types.ts
    scan/
      depthScanner.ts
      triangleFinder.ts
    render/
      canvasFitter.ts
      tierSelector.ts
      decorationPainter.ts
      palette.ts
    sprites/
      index.ts
      tier1.ts
      tier2.ts
      tier3.ts
  test/
    depthScanner.test.ts
    triangleFinder.test.ts
    canvasFitter.test.ts
    tierSelector.test.ts
    decorationPainter.test.ts
  docs/superpowers/specs/
    2026-08-13-avoid-adogen-design.md
```

### 데이터 흐름

```
이벤트 (스크롤 · 편집 · 에디터 전환 · 설정 변경)
  → 게이트: enabled === false 또는 languageId가 languages에 없으면
            그 에디터의 decoration을 clear하고 종료
  → 디바운스 100ms (마지막 요청만 처리)
  → visibleRanges 확보 (화면에 보이는 40~50줄)
  → depthScanner   : LineDepth[]
  → triangleFinder : Triangle[]
  → 각 Triangle 순회:
       canvasFitter  : Canvas
       tierSelector  : Placement | null  (null이면 그 삼각형은 건너뜀)
  → maxConcurrent 적용 (depth 큰 순으로 자름)
  → decorationPainter : setDecorations
```

## 타입 정의

```ts
type LineDepth = {
  line: number;        // 0-based 문서 줄 번호
  visualCols: number;  // tabSize 확장 후 시각적 들여쓰기 열 수 (depth 판정용)
  charCount: number;   // 선행 공백 문자 개수 (Range 인덱스용)
  usesTab: boolean;    // 선행 공백에 탭이 하나라도 있으면 true
  isBlank: boolean;    // 빈 줄이거나 공백만 있는 줄
};

type Triangle = {
  startLine: number;
  peakLine: number;
  endLine: number;
  peakVisualCols: number;
};

type Canvas = {
  rows: CanvasRow[];   // 칠할 수 있는 줄만. 위에서 아래 순서.
  peakRowIndex: number; // rows 배열에서 peak 줄의 인덱스
};

type CanvasRow = {
  line: number;
  width: number;       // 이 줄에서 사용 가능한 셀 수 = charCount
};

type Sprite = {
  tier: number;
  grid: string[];      // 각 문자: '.' = 투명, '1'~'5' = 팔레트 인덱스
  width: number;       // grid 행 최대 길이
  height: number;      // grid 행 수
};

type Placement = {
  sprite: Sprite;
  cells: PaintCell[];  // 불투명 셀만
};

type PaintCell = {
  line: number;
  col: number;         // 문자 인덱스
  paletteIndex: number; // 1~5
};
```

## 알고리즘

### 삼각형 판정 (triangleFinder)

완벽한 단조 증감을 요구하면 실제 코드에서 거의 잡히지 않는다. 같은 depth의 문장이 여러 줄 이어지는 게 정상이기 때문이다. 그래서 **peak 기준 확장** 방식을 쓴다.

1. 스캔 범위 안에서 peak 후보를 수집한다. 후보 조건은 "직전 줄보다 `visualCols`가 크다"다. 가장 깊은 줄이 여러 줄 이어지는 플래토에서는 **첫 줄만** 후보가 된다(2번째 줄부터는 직전 줄과 같으므로 조건에 걸리지 않는다). 빈 줄은 판정에서 건너뛰고 그 앞의 빈 줄 아닌 줄과 비교한다.
2. 각 후보에서 위로 확장한다. 다음 줄로 갈 때 `visualCols`가 **감소하거나 같으면** 계속, **증가하면** 중단.
3. 같은 방식으로 아래로 확장한다.
4. 확정 조건 두 개를 모두 만족하면 삼각형으로 채택한다.
   - `peakVisualCols >= minDepth * tabSize` (기본 minDepth 4)
   - 확장된 줄 수 `>= minLines` (기본 5)
5. 구간이 겹치는 삼각형은 줄 수가 많은 쪽을 남긴다. 줄 수가 같으면 `peakVisualCols`가 큰 쪽.

빈 줄이 2개 이상 연속되면 확장을 거기서 중단한다. 그림이 지나치게 벌어지는 것을 막기 위해서다.

### 캔버스 추출 (canvasFitter)

삼각형 구간의 모든 줄을 순회하며, 다음 줄은 `rows`에서 **제외**한다.

- `isBlank === true` — 공백 문자가 0개라 Range를 걸 수 없다
- `usesTab === true` — 탭 1문자가 tabSize 열을 차지해서 셀 단위 제어가 불가능하다

제외된 줄은 스프라이트 행을 소비하지 않는다. 즉 스프라이트는 "칠할 수 있는 줄"에만 순서대로 매핑된다. 결과적으로 그림이 세로로 조금 벌어질 수 있지만 끊기지는 않는다.

각 줄의 사용 가능 폭은 `charCount`다.

`peakRowIndex`는 `rows` 배열 기준 인덱스다. `triangleFinder`가 넘긴 `peakLine`이 제외 대상이면(공백만 있는 줄이 가장 깊은 위치일 수 있다) `rows`에 존재하지 않으므로, **`peakLine`에 가장 가까운 `rows` 원소의 인덱스**를 쓴다. 거리가 같으면 위쪽을 택한다. `rows`가 비면 `Canvas`를 만들지 않고 그 삼각형을 버린다.

### 티어 선택 (tierSelector)

티어를 높은 것부터(tier3 → tier2 → tier1) 시도하고, 처음 들어가는 것을 채택한다. 하나도 안 들어가면 `null`을 반환하고 그 삼각형은 건너뛴다.

"들어간다"의 정의:

1. `canvas.rows.length >= sprite.height` — 세로가 충분하다
2. 세로 정렬: `peakRowIndex`를 스프라이트 세로 중심에 맞춘다. 시작 인덱스 = `peakRowIndex - floor((height - 1) / 2)`. 캔버스 경계를 넘으면 안쪽으로 밀어 넣는다(clamp).
3. 가로 정렬: 열 1부터 시작한다(열 0은 여유로 비움).
4. 각 스프라이트 행에 대해, 그 행의 최우측 불투명 셀 위치 + 1 이 대응 줄의 `width`를 넘지 않아야 한다. 한 행이라도 넘으면 그 티어는 실패.

### 색별 Range 병합 (decorationPainter)

같은 줄에서 같은 팔레트 인덱스를 가진 인접 셀을 하나의 Range로 합친다. `▓▓▓`는 Range 3개가 아니라 1개다.

DecorationType은 **팔레트 색 개수만큼만** 생성해 재사용한다. 매 프레임 `createTextEditorDecorationType`을 호출하면 누수가 발생한다. 팔레트 설정이 바뀔 때만 dispose하고 다시 만든다.

## 스프라이트

문자 그리드 상수로 둔다. `'.'`은 투명, `'1'`~`'5'`는 팔레트 인덱스.

셀이 세로로 2.5배 길기 때문에 **가로 스케일 자동 보정을 하지 않는다.** 자동 보정은 저해상도 도트 아트를 뭉갠다. 대신 사람이 눈으로 보면서 세로로 긴 셀을 감안해 직접 그린다.

티어 구성:

- **tier1** (기 모음) — 작은 구슬. 대략 3×3.
- **tier2** (파동권) — 구슬 + 오른쪽으로 뻗는 궤적. 대략 11×5.
- **tier3** (아도겐) — 도복 실루엣 + 파동권. 대략 16×7.

tier3 실루엣은 **직접 그린 창작물**이다. 원본 스프라이트를 참조하거나 트레이싱하지 않는다(아래 배포 항목 참조).

초안(실제 `grid` 데이터 형식 그대로. 궤적도 팔레트 인덱스로 표현한다):

```
tier1        tier2                tier3
.4.          ....121....          ..3.....121....
424          ..12321..11          .333..12321..11
.4.          .1232321.21          .3333.1232321.21
             ..12321..11          ..33..12321..11
             ....121....          .3.3....121....
                                  .3.3....121....
                                  3...3..12321...
```

세로로 긴 셀 때문에 화면에서는 이 그리드보다 가로로 납작해 보인다. 최종 형태는 통합 확인 단계에서 눈으로 보며 다듬는다.

## 팔레트

기본값은 `rgba()` 반투명이라 라이트·다크 테마 양쪽에서 배경과 자연스럽게 섞인다.

| 인덱스 | 역할 | 기본값 |
|---|---|---|
| 1 | 외곽 글로우 | `rgba(90, 170, 255, 0.25)` |
| 2 | 중간 | `rgba(120, 200, 255, 0.45)` |
| 3 | 실루엣 | `rgba(40, 45, 60, 0.65)` |
| 4 | 코어 | `rgba(200, 235, 255, 0.75)` |
| 5 | 하이라이트 | `rgba(255, 255, 255, 0.9)` |

`borderRadius`는 v1에서 쓰지 않는다. 사각 셀 + 알파 그라데이션이 도트 아트 컨셉에 더 맞다.

## 표시 정책

화면에 보이는 삼각형 **전부**에 그린다. 리팩터링 대상을 지도처럼 한눈에 보는 용도다.

레거시 파일에서 산만해질 수 있으므로 `maxConcurrent` 설정으로 개수를 제한할 수 있다(기본 0 = 무제한). 제한이 걸리면 `peakVisualCols`가 큰 순서로 남긴다.

## 설정

`package.json`의 `contributes.configuration`에 등록한다.

| 키 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `avoidAdogen.enabled` | boolean | `true` | 전체 on/off |
| `avoidAdogen.minDepth` | number | `4` | 티어1이 등장하는 최소 depth |
| `avoidAdogen.minLines` | number | `5` | 삼각형으로 인정할 최소 줄 수 |
| `avoidAdogen.maxConcurrent` | number | `0` | 동시 표시 개수 (0 = 무제한) |
| `avoidAdogen.languages` | string[] | `[]` | 대상 languageId (빈 배열 = 전부) |
| `avoidAdogen.palette` | string[] | 위 표 참조 | 팔레트 색 5개 |

## 에러 처리

파이프라인 전체를 try/catch로 감싸고, 실패하면 해당 에디터의 decoration을 전부 clear한다. 장난 익스텐션이 에디터를 방해하면 안 되므로 **조용히 실패**시킨다. 사용자에게 알림을 띄우지 않고 output channel에만 기록한다.

- 거대 파일 — `visibleRanges`만 스캔하므로 파일 크기와 무관하다
- 빠른 스크롤 — 디바운스로 마지막 요청만 처리한다
- 에디터 닫힘 · 익스텐션 비활성화 — `dispose()`에서 모든 DecorationType을 정리한다
- 설정 변경 — DecorationType을 dispose하고 다시 만든 뒤 전체 재계산한다

## 검증

### 스파이크 (구현 첫 단계, 약 30분)

설계의 핵심 가정을 실제 VS Code에서 확인한다. 여기서 S1이 실패하면 접근 자체를 다시 봐야 한다.

- **S1** — 들여쓰기 공백 Range에 `backgroundColor`를 칠했을 때 코드가 밀리지 않고 칠해지는가
- **S2** — `editor.guides.indentation` 안내선과 겹칠 때 어느 쪽이 위에 그려지는가. 아도겐이 관통당하면 팔레트 알파를 올려 덮는다.
- **S3** — 선택 영역·현재 줄 하이라이트와 겹칠 때 아도겐이 보이는가
- **S4** — 한 줄에 여러 색 Range를 걸었을 때 색이 의도대로 나오는가

### 단위 테스트

순수 함수 5개를 mocha로 테스트한다. VS Code 인스턴스가 필요 없다.

- `depthScanner` — 공백/탭/혼합 들여쓰기, tabSize 변화, 빈 줄, 공백만 있는 줄
- `triangleFinder` — 플래토 허용, 증가 시 중단, minDepth·minLines 경계값, 겹침 정리, 빈 줄 2개 연속에서 중단
- `canvasFitter` — 빈 줄·탭 줄 제외, `peakRowIndex` 재계산
- `tierSelector` — 티어 내림차순 시도, 세로 clamp, 가로 폭 초과 판정, 전부 실패 시 null
- `decorationPainter` — 인접 셀 병합 로직 (vscode API는 목으로 대체)

입력은 문자열 리터럴로 만든 가짜 코드 블록을 쓴다. 예상 출력은 삼각형 좌표와 셀 목록으로 검증한다.

### 통합 확인

실제 VS Code 인스턴스를 띄워 TS 파일과 Dart 파일에서 눈으로 확인한다. 스프라이트 도트는 눈으로 보고 다듬는 작업이 필수다.

## v1 범위

### 포함

- 들여쓰기 스캔, 삼각형 판정, 캔버스 추출, 티어 선택, 셀 페인팅
- 티어 3개 (구슬 / 파동권 / 실루엣+파동권)
- 설정 6개
- 순수 함수 단위 테스트
- vsix 로컬 빌드

### 제외

- **Problems 패널 · diagnostics 연동** — ESLint `max-nested-callbacks`와 Dart analyzer가 이미 하는 일이다. 이 익스텐션의 고유 가치는 즉시 보이는 시각 피드백이고 진단은 중복이다.
- **애니메이션** — 프레임 갱신은 성능과 산만함 양쪽에 리스크가 있다. 정적 스프라이트가 실제로 쓸 만한지 확인한 뒤 검토한다.
- **SVG 이미지 렌더러** — `decorationPainter`를 인터페이스로 두어 나중에 갈아끼울 수 있게만 해둔다.
- **AST 기반 정밀 판정**
- **마켓플레이스 배포**
- **탭 들여쓰기 지원** — 탭 줄은 건너뛴다. 탭 전용 파일에서는 아도겐이 나타나지 않으며, README에 명시한다.

## 배포

v1은 vsix 로컬 설치로 끝낸다. 다만 아트는 **처음부터 직접 그린 창작물**로 만든다.

류 스프라이트는 캡콤 저작물이고 도트로 다시 그린 것도 파생물이다. 마켓플레이스에서 IP 침해 신고로 익스텐션이 내려가는 일은 실제로 있다. tier3 실루엣을 "도복 입은 사람이 에너지파를 쏘는" 자체 디자인으로 만들어 두면, 나중에 공개하기로 마음이 바뀌어도 아트 재작업 없이 바로 올릴 수 있다.

## 기술 스택

- TypeScript
- esbuild (번들)
- `@types/vscode`
- mocha (단위 테스트)
- `@vscode/vsce` (vsix 패키징)

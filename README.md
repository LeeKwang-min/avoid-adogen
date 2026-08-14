# Avoid Adogen

코드가 너무 깊어지면 왼쪽 여백에서 파동권이 날아옵니다.

<img src="https://raw.githubusercontent.com/LeeKwang-min/avoid-adogen/main/example.png" width="420" alt="중첩이 깊어질수록 왼쪽 여백의 아도겐이 구슬에서 파동권, 관통 광선으로 커지는 세 단계">

## 어떻게 동작하나

들여쓰기가 계단처럼 깊어지면 왼쪽에 삼각형 여백이 생깁니다. 그 여백이 넓어질수록
큰 아도겐이 들어갑니다.

임계값을 따로 정할 필요가 없습니다. **아도겐이 보이면 너무 깊다는 뜻입니다.**

| 여백 폭 | 줄 수 | 나타나는 것 |
|---|---|---|
| 8칸 이상 | 3줄 이상 | 기 모음 — 작은 구슬 |
| 16칸 이상 | 5줄 이상 | 파동권 — 캐릭터가 발사 |
| 22칸 이상 | 8줄 이상 | 플레어 — 화면을 관통하는 광선 |

들여쓰기 2칸 프로젝트라면 각각 depth 4 / 8 / 11 정도입니다. Flutter 위젯 중첩은
자연스럽게 마지막 단계에 도달합니다.

파일 내용은 전혀 바뀌지 않습니다. 코드 위치도 밀리지 않습니다. 복사·저장·git diff에
아무 영향이 없습니다.

## 지원 언어

들여쓰기만 보기 때문에 언어를 가리지 않습니다. TypeScript, JavaScript, Dart, Python,
YAML 등에서 그대로 동작합니다.

**공백 들여쓰기만 지원합니다.** 탭으로 들여쓴 줄은 건너뜁니다. 탭 1문자가 여러 열을
차지해서 여백 폭을 문자 단위로 잴 수 없기 때문입니다. prettier와 dartfmt는 공백이
기본값이라 대부분의 프로젝트에서는 문제가 없습니다.

## 팁

`editor.guides.indentation`을 끄면 더 깔끔합니다. 들여쓰기 안내선이 켜져 있으면
라이트 테마에서 세로 실선이 그림을 관통해 보입니다. 익스텐션이 끌 수 있는 설정이
아니라서 남는 한계입니다.

## 설정

| 키 | 기본값 | 설명 |
|---|---|---|
| `avoidAdogen.enabled` | `true` | 표시 여부 |
| `avoidAdogen.minDepth` | `4` | 아도겐이 등장하는 최소 depth |
| `avoidAdogen.minLines` | `5` | 삼각형으로 인정할 최소 줄 수 |
| `avoidAdogen.maxConcurrent` | `0` | 동시 표시 개수 (0 = 무제한) |
| `avoidAdogen.languages` | `[]` | 대상 언어 ID (빈 배열 = 전부) |

화면에 여러 개가 떠서 산만하면 `maxConcurrent`를 1~2로 낮추세요. 가장 깊은 것만
남습니다.

팀 컨벤션에 맞춰 `minDepth`를 조정하면 컨벤션 알림으로도 쓸 수 있습니다.

## 설치

[Releases](https://github.com/LeeKwang-min/avoid-adogen/releases)에서 최신 `.vsix`를
내려받은 뒤:

1. `Cmd+Shift+P` (Windows·Linux는 `Ctrl+Shift+P`)
2. `Extensions: Install from VSIX...` 실행
3. 내려받은 `.vsix` 선택
4. VS Code 재시작

Marketplace에 올라가 있지 않으므로 Extensions 탭에서 검색해서는 찾을 수 없습니다.

직접 빌드하려면:

```bash
npm install
npm run package
```

생성된 `avoid-adogen-0.0.1.vsix`를 위와 같은 방법으로 설치합니다.

## 개발

```bash
npm run test     # 단위 테스트 (VS Code 불필요)
npm run watch    # 빌드 감시
```

F5로 익스텐션 개발 호스트를 띄우고 `fixtures/deep.ts`나 `fixtures/deep.dart`를 열면
세 단계를 한 화면에서 확인할 수 있습니다.

핵심 로직은 `vscode` API를 import하지 않는 순수 함수로 분리해서, VS Code를 띄우지
않고 테스트합니다. `vscode`에 의존하는 파일은 `render/imagePainter.ts`와
`extension.ts` 둘뿐입니다.

## 알려진 한계

**이미지 배치가 비공식 경로를 씁니다.** decoration의 `textDecoration` 속성에 CSS를
주입해 `position: absolute`를 넣습니다. 이게 없으면 이미지가 라인 박스를 차지해서
코드가 오른쪽으로 밀립니다. VS Code가 이 값을 이스케이프하도록 바뀌면 이미지가 보이지
않게 되지만, 에디터가 망가지지는 않습니다.

**세로 크기가 폰트 설정에 따라 조금 어긋납니다.** 이미지 높이는 `em`(글자 크기) 기준이고
줄 높이는 `lineHeight` 설정에 달려 있어서, 이미지가 삼각형을 살짝 넘거나 작게 보일 수
있습니다. 가로는 `ch`(문자 폭) 기준이라 정확합니다.

## 아트

모든 그래픽은 자체 창작 SVG입니다. 기존 게임 스프라이트를 사용하거나 참조하지
않았습니다.

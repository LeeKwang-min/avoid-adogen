import * as vscode from 'vscode';
import { ALL_DESIGNS, INK, renderSvg, svgDataUri } from '../designs';
import type { Design, Placement } from '../types';

/**
 * 티어마다 DecorationType을 하나씩 만들어 재사용한다.
 *
 * width/height가 DecorationType에 고정되므로 삼각형 크기에 맞춰 자유롭게 조절하면
 * 타입이 무한히 늘어난다. 티어당 하나로 고정해 3개만 유지한다.
 */
export class ImagePainter {
  private readonly types = new Map<number, vscode.TextEditorDecorationType>();

  constructor() {
    for (const design of ALL_DESIGNS) {
      this.types.set(design.tier, createType(design));
    }
  }

  paint(editor: vscode.TextEditor, placements: Placement[]): void {
    // 쓰이지 않은 티어도 빈 배열로 덮어써야 이전 프레임의 잔상이 지워진다.
    for (const [tier, type] of this.types) {
      const ranges = placements
        .filter((p) => p.design.tier === tier)
        .map((p) => new vscode.Range(p.line, 0, p.line, 0));
      editor.setDecorations(type, ranges);
    }
  }

  clear(editor: vscode.TextEditor): void {
    for (const type of this.types.values()) {
      editor.setDecorations(type, []);
    }
  }

  dispose(): void {
    for (const type of this.types.values()) {
      type.dispose();
    }
    this.types.clear();
  }
}

/**
 * 최상위에 dark용을 두고 light에서 덮어쓴다.
 * 테마별 before가 무시되는 환경에서도 최소한 다크 기준 이미지는 나온다.
 */
function createType(design: Design): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    before: attachment(design, INK.dark),
    light: { before: attachment(design, INK.light) },
    dark: { before: attachment(design, INK.dark) },
  });
}

/**
 * position: absolute가 핵심이다. 이미지를 라인 박스에서 빼내야 코드가 밀리지 않고
 * 여러 줄에 걸쳐 그려진다. 음수 마진만으로는 라인 높이가 변해 코드가 밀린다.
 *
 * textDecoration에 CSS를 주입하는 건 비공식 경로다. VS Code가 이 값을 이스케이프하면
 * 이미지가 안 보이게 되지만, 에디터가 망가지지는 않는다.
 */
function attachment(
  design: Design,
  ink: string
): vscode.ThemableDecorationAttachmentRenderOptions {
  return {
    contentIconPath: vscode.Uri.parse(svgDataUri(renderSvg(design.svg, ink))),
    width: `${design.widthCh}ch`,
    height: `${design.heightEm}em`,
    margin: `0 -${design.widthCh}ch 0 0`,
    textDecoration: 'none; position: absolute; transform: translateY(-42%); z-index: 0;',
  };
}

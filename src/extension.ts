import * as vscode from 'vscode';
import { isLanguageEnabled, readConfig, type AdogenConfig } from './config';
import { computePlacements } from './pipeline';
import { ImagePainter } from './render/imagePainter';
import type { Placement } from './types';

const DEBOUNCE_MS = 100;

let output: vscode.OutputChannel;
let painter: ImagePainter | undefined;
let config: AdogenConfig;
let timer: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel('Avoid Adogen');
  context.subscriptions.push(output);

  config = readConfig(vscode.workspace.getConfiguration('avoidAdogen'));
  painter = new ImagePainter();

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => schedule()),
    vscode.window.onDidChangeTextEditorVisibleRanges(() => schedule()),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) schedule();
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration('avoidAdogen')) return;
      config = readConfig(vscode.workspace.getConfiguration('avoidAdogen'));
      schedule();
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

    painter.paint(editor, collectVisiblePlacements(editor));
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

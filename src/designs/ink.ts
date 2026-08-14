/**
 * 캐릭터 선 색. 테마별로 다르게 주입한다.
 *
 * 파동권은 파란 글로우라 양쪽 테마에서 보이지만, 캐릭터는 얇은 선이라
 * 한 색으로 고정하면 한쪽 테마에서 배경에 묻힌다.
 */
export const INK = {
  dark: '#dbeeff',
  light: '#2b5f8f',
} as const;

/** SVG의 {{ink}} 플레이스홀더를 실제 색으로 바꾼다. */
export function renderSvg(svg: string, ink: string): string {
  return svg.replace(/\{\{ink\}\}/g, ink);
}

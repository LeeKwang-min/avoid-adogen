/**
 * SVG 원문을 base64 data URI로 만든다.
 *
 * base64를 쓰는 이유: URL 인코딩 방식은 `#`, `<`, 따옴표를 일일이 이스케이프해야
 * 하고 하나만 빠뜨려도 이미지가 조용히 사라진다.
 */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

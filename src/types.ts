export type LineDepth = {
  /** 0-based 문서 줄 번호 */
  line: number;
  /** tabSize 확장 후 시각적 들여쓰기 열 수. depth 판정에 쓴다. */
  visualCols: number;
  /** 선행 공백 문자 개수. Range 인덱스와 이미지 폭(ch)에 쓴다. */
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

export type FinderOptions = {
  minDepth: number;
  minLines: number;
  tabSize: number;
};

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

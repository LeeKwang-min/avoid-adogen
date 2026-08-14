export type AdogenConfig = {
  enabled: boolean;
  minDepth: number;
  minLines: number;
  maxConcurrent: number;
  languages: string[];
};

/** vscode.WorkspaceConfiguration이 만족하는 최소 인터페이스. 테스트를 위해 좁혀 받는다. */
export type ConfigSource = {
  get<T>(key: string, fallback: T): T;
};

export function readConfig(raw: ConfigSource): AdogenConfig {
  return {
    // unknown으로 받는다. get<boolean>이면 T가 리터럴 true로 좁혀져 !== false 비교가 막힌다.
    enabled: raw.get<unknown>('enabled', true) !== false,
    minDepth: positiveInt(raw.get<unknown>('minDepth', 4), 4, 1),
    minLines: positiveInt(raw.get<unknown>('minLines', 5), 5, 1),
    maxConcurrent: positiveInt(raw.get<unknown>('maxConcurrent', 0), 0, 0),
    languages: stringArray(raw.get<unknown>('languages', [])),
  };
}

/** 빈 목록은 "전부 허용"을 뜻한다. */
export function isLanguageEnabled(languageId: string, languages: string[]): boolean {
  return languages.length === 0 || languages.includes(languageId);
}

/** 사용자가 손으로 쓰는 값이라 타입을 신뢰할 수 없다. */
function positiveInt(value: unknown, fallback: number, min: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.floor(value));
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

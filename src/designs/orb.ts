import type { Design } from '../types';
import { DEFS } from './defs';

/** tier1 — 기 모음. 사방에서 기가 모여드는 작은 구슬. */
export const ORB: Design = {
  tier: 1,
  name: 'orb',
  widthCh: 8,
  heightEm: 3,
  minWidth: 8,
  minLines: 3,
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 128">
  <defs>${DEFS}</defs>
  <ellipse cx="112" cy="64" rx="72" ry="58" fill="url(#aura)" filter="url(#blur)"/>
  <circle cx="112" cy="64" r="34" fill="url(#core)"/>
  <circle cx="112" cy="64" r="15" fill="#ffffff" filter="url(#soft)"/>
  <g fill="none" stroke="#9fe4ff" stroke-width="2.5" opacity=".5" filter="url(#soft)" stroke-linecap="round">
    <path d="M22 28 Q66 46 88 56"/>
    <path d="M22 100 Q66 82 88 72"/>
    <path d="M54 12 Q82 40 96 50"/>
    <path d="M54 116 Q82 88 96 78"/>
  </g>
</svg>`,
};

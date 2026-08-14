import type { Design } from '../types';
import { DEFS } from './defs';

/**
 * tier2 — 클래식 파동권. 캐릭터가 두 손을 내밀고 파동권을 발사한다.
 * 캐릭터 손(x=64)에서 궤적(x=68~)이 이어지도록 좌표를 맞췄다.
 */
export const CLASSIC: Design = {
  tier: 2,
  name: 'classic',
  widthCh: 16,
  heightEm: 6,
  minWidth: 16,
  minLines: 5,
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 296 200">
  <defs>${DEFS}</defs>
  <g filter="url(#soft)">
    <path d="M74 100 Q136 72 208 94" stroke="url(#tail)" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M68 100 Q130 100 208 100" stroke="url(#tail)" stroke-width="11" fill="none" stroke-linecap="round"/>
    <path d="M74 100 Q136 128 208 106" stroke="url(#tail)" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M100 100 Q152 84 208 98" stroke="url(#tail)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M100 100 Q152 116 208 102" stroke="url(#tail)" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  </g>
  <ellipse cx="222" cy="100" rx="74" ry="90" fill="url(#aura)" filter="url(#blur)"/>
  <circle cx="222" cy="100" r="58" fill="url(#core)"/>
  <circle cx="222" cy="100" r="27" fill="#ffffff" filter="url(#soft)"/>
  <path d="M282 56 Q296 100 282 144" stroke="#cdf1ff" stroke-width="4.5" fill="none" opacity=".45" filter="url(#soft)" stroke-linecap="round"/>
  <g fill="#eafaff" opacity=".8">
    <circle cx="170" cy="50" r="2.6"/>
    <circle cx="152" cy="152" r="2.1"/>
    <circle cx="196" cy="34" r="1.9"/>
  </g>
  <g stroke="{{ink}}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="26" cy="74" r="11" fill="{{ink}}" stroke="none"/>
    <path d="M27 85 L31 128"/>
    <path d="M31 95 Q50 87 68 94"/>
    <path d="M31 103 Q50 111 68 102"/>
    <path d="M31 128 L22 154 L2 176"/>
    <path d="M31 128 L57 148 L69 178"/>
  </g>
</svg>`,
};

import type { Design } from '../types';
import { DEFS } from './defs';

/**
 * tier3 — 플레어. 캐릭터가 더 낮은 자세로 화면을 관통하는 광선을 쏜다.
 * 광선(x=76~)이 캐릭터 손(x=74)에서 시작한다.
 */
export const FLARE: Design = {
  tier: 3,
  name: 'flare',
  widthCh: 22,
  heightEm: 9,
  minWidth: 22,
  minLines: 8,
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 322 240">
  <defs>${DEFS}</defs>
  <rect x="76" y="108" width="246" height="24" fill="url(#beam)" filter="url(#blur)"/>
  <rect x="76" y="117" width="246" height="5" fill="url(#beam)"/>
  <g stroke="#dff5ff" stroke-width="3" opacity=".3" filter="url(#blur)">
    <line x1="222" y1="20" x2="222" y2="220"/>
    <line x1="152" y1="50" x2="292" y2="190"/>
    <line x1="292" y1="50" x2="152" y2="190"/>
  </g>
  <ellipse cx="222" cy="120" rx="100" ry="104" fill="url(#aura)" filter="url(#blur)"/>
  <circle cx="222" cy="120" r="70" fill="url(#core)"/>
  <circle cx="222" cy="120" r="38" fill="#ffffff" filter="url(#soft)"/>
  <circle cx="222" cy="120" r="88" fill="none" stroke="#bfeaff" stroke-width="2.5" opacity=".28" filter="url(#soft)"/>
  <g fill="#eafaff" opacity=".8">
    <circle cx="300" cy="58" r="2.6"/>
    <circle cx="130" cy="196" r="2.2"/>
  </g>
  <g stroke="{{ink}}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="30" cy="86" r="13" fill="{{ink}}" stroke="none"/>
    <path d="M31 99 L37 152"/>
    <path d="M37 112 Q57 103 78 111"/>
    <path d="M37 122 Q57 131 78 121"/>
    <path d="M37 152 L28 184 L2 212"/>
    <path d="M37 152 L68 176 L80 214"/>
  </g>
</svg>`,
};

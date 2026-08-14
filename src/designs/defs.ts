/**
 * 모든 디자인이 공유하는 그라데이션과 필터.
 *
 * 각 SVG는 독립된 data URI라서 id가 충돌하지 않는다. 그래서 쓰지 않는 정의가
 * 섞여 있어도 무해하고, 전부 그대로 심는 편이 관리하기 쉽다.
 */
export const DEFS = `
  <radialGradient id="core" cx="50%" cy="50%">
    <stop offset="0%" stop-color="#ffffff"/>
    <stop offset="28%" stop-color="#eafaff"/>
    <stop offset="52%" stop-color="#7dd8ff" stop-opacity=".92"/>
    <stop offset="78%" stop-color="#2a9dff" stop-opacity=".48"/>
    <stop offset="100%" stop-color="#0b5cff" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="aura" cx="50%" cy="50%">
    <stop offset="0%" stop-color="#4db8ff" stop-opacity=".55"/>
    <stop offset="60%" stop-color="#1a7fff" stop-opacity=".22"/>
    <stop offset="100%" stop-color="#0b5cff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="tail" x1="0" x2="1">
    <stop offset="0" stop-color="#7dd8ff" stop-opacity="0"/>
    <stop offset=".7" stop-color="#9fe4ff" stop-opacity=".5"/>
    <stop offset="1" stop-color="#eafaff" stop-opacity=".85"/>
  </linearGradient>
  <linearGradient id="beam" x1="0" x2="1">
    <stop offset="0" stop-color="#7dd8ff" stop-opacity="0"/>
    <stop offset=".55" stop-color="#ffffff" stop-opacity=".85"/>
    <stop offset="1" stop-color="#7dd8ff" stop-opacity="0"/>
  </linearGradient>
  <filter id="blur"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="soft"><feGaussianBlur stdDeviation="1.6"/></filter>
`;

import type { Design } from '../types';
import { CLASSIC } from './classic';
import { FLARE } from './flare';
import { ORB } from './orb';

export { CLASSIC, FLARE, ORB };
export { INK, renderSvg } from './ink';
export { svgDataUri } from './svgDataUri';

/** tier 내림차순. designSelector가 이 순서로 시도해 첫 통과를 채택한다. */
export const ALL_DESIGNS: Design[] = [FLARE, CLASSIC, ORB];

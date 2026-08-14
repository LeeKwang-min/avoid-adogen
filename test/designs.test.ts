import * as assert from 'assert';
import { ALL_DESIGNS, CLASSIC, FLARE, INK, ORB, renderSvg, svgDataUri } from '../src/designs';

describe('SVG 디자인 데이터', () => {
  const designs = [ORB, CLASSIC, FLARE];

  it('SVG가 온전한 문서다', () => {
    for (const d of designs) {
      assert.ok(d.svg.trimStart().startsWith('<svg'), `${d.name}이 <svg로 시작하지 않는다`);
      assert.ok(d.svg.trimEnd().endsWith('</svg>'), `${d.name}이 </svg>로 끝나지 않는다`);
      assert.ok(d.svg.includes('viewBox'), `${d.name}에 viewBox가 없다`);
      assert.ok(
        d.svg.includes('xmlns="http://www.w3.org/2000/svg"'),
        `${d.name}에 xmlns가 없다 — data URI로 넣으면 렌더링되지 않는다`
      );
    }
  });

  it('참조한 defs id가 실제로 정의되어 있다', () => {
    for (const d of designs) {
      const referenced = [...d.svg.matchAll(/url\(#([\w-]+)\)/g)].map((m) => m[1]);
      for (const id of referenced) {
        assert.ok(
          d.svg.includes(`id="${id}"`),
          `${d.name}이 정의되지 않은 #${id}를 참조한다`
        );
      }
    }
  });

  it('티어가 높을수록 크고 요구 조건도 높다', () => {
    assert.ok(CLASSIC.widthCh > ORB.widthCh);
    assert.ok(FLARE.widthCh > CLASSIC.widthCh);
    assert.ok(CLASSIC.heightEm > ORB.heightEm);
    assert.ok(FLARE.heightEm > CLASSIC.heightEm);
    assert.ok(CLASSIC.minWidth > ORB.minWidth);
    assert.ok(FLARE.minWidth > CLASSIC.minWidth);
    assert.ok(CLASSIC.minLines > ORB.minLines);
    assert.ok(FLARE.minLines > CLASSIC.minLines);
  });

  it('ALL_DESIGNS는 tier 내림차순이다', () => {
    assert.deepStrictEqual(
      ALL_DESIGNS.map((d) => d.tier),
      [3, 2, 1]
    );
  });

  it('minWidth는 widthCh를 담을 수 있어야 한다', () => {
    // 여백이 이미지 폭보다 좁으면 이미지가 코드 위로 삐져나온다
    for (const d of ALL_DESIGNS) {
      assert.ok(d.minWidth >= d.widthCh, `${d.name}의 minWidth가 widthCh보다 작다`);
    }
  });
});

describe('캐릭터 잉크 치환', () => {
  it('캐릭터가 있는 디자인은 {{ink}} 플레이스홀더를 쓴다', () => {
    assert.ok(CLASSIC.svg.includes('{{ink}}'), 'classic에 캐릭터가 없다');
    assert.ok(FLARE.svg.includes('{{ink}}'), 'flare에 캐릭터가 없다');
  });

  it('구슬은 캐릭터가 없다', () => {
    // 여백 8칸에는 캐릭터를 넣을 자리가 없다 — 기를 모으는 단계다
    assert.ok(!ORB.svg.includes('{{ink}}'));
  });

  it('치환하면 플레이스홀더가 남지 않는다', () => {
    for (const d of ALL_DESIGNS) {
      const rendered = renderSvg(d.svg, INK.dark);
      assert.ok(!rendered.includes('{{'), `${d.name}에 치환되지 않은 플레이스홀더가 남았다`);
      assert.ok(!rendered.includes('}}'), `${d.name}에 치환되지 않은 플레이스홀더가 남았다`);
    }
  });

  it('플레이스홀더를 모두 치환한다', () => {
    const rendered = renderSvg(CLASSIC.svg, '#ff0000');
    const occurrences = [...rendered.matchAll(/#ff0000/g)].length;
    // 캐릭터 그룹의 stroke와 머리 fill 두 곳
    assert.strictEqual(occurrences, 2);
  });

  it('테마별로 다른 색을 쓴다', () => {
    assert.notStrictEqual(INK.dark, INK.light);
  });
});

describe('svgDataUri', () => {
  it('base64 data URI를 만든다', () => {
    const uri = svgDataUri('<svg/>');
    assert.ok(uri.startsWith('data:image/svg+xml;base64,'));
  });

  it('디코딩하면 원본이 나온다', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>';
    const uri = svgDataUri(svg);
    const base64 = uri.replace('data:image/svg+xml;base64,', '');
    assert.strictEqual(Buffer.from(base64, 'base64').toString('utf8'), svg);
  });
});

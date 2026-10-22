import React from 'react';

// P153-B′: the brand card used by every page that has no per-tool OG image
// (home, category, guide, compare, about, terms, 404 — 237 pages measured).
//
// Until 2026-10-22 `public/og-default.png` was a 1×1 transparent PNG that the
// 2026-06-25 SEO round created as a deliberate placeholder ("until Plan B
// ships real images"). Plan B never shipped. The consequence was subtle and
// worse than a 404: the URL returned 200 with a valid image, so nothing
// looked broken to a scraper, but every social platform rendered a blank
// card. A 404 is a visible failure; a blank card is an invisible one.
//
// This component is the real card. It deliberately mirrors the layout of
// `og-card.tsx` (same gradient panel, same logo lockup, same white result
// card) so the brand card and the 200 per-tool cards read as one system.
//
// The right-hand panel is the point of the whole thing: ForgeFlowKit is a
// Decision Support System, not a calculator collection (AGENTS.md, 灵魂三维度
// §1). The per-tool cards prove that with a number; the brand card proves it
// with the question the product actually answers.

export interface OgDefaultCardProps {
  lang: 'en' | 'zh';
  url: string;
}

interface Copy {
  headline: string;
  sub: string;
  label: string;
  question: string;
  bands: { emoji: string; text: string }[];
}

const COPY: Record<'en' | 'zh', Copy> = {
  en: {
    headline: 'Make Smarter Business Decisions',
    sub: 'Free calculators that tell you what to do next, not just what the number is.',
    label: 'DECISION SUPPORT',
    question: 'What should I do next?',
    bands: [
      { emoji: '\u{1F7E2}', text: 'Healthy' },
      { emoji: '\u{1F7E1}', text: 'Watch' },
      { emoji: '\u{1F7E0}', text: 'Act now' },
    ],
  },
  zh: {
    headline: '做出更聪明的商业决策',
    sub: '免费计算器不只给数字，更告诉你下一步该做什么。',
    label: '决策支持系统',
    question: '下一步该做什么？',
    bands: [
      { emoji: '\u{1F7E2}', text: '健康' },
      { emoji: '\u{1F7E1}', text: '关注' },
      { emoji: '\u{1F7E0}', text: '立即行动' },
    ],
  },
};

// Brand gradient, derived from the site's own tokens (src/styles/global.css:
// --color-brand #7C3AED, --color-brand-dark #6D28D9). Deliberately NOT a
// category palette: a brand card that wears one category's colours would
// read as a category card.
const GRADIENT_FROM = '#5B21B6';
const GRADIENT_VIA = '#7C3AED';
const GRADIENT_TO = '#A855F7';
const ACCENT = '#7C3AED';

export function OgDefaultCard(props: OgDefaultCardProps) {
  const { lang, url } = props;
  const c = COPY[lang];

  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        background: `linear-gradient(135deg, ${GRADIENT_FROM}, ${GRADIENT_VIA} 55%, ${GRADIENT_TO})`,
        padding: '80px',
        color: 'white',
        fontFamily: 'Inter',
        position: 'relative',
      }}
    >
      {/* Left column: brand lockup + positioning */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '24px',
            fontWeight: 700,
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
            }}
          >
            🎬
          </div>
          ForgeFlowKit
        </div>

        <div
          style={{
            fontSize: '52px',
            fontWeight: 800,
            marginTop: '56px',
            lineHeight: 1.15,
            maxWidth: '560px',
            display: 'flex',
          }}
        >
          {c.headline}
        </div>

        <div
          style={{
            fontSize: '26px',
            opacity: 0.92,
            marginTop: '20px',
            lineHeight: 1.4,
            maxWidth: '540px',
            display: 'flex',
          }}
        >
          {c.sub}
        </div>

        <div
          style={{
            fontSize: '20px',
            opacity: 0.7,
            position: 'absolute',
            bottom: 0,
            display: 'flex',
          }}
        >
          {url}
        </div>
      </div>

      {/* Right column: the decision the product exists to produce */}
      <div
        style={{
          background: 'rgba(255,255,255,0.95)',
          color: '#1F2937',
          borderRadius: '24px',
          padding: '36px',
          width: '460px',
          height: '400px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            fontSize: '20px',
            color: '#6B7280',
            display: 'flex',
          }}
        >
          {c.label}
        </div>

        <div
          style={{
            fontSize: '36px',
            fontWeight: 800,
            lineHeight: 1.25,
            marginTop: '14px',
            color: ACCENT,
            display: 'flex',
          }}
        >
          {c.question}
        </div>

        <div
          style={{
            height: '2px',
            background: '#E5E7EB',
            marginTop: '24px',
            display: 'flex',
          }}
        />

        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {c.bands.map((b) => (
            <div
              key={b.text}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                fontSize: '22px',
                color: '#374151',
              }}
            >
              <span style={{ fontSize: '24px' }}>{b.emoji}</span>
              <span>{b.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { CATEGORY_PALETTE } from './category-palette';

export interface OgCardProps {
  title: string;
  categoryId: string;
  categoryName: string;
  lang: 'en' | 'zh';
  headline: string;
  headlineUnit: string;
  headlineLabel: string;
  trend?: string;
  url: string;
}

export function OgCard(props: OgCardProps) {
  const { title, categoryId, categoryName, lang, headline, headlineUnit, headlineLabel, trend, url } = props;
  const palette = CATEGORY_PALETTE[categoryId] ?? CATEGORY_PALETTE.A;

  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
        padding: '80px',
        color: 'white',
        fontFamily: 'Inter',
        position: 'relative',
      }}
    >
      {/* Left column: title block */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          position: 'relative',
        }}
      >
        {/* Logo */}
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

        {/* Title */}
        <div
          style={{
            fontSize: '56px',
            fontWeight: 800,
            marginTop: '60px',
            lineHeight: 1.1,
            maxWidth: '600px',
            display: 'flex',
          }}
        >
          {title}
        </div>

        {/* Category badge */}
        <div
          style={{
            fontSize: '24px',
            opacity: 0.9,
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{palette.emoji}</span>
          <span>{categoryName}</span>
        </div>

        {/* URL footer */}
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

      {/* Right column: result card */}
      <div
        style={{
          background: 'rgba(255,255,255,0.95)',
          color: '#1F2937',
          borderRadius: '24px',
          padding: '40px',
          width: '460px',
          height: '360px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            fontSize: '80px',
            fontWeight: 900,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'baseline',
            color: palette.primary,
          }}
        >
          <span>{headline}</span>
          <span style={{ fontSize: '32px', fontWeight: 600, marginLeft: '8px', color: '#6B7280' }}>
            {headlineUnit}
          </span>
        </div>
        <div
          style={{
            fontSize: '24px',
            color: '#6B7280',
            marginTop: '16px',
            display: 'flex',
          }}
        >
          {headlineLabel}
        </div>
        {trend && (
          <div
            style={{
              fontSize: '20px',
              color: '#10B981',
              marginTop: '16px',
              fontWeight: 600,
              display: 'flex',
            }}
          >
            {trend}
          </div>
        )}
      </div>
    </div>
  );
}

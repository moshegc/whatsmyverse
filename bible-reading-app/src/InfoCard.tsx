// src/InfoCard.tsx
//
// Reusable information card for series and section explanations.
// Mirrors the DetailCard frosted-glass + bottom-sheet pattern exactly.
// Body text is rendered as Markdown, supporting **bold**, [links](url), etc.

import { useRef, useCallback, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocale } from './LocaleContext';
import { t } from './i18n';

interface InfoCardToggle {
  enabled: boolean;
  onToggle: () => void;
}

interface InfoCardProps {
  title: string;
  body: string;
  onClose: () => void;
  toggle?: InfoCardToggle;
  /** Accent color for the title (used for series cards) */
  accentColor?: string;
}

function InfoCard({ title, body, onClose, toggle, accentColor }: InfoCardProps) {
  const { locale } = useLocale();
  const cardRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startClose = useCallback((currentOffset = 0) => {
    if (closingRef.current) return;
    closingRef.current = true;

    const card = cardRef.current;
    if (!card) { onClose(); return; }

    const isMobile = window.innerWidth <= 767 || window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
    if (isMobile) {
      card.style.animation = 'none';
      card.style.transform = `translateY(${currentOffset}px)`;
      void card.offsetHeight;
      const totalH = card.offsetHeight;
      const remaining = Math.max(0, totalH - currentOffset);
      const dur = Math.max(100, Math.round((remaining / Math.max(totalH, 1)) * 280));
      card.style.transition = `transform ${dur}ms ease-in`;
      card.style.transform = `translateY(${totalH}px)`;
      closeTimerRef.current = setTimeout(onClose, dur);
    } else {
      card.style.transition = 'transform 180ms ease-in, opacity 180ms ease-in';
      card.style.transform = `translate(-50%, -50%) translateY(${currentOffset + 24}px)`;
      card.style.opacity = '0';
      closeTimerRef.current = setTimeout(onClose, 180);
    }
  }, [onClose]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
  }, []);

  // Drag-to-close for the drag header
  useEffect(() => {
    const header = cardRef.current?.querySelector<HTMLElement>('.detail-card-drag-header');
    if (!header) return;

    let startY = 0;
    let wasDrag = false;
    let active = false;

    const onMove = (e: PointerEvent) => {
      if (!active || closingRef.current) return;
      const offset = Math.max(0, e.clientY - startY);
      if (offset > 4) wasDrag = true;

      const card = cardRef.current;
      if (!card) return;
      const isMobile = window.innerWidth <= 767 || window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
      card.style.transition = 'none';
      card.style.transform = isMobile
        ? `translateY(${offset}px)`
        : `translate(-50%, -50%) translateY(${offset}px)`;

      if (offset > 120) {
        active = false;
        cleanup();
        startClose(offset);
      }
    };

    const onUp = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      cleanup();

      const offset = Math.max(0, e.clientY - startY);
      const card = cardRef.current;
      if (!card || closingRef.current) return;

      if (offset > 60) {
        startClose(offset);
      } else {
        void card.offsetHeight;
        const isMobile = window.innerWidth <= 767 || window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
        card.style.transition = 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)';
        card.style.transform = isMobile ? 'translateY(0)' : 'translate(-50%, -50%)';
      }
    };

    const onDown = (e: PointerEvent) => {
      if (closingRef.current) return;
      const card = cardRef.current;
      if (card) { card.style.animation = 'none'; }
      startY = e.clientY;
      wasDrag = false;
      active = true;
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      e.stopPropagation();
    };

    const onClick = (e: MouseEvent) => {
      e.stopPropagation();
      if (!wasDrag) startClose(0);
      wasDrag = false;
    };

    function cleanup() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    header.addEventListener('pointerdown', onDown);
    header.addEventListener('click', onClick);
    return () => {
      header.removeEventListener('pointerdown', onDown);
      header.removeEventListener('click', onClick);
      cleanup();
    };
  }, [startClose]);

  const enabledLabel = t('seriesEnabled', locale);
  const disabledLabel = t('seriesDisabled', locale);

  return (
    <>
      {/* Backdrop – captures clicks outside the card */}
      <div className="info-card-backdrop" onClick={() => startClose(0)} />
      <div
        ref={cardRef}
        className="detail-card info-card"
        dir={locale === 'he' ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
      {/* Drag header */}
      <div className="detail-card-drag-header">
        <div className="bottom-sheet-handle" />
        <button
          className="detail-card-close"
          onClick={(e) => { e.stopPropagation(); startClose(0); }}
          aria-label="Close"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
        </button>
      </div>

      <div className="detail-card-body">
        {/* Title row with optional toggle */}
        <div className="info-card-header" style={{ flexShrink: 0 }}>
          <h3
            className="detail-card-title info-card-title"
            style={accentColor ? { color: accentColor } : undefined}
          >
            {title}
          </h3>
          {toggle && (
            <label className="info-toggle" title={toggle.enabled ? enabledLabel : disabledLabel}>
              <input
                type="checkbox"
                checked={toggle.enabled}
                onChange={toggle.onToggle}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="info-toggle-track">
                <span className="info-toggle-thumb" />
              </span>
              <span className="info-toggle-label">
                {toggle.enabled ? enabledLabel : disabledLabel}
              </span>
            </label>
          )}
        </div>

        {/* Body text — rendered as Markdown */}
        <div className="info-card-body-text" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <ReactMarkdown
            components={{
              // Open all links in a new tab safely
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              ),
              // Use detail-card-description styling for paragraphs
              p: ({ children }) => (
                <p className="detail-card-description">{children}</p>
              ),
            }}
          >
            {body}
          </ReactMarkdown>
        </div>
      </div>
    </div>
    </>
  );
}

export default InfoCard;

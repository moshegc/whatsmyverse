// src/DetailCard.tsx

import { useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import type { TimelineItem } from './generateTimelineData';
import type { HistoricalTimelineItem } from './generateHistoricalTimelineData';
import { historicalEventCategories } from './historicalEvents';
import { schedules } from './config';
import { useLocale } from './LocaleContext';
import { localize, getBookName } from './i18n';
import { gematriya } from '@hebcal/hdate';
import { HDate } from '@hebcal/core';

export type SelectedItem =
  | { kind: 'reading'; data: TimelineItem }
  | { kind: 'historical'; data: HistoricalTimelineItem };

interface DetailCardProps {
  item: SelectedItem;
  onClose: () => void;
}

export interface DetailCardHandle {
  startClose: () => void;
}

function getHistoricalYearInfo(dateString: string | undefined, dateValue: Date, locale: 'en' | 'he') {
  if (!dateString) return null;
  const s = dateString.trim();
  const bceMatch = s.match(/^(\d+)\s*(?:BCE|BC)$/i);
  const ceMatch = s.match(/^(\d+)\s*(?:CE|AD)$/i);
  const bareYearMatch = s.match(/^(\d+)$/);

  if (bceMatch || ceMatch || bareYearMatch) {
    let hebYear: number;
    const utcYear = dateValue.getUTCFullYear();
    const utcMonth = dateValue.getUTCMonth();
    const utcDate = dateValue.getUTCDate();

    if (bareYearMatch) {
      hebYear = parseInt(bareYearMatch[1], 10);
    } else {
      const localDate = new Date(utcYear, utcMonth, utcDate);
      if (utcYear < 100) localDate.setFullYear(utcYear);
      const hd = new HDate(localDate);
      hebYear = hd.getFullYear();
    }

    const hebYearStr = locale === 'he' ? gematriya(hebYear) + ' (' + hebYear.toString() + ')' : hebYear.toString();
    const gregYearStr = utcYear <= 0
      ? (locale === 'he' ? `${1 - utcYear} לפנה״ס` : `${1 - utcYear} BCE`)
      : (locale === 'he' ? `${utcYear} לספירה` : `${utcYear} CE`);

    return { hebYearStr, gregYearStr };
  }
  return null;
}

function DualDateDisplay({
  startDate,
  endDate,
  startStr,
  endStr,
  locale
}: {
  startDate: Date;
  endDate?: Date;
  startStr?: string;
  endStr?: string;
  locale: 'en' | 'he';
}) {
  let hebLine = '';
  let ceLine = '';

  const getHebDateStr = (date: Date) => {
    const hd = new HDate(date);
    return locale === 'he' ? hd.renderGematriya() + ' (' + hd.yy + ')' : hd.render();
  };

  const getCEDateStr = (date: Date) => {
    const formatted = new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
    const utcYear = date.getUTCFullYear();
    const suffix = utcYear <= 0
      ? (locale === 'he' ? 'לפנה״ס' : 'BCE')
      : (locale === 'he' ? 'לספירה' : 'CE');
    return `${formatted} ${suffix}`;
  };

  const startYear = getHistoricalYearInfo(startStr, startDate, locale);
  const endYear = endDate ? getHistoricalYearInfo(endStr, endDate, locale) : null;

  if (startYear && endYear) {
    hebLine = `${startYear.hebYearStr} - ${endYear.hebYearStr}`;
    ceLine = `${startYear.gregYearStr} - ${endYear.gregYearStr}`;
  } else if (startYear && !endDate) {
    hebLine = startYear.hebYearStr;
    ceLine = startYear.gregYearStr;
  } else if (startYear && endDate) {
    hebLine = `${startYear.hebYearStr} — ${getHebDateStr(endDate)}`;
    ceLine = `${startYear.gregYearStr} — ${getCEDateStr(endDate)}`;
  } else {
    // Full dates
    if (endDate) {
        if (startDate.getTime() === endDate.getTime()) {
           hebLine = getHebDateStr(startDate);
           ceLine = getCEDateStr(startDate);
        } else {
           hebLine = `${getHebDateStr(startDate)} — ${getHebDateStr(endDate)}`;
           ceLine = `${getCEDateStr(startDate)} — ${getCEDateStr(endDate)}`;
        }
    } else {
      hebLine = getHebDateStr(startDate);
      ceLine = getCEDateStr(startDate);
    }
  }

  return (
    <div className="detail-card-dates" style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: locale === 'he' ? 'right' : 'left' }}>
      <span style={{ fontWeight: 600, fontSize: '1.05em', color: 'var(--color-primary, #1a365d)' }}>
        {hebLine}
      </span>
      <span style={{ fontSize: '0.9em', opacity: 0.8 }}>
        {ceLine}
      </span>
    </div>
  );
}

const DetailCard = forwardRef<DetailCardHandle, DetailCardProps>(({ item, onClose }, ref) => {
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
      // Cancel the CSS entry animation (and any fill) so it doesn't override
      // the JS exit transition via the animation cascade layer.
      card.style.animation = 'none';
      // Pin the current (or drag) position explicitly as the transition's "from" state.
      card.style.transform = `translateY(${currentOffset}px)`;
      void card.offsetHeight; // force reflow — commit the "from" state
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

  // Cancel pending timer if unmounted externally
  useEffect(() => () => {
    if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
  }, []);

  useImperativeHandle(ref, () => ({ startClose: () => startClose(0) }), [startClose]);

  // Attach native pointer listeners to the drag header so movement is tracked
  // reliably across the whole window (avoids React delegation issues).
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
        // Snap back with a spring feel
        const isMobile = window.innerWidth <= 767 || window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
        // Force a reflow so the browser sees the current (dragged) transform
        // before we apply the transition, ensuring it actually animates.
        void card.offsetHeight;
        card.style.transition = 'transform 0.22s cubic-bezier(0.34,1.56,0.64,1)';
        card.style.transform = isMobile ? 'translateY(0)' : 'translate(-50%, -50%)';
      }
    };

    const onDown = (e: PointerEvent) => {
      if (closingRef.current) return;
      // Cancel the CSS entry animation so it doesn't fight drag transforms.
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

  return (
    <div ref={cardRef} className="detail-card" onClick={(e) => e.stopPropagation()}>
      {/* Drag header — darker strip, drag down or click to close */}
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

      {item.kind === 'reading' && <div className="detail-card-body"><ReadingDetail item={item.data} locale={locale} /></div>}
      {item.kind === 'historical' && <div className="detail-card-body"><HistoricalDetail item={item.data} locale={locale} /></div>}
    </div>
  );
});

DetailCard.displayName = 'DetailCard';

// ── Reading schedule detail ─────────────────────────────────────────────────

function getNumber(num: number, locale: 'en' | 'he'): string {
  if (locale === 'he') {
    return gematriya(num);
  }
  return num.toString();
}


function ReadingDetail({ item, locale }: { item: TimelineItem; locale: 'en' | 'he' }) {
  const bookName = getBookName(item.verses[0]?.book || '', locale);
  const schedule = schedules.find((s) => s.id === item.scheduleId);
  const chapter = getNumber(item.verses[0]?.chapter || 0, locale);
  const verse = getNumber(item.verses[0]?.verse || 0, locale);

  const titleText =
    schedule?.displayMode === 'verse'
      ? `${bookName} ${chapter} ${verse}`
      : `${bookName} ${chapter}`;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <h3 className="detail-card-title">{titleText}</h3>
          <DualDateDisplay startDate={item.start} endDate={item.end} locale={locale} />
        </div>
        {schedule && (
          <span className="detail-card-tag" style={{ background: 'rgba(26,54,93,0.08)', color: 'var(--color-primary)' }}>
            {localize(schedule.name, schedule.nameHe, locale)}
          </span>
        )}
      </div>

      {/* Verses */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {item.verses.map((v, i) => (
              <tr key={i} className="detail-card-verse" >
            {locale === 'he' ? (
            <>
              <td className="detail-card-verse-text" style={{ textAlign: 'left', paddingRight: 8, whiteSpace: 'nowrap', verticalAlign: 'top', paddingBottom: 8 }}>{getNumber(v.verse, locale)}</td>
              <td className="detail-card-verse-text" style={{ textAlign: 'right', paddingRight: 8, paddingBottom: 8 }}>{v.text}</td>
            </>
            ) : (
            <>
              <td className="detail-card-verse-text" style={{ textAlign: 'right', paddingRight: 8, paddingBottom: 8 }}>{v.text}</td>
              <td className="detail-card-verse-text" style={{ textAlign: 'left', whiteSpace: 'nowrap', verticalAlign: 'top', paddingBottom: 8 }}>{getNumber(v.verse, locale)}</td>
            </>
            )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Historical event detail ─────────────────────────────────────────────────

function HistoricalDetail({ item, locale }: { item: HistoricalTimelineItem; locale: 'en' | 'he' }) {
  const ev = item._event;
  const category = historicalEventCategories.find((c) => c.id === ev.categoryId);
  const pillClass = `detail-card-tag pill-${ev.categoryId}`;

  const startStr = ev.startDate || ev.endDate;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexShrink: 0 }}>
        <div>
          <h3 className="detail-card-title">{localize(ev.name, ev.nameHe, locale)}</h3>
          <DualDateDisplay startDate={item.start} endDate={item.end} startStr={startStr} endStr={ev.endDate} locale={locale} />
        </div>
        {category && (
          <span className={pillClass}>
            {localize(category.name, category.nameHe, locale)}
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {(ev.description || ev.descriptionHe) && (
          <p className="detail-card-description" style={{ marginTop: 0 }}>
            {localize(ev.description || '', ev.descriptionHe, locale)}
          </p>
        )}
        {(locale === 'he' && ev.linkHe ? ev.linkHe : ev.link) && (
          <a
            href={locale === 'he' && ev.linkHe ? ev.linkHe : ev.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '0.8rem', color: 'var(--color-primary, #1a365d)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, opacity: 0.75 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
            {locale === 'he' ? 'ויקיפדיה' : 'Wikipedia'}
          </a>
        )}
      </div>
    </>
  );
}

export default DetailCard;

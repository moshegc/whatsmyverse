// src/DetailCard.tsx

import type { TimelineItem } from './generateTimelineData';
import type { HistoricalTimelineItem } from './generateHistoricalTimelineData';
import { historicalEventCategories } from './historicalEvents';
import { schedules } from './config';
import { useLocale } from './LocaleContext';
import { localize, getBookName, renderHDate } from './i18n';

export type SelectedItem =
  | { kind: 'reading'; data: TimelineItem }
  | { kind: 'historical'; data: HistoricalTimelineItem };

interface DetailCardProps {
  item: SelectedItem;
  onClose: () => void;
  /** Position for desktop frosted card (relative to timeline canvas) */
  position?: { x: number; y: number };
}

const DetailCard = ({ item, onClose, position }: DetailCardProps) => {
  const { locale } = useLocale();

  // Compute the card position style (desktop only; mobile CSS overrides)
  const posStyle: React.CSSProperties = position
    ? {
        top: Math.max(16, position.y - 20),
        left: Math.max(16, position.x + 16),
      }
    : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };

  return (
    <div className="detail-card" style={posStyle} onClick={(e) => e.stopPropagation()}>
      {/* Mobile drag handle */}
      <div className="bottom-sheet-handle" />

      {/* Close button (desktop only) */}
      <button className="detail-card-close" onClick={onClose} aria-label="Close">
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
      </button>

      {item.kind === 'reading' && <ReadingDetail item={item.data} locale={locale} />}
      {item.kind === 'historical' && <HistoricalDetail item={item.data} locale={locale} />}
    </div>
  );
};

// ── Reading schedule detail ─────────────────────────────────────────────────

function ReadingDetail({ item, locale }: { item: TimelineItem; locale: 'en' | 'he' }) {
  const bookName = getBookName(item.verses[0]?.book || '', locale);
  const schedule = schedules.find((s) => s.id === item.scheduleId);
  const chapter = item.verses[0]?.chapter;
  const verse = item.verses[0]?.verse;

  const titleText =
    schedule?.displayMode === 'verse'
      ? `${bookName} ${chapter}:${verse}`
      : `${bookName} ${chapter}`;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 className="detail-card-title">{titleText}</h3>
          <div className="detail-card-dates">
            {renderHDate(item.start, locale)} — {renderHDate(item.end, locale)}
          </div>
        </div>
        {schedule && (
          <span className="detail-card-tag" style={{ background: 'rgba(26,54,93,0.08)', color: 'var(--color-primary)' }}>
            {localize(schedule.name, schedule.nameHe, locale)}
          </span>
        )}
      </div>

      {/* Verses */}
      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
        {item.verses.map((v, i) => (
          <div className="detail-card-verse" key={i} style={{ marginBottom: 8 }}>
            <p className="detail-card-verse-text">
              <sup style={{ fontWeight: 600, fontStyle: 'normal', marginRight: 2 }}>{v.verse}</sup>
              {v.text}
            </p>
            <div className="detail-card-verse-ref">
              {getBookName(v.book, locale)} {v.chapter}:{v.verse}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Historical event detail ─────────────────────────────────────────────────

function HistoricalDetail({ item, locale }: { item: HistoricalTimelineItem; locale: 'en' | 'he' }) {
  const ev = item._event;
  const category = historicalEventCategories.find((c) => c.id === ev.categoryId);
  const pillClass = `detail-card-tag pill-${ev.categoryId}`;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 className="detail-card-title">{localize(ev.name, ev.nameHe, locale)}</h3>
          <div className="detail-card-dates">
            {renderHDate(item.start, locale)}
            {item.end ? ` — ${renderHDate(item.end, locale)}` : ''}
          </div>
        </div>
        {category && (
          <span className={pillClass}>
            {localize(category.name, category.nameHe, locale)}
          </span>
        )}
      </div>

      {(ev.description || ev.descriptionHe) && (
        <p className="detail-card-description">
          {localize(ev.description || '', ev.descriptionHe, locale)}
        </p>
      )}
    </>
  );
}

export default DetailCard;

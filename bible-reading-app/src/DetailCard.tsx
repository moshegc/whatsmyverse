// src/DetailCard.tsx

import type { TimelineItem } from './generateTimelineData';
import type { HistoricalTimelineItem } from './generateHistoricalTimelineData';
import { historicalEventCategories } from './historicalEvents';
import { schedules } from './config';
import { useLocale } from './LocaleContext';
import { localize, getBookName, renderHDate } from './i18n';
import { gematriya } from '@hebcal/hdate';

export type SelectedItem =
  | { kind: 'reading'; data: TimelineItem }
  | { kind: 'historical'; data: HistoricalTimelineItem };

interface DetailCardProps {
  item: SelectedItem;
  onClose: () => void;
}

const DetailCard = ({ item, onClose }: DetailCardProps) => {
  const { locale } = useLocale();

  return (
    <div className="detail-card" onClick={(e) => e.stopPropagation()}>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 className="detail-card-title">{titleText}</h3>
          <div className="detail-card-dates">
            {renderHDate(item.start, locale)} <br /> {renderHDate(item.end, locale)}
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

// src/TimelineView.tsx

import { useEffect, useRef, useState } from 'react';
import { Timeline } from 'vis-timeline';
import { DataSet } from 'vis-data';
import { HDate } from '@hebcal/core';
import { generateTimelineData, type TimelineItem } from './generateTimelineData';
import { schedules } from './config';
import { generateColorFromString } from './colorUtils';
import { generateHistoricalTimelineData, type HistoricalTimelineItem } from './generateHistoricalTimelineData';
import { historicalEventCategories } from './historicalEvents';
import { useLocale } from './LocaleContext';
import { localize, getBookName, renderHDate, t } from './i18n';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const ONE_YEAR_MS = ONE_DAY_MS * 365;

function getTextColorForBackground(rgbColor: string): 'black' | 'white' {
    const rgb = rgbColor.match(/\d+/g);
    if (!rgb) return 'black'; // default to black
    const [r, g, b] = rgb.map(Number);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 186 ? 'black' : 'white';
}

type SelectedItem =
    | { kind: 'reading'; data: TimelineItem }
    | { kind: 'historical'; data: HistoricalTimelineItem };

const TimelineView = () => {
    const timelineRef = useRef(null);
    const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
    const { locale, toggleLocale } = useLocale();
    const savedWindowRef = useRef<{ start: Date; end: Date } | null>(null);
    const timelineInstanceRef = useRef<Timeline | null>(null);

    useEffect(() => {
        // ── Reading-schedule items ──────────────────────────────────────
        const readingItems = generateTimelineData(locale);

        // ── Historical-event items ─────────────────────────────────────
        const historicalItems = generateHistoricalTimelineData(locale);

        // Merge both sets into a single DataSet
        const items = new DataSet<TimelineItem | HistoricalTimelineItem>([
            ...readingItems,
            ...historicalItems,
        ]);

        // ── Groups ─────────────────────────────────────────────────────
        // Historical categories first (order < 100), then reading schedules.
        // Categories with stacked:true get per-group stack override.
        const historicalGroups = historicalEventCategories.map(cat => ({
            id: cat.id,
            content: localize(cat.name, cat.nameHe, locale),
            order: cat.order,
            style: `color: ${cat.color};`,
            className: 'hist-group',
            ...(cat.stacked ? { stack: true } : {}),
        }));

        const readingGroups = schedules.map((s, idx) => ({
            id: s.id,
            content: localize(s.name, s.nameHe, locale),
            order: 100 + idx,
            style: `color: ${generateColorFromString(s.id)};`,
        }));

        const groups = new DataSet([...historicalGroups, ...readingGroups]);

        const options = {
            stack: false,
            width: '100%',
            height: '100%',
            zoomMin: ONE_DAY_MS,
            zoomMax: ONE_YEAR_MS * 6000,
            min: new HDate(1, 1, 1).greg().getTime() - ONE_YEAR_MS, // Start a bit before the first possible date
            max: new HDate(1, 1, 6000).greg().getTime() + ONE_YEAR_MS, // End a bit after the last possible date 
            calendar: 'hebrew',
            rtl: locale === 'he',
            locale: locale
        };

        let timeline: Timeline | null = null;
        if (timelineRef.current) {
            timeline = new Timeline(timelineRef.current, items, groups, options);
            timelineInstanceRef.current = timeline;

            // Restore previous window or fit to all items
            if (savedWindowRef.current) {
                timeline.setWindow(savedWindowRef.current.start, savedWindowRef.current.end, { animation: false });
            } else {
                timeline.fit();
            }

            timeline.on('select', (properties) => {
                const { items: selectedItems } = properties;
                if (selectedItems.length > 0) {
                    const raw: any = items.get(selectedItems[0]);
                    if (raw && typeof raw._event !== 'undefined') {
                        setSelectedItem({ kind: 'historical', data: raw as HistoricalTimelineItem });
                    } else if (raw) {
                        setSelectedItem({ kind: 'reading', data: raw as TimelineItem });
                    }
                } else {
                    setSelectedItem(null);
                }
            });

            timeline.on('click', (properties) => {
                if (!properties.item) {
                    setSelectedItem(null);
                }
            });
        }

        return () => {
            if (timeline) {
                timeline.destroy();
                setSelectedItem(null);
            }
            // Clean up RTL artifacts that vis-timeline's destroy() doesn't remove
            if (timelineRef.current) {
                const el = timelineRef.current as HTMLElement;
                el.style.direction = '';
                el.classList.remove('vis-rtl');
                el.innerHTML = '';
            }
        };
    }, [locale]);

    const popupBackgroundColor = selectedItem
        ? selectedItem.kind === 'reading'
            ? generateColorFromString(selectedItem.data.scheduleId)
            : historicalEventCategories.find(c => c.id === selectedItem.data._event.categoryId)?.color || '#666'
        : 'white';
    const popupTextColor = getTextColorForBackground(popupBackgroundColor);

    return (
        <div style={{ position: 'relative', height: '50vh', width: '60vh' }} dir={locale === 'he' ? 'rtl' : 'ltr'}>
            {/* Locale toggle button */}
            <button
                onClick={toggleLocale}
                style={{
                    position: 'absolute',
                    top: '8px',
                    right: locale === 'he' ? undefined : '8px',
                    left: locale === 'he' ? '8px' : undefined,
                    zIndex: 1001,
                    padding: '4px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    background: '#fff',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '14px',
                }}
            >
                {t('localeToggle', locale)}
            </button>
            <div ref={timelineRef} style={{ height: '100%', width: '100%' }} />
            {selectedItem && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: popupBackgroundColor,
                        color: popupTextColor,
                        border: '1px solid #ccc',
                        borderRadius: '8px',
                        padding: '15px',
                        zIndex: 1000,
                        width: '350px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        fontFamily: 'sans-serif'
                    }}
                >
                    <button
                        onClick={() => setSelectedItem(null)}
                        style={{
                            position: 'absolute',
                            top: '8px',
                            right: locale === 'he' ? undefined : '8px',
                            left: locale === 'he' ? '8px' : undefined,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: popupTextColor
                        }}
                    >
                        &times;
                    </button>

                    {/* ── Reading-schedule popup ─────────────────── */}
                    {selectedItem.kind === 'reading' && (() => {
                        const item = selectedItem.data;
                        const bookName = getBookName(item.verses[0].book, locale);
                        return (
                            <>
                                <h3 style={{ marginTop: 0, marginBottom: '5px', borderBottom: `1px solid ${popupTextColor === 'black' ? '#eee' : '#444'}`, paddingBottom: '5px' }}>
                                    {bookName}{' '}
                                    {item.verses[0].chapter}
                                    {schedules.find(s => s.id === item.scheduleId)?.displayMode === 'verse' && `:${item.verses[0].verse}`}
                                </h3>
                                <h4 style={{ marginTop: 0, marginBottom: '10px', fontStyle: 'italic' }}>
                                    {renderHDate(item.start, locale)} - {renderHDate(item.end, locale)}
                                </h4>
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {item.verses.map((v, index) => (
                                        <div key={index} style={{ marginBottom: '8px' }}>
                                            <sup style={{ fontWeight: 'bold' }}>{v.verse}</sup> {v.text}
                                        </div>
                                    ))}
                                </div>
                            </>
                        );
                    })()}

                    {/* ── Historical-event popup ─────────────────── */}
                    {selectedItem.kind === 'historical' && (() => {
                        const ev = selectedItem.data._event;
                        return (
                            <>
                                <h3 style={{ marginTop: 0, marginBottom: '5px', borderBottom: `1px solid ${popupTextColor === 'black' ? '#eee' : '#444'}`, paddingBottom: '5px' }}>
                                    {localize(ev.name, ev.nameHe, locale)}
                                </h3>
                                <h4 style={{ marginTop: 0, marginBottom: '10px', fontStyle: 'italic' }}>
                                    {renderHDate(selectedItem.data.start, locale)}
                                    {selectedItem.data.end ? ` — ${renderHDate(selectedItem.data.end, locale)}` : ''}
                                </h4>
                                {(ev.description || ev.descriptionHe) && (
                                    <p style={{ margin: 0 }}>{localize(ev.description || '', ev.descriptionHe, locale)}</p>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
};

export default TimelineView;

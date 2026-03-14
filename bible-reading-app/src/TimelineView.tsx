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

    useEffect(() => {
        // ── Reading-schedule items ──────────────────────────────────────
        const readingItems = generateTimelineData();

        // ── Historical-event items ─────────────────────────────────────
        const historicalItems = generateHistoricalTimelineData();

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
            content: cat.name,
            order: cat.order,
            style: `color: ${cat.color};`,
            className: 'hist-group',
            ...(cat.stacked ? { stack: true } : {}),
        }));

        const readingGroups = schedules.map((s, idx) => ({
            id: s.id,
            content: s.name,
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
            calendar: 'hebrew'
        };

        let timeline: Timeline | null = null;
        if (timelineRef.current) {
            timeline = new Timeline(timelineRef.current, items, groups, options);
            timeline.fit();

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
        };
    }, []);

    const popupBackgroundColor = selectedItem
        ? selectedItem.kind === 'reading'
            ? generateColorFromString(selectedItem.data.scheduleId)
            : historicalEventCategories.find(c => c.id === selectedItem.data._event.categoryId)?.color || '#666'
        : 'white';
    const popupTextColor = getTextColorForBackground(popupBackgroundColor);

    return (
        <div style={{ position: 'relative', height: '50vh', width: '60vh' }}>
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
                            right: '8px',
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
                        return (
                            <>
                                <h3 style={{ marginTop: 0, marginBottom: '5px', borderBottom: `1px solid ${popupTextColor === 'black' ? '#eee' : '#444'}`, paddingBottom: '5px' }}>
                                    {item.verses[0].book}{' '}
                                    {item.verses[0].chapter}
                                    {schedules.find(s => s.id === item.scheduleId)?.displayMode === 'verse' && `:${item.verses[0].verse}`}
                                </h3>
                                <h4 style={{ marginTop: 0, marginBottom: '10px', fontStyle: 'italic' }}>
                                    {new HDate(item.start).render()} - {new HDate(item.end).render()}
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
                        const startHDate = new HDate(selectedItem.data.start);
                        const endHDate = selectedItem.data.end ? new HDate(selectedItem.data.end) : null;
                        return (
                            <>
                                <h3 style={{ marginTop: 0, marginBottom: '5px', borderBottom: `1px solid ${popupTextColor === 'black' ? '#eee' : '#444'}`, paddingBottom: '5px' }}>
                                    {ev.name}
                                </h3>
                                <h4 style={{ marginTop: 0, marginBottom: '10px', fontStyle: 'italic' }}>
                                    {startHDate.render()}
                                    {endHDate ? ` — ${endHDate.render()}` : ''}
                                </h4>
                                {ev.description && (
                                    <p style={{ margin: 0 }}>{ev.description}</p>
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

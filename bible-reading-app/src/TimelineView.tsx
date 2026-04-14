// src/TimelineView.tsx

import { useEffect, useRef, useState, useCallback } from 'react';
import { Timeline } from 'vis-timeline';
import { DataSet } from 'vis-data';
import { HDate } from '@hebcal/core';
import { generateTimelineData, type TimelineItem } from './generateTimelineData';
import { schedules } from './config';
import { generateColorFromString } from './colorUtils';
import { generateHistoricalTimelineData, type HistoricalTimelineItem } from './generateHistoricalTimelineData';
import { historicalEventCategories } from './historicalEvents';
import { useLocale } from './LocaleContext';
import { localize } from './i18n';
import DetailCard, { type SelectedItem } from './DetailCard';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const ONE_YEAR_MS = ONE_DAY_MS * 365;

interface TimelineViewProps {
  collapsedGroups: Set<string>;
}

const TimelineView = ({ collapsedGroups }: TimelineViewProps) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineInstanceRef = useRef<Timeline | null>(null);
  const savedWindowRef = useRef<{ start: Date; end: Date } | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);
  const { locale } = useLocale();
  const itemsRef = useRef<DataSet<TimelineItem | HistoricalTimelineItem> | null>(null);
  const groupsRef = useRef<DataSet<any> | null>(null);

  // ── Build timeline ──────────────────────────────────────────────────────
  useEffect(() => {
    const readingItems = generateTimelineData(locale);
    const historicalItems = generateHistoricalTimelineData(locale);

    const items = new DataSet<TimelineItem | HistoricalTimelineItem>([
      ...readingItems,
      ...historicalItems,
    ]);
    itemsRef.current = items;

    // ── Groups ─────────────────────────────────────────────────────
    const historicalGroups = historicalEventCategories.map((cat) => ({
      id: cat.id,
      content: localize(cat.name, cat.nameHe, locale),
      order: cat.order,
      style: `color: ${cat.color};`,
      className: 'hist-group',
      visible: !collapsedGroups.has(cat.id),
      ...(cat.stacked ? { stack: true } : {}),
    }));

    const readingGroups = schedules.map((s, idx) => ({
      id: s.id,
      content: localize(s.name, s.nameHe, locale),
      order: 100 + idx,
      style: `color: ${generateColorFromString(s.id)};`,
      visible: !collapsedGroups.has(s.id),
      uniformItems: true,  
    })); 

    const groups = new DataSet([...historicalGroups, ...readingGroups]);
    groupsRef.current = groups;

    const options = {
      stack: false,
      width: '100%',
      height: '100%',
      zoomMin: ONE_DAY_MS,
      zoomMax: window.innerWidth <= 768 ? ONE_YEAR_MS * 1500 : ONE_YEAR_MS * 6000,
      min: new HDate(1, 1, 1).greg().getTime() - ONE_YEAR_MS,
      max: new HDate(1, 1, 6000).greg().getTime() + ONE_YEAR_MS,
      calendar: 'hebrew',
      rtl: locale === 'he',
      locale: locale,
      showCurrentTime: false,
      orientation: { axis: 'top' },
      margin: { item: { horizontal: 2, vertical: 4 } },        
    };

    let timeline: Timeline | null = null;
    if (timelineRef.current) {
      timeline = new Timeline(timelineRef.current, items, groups, options);
      timelineInstanceRef.current = timeline;

      if (savedWindowRef.current) {
        timeline.setWindow(savedWindowRef.current.start, savedWindowRef.current.end, { animation: false });
      } else if (window.innerWidth <= 768) {
        // On mobile, start with ~1000-year view instead of full 6000        
        timeline.setWindow(-1500, -500, { animation: false });
      } else {
        timeline.fit();
      }

      // Selection handler
      timeline.on('select', (properties: { items: string[] }) => {
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

      timeline.on('click', (properties: { item: string | null }) => {
        if (!properties.item) {
          setSelectedItem(null);
        }
      });
    }

    return () => {
      if (timeline) {
        // Save window before destroy
        const window = timeline.getWindow();
        savedWindowRef.current = { start: window.start, end: window.end };
        timeline.destroy();
        setSelectedItem(null);
      }
      if (timelineRef.current) {
        const el = timelineRef.current as HTMLElement;
        el.style.direction = '';
        el.classList.remove('vis-rtl');
        el.innerHTML = '';
      }
    };
  }, [locale]);

  // ── Update group visibility when collapsedGroups change ─────────────────
  useEffect(() => {
    const groups = groupsRef.current;
    if (!groups) return;

    // Get all group IDs
    const allGroupIds = [
      ...historicalEventCategories.map((c) => c.id),
      ...schedules.map((s) => s.id),
    ];

    // Update visibility on the original DataSet; the DataView will re-filter
    const groupUpdates = allGroupIds.map((id) => ({
      id,
      visible: !collapsedGroups.has(id),
    }));

    groups.update(groupUpdates);
  }, [collapsedGroups]);

  const handleCloseDetail = useCallback(() => {
    setSelectedItem(null);
    // Deselect in timeline
    timelineInstanceRef.current?.setSelection([]);
  }, []);

  return (
    <div className="timeline-canvas" dir={locale === 'he' ? 'rtl' : 'ltr'}>
      <div
        ref={timelineRef}
        style={{ height: '100%', width: '100%' }}
      />
      {selectedItem && (
        <DetailCard
          item={selectedItem}
          onClose={handleCloseDetail}
        />
      )}
    </div>
  );
};

export default TimelineView;

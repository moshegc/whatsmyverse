// src/TimelineView.tsx

import { useEffect, useRef } from 'react';
import { Timeline, type TimelineTimeAxisScaleType } from 'vis-timeline/peer';
import { DataSet } from 'vis-data/peer';
import { HDate } from '@hebcal/core';
import { generateTimelineData, type TimelineItem } from './generateTimelineData';
import { schedules } from './config';
import { generateColorFromString } from './colorUtils';

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const ONE_YEAR_MS = ONE_DAY_MS * 365;

const getHebrewDateFormatter = (scale: TimelineTimeAxisScaleType) => {
    return (date: Date) => {
        const hdate = new HDate(date);
        const year = hdate.getFullYear();
        const monthName = hdate.getMonthName();

        switch (scale) {
            case 'year':
                return `${year}`;
            case 'month':
                return `${monthName} ${year}`;
            case 'day':
                return `${hdate.getDate()} ${monthName} ${year}`;
            default:
                return hdate.toString();
        }
    };
};

const TimelineView = () => {
    const timelineRef = useRef(null);

    useEffect(() => {
        const timelineItems = generateTimelineData();
        const items = new DataSet<TimelineItem>(timelineItems);

        const groups = new DataSet(schedules.map(s => ({ 
            id: s.id, 
            content: s.name,
            style: `color: ${generateColorFromString(s.id)};`
        })));

        const options = {
            stack: false,
            width: '100%',
            height: '100%',
            zoomMin: ONE_DAY_MS,
            zoomMax: ONE_YEAR_MS * 6000,
            min: new HDate(1, 1, 1).greg().getTime() - ONE_YEAR_MS, // Start a bit before the first possible date
            max: new HDate(1, 1, 6000).greg().getTime() + ONE_YEAR_MS, // End a bit after the last possible date
            timeAxis: {
                scale: 'year' as TimelineTimeAxisScaleType,
                format: {
                    year: getHebrewDateFormatter('year'),
                    month: getHebrewDateFormatter('month'),
                    week: getHebrewDateFormatter('day'),
                    day: getHebrewDateFormatter('day'),
                    hour: getHebrewDateFormatter('day'),
                    minute: getHebrewDateFormatter('day'),
                    second: getHebrewDateFormatter('day'),
                },
            },
        };

        let timeline: Timeline | null = null;
        if (timelineRef.current) {
            timeline = new Timeline(timelineRef.current, items, groups, options);
            timeline.fit();
        }

        return () => {
            if (timeline) {
                timeline.destroy();
            }
        };
    }, []);

    return <div ref={timelineRef} style={{ height: '50vh', width: '60vh' }} />;
};

export default TimelineView;

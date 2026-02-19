// src/App.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { schedules, type ReadingSchedule } from './config';
import { type BibleVerse } from './csvUtils';
import { getReadingForDate } from './readingLogic';

function App() {
  // State for the selected date, schedule, verses, and loading status
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeSchedule, setActiveSchedule] = useState<ReadingSchedule>(schedules[0]);
  const [currentReading, setCurrentReading] = useState<BibleVerse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Effect to fetch the reading whenever the date or schedule changes
  useEffect(() => {
    const fetchReading = () => {
      setIsLoading(true);
      try {
        const verses = getReadingForDate(activeSchedule, selectedDate);
        setCurrentReading(verses || []);
      } catch (error) {
        console.error("Failed to fetch reading:", error);
        setCurrentReading([]); // Optionally clear verses on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchReading();
  }, [selectedDate, activeSchedule]);

  // Memoize the reading title to avoid recalculating on every render
  const readingTitle = useMemo(() => {
    if (currentReading.length === 0) return "No reading for this day.";
    const firstVerse = currentReading[0];
    if (activeSchedule.displayMode === 'chapter') {
      return `${firstVerse.book} ${firstVerse.chapter}`;
    }
    return `${firstVerse.book} ${firstVerse.chapter}:${firstVerse.verse}`;
  }, [currentReading, activeSchedule.displayMode]);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '800px', margin: 'auto' }}>
      <h1>Bible Reading Calendar</h1>

      {/* Controls for selecting schedule and date */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' }}>
        <select
          value={activeSchedule.id}
          onChange={(e) => setActiveSchedule(schedules.find(s => s.id === e.target.value)!)}
          style={{ padding: '0.5rem' }}
        >
          {schedules.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input
          type="date"
          value={selectedDate.toISOString().split('T')[0]}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
          style={{ padding: '0.5rem' }}
        />
      </div>

      {/* Display Area for the Reading */}
      <article>
        <h2>{isLoading ? 'Loading...' : readingTitle}</h2>
        {isLoading ? (
          <p>Fetching reading...</p>
        ) : (
          <div>
            {currentReading.map((verse, index) => (
              <p key={index}>
                <sup>{verse.verse}</sup> {verse.text}
              </p>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}

export default App;

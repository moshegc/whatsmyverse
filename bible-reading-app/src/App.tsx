// src/App.tsx

import { useState, useCallback, useRef, useEffect } from 'react';
import { CanvasTimeline, type CanvasTimelineHandle } from './canvas-timeline';
import HeaderBar from './HeaderBar';
import { useLocale } from './LocaleContext';

function App() {
  const { locale } = useLocale();
  const canvasTimelineRef = useRef<CanvasTimelineHandle>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [headerVisible, setHeaderVisible] = useState(true);
  const [isZoomedOut, setIsZoomedOut] = useState(true);

  // Reset header visibility when orientation changes (e.g. rotate to portrait)
  useEffect(() => {
    const reset = () => setHeaderVisible(true);
    window.addEventListener('orientationchange', reset);
    screen.orientation?.addEventListener('change', reset);
    return () => {
      window.removeEventListener('orientationchange', reset);
      screen.orientation?.removeEventListener('change', reset);
    };
  }, []);

  const handleZoomToggle = useCallback(() => {
    if (isZoomedOut) {
      canvasTimelineRef.current?.zoomIn();
    } else {
      canvasTimelineRef.current?.zoomOut();
    }
  }, [isZoomedOut]);

  const handleJumpToToday = useCallback(() => {
    canvasTimelineRef.current?.jumpToToday();
  }, []);


  const handleToggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  return (
    <div
      style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <HeaderBar onZoomToggle={handleZoomToggle} isZoomedOut={isZoomedOut} onJumpToToday={handleJumpToToday} visible={headerVisible} />
      <div className="main-content">
        <CanvasTimeline ref={canvasTimelineRef} collapsedGroups={collapsedGroups} onToggleGroup={handleToggleGroup} onHeaderVisibilityChange={setHeaderVisible} onZoomChange={setIsZoomedOut} />
      </div>
    </div>
  );
}

export default App;

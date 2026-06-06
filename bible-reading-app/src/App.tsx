// src/App.tsx

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { CanvasTimeline, type CanvasTimelineHandle } from './canvas-timeline';
import HeaderBar from './HeaderBar';
import { useLocale } from './LocaleContext';
import InfoCard from './InfoCard';
import WelcomeOverlay, { shouldShowWelcome } from './WelcomeOverlay';
import TutorialOverlay from './TutorialOverlay';
import { getSeriesInfo, getSectionInfo } from './infoContent';
import { historicalEventCategories } from './historicalEvents';
import { schedules } from './config';
import { generateColorFromString } from './colorUtils';

function App() {
  const { locale } = useLocale();
  const canvasTimelineRef = useRef<CanvasTimelineHandle>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [headerVisible, setHeaderVisible] = useState(true);
  const [isZoomedOut, setIsZoomedOut] = useState(true);
  const [showWelcome, setShowWelcome] = useState(shouldShowWelcome);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);

  type InfoCardState =
    | null
    | { kind: 'series'; groupId: string }
    | { kind: 'section'; section: 'history' | 'verses' };
  const [infoCard, setInfoCard] = useState<InfoCardState>(null);

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

  const handleSeriesInfo = useCallback((groupId: string) => {
    setInfoCard({ kind: 'series', groupId });
  }, []);

  const handleSectionInfo = useCallback((section: 'history' | 'verses') => {
    setInfoCard({ kind: 'section', section });
  }, []);

  // Derive info card props from state
  const infoCardProps = (() => {
    if (!infoCard) return null;
    if (infoCard.kind === 'section') {
      const { title, description } = getSectionInfo(infoCard.section, locale);
      return { title, body: description, toggle: undefined, accentColor: undefined };
    }
    // series
    const { title, description } = getSeriesInfo(infoCard.groupId, locale);
    const cat = historicalEventCategories.find((c) => c.id === infoCard.groupId);
    const sched = schedules.find((s) => s.id === infoCard.groupId);
    const accentColor = cat?.color ?? generateColorFromString(sched?.id ?? infoCard.groupId);
    return {
      title,
      body: description,
      accentColor,
      toggle: {
        enabled: !collapsedGroups.has(infoCard.groupId),
        onToggle: () => handleToggleGroup(infoCard.groupId),
      },
    };
  })();

  const effectiveCollapsedGroups = useMemo(() => {
    if (showTutorial && tutorialStep === 4) {
      const historyIds = historicalEventCategories.map((c) => c.id);
      return new Set([...collapsedGroups, ...historyIds]);
    }
    return collapsedGroups;
  }, [collapsedGroups, showTutorial, tutorialStep]);

  return (
    <div
      style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <HeaderBar onZoomToggle={handleZoomToggle} isZoomedOut={isZoomedOut} onJumpToToday={handleJumpToToday} onTitleClick={() => setShowWelcome(true)} visible={headerVisible} />
      <div className="main-content">
        <CanvasTimeline
          ref={canvasTimelineRef}
          collapsedGroups={effectiveCollapsedGroups}
          onToggleGroup={handleToggleGroup}
          onHeaderVisibilityChange={setHeaderVisible}
          onZoomChange={setIsZoomedOut}
          onSeriesInfo={handleSeriesInfo}
          onSectionInfo={handleSectionInfo}
        />
      </div>
      {showWelcome && (
        <WelcomeOverlay
          onDismiss={() => setShowWelcome(false)}
          onStartTutorial={() => {
            setShowWelcome(false);
            setShowTutorial(true);
            setTutorialStep(1);
          }}
        />
      )}
      {showTutorial && <TutorialOverlay onFinish={() => setShowTutorial(false)} onStepChange={setTutorialStep} />}
      {infoCard && infoCardProps && (
        <InfoCard
          key={infoCard.kind === 'series' ? infoCard.groupId : infoCard.section}
          title={infoCardProps.title}
          body={infoCardProps.body}
          accentColor={infoCardProps.accentColor}
          toggle={infoCardProps.toggle}
          onClose={() => setInfoCard(null)}
        />
      )}
    </div>
  );
}

export default App;

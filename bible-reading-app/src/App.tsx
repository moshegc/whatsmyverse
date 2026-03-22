// src/App.tsx

import { useState, useCallback } from 'react';
import TimelineView from './TimelineView';
import HeaderBar from './HeaderBar';
import Sidebar from './Sidebar';
import { useLocale } from './LocaleContext';

function App() {
  const { locale } = useLocale();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const handleToggleSidebar = useCallback(() => {
    // On mobile: toggle mobile overlay sidebar
    // On desktop: this button is hidden, sidebar collapse is used instead
    setMobileSidebarOpen((prev) => !prev);
  }, []);

  const handleToggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleCloseMobile = useCallback(() => {
    setMobileSidebarOpen(false);
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
      style={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}
      dir={locale === 'he' ? 'rtl' : 'ltr'}
    >
      <HeaderBar onToggleSidebar={handleToggleSidebar} />
      <div className="main-content">
        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          onToggleCollapse={handleToggleCollapse}
          onCloseMobile={handleCloseMobile}
          collapsedGroups={collapsedGroups}
          onToggleGroup={handleToggleGroup}
        />
        <TimelineView collapsedGroups={collapsedGroups} />
      </div>
    </div>
  );
}

export default App;

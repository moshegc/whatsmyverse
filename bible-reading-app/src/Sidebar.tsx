// src/Sidebar.tsx

import { historicalEventCategories } from './historicalEvents';
import { schedules } from './config';
import { useLocale } from './LocaleContext';
import { localize, t } from './i18n';
import { generateColorFromString } from './colorUtils';

/** Icon mapping for categories */
const categoryIcons: Record<string, string> = {
  'biblical-figures': 'person',
  'major-events': 'bolt',
  'bible-books': 'menu_book',
};

/** Icon mapping for schedules */
const scheduleIcons: Record<string, string> = {
  'Psalms-Since-5708': 'music_note',
  'Yearly-Torah-Verse': 'auto_stories',
  'Hours-of-Adam': 'schedule',
  'Eons': 'all_inclusive',
};

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  collapsedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
}

const Sidebar = ({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  collapsedGroups,
  onToggleGroup,
}: SidebarProps) => {
  const { locale } = useLocale();

  const sidebarClass = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={onCloseMobile}
      />

      <aside className={sidebarClass}>
        {/* Sidebar header */}
        <div className="sidebar-header">
          <span className="sidebar-header-label">{t('eras', locale)}</span>
          <button
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            aria-label="Toggle sidebar"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
        </div>

        {/* Group rows */}
        <div className="sidebar-groups">
          {/* Historical categories */}
          {historicalEventCategories.map((cat) => {
            const isCollapsed = collapsedGroups.has(cat.id);
            return (
              <div
                key={cat.id}
                className={`group-row ${isCollapsed ? '' : 'active'}`}
                onClick={() => onToggleGroup(cat.id)}
                title={localize(cat.name, cat.nameHe, locale)}
              >
                <div
                  className="group-color-dot"
                  style={{ backgroundColor: cat.color }}
                />
                {!collapsed && (
                  <span
                    className="material-symbols-outlined group-row-icon"
                    style={{ color: cat.color }}
                  >
                    {categoryIcons[cat.id] || 'category'}
                  </span>
                )}
                <div className="group-row-text">
                  <div className="group-row-name">
                    {localize(cat.name, cat.nameHe, locale)}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Reading schedules */}
          {schedules.map((s) => {
            const color = generateColorFromString(s.id);
            const isCollapsed = collapsedGroups.has(s.id);
            return (
              <div
                key={s.id}
                className={`group-row ${isCollapsed ? '' : 'active'}`}
                onClick={() => onToggleGroup(s.id)}
                title={localize(s.name, s.nameHe, locale)}
              >
                <div
                  className="group-color-dot"
                  style={{ backgroundColor: color }}
                />
                {!collapsed && (
                  <span
                    className="material-symbols-outlined group-row-icon"
                    style={{ color }}
                  >
                    {scheduleIcons[s.id] || 'event'}
                  </span>
                )}
                <div className="group-row-text">
                  <div className="group-row-name">
                    {localize(s.name, s.nameHe, locale)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

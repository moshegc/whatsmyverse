// src/HeaderBar.tsx

import { useLocale } from './LocaleContext';
import { t, type Locale } from './i18n';
import FeedbackMenu from './FeedbackMenu';

interface HeaderBarProps {
  onZoomToggle: () => void;
  isZoomedOut: boolean;
  onJumpToToday: () => void;
  onTitleClick?: () => void;
  visible?: boolean;
}

const HeaderBar = ({ onZoomToggle, isZoomedOut, onJumpToToday, onTitleClick, visible = true }: HeaderBarProps) => {
  const { locale, toggleLocale } = useLocale();

  return (
    <header className={`header-bar${visible ? '' : ' header-hidden'}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img 
          src="/timeline_app.png" 
          alt="Hebrew History Timeline" 
          style={{ height: '32px', width: '32px', objectFit: 'contain', borderRadius: '4px' }} 
        />
        <h1
          className="header-title"
          onClick={onTitleClick}
          style={onTitleClick ? { cursor: 'pointer' } : undefined}
        >{t('appTitle', locale)}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="header-icon-btn"
          onClick={onZoomToggle}
          aria-label={isZoomedOut ? 'Zoom in to current period' : 'Zoom out to full timeline'}
          title={isZoomedOut ? 'Zoom in to today' : 'Zoom out (full 6000 years)'}
        >
          <span className="material-symbols-outlined">{isZoomedOut ? 'zoom_in' : 'zoom_out_map'}</span>
        </button>
        <button
          className="header-icon-btn"
          onClick={onJumpToToday}
          aria-label="Jump to today"
          title="Jump to today"
        >
          <span className="material-symbols-outlined">today</span>
        </button>
        <FeedbackMenu />
        <LanguageToggle locale={locale} onToggle={toggleLocale} />
      </div>
    </header>
  );
};

function LanguageToggle({ locale, onToggle }: { locale: Locale; onToggle: () => void }) {
  return (
    <div className="lang-toggle">
      <button
        className={`lang-toggle-btn ${locale === 'en' ? 'active' : ''}`}
        onClick={() => locale !== 'en' && onToggle()}
      >
        EN
      </button>
      <button
        className={`lang-toggle-btn ${locale === 'he' ? 'active' : ''}`}
        style={{ fontSize: '15px', fontWeight: 'bold' }}
        onClick={() => locale !== 'he' && onToggle()}
      >
        עב
      </button>
    </div>
  );
}

export default HeaderBar;

// src/HeaderBar.tsx

import { useLocale } from './LocaleContext';
import { t, type Locale } from './i18n';

interface HeaderBarProps {
  onZoomToggle: () => void;
  isZoomedOut: boolean;
  onJumpToToday: () => void;
  visible?: boolean;
}

const HeaderBar = ({ onZoomToggle, isZoomedOut, onJumpToToday, visible = true }: HeaderBarProps) => {
  const { locale, toggleLocale } = useLocale();

  return (
    <header className={`header-bar${visible ? '' : ' header-hidden'}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 className="header-title">{t('appTitle', locale)}</h1>
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
        onClick={() => locale !== 'he' && onToggle()}
      >
        HE
      </button>
    </div>
  );
}

export default HeaderBar;

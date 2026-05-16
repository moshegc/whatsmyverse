// src/HeaderBar.tsx

import { useLocale } from './LocaleContext';
import { t, type Locale } from './i18n';

interface HeaderBarProps {
  onZoomOut: () => void;
  onJumpToToday: () => void;
  visible?: boolean;
}

const HeaderBar = ({ onZoomOut, onJumpToToday, visible = true }: HeaderBarProps) => {
  const { locale, toggleLocale } = useLocale();

  return (
    <header className={`header-bar${visible ? '' : ' header-hidden'}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 className="header-title">{t('appTitle', locale)}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          className="header-icon-btn"
          onClick={onZoomOut}
          aria-label="Zoom out to full timeline"
          title="Zoom out (full 6000 years)"
        >
          <span className="material-symbols-outlined">zoom_out_map</span>
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

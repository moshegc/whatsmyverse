// src/HeaderBar.tsx

import { useLocale } from './LocaleContext';
import { t, type Locale } from './i18n';

interface HeaderBarProps {
  onToggleSidebar: () => void;
}

const HeaderBar = ({ onToggleSidebar }: HeaderBarProps) => {
  const { locale, toggleLocale } = useLocale();

  return (
    <header className="header-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Hamburger for mobile */}
        <button
          className="hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Open Menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <h1 className="header-title">{t('appTitle', locale)}</h1>
      </div>
      <LanguageToggle locale={locale} onToggle={toggleLocale} />
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

import { useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n } from '../../config/i18n';
import type { Lang } from '../../config/i18n/types';

export default function LanguageSwitcher() {
  const { lang, setLang, available, labels, flags } = useI18n();
  const [open, setOpen] = useState(false);

  const handleSelect = (l: Lang) => {
    setLang(l);
    setOpen(false);
  };

  return (
    <div className="language-switcher">
      <button
        type="button"
        className="header-icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-label="Language"
        title={labels[lang]}
      >
        <Globe size={18} />
        <span className="language-switcher-label">{lang.toUpperCase()}</span>
      </button>

      {open && (
        <>
          <div className="language-switcher-overlay" onClick={() => setOpen(false)} />
          <ul className="language-switcher-menu">
            {available.map((l) => (
              <li key={l}>
                <button
                  type="button"
                  className={`language-switcher-item ${l === lang ? 'active' : ''}`}
                  onClick={() => handleSelect(l)}
                >
                  <span className="language-switcher-flag">{flags[l]}</span>
                  <span>{labels[l]}</span>
                  {l === lang && <Check size={13} />}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
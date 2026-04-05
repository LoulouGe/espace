import fr from './fr.js';
import en from './en.js';

const LANGS = { fr, en };
let currentLang = localStorage.getItem('sl_lang') || (navigator.language.startsWith('en') ? 'en' : 'fr');
let strings = LANGS[currentLang] || LANGS.fr;

export function t(key, params) {
  let s = strings[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replace(`{${k}}`, v);
    }
  }
  return s;
}

export function setLang(id) {
  currentLang = id;
  strings = LANGS[id] || LANGS.fr;
  localStorage.setItem('sl_lang', id);
  applyI18nToDOM();
}

export function getLang() { return currentLang; }

export function applyI18nToDOM() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}

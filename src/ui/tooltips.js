import { t } from '../i18n/i18n.js';

export function showTooltip(elTooltip, x, y, msg) {
  elTooltip.textContent = msg;
  elTooltip.style.left = (x + 14) + 'px';
  elTooltip.style.top = (y - 36) + 'px';
  elTooltip.classList.remove('hidden');
}

export function showTooltipHTML(elTooltip, x, y, html) {
  elTooltip.innerHTML = html;
  elTooltip.style.left = Math.min(x + 14, window.innerWidth - 260) + 'px';
  elTooltip.style.top = (y - 36) + 'px';
  elTooltip.classList.remove('hidden');
}

export function nonLandableMsg(id) {
  const key = 'tooltip.' + id;
  const val = t(key);
  return val !== key ? val : t('tooltip.default');
}

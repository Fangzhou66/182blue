// Theme toggle (light/dark) with localStorage persistence.
(function() {
    'use strict';

    const STORAGE_KEY = 'extraCreditTheme';
    const THEME_LIGHT = 'light';
    const THEME_DARK = 'dark';

    const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    document.addEventListener('DOMContentLoaded', () => {
        // Ensure stored theme is applied (in case inline <head> script is missing).
        const stored = getStoredTheme();
        if (stored) setTheme(stored, { persist: false });

        syncThemeToggleUi();
        syncThemePictures();

        document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Shift-click resets to system theme.
                if (e.shiftKey) {
                    clearStoredTheme();
                    setTheme(null, { persist: false });
                    announceThemeChange();
                    return;
                }

                const next = getEffectiveTheme() === THEME_DARK ? THEME_LIGHT : THEME_DARK;
                setTheme(next, { persist: true });
                announceThemeChange();
            });
        });

        if (media) {
            const onMediaChange = () => {
                if (getStoredTheme()) return;
                syncThemeToggleUi();
                syncThemePictures();
                announceThemeChange({ dispatchOnly: true });
            };

            if (typeof media.addEventListener === 'function') {
                media.addEventListener('change', onMediaChange);
            } else if (typeof media.addListener === 'function') {
                media.addListener(onMediaChange);
            }
        }
    });

    function getStoredTheme() {
        try {
            const theme = localStorage.getItem(STORAGE_KEY);
            return theme === THEME_LIGHT || theme === THEME_DARK ? theme : null;
        } catch {
            return null;
        }
    }

    function clearStoredTheme() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // ignore
        }
    }

    function getSystemTheme() {
        if (!media) return THEME_LIGHT;
        return media.matches ? THEME_DARK : THEME_LIGHT;
    }

    function getEffectiveTheme() {
        return getStoredTheme() || getSystemTheme();
    }

    function setTheme(theme, { persist }) {
        if (theme !== THEME_LIGHT && theme !== THEME_DARK) {
            document.documentElement.removeAttribute('data-theme');
            syncThemeToggleUi();
            syncThemePictures();
            return;
        }

        document.documentElement.dataset.theme = theme;
        if (persist) {
            try {
                localStorage.setItem(STORAGE_KEY, theme);
            } catch {
                // ignore
            }
        }
        syncThemeToggleUi();
        syncThemePictures();
    }

    function syncThemeToggleUi() {
        const effective = getEffectiveTheme();
        const currentIsDark = effective === THEME_DARK;
        const nextLabel = currentIsDark ? 'Light' : 'Dark';

        document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
            btn.setAttribute('aria-pressed', String(currentIsDark));
            btn.setAttribute('aria-label', `Switch to ${nextLabel} mode`);

            const textEl = btn.querySelector('[data-theme-toggle-text]');
            if (textEl) textEl.textContent = currentIsDark ? 'Dark' : 'Light';

            const dot = btn.querySelector('.theme-toggle-dot');
            if (dot) {
                dot.style.background = currentIsDark ? 'rgba(96, 165, 250, 0.9)' : 'rgba(253, 181, 21, 0.95)';
            }
        });
    }

    function syncThemePictures() {
        const forced = document.documentElement.dataset.theme;
        const effective = getEffectiveTheme();

        // <img data-theme-src-light data-theme-src-dark> (inside or outside <picture>)
        document.querySelectorAll('img[data-theme-src-light][data-theme-src-dark]').forEach(img => {
            const lightSrc = img.getAttribute('data-theme-src-light');
            const darkSrc = img.getAttribute('data-theme-src-dark');
            if (!lightSrc || !darkSrc) return;

            const desired = effective === THEME_DARK ? darkSrc : lightSrc;

            const picture = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement : null;
            if (picture) {
                picture.querySelectorAll('source').forEach(source => {
                    if (!source.dataset.mediaOriginal) {
                        source.dataset.mediaOriginal = source.getAttribute('media') || '';
                    }
                    if (forced) {
                        source.setAttribute('media', 'not all');
                    } else {
                        source.setAttribute('media', source.dataset.mediaOriginal);
                    }
                });
            }

            if (img.getAttribute('src') !== desired) {
                img.setAttribute('src', desired);
            }
        });
    }

    function announceThemeChange({ dispatchOnly } = {}) {
        const theme = getEffectiveTheme();
        const isDark = theme === THEME_DARK;

        if (!dispatchOnly) {
            syncThemeToggleUi();
            syncThemePictures();
        }

        document.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme, isDark }
        }));
    }
})();

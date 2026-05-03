(function () {
  try {
    // Theme initialization
    const storageKey = 'eduresourcehub-theme';
    const accentKey = 'eduresourcehub-accent';
    const savedTheme = window.localStorage.getItem(storageKey);
    const savedAccent = window.localStorage.getItem(accentKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : (prefersDark ? 'dark' : 'light');
    const accent = ['indigo', 'teal', 'violet'].includes(savedAccent) ? savedAccent : 'indigo';

    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-accent', accent);
    document.documentElement.style.colorScheme = theme;

    // Clipboard security guard (Development only helper)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        setTimeout(function() {
          try {
            const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
            navigator.clipboard.writeText = function (text) {
              if (typeof document !== 'undefined' && !document.hasFocus()) {
                return Promise.resolve();
              }
              return originalWriteText(text);
            };
          } catch (e) {
            // Silently fail as this is a non-critical helper
          }
        }, 0);
      }
    }
  } catch (error) {
    console.error('Theme initialization failed:', error);
    document.documentElement.classList.add('light');
  }
})();

(() => {
  const override = new URLSearchParams(location.search).get('theme');
  // Share one month snapshot so deferred scripts agree across a midnight transition.
  const month = window.__americanTreeThemeMonth ?? (window.__americanTreeThemeMonth = new Date().getMonth());
  if (override ? override !== 'halloween' : month !== 9) return;

  document.documentElement.classList.add('halloween-theme');
  document.body?.classList.add('halloween-theme');
})();

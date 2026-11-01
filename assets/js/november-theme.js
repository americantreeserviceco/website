(() => {
  const override = new URLSearchParams(location.search).get('theme');
  // Share one month snapshot so deferred scripts agree across a midnight transition.
  const month = window.__americanTreeThemeMonth ?? (window.__americanTreeThemeMonth = new Date().getMonth());
  if (override ? override !== 'november' : month !== 10) return;

  document.documentElement.classList.add('november-theme');
  document.body?.classList.add('november-theme');
})();

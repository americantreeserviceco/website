(() => {
  const override = new URLSearchParams(location.search).get('theme');
  if (override ? override !== 'halloween' : new Date().getMonth() !== 9) return;

  document.documentElement.classList.add('halloween-theme');
  document.body?.classList.add('halloween-theme');
})();

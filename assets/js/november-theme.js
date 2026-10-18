(() => {
  const override = new URLSearchParams(location.search).get('theme');
  if (override ? override !== 'november' : new Date().getMonth() !== 10) return;

  document.documentElement.classList.add('november-theme');
  document.body?.classList.add('november-theme');
})();

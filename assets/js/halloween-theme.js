(() => {
  if (new Date().getMonth() !== 9) return;

  document.documentElement.classList.add('halloween-theme');
  document.body?.classList.add('halloween-theme');
})();
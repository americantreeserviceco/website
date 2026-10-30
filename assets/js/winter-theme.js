(() => {
  const override = new URLSearchParams(location.search).get('theme');
  const month = new Date().getMonth();
  const isWinter = month === 11 || month === 0 || month === 1;
  if (override ? override !== 'winter' : !isWinter) return;

  document.documentElement.classList.add('winter-theme');
  document.body?.classList.add('winter-theme');

  // Santa is shown in December only. January and February keep the winter colours without him.
  if (!override && month !== 11) document.documentElement.classList.add('santa-off');
})();

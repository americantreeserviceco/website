(() => {
  const override = new URLSearchParams(location.search).get('theme');
  const month = new Date().getMonth();
  const isWinter = month === 11 || month === 0 || month === 1;
  if (override ? override !== 'winter' : !isWinter) return;

  document.documentElement.classList.add('winter-theme');
  document.body?.classList.add('winter-theme');

  // Santa and the hero's holiday lights are December only. January and February keep the winter colours without them.
  document.documentElement.classList.add(override || month === 11 ? 'holiday-lights' : 'santa-off');
})();

/* Seasonal image analytics: no form values are included in events. */
(() => {
  'use strict';
  const graphic = document.getElementById('thanksgiving-graphic');
  const image = graphic && graphic.querySelector('img');
  if (!image) return;
  const track = event => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, image_id: 'thanksgiving_mascots',
      image_path: image.getAttribute('src'), placement: 'homepage_hero' });
  };
  graphic.addEventListener('click', () => {
    track('thanksgiving_image_click');
    const name = document.getElementById('name');
    if (name) name.focus();
  });
  if (!('IntersectionObserver' in window)) return;
  let visible = false;
  let viewed = false;
  let timer;
  const update = () => {
    clearTimeout(timer);
    if (viewed || !visible || document.hidden || !image.complete || !image.naturalWidth) return;
    timer = setTimeout(() => {
      viewed = true;
      track('thanksgiving_image_view');
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    }, 1000);
  };
  const observer = new IntersectionObserver(entries => {
    const entry = entries[entries.length - 1];
    visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
    update();
  }, { threshold: [0, 0.5] });
  image.addEventListener('load', update);
  image.addEventListener('error', () => clearTimeout(timer));
  document.addEventListener('visibilitychange', update);
  observer.observe(image);
})();

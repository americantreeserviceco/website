// Mobile menu toggle for the .site-header navigation (design-system.css).
document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.querySelector('.nav-toggle');
  const navigation = document.querySelector('.site-header .nav');
  if (!menuToggle || !navigation) return;

  const setOpen = (isOpen) => {
    navigation.classList.toggle('is-open', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  };

  menuToggle.addEventListener('click', () => setOpen(!navigation.classList.contains('is-open')));
  navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
});

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.primary-nav');

if (menuToggle && navigation) {
  menuToggle.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('is-open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.querySelector('span').textContent = isOpen ? '\u2212' : '+';
  });

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navigation.classList.remove('is-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.querySelector('span').textContent = '+';
    });
  });
}

const quoteForm = document.querySelector('#quote-form');
const formStatus = document.querySelector('.form-status');

if (quoteForm && formStatus) {
  quoteForm.addEventListener('submit', (event) => {
    event.preventDefault();
    formStatus.textContent = 'Thanks - we will be in touch shortly to schedule your estimate.';
    quoteForm.reset();
  });
}
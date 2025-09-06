// Navigation initialization
function initNav() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (!navToggle) return;

  navToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = nav.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    // lock background scroll when open
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // close on outside click
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && nav.classList.contains('nav-open')) {
      nav.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }
  });
}

// Delegated handler so clicks work regardless of injection timing
document.addEventListener('click', function (e) {
  const toggle = e.target.closest ? e.target.closest('#navToggle') : null;
  if (!toggle) return;
  e.stopPropagation();

  const nav = document.querySelector('.nav');
  if (!nav) return;

  const isOpen = nav.classList.toggle('nav-open');
  toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');

  // prevent background scroll when open
  document.body.style.overflow = isOpen ? 'hidden' : '';
});

// Optional: expose initNav toggling fallback
function ensureNavInit() {
  if (!document.querySelector('.nav')) return;
  // call existing initNav if available
  if (typeof initNav === 'function') initNav();
}

// Global loadShell function
async function loadShell() {
  try {
    // Load navbar
    const navbarResponse = await fetch('components/navbar.html');
    if (!navbarResponse.ok) throw new Error('Failed to load navbar');
    const navbarHtml = await navbarResponse.text();
    document.getElementById('navbar').innerHTML = navbarHtml;

    // Load footer
    const footerResponse = await fetch('components/footer.html');
    if (!footerResponse.ok) throw new Error('Failed to load footer');
    const footerHtml = await footerResponse.text();
    document.getElementById('footer').innerHTML = footerHtml;

    // Initialize navbar
    initNav();

    // Initialize language
    if (typeof setLanguage === 'function') {
      const savedLang = localStorage.getItem('lang') || 'id';
      setLanguage(savedLang);
    }
  } catch (error) {
    console.error('Error loading shell:', error);
    // Add fallback content for navbar if loading fails
    if (!document.getElementById('navbar').innerHTML) {
      document.getElementById('navbar').innerHTML = `
        <nav class="navbar">
          <div class="container">
            <a href="/" class="brand">
              <img src="components/Screenshot 2025-08-16 105950.png" alt="FoodFlow" height="40">
            </a>
            <div class="nav-menu">
              <a href="index.html" class="nav-link">Beranda</a>
              <a href="toko.html" class="nav-link">Toko</a>
              <a href="peta.html" class="nav-link">Peta</a>
            </div>
          </div>
        </nav>
      `;
    }
  }
}

// Make loadShell available globally
window.loadShell = loadShell;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Load shell components
  loadShell().catch(error => {
    console.error('Failed to load shell:', error);
  });
});
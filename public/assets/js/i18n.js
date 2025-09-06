// Translations object
const translations = {
  id: {
    'nav.home': 'Beranda',
    'nav.stores': 'Toko',
    'nav.map': 'Peta',
    'nav.admin': 'Admin Panel',
    'nav.profile': 'Profil',
    'nav.logout': 'Keluar',
    'hero.title': 'Mari buang sampah hari ini!',
    'hero.desc': 'Sudahkah kamu membuang sampah hari ini? Kelola sampah makananmu dan kumpulkan poin dari mitra restoran di sekitar.',
    'hero.addressTitle': 'Alamat Utama',
    'stats.points': 'Poin Terkumpul',
    'stats.users': 'Pengguna Aktif',
    'stats.transactions': 'Transaksi',
    'store.title': 'Rekomendasi',
    'store.more': 'Lihat Semua ›'
  },
  en: {
    'nav.home': 'Home',
    'nav.stores': 'Stores',
    'nav.map': 'Map',
    'nav.admin': 'Admin Panel',
    'nav.profile': 'Profile',
    'nav.logout': 'Logout',
    'hero.title': 'Let\'s dispose waste today!',
    'hero.desc': 'Have you disposed of your waste today? Manage your food waste and collect points from partner restaurants around.',
    'hero.addressTitle': 'Main Address',
    'stats.points': 'Points Collected',
    'stats.users': 'Active Users',
    'stats.transactions': 'Transactions',
    'store.title': 'Recommendations',
    'store.more': 'View All ›'
  }
};

// Set language function
function setLanguage(lang) {
  if (!translations[lang]) return;
  
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (translations[lang][key]) {
      if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
        element.placeholder = translations[lang][key];
      } else {
        element.textContent = translations[lang][key];
      }
    }
  });
  
  localStorage.setItem('lang', lang);
}

// Initialize with saved language or default to Indonesian
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('lang') || 'id';
  setLanguage(savedLang);
});
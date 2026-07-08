// GPU Trades - Bilingual Site-Wide Global Controllers (AR/EN)

// Translation Dictionary
const LANG_DICT = {
  ar: {
    // Navigation
    "nav-home": "الرئيسية",
    "nav-hardware": "القطع والأجهزة",
    "nav-categories": "أقسام المتجر",
    "nav-about": "من نحن",
    "nav-contact": "اتصل بنا",
    "nav-support": "مركز الدعم",
    "nav-login": "تسجيل الدخول",
    "nav-register": "حساب جديد",
    "nav-admin": "لوحة التحكم (الادمن)",
    
    // Search
    "search-title": "البحث المباشر عن القطع",
    "search-placeholder": "ابحث عن منتج، قطعة، ماركة، أو مواصفة...",
    
    // Newsletter & Footer
    "btn-subscribe": "اشترك الآن",
    "newsletter-title": "النشرة البريدية",
    "newsletter-desc": "اشترك لتلقي أحدث مواعيد توفر المخزون، الإطلاقات الجديدة، وأكواد الخصومات المتميزة.",
    "footer-desc": "متجر جي بي يو تريدز (GPU Trades) هو مزود تقني رائد للأجهزة والقطع فائقة القوة، أجهزة الألعاب، ومحطات العمل وتجميعات التبريد المائي الاحترافية.",
    "footer-categories": "فئات العتاد",
    "footer-support": "الدعم والضمان",
    "footer-contact": "تواصل معنا",
    "rights-reserved": "جميع الحقوق محفوظة لصالح متجر جي بي يو تريدز &copy; 2026.",
    
    // Homepage Banners & Why Choose Us
    "why-us-title": "لماذا يختارنا المحترفون؟",
    "why-us-desc": "الضمان المعتمد، الدعم الفني المباشر، والقطع الأصلية 100%.",
    "why-us-badge": "ضمانات بريميوم",
    "why-us-card-1-title": "منتجات أصلية 100%",
    "why-us-card-1-desc": "توزيع معتمد ومباشر من Intel, AMD, NVIDIA, ASUS ROG, MSI, Corsair.",
    "why-us-card-2-title": "ضمان العلامة التجارية الرسمي",
    "why-us-card-2-desc": "تشتمل جميع التجميعات المخصصة على ضمان بريميوم لمدة 3 سنوات مع دعم التبديل السريع.",
    "why-us-card-3-title": "دعم فني من الخبراء",
    "why-us-card-3-desc": "تحدث مباشرة مع مهندسي كسر سرعة المعالجات ومصممي الحواسيب، وليس ردوداً آلية.",
    "why-us-card-4-title": "خدمات لوجستية سريعة وآمنة",
    "why-us-card-4-desc": "تُشحن التجميعات داخل صناديق خشبية قوية ومؤمنة عبر DHL و FedEx Express.",
    
    // Catalog headers
    "best-sellers-title": "القطع الأكثر مبيعاً",
    "best-sellers-desc": "القطع الأكثر شعبية في متجرنا",
    "related-title": "القطع ذات الصلة",
    "specifications": "المواصفات الفنية",
    "add-to-cart": "إضافة إلى السلة",
    "add-to-wishlist": "إضافة للمفضلة",
    "checkout": "إتمام عملية الشراء",
    "coupon-title": "تطبيق رمز ترويجي",
    "subtotal": "المجموع الفرعي:",
    "logistics": "الشحن والخدمات اللوجستية:",
    "total": "المجموع الكلي:",
    "empty-cart-title": "سلة المشتريات فارغة",
    "empty-cart-desc": "تصفح معارض المنتجات والقطع لتبدأ بناء تجميعتك الخارقة.",
    "clear-filters": "إعادة تعيين",
    "filters": "تصفية المنتجات",
    "sorting": "الترتيب حسب:",
    "sort-popularity": "الأكثر مبيعاً",
    "sort-rating": "الأعلى تقييماً",
    "sort-price-low": "السعر: من الأقل للأعلى",
    "sort-price-high": "السعر: من الأعلى للأقل",
    "stock-only": "المتوفر في المخزن فقط",
    "price-range": "نطاق السعر",
    "availability": "حالة التوفر:",
    "brand": "الشركة المصنعة:",
    "warranty": "الضمان:",
    "empty-wishlist-title": "قائمة المفضلة فارغة",
    "empty-wishlist-desc": "احفظ كروت الشاشة، الشاشات، والتجميعات لتسهيل ترقيتها مستقبلاً.",
    "contact-form-title": "تقديم تذكرة دعم فني",
    "contact-info-title": "دليل التواصل المباشر",
    
    // Additional Homepage elements
    "hero-badge-1": "متجر كمبيوترات احترافي",
    "hero-title-1": "متجر كمبيوترات<br><span class=\"text-gradient\">احترافي ومنظم</span>",
    "hero-desc-1": "تصفح أجهزة الكمبيوتر، اللابتوبات، القطع، والشاشات في واجهة متجر نظيفة جاهزة للربط مع الباك إند وإضافة المنتجات الحقيقية.",
    "hero-btn-1-1": "تصفح الكتالوج",
    "hero-btn-1-2": "استكشاف الأنظمة",
    "hero-badge-2": "جاهز لإضافة المنتجات",
    "hero-title-2": "كل قطع الكمبيوتر<br><span class=\"text-gradient\">في كتالوج واحد</span>",
    "hero-desc-2": "واجهة مناسبة لبيع كروت الشاشة، المعالجات، الرامات، وحدات التخزين، الشاشات، وتجميعات الكمبيوتر المكتبية.",
    "hero-btn-2-1": "فتح المتجر",
    "hero-btn-2-2": "عرض الأقسام",
    
    "flash-badge": "عرض محدود المخزون",
    "flash-title": "تخفيضات نهاية الأسبوع الخاطفة",
    "flash-desc": "أقوى قطع الهاردوير بأسعار المصنع المباشرة. ينتهي العرض قريباً!",
    "flash-btn": "اقتنص العروض الخاطفة",
    "days-label": "أيام",
    "hours-label": "ساعات",
    "mins-label": "دقائق",
    "secs-label": "ثواني",
    
    "cat-badge": "مجموعات العتاد",
    "cat-title": "تسوق حسب الفئات",
    "cat-card-1-title": "تجميعات كمبيوتر مخصصة",
    "cat-card-1-desc": "تجميعات مكتبية جاهزة للتخصيص",
    "cat-card-2-title": "لابتوب الألعاب",
    "cat-card-2-desc": "لابتوبات أداء عالي للألعاب والعمل",
    "cat-card-3-title": "كروت الشاشة",
    "cat-card-3-desc": "بطاقات رسومية لمختلف فئات الأداء",
    "cat-card-4-title": "المعالجات / CPUs",
    "cat-card-4-desc": "معالجات مناسبة لكل فئات التجميعات",
    
    "showroom-badge": "تجميعات نخبوية",
    "showroom-title": "بيئة تجميعات GPU Trades",
    "showroom-desc": "الحاسوب المكتبي الفاخر هو أكثر من مجرد مواصفات - إنه محرك مصمم لكسر حدود الإنتاجية والألعاب. كل تجميعة نقوم بتركيبها تخضع لاختبارات ضغط مائي صارمة، تحسين سرعات الذاكرة (EXPO/XMP)، واختبارات درجات الحرارة والتحمل.",
    "showroom-feat-1": "تنظيم كابلات احترافي",
    "showroom-feat-2": "تعديل منحنيات المراوح PWM",
    "showroom-feat-3": "ثبات كامل لبروفايلات EXPO",
    "showroom-feat-4": "اختبار ضغط متواصل 24 ساعة",
    "showroom-btn": "طريقتنا في التجميع",
    
    "reviews-badge": "آراء مجتمعنا",
    "reviews-title": "تقييمات النخبة من عملائنا",
    
    "stats-badge": "أرقامنا بالإنتاجية",
    "stats-title": "الأداء الموثق بالأرقام",
    "stat-1-label": "منتجات منشورة",
    "stat-2-label": "طلبات مكتملة",
    "stat-3-label": "تقييمات منشورة",
    "stat-4-label": "أقسام نشطة",
    
    "blog-badge": "أخبار التكنولوجيا",
    "blog-title": "أحدث أخبار الهاردوير",
    "blog-btn": "قراءة المقال كاملاً",
    
    "category-pcs": "أجهزة الألعاب",
    "category-laptops": "لابتوب الألعاب",
    "category-gpus": "كروت الشاشة",
    "category-cpus": "المعالجات",
    "category-monitors": "الشاشات",
    "category-keyboards": "لوحات المفاتيح"
  },
  en: {
    // Navigation
    "nav-home": "Home",
    "nav-hardware": "Hardware",
    "nav-categories": "Categories",
    "nav-about": "About Us",
    "nav-contact": "Contact Us",
    "nav-support": "Support Center",
    "nav-login": "Login",
    "nav-register": "Register",
    "nav-admin": "Admin Dashboard",
    
    // Search
    "search-title": "LIVE HARDWARE SEARCH",
    "search-placeholder": "Search by product, part, brand, or specification...",
    
    // Newsletter & Footer
    "btn-subscribe": "Subscribe",
    "newsletter-title": "Newsletter",
    "newsletter-desc": "Subscribe to receive launch announcements, inventory drops, and discount coupons.",
    "footer-desc": "GPU Trades is an elite technology provider specializing in professional workstations, extreme gaming computers, custom water-cooling systems, and genuine hardware components.",
    "footer-categories": "Categories",
    "footer-support": "Support",
    "footer-contact": "Contact Us",
    "rights-reserved": "&copy; 2026 GPU Trades Inc. All genuine rights reserved.",
    
    // Homepage Banners & Why Choose Us
    "why-us-title": "WHY ENTHUSIASTS CHOOSE GPU",
    "why-us-desc": "Official brand guarantees, expert support, and 100% genuine components.",
    "why-us-badge": "PREMIUM GUARANTEES",
    "why-us-card-1-title": "100% Genuine Products",
    "why-us-card-1-desc": "Authorized partner allocations for Intel, AMD, NVIDIA, ASUS ROG, MSI, Corsair.",
    "why-us-card-2-title": "Official Brand Warranty",
    "why-us-card-2-desc": "All custom builds include a 3-Year premium warranty cover with full swap support.",
    "why-us-card-3-title": "Expert Tech Support",
    "why-us-card-3-desc": "Speak directly with system overclockers and PC designers, not automated templates.",
    "why-us-card-4-title": "Fast Secure Logistics",
    "why-us-card-4-desc": "Shipped inside robust wood crates via DHL and FedEx Express with full insurance.",
    
    // Catalog headers
    "best-sellers-title": "BEST SELLING COMPONENTS",
    "best-sellers-desc": "Most popular upgrades in our store",
    "related-title": "Related Components",
    "specifications": "SPECIFICATIONS",
    "add-to-cart": "Add to Cart",
    "add-to-wishlist": "Add to Wishlist",
    "checkout": "Proceed to Checkout",
    "coupon-title": "Apply Promo Code",
    "subtotal": "Subtotal:",
    "logistics": "Estimated Logistics:",
    "total": "Estimated Total:",
    "empty-cart-title": "YOUR SHOPPING CART IS EMPTY",
    "empty-cart-desc": "Choose premium upgrades from our catalog and assemble your dream setup today.",
    "clear-filters": "Reset",
    "filters": "FILTERS",
    "sorting": "Sort By:",
    "sort-popularity": "Popularity (Reviews)",
    "sort-rating": "Top Rated",
    "sort-price-low": "Price: Low to High",
    "sort-price-high": "Price: High to Low",
    "stock-only": "In Stock Only",
    "price-range": "Price Range",
    "availability": "Availability:",
    "brand": "Brand Manufacturer:",
    "warranty": "Product Warranty:",
    "empty-wishlist-title": "YOUR WISHLIST IS EMPTY",
    "empty-wishlist-desc": "Save your favorite graphics cards, monitors, and custom rigs for future upgrades.",
    "contact-form-title": "Submit Technical Ticket",
    "contact-info-title": "Support Directory",
    
    // Additional Homepage elements
    "hero-badge-1": "PROFESSIONAL COMPUTER STORE",
    "hero-title-1": "Computer Store<br><span class=\"text-gradient\">Clean & Organized</span>",
    "hero-desc-1": "Browse desktops, laptops, components, and monitors in a clean storefront that is ready for real backend catalog data.",
    "hero-btn-1-1": "Browse Catalog",
    "hero-btn-1-2": "Explore Systems",
    "hero-badge-2": "READY FOR PRODUCT DATA",
    "hero-title-2": "Every PC Part<br><span class=\"text-gradient\">In One Catalog</span>",
    "hero-desc-2": "A storefront structure for graphics cards, processors, memory, storage, monitors, laptops, and desktop computer builds.",
    "hero-btn-2-1": "Open Store",
    "hero-btn-2-2": "View Categories",
    
    "flash-badge": "Limited Inventory Offer",
    "flash-title": "WEEKEND HARDWARE FLASH DEALS",
    "flash-desc": "Extreme performance upgrades at factory-direct pricing. Ends soon!",
    "flash-btn": "Claim Flash Offers",
    "days-label": "Days",
    "hours-label": "Hours",
    "mins-label": "Mins",
    "secs-label": "Secs",
    
    "cat-badge": "HARDWARE COLLECTION",
    "cat-title": "SHOP BY CATEGORIES",
    "cat-card-1-title": "Custom Built PCs",
    "cat-card-1-desc": "Desktop builds ready for customization",
    "cat-card-2-title": "Gaming Laptops",
    "cat-card-2-desc": "High-performance laptops for work and play",
    "cat-card-3-title": "Graphics Cards",
    "cat-card-3-desc": "Graphics cards across performance tiers",
    "cat-card-4-title": "Processors / CPUs",
    "cat-card-4-desc": "Processors for every build class",
    
    "showroom-badge": "PREMIUM WORKSTATIONS",
    "showroom-title": "THE GPU TRADES GAMING SETUP",
    "showroom-desc": "A premium desktop represents more than a collection of specs—it's an engine designed to unlock productivity and game rendering. Every rig constructed by GPU Trades passes through exhaustive liquid-loop pressure checks, memory frequency optimizations (EXPO/XMP), and thermal profile throttling tests.",
    "showroom-feat-1": "Premium Cable Layouts",
    "showroom-feat-2": "PWM Fan Curves Set",
    "showroom-feat-3": "EXPO Stable Profiles",
    "showroom-feat-4": "24-Hour Stress Test",
    "showroom-btn": "Our Assembly Process",
    
    "reviews-badge": "TESTIMONIALS",
    "reviews-title": "WHAT ENTHUSIASTS ARE SAYING",
    
    "stats-badge": "OUR HISTORY",
    "stats-title": "ELITE HARDWARE BY THE NUMBERS",
    "stat-1-label": "Published Products",
    "stat-2-label": "Completed Orders",
    "stat-3-label": "Published Reviews",
    "stat-4-label": "Active Categories",
    
    "blog-badge": "HARDWARE RADAR",
    "blog-title": "LATEST HARDWARE NEWS",
    "blog-btn": "Read Article",
    
    "category-pcs": "Gaming PCs",
    "category-laptops": "Gaming Laptops",
    "category-gpus": "Graphics Cards",
    "category-cpus": "Processors",
    "category-monitors": "Monitors",
    "category-keyboards": "Keyboards"
  }
};

// Get current active language selection (defaults to Arabic 'ar')
function getCurrentLang() {
  return localStorage.getItem('gpu_lang') || 'ar';
}

// Set active language and redraw elements
function setLanguage(lang) {
  localStorage.setItem('gpu_lang', lang);
  applyLanguageLayout();
  // Dispatch dynamic event so specific page renderers reload
  window.dispatchEvent(new CustomEvent('languageChanged'));
}

// Flip stylesheet references & trigger DOM translations
function applyLanguageLayout() {
  const lang = getCurrentLang();
  document.documentElement.setAttribute('lang', lang);
  
  const bootstrapCss = document.getElementById('bootstrap-css');
  if (bootstrapCss) {
    if (lang === 'ar') {
      bootstrapCss.setAttribute('href', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.rtl.min.css');
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      bootstrapCss.setAttribute('href', 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css');
      document.documentElement.setAttribute('dir', 'ltr');
    }
  }

  // Scan and translate tagged tags
  document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    if (LANG_DICT[lang] && LANG_DICT[lang][key] !== undefined) {
      el.innerHTML = LANG_DICT[lang][key];
    }
  });

  // Scan and translate placeholders
  document.querySelectorAll('[data-translate-placeholder]').forEach(el => {
    const key = el.getAttribute('data-translate-placeholder');
    if (LANG_DICT[lang] && LANG_DICT[lang][key] !== undefined) {
      el.setAttribute('placeholder', LANG_DICT[lang][key]);
    }
  });

  // Show / Hide language-specific blocks
  document.querySelectorAll('.lang-ar').forEach(el => {
    el.style.setProperty('display', lang === 'ar' ? '' : 'none', lang === 'ar' ? '' : 'important');
  });
  document.querySelectorAll('.lang-en').forEach(el => {
    el.style.setProperty('display', lang === 'en' ? '' : 'none', lang === 'en' ? '' : 'important');
  });

  // Update navigation toggle button text (Show the next language)
  const langBtn = document.getElementById('lang-toggle-btn');
  if (langBtn) {
    langBtn.textContent = lang === 'ar' ? 'EN' : 'العربية';
  }
}

// Trigger language swap
window.toggleLangSession = function() {
  const nextLang = getCurrentLang() === 'ar' ? 'en' : 'ar';
  setLanguage(nextLang);
};

window.addEventListener('languageChanged', () => {
  if (typeof renderAccountMenu === 'function') renderAccountMenu();
});

// Initial page layout configuration
applyLanguageLayout();

document.addEventListener('DOMContentLoaded', () => {
  // Execute translation on DOM Load
  applyLanguageLayout();

  // Initialize AOS
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      mirror: false
    });
  }

  // Preloader boot sequence
  const loader = document.getElementById('loading-screen');
  if (loader) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
      }, 600);
    });
    setTimeout(() => {
      loader.style.opacity = '0';
      loader.style.visibility = 'hidden';
    }, 2000);
  }

  // Sticky Navigation on scroll
  const navbar = document.querySelector('.navbar-premium');
  if (navbar) {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
  }

  // Scroll Progress Bar Indicator
  const createProgressBar = () => {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress-indicator';
    bar.style.position = 'fixed';
    bar.style.top = '0';
    bar.style.left = '0';
    bar.style.height = '3px';
    bar.style.background = 'var(--accent-gradient)';
    bar.style.zIndex = '99999';
    bar.style.width = '0%';
    bar.style.transition = 'width 0.1s ease';
    document.body.appendChild(bar);

    window.addEventListener('scroll', () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const percentage = (window.scrollY / scrollHeight) * 100;
        bar.style.width = `${percentage}%`;
      }
    });
  };
  createProgressBar();

  // Back to Top Button
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // ==========================================
  // Live Search Engine Overlay
  // ==========================================
  const searchBtn = document.getElementById('search-btn');
  const searchOverlay = document.getElementById('search-overlay');
  const closeSearchBtn = document.getElementById('close-search-btn');
  const searchInput = document.getElementById('search-input-field');
  const searchResults = document.getElementById('search-results-list');

  if (searchBtn && searchOverlay) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      searchOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      setTimeout(() => searchInput.focus(), 200);
    });

    const closeSearch = () => {
      searchOverlay.classList.remove('active');
      document.body.style.overflow = '';
      searchInput.value = '';
      if (searchResults) searchResults.innerHTML = '';
    };

    if (closeSearchBtn) closeSearchBtn.addEventListener('click', closeSearch);

    searchOverlay.addEventListener('click', (e) => {
      if (e.target === searchOverlay) closeSearch();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchOverlay.classList.contains('active')) closeSearch();
    });

    if (searchInput && searchResults) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        const currentLang = getCurrentLang();
        
        if (query.length < 2) {
          searchResults.innerHTML = '';
          return;
        }

        const filtered = PRODUCTS_DATA.filter(product => {
          const name = currentLang === 'ar' ? product.name_ar : product.name_en;
          const category = currentLang === 'ar' ? product.category_ar : product.category_en;
          return name.toLowerCase().includes(query) || 
                 category.toLowerCase().includes(query) || 
                 product.brand.toLowerCase().includes(query);
        });

        if (filtered.length === 0) {
          const noMatchMsg = currentLang === 'ar' ? 'لا توجد قطع مطابقة للبحث' : 'No hardware components match';
          searchResults.innerHTML = `
            <div class="p-4 text-center text-muted font-monospace fs-7">
              <i class="bi bi-search-heart d-block fs-3 mb-2 text-orange"></i>
              ${noMatchMsg} "${query}"
            </div>
          `;
          return;
        }

        searchResults.innerHTML = filtered.map(product => {
          const name = currentLang === 'ar' ? product.name_ar : product.name_en;
          const category = currentLang === 'ar' ? product.category_ar : product.category_en;
          return `
            <a href="product-details.html?id=${product.id}" class="search-item-row text-decoration-none">
              <div style="width: 50px; height: 50px;" class="d-flex align-items-center justify-content-center bg-glass border-orange rounded">
                ${product.image}
              </div>
              <div class="flex-grow-1 min-w-0">
                <h6 class="text-white mb-0 text-truncate font-monospace fs-7">${name}</h6>
                <small class="text-orange font-monospace" style="font-size: 0.75rem">${category}</small>
              </div>
              <div class="text-white font-monospace font-weight-bold fs-7">
                ${formatPrice(product.price)}
              </div>
            </a>
          `;
        }).join('');
      });
    }
  }

  // ==========================================
  // Stat Numbers Counter Animation
  // ==========================================
  const startCounter = (el) => {
    const target = parseInt(el.getAttribute('data-target'));
    const suffix = el.getAttribute('data-suffix') || '';
    const speed = 100;
    const increment = Math.ceil(target / speed);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target.toLocaleString() + suffix;
        clearInterval(timer);
      } else {
        el.textContent = current.toLocaleString() + suffix;
      }
    }, 15);
  };

  const countElements = document.querySelectorAll('.animate-counter');
  if (countElements.length > 0) {
    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          startCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });

    countElements.forEach(el => counterObserver.observe(el));
  }
});

// Dynamic bilingual header
function renderPremiumHeader() {
  const currentPath = window.location.pathname;
  const pageName = currentPath.split("/").pop();
  
  const headerHTML = `
    <nav class="navbar navbar-expand-lg navbar-dark navbar-premium">
      <div class="container">
        <a class="navbar-brand d-flex align-items-center" href="index.html" style="gap: 5px;">
          <img src="assets/img/logo.png" alt="GPU Trades Logo" style="height: 42px; width: auto;">
        </a>
        
        <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent" aria-controls="navbarContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        
        <div class="collapse navbar-collapse" id="navbarContent">
          <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <a class="nav-link ${pageName === 'index.html' || pageName === '' ? 'active' : ''}" href="index.html" data-translate="nav-home">الرئيسية</a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${pageName === 'products.html' ? 'active' : ''}" href="products.html" data-translate="nav-hardware">القطع والأجهزة</a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${pageName === 'categories.html' ? 'active' : ''}" href="categories.html" data-translate="nav-categories">أقسام المتجر</a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${pageName === 'about.html' ? 'active' : ''}" href="about.html" data-translate="nav-about">من نحن</a>
            </li>
            <li class="nav-item">
              <a class="nav-link ${pageName === 'contact.html' ? 'active' : ''}" href="contact.html" data-translate="nav-contact">اتصل بنا</a>
            </li>
          </ul>
          
          <div class="d-flex align-items-center">
            <!-- Theme Toggle Button -->
            <button class="nav-icon-btn me-2 ms-2" onclick="toggleTheme()" id="theme-toggle-btn" title="Toggle Theme">
              <i class="bi bi-moon-stars-fill"></i>
            </button>

            <!-- Language Toggle Button -->
            <button class="btn btn-outline-orange px-3 py-1 font-monospace fs-8 me-2 ms-2" onclick="toggleLangSession()" id="lang-toggle-btn">EN</button>
            
            <!-- Search Button -->
            <button class="nav-icon-btn" id="search-btn" title="Live Search">
              <i class="bi bi-search"></i>
            </button>
            
            <!-- Wishlist Button -->
            <a href="wishlist.html" class="nav-icon-btn" title="Saved Wishlist">
              <i class="bi bi-heart"></i>
              <span class="badge-count" id="wishlist-badge-count" style="display: none;">0</span>
            </a>
            
            <!-- Cart Button -->
            <a href="cart.html" class="nav-icon-btn" title="Shopping Cart">
              <i class="bi bi-cart"></i>
              <span class="badge-count" id="cart-badge-count" style="display: none;">0</span>
            </a>
            
            <!-- Account menu -->
            <div class="dropdown ms-2 me-2">
              <button class="nav-icon-btn dropdown-toggle no-arrow" type="button" id="accountMenuBtn" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="bi bi-person"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-end bg-glass border-orange glow-orange mt-2" aria-labelledby="accountMenuBtn" id="account-menu-list">
                <!-- Populated dynamically based on real login session, see renderAccountMenu() -->
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <!-- Search Overlay -->
    <div id="search-overlay" class="search-overlay-container">
      <div class="search-card-wrapper">
        <div class="d-flex align-items-center justify-content-between mb-4">
          <h4 class="text-white mb-0 font-monospace text-orange" data-translate="search-title"><i class="bi bi-cpu-fill me-2 ms-2 animate-spin"></i>LIVE HARDWARE SEARCH</h4>
          <button class="nav-icon-btn fs-3" id="close-search-btn"><i class="bi bi-x-lg"></i></button>
        </div>
        <input type="text" id="search-input-field" class="search-box-large w-100" data-translate-placeholder="search-placeholder" placeholder="Search by product, part, brand, or specification..." autocomplete="off">
        <div id="search-results-list" class="live-search-results"></div>
      </div>
    </div>
  `;
  document.write(headerHTML);
  applyLanguageLayout(); // Run immediately for dynamic values
  renderAccountMenu();
}

// Reflects the real logged-in session instead of always showing
// Login/Register/Admin links to every visitor regardless of auth state.
function renderAccountMenu() {
  const menu = document.getElementById('account-menu-list');
  if (!menu) return;

  const session = (typeof getSession === 'function') ? getSession() : null;
  const lang = getCurrentLang();
  const isStaff = session && typeof ADMIN_ROLES !== 'undefined' && ADMIN_ROLES.includes(session.role);

  if (!session) {
    menu.innerHTML = `
      <li><a class="dropdown-item text-white hover-orange font-monospace fs-7 py-2" href="login.html"><i class="bi bi-box-arrow-in-right me-2 ms-2 text-orange"></i>${lang === 'ar' ? 'تسجيل الدخول' : 'Login'}</a></li>
      <li><a class="dropdown-item text-white hover-orange font-monospace fs-7 py-2" href="register.html"><i class="bi bi-person-plus me-2 ms-2 text-orange"></i>${lang === 'ar' ? 'حساب جديد' : 'Register'}</a></li>
      <li><hr class="dropdown-divider border-orange" style="opacity: 0.2;"></li>
      <li><a class="dropdown-item text-white hover-orange font-monospace fs-7 py-2" href="about.html"><i class="bi bi-shield-check me-2 ms-2 text-orange"></i>${lang === 'ar' ? 'مركز الدعم' : 'Support Center'}</a></li>
    `;
    return;
  }

  menu.innerHTML = `
    <li class="px-3 py-2">
      <div class="text-white font-monospace fs-7 fw-bold text-truncate">${session.name}</div>
      <div class="text-muted font-monospace fs-9 text-truncate">${session.email}</div>
    </li>
    <li><hr class="dropdown-divider border-orange" style="opacity: 0.2;"></li>
    ${isStaff ? `<li><a class="dropdown-item text-white hover-orange font-monospace fs-7 py-2" href="admin.html"><i class="bi bi-gear-fill me-2 ms-2 text-orange"></i>${lang === 'ar' ? 'لوحة التحكم (الادمن)' : 'Admin Dashboard'}</a></li>` : ''}
    <li><a class="dropdown-item text-white hover-orange font-monospace fs-7 py-2" href="about.html"><i class="bi bi-shield-check me-2 ms-2 text-orange"></i>${lang === 'ar' ? 'مركز الدعم' : 'Support Center'}</a></li>
    <li><hr class="dropdown-divider border-orange" style="opacity: 0.2;"></li>
    <li><a class="dropdown-item text-white hover-orange font-monospace fs-7 py-2" href="#" onclick="siteLogout(event)"><i class="bi bi-box-arrow-left me-2 ms-2 text-orange"></i>${lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}</a></li>
  `;
}

// Real customer-facing logout (separate from the admin console's own logout)
window.siteLogout = function(e) {
  if (e) e.preventDefault();
  if (window.sb && window.sb.auth) {
    window.sb.auth.signOut().finally(() => {
      clearSession();
      window.location.href = 'index.html';
    });
  } else {
    clearSession();
    window.location.href = 'index.html';
  }
};

// Dynamic bilingual footer
function renderPremiumFooter() {
  const footerHTML = `
    <footer class="footer-premium pt-5 pb-4 mt-5">
      <div class="container">
        <div class="row g-4 mb-5">
          <!-- Info -->
          <div class="col-lg-4 col-md-6">
            <a href="index.html" class="d-inline-block mb-3">
              <img src="assets/img/logo.png" alt="GPU Trades Logo" style="height: 50px; width: auto;">
            </a>
            <p class="text-white fs-7 mb-4 font-monospace" data-translate="footer-desc">
              GPU Trades is an elite technology provider specializing in professional workstations, extreme gaming computers, custom water-cooling systems, and genuine hardware components.
            </p>
            <div class="social-links-row">
              <a href="https://www.facebook.com/gputrade" target="_blank" rel="noopener" class="social-icon-btn" title="Facebook"><i class="bi bi-facebook"></i></a>
              <a href="https://www.instagram.com/gputrade" target="_blank" rel="noopener" class="social-icon-btn" title="Instagram"><i class="bi bi-instagram"></i></a>
              <a href="https://www.instagram.com/gputrade" target="_blank" rel="noopener" class="social-icon-btn" title="TikTok"><i class="bi bi-tiktok"></i></a>
              <a href="https://wa.me/201555765071" target="_blank" rel="noopener" class="social-icon-btn" title="WhatsApp"><i class="bi bi-whatsapp"></i></a>
            </div>
          </div>
          
          <!-- Categories Quick links -->
          <div class="col-lg-2 col-md-6 col-6">
            <h5 class="font-monospace fs-7 text-uppercase text-white text-orange" data-translate="footer-categories">Categories</h5>
            <ul class="footer-links-list">
              <li><a href="products.html?category=Gaming PCs" data-translate="category-pcs">أجهزة الألعاب</a></li>
              <li><a href="products.html?category=Gaming Laptops" data-translate="category-laptops">لابتوب الألعاب</a></li>
              <li><a href="products.html?category=RTX Graphics Cards" data-translate="category-gpus">كروت الشاشة</a></li>
              <li><a href="products.html?category=Processors" data-translate="category-cpus">المعالجات</a></li>
              <li><a href="products.html?category=Monitors" data-translate="category-monitors">الشاشات</a></li>
              <li><a href="products.html?category=Mechanical Keyboards" data-translate="category-keyboards">لوحات المفاتيح</a></li>
            </ul>
          </div>
          
          <!-- Support -->
          <div class="col-lg-2 col-md-6 col-6">
            <h5 class="font-monospace fs-7 text-uppercase text-white text-orange" data-translate="footer-support">Support</h5>
            <ul class="footer-links-list">
              <li><a href="about.html">سياسة الضمان</a></li>
              <li><a href="shipping.html">دليل الشحن</a></li>
              <li><a href="returns.html">المرتجعات والمستردات</a></li>
              <li><a href="faq.html">الدعم الفني</a></li>
              <li><a href="contact.html">اتصل بنا</a></li>
              <li><a href="privacy.html">سياسة الخصوصية</a></li>
            </ul>
          </div>
          
          <!-- Newsletter -->
          <div class="col-lg-4 col-md-6">
            <h5 class="font-monospace fs-7 text-uppercase text-white text-orange" data-translate="newsletter-title">Newsletter</h5>
            <p class="text-white fs-7 font-monospace mb-3" data-translate="newsletter-desc">Subscribe to receive launch announcements, inventory drops, and discount coupons.</p>
            <div class="input-group mb-4 border-orange" style="border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); overflow: hidden;">
              <input type="email" class="form-control bg-glass text-white border-0 font-monospace fs-7 px-3 py-2" placeholder="Your Email Address" style="outline: none; box-shadow: none;">
              <button class="btn btn-gradient font-monospace px-3" type="button" data-translate="btn-subscribe">اشترك الآن</button>
            </div>
            
            <div class="contact-details font-monospace fs-7 text-white">
              <p class="mb-1 fw-bold text-orange" style="letter-spacing:0.5px;">STORE GPUTRADES</p>
              <p class="mb-2 text-white-50" style="line-height:1.6;">الهرم، نصر الدين، بجوار مترو الجيزة، شارع تحتمس، بجوار صيدلية مارينا ومسجد الصحابة</p>
              <p class="mb-1"><i class="bi bi-telephone text-orange me-2 ms-2"></i><a href="tel:01128811697" class="text-white text-decoration-none">01128811697</a></p>
              <p class="mb-1"><i class="bi bi-telephone text-orange me-2 ms-2"></i><a href="tel:01023484478" class="text-white text-decoration-none">01023484478</a></p>
              <p class="mb-1"><i class="bi bi-whatsapp text-orange me-2 ms-2"></i><a href="https://wa.me/201555765071" target="_blank" rel="noopener" class="text-white text-decoration-none">01555765071 (واتساب)</a></p>
              <p class="mb-1"><i class="bi bi-geo-alt text-orange me-2 ms-2"></i><a href="https://maps.app.goo.gl/CavLGdXJtfUa7TiE9" target="_blank" rel="noopener" class="text-white text-decoration-none">تحديد الموقع على الخريطة</a></p>
              <p class="mb-0"><i class="bi bi-envelope text-orange me-2 ms-2"></i>support@gputrades.com</p>
            </div>
          </div>
        </div>
        
        <hr class="border-orange mb-4" style="opacity: 0.15;">
        
        <div class="row align-items-center g-3 font-monospace fs-8 text-white">
          <div class="col-md-6 text-center text-md-start">
            <p class="mb-0" data-translate="rights-reserved">جميع الحقوق محفوظة لصالح متجر جي بي يو تريدز &copy; 2026.</p>
            <p class="mb-0 text-white-50" style="font-size: 0.75rem;">Developed by Eng Hamada Yasser Mohamed - 01032190560</p>
          </div>
          <div class="col-md-6 text-center text-md-end">
            <div class="payment-methods-row fs-3 d-flex justify-content-center justify-content-md-end gap-3" style="opacity: 0.75;">
              <i class="bi bi-credit-card" title="Visa / MasterCard"></i>
              <i class="bi bi-paypal" title="PayPal"></i>
              <i class="bi bi-wallet2" title="Crypto / Cash"></i>
              <i class="bi bi-truck" title="DHL / FedEx"></i>
            </div>
          </div>
        </div>
      </div>
    </footer>
    
    <button id="back-to-top" title="Scroll To Top">
      <i class="bi bi-arrow-up-short"></i>
    </button>
  `;
  document.write(footerHTML);
  applyLanguageLayout();
}

// Centralized Supabase Auth State Synchronization
if (window.sb && window.sb.auth) {
  window.sb.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      const userId = session.user.id;
      // Check if user is staff
      try {
        const { data: staffProfile } = await window.sb.from('staff_profiles').select('*').eq('id', userId).maybeSingle();
        if (staffProfile) {
          if (staffProfile.is_active) {
            setSession({
              id: staffProfile.id,
              email: staffProfile.email,
              name: staffProfile.full_name,
              role: staffProfile.role,
              loginAt: new Date().toISOString()
            });
          } else {
            await window.sb.auth.signOut();
            clearSession();
          }
        } else {
          // Check if user is customer
          const { data: customerProfile } = await window.sb.from('profiles').select('*').eq('id', userId).maybeSingle();
          if (customerProfile) {
            if (customerProfile.is_active) {
              setSession({
                id: customerProfile.id,
                email: customerProfile.email,
                name: customerProfile.full_name,
                role: 'Customer',
                loginAt: new Date().toISOString()
              });
            } else {
              await window.sb.auth.signOut();
              clearSession();
            }
          } else {
            // Fallback if profiles table is still syncing
            setSession({
              id: session.user.id,
              email: session.user.email,
              name: session.user.user_metadata.full_name || session.user.email.split('@')[0],
              role: 'Customer',
              loginAt: new Date().toISOString()
            });
          }
        }
      } catch (err) {
        console.warn('GPU Trades: Auth sync error', err);
      }
    } else {
      clearSession();
    }
    if (typeof renderAccountMenu === 'function') renderAccountMenu();
  });
}

// Theme Toggle Functionality
window.toggleTheme = function() {
  const currentTheme = localStorage.getItem('gpu_theme') || 'light';
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  localStorage.setItem('gpu_theme', nextTheme);
  document.documentElement.setAttribute('data-theme', nextTheme);
  
  updateThemeIcon(nextTheme);
};

window.updateThemeIcon = function(theme) {
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.innerHTML = theme === 'dark' 
      ? '<i class="bi bi-sun-fill text-warning"></i>' 
      : '<i class="bi bi-moon-stars-fill text-primary"></i>';
  }
};

// Initial Theme Icon Sync
document.addEventListener('DOMContentLoaded', () => {
  const activeTheme = localStorage.getItem('gpu_theme') || 'light';
  updateThemeIcon(activeTheme);
});


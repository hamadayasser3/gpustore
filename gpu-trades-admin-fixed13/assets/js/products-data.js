// GPU Trades - storefront data bridge
// localStorage here is used strictly as a CACHE, never as the source of
// truth. It only ever fills in keys that don't exist yet; it must NEVER
// delete or reset existing keys, since that would wipe real customer,
// order, and product data on every deploy/update.
//
// FIXED (critical data-loss bug): this file used to wipe every gpu_* key
// (including gpu_users, gpu_orders, gpu_products, gpu_session, gpu_cart...)
// whenever an internal version string changed - meaning any site update
// could silently delete all customer and store data. That auto-wipe has
// been removed entirely. Defaults are now only ever ADDED, never used to
// clear existing data.

(function prepareStorefrontDataDefaults() {
  try {
    const emptyDefaults = {
      gpu_products: [],
      gpu_categories: [],
      gpu_brands: [],
      gpu_orders: [],
      gpu_messages: [],
      gpu_reviews: [],
      gpu_activity_log: [],
      gpu_notifications: [],
      gpu_coupons: {},
      gpu_offers: {
        flashSaleId: null,
        weeklyDiscountIds: [],
        featuredIds: []
      }
    };

    Object.entries(emptyDefaults).forEach(([key, value]) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });

    if (!localStorage.getItem('gpu_settings')) {
      localStorage.setItem('gpu_settings', JSON.stringify({
        storeName: '',
        email: '',
        phone: '',
        address: '',
        currency: 'EGP',
        language: 'ar',
        theme: 'light',
        taxRate: 0,
        shippingFee: 0,
        maintenanceMode: false
      }));
    }
  } catch (err) {
    console.warn('GPU Trades: clean storefront data initialization failed.', err);
  }
})();

function readStoreProducts() {
  try {
    const products = JSON.parse(localStorage.getItem('gpu_products'));
    return Array.isArray(products) ? products : [];
  } catch (err) {
    return [];
  }
}

var STATIC_PRODUCTS = [];
var PRODUCTS_DATA = readStoreProducts();
var CUSTOMER_REVIEWS = [
  {
    name_ar: 'أحمد الشريف',
    name_en: 'Ahmed El-Sherif',
    rating: 5,
    date: '2026-05-14',
    comment_ar: 'تجربة شراء ممتازة من أولها لآخرها. الجهاز وصلني معبأ باحتراف والأداء فوق التوقعات، وفريق الدعم رد عليا بسرعة لما استفسرت عن الضمان.',
    comment_en: 'Excellent buying experience from start to finish. The PC arrived professionally packed and performs beyond expectations.'
  },
  {
    name_ar: 'مريم عبد الحميد',
    name_en: 'Mariam Abdelhamid',
    rating: 5,
    date: '2026-05-02',
    comment_ar: 'اشتريت كارت الشاشة من عندهم بعد ما قارنت الأسعار في أكتر من مكان، وكان أفضل سعر وأسرع شحن. هتفضل وجهتي الأولى لأي قطعة جديدة.',
    comment_en: 'I bought my graphics card here after comparing prices everywhere else — best price and fastest shipping by far.'
  },
  {
    name_ar: 'محمود فتحي',
    name_en: 'Mahmoud Fathy',
    rating: 4,
    date: '2026-04-27',
    comment_ar: 'خدمة كويسة جداً والتجميعة اشتغلت من غير أي مشاكل، بس التوصيل اتأخر يوم عن الميعاد. غير كده كل حاجة تمام والفريق متعاون.',
    comment_en: 'Great service and the build worked flawlessly, though delivery was a day late. Team was very cooperative otherwise.'
  },
  {
    name_ar: 'نورهان جمال',
    name_en: 'Nourhan Gamal',
    rating: 5,
    date: '2026-04-19',
    comment_ar: 'أول مرة أطلب من متجر إلكتروني لقطع كمبيوتر وأثق فيه بالكامل. كل القطع أصلية ومطابقة للمواصفات، وحسيت إني في إيد أمينة.',
    comment_en: 'First time trusting an online hardware store completely — everything was genuine and matched the specs exactly.'
  },
  {
    name_ar: 'كريم صلاح الدين',
    name_en: 'Karim Salah El-Din',
    rating: 5,
    date: '2026-04-10',
    comment_ar: 'التجميعة الجيمنج اللي طلبتها جت زي ما اتفقنا بالظبط، والفريق شرحلي كل جزء فيها قبل الشحن. تعامل راقي وأسعار منافسة جداً.',
    comment_en: 'My custom gaming build came exactly as agreed, and the team explained every component before shipping.'
  },
  {
    name_ar: 'سارة يوسف',
    name_en: 'Sara Youssef',
    rating: 4,
    date: '2026-03-29',
    comment_ar: 'اللابتوب اللي اخدته كان بحالة ممتازة وسعره حلو بالنسبة للمواصفات. بس تمنيت يكون فيه خيارات دفع أكتر عند الشراء.',
    comment_en: 'The laptop I got was in excellent condition and great value for the specs, though I wish there were more payment options.'
  },
  {
    name_ar: 'عمر حسن الديب',
    name_en: 'Omar Hassan El-Deeb',
    rating: 5,
    date: '2026-03-15',
    comment_ar: 'بجد متجر محترم، اشتريت بروسيسور وراوتر تبريد وكل حاجة وصلت متغلفة كويس جداً. هرجع أطلب منهم تاني أكيد.',
    comment_en: 'A genuinely reliable store — bought a CPU and cooler, both arrived perfectly packaged. Will definitely order again.'
  },
  {
    name_ar: 'ياسمين عادل',
    name_en: 'Yasmin Adel',
    rating: 5,
    date: '2026-03-03',
    comment_ar: 'خدمة العملاء رائعة، ساعدوني أختار القطع المناسبة للميزانية اللي معايا من غير ما يستغلوني في حاجة مش محتاجاها.',
    comment_en: 'Customer service was fantastic — they helped me pick parts within my budget without upselling anything I didn\'t need.'
  },
  {
    name_ar: 'عبد الرحمن ماهر',
    name_en: 'Abdelrahman Maher',
    rating: 4,
    date: '2026-02-21',
    comment_ar: 'اشتريت شاشة جيمنج ومنيحة جداً في الأداء والألوان. التركيب البسيط بس كان محتاج شوية وقت أطول عن المتوقع في التجهيز.',
    comment_en: 'Bought a gaming monitor with great performance and colors. Setup was easy, though preparation took a bit longer than expected.'
  },
  {
    name_ar: 'دينا الخولي',
    name_en: 'Dina El-Kholy',
    rating: 5,
    date: '2026-02-08',
    comment_ar: 'التعامل كان احترافي من أول رسالة استفسار لحد استلام الطلب. أنصح أي حد بيدور على قطع أصلية وأسعار عادلة يطلب من هنا.',
    comment_en: 'Professional from the first inquiry to delivery. Highly recommend for anyone looking for genuine parts and fair prices.'
  }
];
var STORE_NEWS = [
  {
    title_ar: "كيف تختار كارت الشاشة المناسب لميزانيتك في 2026",
    title_en: "How to Pick the Right GPU for Your Budget in 2026",
    excerpt_ar: "دليل مبسط يشرح الفرق بين فئات كروت الشاشة، وأهم النقاط اللي لازم تراعيها قبل الشراء زي الطاقة والتوافق مع باقي أجزاء الجهاز.",
    excerpt_en: "A simple guide explaining the difference between GPU tiers, and the key things to check before buying, like power draw and compatibility with the rest of your build.",
    date: "2026-06-15",
    image: "assets/img/promo-gpu-3060ti.jpg",
    link: "#"
  },
  {
    title_ar: "الفرق بين رامات DDR4 و DDR5 وهل تستاهل الترقية",
    title_en: "DDR4 vs DDR5 RAM: Is the Upgrade Worth It?",
    excerpt_ar: "نظرة سريعة على الفروقات الأساسية بين الجيلين من الرامات، ومتى يكون قرار الترقية منطقي من الناحية العملية والسعر.",
    excerpt_en: "A quick look at the core differences between the two RAM generations, and when upgrading actually makes sense practically and price-wise.",
    date: "2026-05-28",
    image: "assets/img/promo-ram-gskill.jpg",
    link: "#"
  },
  {
    title_ar: "نصائح للحفاظ على قطع الهاردوير لفترة أطول",
    title_en: "Tips to Extend the Life of Your Hardware",
    excerpt_ar: "مجموعة من العادات البسيطة اللي بتحافظ على عمر كارت الشاشة والمعالج والقطع التانية، من التنظيف الدوري لحسن التهوية.",
    excerpt_en: "A set of simple habits that help extend the life of your GPU, CPU, and other components, from regular cleaning to proper airflow.",
    date: "2026-05-10",
    image: "assets/img/promo-monitor-g8.jpg",
    link: "#"
  }
];

window.refreshProductsData = function() {
  PRODUCTS_DATA = readStoreProducts();
  return PRODUCTS_DATA;
};

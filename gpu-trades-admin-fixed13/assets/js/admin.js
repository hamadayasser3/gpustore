/* ==========================================================================
   GPU Trades - Premium SaaS Admin Panel Core Controller Script
   ========================================================================== */

let addImageBase64 = '';
let editImageBase64 = '';

document.addEventListener('DOMContentLoaded', () => {
  // Gate the entire console behind a real Supabase-authenticated login
  // before anything else runs.
  bindAdminAuthGate();
  bindAdminSetupGate();
  initAdminGate();
});

// ==========================================
// Real auth bootstrapping (Supabase)
// ==========================================
// Decides, on load, which of three screens to show:
//   1) an already-verified staff session -> straight into the console
//   2) a fresh store with zero staff accounts yet -> first-run setup gate
//   3) anything else -> the normal login gate (already visible by default)
async function initAdminGate() {
  try {
    const { data: { session } } = await window.sb.auth.getSession();

    if (session) {
      const staffProfile = await fetchStaffProfile(session.user.id);
      if (staffProfile && staffProfile.is_active) {
        setSession({
          id: staffProfile.id,
          email: staffProfile.email,
          name: staffProfile.full_name,
          role: staffProfile.role,
          loginAt: new Date().toISOString()
        });
        bootAdminConsole();
        return;
      } else {
        // A logged-in Supabase user that isn't (or is no longer) valid staff.
        await window.sb.auth.signOut();
        clearSession();
      }
    }
  } catch (err) {
    console.warn('GPU Trades: could not check existing session.', err);
  }

  // No valid staff session — is this a totally fresh store (zero staff rows)?
  try {
    const { data: count, error } = await window.sb.rpc('staff_count');
    if (!error && count === 0) {
      document.getElementById('admin-auth-gate').style.display = 'none';
      const setupGate = document.getElementById('admin-setup-gate');
      if (setupGate) setupGate.style.display = 'flex';
    }
  } catch (err) {
    console.warn('GPU Trades: could not check staff_count.', err);
  }
}

// Fetches this authenticated user's staff_profiles row (RLS-protected: a
// user can only ever read their own row here unless they're Admin/Super Admin).
async function fetchStaffProfile(userId) {
  const { data, error } = await window.sb
    .from('staff_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.warn('GPU Trades: fetchStaffProfile error.', error);
    return null;
  }
  return data;
}

// ==========================================
// First-run Setup Gate (creates the very first
// Super Admin account when gpu_users has none)
// ==========================================
function bindAdminSetupGate() {
  const setupForm = document.getElementById('admin-setup-form');
  const setupError = document.getElementById('admin-setup-error');
  if (!setupForm) return;

  setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setupError.style.display = 'none';

    const name = document.getElementById('setup-name').value.trim();
    const email = document.getElementById('setup-email').value.trim();
    const password = document.getElementById('setup-password').value;
    const passwordConfirm = document.getElementById('setup-password-confirm').value;
    const submitBtn = setupForm.querySelector('button[type="submit"]');

    const showError = (msg) => {
      setupError.textContent = msg;
      setupError.style.display = 'block';
      submitBtn.disabled = false;
    };

    if (name.length < 3) {
      showError('الاسم يجب أن يحتوي على 3 أحرف على الأقل.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showError('يرجى إدخال بريد إلكتروني صالح.');
      return;
    }
    if (password.length < 8) {
      showError('كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.');
      return;
    }
    if (password !== passwordConfirm) {
      showError('كلمتا المرور غير متطابقتين.');
      return;
    }

    submitBtn.disabled = true;

    try {
      // Re-check right before writing, in case another tab/session already
      // created a staff account in the meantime.
      const { data: count, error: countErr } = await window.sb.rpc('staff_count');
      if (!countErr && count > 0) {
        showError('تم إنشاء حساب مدير بالفعل. يرجى تسجيل الدخول من الشاشة العادية.');
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      // 1) Create the real Supabase Auth account.
      const { data: signUpData, error: signUpErr } = await window.sb.auth.signUp({ email, password });
      if (signUpErr) {
        showError(translateSupabaseAuthError(signUpErr));
        return;
      }

      if (!signUpData.session) {
        // The Supabase project has "Confirm email" turned on, so there is no
        // active session yet — the person must confirm via email first.
        showError('تم إرسال رابط تأكيد إلى بريدك الإلكتروني. فعّل الحساب من البريد ثم سجّل الدخول من الشاشة العادية.');
        return;
      }

      // 2) Turn that auth user into the first Super Admin.
      const { error: bootstrapErr } = await window.sb.rpc('bootstrap_super_admin', { p_full_name: name });
      if (bootstrapErr) {
        showError('تعذر إنشاء حساب المشرف العام: ' + bootstrapErr.message);
        await window.sb.auth.signOut();
        return;
      }

      setSession({
        email,
        name,
        role: 'Super Admin',
        loginAt: new Date().toISOString()
      });

      document.getElementById('admin-setup-gate').style.display = 'none';
      document.getElementById('admin-wrapper').style.display = '';
      bootAdminConsole();
    } catch (err) {
      showError('حدث خطأ غير متوقع. حاول مرة أخرى.');
      console.error(err);
    }
  });
}

// Turns common Supabase Auth error messages into clear Arabic messages.
function translateSupabaseAuthError(err) {
  const msg = (err && err.message) || '';
  if (/already registered|already exists/i.test(msg)) return 'يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل.';
  if (/invalid login credentials/i.test(msg)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  if (/password/i.test(msg) && /short|least/i.test(msg)) return 'كلمة المرور قصيرة جداً.';
  if (/rate limit/i.test(msg)) return 'محاولات كثيرة جداً، حاول لاحقاً.';
  return msg || 'حدث خطأ أثناء المصادقة.';
}


// Human-readable Arabic labels for internal (English) role values.
// The underlying value stored in gpu_users/session stays in English for
// permission-matching logic; only the display label is localized.
function roleLabelAr(role) {
  const map = {
    'Super Admin': 'مشرف عام',
    'Admin': 'مشرف',
    'Warehouse': 'مخازن',
    'Sales': 'مبيعات',
    'Customer Support': 'دعم العملاء',
    'Accountant': 'محاسب'
  };
  return map[role] || role;
}

// ==========================================
// Auth Gate
// ==========================================
function bindAdminAuthGate() {
  const gateForm = document.getElementById('admin-gate-form');
  const gateError = document.getElementById('admin-gate-error');
  if (!gateForm) return;

  gateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    gateError.style.display = 'none';

    const email = document.getElementById('admin-gate-email').value.trim();
    const password = document.getElementById('admin-gate-password').value;
    const submitBtn = gateForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const showError = (msg) => {
      gateError.textContent = msg;
      gateError.style.display = 'block';
      submitBtn.disabled = false;
    };

    try {
      const { data: signInData, error: signInErr } = await window.sb.auth.signInWithPassword({ email, password });
      if (signInErr) {
        showError(translateSupabaseAuthError(signInErr));
        return;
      }

      const staffProfile = await fetchStaffProfile(signInData.user.id);
      if (!staffProfile) {
        showError('هذا الحساب لا يملك صلاحية الدخول للوحة التحكم.');
        await window.sb.auth.signOut();
        return;
      }
      if (!staffProfile.is_active) {
        showError('تم إيقاف هذا الحساب. تواصل مع المشرف العام.');
        await window.sb.auth.signOut();
        return;
      }

      // Real, verified session
      setSession({
        id: staffProfile.id,
        email: staffProfile.email,
        name: staffProfile.full_name,
        role: staffProfile.role,
        loginAt: new Date().toISOString()
      });

      document.getElementById('admin-auth-gate').style.display = 'none';
      document.getElementById('admin-wrapper').style.display = '';
      bootAdminConsole();
    } catch (err) {
      showError('حدث خطأ غير متوقع. حاول مرة أخرى.');
      console.error(err);
    }
  });
}

window.adminLogout = function() {
  const name = (getSession() || {}).name || 'موظف';
  Promise.resolve(window.sb.rpc('log_activity', { p_action: `${name} سجّل الخروج` })).catch(() => {});
  window.sb.auth.signOut().finally(() => {
    clearSession();
    window.location.href = 'login.html';
  });
};

// Called only once a verified staff session exists
function bootAdminConsole() {
  document.getElementById('admin-auth-gate').style.display = 'none';
  document.getElementById('admin-wrapper').style.display = '';

  // 1. Initialize State
  initializeAdminDatabases();
  syncProfileFromSession();

  // 2. Render UI Components
  renderAdminTopbar();
  renderSidebarProfile();
  applySidebarPermissions(getSession().role);

  // 3. Setup Listeners
  bindSidebarToggles();
  bindFormSubmissions();
  bindImageUploads();
  bindAddProductLiveValidation();
  bindReportRangeButtons();
  bindOrdersAndCustomersControls();
  bindInvoicesAndPurchasesControls();

  // 4. Initial Routing
  switchTab('dashboard-home'); // Default view

  // Keep views fresh if a later background sync brings in newer data
  window.addEventListener('gpu:synced', () => {
    if (typeof refreshDashboardViews === 'function') refreshDashboardViews();
  });

  // Log login activity
  logAdminActivity(`${getSession().name} دخل إلى لوحة التحكم`);
}

// Keeps the editable gpu_profile record (avatar/username extras) in sync
// with the real authenticated account's identity (name/email/role).
function syncProfileFromSession() {
  const session = getSession();
  if (!session) return;

  let profile = JSON.parse(localStorage.getItem('gpu_profile'));
  if (!profile) {
    profile = {
      username: session.email.split('@')[0],
      phone: '',
      avatar: `https://ui-avatars.com/api/?background=2563eb&color=fff&bold=true&name=${encodeURIComponent(session.name)}`
    };
  }
  profile.fullName = session.name;
  profile.email = session.email;
  profile.role = session.role;
  localStorage.setItem('gpu_profile', JSON.stringify(profile));
}

// Add Product modal now supports multiple images (a gallery), a drag & drop
// zone, an "add by URL" option, and a live preview card. addProductImages
// holds the ordered list of image data-URLs/URLs for the product being
// created; the first one is used as the product's cover image.
let addProductImages = [];

function bindImageUploads() {
  const addFile = document.getElementById('add-image-file');
  const dropzone = document.getElementById('add-image-dropzone');

  function addImagesFromFileList(fileList) {
    Array.from(fileList || []).forEach(file => {
      if (!file.type || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        addProductImages.push(event.target.result);
        renderAddProductGallery();
      };
      reader.readAsDataURL(file);
    });
  }

  if (dropzone && addFile) {
    dropzone.addEventListener('click', () => addFile.click());
    addFile.addEventListener('change', (e) => {
      addImagesFromFileList(e.target.files);
      addFile.value = '';
    });

    ['dragenter', 'dragover'].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer && e.dataTransfer.files) addImagesFromFileList(e.dataTransfer.files);
    });
  }

  const addUrlBtn = document.getElementById('add-image-url-btn');
  if (addUrlBtn) {
    addUrlBtn.addEventListener('click', () => {
      const urlInput = document.getElementById('add-image-url');
      const url = urlInput.value.trim();
      if (!url) return;
      addProductImages.push(url);
      urlInput.value = '';
      renderAddProductGallery();
    });
  }

  const editFile = document.getElementById('edit-image-file');
  if (editFile) {
    editFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          editImageBase64 = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// Renders the thumbnail grid under the dropzone for the Add Product modal,
// including a remove button per image and a "cover" badge on the first one
// (the cover image is what gets used as the product's main listing image).
function renderAddProductGallery() {
  const gallery = document.getElementById('add-images-gallery');
  const countLabel = document.getElementById('add-images-count');
  if (countLabel) countLabel.textContent = `${addProductImages.length} صورة`;
  if (!gallery) return;

  gallery.innerHTML = addProductImages.map((src, idx) => `
    <div class="add-product-gallery-item">
      <img src="${src}" alt="preview-${idx}">
      <button type="button" class="remove-img-btn" onclick="removeAddProductImage(${idx})">&times;</button>
      ${idx === 0 ? '<span class="cover-badge">غلاف</span>' : ''}
    </div>
  `).join('');

  updateAddProductPreview();
}

window.removeAddProductImage = function(idx) {
  addProductImages.splice(idx, 1);
  renderAddProductGallery();
};

// Live preview card: name + price shown as they'll appear once saved,
// plus the cover thumbnail — helps catch typos/wrong images before saving.
function updateAddProductPreview() {
  const nameInput = document.getElementById('add-name-ar');
  const priceInput = document.getElementById('add-price');
  const discountInput = document.getElementById('add-discount');
  const previewName = document.getElementById('add-preview-name');
  const previewPrice = document.getElementById('add-preview-price');
  const previewThumb = document.getElementById('add-preview-thumb');
  const discountRow = document.getElementById('add-price-after-discount-row');
  const discountVal = document.getElementById('add-price-after-discount');

  if (previewName) previewName.textContent = (nameInput && nameInput.value.trim()) || 'اسم المنتج...';

  const price = parseFloat(priceInput && priceInput.value) || 0;
  const discount = parseInt(discountInput && discountInput.value) || 0;

  if (previewPrice) previewPrice.textContent = `${Math.round(price).toLocaleString()} EGP`;

  if (discount > 0 && price > 0) {
    const finalPrice = price - (price * discount / 100);
    if (discountRow) discountRow.style.display = '';
    if (discountVal) discountVal.textContent = `${Math.round(finalPrice).toLocaleString()} EGP`;
  } else if (discountRow) {
    discountRow.style.display = 'none';
  }

  if (previewThumb) {
    previewThumb.innerHTML = addProductImages.length
      ? `<img src="${addProductImages[0]}" alt="cover">`
      : `<i class="bi bi-image text-muted"></i>`;
  }
}

// Dynamic specification rows (key/value pairs) for the add/edit product forms.
// Replaces the old raw-JSON textarea so the admin can add specs via simple fields.
let specRowCounter = 0;

function addSpecRow(mode, key, value) {
  const container = document.getElementById(`${mode}-specs-rows`);
  if (!container) return;

  const rowId = `spec-row-${mode}-${specRowCounter++}`;
  const row = document.createElement('div');
  row.className = 'd-flex gap-2 align-items-center';
  row.id = rowId;
  row.innerHTML = `
    <input type="text" class="form-control admin-form-control fs-8" placeholder="اسم الخاصية (مثال: CPU)" value="${key ? String(key).replace(/"/g, '&quot;') : ''}" data-spec-key oninput="syncSpecsJSON('${mode}')">
    <input type="text" class="form-control admin-form-control fs-8" placeholder="القيمة (مثال: Intel Core i7)" value="${value ? String(value).replace(/"/g, '&quot;') : ''}" data-spec-value oninput="syncSpecsJSON('${mode}')">
    <button type="button" class="btn btn-sm btn-outline-danger" onclick="document.getElementById('${rowId}').remove(); syncSpecsJSON('${mode}')"><i class="bi bi-trash"></i></button>
  `;
  container.appendChild(row);
  syncSpecsJSON(mode);
}

// Rebuilds the hidden JSON field from the current key/value rows so the rest
// of the save logic (which still reads/writes specs_en/specs_ar as JSON) keeps working.
function syncSpecsJSON(mode) {
  const container = document.getElementById(`${mode}-specs-rows`);
  const hiddenField = document.getElementById(`${mode}-specs-json`);
  if (!container || !hiddenField) return;

  const specsObj = {};
  container.querySelectorAll(`[id^="spec-row-${mode}-"]`).forEach(row => {
    const keyInput = row.querySelector('[data-spec-key]');
    const valInput = row.querySelector('[data-spec-value]');
    const key = keyInput ? keyInput.value.trim() : '';
    const val = valInput ? valInput.value.trim() : '';
    if (key) specsObj[key] = val;
  });

  hiddenField.value = JSON.stringify(specsObj);
}

// Populates the spec rows for the edit form from an existing specs object.
function renderSpecRows(mode, specsObj) {
  const container = document.getElementById(`${mode}-specs-rows`);
  if (!container) return;
  container.innerHTML = '';
  const entries = Object.entries(specsObj || {});
  if (entries.length === 0) {
    addSpecRow(mode);
  } else {
    entries.forEach(([key, value]) => addSpecRow(mode, key, value));
  }
}

function bindAddProductLiveValidation() {
  ['add-name-ar', 'add-price', 'add-discount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', updateAddProductPreview);
  });

  // Start the add-product form with one empty spec row ready to fill in.
  const addSpecsContainer = document.getElementById('add-specs-rows');
  if (addSpecsContainer && addSpecsContainer.children.length === 0) {
    addSpecRow('add');
  }
}

// ==========================================
// Database Init (Production-Clean State)
// ==========================================
function initializeAdminDatabases() {
  // Clear any existing dummy/mock data to start with clean databases
  // ONLY if not already formatted in the current session.
  
  if (!localStorage.getItem('gpu_products')) {
    localStorage.setItem('gpu_products', JSON.stringify([]));
  }

  // Clear mock records completely for clean launch
  if (!localStorage.getItem('gpu_users')) {
    localStorage.setItem('gpu_users', JSON.stringify([]));
  }
  if (!localStorage.getItem('gpu_orders')) {
    localStorage.setItem('gpu_orders', JSON.stringify([]));
  }
  if (!localStorage.getItem('gpu_messages')) {
    localStorage.setItem('gpu_messages', JSON.stringify([]));
  }
  if (!localStorage.getItem('gpu_reviews')) {
    localStorage.setItem('gpu_reviews', JSON.stringify([]));
  }
  if (!localStorage.getItem('gpu_activity_log')) {
    localStorage.setItem('gpu_activity_log', JSON.stringify([]));
  }
  
  // Empty categories database
  if (!localStorage.getItem('gpu_categories')) {
    localStorage.setItem('gpu_categories', JSON.stringify([]));
  }

  // Empty brands database
  if (!localStorage.getItem('gpu_brands')) {
    localStorage.setItem('gpu_brands', JSON.stringify([]));
  }

  // Empty coupons database
  if (!localStorage.getItem('gpu_coupons')) {
    localStorage.setItem('gpu_coupons', JSON.stringify({}));
  }

  // Seed Admin Active settings
  if (!localStorage.getItem('gpu_settings')) {
    const defaultSettings = {
      storeName: "",
      email: "",
      phone: "",
      address: "",
      currency: "EGP",
      language: "ar",
      theme: "light",
      taxRate: 0,
      shippingFee: 0,
      maintenanceMode: false
    };
    localStorage.setItem('gpu_settings', JSON.stringify(defaultSettings));
  }

  // NOTE: gpu_profile is no longer pre-seeded with a fake identity here.
  // It is created/synced from the real authenticated account the moment
  // someone signs in — see syncProfileFromSession().

  if (!localStorage.getItem('gpu_notifications')) {
    localStorage.setItem('gpu_notifications', JSON.stringify([]));
  }

  // Empty special offers/deals
  if (!localStorage.getItem('gpu_offers')) {
    const defaultOffers = {
      flashSaleId: null,
      weeklyDiscountIds: [],
      featuredIds: []
    };
    localStorage.setItem('gpu_offers', JSON.stringify(defaultOffers));
  }
}

// ==========================================
// Sidebar navigation routing & security lock
// ==========================================
window.switchTab = function(tabId, el = null) {
  const profile = JSON.parse(localStorage.getItem('gpu_profile'));
  const activeRole = profile.role || 'Super Admin';
  
  // Check permission restrictions
  if (!hasPermission(activeRole, tabId)) {
    showToast("تم رفض الوصول: صلاحيتك الوظيفية لا تسمح بالدخول لهذا القسم.", "error");
    return;
  }

  // Hide all panels
  document.querySelectorAll('.admin-tab-panel').forEach(panel => {
    panel.style.display = 'none';
  });
  
  // Show target panel
  const targetPanel = document.getElementById(tabId);
  if (targetPanel) targetPanel.style.display = 'block';
  
  // Reset active menu links
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Set active link visually
  if (el) {
    el.classList.add('active');
  } else {
    const matchingLink = document.querySelector(`.sidebar-link[onclick*="${tabId}"]`);
    if (matchingLink) matchingLink.classList.add('active');
  }
  
  // Refresh specific tab contents dynamically
  if (tabId === 'dashboard-home') refreshDashboardViews();
  else if (tabId === 'tab-products') renderProductsList();
  else if (tabId === 'tab-categories') renderCategoriesList();
  else if (tabId === 'tab-brands') renderBrandsList();
  else if (tabId === 'tab-inventory') renderInventoryList();
  else if (tabId === 'tab-orders') renderOrdersList();
  else if (tabId === 'tab-invoices') renderInvoicesList();
  else if (tabId === 'tab-purchases') renderPurchasesList();
  else if (tabId === 'tab-customers') renderCustomersList();
  else if (tabId === 'tab-messages') renderMessagesList();
  else if (tabId === 'tab-reviews') renderReviewsList();
  else if (tabId === 'tab-coupons') renderCouponsList();
  else if (tabId === 'tab-offers') renderOffersList();
  else if (tabId === 'tab-users') renderUsersList();
  else if (tabId === 'tab-reports') renderReportsList();
  else if (tabId === 'tab-settings') renderSettingsView();
  else if (tabId === 'tab-profile') renderProfileView();
  else if (tabId === 'tab-activity-log') renderActivityLog();

  // On Mobile, close sidebar automatically upon routing
  if (window.innerWidth < 992) {
    document.getElementById('admin-sidebar').classList.remove('active');
  }
};

// Role -> allowed tab IDs. Kept in one place so both hasPermission() and
// applySidebarPermissions() (which hides the nav links themselves) always
// agree. Real enforcement of the underlying DATA still lives in Supabase
// RLS policies — this is the UI-level layer on top of that.
const ROLE_TAB_PERMISSIONS = {
  'Super Admin': null, // null = every tab
  'Admin': ['dashboard-home', 'tab-reports', 'tab-products', 'tab-categories', 'tab-brands',
            'tab-inventory', 'tab-orders', 'tab-invoices', 'tab-purchases', 'tab-coupons', 'tab-offers', 'tab-customers',
            'tab-messages', 'tab-reviews', 'tab-activity-log', 'tab-profile'],
  'Warehouse': ['dashboard-home', 'tab-inventory', 'tab-products', 'tab-orders', 'tab-profile'],
  'Sales': ['dashboard-home', 'tab-orders', 'tab-invoices', 'tab-coupons', 'tab-offers', 'tab-customers', 'tab-reports', 'tab-profile'],
  'Customer Support': ['dashboard-home', 'tab-messages', 'tab-reviews', 'tab-customers', 'tab-orders', 'tab-profile'],
  'Accountant': ['dashboard-home', 'tab-reports', 'tab-orders', 'tab-invoices', 'tab-purchases', 'tab-profile']
};

// Role Permission Check Middleware
function hasPermission(role, tabId) {
  const allowed = ROLE_TAB_PERMISSIONS[role];
  if (allowed === null || allowed === undefined) return role === 'Super Admin';
  return allowed.includes(tabId);
}

// Hides sidebar links the current role isn't allowed to open, so staff
// don't even see menu items that would be blocked anyway.
function applySidebarPermissions(role) {
  document.querySelectorAll('#admin-sidebar [data-tab]').forEach(li => {
    const tabId = li.getAttribute('data-tab');
    li.style.display = hasPermission(role, tabId) ? '' : 'none';
  });
}

function bindSidebarToggles() {
  const toggleBtn = document.getElementById('toggle-sidebar-btn');
  const sidebar = document.getElementById('admin-sidebar');
  const contentWrapper = document.getElementById('admin-content-wrapper');
  
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (window.innerWidth >= 992) {
        sidebar.classList.toggle('collapsed');
        contentWrapper.classList.toggle('expanded');
      } else {
        sidebar.classList.toggle('active');
      }
    });
  }
}

// ==========================================
// THEME: Dark / Light mode (shared 'gpu_theme' key with the storefront
// so the admin panel and the public site always stay in sync)
// ==========================================
window.toggleTheme = function() {
  const current = localStorage.getItem('gpu_theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem('gpu_theme', next);
  document.documentElement.setAttribute('data-theme', next);
  updateAdminThemeIcon(next);
};

window.updateAdminThemeIcon = function(theme) {
  const btn = document.getElementById('adminThemeToggleBtn');
  if (!btn) return;
  btn.innerHTML = theme === 'dark'
    ? '<i class="bi bi-sun-fill fs-5 text-warning"></i>'
    : '<i class="bi bi-moon-stars-fill fs-5 text-secondary"></i>';
};

// ==========================================
// RENDERERS: Topbar, Sidebar profile, stats
// ==========================================
function renderAdminTopbar() {
  const topbar = document.getElementById('admin-topbar-right');
  if (!topbar) return;
  
  const notifs = JSON.parse(localStorage.getItem('gpu_notifications')) || [];
  const unreadCount = notifs.filter(n => !n.read).length;
  const profile = JSON.parse(localStorage.getItem('gpu_profile'));
  
  const unreadBadge = unreadCount > 0 ? `<span class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="font-size: 0.6rem;">${unreadCount}</span>` : '';
  
  const notifsRows = notifs.map(n => {
    const icon = n.type === 'order' ? 'bi-cart-check text-success' : n.type === 'stock' ? 'bi-exclamation-triangle text-danger' : 'bi-envelope text-primary';
    const activeClass = n.read ? '' : 'fw-bold bg-light';
    return `
      <li>
        <a class="dropdown-item notification-item ${activeClass} d-flex align-items-center gap-2 py-2" href="#" onclick="markNotificationRead(${n.id})">
          <i class="bi ${icon} fs-5"></i>
          <div>
            <div class="fs-8 text-dark text-wrap" style="max-width: 230px;">${n.text_en}</div>
            <small class="text-muted font-monospace" style="font-size: 0.65rem;">${n.date}</small>
          </div>
        </a>
      </li>
    `;
  }).join('');

  topbar.innerHTML = `
    <div class="d-flex align-items-center gap-3">
      <!-- Read-only role badge — role is set on the account itself, not self-selectable -->
      <span class="badge bg-primary-subtle text-primary fw-bold font-monospace fs-9 px-3 py-2" title="Your account's assigned role">
        <i class="bi bi-person-badge me-1"></i>${roleLabelAr(profile.role)}
      </span>

      <div class="d-none d-md-flex align-items-center gap-1 bg-light border border-success-subtle rounded-pill px-3 py-1 text-success fs-9 fw-bold font-monospace">
        <span class="d-inline-block bg-success rounded-circle animate-pulse" style="width: 8px; height: 8px;"></span>
        <span>النظام يعمل</span>
      </div>

      <!-- Theme Switcher -->
      <button class="btn btn-light p-2 rounded-circle" type="button" onclick="toggleTheme()" id="adminThemeToggleBtn" title="تبديل المظهر">
        <i class="bi bi-moon-stars-fill fs-5 text-secondary"></i>
      </button>
      ${(() => { setTimeout(() => updateAdminThemeIcon(localStorage.getItem('gpu_theme') || 'light'), 0); return ''; })()}

      <!-- Notifications -->
      <div class="dropdown">
        <button class="btn btn-light position-relative p-2 rounded-circle" type="button" id="notifDropdown" data-bs-toggle="dropdown" aria-expanded="false">
          <i class="bi bi-bell fs-5 text-secondary"></i>
          ${unreadBadge}
        </button>
        <ul class="dropdown-menu dropdown-menu-end notifications-dropdown shadow-lg mt-2" aria-labelledby="notifDropdown" style="width: 300px;">
          <li class="dropdown-header font-monospace border-bottom pb-2 mb-1">تنبيهات النظام</li>
          ${notifsRows || '<li class="text-center py-3 text-muted fs-8">لا توجد إشعارات</li>'}
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-center fs-8 fw-bold text-primary py-2" href="#" onclick="clearAllNotifications()">مسح التنبيهات</a></li>
        </ul>
      </div>
      
      <!-- Account Menu -->
      <div class="dropdown ms-2">
        <button class="btn d-flex align-items-center gap-2 p-1 border-0" type="button" id="adminAccountDropdown" data-bs-toggle="dropdown" aria-expanded="false">
          <img src="${profile.avatar}" class="rounded-circle border border-primary-subtle" style="width: 36px; height: 36px; object-fit: cover;">
          <div class="d-none d-md-block text-start">
            <div class="fs-8 fw-bold text-dark lh-sm">${profile.fullName}</div>
            <small class="text-muted fs-9 font-monospace">${roleLabelAr(profile.role)}</small>
          </div>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow-lg mt-2" aria-labelledby="adminAccountDropdown">
          <li><a class="dropdown-item fs-8 py-2" href="#" onclick="switchTab('tab-profile')"><i class="bi bi-person me-2 text-primary"></i>ملفي الشخصي</a></li>
          <li><a class="dropdown-item fs-8 py-2" href="#" onclick="switchTab('tab-settings')"><i class="bi bi-gear me-2 text-primary"></i>الإعدادات</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item fs-8 py-2 text-danger fw-bold" href="#" onclick="adminLogout()"><i class="bi bi-box-arrow-left me-2"></i>تسجيل الخروج</a></li>
        </ul>
      </div>
    </div>
  `;
}

function renderSidebarProfile() {
  const profileContainer = document.getElementById('sidebar-profile-box');
  if (!profileContainer) return;
  const profile = JSON.parse(localStorage.getItem('gpu_profile'));
  profileContainer.innerHTML = `
    <div class="sidebar-logo text-center d-flex flex-column align-items-center py-3 border-0">
      <img src="${profile.avatar}" class="rounded-circle border border-2 border-primary mb-2 shadow" style="width: 55px; height: 55px; object-fit: cover;">
      <h6 class="text-white mb-0 fs-8 fw-bold">${profile.fullName}</h6>
      <span class="badge bg-primary text-white font-monospace fs-9 mt-1 py-1 px-2">${roleLabelAr(profile.role)}</span>
    </div>
  `;
}

// Activity logging helper — writes a real, server-validated row via the
// log_activity() RPC (it stamps the actual authenticated staff id itself,
// so this can't be spoofed from the browser). Fire-and-forget: never blocks
// the calling UI action.
function logAdminActivity(action) {
  Promise.resolve(window.sb.rpc('log_activity', { p_action: action })).catch(err => {
    console.warn('GPU Trades: logAdminActivity failed.', err);
  });
}

// ==========================================
// TAB 1: Dashboard Home
// ==========================================
// Helper: best-effort timestamp for an order/user record.
// Prefers the reliable `createdAt` epoch (added for new records) and
// falls back to parsing the legacy human-readable `date` string.
function getRecordTimestamp(record) {
  if (record && typeof record.createdAt === 'number') return record.createdAt;
  if (record && record.date) {
    const parsed = Date.parse(record.date);
    if (!isNaN(parsed)) return parsed;
  }
  return null;
}

function refreshDashboardViews() {
  const products = JSON.parse(localStorage.getItem('gpu_products')) || [];
  const orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  const allUsers = JSON.parse(localStorage.getItem('gpu_users')) || [];
  const users = allUsers.filter(u => !ADMIN_ROLES.includes(u.role));

  // Revenue-relevant statuses: only orders that have actually been confirmed
  // by an admin (or moved further along fulfillment) count toward revenue.
  // Pending, Rejected, Cancelled, and Refunded orders must NEVER contribute
  // money to the totals — this is the core rule of the whole workflow.
  const REVENUE_STATUSES = ['Confirmed', 'Preparing', 'Shipping', 'Delivered'];
  const nonVoidOrders = orders.filter(o => REVENUE_STATUSES.includes(o.status));

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const isWithin = (order, sinceTs) => {
    const ts = getRecordTimestamp(order);
    return ts !== null && ts >= sinceTs;
  };

  const ordersToday = nonVoidOrders.filter(o => isWithin(o, startOfToday));
  const ordersThisMonth = nonVoidOrders.filter(o => isWithin(o, startOfMonth));

  const revenueTotalEGP = nonVoidOrders.reduce((sum, o) => sum + o.total, 0);
  const revenueTodayEGP = ordersToday.reduce((sum, o) => sum + o.total, 0);
  const revenueMonthEGP = ordersThisMonth.reduce((sum, o) => sum + o.total, 0);

  const pendingOrders = orders.filter(o => o.status === 'Pending').length;
  const newOrdersToday = orders.filter(o => isWithin(o, startOfToday)).length;
  const lowStockProducts = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 5).length;

  // Header date label
  const todayLabel = document.getElementById('dash-today-label');
  if (todayLabel) {
    todayLabel.textContent = 'ملخص الأداء لحظة بلحظة — ' + now.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Sales hero cards
  document.getElementById('stat-sales-total').textContent = Math.round(revenueTotalEGP).toLocaleString() + ' EGP';
  document.getElementById('stat-sales-today').textContent = Math.round(revenueTodayEGP).toLocaleString() + ' EGP';
  document.getElementById('stat-sales-month').textContent = Math.round(revenueMonthEGP).toLocaleString() + ' EGP';
  document.getElementById('stat-sales-total-orders-pill').innerHTML = `<i class="bi bi-receipt"></i> ${nonVoidOrders.length} طلب`;
  document.getElementById('stat-sales-today-orders-pill').innerHTML = `<i class="bi bi-receipt"></i> ${ordersToday.length} طلب`;
  document.getElementById('stat-sales-month-orders-pill').innerHTML = `<i class="bi bi-receipt"></i> ${ordersThisMonth.length} طلب`;

  // KPI grid
  document.getElementById('stat-total-products').textContent = products.length;
  document.getElementById('stat-total-orders').textContent = orders.length;
  document.getElementById('stat-new-orders').textContent = newOrdersToday;
  document.getElementById('stat-total-users').textContent = users.length;
  document.getElementById('stat-pending-orders').textContent = pendingOrders;
  document.getElementById('stat-low-stock').textContent = lowStockProducts;

  // Top Selling products simulator (calculates from completed orders)
  const topSellersList = document.getElementById('top-sellers-list');
  if (topSellersList) {
    if (orders.length === 0) {
      topSellersList.innerHTML = `<div class="dash-empty-state"><i class="bi bi-trophy"></i>لا توجد مبيعات مسجلة بعد</div>`;
    } else {
      let salesCount = {};
      orders.forEach(o => {
        o.items.forEach(i => {
          salesCount[i.name_ar || i.name_en] = (salesCount[i.name_ar || i.name_en] || 0) + i.quantity;
        });
      });
      const topItems = Object.entries(salesCount).sort((a,b) => b[1] - a[1]).slice(0, 5);
      const maxQty = topItems.length ? topItems[0][1] : 1;
      topSellersList.innerHTML = topItems.map(([name, qty], idx) => {
        const pct = Math.max(8, Math.round((qty / maxQty) * 100));
        return `
          <div class="dash-rank-row">
            <div class="dash-rank-badge">${idx + 1}</div>
            <div class="flex-grow-1">
              <div class="d-flex justify-content-between align-items-center">
                <span class="fs-8 text-dark fw-semibold text-truncate" style="max-width: 220px;">${name}</span>
                <span class="badge bg-success-subtle text-success fs-9 font-monospace">${qty} قطعة</span>
              </div>
              <div class="dash-rank-bar-track"><div class="dash-rank-bar-fill" style="width:${pct}%;"></div></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render recent orders table (max 5 rows)
  const recentOrdersTbody = document.getElementById('recent-orders-tbody');
  if (recentOrdersTbody) {
    if (orders.length === 0) {
      recentOrdersTbody.innerHTML = `<tr><td colspan="5" class="border-0"><div class="dash-empty-state"><i class="bi bi-receipt"></i>لا توجد طلبات مسجلة بعد</div></td></tr>`;
    } else {
      const topOrders = orders.slice(-5).reverse();
      recentOrdersTbody.innerHTML = topOrders.map(order => {
        const name = order.customer ? order.customer.name : 'عميل مباشر';
        const items = order.items.map(i => `${i.name_ar || i.name_en} (x${i.quantity})`).join(', ');
        const badgeColor = ['Confirmed', 'Preparing', 'Shipping', 'Delivered'].includes(order.status)
          ? 'admin-badge-success'
          : (order.status === 'Rejected' || order.status === 'Cancelled' || order.status === 'Refunded')
            ? 'admin-badge-danger'
            : 'admin-badge-warning';
        return `
          <tr>
            <td class="font-monospace text-primary fw-bold">${order.id}</td>
            <td class="fw-semibold text-dark">${name}</td>
            <td class="text-truncate" style="max-width: 150px;" title="${items}">${items}</td>
            <td class="font-monospace text-success fw-bold">${Math.round(order.total).toLocaleString()} EGP</td>
            <td><span class="admin-badge ${badgeColor}">${order.status}</span></td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render recent users list
  const recentUsersList = document.getElementById('recent-users-list');
  if (recentUsersList) {
    if (users.length === 0) {
      recentUsersList.innerHTML = `<div class="dash-empty-state"><i class="bi bi-people"></i>لا يوجد عملاء مسجلين بعد</div>`;
    } else {
      const topUsers = users.slice(-4).reverse();
      recentUsersList.innerHTML = topUsers.map(user => {
        return `
          <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2">
            <div class="d-flex align-items-center gap-2">
              <div class="rounded-circle bg-light border d-flex align-items-center justify-content-center" style="width: 32px; height: 32px;">
                <i class="bi bi-person text-secondary"></i>
              </div>
              <div>
                <h6 class="mb-0 fs-8 text-dark fw-bold">${user.name}</h6>
                <small class="text-muted fs-9 font-monospace">${user.email}</small>
              </div>
            </div>
            <span class="badge bg-light text-dark fs-9">${user.date}</span>
          </div>
        `;
      }).join('');
    }
  }

  // Draw simulated sales growth SVG chart
  const chartSvg = document.getElementById('sales-chart-svg');
  if (chartSvg) {
    let points = "0,90 80,80 160,82 240,60 320,70 400,30 480,15";
    if (orders.length > 0) {
      const maxVal = Math.max(...orders.map(o => o.total), 1000);
      const scaledY = orders.slice(-6).map((o, idx) => {
        const x = idx * 90 + 30;
        const y = 90 - (o.total / maxVal * 80);
        return `${x},${y}`;
      });
      if (scaledY.length > 0) points = scaledY.join(' ');
    }
    
    chartSvg.innerHTML = `
      <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(37,99,235,0.2)"/>
        <stop offset="100%" stop-color="rgba(37,99,235,0.0)"/>
      </linearGradient>
      <grid stroke="#e2e8f0" stroke-width="0.5"/>
      <path d="M 0 90 L ${points} L 500 90 Z" fill="url(#salesGradient)"/>
      <polyline points="${points}" fill="none" stroke="var(--admin-primary)" stroke-width="3" style="filter: drop-shadow(0 2px 4px rgba(37,99,235,0.25));"/>
    `;
  }

  // Draw estimated profit chart (assumes a flat margin over sales, since
  // no per-product cost price is tracked yet)
  const PROFIT_MARGIN = 0.25;
  const profitSvg = document.getElementById('profit-chart-svg');
  if (profitSvg) {
    let profitPoints = "0,95 80,90 160,92 240,80 320,85 400,55 480,45";
    if (orders.length > 0) {
      const recentForProfit = orders.slice(-6);
      const maxProfit = Math.max(...recentForProfit.map(o => o.total * PROFIT_MARGIN), 200);
      const scaledProfit = recentForProfit.map((o, idx) => {
        const x = idx * 90 + 30;
        const profit = o.total * PROFIT_MARGIN;
        const y = 95 - (profit / maxProfit * 80);
        return `${x},${y}`;
      });
      if (scaledProfit.length > 0) profitPoints = scaledProfit.join(' ');
    }

    profitSvg.innerHTML = `
      <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(34,197,94,0.22)"/>
        <stop offset="100%" stop-color="rgba(34,197,94,0.0)"/>
      </linearGradient>
      <path d="M 0 95 L ${profitPoints} L 500 95 Z" fill="url(#profitGradient)"/>
      <polyline points="${profitPoints}" fill="none" stroke="var(--admin-success)" stroke-width="3" style="filter: drop-shadow(0 2px 4px rgba(34,197,94,0.25));"/>
    `;
  }

  // Populate the "system log" timeline on the dashboard with the most
  // recent activity log entries.
  const activityTimeline = document.getElementById('activity-timeline');
  if (activityTimeline) {
    const log = JSON.parse(localStorage.getItem('gpu_activity_log')) || [];
    if (log.length === 0) {
      activityTimeline.innerHTML = `<div class="dash-empty-state"><i class="bi bi-clock-history"></i>لا توجد أنشطة مسجلة بعد</div>`;
    } else {
      activityTimeline.innerHTML = log.slice(0, 6).map(l => `
        <li class="timeline-item">
          <h6 class="mb-1 fs-8 fw-bold text-dark">${l.action}</h6>
          <small class="text-muted fs-9 d-block">${l.user}</small>
          <small class="text-muted fs-9 font-monospace">${l.date}</small>
        </li>
      `).join('');
    }
  }
}

// ==========================================
// TAB 2: Product Management (CRUD & Settings)
// ==========================================
function renderProductsList() {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;
  const products = JSON.parse(localStorage.getItem('gpu_products')) || [];
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4 text-muted fs-8">لا توجد منتجات بعد. ابدأ بإضافة أول منتج من زر الإضافة.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = products.map(p => {
    const hidden = p.hidden ? `<span class="badge bg-danger">مخفي</span>` : `<span class="badge bg-success">ظاهر</span>`;
    return `
      <tr>
        <td>
          <div class="bg-light rounded p-1 border d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; overflow: hidden;">
            ${p.image.includes('<svg') || p.image.includes('<img') ? p.image : `<img src="${p.image}" style="width: 100%; height: auto; object-fit: contain;">`}
          </div>
        </td>
        <td class="text-start">
          <div class="fw-bold text-dark text-truncate" style="max-width: 250px;">${p.name_ar || p.name_en}</div>
          <small class="text-muted font-monospace" style="font-size: 0.65rem;">SKU-${p.id.toString().substring(0, 8).toUpperCase()}</small>
        </td>
        <td><small class="badge bg-light text-dark font-monospace">${p.barcode || 'N/A'}</small></td>
        <td><span class="badge bg-light text-dark text-uppercase">${p.category_ar || p.category_en}</span></td>
        <td class="font-monospace text-dark fw-bold">${formatPrice(p.price)}</td>
        <td class="font-monospace text-danger fw-bold">${p.discount ? p.discount + '%' : '-'}</td>
        <td class="font-monospace">${p.stock}</td>
        <td>${hidden}</td>
        <td>
          <div class="d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-outline-primary p-1 fs-9" onclick="openEditModal('${p.id}')"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-sm btn-outline-warning p-1 fs-9" onclick="toggleProductVisibility('${p.id}')"><i class="bi ${p.hidden ? 'bi-eye-slash' : 'bi-eye'}"></i></button>
            <button class="btn btn-sm btn-outline-info p-1 fs-9" onclick="duplicateProduct('${p.id}')"><i class="bi bi-copy"></i></button>
            <button class="btn btn-sm btn-outline-danger p-1 border-0" onclick="deleteProduct('${p.id}')" style="background: #fee2e2; color: #ef4444;"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.toggleProductVisibility = function(id) {
  let products = JSON.parse(localStorage.getItem('gpu_products')) || [];
  const idx = products.findIndex(p => p.id === id);
  if (idx !== -1) {
    products[idx].hidden = !products[idx].hidden;
    localStorage.setItem('gpu_products', JSON.stringify(products));
    renderProductsList();
    logAdminActivity(`تبديل ظهور المنتج رقم: ${id}`);
    showToast("تم تغيير حالة ظهور المنتج!", "success");
  }
};

window.duplicateProduct = function(id) {
  let products = JSON.parse(localStorage.getItem('gpu_products')) || [];
  const product = products.find(p => p.id === id);
  if (product) {
    let copy = JSON.parse(JSON.stringify(product));
    copy.id = Date.now();
    copy.name_en += " (Copy)";
    copy.name_ar += " (نسخة)";
    copy.stock = 10;
    products.push(copy);
    localStorage.setItem('gpu_products', JSON.stringify(products));
    renderProductsList();
    logAdminActivity(`تم نسخ المنتج رقم: ${id}`);
    showToast("تم إنشاء نسخة من المنتج!", "success");
  }
};

// ==========================================
// TAB 3: Category Management
// ==========================================
function renderCategoriesList() {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;
  const cats = JSON.parse(localStorage.getItem('gpu_categories')) || [];
  if (cats.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted fs-8">لا توجد أقسام بعد</td></tr>`;
    return;
  }
  
  tbody.innerHTML = cats.map((cat, idx) => {
    return `
      <tr>
        <td class="font-monospace fw-bold">${idx + 1}</td>
        <td class="fw-semibold text-dark text-start">${cat}</td>
        <td>
          <div class="d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-light border p-1" onclick="moveCategory(${idx}, -1)"><i class="bi bi-arrow-up"></i></button>
            <button class="btn btn-sm btn-light border p-1" onclick="moveCategory(${idx}, 1)"><i class="bi bi-arrow-down"></i></button>
            <button class="btn btn-sm btn-outline-danger p-1 border-0" onclick="deleteCategory(${idx})" style="background: #fee2e2; color: #ef4444;"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.moveCategory = async function(idx, direction) {
  let cats = JSON.parse(localStorage.getItem('gpu_categories')) || [];
  const target = idx + direction;
  if (target >= 0 && target < cats.length) {
    const temp = cats[idx];
    cats[idx] = cats[target];
    cats[target] = temp;
    if (window.gpuSync) {
      const ok = await window.gpuSync.reorderCategories(cats);
      if (!ok) return;
    }
    localStorage.setItem('gpu_categories', JSON.stringify(cats));
    renderCategoriesList();
  }
};

window.deleteCategory = async function(idx) {
  if (confirm("هل تريد حذف هذا القسم؟")) {
    let cats = JSON.parse(localStorage.getItem('gpu_categories')) || [];
    const name = cats[idx];
    if (window.gpuSync) {
      const ok = await window.gpuSync.deleteCategory(name);
      if (!ok) return;
    }
    cats.splice(idx, 1);
    localStorage.setItem('gpu_categories', JSON.stringify(cats));
    renderCategoriesList();
    logAdminActivity("تم حذف قسم من الكتالوج");
  }
};

// ==========================================
// TAB 4: Brand Management
// ==========================================
function renderBrandsList() {
  const tbody = document.getElementById('brands-table-body');
  if (!tbody) return;
  const brands = JSON.parse(localStorage.getItem('gpu_brands')) || [];
  if (brands.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-muted fs-8">لا توجد ماركات بعد</td></tr>`;
    return;
  }
  
  tbody.innerHTML = brands.map((brand, idx) => {
    return `
      <tr>
        <td class="font-monospace fw-bold">${idx + 1}</td>
        <td class="fw-semibold text-dark text-start">${brand}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger p-1 border-0" onclick="deleteBrand(${idx})" style="background: #fee2e2; color: #ef4444;"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

window.deleteBrand = async function(idx) {
  if (confirm("هل تريد حذف هذه الماركة؟")) {
    let brands = JSON.parse(localStorage.getItem('gpu_brands')) || [];
    const name = brands[idx];
    if (window.gpuSync) {
      const ok = await window.gpuSync.deleteBrand(name);
      if (!ok) return;
    }
    brands.splice(idx, 1);
    localStorage.setItem('gpu_brands', JSON.stringify(brands));
    renderBrandsList();
    logAdminActivity("تم حذف ماركة من الإعدادات");
  }
};

// ==========================================
// TAB 5: Inventory Management
// ==========================================
function renderInventoryList() {
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;
  const products = JSON.parse(localStorage.getItem('gpu_products')) || [];
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted fs-8">لا يوجد مخزون لأن الكتالوج فارغ</td></tr>`;
    return;
  }
  
  tbody.innerHTML = products.map(p => {
    const stock = p.stock || 0;
    let badge = `<span class="admin-badge admin-badge-success">متوفر</span>`;
    if (stock === 0) badge = `<span class="admin-badge admin-badge-danger">نفذت الكمية</span>`;
    else if (stock < 5) badge = `<span class="admin-badge admin-badge-warning">كمية منخفضة</span>`;
    
    return `
      <tr>
        <td>
          <div class="bg-light rounded p-1 border d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; overflow: hidden;">
            ${p.image.includes('<svg') || p.image.includes('<img') ? p.image : `<img src="${p.image}" style="width: 100%; height: auto; object-fit: contain;">`}
          </div>
        </td>
        <td class="text-start">
          <div class="fw-bold text-dark">${p.name_ar || p.name_en}</div>
        </td>
        <td>
          <div class="d-flex align-items-center justify-content-center gap-1">
            <button class="btn btn-xs btn-light border p-1" onclick="adjustStockDirect('${p.id}', -1)"><i class="bi bi-dash"></i></button>
            <input type="number" class="form-control text-center font-monospace px-1 py-0 fs-8 fw-bold" value="${stock}" style="width: 50px;" onchange="updateStockDirect(${p.id}, this.value)">
            <button class="btn btn-xs btn-light border p-1" onclick="adjustStockDirect('${p.id}', 1)"><i class="bi bi-plus"></i></button>
          </div>
        </td>
        <td>${badge}</td>
      </tr>
    `;
  }).join('');
}

window.adjustStockDirect = async function(productId, delta) {
  let products = JSON.parse(localStorage.getItem('gpu_products')) || [];
  const idx = products.findIndex(p => p.id === productId);
  if (idx !== -1) {
    const currentStock = products[idx].stock || 0;
    const newStock = Math.max(0, currentStock + delta);
    if (window.gpuSync) {
      const ok = await window.gpuSync.updateStock(productId, newStock);
      if (!ok) return;
    }
    products[idx].stock = newStock;
    products[idx].availability_en = newStock > 0 ? "In Stock" : "Out of Stock";
    products[idx].availability_ar = newStock > 0 ? "متوفر في المخزن" : "نفذت الكمية";
    localStorage.setItem('gpu_products', JSON.stringify(products));
    renderInventoryList();
    refreshDashboardViews();
    logAdminActivity(`تعديل مباشر لمخزون المنتج رقم: ${productId}`);
  }
};

window.updateStockDirect = async function(productId, val) {
  let products = JSON.parse(localStorage.getItem('gpu_products')) || [];
  const idx = products.findIndex(p => p.id === productId);
  if (idx !== -1) {
    const newStock = Math.max(0, parseInt(val) || 0);
    if (window.gpuSync) {
      const ok = await window.gpuSync.updateStock(productId, newStock);
      if (!ok) return;
    }
    products[idx].stock = newStock;
    products[idx].availability_en = newStock > 0 ? "In Stock" : "Out of Stock";
    products[idx].availability_ar = newStock > 0 ? "متوفر في المخزن" : "نفذت الكمية";
    localStorage.setItem('gpu_products', JSON.stringify(products));
    renderInventoryList();
    refreshDashboardViews();
  }
};

// ==========================================
// TAB 6: Order Management
// ==========================================
const ORDERS_PAGE_SIZE = 8;
let ordersCurrentPage = 1;
let customersCurrentPage = 1;

// Wires up search/filter/sort controls for the Orders and Customers tables.
function bindOrdersAndCustomersControls() {
  const ordersSearch = document.getElementById('orders-search-input');
  const ordersStatus = document.getElementById('orders-status-filter');
  const ordersSort = document.getElementById('orders-sort-select');
  if (ordersSearch) ordersSearch.addEventListener('input', () => { ordersCurrentPage = 1; renderOrdersList(); });
  if (ordersStatus) ordersStatus.addEventListener('change', () => { ordersCurrentPage = 1; renderOrdersList(); });
  if (ordersSort) ordersSort.addEventListener('change', () => { ordersCurrentPage = 1; renderOrdersList(); });

  const customersSearch = document.getElementById('customers-search-input');
  const customersStatus = document.getElementById('customers-status-filter');
  const customersSort = document.getElementById('customers-sort-select');
  if (customersSearch) customersSearch.addEventListener('input', () => { customersCurrentPage = 1; renderCustomersList(); });
  if (customersStatus) customersStatus.addEventListener('change', () => { customersCurrentPage = 1; renderCustomersList(); });
  if (customersSort) customersSort.addEventListener('change', () => { customersCurrentPage = 1; renderCustomersList(); });
}

// Wires up search/filter controls for the Invoices tab.
function bindInvoicesAndPurchasesControls() {
  const invSearch = document.getElementById('invoices-search-input');
  const invDate = document.getElementById('invoices-date-filter');
  const invStatus = document.getElementById('invoices-status-filter');
  if (invSearch) invSearch.addEventListener('input', () => { invoicesCurrentPage = 1; renderInvoicesList(); });
  if (invDate) invDate.addEventListener('change', () => { invoicesCurrentPage = 1; renderInvoicesList(); });
  if (invStatus) invStatus.addEventListener('change', () => { invoicesCurrentPage = 1; renderInvoicesList(); });
}

function renderPaginationControls(containerId, totalItems, pageSize, currentPage, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><button class="page-link" data-page="${currentPage - 1}">السابق</button></li>`;
  for (let i = 1; i <= totalPages; i++) {
    html += `<li class="page-item ${i === currentPage ? 'active' : ''}"><button class="page-link" data-page="${i}">${i}</button></li>`;
  }
  html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><button class="page-link" data-page="${currentPage + 1}">التالي</button></li>`;
  container.innerHTML = html;

  container.querySelectorAll('.page-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.getAttribute('data-page'));
      if (page >= 1 && page <= totalPages) onPageChange(page);
    });
  });
}

function renderOrdersList() {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;
  let orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];

  // Search
  const searchInput = document.getElementById('orders-search-input');
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  if (searchTerm) {
    orders = orders.filter(o => {
      const haystack = [o.id, o.customer && o.customer.name, o.customer && o.customer.phone, o.customer && o.customer.email]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(searchTerm);
    });
  }

  // Filter by status
  const statusFilter = document.getElementById('orders-status-filter');
  if (statusFilter && statusFilter.value) {
    orders = orders.filter(o => o.status === statusFilter.value);
  }

  // Sort
  const sortSelect = document.getElementById('orders-sort-select');
  const sortVal = sortSelect ? sortSelect.value : 'date-desc';
  orders.sort((a, b) => {
    if (sortVal === 'date-asc') return (getRecordTimestamp(a) || 0) - (getRecordTimestamp(b) || 0);
    if (sortVal === 'total-desc') return b.total - a.total;
    if (sortVal === 'total-asc') return a.total - b.total;
    return (getRecordTimestamp(b) || 0) - (getRecordTimestamp(a) || 0); // date-desc default
  });

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted fs-8">لا توجد طلبات مطابقة</td></tr>`;
    const paginationEl = document.getElementById('orders-pagination');
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(orders.length / ORDERS_PAGE_SIZE));
  if (ordersCurrentPage > totalPages) ordersCurrentPage = totalPages;
  const pageOrders = orders.slice((ordersCurrentPage - 1) * ORDERS_PAGE_SIZE, ordersCurrentPage * ORDERS_PAGE_SIZE);

  renderPaginationControls('orders-pagination', orders.length, ORDERS_PAGE_SIZE, ordersCurrentPage, (page) => {
    ordersCurrentPage = page;
    renderOrdersList();
  });

  tbody.innerHTML = pageOrders.map(order => {
    const customer = order.customer ? `
      <div class="text-start">
        <div class="fw-bold text-dark lh-sm">${order.customer.name}</div>
        <small class="text-muted font-monospace d-block" style="font-size: 0.65rem;">${order.customer.phone}</small>
        <span class="text-muted d-block text-truncate" style="max-width: 150px; font-size: 0.65rem;" title="${order.customer.address}"><i class="bi bi-geo-alt"></i> ${order.customer.address}</span>
      </div>
    ` : '<span class="text-muted">عميل مباشر</span>';
    
    const items = order.items.map(i => `${i.name_ar || i.name_en} (x${i.quantity})`).join(', ');
    const statusLabels = { 'Pending': 'قيد الانتظار', 'Confirmed': 'مؤكد', 'Preparing': 'جاري التجهيز', 'Shipping': 'قيد الشحن', 'Delivered': 'تم التسليم', 'Rejected': 'مرفوض', 'Cancelled': 'ملغي', 'Refunded': 'مسترجع' };
    const statusOpts = Object.keys(statusLabels).map(opt => {
      const selected = order.status === opt ? 'selected' : '';
      return `<option value="${opt}" ${selected}>${statusLabels[opt]}</option>`;
    }).join('');

    // Confirm/Reject only make sense while the order is still Pending —
    // once it's been decided one way or the other, only the status
    // dropdown (for later fulfillment stages) and invoice/delete remain.
    const decisionButtons = order.status === 'Pending' ? `
        <button class="btn btn-sm btn-success p-1 border-0 me-1" onclick="confirmOrder('${order.id}')" title="تأكيد الطلب" style="background: #dcfce7; color: #16a34a;"><i class="bi bi-check-circle"></i></button>
        <button class="btn btn-sm btn-outline-danger p-1 border-0 me-1" onclick="rejectOrder('${order.id}')" title="رفض الطلب" style="background: #fee2e2; color: #ef4444;"><i class="bi bi-x-circle"></i></button>
    ` : '';

    return `
      <tr>
        <td class="font-monospace text-primary fw-bold">${order.id}</td>
        <td>${customer}</td>
        <td class="text-start text-truncate" style="max-width: 180px;" title="${items}">${items}</td>
        <td class="font-monospace text-dark fw-bold">${Math.round(order.total).toLocaleString()} EGP</td>
        <td class="text-muted" style="font-size: 0.7rem;">${order.date}</td>
        <td>
          <select class="form-select form-select-sm fs-9 fw-semibold py-1 px-2 border" style="width: 120px;" onchange="updateOrderStatus('${order.id}', this.value)">
            ${statusOpts}
          </select>
        </td>
        <td class="text-nowrap">
          ${decisionButtons}
          <button class="btn btn-sm btn-outline-primary p-1 border-0 me-1" onclick="showOrderInvoice('${order.id}')" title="عرض الفاتورة" style="background: #dbeafe; color: #2563eb;"><i class="bi bi-receipt"></i></button>
          <button class="btn btn-sm btn-outline-danger p-1 border-0" onclick="deleteOrder('${order.id}')" title="حذف" style="background: #fee2e2; color: #ef4444;"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// Invoices Ledger — reuses the same `orders` records (each confirmed
// order already gets an invoice number/PDF via showOrderInvoice), just
// presented as a dedicated finance-facing ledger with stats + CSV export.
// ==========================================
let invoicesCurrentPage = 1;
const INVOICES_PAGE_SIZE = 10;

function renderInvoicesList() {
  const tbody = document.getElementById('invoices-table-body');
  if (!tbody) return;
  let orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];

  // Only confirmed-or-later orders count as real invoices (a Pending
  // order has no committed revenue yet, same rule as the rest of the app)
  let invoices = orders.filter(o => o.status !== 'Pending' && o.status !== 'Rejected');

  const searchInput = document.getElementById('invoices-search-input');
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  if (searchTerm) {
    invoices = invoices.filter(o => {
      const haystack = [o.id, o.customer && o.customer.name, o.customer && o.customer.phone].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(searchTerm);
    });
  }

  const dateFilter = document.getElementById('invoices-date-filter');
  if (dateFilter && dateFilter.value) {
    invoices = invoices.filter(o => (o.date || '').startsWith(dateFilter.value));
  }

  const statusFilter = document.getElementById('invoices-status-filter');
  if (statusFilter && statusFilter.value) {
    invoices = invoices.filter(o => o.status === statusFilter.value);
  }

  invoices.sort((a, b) => (getRecordTimestamp(b) || 0) - (getRecordTimestamp(a) || 0));

  // Stats
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const totalAmount = invoices.reduce((sum, o) => sum + (o.total || 0), 0);
  const monthCount = invoices.filter(o => (o.date || '').startsWith(monthKey)).length;
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('inv-stat-count', invoices.length);
  setText('inv-stat-total', `${Math.round(totalAmount).toLocaleString()} ج.م`);
  setText('inv-stat-month', monthCount);
  setText('inv-stat-avg', invoices.length ? `${Math.round(totalAmount / invoices.length).toLocaleString()} ج.م` : '0 ج.م');

  if (invoices.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted fs-8">لا توجد فواتير مطابقة</td></tr>`;
    const paginationEl = document.getElementById('invoices-pagination');
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(invoices.length / INVOICES_PAGE_SIZE));
  if (invoicesCurrentPage > totalPages) invoicesCurrentPage = totalPages;
  const pageInvoices = invoices.slice((invoicesCurrentPage - 1) * INVOICES_PAGE_SIZE, invoicesCurrentPage * INVOICES_PAGE_SIZE);

  renderPaginationControls('invoices-pagination', invoices.length, INVOICES_PAGE_SIZE, invoicesCurrentPage, (page) => {
    invoicesCurrentPage = page;
    renderInvoicesList();
  });

  const statusLabels = { 'Confirmed': 'مؤكد', 'Preparing': 'جاري التجهيز', 'Shipping': 'قيد الشحن', 'Delivered': 'تم التسليم', 'Cancelled': 'ملغي', 'Refunded': 'مسترجع' };

  tbody.innerHTML = pageInvoices.map(order => `
    <tr>
      <td class="font-monospace text-primary fw-bold">${order.id}</td>
      <td>${order.customer ? order.customer.name : 'عميل مباشر'}</td>
      <td class="text-muted" style="font-size: 0.7rem;">${order.date}</td>
      <td>${statusLabels[order.status] || order.status}</td>
      <td class="font-monospace text-dark fw-bold">${Math.round(order.total).toLocaleString()} ج.م</td>
      <td class="text-nowrap">
        <button class="btn btn-sm btn-outline-primary p-1 border-0" onclick="showOrderInvoice('${order.id}')" title="عرض/طباعة الفاتورة" style="background: #dbeafe; color: #2563eb;"><i class="bi bi-receipt"></i></button>
      </td>
    </tr>
  `).join('');
}

window.exportInvoicesCSV = function() {
  const orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  const invoices = orders.filter(o => o.status !== 'Pending' && o.status !== 'Rejected');
  let csv = "\uFEFFInvoice ID,Customer,Phone,Date,Status,Total (EGP)\n";
  invoices.forEach(o => {
    csv += `${o.id},${o.customer ? o.customer.name : ''},${o.customer ? o.customer.phone : ''},${o.date},${o.status},${Math.round(o.total)}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `invoices-${Date.now()}.csv`;
  link.click();
  showToast('تم تصدير الفواتير بنجاح', 'success');
};

// ==========================================
// Purchases & Profit — supplier purchase costs, stored in the `purchases`
// table (see supabase-schema-final.sql), cached locally as `gpu_purchases`
// the same local-first way orders are cached as `gpu_orders`.
// Net profit = confirmed order revenue - total purchase cost.
// ==========================================
let purchasesCurrentPage = 1;
const PURCHASES_PAGE_SIZE = 10;

function populatePurchaseProductSelect() {
  const select = document.getElementById('purchase-product-select');
  if (!select) return;
  const products = JSON.parse(localStorage.getItem('gpu_products')) || [];
  select.innerHTML = products.map(p => `<option value="${p.id}" data-name="${p.name_ar || p.name_en}">${p.name_ar || p.name_en}</option>`).join('');
}

window.addPurchaseFormHandler = function() {
  const form = document.getElementById('add-purchase-form');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = 'true';
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productSelect = document.getElementById('purchase-product-select');
    const selectedOption = productSelect.options[productSelect.selectedIndex];
    const purchase = {
      id: 'PUR-' + Date.now(),
      product_id: productSelect.value,
      product_name: selectedOption ? selectedOption.dataset.name : '',
      quantity: parseInt(document.getElementById('purchase-qty').value, 10),
      unit_cost: parseFloat(document.getElementById('purchase-unit-cost').value),
      supplier: document.getElementById('purchase-supplier').value.trim(),
      date: new Date().toISOString().slice(0, 10)
    };
    purchase.total_cost = purchase.quantity * purchase.unit_cost;

    let purchases = JSON.parse(localStorage.getItem('gpu_purchases')) || [];
    purchases.unshift(purchase);
    localStorage.setItem('gpu_purchases', JSON.stringify(purchases));

    if (window.sb) {
      try {
        await window.sb.from('purchases').insert({
          product_id: purchase.product_id,
          quantity: purchase.quantity,
          unit_cost: purchase.unit_cost,
          total_cost: purchase.total_cost,
          supplier: purchase.supplier,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error('Failed to sync purchase to Supabase:', err);
      }
    }

    form.reset();
    renderPurchasesList();
    showToast('تم تسجيل عملية الشراء بنجاح', 'success');
  });
};

function renderPurchasesList() {
  populatePurchaseProductSelect();
  addPurchaseFormHandler();

  const tbody = document.getElementById('purchases-table-body');
  if (!tbody) return;

  let purchases = JSON.parse(localStorage.getItem('gpu_purchases')) || [];
  purchases.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Profit stats: revenue comes from confirmed-or-later orders, same
  // rule used everywhere else in the dashboard (Pending orders never
  // count towards revenue until an admin confirms them).
  const orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  const revenue = orders.filter(o => o.status !== 'Pending' && o.status !== 'Rejected').reduce((sum, o) => sum + (o.total || 0), 0);
  const totalCost = purchases.reduce((sum, p) => sum + (p.total_cost || 0), 0);
  const netProfit = revenue - totalCost;
  const margin = revenue > 0 ? (netProfit / revenue * 100) : 0;

  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  setText('profit-stat-revenue', `${Math.round(revenue).toLocaleString()} ج.م`);
  setText('profit-stat-cost', `${Math.round(totalCost).toLocaleString()} ج.م`);
  setText('profit-stat-net', `${Math.round(netProfit).toLocaleString()} ج.م`);
  setText('profit-stat-margin', `${margin.toFixed(1)}%`);

  if (purchases.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted fs-8">لا توجد مشتريات مسجلة بعد</td></tr>`;
    const paginationEl = document.getElementById('purchases-pagination');
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(purchases.length / PURCHASES_PAGE_SIZE));
  if (purchasesCurrentPage > totalPages) purchasesCurrentPage = totalPages;
  const pagePurchases = purchases.slice((purchasesCurrentPage - 1) * PURCHASES_PAGE_SIZE, purchasesCurrentPage * PURCHASES_PAGE_SIZE);

  renderPaginationControls('purchases-pagination', purchases.length, PURCHASES_PAGE_SIZE, purchasesCurrentPage, (page) => {
    purchasesCurrentPage = page;
    renderPurchasesList();
  });

  tbody.innerHTML = pagePurchases.map(p => `
    <tr>
      <td>${p.product_name || '-'}</td>
      <td class="font-monospace">${p.quantity}</td>
      <td class="font-monospace">${Math.round(p.unit_cost).toLocaleString()} ج.م</td>
      <td class="font-monospace fw-bold text-danger">${Math.round(p.total_cost).toLocaleString()} ج.م</td>
      <td>${p.supplier || '-'}</td>
      <td class="text-muted" style="font-size: 0.7rem;">${p.date}</td>
      <td>
        <button class="btn btn-sm btn-outline-danger p-1 border-0" onclick="deletePurchase('${p.id}')" title="حذف" style="background: #fee2e2; color: #ef4444;"><i class="bi bi-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

window.deletePurchase = function(purchaseId) {
  let purchases = JSON.parse(localStorage.getItem('gpu_purchases')) || [];
  purchases = purchases.filter(p => p.id !== purchaseId);
  localStorage.setItem('gpu_purchases', JSON.stringify(purchases));
  renderPurchasesList();
  showToast('تم حذف عملية الشراء', 'success');
};

// ==========================================
// Order Confirm / Reject workflow
// ==========================================
// This is the single most important rule in the system: stock is NOT
// deducted and revenue is NOT counted until an admin explicitly presses
// "Confirm" on a Pending order. Rejecting an order never touches stock
// or revenue at all.

window.confirmOrder = async function(orderId) {
  let orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return;

  const order = orders[idx];
  if (order.status !== 'Pending') {
    showToast('لا يمكن تأكيد طلب تم البت فيه بالفعل', 'error');
    return;
  }

  if (!confirm(`هل تريد تأكيد الطلب ${orderId}؟ سيتم خصم الكمية من المخزون وإضافة قيمته إلى الإيرادات.`)) return;

  // Supabase RPC confirm_order() deducts stock AND flips status to
  // Confirmed in one atomic transaction, then gpuSync.pull() refreshes the
  // local products/orders cache from the database.
  if (window.gpuSync) {
    const ok = await window.gpuSync.confirmOrder(orderId);
    if (!ok) return;
  } else {
    // Offline fallback (no Supabase available): do it locally, same as before.
    let storeProducts = JSON.parse(localStorage.getItem('gpu_products')) || [];
    (order.items || []).forEach(item => {
      const pIndex = storeProducts.findIndex(p => p.id === item.id);
      if (pIndex !== -1) {
        storeProducts[pIndex].stock = Math.max(0, (storeProducts[pIndex].stock || 0) - item.quantity);
        if (storeProducts[pIndex].stock === 0) {
          storeProducts[pIndex].availability_en = 'Out of Stock';
          storeProducts[pIndex].availability_ar = 'نفذت الكمية';
        }
      }
    });
    localStorage.setItem('gpu_products', JSON.stringify(storeProducts));
    window.PRODUCTS_DATA = storeProducts;
    order.status = 'Confirmed';
  }

  // Re-read the (now DB-fresh, if gpuSync ran) orders cache and stamp who
  // confirmed it and when — these two fields are audit-trail-only, so they
  // live in the local cache rather than the database schema.
  orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  const freshIdx = orders.findIndex(o => o.id === orderId);
  if (freshIdx === -1) return;
  const freshOrder = orders[freshIdx];
  freshOrder.confirmedAt = Date.now();
  const currentStaff = getSession();
  freshOrder.confirmedBy = currentStaff ? (currentStaff.name || currentStaff.email) : 'موظف غير معروف';
  orders[freshIdx] = freshOrder;
  localStorage.setItem('gpu_orders', JSON.stringify(orders));

  logAdminActivity(`تم تأكيد الطلب ${orderId} بواسطة ${freshOrder.confirmedBy}`);
  notifyCustomerOrderStatus(freshOrder, 'Confirmed');
  showToast(`تم تأكيد الطلب ${orderId} وخصم الكمية وإضافة القيمة للإيرادات`, 'success');

  renderOrdersList();
  refreshDashboardViews();
};

window.rejectOrder = async function(orderId) {
  let orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx === -1) return;

  const order = orders[idx];
  if (order.status !== 'Pending') {
    showToast('لا يمكن رفض طلب تم البت فيه بالفعل', 'error');
    return;
  }

  const reason = prompt('سبب الرفض (اختياري):', '') || '';

  // No stock deduction, no revenue impact — just a status change.
  if (window.gpuSync) {
    const ok = await window.gpuSync.updateOrderStatus(orderId, 'Rejected');
    if (!ok) return;
  }

  order.status = 'Rejected';
  order.rejectedAt = Date.now();
  order.rejectionReason = reason;

  const currentStaff = getSession();
  order.rejectedBy = currentStaff ? (currentStaff.name || currentStaff.email) : 'موظف غير معروف';

  orders[idx] = order;
  localStorage.setItem('gpu_orders', JSON.stringify(orders));

  logAdminActivity(`تم رفض الطلب ${orderId} بواسطة ${order.rejectedBy}${reason ? ' - السبب: ' + reason : ''}`);
  notifyCustomerOrderStatus(order, 'Rejected', reason);
  showToast(`تم رفض الطلب ${orderId}`, 'success');

  renderOrdersList();
  refreshDashboardViews();
};

// Lightweight customer-facing notification log. There's no backend/push
// channel in this static build, so this writes to the gpu_notifications
// key that the storefront already reads from (see products-data.js).
function notifyCustomerOrderStatus(order, status, reason) {
  try {
    const notifications = JSON.parse(localStorage.getItem('gpu_notifications')) || [];
    const message = status === 'Confirmed'
      ? `تم تأكيد طلبك رقم ${order.id}. جاري تجهيزه الآن.`
      : `للأسف تم رفض طلبك رقم ${order.id}.${reason ? ' السبب: ' + reason : ''}`;
    notifications.push({
      orderId: order.id,
      customerEmail: order.customer ? order.customer.email : null,
      customerPhone: order.customer ? order.customer.phone : null,
      status,
      message,
      createdAt: Date.now(),
      read: false
    });
    localStorage.setItem('gpu_notifications', JSON.stringify(notifications));
  } catch (err) {
    console.warn('GPU Trades: could not write customer notification.', err);
  }
}

// ==========================================
// Order invoice viewer / printer
// ==========================================
window.showOrderInvoice = function(orderId) {
  const orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  const order = orders.find(o => o.id === orderId);
  if (!order) {
    showToast('تعذر العثور على هذا الطلب', 'error');
    return;
  }

  const statusLabels = { 'Pending': 'قيد الانتظار', 'Confirmed': 'مؤكد', 'Preparing': 'جاري التجهيز', 'Shipping': 'قيد الشحن', 'Delivered': 'تم التسليم', 'Rejected': 'مرفوض', 'Cancelled': 'ملغي', 'Refunded': 'مسترجع' };
  const itemsRows = (order.items || []).map(i => `
    <tr>
      <td>${i.name_ar || i.name_en}</td>
      <td class="text-center">${i.quantity}</td>
      <td class="text-center">${Math.round(i.price).toLocaleString()} EGP</td>
      <td class="text-center fw-bold">${Math.round(i.price * i.quantity).toLocaleString()} EGP</td>
    </tr>
  `).join('');

  const body = document.getElementById('order-invoice-body');
  body.innerHTML = `
    <div id="printable-invoice-area">
      <div class="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h5 class="fw-bold text-dark mb-0">GPU Trades</h5>
          <small class="text-muted">فاتورة إلكترونية</small>
        </div>
        <div class="text-end">
          <div class="fw-bold text-primary font-monospace">${order.id}</div>
          <small class="text-muted">${order.date}</small>
        </div>
      </div>
      <div class="row g-3 mb-3">
        <div class="col-md-5">
          <div class="report-kpi-card">
            <div class="report-kpi-label">بيانات العميل</div>
            <div class="fw-semibold text-dark">${order.customer ? order.customer.name : '—'}</div>
            <div class="text-muted small">${order.customer ? order.customer.phone : ''}</div>
            <div class="text-muted small">${order.customer ? order.customer.address : ''}</div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="report-kpi-card">
            <div class="report-kpi-label">حالة الطلب</div>
            <div class="fw-semibold text-dark">${statusLabels[order.status] || order.status}</div>
            ${order.confirmedBy ? `<div class="text-muted small">أكده: ${order.confirmedBy}</div>` : ''}
            ${order.rejectedBy ? `<div class="text-muted small">رفضه: ${order.rejectedBy}${order.rejectionReason ? ' — ' + order.rejectionReason : ''}</div>` : ''}
          </div>
        </div>
        <div class="col-md-3 text-center">
          <div class="report-kpi-card d-flex flex-column align-items-center justify-content-center h-100">
            <div id="order-invoice-qr" class="d-flex justify-content-center"></div>
            <small class="text-muted d-block mt-1" style="font-size:0.6rem;">امسح لتفاصيل الفاتورة</small>
          </div>
        </div>
      </div>
      <table class="table table-sm table-bordered">
        <thead class="table-light">
          <tr><th>المنتج</th><th class="text-center">الكمية</th><th class="text-center">السعر</th><th class="text-center">الإجمالي</th></tr>
        </thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <div class="d-flex justify-content-end">
        <div style="min-width: 220px;">
          <div class="d-flex justify-content-between fs-8"><span>الإجمالي الفرعي</span><span>${Math.round(order.subtotal || order.total).toLocaleString()} EGP</span></div>
          ${order.discount ? `<div class="d-flex justify-content-between fs-8 text-danger"><span>الخصم</span><span>-${Math.round(order.discount).toLocaleString()} EGP</span></div>` : ''}
          <hr class="my-1">
          <div class="d-flex justify-content-between fw-bold text-dark"><span>الإجمالي الكلي</span><span>${Math.round(order.total).toLocaleString()} EGP</span></div>
        </div>
      </div>
    </div>
  `;

  // Render the QR code (contains a compact machine-readable summary of the
  // invoice — order id, total, and status) into the placeholder above.
  const qrContainer = document.getElementById('order-invoice-qr');
  if (qrContainer && window.QRCode) {
    const qrPayload = JSON.stringify({
      invoice: order.id,
      total: order.total,
      status: order.status,
      customer: order.customer ? order.customer.name : '',
      date: order.date
    });
    QRCode.toCanvas(qrPayload, { width: 90, margin: 1 }, (err, canvas) => {
      if (!err && canvas) qrContainer.appendChild(canvas);
    });
  }

  const modal = new bootstrap.Modal(document.getElementById('orderInvoiceModal'));
  modal.show();
};

// Downloads the currently-open invoice as a PDF file (client-side render
// via html2canvas -> jsPDF, so no server/backend is required).
window.downloadOrderInvoicePDF = function() {
  const area = document.getElementById('printable-invoice-area');
  if (!area || !window.html2canvas || !window.jspdf) {
    showToast('تعذر تجهيز ملف PDF، حاول تحديث الصفحة', 'error');
    return;
  }

  showToast('جاري تجهيز ملف PDF...', 'success');

  html2canvas(area, { scale: 2, backgroundColor: '#ffffff' }).then(canvas => {
    const { jsPDF } = window.jspdf;
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * pageWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);

    const invoiceIdMatch = area.querySelector('.text-primary.font-monospace');
    const invoiceId = invoiceIdMatch ? invoiceIdMatch.textContent.trim() : 'invoice';
    pdf.save(`${invoiceId}.pdf`);
  }).catch(err => {
    console.warn('GPU Trades: PDF generation failed.', err);
    showToast('حدث خطأ أثناء تجهيز ملف PDF', 'error');
  });
};

window.printOrderInvoice = function() {
  const printContents = document.getElementById('printable-invoice-area').innerHTML;
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  printWindow.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <title>فاتورة</title>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Cairo', Arial, sans-serif; padding: 24px; color:#111; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 14px; }
          .report-kpi-card { border: 1px solid #eee; border-radius: 8px; padding: 10px; }
          .report-kpi-label { font-size: 12px; color: #777; margin-bottom: 4px; }
        </style>
      </head>
      <body>${printContents}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); }, 300);
};

// Opens the "Edit Product" modal and fills it with the product's current data.
// Fixes the previously non-functional edit (pencil) button in the products table.
window.openEditModal = function(id) {
  const products = JSON.parse(localStorage.getItem('gpu_products')) || [];
  const product = products.find(p => p.id === id);
  if (!product) {
    showToast('تعذر العثور على بيانات هذا المنتج', 'error');
    return;
  }

  // Reset any previously staged image upload so it doesn't leak into this product
  editImageBase64 = '';
  const editImageFileInput = document.getElementById('edit-image-file');
  if (editImageFileInput) editImageFileInput.value = '';

  document.getElementById('edit-product-id').value = product.id;
  document.getElementById('edit-name-en').value = product.name_en || '';
  document.getElementById('edit-name-ar').value = product.name_ar || '';
  document.getElementById('edit-cat-en').value = product.category_en || product.category || '';
  document.getElementById('edit-brand').value = product.brand || '';
  document.getElementById('edit-price').value = product.price || 0;
  document.getElementById('edit-discount').value = product.discount || 0;
  document.getElementById('edit-stock').value = product.stock || 0;
  document.getElementById('edit-image-url').value = '';
  document.getElementById('edit-warranty-en').value = product.warranty_en || '';
  document.getElementById('edit-warranty-ar').value = product.warranty_ar || '';
  document.getElementById('edit-desc-en').value = product.description_en || '';
  document.getElementById('edit-desc-ar').value = product.description_ar || '';
  renderSpecRows('edit', product.specs_en || {});

  const modalEl = document.getElementById('editProductModal');
  const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
  modal.show();
};

window.updateOrderStatus = async function(orderId, newStatus) {
  let orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  const idx = orders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    if (window.gpuSync) {
      const ok = await window.gpuSync.updateOrderStatus(orderId, newStatus);
      if (!ok) return;
    }
    orders[idx].status = newStatus;
    localStorage.setItem('gpu_orders', JSON.stringify(orders));
    logAdminActivity(`تم تغيير حالة الطلب ${orderId} إلى: ${newStatus}`);
    showToast(`تم تحديث حالة الطلب إلى ${newStatus}`, "success");
    refreshDashboardViews();
  }
};

window.deleteOrder = async function(orderId) {
  if (confirm("هل تريد حذف سجل هذا الطلب نهائيًا؟")) {
    if (window.gpuSync) {
      const ok = await window.gpuSync.deleteOrder(orderId);
      if (!ok) return;
    }
    let orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
    orders = orders.filter(o => o.id !== orderId);
    localStorage.setItem('gpu_orders', JSON.stringify(orders));
    renderOrdersList();
    refreshDashboardViews();
  }
};

// ==========================================
// TAB 7: Customer Management
// ==========================================
function renderCustomersList() {
  const tbody = document.getElementById('customers-table-body');
  if (!tbody) return;
  const allUsers = JSON.parse(localStorage.getItem('gpu_users')) || [];
  let users = allUsers.filter(u => !ADMIN_ROLES.includes(u.role));
  const orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];

  // Precompute order stats per user once
  const statsByEmail = {};
  users.forEach(u => {
    const userOrders = orders.filter(o => o.customer && o.customer.email === u.email);
    statsByEmail[u.email] = {
      orderCount: userOrders.length,
      totalSpend: userOrders.reduce((sum, o) => sum + o.total, 0)
    };
  });

  // Search
  const searchInput = document.getElementById('customers-search-input');
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  if (searchTerm) {
    users = users.filter(u => {
      const haystack = [u.name, u.email, u.phone].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(searchTerm);
    });
  }

  // Filter by account status
  const statusFilter = document.getElementById('customers-status-filter');
  if (statusFilter && statusFilter.value) {
    const wantActive = statusFilter.value === 'active';
    users = users.filter(u => (u.active !== false) === wantActive);
  }

  // Sort
  const sortSelect = document.getElementById('customers-sort-select');
  const sortVal = sortSelect ? sortSelect.value : 'date-desc';
  users.sort((a, b) => {
    if (sortVal === 'date-asc') return (getRecordTimestamp(a) || 0) - (getRecordTimestamp(b) || 0);
    if (sortVal === 'spend-desc') return statsByEmail[b.email].totalSpend - statsByEmail[a.email].totalSpend;
    if (sortVal === 'orders-desc') return statsByEmail[b.email].orderCount - statsByEmail[a.email].orderCount;
    return (getRecordTimestamp(b) || 0) - (getRecordTimestamp(a) || 0); // date-desc default
  });

  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted fs-8">لا يوجد عملاء مطابقون</td></tr>`;
    const paginationEl = document.getElementById('customers-pagination');
    if (paginationEl) paginationEl.innerHTML = '';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(users.length / ORDERS_PAGE_SIZE));
  if (customersCurrentPage > totalPages) customersCurrentPage = totalPages;
  const pageUsers = users.slice((customersCurrentPage - 1) * ORDERS_PAGE_SIZE, customersCurrentPage * ORDERS_PAGE_SIZE);

  renderPaginationControls('customers-pagination', users.length, ORDERS_PAGE_SIZE, customersCurrentPage, (page) => {
    customersCurrentPage = page;
    renderCustomersList();
  });

  tbody.innerHTML = pageUsers.map(user => {
    const orderCount = statsByEmail[user.email].orderCount;
    const totalSpend = statsByEmail[user.email].totalSpend;
    
    const activeStatus = user.active !== false;
    const statusBadge = activeStatus ? `<span class="admin-badge admin-badge-success">نشط</span>` : `<span class="admin-badge admin-badge-danger">موقوف</span>`;
    
    return `
      <tr>
        <td>
          <div class="rounded-circle bg-light border d-flex align-items-center justify-content-center font-bold text-primary" style="width: 36px; height: 36px;">
            ${user.name.charAt(0).toUpperCase()}
          </div>
        </td>
        <td class="fw-bold text-dark">${user.name}</td>
        <td class="text-start text-muted">${user.email}</td>
        <td class="font-monospace text-dark">${user.phone || '-'}</td>
        <td class="text-muted" style="font-size: 0.7rem;">${user.date}</td>
        <td class="font-monospace fw-bold">${orderCount}</td>
        <td class="font-monospace text-success fw-bold">${Math.round(totalSpend).toLocaleString()} EGP</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-outline-primary fs-9 py-0 px-2" onclick="viewCustomerDetail('${user.email}')"><i class="bi bi-eye"></i> عرض</button>
            <button class="btn btn-sm btn-outline-warning fs-9 py-0 px-2" onclick="toggleUserStatus('${user.email}')">${activeStatus ? 'إيقاف' : 'تفعيل'}</button>
            <button class="btn btn-sm btn-outline-danger p-1 border-0" onclick="deleteUser('${user.email}')" style="background: #fee2e2; color: #ef4444;"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.viewCustomerDetail = function(email) {
  const allUsers = JSON.parse(localStorage.getItem('gpu_users')) || [];
  const user = allUsers.find(u => u.email === email);
  if (!user) return;

  const orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  const userOrders = orders.filter(o => o.customer && o.customer.email === email)
    .sort((a, b) => (getRecordTimestamp(b) || 0) - (getRecordTimestamp(a) || 0));

  const statusLabels = { 'Pending': 'قيد الانتظار', 'Confirmed': 'مؤكد', 'Preparing': 'جاري التجهيز', 'Shipping': 'قيد الشحن', 'Delivered': 'تم التسليم', 'Cancelled': 'ملغي', 'Refunded': 'مسترجع' };
  const totalSpend = userOrders.filter(o => o.status !== 'Cancelled' && o.status !== 'Refunded').reduce((sum, o) => sum + o.total, 0);
  const activeStatus = user.active !== false;

  document.getElementById('customer-detail-name').textContent = user.name;
  document.getElementById('customer-detail-email').textContent = user.email;
  document.getElementById('customer-detail-phone').textContent = user.phone || '—';
  document.getElementById('customer-detail-address').textContent = user.address || (userOrders[0] && userOrders[0].customer ? userOrders[0].customer.address : '—');
  document.getElementById('customer-detail-since').textContent = user.date || '—';
  document.getElementById('customer-detail-status').innerHTML = activeStatus ? `<span class="admin-badge admin-badge-success">نشط</span>` : `<span class="admin-badge admin-badge-danger">موقوف</span>`;
  document.getElementById('customer-detail-order-count').textContent = userOrders.length;
  document.getElementById('customer-detail-total-spend').textContent = `${Math.round(totalSpend).toLocaleString()} ج.م`;

  const ordersBody = document.getElementById('customer-detail-orders-body');
  if (userOrders.length === 0) {
    ordersBody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted fs-8">لا يوجد طلبات لهذا العميل بعد</td></tr>`;
  } else {
    ordersBody.innerHTML = userOrders.map(order => {
      const items = order.items.map(i => `${i.name_ar || i.name_en} (x${i.quantity})`).join(', ');
      return `
        <tr>
          <td class="font-monospace text-primary fw-bold">${order.id}</td>
          <td class="text-start text-truncate" style="max-width: 220px;" title="${items}">${items}</td>
          <td class="font-monospace fw-bold">${Math.round(order.total).toLocaleString()} ج.م</td>
          <td class="text-muted" style="font-size: 0.7rem;">${order.date}</td>
          <td><span class="admin-badge admin-badge-info">${statusLabels[order.status] || order.status}</span></td>
        </tr>
      `;
    }).join('');
  }

  const modal = new bootstrap.Modal(document.getElementById('customerDetailModal'));
  modal.show();
};

window.toggleUserStatus = function(email) {
  let users = JSON.parse(localStorage.getItem('gpu_users')) || [];
  const idx = users.findIndex(u => u.email === email);
  if (idx !== -1) {
    users[idx].active = users[idx].active === false;
    localStorage.setItem('gpu_users', JSON.stringify(users));
    renderCustomersList();
    logAdminActivity(`تم تغيير حالة العميل: ${email}`);
    showToast("تم تغيير حالة العميل!", "success");
  }
};

window.deleteUser = function(email) {
  if (confirm("هل أنت متأكد من حذف حساب هذا العميل نهائيًا؟")) {
    let users = JSON.parse(localStorage.getItem('gpu_users')) || [];
    users = users.filter(u => u.email !== email);
    localStorage.setItem('gpu_users', JSON.stringify(users));
    renderCustomersList();
    refreshDashboardViews();
  }
};

// ==========================================
// TAB 8: Contact Messages
// ==========================================
function renderMessagesList() {
  const tbody = document.getElementById('messages-table-body');
  if (!tbody) return;
  const messages = JSON.parse(localStorage.getItem('gpu_messages')) || [];
  
  if (messages.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted fs-8">لا توجد رسائل واردة</td></tr>`;
    return;
  }
  
  tbody.innerHTML = messages.map(msg => {
    const activeClass = msg.read ? '' : 'fw-bold text-dark';
    const statusBadge = msg.read ? `<span class="admin-badge bg-light text-dark">تمت القراءة</span>` : `<span class="admin-badge admin-badge-primary">جديدة</span>`;
    
    return `
      <tr class="${activeClass}">
        <td><i class="bi ${msg.read ? 'bi-envelope-open text-muted' : 'bi-envelope-fill text-primary'}"></i></td>
        <td>${msg.name}</td>
        <td class="text-start">${msg.email}</td>
        <td class="text-start text-truncate" style="max-width: 200px;" title="${msg.message}">${msg.subject}</td>
        <td style="font-size: 0.7rem;" class="text-muted">${msg.date}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-outline-primary fs-9 py-1 px-2" onclick="openMessageDetail('${msg.id}')">عرض</button>
            <button class="btn btn-sm btn-outline-danger p-1 border-0" onclick="deleteMessage('${msg.id}')" style="background: #fee2e2; color: #ef4444;"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.openMessageDetail = function(msgId) {
  let messages = JSON.parse(localStorage.getItem('gpu_messages')) || [];
  const idx = messages.findIndex(m => m.id === msgId);
  if (idx !== -1) {
    messages[idx].read = true;
    localStorage.setItem('gpu_messages', JSON.stringify(messages));
    if (window.gpuSync) window.gpuSync.markMessageRead(msgId, true);
    
    const msg = messages[idx];
    document.getElementById('msg-detail-sender').textContent = `${msg.name} (${msg.email}) | ${msg.phone}`;
    document.getElementById('msg-detail-subject').textContent = msg.subject;
    document.getElementById('msg-detail-body').textContent = msg.message;
    document.getElementById('msg-reply-subject').value = `رد: ${msg.subject}`;
    document.getElementById('msg-reply-id').value = msg.id;
    
    const modal = new bootstrap.Modal(document.getElementById('messageDetailModal'));
    modal.show();
    
    renderMessagesList();
    renderAdminTopbar();
  }
};

window.sendSimulatedReply = function() {
  const replyBody = document.getElementById('msg-reply-body').value.trim();
  if (!replyBody) {
    showToast("لا يمكن إرسال رد فارغ!", "error");
    return;
  }
  showToast("تم إرسال الرد إلى العميل بنجاح!", "success");
  bootstrap.Modal.getInstance(document.getElementById('messageDetailModal')).hide();
  document.getElementById('msg-reply-body').value = '';
  logAdminActivity("تم إرسال رد على استفسار دعم");
};

window.deleteMessage = async function(msgId) {
  if (confirm("هل تريد حذف هذه الرسالة نهائيًا؟")) {
    if (window.gpuSync) {
      const ok = await window.gpuSync.deleteMessage(msgId);
      if (!ok) return;
    }
    let messages = JSON.parse(localStorage.getItem('gpu_messages')) || [];
    messages = messages.filter(m => m.id !== msgId);
    localStorage.setItem('gpu_messages', JSON.stringify(messages));
    renderMessagesList();
  }
};

// ==========================================
// TAB 9: Reviews Management
// ==========================================
function renderReviewsList() {
  const tbody = document.getElementById('reviews-table-body');
  if (!tbody) return;
  const reviews = JSON.parse(localStorage.getItem('gpu_reviews')) || [];
  
  if (reviews.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted fs-8">لا توجد تقييمات</td></tr>`;
    return;
  }
  
  tbody.innerHTML = reviews.map(rev => {
    let badge = `<span class="admin-badge admin-badge-warning">قيد المراجعة</span>`;
    if (rev.status === 'Approved') badge = `<span class="admin-badge admin-badge-success">معتمد</span>`;
    else if (rev.status === 'Rejected') badge = `<span class="admin-badge admin-badge-danger">مرفوض</span>`;
    
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += `<i class="bi bi-star${i <= rev.rating ? '-fill text-warning' : ''}" style="font-size: 0.7rem;"></i>`;
    }
    
    return `
      <tr>
        <td class="fw-semibold text-dark">${rev.customerName}</td>
        <td><small class="badge bg-light text-dark">${rev.productName}</small></td>
        <td>${stars}</td>
        <td class="text-start text-truncate" style="max-width: 250px;" title="${rev.reviewText}">${rev.reviewText}</td>
        <td>${badge}</td>
        <td>
          <div class="d-flex gap-1 justify-content-center">
            ${rev.status !== 'Approved' ? `<button class="btn btn-sm btn-outline-success fs-9 py-0 px-2" onclick="approveReview(${rev.id})">قبول</button>` : ''}
            ${rev.status !== 'Rejected' ? `<button class="btn btn-sm btn-outline-warning fs-9 py-0 px-2" onclick="rejectReview(${rev.id})">رفض</button>` : ''}
            <button class="btn btn-sm btn-outline-danger p-1 border-0" onclick="deleteReview(${rev.id})" style="background: #fee2e2; color: #ef4444;"><i class="bi bi-trash"></i></button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

window.approveReview = async function(id) {
  let reviews = JSON.parse(localStorage.getItem('gpu_reviews')) || [];
  const idx = reviews.findIndex(r => r.id === id);
  if (idx !== -1) {
    if (window.gpuSync) {
      const ok = await window.gpuSync.setReviewStatus(id, 'Approved');
      if (!ok) return;
    }
    reviews[idx].status = 'Approved';
    localStorage.setItem('gpu_reviews', JSON.stringify(reviews));
    renderReviewsList();
    showToast("تم قبول التقييم ونشره في صفحة المنتج!", "success");
    logAdminActivity(`تم قبول تقييم للمنتج رقم: ${reviews[idx].productId}`);
  }
};

window.rejectReview = async function(id) {
  let reviews = JSON.parse(localStorage.getItem('gpu_reviews')) || [];
  const idx = reviews.findIndex(r => r.id === id);
  if (idx !== -1) {
    if (window.gpuSync) {
      const ok = await window.gpuSync.setReviewStatus(id, 'Rejected');
      if (!ok) return;
    }
    reviews[idx].status = 'Rejected';
    localStorage.setItem('gpu_reviews', JSON.stringify(reviews));
    renderReviewsList();
    showToast("تم رفض التقييم!", "info");
  }
};

window.deleteReview = async function(id) {
  if (confirm("هل تريد حذف هذا التقييم نهائيًا؟")) {
    if (window.gpuSync) {
      const ok = await window.gpuSync.deleteReview(id);
      if (!ok) return;
    }
    let reviews = JSON.parse(localStorage.getItem('gpu_reviews')) || [];
    reviews = reviews.filter(r => r.id !== id);
    localStorage.setItem('gpu_reviews', JSON.stringify(reviews));
    renderReviewsList();
  }
};

// ==========================================
// TAB 10: Coupon Manager
// ==========================================
function renderCouponsList() {
  const tbody = document.getElementById('coupons-table-body');
  if (!tbody) return;
  const coupons = JSON.parse(localStorage.getItem('gpu_coupons')) || {};
  if (Object.keys(coupons).length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted fs-8">لا توجد أكواد خصم بعد</td></tr>`;
    return;
  }
  
  tbody.innerHTML = Object.entries(coupons).map(([code, config]) => {
    return `
      <tr>
        <td class="font-monospace fw-bold text-primary">${code}</td>
        <td class="font-monospace">${config.discount}%</td>
        <td class="font-monospace text-muted">${config.expiry}</td>
        <td class="font-monospace">${config.minOrder} EGP</td>
        <td class="font-monospace">${config.usageCount} / ${config.usageLimit}</td>
        <td>
          <button class="btn btn-sm btn-outline-danger p-1 border-0" onclick="deleteCoupon('${code}')" style="background: #fee2e2; color: #ef4444;"><i class="bi bi-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

window.deleteCoupon = async function(code) {
  if (confirm("هل أنت متأكد من حذف كود الخصم " + code + "؟")) {
    if (window.gpuSync) {
      const ok = await window.gpuSync.deleteCoupon(code);
      if (!ok) return;
    }
    let coupons = JSON.parse(localStorage.getItem('gpu_coupons')) || {};
    delete coupons[code];
    localStorage.setItem('gpu_coupons', JSON.stringify(coupons));
    renderCouponsList();
    logAdminActivity(`تم حذف كود الخصم: ${code}`);
    showToast("تم حذف كود الخصم!", "success");
  }
};

// ==========================================
// TAB 11: Offers & Promotions
// ==========================================
function renderOffersList() {
  const tbody = document.getElementById('offers-table-body');
  if (!tbody) return;
  
  const offers = JSON.parse(localStorage.getItem('gpu_offers')) || {};
  offers.weeklyDiscountIds = offers.weeklyDiscountIds || [];
  offers.featuredIds = offers.featuredIds || [];
  const products = JSON.parse(localStorage.getItem('gpu_products')) || [];
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted fs-8">لا توجد منتجات لإضافتها إلى العروض بعد</td></tr>`;
    return;
  }
  
  tbody.innerHTML = products.map(p => {
    const isFlash = offers.flashSaleId === p.id ? 'checked' : '';
    const isWeekly = offers.weeklyDiscountIds.includes(p.id) ? 'checked' : '';
    const isFeatured = offers.featuredIds.includes(p.id) ? 'checked' : '';
    
    return `
      <tr>
        <td>
          <div class="bg-light rounded p-1 border d-flex align-items-center justify-content-center" style="width: 50px; height: 50px; overflow: hidden;">
            ${p.image.includes('<svg') || p.image.includes('<img') ? p.image : `<img src="${p.image}" style="width: 100%; height: auto; object-fit: contain;">`}
          </div>
        </td>
        <td class="text-start fw-semibold text-dark">${p.name_ar || p.name_en}</td>
        <td>
          <input type="radio" name="flashSaleRadio" onclick="setFlashSalePromo('${p.id}')" ${isFlash}>
        </td>
        <td>
          <input type="checkbox" onclick="toggleWeeklyPromo('${p.id}', this.checked)" ${isWeekly}>
        </td>
        <td>
          <input type="checkbox" onclick="toggleFeaturedPromo('${p.id}', this.checked)" ${isFeatured}>
        </td>
      </tr>
    `;
  }).join('');
}

window.setFlashSalePromo = function(id) {
  let offers = JSON.parse(localStorage.getItem('gpu_offers')) || {};
  offers.flashSaleId = id;
  localStorage.setItem('gpu_offers', JSON.stringify(offers));
  logAdminActivity(`تم تعيين عرض سريع للمنتج رقم: ${id}`);
  showToast("تم تعيين منتج العرض السريع!", "success");
};

window.toggleWeeklyPromo = function(id, check) {
  let offers = JSON.parse(localStorage.getItem('gpu_offers')) || {};
  offers.weeklyDiscountIds = offers.weeklyDiscountIds || [];
  if (check) {
    if (!offers.weeklyDiscountIds.includes(id)) offers.weeklyDiscountIds.push(id);
  } else {
    offers.weeklyDiscountIds = offers.weeklyDiscountIds.filter(x => x !== id);
  }
  localStorage.setItem('gpu_offers', JSON.stringify(offers));
  renderOffersList();
};

window.toggleFeaturedPromo = function(id, check) {
  let offers = JSON.parse(localStorage.getItem('gpu_offers')) || {};
  offers.featuredIds = offers.featuredIds || [];
  if (check) {
    if (!offers.featuredIds.includes(id)) offers.featuredIds.push(id);
  } else {
    offers.featuredIds = offers.featuredIds.filter(x => x !== id);
  }
  localStorage.setItem('gpu_offers', JSON.stringify(offers));
  renderOffersList();
};

// ==========================================
// TAB 12: User Roles / Permissions (real Supabase-backed staff accounts)
// ==========================================
const STAFF_ROLE_OPTIONS = ['Super Admin', 'Admin', 'Warehouse', 'Sales', 'Customer Support', 'Accountant'];

async function renderUsersList() {
  const tbody = document.getElementById('users-table-body');
  const invitesBody = document.getElementById('invites-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted fs-8">جارِ التحميل...</td></tr>`;

  const { data: staff, error } = await window.sb
    .from('staff_profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-danger fs-8">تعذر تحميل حسابات الموظفين (تحقق من صلاحيتك).</td></tr>`;
    return;
  }

  const session = getSession();
  const superAdminCount = (staff || []).filter(u => u.role === 'Super Admin').length;

  if (!staff || staff.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted fs-8">لا توجد حسابات موظفين</td></tr>`;
  } else {
    tbody.innerHTML = staff.map((a) => {
      const isSelf = session && a.id === session.id;
      const isLastSuperAdmin = a.role === 'Super Admin' && superAdminCount <= 1;
      const disableDelete = isSelf || isLastSuperAdmin;
      const deleteTitle = isSelf ? "لا يمكنك حذف حسابك الخاص" : isLastSuperAdmin ? "يجب وجود مشرف عام واحد على الأقل" : "إلغاء صلاحية الموظف";
      const roleOptions = STAFF_ROLE_OPTIONS.map(r => `<option value="${r}" ${a.role === r ? 'selected' : ''}>${roleLabelAr(r)}</option>`).join('');

      return `
        <tr>
          <td class="fw-bold text-dark">${a.full_name}${isSelf ? ' <span class="badge bg-secondary-subtle text-secondary fs-9">أنت</span>' : ''}${!a.is_active ? ' <span class="badge bg-danger-subtle text-danger fs-9">موقوف</span>' : ''}</td>
          <td>${a.email}</td>
          <td>
            <select class="form-select form-select-sm d-inline-block" style="width:150px;" ${isSelf ? 'disabled' : ''} onchange="changeStaffAccountRole('${a.id}', this.value)">
              ${roleOptions}
            </select>
          </td>
          <td class="d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-outline-secondary p-1 border-0" title="${a.is_active ? 'إيقاف الحساب' : 'تفعيل الحساب'}" ${isSelf ? 'disabled' : ''} onclick="toggleStaffActive('${a.id}', ${!a.is_active})"><i class="bi ${a.is_active ? 'bi-pause-circle' : 'bi-play-circle'}"></i></button>
            <button class="btn btn-sm btn-outline-danger p-1 border-0" ${disableDelete ? 'disabled' : ''} title="${deleteTitle}" onclick="deleteStaffAdmin('${a.id}', '${a.email}')" style="background: ${disableDelete ? '#f1f5f9' : '#fee2e2'}; color: ${disableDelete ? '#94a3b8' : '#ef4444'};"><i class="bi bi-trash"></i></button>
          </td>
        </tr>
      `;
    }).join('');
  }

  if (invitesBody) {
    const { data: invites } = await window.sb
      .from('staff_invites')
      .select('*')
      .eq('used', false)
      .order('created_at', { ascending: false });

    if (!invites || invites.length === 0) {
      invitesBody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted fs-8">لا توجد دعوات معلّقة</td></tr>`;
    } else {
      invitesBody.innerHTML = invites.map(inv => `
        <tr>
          <td>${inv.full_name || '-'}</td>
          <td>${inv.email}</td>
          <td>${roleLabelAr(inv.role)}</td>
          <td>
            <button class="btn btn-sm btn-outline-danger p-1 border-0" title="إلغاء الدعوة" onclick="cancelStaffInvite(${inv.id})" style="background:#fee2e2; color:#ef4444;"><i class="bi bi-x-lg"></i></button>
          </td>
        </tr>
      `).join('');
    }
  }
}

window.changeStaffAccountRole = async function(staffId, newRole) {
  const { data: staff } = await window.sb.from('staff_profiles').select('id, role').eq('id', staffId).maybeSingle();
  if (!staff) return;

  if (staff.role === 'Super Admin' && newRole !== 'Super Admin') {
    const { count } = await window.sb.from('staff_profiles').select('id', { count: 'exact', head: true }).eq('role', 'Super Admin');
    if ((count || 0) <= 1) {
      showToast('يجب أن يبقى مشرف عام واحد على الأقل.', 'error');
      renderUsersList();
      return;
    }
  }

  const { error } = await window.sb.from('staff_profiles').update({ role: newRole }).eq('id', staffId);
  if (error) {
    showToast('تعذر تحديث الصلاحية: ' + error.message, 'error');
    renderUsersList();
    return;
  }
  logAdminActivity(`تم تغيير صلاحية ${staffId} إلى ${newRole}`);
  showToast('تم تحديث صلاحية الموظف.', 'success');
  renderUsersList();
};

window.toggleStaffActive = async function(staffId, makeActive) {
  const { error } = await window.sb.from('staff_profiles').update({ is_active: makeActive }).eq('id', staffId);
  if (error) {
    showToast('تعذر تنفيذ العملية: ' + error.message, 'error');
    return;
  }
  logAdminActivity(makeActive ? `تم تفعيل حساب موظف: ${staffId}` : `تم إيقاف حساب موظف: ${staffId}`);
  showToast(makeActive ? 'تم تفعيل الحساب.' : 'تم إيقاف الحساب.', 'success');
  renderUsersList();
};

window.deleteStaffAdmin = async function(staffId, email) {
  const session = getSession();
  if (session && staffId === session.id) {
    showToast("لا يمكنك حذف حسابك الخاص.", 'error');
    return;
  }

  const { data: target } = await window.sb.from('staff_profiles').select('role').eq('id', staffId).maybeSingle();
  if (target && target.role === 'Super Admin') {
    const { count } = await window.sb.from('staff_profiles').select('id', { count: 'exact', head: true }).eq('role', 'Super Admin');
    if ((count || 0) <= 1) {
      showToast('يجب أن يبقى مشرف عام واحد على الأقل.', 'error');
      return;
    }
  }

  // NOTE: this removes the staff_profiles row (revokes admin-console access
  // immediately). The underlying Supabase Auth user still exists — deleting
  // that requires the Admin API (service_role key), which must never live in
  // frontend code. Delete the auth user from the Supabase Dashboard if needed.
  const { error } = await window.sb.from('staff_profiles').delete().eq('id', staffId);
  if (error) {
    showToast('تعذر حذف الحساب: ' + error.message, 'error');
    return;
  }
  logAdminActivity(`تم إلغاء صلاحية الموظف: ${email}`);
  showToast('تم إلغاء صلاحية الموظف من لوحة التحكم.', 'success');
  renderUsersList();
};

window.cancelStaffInvite = async function(inviteId) {
  const { error } = await window.sb.from('staff_invites').delete().eq('id', inviteId);
  if (error) {
    showToast('تعذر إلغاء الدعوة: ' + error.message, 'error');
    return;
  }
  showToast('تم إلغاء الدعوة.', 'success');
  renderUsersList();
};

// ==========================================
// TAB 14: Sales Reports (real data, filterable by range)
// ==========================================
let currentReportRange = '7';

function renderReportsList(range) {
  const container = document.getElementById('reports-container');
  if (!container) return;
  if (range) currentReportRange = range;

  document.querySelectorAll('.report-range-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.range === currentReportRange);
  });

  const allOrders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  const now = new Date();
  let sinceTs = null;
  if (currentReportRange !== 'all') {
    const days = parseInt(currentReportRange, 10);
    sinceTs = now.getTime() - days * 24 * 60 * 60 * 1000;
  }

  const ordersInRange = allOrders.filter(o => {
    const ts = getRecordTimestamp(o);
    return sinceTs === null || (ts !== null && ts >= sinceTs);
  });

  const validOrders = ordersInRange.filter(o => o.status !== 'Cancelled' && o.status !== 'Refunded');
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total, 0);
  const orderCount = ordersInRange.length;
  const avgOrderValue = validOrders.length ? totalRevenue / validOrders.length : 0;
  const itemsSold = validOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

  // Build a day-by-day revenue series across the selected range (capped at 30 bars for readability)
  let chartDays = currentReportRange === 'all' ? 30 : Math.min(parseInt(currentReportRange, 10), 30);
  const dayBuckets = [];
  for (let i = chartDays - 1; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = dayStart.getTime() + 24 * 60 * 60 * 1000;
    const dayTotal = validOrders.filter(o => {
      const ts = getRecordTimestamp(o);
      return ts !== null && ts >= dayStart.getTime() && ts < dayEnd;
    }).reduce((sum, o) => sum + o.total, 0);
    dayBuckets.push({ label: dayStart.toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric' }), total: dayTotal });
  }
  const maxDayTotal = Math.max(1, ...dayBuckets.map(d => d.total));

  // Status breakdown
  const statusLabels = { 'Pending': 'قيد الانتظار', 'Confirmed': 'مؤكد', 'Preparing': 'جاري التجهيز', 'Shipping': 'قيد الشحن', 'Delivered': 'تم التسليم', 'Cancelled': 'ملغي', 'Refunded': 'مسترجع' };
  const statusColors = { 'Pending': '#f59e0b', 'Confirmed': '#3b82f6', 'Preparing': '#8b5cf6', 'Shipping': '#06b6d4', 'Delivered': '#22c55e', 'Cancelled': '#ef4444', 'Refunded': '#64748b' };
  const statusCounts = {};
  ordersInRange.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });

  // Top selling products within range
  const salesCount = {};
  validOrders.forEach(o => {
    o.items.forEach(i => {
      const key = i.name_ar || i.name_en;
      salesCount[key] = salesCount[key] || { qty: 0, revenue: 0 };
      salesCount[key].qty += i.quantity;
      salesCount[key].revenue += (i.price || 0) * i.quantity;
    });
  });
  const topProducts = Object.entries(salesCount).sort((a, b) => b[1].qty - a[1].qty).slice(0, 5);
  const maxQty = topProducts.length ? topProducts[0][1].qty : 1;

  const rangeLabelMap = { '7': 'آخر 7 أيام', '30': 'آخر 30 يوم', '90': 'آخر 3 أشهر', '365': 'آخر سنة', 'all': 'كل الفترات' };

  container.innerHTML = `
    <div class="row g-3 mb-4">
      <div class="col-6 col-lg-3">
        <div class="report-kpi-card">
          <div class="report-kpi-label">إجمالي الإيرادات</div>
          <div class="report-kpi-value">${Math.round(totalRevenue).toLocaleString()} <span class="fs-9">ج.م</span></div>
          <div class="report-kpi-sub">${rangeLabelMap[currentReportRange]}</div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="report-kpi-card">
          <div class="report-kpi-label">عدد الطلبات</div>
          <div class="report-kpi-value">${orderCount}</div>
          <div class="report-kpi-sub">${itemsSold} قطعة مباعة</div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="report-kpi-card">
          <div class="report-kpi-label">متوسط قيمة الطلب</div>
          <div class="report-kpi-value">${Math.round(avgOrderValue).toLocaleString()} <span class="fs-9">ج.م</span></div>
          <div class="report-kpi-sub">لكل طلب فعّال</div>
        </div>
      </div>
      <div class="col-6 col-lg-3">
        <div class="report-kpi-card">
          <div class="report-kpi-label">طلبات قيد الانتظار</div>
          <div class="report-kpi-value">${statusCounts['Pending'] || 0}</div>
          <div class="report-kpi-sub">تحتاج متابعة</div>
        </div>
      </div>
    </div>

    <div class="row g-3 mb-4">
      <div class="col-lg-8">
        <div class="admin-card h-100">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h6 class="fw-bold mb-0 fs-8">الإيرادات اليومية (ج.م)</h6>
            <button class="btn btn-sm btn-outline-secondary fs-9" onclick="exportReportFile()"><i class="bi bi-download me-1"></i>تصدير CSV</button>
          </div>
          ${validOrders.length === 0
            ? `<div class="dash-empty-state"><i class="bi bi-bar-chart"></i>لا توجد مبيعات في هذه الفترة</div>`
            : `<div class="report-bar-chart">
                ${dayBuckets.map(d => `
                  <div class="report-bar-col" title="${d.label}: ${Math.round(d.total).toLocaleString()} ج.م">
                    <div class="report-bar" style="height:${Math.max(2, Math.round((d.total / maxDayTotal) * 100))}%;"></div>
                    <div class="report-bar-label">${d.label}</div>
                  </div>
                `).join('')}
              </div>`
          }
        </div>
      </div>
      <div class="col-lg-4">
        <div class="admin-card h-100">
          <h6 class="fw-bold mb-3 fs-8">حالات الطلبات</h6>
          ${Object.keys(statusCounts).length === 0
            ? `<div class="dash-empty-state"><i class="bi bi-receipt"></i>لا توجد طلبات</div>`
            : Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => `
                <div class="report-status-row">
                  <span class="report-status-dot" style="background:${statusColors[status] || '#94a3b8'};"></span>
                  <span class="report-status-name">${statusLabels[status] || status}</span>
                  <span class="report-status-count">${count}</span>
                </div>
              `).join('')
          }
        </div>
      </div>
    </div>

    <div class="admin-card">
      <h6 class="fw-bold mb-3 fs-8">الأكثر مبيعًا في هذه الفترة</h6>
      ${topProducts.length === 0
        ? `<div class="dash-empty-state"><i class="bi bi-trophy"></i>لا توجد مبيعات مسجلة في هذه الفترة</div>`
        : topProducts.map(([name, data], idx) => `
            <div class="dash-rank-row">
              <div class="dash-rank-badge">${idx + 1}</div>
              <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fs-8 text-dark fw-semibold text-truncate" style="max-width: 260px;">${name}</span>
                  <span class="fs-9 text-muted font-monospace">${Math.round(data.revenue).toLocaleString()} ج.م</span>
                  <span class="badge bg-success-subtle text-success fs-9 font-monospace">${data.qty} قطعة</span>
                </div>
                <div class="dash-rank-bar-track"><div class="dash-rank-bar-fill" style="width:${Math.max(8, Math.round((data.qty / maxQty) * 100))}%;"></div></div>
              </div>
            </div>
          `).join('')
      }
    </div>
  `;
}

function bindReportRangeButtons() {
  document.querySelectorAll('.report-range-btn').forEach(btn => {
    btn.addEventListener('click', () => renderReportsList(btn.dataset.range));
  });
}

window.exportReportFile = function() {
  const allOrders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  const now = new Date();
  let sinceTs = null;
  if (currentReportRange !== 'all') {
    const days = parseInt(currentReportRange, 10);
    sinceTs = now.getTime() - days * 24 * 60 * 60 * 1000;
  }
  const ordersInRange = allOrders.filter(o => {
    const ts = getRecordTimestamp(o);
    return sinceTs === null || (ts !== null && ts >= sinceTs);
  });

  const rangeLabelMap = { '7': 'Last_7_Days', '30': 'Last_30_Days', '90': 'Last_3_Months', '365': 'Last_Year', 'all': 'All_Time' };
  const filename = `Sales_Report_${rangeLabelMap[currentReportRange]}_${Date.now()}.csv`;

  let content = "Invoice ID,Customer Name,Phone,Date,Status,Items,Total Amount (EGP)\n";
  ordersInRange.forEach(o => {
    const items = o.items.map(i => `${i.name_ar || i.name_en} x${i.quantity}`).join(' | ');
    const custName = o.customer ? o.customer.name : 'Direct Buyer';
    const custPhone = o.customer ? o.customer.phone : '-';
    content += `${o.id},"${custName}","${custPhone}",${o.date},${o.status},"${items}",${Math.round(o.total)}\n`;
  });

  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  logAdminActivity(`تم تصدير تقرير المبيعات (${rangeLabelMap[currentReportRange]})`);
  showToast(`تم تحميل ملف التقرير: ${filename}`, "success");
};

// ==========================================
// TAB 16: Admin Profile
// ==========================================
function renderProfileView() {
  const profile = JSON.parse(localStorage.getItem('gpu_profile'));
  if (!profile) return;
  
  document.getElementById('profile-fullname').value = profile.fullName;
  document.getElementById('profile-username').value = profile.username;
  document.getElementById('profile-email').value = profile.email;
  document.getElementById('profile-phone').value = profile.phone;
  
  // Show the real current session info (no fabricated IP/device data)
  const historyList = document.getElementById('profile-history-list');
  const session = getSession();
  if (historyList && session) {
    const loginTime = session.loginAt ? new Date(session.loginAt).toLocaleString() : '—';
    historyList.innerHTML = `
      <div class="d-flex align-items-center justify-content-between border-bottom pb-2 mb-2 font-monospace fs-8">
        <div>
          <span class="text-primary font-weight-bold">${session.email}</span>
          <small class="text-muted d-block text-truncate" style="max-width: 240px;">${navigator.userAgent}</small>
        </div>
        <span class="text-muted">${loginTime}</span>
      </div>
    `;
  }
}

// ==========================================
// TAB 19: Activity Audit Log
// ==========================================
async function renderActivityLog() {
  const tbody = document.getElementById('activity-log-table-body');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted fs-8">جارِ التحميل...</td></tr>`;

  const { data: log, error } = await window.sb
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-danger fs-8">تعذر تحميل سجل الأنشطة.</td></tr>`;
    return;
  }

  if (!log || log.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center py-3 text-muted fs-8">لا توجد عمليات مسجلة</td></tr>`;
    return;
  }

  tbody.innerHTML = log.map(l => {
    return `
      <tr>
        <td class="font-monospace" style="font-size: 0.75rem;">${new Date(l.created_at).toLocaleString()}</td>
        <td class="text-start fw-semibold text-dark">${l.action}</td>
        <td class="font-monospace text-primary">${l.staff_name || ''}</td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// GLOBAL SEARCH & FILTERS CONTROLLERS
// ==========================================
window.executeQuickSearch = function(query) {
  query = query.trim().toLowerCase();
  if (!query) {
    refreshDashboardViews();
    return;
  }

  // Filter products, orders, clients
  let products = JSON.parse(localStorage.getItem('gpu_products')) || [];
  let orders = JSON.parse(localStorage.getItem('gpu_orders')) || [];
  let users = JSON.parse(localStorage.getItem('gpu_users')) || [];

  const matchedProds = products.filter(p => p.name_en.toLowerCase().includes(query) || (p.name_ar && p.name_ar.includes(query)) || p.brand.toLowerCase().includes(query));
  const matchedOrders = orders.filter(o => o.id.toLowerCase().includes(query) || (o.customer && o.customer.name.toLowerCase().includes(query)));
  
  // Render search results wrapper in dashboard home dynamically
  const recentOrdersTbody = document.getElementById('recent-orders-tbody');
  if (recentOrdersTbody) {
    recentOrdersTbody.innerHTML = matchedOrders.map(order => {
      return `
        <tr class="table-info">
          <td class="font-monospace text-primary fw-bold">${order.id}</td>
          <td class="fw-semibold text-dark">${order.customer ? order.customer.name : 'Direct Buyer'}</td>
          <td class="text-truncate" style="max-width: 150px;">نتيجة بحث</td>
          <td class="font-monospace text-success fw-bold">${Math.round(order.total).toLocaleString()} EGP</td>
          <td><span class="admin-badge admin-badge-success">${order.status}</span></td>
        </tr>
      `;
    }).join('');
  }
  showToast(`اكتمل البحث: ${matchedProds.length} منتج / ${matchedOrders.length} طلب`, "info");
};

// ==========================================
// SETTINGS RENDERING
// ==========================================
function renderSettingsView() {
  const settings = JSON.parse(localStorage.getItem('gpu_settings'));
  if (!settings) return;
  
  document.getElementById('settings-store-name').value = settings.storeName;
  document.getElementById('settings-email').value = settings.email;
  document.getElementById('settings-phone').value = settings.phone;
  document.getElementById('settings-address').value = settings.address;
  document.getElementById('settings-currency').value = settings.currency;
  document.getElementById('settings-maintenance').checked = settings.maintenanceMode;
}

// ==========================================
// FORM SUBMIT HANDLERS
// ==========================================
function bindFormSubmissions() {
  // Store settings save
  const settingsForm = document.getElementById('settings-form');
  if (settingsForm) {
    settingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const newSettings = {
        storeName: document.getElementById('settings-store-name').value.trim(),
        email: document.getElementById('settings-email').value.trim(),
        phone: document.getElementById('settings-phone').value.trim(),
        address: document.getElementById('settings-address').value.trim(),
        currency: document.getElementById('settings-currency').value,
        maintenanceMode: document.getElementById('settings-maintenance').checked
      };
      localStorage.setItem('gpu_settings', JSON.stringify(newSettings));
      logAdminActivity("تم تحديث إعدادات النظام");
      showToast("تم حفظ إعدادات المتجر بنجاح!", "success");
    });
  }

  // Profile save
  const profileForm = document.getElementById('profile-form');
  if (profileForm) {
    profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let profile = JSON.parse(localStorage.getItem('gpu_profile'));
      // Display name/username/phone are freely editable cosmetic fields.
      // Email and role stay locked to the authenticated gpu_users account.
      profile.fullName = document.getElementById('profile-fullname').value.trim();
      profile.username = document.getElementById('profile-username').value.trim();
      profile.phone = document.getElementById('profile-phone').value.trim();
      localStorage.setItem('gpu_profile', JSON.stringify(profile));

      // Keep the underlying account record's display name in sync too
      let users = JSON.parse(localStorage.getItem('gpu_users')) || [];
      const session = getSession();
      if (session) {
        const idx = users.findIndex(u => u.email === session.email);
        if (idx !== -1) {
          users[idx].name = profile.fullName;
          localStorage.setItem('gpu_users', JSON.stringify(users));
          session.name = profile.fullName;
          setSession(session);
        }
      }

      logAdminActivity("تم تحديث بيانات الملف الشخصي");
      showToast("تم حفظ بيانات الملف الشخصي!", "success");
      renderSidebarProfile();
      renderAdminTopbar();
    });
  }

  // Invite Staff Account form (Super Admin only — enforced by RLS on staff_invites)
  const addStaffForm = document.getElementById('add-staff-form');
  if (addStaffForm) {
    addStaffForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('add-staff-name').value.trim();
      const email = document.getElementById('add-staff-email').value.trim().toLowerCase();
      const role = document.getElementById('add-staff-role').value;
      const submitBtn = addStaffForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const session = getSession();
      const { data: inviter } = await window.sb.from('staff_profiles').select('id').eq('id', session.id).maybeSingle();

      const { error } = await window.sb.from('staff_invites').insert({
        email,
        full_name: name,
        role,
        invited_by: inviter ? inviter.id : null
      });

      submitBtn.disabled = false;

      if (error) {
        if (/duplicate key|unique/i.test(error.message)) {
          showToast('يوجد حساب أو دعوة بهذا البريد الإلكتروني بالفعل.', 'error');
        } else {
          showToast('تعذر إرسال الدعوة: ' + error.message, 'error');
        }
        return;
      }

      logAdminActivity(`تم إرسال دعوة موظف: ${email} (${role})`);
      showToast(`تم إرسال الدعوة لـ ${name}. اطلب منه فتح staff-signup.html لإكمال التسجيل.`, 'success');
      addStaffForm.reset();
      renderUsersList();
    });
  }

  // Add Product form
  const addProductForm = document.getElementById('add-product-form');
  if (addProductForm) {
    addProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      syncSpecsJSON('add');
      let specsObj = {};
      try {
        specsObj = JSON.parse(document.getElementById('add-specs-json').value);
      } catch (err) {
        showToast("صيغة JSON للمواصفات غير صحيحة!", "error");
        return;
      }

      // Fall back to the URL field if the user typed one but forgot to
      // press the "+" button to add it to the gallery.
      const pendingUrl = document.getElementById('add-image-url').value.trim();
      if (pendingUrl && !addProductImages.includes(pendingUrl)) {
        addProductImages.push(pendingUrl);
      }

      let finalImageHTML = '';
      let galleryImages = [];
      if (addProductImages.length > 0) {
        galleryImages = addProductImages.slice();
        finalImageHTML = `<img src="${galleryImages[0]}" class="hardware-vector img-fluid" style="max-height: 180px; object-fit: contain;" />`;
      } else {
        finalImageHTML = `<svg viewBox="0 0 200 200" class="hardware-vector" width="100%" height="100%">
          <rect x="50" y="30" width="100" height="140" rx="10" ry="10" fill="#0c0d12" stroke="#FF6A00" stroke-width="3" />
          <text x="100" y="150" text-anchor="middle" font-size="10" fill="#ffffff">منتج جديد</text>
        </svg>`;
      }

      const stockVal = parseInt(document.getElementById('add-stock').value) || 0;
      const isFeatured = document.getElementById('add-is-featured').checked;
      const isVisible = document.getElementById('add-is-visible').checked;

      const newProduct = {
        id: Date.now(),
        barcode: 'BC-' + Math.floor(10000000 + Math.random() * 90000000),
        name_en: document.getElementById('add-name-en').value.trim(),
        name_ar: document.getElementById('add-name-ar').value.trim(),
        category: document.getElementById('add-cat-en').value,
        category_en: document.getElementById('add-cat-en').value,
        category_ar: document.getElementById('add-cat-ar').value,
        brand: document.getElementById('add-brand').value.trim(),
        price: parseFloat(document.getElementById('add-price').value),
        discount: parseInt(document.getElementById('add-discount').value) || null,
        stock: stockVal,
        availability_en: stockVal > 0 ? "In Stock" : "Out of Stock",
        availability_ar: stockVal > 0 ? "متوفر في المخزن" : "نفذت الكمية",
        warranty_en: document.getElementById('add-warranty-en').value,
        warranty_ar: document.getElementById('add-warranty-ar').value,
        description_en: document.getElementById('add-desc-en').value.trim(),
        description_ar: document.getElementById('add-desc-ar').value.trim(),
        specs_en: specsObj,
        specs_ar: specsObj,
        image: finalImageHTML,
        gallery: galleryImages,
        is_featured: isFeatured,
        is_visible: isVisible
      };

      const newId = window.gpuSync ? await window.gpuSync.createProduct(newProduct) : null;
      if (window.gpuSync && !newId) {
        // gpuSync already showed an error toast; don't silently keep going
        // as if the product was saved when it wasn't.
        return;
      }
      if (newId) newProduct.id = newId;

      let products = JSON.parse(localStorage.getItem('gpu_products')) || [];
      products.push(newProduct);
      localStorage.setItem('gpu_products', JSON.stringify(products));

      logAdminActivity(`تم إنشاء منتج جديد: ${newProduct.name_en}`);
      showToast("تم إنشاء المنتج بنجاح!", "success");
      bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
      addProductForm.reset();
      addProductImages = [];
      renderAddProductGallery();
      updateAddProductPreview();
      const specsContainer = document.getElementById('add-specs-rows');
      if (specsContainer) specsContainer.innerHTML = '';
      addSpecRow('add');

      renderProductsList();
      refreshDashboardViews();
    });
  }

  // Edit Product form
  const editProductForm = document.getElementById('edit-product-form');
  if (editProductForm) {
    editProductForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      syncSpecsJSON('edit');
      let specsObj = {};
      try {
        specsObj = JSON.parse(document.getElementById('edit-specs-json').value);
      } catch (err) {
        showToast("صيغة JSON للمواصفات غير صحيحة!", "error");
        return;
      }

      const id = document.getElementById('edit-product-id').value;
      let products = JSON.parse(localStorage.getItem('gpu_products')) || [];
      const index = products.findIndex(p => String(p.id) === String(id));

      if (index !== -1) {
        const editImageUrlInput = document.getElementById('edit-image-url').value.trim();
        if (editImageBase64) {
          products[index].image = `<img src="${editImageBase64}" class="hardware-vector img-fluid" style="max-height: 180px; object-fit: contain;" />`;
        } else if (editImageUrlInput) {
          products[index].image = `<img src="${editImageUrlInput}" class="hardware-vector img-fluid" style="max-height: 180px; object-fit: contain;" />`;
        }

        const stockVal = parseInt(document.getElementById('edit-stock').value) || 0;
        products[index].stock = stockVal;
        products[index].availability_en = stockVal > 0 ? "In Stock" : "Out of Stock";
        products[index].availability_ar = stockVal > 0 ? "متوفر في المخزن" : "نفذت الكمية";

        products[index].name_en = document.getElementById('edit-name-en').value.trim();
        products[index].name_ar = document.getElementById('edit-name-ar').value.trim();
        products[index].category_en = document.getElementById('edit-cat-en').value;
        products[index].brand = document.getElementById('edit-brand').value.trim();
        products[index].price = parseFloat(document.getElementById('edit-price').value);
        
        const discount = parseInt(document.getElementById('edit-discount').value) || 0;
        products[index].discount = discount > 0 ? discount : null;
        
        products[index].warranty_en = document.getElementById('edit-warranty-en').value;
        products[index].warranty_ar = document.getElementById('edit-warranty-ar').value;
        products[index].description_en = document.getElementById('edit-desc-en').value.trim();
        products[index].description_ar = document.getElementById('edit-desc-ar').value.trim();
        products[index].specs_en = specsObj;
        products[index].specs_ar = specsObj;

        if (window.gpuSync) {
          const ok = await window.gpuSync.updateProduct(id, products[index]);
          if (!ok) return; // error toast already shown by gpuSync
        }

        localStorage.setItem('gpu_products', JSON.stringify(products));
        logAdminActivity(`تم تعديل المنتج رقم: ${id}`);
        showToast("تم تحديث المنتج بنجاح!", "success");

        bootstrap.Modal.getInstance(document.getElementById('editProductModal')).hide();
        editImageBase64 = '';

        renderProductsList();
        refreshDashboardViews();
      }
    });
  }

  // Add Coupon form
  const addCouponForm = document.getElementById('add-coupon-form');
  if (addCouponForm) {
    addCouponForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = document.getElementById('add-coupon-code').value.toUpperCase().trim();
      const discount = parseInt(document.getElementById('add-coupon-discount').value);
      const expiry = document.getElementById('add-coupon-expiry').value;
      const minOrder = parseInt(document.getElementById('add-coupon-min').value);
      const limit = parseInt(document.getElementById('add-coupon-limit').value);
      const cfg = { discount: discount, expiry: expiry, minOrder: minOrder, usageLimit: limit, usageCount: 0 };

      if (window.gpuSync) {
        const ok = await window.gpuSync.createCoupon(code, cfg);
        if (!ok) return;
      }

      let coupons = JSON.parse(localStorage.getItem('gpu_coupons')) || {};
      coupons[code] = cfg;
      localStorage.setItem('gpu_coupons', JSON.stringify(coupons));
      
      logAdminActivity(`تم إنشاء كود خصم جديد: ${code}`);
      showToast("تم إنشاء كود الخصم بنجاح!", "success");
      bootstrap.Modal.getInstance(document.getElementById('addCouponModal')).hide();
      addCouponForm.reset();
      renderCouponsList();
    });
  }

  // Add Category form
  const addCatForm = document.getElementById('add-category-form');
  if (addCatForm) {
    addCatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('add-category-name').value.trim();
      if (window.gpuSync) {
        const ok = await window.gpuSync.createCategory(name);
        if (!ok) return;
      }
      let cats = JSON.parse(localStorage.getItem('gpu_categories')) || [];
      cats.push(name);
      localStorage.setItem('gpu_categories', JSON.stringify(cats));
      logAdminActivity(`تم إنشاء قسم جديد: ${name}`);
      showToast("تم إضافة القسم بنجاح!", "success");
      bootstrap.Modal.getInstance(document.getElementById('addCategoryModal')).hide();
      addCatForm.reset();
      renderCategoriesList();
    });
  }

  // Add Brand form
  const addBrandForm = document.getElementById('add-brand-form');
  if (addBrandForm) {
    addBrandForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('add-brand-name').value.trim();
      if (window.gpuSync) {
        const ok = await window.gpuSync.createBrand(name);
        if (!ok) return;
      }
      let brands = JSON.parse(localStorage.getItem('gpu_brands')) || [];
      brands.push(name);
      localStorage.setItem('gpu_brands', JSON.stringify(brands));
      logAdminActivity(`تم إنشاء ماركة جديدة: ${name}`);
      showToast("تم إضافة الماركة بنجاح!", "success");
      bootstrap.Modal.getInstance(document.getElementById('addBrandModal')).hide();
      addBrandForm.reset();
      renderBrandsList();
    });
  }
}

window.deleteProduct = async function(productId) {
  if (confirm("هل أنت متأكد من حذف هذا المنتج نهائيًا؟")) {
    if (window.gpuSync) {
      const ok = await window.gpuSync.deleteProduct(productId);
      if (!ok) return;
    }
    let products = JSON.parse(localStorage.getItem('gpu_products')) || [];
    products = products.filter(p => p.id !== productId);
    localStorage.setItem('gpu_products', JSON.stringify(products));
    renderProductsList();
    refreshDashboardViews();
    logAdminActivity(`تم حذف المنتج رقم: ${productId}`);
    showToast("تم حذف المنتج بنجاح!", "info");
  }
};

window.markNotificationRead = function(id) {
  let notifs = JSON.parse(localStorage.getItem('gpu_notifications')) || [];
  const idx = notifs.findIndex(n => n.id === id);
  if (idx !== -1) {
    notifs[idx].read = true;
    localStorage.setItem('gpu_notifications', JSON.stringify(notifs));
    renderAdminTopbar();
  }
};

window.clearAllNotifications = function() {
  localStorage.setItem('gpu_notifications', JSON.stringify([]));
  renderAdminTopbar();
  showToast("تم مسح سجل التنبيهات!", "info");
};

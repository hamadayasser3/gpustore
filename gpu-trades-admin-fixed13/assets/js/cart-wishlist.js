// GPU Trades - Cart & Wishlist LocalStorage State Controller

// Currency formatter — all prices are stored and entered directly in Egyptian Pounds (EGP)
window.formatPrice = function(amount) {
  const egpAmount = Math.round(amount || 0);
  const currentLang = localStorage.getItem('gpu_lang') || 'ar';

  if (currentLang === 'ar') {
    return `<span class="price-val" dir="ltr">${egpAmount.toLocaleString()}</span> <span class="price-currency">ج.م</span>`;
  } else {
    return `<span class="price-val" dir="ltr">${egpAmount.toLocaleString()}</span> <span class="price-currency">EGP</span>`;
  }
};

// Shipping is NOT calculated or shown by the site.
// Shipping cost/arrangement is agreed directly between the store owner and the customer.

// Initialize Cart and Wishlist from LocalStorage
let cart = JSON.parse(localStorage.getItem('gpu_cart')) || [];
let wishlist = JSON.parse(localStorage.getItem('gpu_wishlist')) || [];
let activeCoupon = JSON.parse(localStorage.getItem('gpu_active_coupon')) || null;

// ==========================================================================
// Authentication Helpers (demo-grade, client-side only)
// --------------------------------------------------------------------------
// IMPORTANT: This entire site runs without a real backend/database, so this
// is NOT production-grade security. Passwords are hashed (SHA-256 + salt)
// so they are not stored in plain text, but since everything lives in the
// browser's localStorage, a real deployment MUST replace this with proper
// server-side authentication (e.g. bcrypt/argon2 + a real database + HTTPS
// session cookies). Treat this only as a realistic front-end simulation.
// ==========================================================================

async function hashPassword(password, salt) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('SECURE_CONTEXT_REQUIRED');
  }
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}::${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Current logged-in session (customer or staff)
function getSession() {
  try {
    return JSON.parse(localStorage.getItem('gpu_session')) || null;
  } catch (e) {
    return null;
  }
}

function setSession(sessionObj) {
  localStorage.setItem('gpu_session', JSON.stringify(sessionObj));
}

function clearSession() {
  localStorage.removeItem('gpu_session');
}

// Staff/admin roles that are allowed into the admin console.
// These must exactly match the `role` check constraint on the
// `staff_profiles` table in supabase-schema.sql.
const ADMIN_ROLES = ['Super Admin', 'Admin', 'Warehouse', 'Sales', 'Customer Support', 'Accountant'];

function isStaffSession() {
  const session = getSession();
  return !!session && ADMIN_ROLES.includes(session.role);
}

// Reusable Toast Notification Generator
function showToast(message, type = 'success') {
  // Check if container exists, if not, create it
  let toastContainer = document.querySelector('.toast-container-premium');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container-premium';
    document.body.appendChild(toastContainer);
  }

  // Create Toast
  const toast = document.createElement('div');
  toast.className = `toast-premium ${type}`;
  
  // Icon based on type
  let icon = '<i class="bi bi-check-circle-fill text-success fs-4"></i>';
  if (type === 'wishlist') {
    icon = '<i class="bi bi-heart-fill text-danger fs-4"></i>';
  } else if (type === 'cart') {
    icon = '<i class="bi bi-cart-check-fill text-orange fs-4"></i>';
  } else if (type === 'error') {
    icon = '<i class="bi bi-exclamation-triangle-fill text-warning fs-4"></i>';
  } else if (type === 'info') {
    icon = '<i class="bi bi-info-circle-fill text-info fs-4"></i>';
  }

  toast.innerHTML = `
    ${icon}
    <div class="toast-content-text font-monospace fs-7">${message}</div>
  `;

  toastContainer.appendChild(toast);

  // Trigger Slide-Out & Removal
  setTimeout(() => {
    toast.classList.add('hide');
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}

// Sync Badges across the entire website
function updateNavigationBadges() {
  const cartBadge = document.querySelector('#cart-badge-count');
  const wishlistBadge = document.querySelector('#wishlist-badge-count');

  // Count total quantity in cart
  const totalCartQty = cart.reduce((total, item) => total + item.quantity, 0);
  const totalWishlistCount = wishlist.length;

  if (cartBadge) {
    cartBadge.textContent = totalCartQty;
    cartBadge.style.display = totalCartQty > 0 ? 'flex' : 'none';
  }
  if (wishlistBadge) {
    wishlistBadge.textContent = totalWishlistCount;
    wishlistBadge.style.display = totalWishlistCount > 0 ? 'flex' : 'none';
  }
}

// ==========================================
// Wishlist Handlers
// ==========================================

function toggleWishlist(productId) {
  productId = String(productId);
  const product = PRODUCTS_DATA.find(p => String(p.id) === productId);
  if (!product) return;

  const index = wishlist.indexOf(productId);
  if (index === -1) {
    // Add to wishlist
    wishlist.push(productId);
    localStorage.setItem('gpu_wishlist', JSON.stringify(wishlist));
    showToast(`"${product.name}" Added to Saved Wishlist!`, 'wishlist');
    
    // Toggle active classes on page buttons if present
    document.querySelectorAll(`.wishlist-btn-${productId}`).forEach(btn => btn.classList.add('active'));
  } else {
    // Remove from wishlist
    wishlist.splice(index, 1);
    localStorage.setItem('gpu_wishlist', JSON.stringify(wishlist));
    showToast(`Removed "${product.name}" from Wishlist`, 'info');
    
    document.querySelectorAll(`.wishlist-btn-${productId}`).forEach(btn => btn.classList.remove('active'));
  }
  
  updateNavigationBadges();
  
  // Custom event to trigger re-renders on the wishlist page
  window.dispatchEvent(new CustomEvent('wishlistUpdated'));
}

// ==========================================
// Cart Handlers
// ==========================================

function addToCart(productId, quantity = 1, showPrompt = true) {
  productId = String(productId);
  quantity = parseInt(quantity);
  const product = PRODUCTS_DATA.find(p => String(p.id) === productId);
  if (!product) return;

  const cartItem = cart.find(item => String(item.id) === productId);

  if (cartItem) {
    cartItem.quantity += quantity;
  } else {
    cart.push({
      id: productId,
      quantity: quantity
    });
  }

  localStorage.setItem('gpu_cart', JSON.stringify(cart));
  updateNavigationBadges();

  if (showPrompt) {
    showToast(`Added ${quantity}x "${product.name}" to Cart!`, 'cart');
  }

  window.dispatchEvent(new CustomEvent('cartUpdated'));
}

function removeFromCart(productId) {
  productId = String(productId);
  const index = cart.findIndex(item => String(item.id) === productId);
  
  if (index !== -1) {
    const product = PRODUCTS_DATA.find(p => String(p.id) === productId);
    cart.splice(index, 1);
    localStorage.setItem('gpu_cart', JSON.stringify(cart));
    updateNavigationBadges();
    
    if (product) {
      showToast(`Removed "${product.name}" from Cart`, 'info');
    }
  }

  window.dispatchEvent(new CustomEvent('cartUpdated'));
}

function updateCartQuantity(productId, quantity) {
  productId = String(productId);
  quantity = parseInt(quantity);
  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  const cartItem = cart.find(item => String(item.id) === productId);
  if (cartItem) {
    cartItem.quantity = quantity;
    localStorage.setItem('gpu_cart', JSON.stringify(cart));
    updateNavigationBadges();
  }

  window.dispatchEvent(new CustomEvent('cartUpdated'));
}

// Calculate totals
function getCartTotals() {
  let subtotal = 0;
  cart.forEach(item => {
    const product = PRODUCTS_DATA.find(p => String(p.id) === String(item.id));
    if (product) {
      subtotal += product.price * item.quantity;
    }
  });

  let discountAmount = 0;
  if (activeCoupon) {
    discountAmount = subtotal * (activeCoupon.percentage / 100);
  }

  // Shipping is not calculated on-site; it is arranged directly between the store owner and the customer.
  let total = subtotal - discountAmount;

  return {
    subtotal: subtotal.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    total: total.toFixed(2),
    couponCode: activeCoupon ? activeCoupon.code : null,
    discountPercentage: activeCoupon ? activeCoupon.percentage : 0
  };
}

// Coupon validation
function applyCoupon(code) {
  code = code.trim().toUpperCase();
  const coupons = JSON.parse(localStorage.getItem('gpu_coupons')) || {};

  if (coupons[code] !== undefined) {
    const couponVal = coupons[code];
    const percentage = typeof couponVal === 'object' ? couponVal.discount : couponVal;
    activeCoupon = {
      code: code,
      percentage: percentage
    };
    localStorage.setItem('gpu_active_coupon', JSON.stringify(activeCoupon));
    showToast(`Coupon "${code}" applied successfully! saved ${percentage}%`, 'success');
    window.dispatchEvent(new CustomEvent('cartUpdated'));
    return true;
  } else {
    showToast('Invalid Coupon Code!', 'error');
    return false;
  }
}

function removeCoupon() {
  if (activeCoupon) {
    showToast(`Coupon "${activeCoupon.code}" removed`, 'info');
    activeCoupon = null;
    localStorage.removeItem('gpu_active_coupon');
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  }
}

// Window Storage Sync (Updates badge count instantly if changed in another tab)
window.addEventListener('storage', (e) => {
  if (e.key === 'gpu_cart') {
    cart = JSON.parse(e.newValue) || [];
    updateNavigationBadges();
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  }
  if (e.key === 'gpu_wishlist') {
    wishlist = JSON.parse(e.newValue) || [];
    updateNavigationBadges();
    window.dispatchEvent(new CustomEvent('wishlistUpdated'));
  }
  if (e.key === 'gpu_active_coupon') {
    activeCoupon = JSON.parse(e.newValue) || null;
    window.dispatchEvent(new CustomEvent('cartUpdated'));
  }
});

// Initialize Badges on load
document.addEventListener('DOMContentLoaded', () => {
  updateNavigationBadges();
});

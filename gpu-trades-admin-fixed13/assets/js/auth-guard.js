// ============================================================================
// GPU Trades - Authentication Guard (Shopping Cart Protection)
// ============================================================================
// Prevent guest checkout - require login before adding to cart/checkout

function requireLogin() {
  const session = JSON.parse(localStorage.getItem('gpu_session') || '{}');
  if (!session.id) {
    showToast('يجب تسجيل الدخول أولاً قبل الشراء | You must login first before purchasing', 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
    return false;
  }
  return true;
}

// Check auth on cart page load
function protectCart() {
  if (document.body.getAttribute('data-page') === 'cart' || window.location.pathname.includes('cart')) {
    if (!requireLogin()) {
      document.body.style.display = 'none';
    }
  }
}

// Override add to cart to require login
const originalAddToCart = window.addToCart;
window.addToCart = function(productId, quantity, showPrompt) {
  if (!requireLogin()) return false;
  return originalAddToCart ? originalAddToCart(productId, quantity, showPrompt) : true;
};

// Override checkout to require login
const originalCheckout = window.proceedCheckout;
window.proceedCheckout = function() {
  if (!requireLogin()) return false;
  return originalCheckout ? originalCheckout() : true;
};

document.addEventListener('DOMContentLoaded', protectCart);

// ============================================================================
// GPU Trades — Supabase <-> localStorage sync bridge  (Phase 2 migration)
// ----------------------------------------------------------------------------
// WHY THIS FILE EXISTS
// Supabase is now the real database for products, categories, brands,
// coupons, orders, reviews, and contact messages (see supabase-schema.sql +
// supabase-schema-storefront.sql). Rewriting every page to call Supabase
// directly would mean touching 2,000+ lines across 10 files at once — too
// risky to ship in one shot. Instead:
//
//   1. On every page load, pull() fetches the current data from Supabase and
//      writes it into the SAME localStorage keys the app already reads
//      (gpu_products, gpu_orders, gpu_categories, ...), in the exact shape
//      the existing rendering code expects. Every page keeps working with
//      ZERO changes to its rendering logic.
//   2. Specific write actions (add/edit/delete a product, confirm an order,
//      create a coupon, ...) now call the functions below FIRST. Each one
//      writes to Supabase, and only updates the local cache once Supabase
//      confirms the write. If Supabase fails, the local cache is left
//      untouched and an error toast is shown — so the admin never thinks
//      something saved when it didn't.
//
// Requires supabase-client.js loaded first (defines window.sb).
// If window.sb doesn't exist (script blocked, offline, etc.) every function
// here fails soft: it logs a warning and returns false, and the page falls
// back to whatever is already in localStorage.
// ============================================================================

window.gpuSync = (function () {
  function ready() {
    if (!window.sb) {
      console.warn('GPU Trades: Supabase client not available — falling back to local cache only.');
      return false;
    }
    return true;
  }

  function toast(msg, type) {
    if (typeof window.showToast === 'function') window.showToast(msg, type);
  }

  // ---- shape converters: DB row(s) -> what the existing code already reads ----

  function productFromRow(row) {
    const stock = row.stock || 0;
    return {
      id: row.id,
      barcode: row.barcode,
      name_ar: row.name_ar,
      name_en: row.name_en,
      category: row.category_en || '',
      category_en: row.category_en || '',
      category_ar: row.category_ar || '',
      brand: row.brand || '',
      price: Number(row.price),
      cost: Number(row.cost || 0),
      discount: row.discount || null,
      stock: stock,
      availability_en: stock > 0 ? 'In Stock' : 'Out of Stock',
      availability_ar: stock > 0 ? 'متوفر في المخزن' : 'نفذت الكمية',
      warranty_en: row.warranty_en || '',
      warranty_ar: row.warranty_ar || '',
      description_en: row.description_en || '',
      description_ar: row.description_ar || '',
      specs_en: row.specs || {},
      specs_ar: row.specs || {},
      image: row.image || '',
      gallery: row.gallery || [],
      is_featured: !!row.is_featured,
      is_visible: row.is_visible !== false
    };
  }

  function productToRow(p) {
    return {
      barcode: p.barcode,
      name_ar: p.name_ar,
      name_en: p.name_en,
      category_en: p.category_en || p.category || '',
      category_ar: p.category_ar || '',
      brand: p.brand || '',
      price: p.price,
      cost: p.cost || 0,
      discount: p.discount || null,
      stock: p.stock || 0,
      warranty_en: p.warranty_en || '',
      warranty_ar: p.warranty_ar || '',
      description_en: p.description_en || '',
      description_ar: p.description_ar || '',
      specs: p.specs_en || p.specs_ar || {},
      image: p.image || '',
      gallery: p.gallery || [],
      is_featured: !!p.is_featured,
      is_visible: p.is_visible !== false
    };
  }

  function orderFromRow(row) {
    const items = (row.order_items || []).map(i => ({
      id: i.product_id,
      name_ar: i.name_ar,
      name_en: i.name_en,
      price: Number(i.price),
      quantity: i.quantity
    }));
    return {
      id: row.id,
      date: new Date(row.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
      createdAt: new Date(row.created_at).getTime(),
      items: items,
      customer: {
        name: row.customer_name,
        email: row.customer_email,
        phone: row.customer_phone,
        address: row.customer_address
      },
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      total: Number(row.total),
      couponCode: row.coupon_code || null,
      status: row.status
    };
  }

  function reviewFromRow(row) {
    return {
      id: row.id,
      customerName: row.customer_name,
      productName: row.product_name,
      productId: row.product_id,
      rating: row.rating,
      reviewText: row.review_text,
      status: row.status,
      date: row.created_at
    };
  }

  function messageFromRow(row) {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      subject: row.subject,
      message: row.message,
      date: new Date(row.created_at).toLocaleDateString('en-GB'),
      read: !!row.is_read
    };
  }

  // ---- PULL: Supabase -> localStorage cache ----------------------------------

  async function pull() {
    if (!ready()) return false;
    try {
      const [productsRes, categoriesRes, brandsRes, couponsRes, reviewsRes, messagesRes, profilesRes] = await Promise.all([
        window.sb.from('products').select('*').order('created_at', { ascending: false }),
        window.sb.from('categories').select('*').order('sort_order', { ascending: true }),
        window.sb.from('brands').select('*').order('sort_order', { ascending: true }),
        window.sb.from('coupons').select('*'),
        window.sb.from('reviews').select('*').order('created_at', { ascending: false }),
        window.sb.from('messages').select('*').order('created_at', { ascending: false }),
        window.sb.from('profiles').select('*').order('created_at', { ascending: false })
      ]);

      if (!productsRes.error && productsRes.data) {
        localStorage.setItem('gpu_products', JSON.stringify(productsRes.data.map(productFromRow)));
      }
      if (!categoriesRes.error && categoriesRes.data) {
        localStorage.setItem('gpu_categories', JSON.stringify(categoriesRes.data.map(c => c.name)));
      }
      if (!brandsRes.error && brandsRes.data) {
        localStorage.setItem('gpu_brands', JSON.stringify(brandsRes.data.map(b => b.name)));
      }
      if (!couponsRes.error && couponsRes.data) {
        const couponsObj = {};
        couponsRes.data.forEach(c => {
          couponsObj[c.code] = {
            discount: c.discount_percentage,
            expiry: c.expiry,
            minOrder: c.min_order,
            usageLimit: c.usage_limit,
            usageCount: c.usage_count
          };
        });
        localStorage.setItem('gpu_coupons', JSON.stringify(couponsObj));
      }
      if (!reviewsRes.error && reviewsRes.data) {
        localStorage.setItem('gpu_reviews', JSON.stringify(reviewsRes.data.map(reviewFromRow)));
      }
      if (!messagesRes.error && messagesRes.data) {
        localStorage.setItem('gpu_messages', JSON.stringify(messagesRes.data.map(messageFromRow)));
      }
      if (!profilesRes.error && profilesRes.data) {
        const converted = profilesRes.data.map(p => ({
          name: p.full_name,
          email: p.email,
          phone: p.phone || '',
          date: new Date(p.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
          createdAt: new Date(p.created_at).getTime(),
          active: p.is_active !== false,
          role: 'Customer'
        }));
        localStorage.setItem('gpu_users', JSON.stringify(converted));
      }

      // Orders are only readable by staff (RLS) or the owning customer, so a
      // logged-out storefront visitor will simply get an empty/blocked
      // result here — that's expected, not an error.
      const ordersRes = await window.sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      if (!ordersRes.error && ordersRes.data) {
        localStorage.setItem('gpu_orders', JSON.stringify(ordersRes.data.map(orderFromRow)));
      }

      if (typeof window.refreshProductsData === 'function') window.refreshProductsData();
      window.dispatchEvent(new CustomEvent('gpu:synced'));
      return true;
    } catch (err) {
      console.warn('GPU Trades: Supabase pull failed, using existing local cache.', err);
      return false;
    }
  }

  // ---- PRODUCTS ---------------------------------------------------------------

  async function createProduct(product) {
    if (!ready()) return null;
    const { data, error } = await window.sb.from('products').insert(productToRow(product)).select().single();
    if (error) { console.error(error); toast('تعذر حفظ المنتج في قاعدة البيانات', 'error'); return null; }
    await pull();
    return data.id;
  }

  async function updateProduct(id, product) {
    if (!ready()) return false;
    const { error } = await window.sb.from('products').update(productToRow(product)).eq('id', id);
    if (error) { console.error(error); toast('تعذر تحديث المنتج في قاعدة البيانات', 'error'); return false; }
    await pull();
    return true;
  }

  async function deleteProduct(id) {
    if (!ready()) return false;
    const { error } = await window.sb.from('products').delete().eq('id', id);
    if (error) { console.error(error); toast('تعذر حذف المنتج من قاعدة البيانات', 'error'); return false; }
    await pull();
    return true;
  }

  async function updateStock(id, stock) {
    if (!ready()) return false;
    const { error } = await window.sb.from('products').update({ stock }).eq('id', id);
    if (error) { console.error(error); toast('تعذر تحديث المخزون في قاعدة البيانات', 'error'); return false; }
    return true;
  }

  // ---- CATEGORIES / BRANDS ------------------------------------------------

  async function createCategory(name) {
    if (!ready()) return false;
    const cats = JSON.parse(localStorage.getItem('gpu_categories')) || [];
    const { error } = await window.sb.from('categories').insert({ name, sort_order: cats.length });
    if (error) { console.error(error); toast('تعذر إضافة القسم في قاعدة البيانات', 'error'); return false; }
    await pull();
    return true;
  }

  async function deleteCategory(name) {
    if (!ready()) return false;
    const { error } = await window.sb.from('categories').delete().eq('name', name);
    if (error) { console.error(error); toast('تعذر حذف القسم من قاعدة البيانات', 'error'); return false; }
    await pull();
    return true;
  }

  async function reorderCategories(namesInOrder) {
    if (!ready()) return false;
    try {
      await Promise.all(namesInOrder.map((name, idx) =>
        window.sb.from('categories').update({ sort_order: idx }).eq('name', name)
      ));
      return true;
    } catch (err) {
      console.error(err);
      toast('تعذر إعادة ترتيب الأقسام في قاعدة البيانات', 'error');
      return false;
    }
  }

  async function createBrand(name) {
    if (!ready()) return false;
    const brands = JSON.parse(localStorage.getItem('gpu_brands')) || [];
    const { error } = await window.sb.from('brands').insert({ name, sort_order: brands.length });
    if (error) { console.error(error); toast('تعذر إضافة الماركة في قاعدة البيانات', 'error'); return false; }
    await pull();
    return true;
  }

  async function deleteBrand(name) {
    if (!ready()) return false;
    const { error } = await window.sb.from('brands').delete().eq('name', name);
    if (error) { console.error(error); toast('تعذر حذف الماركة من قاعدة البيانات', 'error'); return false; }
    await pull();
    return true;
  }

  // ---- COUPONS ------------------------------------------------------------

  async function createCoupon(code, cfg) {
    if (!ready()) return false;
    const { error } = await window.sb.from('coupons').insert({
      code: code,
      discount_percentage: cfg.discount,
      expiry: cfg.expiry,
      min_order: cfg.minOrder || 0,
      usage_limit: cfg.usageLimit,
      usage_count: cfg.usageCount || 0
    });
    if (error) { console.error(error); toast('تعذر إنشاء كود الخصم في قاعدة البيانات', 'error'); return false; }
    await pull();
    return true;
  }

  async function deleteCoupon(code) {
    if (!ready()) return false;
    const { error } = await window.sb.from('coupons').delete().eq('code', code);
    if (error) { console.error(error); toast('تعذر حذف كود الخصم من قاعدة البيانات', 'error'); return false; }
    await pull();
    return true;
  }

  // ---- ORDERS ---------------------------------------------------------------

  // Called from cart.html at checkout. Guests are allowed to insert (RLS
  // permits customer_id = null) but can never read the order back later —
  // that's intentional until customer accounts exist (Phase 3).
  async function createOrder(order) {
    if (!ready()) return false;
    const { error: orderErr } = await window.sb.from('orders').insert({
      id: order.id,
      customer_name: order.customer.name,
      customer_email: order.customer.email || null,
      customer_phone: order.customer.phone,
      customer_address: order.customer.address,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      coupon_code: order.couponCode || null,
      status: 'Pending'
    });
    if (orderErr) { console.error(orderErr); toast('تعذر حفظ الطلب في قاعدة البيانات، تواصل معنا لتأكيده يدويًا', 'error'); return false; }

    const itemRows = order.items.map(i => ({
      order_id: order.id,
      product_id: i.id || null,
      name_ar: i.name_ar,
      name_en: i.name_en,
      price: i.price,
      quantity: i.quantity
    }));
    const { error: itemsErr } = await window.sb.from('order_items').insert(itemRows);
    if (itemsErr) { console.error(itemsErr); toast('تم حفظ الطلب لكن حدث خطأ في تفاصيله، برجاء إبلاغنا', 'error'); }
    return true;
  }

  async function confirmOrder(orderId) {
    if (!ready()) return false;
    const { error } = await window.sb.rpc('confirm_order', { p_order_id: orderId });
    if (error) { console.error(error); toast('تعذر تأكيد الطلب في قاعدة البيانات', 'error'); return false; }
    await pull();
    return true;
  }

  async function updateOrderStatus(orderId, status) {
    if (!ready()) return false;
    const { error } = await window.sb.from('orders').update({ status }).eq('id', orderId);
    if (error) { console.error(error); toast('تعذر تحديث حالة الطلب في قاعدة البيانات', 'error'); return false; }
    return true;
  }

  async function deleteOrder(orderId) {
    if (!ready()) return false;
    const { error } = await window.sb.from('orders').delete().eq('id', orderId);
    if (error) { console.error(error); toast('تعذر حذف الطلب من قاعدة البيانات', 'error'); return false; }
    return true;
  }

  // ---- REVIEWS ----------------------------------------------------------------

  async function setReviewStatus(id, status) {
    if (!ready()) return false;
    const { error } = await window.sb.from('reviews').update({ status }).eq('id', id);
    if (error) { console.error(error); toast('تعذر تحديث حالة التقييم في قاعدة البيانات', 'error'); return false; }
    return true;
  }

  async function deleteReview(id) {
    if (!ready()) return false;
    const { error } = await window.sb.from('reviews').delete().eq('id', id);
    if (error) { console.error(error); toast('تعذر حذف التقييم من قاعدة البيانات', 'error'); return false; }
    return true;
  }

  // ---- MESSAGES (contact form) ------------------------------------------------

  async function createMessage(msg) {
    if (!ready()) return false;
    const { error } = await window.sb.from('messages').insert({
      id: msg.id,
      name: msg.name,
      email: msg.email,
      phone: msg.phone,
      subject: msg.subject,
      message: msg.message
    });
    if (error) { console.error(error); toast('تعذر إرسال الرسالة، حاول مرة أخرى', 'error'); return false; }
    return true;
  }

  async function markMessageRead(id, isRead) {
    if (!ready()) return false;
    const { error } = await window.sb.from('messages').update({ is_read: isRead }).eq('id', id);
    if (error) { console.error(error); return false; }
    return true;
  }

  async function deleteMessage(id) {
    if (!ready()) return false;
    const { error } = await window.sb.from('messages').delete().eq('id', id);
    if (error) { console.error(error); toast('تعذر حذف الرسالة من قاعدة البيانات', 'error'); return false; }
    return true;
  }

  async function toggleCustomerStatus(email, isActive) {
    if (!ready()) return false;
    const { error } = await window.sb.from('profiles').update({ is_active: isActive }).eq('email', email);
    if (error) { console.error(error); toast('تعذر تغيير حالة العميل في قاعدة البيانات', 'error'); return false; }
    await pull();
    return true;
  }

  async function deleteCustomer(email) {
    if (!ready()) return false;
    const { error } = await window.sb.from('profiles').delete().eq('email', email);
    if (error) { console.error(error); toast('تعذر حذف العميل من قاعدة البيانات', 'error'); return false; }
    await pull();
    return true;
  }

  // Kick off an initial pull as soon as this script loads on any page.
  pull();

  return {
    pull,
    createProduct, updateProduct, deleteProduct, updateStock,
    createCategory, deleteCategory, reorderCategories,
    createBrand, deleteBrand,
    createCoupon, deleteCoupon,
    createOrder, confirmOrder, updateOrderStatus, deleteOrder,
    setReviewStatus, deleteReview,
    createMessage, markMessageRead, deleteMessage,
    toggleCustomerStatus, deleteCustomer
  };
})();

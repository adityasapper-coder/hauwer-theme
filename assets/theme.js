/* =============================================================
   HAUWER SHOPIFY THEME — theme.js  (matches hauwer-3d)
   ============================================================= */

'use strict';

/* ── CUSTOM CURSOR ──────────────────────────────────────────── */
(function(){
  var dot  = document.getElementById('cursor-dot');
  var ring = document.getElementById('cursor-ring');
  if(!dot || !ring) return;
  var mx = 0, my = 0, rx = 0, ry = 0;
  document.addEventListener('mousemove', function(e){ mx = e.clientX; my = e.clientY; });
  (function tick(){
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(tick);
  })();
})();

/* ── REVEAL ON SCROLL ───────────────────────────────────────── */
(function(){
  var els = document.querySelectorAll('.reveal');
  if(!els.length) return;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(function(el){ io.observe(el); });
})();

/* ── PRODUCT CARD SHINE ─────────────────────────────────────── */
document.addEventListener('mousemove', function(e){
  var card = e.target.closest('[data-shine-wrap]');
  if(!card) return;
  var r = card.getBoundingClientRect();
  var x = ((e.clientX - r.left) / r.width * 100).toFixed(1);
  var y = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
  var shine = card.querySelector('[data-shine]');
  if(shine){ shine.style.setProperty('--mx', x + '%'); shine.style.setProperty('--my', y + '%'); }
});

/* ── UTILITIES ─────────────────────────────────────────────── */
function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }
function formatMoney(cents) {
  return '₹' + (cents / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── CART DRAWER ────────────────────────────────────────────── */
const CartDrawer = (() => {
  const drawer   = $('#cart-drawer');
  const overlay  = $$('[data-close-cart]');
  const body     = $('#cart-drawer-body');
  const footer   = $('#cart-drawer-footer');
  const subtotal = $('#cart-subtotal');
  const count    = $('#cart-item-count');
  const bubble   = $('#cart-bubble');

  function open() {
    drawer.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function updateBubble(n) {
    if (!bubble) return;
    bubble.textContent = n;
    bubble.hidden = n === 0;
    if (count) count.textContent = n;
  }

  async function fetchCart() {
    const res = await fetch('/cart.js');
    return res.json();
  }

  async function renderCart() {
    const cart = await fetchCart();
    updateBubble(cart.item_count);
    if (count) count.textContent = cart.item_count;

    if (cart.item_count === 0) {
      body.innerHTML = `
        <div class="cart-drawer__empty">
          <p>Your bag is empty.</p>
          <a href="/collections/all" class="btn btn--outline" onclick="CartDrawer_close()">SHOP NOW</a>
        </div>`;
      if (footer) footer.hidden = true;
      return;
    }

    let html = '';
    cart.items.forEach(item => {
      const variantLabel = item.variant_title && item.variant_title !== 'Default Title' ? item.variant_title : '';
      const imgSrc = item.image ? item.image.replace(/\.jpg|\.png|\.webp/, '_80x100$&') : '';
      html += `
        <div class="cart-item" data-key="${item.key}">
          <a href="${item.url}" class="cart-item__img-wrap">
            ${imgSrc ? `<img src="${imgSrc}" alt="${item.title}" width="80" height="100" loading="lazy">` : ''}
          </a>
          <div class="cart-item__info">
            <a href="${item.url}" class="cart-item__name">${item.product_title}</a>
            ${variantLabel ? `<p class="cart-item__variant">${variantLabel}</p>` : ''}
            <div class="cart-item__row">
              <div class="cart-qty">
                <button class="cart-qty__btn" data-key="${item.key}" data-qty="${item.quantity - 1}">−</button>
                <span class="cart-qty__val">${item.quantity}</span>
                <button class="cart-qty__btn" data-key="${item.key}" data-qty="${item.quantity + 1}">+</button>
              </div>
              <span class="cart-item__price">${formatMoney(item.final_line_price)}</span>
            </div>
          </div>
          <button type="button" class="cart-item__remove" data-key="${item.key}" data-qty="0" aria-label="Remove">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>`;
    });
    body.innerHTML = html;

    if (subtotal) subtotal.textContent = formatMoney(cart.total_price);
    if (footer) footer.hidden = false;

    // Re-bind qty/remove buttons
    $$('.cart-qty__btn, .cart-item__remove', body).forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        const qty = parseInt(btn.dataset.qty, 10);
        await updateItem(key, qty);
      });
    });
  }

  async function updateItem(key, qty) {
    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    });
    await res.json();
    await renderCart();
  }

  async function addItem(variantId, quantity = 1) {
    const res = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: variantId, quantity })
    });
    const data = await res.json();
    if (data.status) {
      alert(data.description || 'Could not add to cart.');
      return;
    }
    await renderCart();
    open();
  }

  // Bind close triggers
  overlay.forEach(el => el.addEventListener('click', close));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  // Cart toggle button
  const toggleBtn = $('#cart-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', () => {
    drawer.getAttribute('aria-hidden') === 'false' ? close() : (renderCart(), open());
  });

  // Expose close globally for inline links
  window.CartDrawer_close = close;

  return { open, close, addItem, renderCart };
})();

/* ── MOBILE MENU ────────────────────────────────────────────── */
(() => {
  const toggle  = $('#menu-toggle');
  const nav     = $('#mobile-nav');
  const close   = $('#mobile-close');
  const overlay = $('#mobile-overlay');

  if (!toggle || !nav) return;

  function openMenu() {
    nav.classList.add('open');
    nav.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    // Animate burger to X
    const spans = $$('.burger span', toggle);
    if (spans.length === 3) {
      spans[0].style.transform = 'translateY(6.5px) rotate(45deg)';
      spans[1].style.opacity   = '0';
      spans[2].style.transform = 'translateY(-6.5px) rotate(-45deg)';
    }
  }

  function closeMenu() {
    nav.classList.remove('open');
    nav.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    const spans = $$('.burger span', toggle);
    if (spans.length === 3) {
      spans[0].style.transform = '';
      spans[1].style.opacity   = '';
      spans[2].style.transform = '';
    }
  }

  toggle.addEventListener('click', () => nav.classList.contains('open') ? closeMenu() : openMenu());
  if (close) close.addEventListener('click', closeMenu);
  if (overlay) overlay.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
})();

/* ── PRODUCT CARD: QUICK ADD ────────────────────────────────── */
document.addEventListener('click', async e => {
  const btn = e.target.closest('.quick-add-size, .product-card__atc-btn');
  if (!btn) return;

  const variantId = btn.dataset.variantId;
  if (!variantId) return;

  const original = btn.textContent.trim();
  btn.textContent = '...';
  btn.disabled = true;

  await CartDrawer.addItem(parseInt(variantId, 10));

  btn.textContent = '✓';
  setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1500);
});

/* ── PRODUCT PAGE ───────────────────────────────────────────── */
(() => {
  const form        = $('#product-form');
  if (!form) return;

  const variantsEl  = $('#product-variants-json');
  if (!variantsEl) return;
  const variants    = JSON.parse(variantsEl.textContent);

  const variantInput = $('#product-variant-id');
  const priceEl      = $('#product-price');
  const availEl      = $('#product-availability');
  const atcBtn       = $('#add-to-cart-btn');
  const qtyInput     = $('#product-qty');

  // Collect selected options
  function getSelectedOptions() {
    return $$('.product-option__radio:checked', form).map(r => r.dataset.optionValue);
  }

  function findVariant(options) {
    return variants.find(v => {
      const vals = [v.option1, v.option2, v.option3].filter(Boolean);
      return options.every((o, i) => vals[i] === o);
    });
  }

  function updateUI(variant) {
    if (!variant) return;

    // Update hidden input
    if (variantInput) variantInput.value = variant.id;

    // Update price
    if (priceEl) {
      if (variant.compare_at_price > variant.price) {
        const savings = Math.round((variant.compare_at_price - variant.price) / variant.compare_at_price * 100);
        priceEl.innerHTML = `
          <span class="price price--sale">${formatMoney(variant.price)}</span>
          <span class="price price--compare">${formatMoney(variant.compare_at_price)}</span>
          <span class="price-badge">(${savings}% OFF)</span>
          <span class="price-tax-note">Incl. of all taxes</span>`;
      } else {
        priceEl.innerHTML = `
          <span class="price">${formatMoney(variant.price)}</span>
          <span class="price-tax-note">Incl. of all taxes</span>`;
      }
    }

    // Update availability
    if (availEl) {
      availEl.innerHTML = variant.available
        ? '<span class="avail avail--in">● In Stock</span>'
        : '<span class="avail avail--out">● Out of Stock</span>';
    }

    // Update ATC button
    if (atcBtn) {
      atcBtn.disabled = !variant.available;
      atcBtn.textContent = variant.available ? 'ADD TO BAG' : 'SOLD OUT';
    }

    // Update URL without reload
    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url.toString());

    // Update featured image if variant has an image
    if (variant.featured_image) {
      const img = $('#product-featured-image');
      if (img) {
        const src = variant.featured_image.src.replace(/(\.[a-z]+)$/, '_900x1100_crop_center$1');
        img.src = src;
      }
    }
  }

  // Listen to option changes
  $$('.product-option__radio', form).forEach(radio => {
    radio.addEventListener('change', () => {
      // Update selected label
      const idx = radio.dataset.optionIndex;
      const label = $(`#option-selected-${idx}`);
      if (label) label.textContent = radio.dataset.optionValue;

      const selected = getSelectedOptions();
      const variant = findVariant(selected);
      if (variant) updateUI(variant);
    });
  });

  // Qty selector
  $$('.qty-selector__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!qtyInput) return;
      const current = parseInt(qtyInput.value, 10) || 1;
      const action = btn.dataset.action;
      if (action === 'plus')  qtyInput.value = Math.min(current + 1, 10);
      if (action === 'minus') qtyInput.value = Math.max(current - 1, 1);
    });
  });

  // Handle ATC form submit via AJAX
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!atcBtn || atcBtn.disabled) return;

    const variantId = parseInt(variantInput ? variantInput.value : form.querySelector('[name="id"]').value, 10);
    const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;

    const original = atcBtn.textContent;
    atcBtn.textContent = 'ADDING...';
    atcBtn.disabled = true;

    await CartDrawer.addItem(variantId, qty);

    atcBtn.textContent = 'ADDED ✓';
    setTimeout(() => {
      atcBtn.textContent = original;
      atcBtn.disabled = false;
    }, 2000);
  });
})();

/* ── PRODUCT GALLERY ────────────────────────────────────────── */
(() => {
  const thumbs = $$('.gallery-thumb');
  const featured = $('#product-featured-image');
  if (!thumbs.length || !featured) return;

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      featured.style.opacity = '0';
      setTimeout(() => {
        featured.src = thumb.dataset.imgSrc;
        featured.alt = thumb.dataset.imgAlt;
        featured.style.opacity = '1';
      }, 150);
    });
  });
})();

/* ── ACCORDION ──────────────────────────────────────────────── */
$$('.accordion-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const body = trigger.nextElementSibling;
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', String(!expanded));
    if (expanded) {
      body.hidden = true;
    } else {
      body.hidden = false;
    }
  });
});

/* ── COLLECTION FILTERS ─────────────────────────────────────── */
$$('.filter-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const dropdown = trigger.nextElementSibling;
    const expanded = trigger.getAttribute('aria-expanded') === 'true';
    // Close all others
    $$('.filter-trigger[aria-expanded="true"]').forEach(other => {
      if (other !== trigger) {
        other.setAttribute('aria-expanded', 'false');
        other.nextElementSibling.hidden = true;
      }
    });
    trigger.setAttribute('aria-expanded', String(!expanded));
    dropdown.hidden = expanded;
  });
});

// Close filters on outside click
document.addEventListener('click', e => {
  if (!e.target.closest('.filter-item')) {
    $$('.filter-trigger').forEach(t => {
      t.setAttribute('aria-expanded', 'false');
      const dd = t.nextElementSibling;
      if (dd) dd.hidden = true;
    });
  }
});

/* ── GRID TOGGLE ────────────────────────────────────────────── */
$$('.grid-toggle__btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.grid-toggle__btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cols = btn.dataset.cols;
    const grid = $('#product-grid');
    if (!grid) return;
    grid.className = grid.className.replace(/product-grid--\d/, `product-grid--${cols}`);
  });
});

/* ── STICKY HEADER SHRINK ───────────────────────────────────── */
(() => {
  const header = $('#site-header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('shrunk', window.scrollY > 60);
  }, { passive: true });
})();

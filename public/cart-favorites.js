/* ========================================================================
   Glam by Zebaish — CART & FAVOURITES
   Client-side cart + wishlist (localStorage) shared across index.html,
   service-detail.html and book-now.html, plus the "book multiple
   packages at once" queue that chains bookings through the existing
   single-package checkout flow.
   ======================================================================== */

(function () {
  "use strict";

  var CART_KEY = "glamCart";
  var FAV_KEY = "glamFavorites";
  var QUEUE_KEY = "glamBookingQueue"; // legacy sequential queue, kept only so old links don't hard-crash
  var CHECKOUT_ITEMS_KEY = "glamCheckoutItems";

  /* ---------------- storage helpers ---------------- */

  function readList(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function writeList(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {}
  }

  function getCart() { return readList(CART_KEY); }
  function getFavorites() { return readList(FAV_KEY); }

  function isInCart(id) { return getCart().indexOf(id) !== -1; }
  function isFavorite(id) { return getFavorites().indexOf(id) !== -1; }

  function addToCart(id) {
    var cart = getCart();
    var isNew = cart.indexOf(id) === -1;
    if (isNew) cart.push(id);
    writeList(CART_KEY, cart);
    refreshBadges();

    // Meta Pixel: "AddToCart" — only fire the first time this exact
    // package is added, not on every re-render/re-call.
    if (isNew && typeof fbq === 'function') {
      var pkg = (typeof getPackageById === 'function') ? getPackageById(id) : null;
      fbq('track', 'AddToCart', {
        content_ids: [id],
        content_type: 'product',
        content_name: pkg ? pkg.name : undefined,
        value: pkg ? pkg.price : undefined,
        currency: 'INR'
      });
    }

    return cart;
  }
  function removeFromCart(id) {
    var cart = getCart().filter(function (x) { return x !== id; });
    writeList(CART_KEY, cart);
    refreshBadges();
    renderCartDrawer();
    return cart;
  }
  function toggleCart(id) {
    if (isInCart(id)) { removeFromCart(id); return false; }
    addToCart(id);
    return true;
  }

  function toggleFavorite(id) {
    var favs = getFavorites();
    var idx = favs.indexOf(id);
    if (idx === -1) { favs.push(id); } else { favs.splice(idx, 1); }
    writeList(FAV_KEY, favs);
    refreshBadges();
    renderFavoritesDrawer();
    return favs.indexOf(id) !== -1;
  }

  /* ---------------- toast ---------------- */
function toast(message) {
  var el = document.getElementById("glamToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "glamToast";
    el.style.cssText = "position:fixed;left:50%;bottom:30px;transform:translateX(-50%) translateY(20px);background:#2d1b4e !important;color:#ffffff !important;padding:12px 22px;border-radius:50px;font-size:0.85rem;font-weight:600;letter-spacing:0.3px;box-shadow:0 8px 30px rgba(0,0,0,0.25);border:1px solid rgba(212,175,55,0.3);z-index:100000;opacity:0;transition:opacity .25s ease, transform .25s ease;pointer-events:none;";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.setProperty("color", "#ffffff", "important");
  el.style.setProperty("background", "#2d1b4e", "important");
  el.style.opacity = "1";
  el.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(el._t);
  el._t = setTimeout(function () {
    el.style.opacity = "0";
    el.style.transform = "translateX(-50%) translateY(20px)";
  }, 2200);
}

  /* ---------------- header icons ---------------- */

  function refreshBadges() {
    var cartCount = getCart().length;
    var favCount = getFavorites().length;
    document.querySelectorAll(".glam-cart-count").forEach(function (b) {
      b.textContent = cartCount;
      b.style.display = cartCount > 0 ? "flex" : "none";
    });
    document.querySelectorAll(".glam-fav-count").forEach(function (b) {
      b.textContent = favCount;
      b.style.display = favCount > 0 ? "flex" : "none";
    });
    // sync every card's icon state on the page
    document.querySelectorAll(".glam-icon-btn[data-action='cart']").forEach(function (btn) {
      var id = btn.getAttribute("data-id");
      btn.classList.toggle("is-active", isInCart(id));
      btn.setAttribute("aria-pressed", isInCart(id) ? "true" : "false");
    });
    document.querySelectorAll(".glam-icon-btn[data-action='fav']").forEach(function (btn) {
      var id = btn.getAttribute("data-id");
      btn.classList.toggle("is-active", isFavorite(id));
      btn.setAttribute("aria-pressed", isFavorite(id) ? "true" : "false");
    });
  }

  function iconBtnHtml(kind) {
    // kind: 'cart' | 'fav'
    var icon = kind === "cart"
      ? '<i class="fa-solid fa-bag-shopping"></i>'
      : '<i class="fa-solid fa-heart"></i>';
    var countClass = kind === "cart" ? "glam-cart-count" : "glam-fav-count";
    var label = kind === "cart" ? "View cart" : "View favourites";
    return '<button type="button" class="glam-header-icon-btn" id="glamOpen' + (kind === "cart" ? "Cart" : "Fav") + '" aria-label="' + label + '">' +
      icon + '<span class="' + countClass + '" style="display:none;">0</span></button>';
  }

  function injectHeaderIcons() {
    var container = document.querySelector(".header-container");
    if (container && !document.getElementById("glamOpenCart")) {
      var wrap = document.createElement("div");
      wrap.className = "glam-header-icons";
      wrap.innerHTML = iconBtnHtml("fav") + iconBtnHtml("cart");
      // Insert right before the hamburger so on mobile (where the hamburger
      // is the only sibling still visible) the icons sit immediately to its
      // left instead of getting shoved off-screen after it.
      var hamburgerEl = container.querySelector(".hamburger");
      if (hamburgerEl) {
        container.insertBefore(wrap, hamburgerEl);
      } else {
        var loginWrapper = container.querySelector(".login-wrapper");
        if (loginWrapper) {
          container.insertBefore(wrap, loginWrapper);
        } else {
          container.appendChild(wrap);
        }
      }
    }

    var mobileSidebar = document.querySelector(".mobile-nav-links");
    if (mobileSidebar && !document.getElementById("glamOpenCartMobile")) {
      var favA = document.createElement("a");
      favA.href = "#";
      favA.id = "glamOpenFavMobile";
      favA.innerHTML = '<i class="fas fa-heart"></i> Favourites <span class="glam-fav-count glam-mobile-badge" style="display:none;">0</span>';
      var cartA = document.createElement("a");
      cartA.href = "#";
      cartA.id = "glamOpenCartMobile";
      cartA.innerHTML = '<i class="fas fa-bag-shopping"></i> Cart <span class="glam-cart-count glam-mobile-badge" style="display:none;">0</span>';
      mobileSidebar.appendChild(favA);
      mobileSidebar.appendChild(cartA);
      favA.addEventListener("click", function (e) { e.preventDefault(); openFavoritesDrawer(); });
      cartA.addEventListener("click", function (e) { e.preventDefault(); openCartDrawer(); });
    }

    document.getElementById("glamOpenCart") && document.getElementById("glamOpenCart").addEventListener("click", openCartDrawer);
    document.getElementById("glamOpenFav") && document.getElementById("glamOpenFav").addEventListener("click", openFavoritesDrawer);
  }

  var headerIconStyle = document.createElement("style");
  headerIconStyle.textContent =
    ".glam-header-icons{display:flex !important;align-items:center;gap:6px;margin-left:auto;margin-right:10px;flex-shrink:0;position:relative;z-index:20;}" +
    ".glam-header-icon-btn{position:relative;background:transparent !important;border:none;cursor:pointer;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#2d1b4e;font-size:0.92rem;transition:background .2s ease;flex-shrink:0;}" +
    ".glam-header-icon-btn:hover{background:rgba(212,175,55,0.12);}" +
    ".glam-cart-count,.glam-fav-count{position:absolute;top:-2px;right:-2px;background:#D4AF37;color:#2d1b4e;font-size:0.62rem;font-weight:800;min-width:16px;height:16px;border-radius:50%;align-items:center;justify-content:center;padding:0 2px;}" +
    ".glam-mobile-badge{position:static;display:inline-flex !important;margin-left:6px;}" +
    "@media(max-width:991px){.glam-header-icons{display:flex !important;}}" +
    /* On mobile the icons sit directly left of the hamburger — keep them
       compact so the pair never crowds or clips off the small viewport. */
    "@media(max-width:768px){.glam-header-icons{gap:2px;margin-right:4px;}.glam-header-icon-btn{width:36px;height:36px;font-size:0.82rem;}}" +
    "@media(max-width:380px){.glam-header-icons{margin-right:2px;}.glam-header-icon-btn{width:32px;height:32px;font-size:0.76rem;}}" +
    /* ===== ECOMMERCE PACKAGE GRID (shared by index.html + service-detail.html) ===== */
    ".glam-pkg-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:22px;align-items:stretch;}" +
    ".glam-pkg-card{position:relative;background:#fff;border-radius:0;overflow:hidden;border:1px solid #e8e2eb;box-shadow:0 5px 18px rgba(45,27,78,.07);transition:transform .25s ease,box-shadow .25s ease;display:flex;flex-direction:column;}" +
    ".glam-pkg-card:hover{transform:translateY(-4px);box-shadow:0 12px 28px rgba(45,27,78,.13);}" +
    ".glam-pkg-img-link{display:block;overflow:hidden;background:#f6f2f8;}" +
    ".glam-pkg-img{width:100%;height:320px;object-fit:cover;object-position:center;display:block;transition:transform .45s ease;}" +
    ".glam-pkg-card:hover .glam-pkg-img{transform:scale(1.025);}" +
    ".glam-pkg-img--full{object-fit:contain;background:#3b2a25;}" +
    ".glam-pkg-body{padding:15px 15px 16px;text-align:center;display:flex;flex-direction:column;flex:1;min-height:112px;}" +
    ".glam-pkg-title-link{display:block;text-decoration:none;color:inherit;}" +
    ".glam-pkg-name{font-size:.88rem;font-weight:700;color:#2d1b4e;text-transform:uppercase;letter-spacing:.35px;line-height:1.3;margin:0 0 7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".glam-pkg-title-link:hover .glam-pkg-name{color:#6a1b9a;}" +
    ".glam-pkg-rating[hidden]{display:none !important}.glam-pkg-rating{display:flex;align-items:center;justify-content:center;gap:5px;margin:0 0 8px;line-height:1}.glam-pkg-stars{color:#D4AF37 !important;font-size:.75rem;letter-spacing:1px}.glam-pkg-rating-count{color:#777;font-size:.68rem;font-weight:600}.glam-pkg-price{font-size:1.18rem;font-weight:700;line-height:1.2;margin-bottom:12px;color:#5b1b82;}" +
    ".glam-pkg-actions{display:flex;justify-content:center;margin-top:auto;}" +
    ".glam-pkg-addcart{width:155px;max-width:155px;height:36px;border:1px solid #460c61;border-radius:4px;background:#fff;color:#460c61;font-size:.64rem;font-weight:800;letter-spacing:.8px;cursor:pointer;transition:background .2s ease,transform .2s ease,box-shadow .2s ease;}" +
    ".glam-pkg-addcart:hover{background:#460c61;color:#fff;transform:translateY(-1px);box-shadow:0 5px 12px rgba(70,12,97,.16);}" +
    ".glam-pkg-addcart.is-added{background:#460c61;color:#fff;border-color:#460c61;}" +
    ".glam-pkg-fav-btn{position:absolute;top:12px;right:12px;z-index:2;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.92);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#2d1b4e;font-size:.92rem;box-shadow:0 3px 10px rgba(45,27,78,.18);transition:transform .2s ease,color .2s ease,background .2s ease;}" +
    ".glam-pkg-fav-btn:hover{transform:scale(1.08);background:#fff;}" +
    ".glam-pkg-fav-btn i{pointer-events:none;}" +
    ".glam-pkg-fav-btn.is-active{color:#D4266E;}" +
    ".glam-pkg-fav-btn.is-active i{font-weight:900;}" +
    "@media(max-width:1199px){.glam-pkg-grid{grid-template-columns:repeat(3,minmax(0,1fr));}.glam-pkg-img{height:310px;}}" +
    "@media(max-width:991px){.glam-pkg-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;}.glam-pkg-img{height:330px;}}" +
    "@media(max-width:575px){.glam-pkg-grid{grid-template-columns:1fr;gap:18px;}.glam-pkg-img{height:360px;}.glam-pkg-body{padding:14px 14px 15px;}.glam-pkg-name{font-size:.86rem;}.glam-pkg-price{font-size:1.12rem;}}" +
  /* Uniform CTA design */
    ".glam-checkout-btn{width:100%;height:48px;background:#460c61;color:#fff;border:0;border-radius:10px;padding:0 18px;font-weight:800;font-size:.82rem;text-transform:uppercase;letter-spacing:.8px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 6px 18px rgba(70,12,97,.18);transition:transform .2s ease,background .2s ease;}" +
    ".glam-checkout-btn:hover{background:#5b1478;transform:translateY(-1px);}" +
    /* ===== TOAST — belt-and-braces override so page CSS (e.g. a global
       "a, p, div{color:purple}" rule) can never make this text unreadable ===== */
    "#glamToast{color:#ffffff !important;background:#2d1b4e !important;}";
  document.head.appendChild(headerIconStyle);

  /* ---------------- drawers ---------------- */

  function ensureDrawerShell() {
    if (document.getElementById("glamDrawerOverlay")) return;
    var overlay = document.createElement("div");
    overlay.id = "glamDrawerOverlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(20,10,30,0.45);z-index:99997;opacity:0;pointer-events:none;transition:opacity .25s ease;";
    var drawer = document.createElement("div");
    drawer.id = "glamDrawer";
    drawer.style.cssText = "position:fixed;top:0;right:0;bottom:0;width:380px;max-width:92vw;background:#fff;z-index:99998;box-shadow:-10px 0 40px rgba(0,0,0,0.18);transform:translateX(100%);transition:transform .3s cubic-bezier(.25,.46,.45,.94);display:flex;flex-direction:column;font-family:inherit;";
    drawer.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid #eee;">' +
      '<h3 id="glamDrawerTitle" style="margin:0;font-size:1.05rem;color:#2d1b4e;text-transform:uppercase;letter-spacing:1px;">Cart</h3>' +
      '<button id="glamDrawerClose" aria-label="Close" style="background:none;border:none;font-size:1.3rem;color:#888;cursor:pointer;line-height:1;">&times;</button>' +
      '</div>' +
      '<div id="glamDrawerBody" style="flex:1;overflow-y:auto;padding:16px 22px;"></div>' +
      '<div id="glamDrawerFooter" style="padding:16px 22px 22px;border-top:1px solid #eee;"></div>';
    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    overlay.addEventListener("click", closeDrawer);
    document.getElementById("glamDrawerClose").addEventListener("click", closeDrawer);
  }

  function openDrawer() {
    ensureDrawerShell();
    document.getElementById("glamDrawerOverlay").style.opacity = "1";
    document.getElementById("glamDrawerOverlay").style.pointerEvents = "auto";
    document.getElementById("glamDrawer").style.transform = "translateX(0)";
  }
  function closeDrawer() {
    var ov = document.getElementById("glamDrawerOverlay");
    var dr = document.getElementById("glamDrawer");
    if (!ov || !dr) return;
    ov.style.opacity = "0";
    ov.style.pointerEvents = "none";
    dr.style.transform = "translateX(100%)";
  }

  function packageMiniCard(pkg, kind) {
    // kind: 'cart' -> qty implied 1, remove btn; 'fav' -> add to cart + remove
    var actions = kind === "cart"
      ? '<button class="glam-drawer-remove" data-id="' + pkg.id + '" data-action="removeCart" style="background:none;border:none;color:#b33;font-size:0.78rem;cursor:pointer;text-decoration:underline;">Remove</button>'
      : '<div style="display:flex;gap:10px;">' +
        '<button class="glam-drawer-addcart" data-id="' + pkg.id + '" style="background:#2d1b4e;color:#fff;border:none;border-radius:20px;padding:5px 12px;font-size:0.68rem;font-weight:600;cursor:pointer;">Add to Cart</button>' +
        '<button class="glam-drawer-remove" data-id="' + pkg.id + '" data-action="removeFav" style="background:none;border:none;color:#b33;font-size:0.78rem;cursor:pointer;text-decoration:underline;">Remove</button>' +
        '</div>';
    return '<div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f2edf5;">' +
      '<img src="' + pkg.image + '" alt="' + pkg.name + '" style="width:64px;height:64px;object-fit:cover;border-radius:10px;flex-shrink:0;">' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-weight:700;color:#2d1b4e;font-size:0.9rem;margin-bottom:2px;">' + pkg.name + '</div>' +
      '<div style="color:#D4AF37;font-weight:800;font-size:0.88rem;margin-bottom:6px;">' + pkg.priceLabel + '</div>' +
      actions +
      '</div></div>';
  }

  function renderCartDrawer() {
    var body = document.getElementById("glamDrawerBody");
    var footer = document.getElementById("glamDrawerFooter");
    if (!body) return;
    document.getElementById("glamDrawerTitle").textContent = "Your Cart";
    var ids = getCart();
    if (ids.length === 0) {
      body.innerHTML = '<p style="color:#888;font-size:0.9rem;text-align:center;margin-top:40px;">Your cart is empty. Add a package to get started.</p>';
      footer.innerHTML = '<a href="#packages" style="display:block;text-align:center;background:#f4eef7;color:#2d1b4e;padding:12px;border-radius:50px;font-weight:700;font-size:0.85rem;text-decoration:none;">Browse Packages</a>';
      return;
    }
    var total = 0;
    var html = "";
    ids.forEach(function (id) {
      var pkg = getPackageById(id);
      if (!pkg) return;
      total += pkg.price;
      html += packageMiniCard(pkg, "cart");
    });
    body.innerHTML = html;
    footer.innerHTML =
      '<div style="display:flex;justify-content:space-between;font-weight:700;color:#2d1b4e;margin-bottom:14px;font-size:0.95rem;">' +
      '<span>Total (' + ids.length + ' package' + (ids.length > 1 ? "s" : "") + ')</span><span>₹' + total.toLocaleString("en-IN") + '</span></div>' +
      '<button id="glamProceedBooking" class="glam-checkout-btn" type="button"><i class="fa-solid fa-lock" aria-hidden="true"></i><span>Checkout</span></button>' +
      '<p style="text-align:center;color:#999;font-size:0.72rem;margin:8px 0 0;">' + (ids.length > 1 ? "You\'ll review both packages together and pay once at checkout." : "") + '</p>';

    body.querySelectorAll("[data-action='removeCart']").forEach(function (btn) {
      btn.addEventListener("click", function () {
        removeFromCart(btn.getAttribute("data-id"));
        toast("Removed from cart");
      });
    });
    document.getElementById("glamProceedBooking").addEventListener("click", proceedToBooking);
  }

  function renderFavoritesDrawer() {
    var body = document.getElementById("glamDrawerBody");
    var footer = document.getElementById("glamDrawerFooter");
    if (!body) return;
    document.getElementById("glamDrawerTitle").textContent = "Your Favourites";
    var ids = getFavorites();
    footer.innerHTML = "";
    if (ids.length === 0) {
      body.innerHTML = '<p style="color:#888;font-size:0.9rem;text-align:center;margin-top:40px;">No favourites yet. Tap the heart on any package to save it here.</p>';
      return;
    }
    var html = "";
    ids.forEach(function (id) {
      var pkg = getPackageById(id);
      if (!pkg) return;
      html += packageMiniCard(pkg, "fav");
    });
    body.innerHTML = html;
    body.querySelectorAll(".glam-drawer-addcart").forEach(function (btn) {
      btn.addEventListener("click", function () {
        addToCart(btn.getAttribute("data-id"));
        toast("Added to cart");
      });
    });
    body.querySelectorAll("[data-action='removeFav']").forEach(function (btn) {
      btn.addEventListener("click", function () {
        toggleFavorite(btn.getAttribute("data-id"));
        toast("Removed from favourites");
      });
    });
  }

  function openCartDrawer() { openDrawer(); renderCartDrawer(); }
  function openFavoritesDrawer() { openDrawer(); renderFavoritesDrawer(); }

  /* ---------------- legacy sequential queue (unused, kept for safety) ---------------- */

  function saveQueue(q) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {} }
  function getQueue() {
    try {
      var raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function clearQueue() { try { localStorage.removeItem(QUEUE_KEY); } catch (e) {} }

  /* ---------------- combined checkout items ---------------- */
  /* book-now.html saves EVERY selected package here — each with its own
     resolved date/time/location — and checkout.html reads the whole list
     at once to build one combined order summary, one total and one
     payment. This replaces the old "book one, queue the rest" flow. */

  function saveCheckoutItems(items) { try { localStorage.setItem(CHECKOUT_ITEMS_KEY, JSON.stringify(items)); } catch (e) {} }
  function getCheckoutItems() {
    try {
      var raw = localStorage.getItem(CHECKOUT_ITEMS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function clearCheckoutItems() { try { localStorage.removeItem(CHECKOUT_ITEMS_KEY); } catch (e) {} }

  function proceedToBooking() {
    var ids = getCart();
    if (ids.length === 0) return;
    closeDrawer();
    window.location.href = "/book-now";
  }

  /* ---------------- card renderer (used by index.html) ---------------- */

  /* Ratings: hidden by default; shown only for packages with >= 1 approved review. */
  var ratingSummaryPromise = null;
  function loadRatingSummary() {
    if (!ratingSummaryPromise) {
      ratingSummaryPromise = fetch("/api/reviews/summary")
        .then(function (r) { return r.ok ? r.json() : { summary: {} }; })
        .then(function (d) { return (d && d.summary) || {}; })
        .catch(function () { return {}; });
    }
    return ratingSummaryPromise;
  }
  function applyPackageRatings(containerEl) {
    var slots = containerEl.querySelectorAll(".glam-pkg-rating[data-rating-slot]");
    if (!slots.length) return;
    loadRatingSummary().then(function (summary) {
      slots.forEach(function (slot) {
        var info = summary[slot.getAttribute("data-rating-slot")];
        if (!info || !info.total) { slot.hidden = true; return; }
        var avg = Number(info.average) || 0;
        slot.setAttribute("aria-label", avg.toFixed(1) + " out of 5 from " + info.total + " review" + (info.total === 1 ? "" : "s"));
        slot.innerHTML = '<span class="glam-pkg-stars">★ ' + avg.toFixed(1) + '</span><span class="glam-pkg-rating-count">(' + info.total + ')</span>';
        slot.hidden = false;
      });
    });
  }

  function renderPackageCardsInto(containerEl, packages) {
    var html = "";
    packages.forEach(function (pkg) {
      var detailUrl = "/service-detail?pkg=" + encodeURIComponent(pkg.id);
      var active = isFavorite(pkg.id);
      html += '<article class="glam-pkg-card" data-id="' + pkg.id + '">' +
        '<button type="button" class="glam-pkg-fav-btn' + (active ? ' is-active' : '') + '" data-id="' + pkg.id + '" aria-label="' + (active ? 'Remove ' + pkg.name + ' from favourites' : 'Add ' + pkg.name + ' to favourites') + '" aria-pressed="' + active + '">' +
          '<i class="' + (active ? 'fa-solid' : 'fa-regular') + ' fa-heart"></i>' +
        '</button>' +
        '<a href="' + detailUrl + '" class="glam-pkg-img-link" aria-label="View ' + pkg.name + '">' +
          '<img loading="lazy" src="' + pkg.image + '" alt="' + pkg.name + '" class="glam-pkg-img' + (pkg.fullImage ? ' glam-pkg-img--full' : '') + '">' +
        '</a>' +
        '<div class="glam-pkg-body">' +
          '<a href="' + detailUrl + '" class="glam-pkg-title-link">' +
            '<h3 class="glam-pkg-name">' + pkg.name + '</h3>' +
          '</a>' +
          '<div class="glam-pkg-rating" data-rating-slot="' + pkg.id + '" hidden></div>' +
          '<div class="glam-pkg-price">' + pkg.priceLabel + '</div>' +
          '<div class="glam-pkg-actions">' +
            '<button type="button" class="glam-pkg-addcart" data-id="' + pkg.id + '" style="width:155px!important;max-width:155px!important;height:36px!important;min-height:36px!important;padding:0 14px!important;border-radius:4px!important;background:#fff!important;color:#460c61!important;border:1px solid #460c61!important;font-size:.68rem!important;font-weight:800!important;letter-spacing:.8px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;line-height:1!important;box-shadow:none!important;">ADD TO CART</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    });
    containerEl.innerHTML = html;
    applyPackageRatings(containerEl);

    containerEl.querySelectorAll(".glam-pkg-fav-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var id = btn.getAttribute("data-id");
        var nowActive = toggleFavorite(id);
        btn.classList.toggle("is-active", nowActive);
        btn.setAttribute("aria-pressed", nowActive);
        var icon = btn.querySelector("i");
        icon.className = (nowActive ? "fa-solid" : "fa-regular") + " fa-heart";
        toast(nowActive ? "Added to favourites" : "Removed from favourites");
      });
    });

    containerEl.querySelectorAll(".glam-pkg-addcart").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var active = toggleCart(btn.getAttribute("data-id"));
        toast(active ? "Added to cart" : "Removed from cart");
        btn.textContent = active ? "ADDED" : "ADD TO CART";
        btn.classList.toggle("is-added", active);
      });
    });
    refreshBadges();
  }

  /* ---------------- init ---------------- */

  document.addEventListener("DOMContentLoaded", function () {
    injectHeaderIcons();
    refreshBadges();
  });

  // expose a small public API
  window.Glam = {
    getCart: getCart,
    getFavorites: getFavorites,
    isInCart: isInCart,
    isFavorite: isFavorite,
    addToCart: addToCart,
    removeFromCart: removeFromCart,
    toggleCart: toggleCart,
    toggleFavorite: toggleFavorite,
    toast: toast,
    refreshBadges: refreshBadges,
    openCartDrawer: openCartDrawer,
    openFavoritesDrawer: openFavoritesDrawer,
    renderPackageCardsInto: renderPackageCardsInto,
    getQueue: getQueue,
    saveQueue: saveQueue,
    clearQueue: clearQueue,
    getCheckoutItems: getCheckoutItems,
    saveCheckoutItems: saveCheckoutItems,
    clearCheckoutItems: clearCheckoutItems
  };
})();

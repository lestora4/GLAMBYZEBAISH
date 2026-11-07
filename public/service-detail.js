/* ========================================================================
   Glam by Zebaish — SERVICE / PACKAGE DETAIL PAGE
   Reads ?pkg=<id> from the URL and renders that package's full details
   using the shared GLAM_PACKAGES catalog (packages-data.js) and the
   shared cart/favourites engine (cart-favorites.js).
   ======================================================================== */

(function () {
  "use strict";

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function render() {
    var root = document.getElementById("serviceDetailRoot");
    if (!root) return;

    var id = qs("pkg") || qs("service") || (GLAM_PACKAGES[0] && GLAM_PACKAGES[0].id);
    var pkg = getPackageById(id);

    if (!pkg) {
      root.innerHTML =
        '<div style="max-width:700px;margin:0 auto;padding:110px 20px 80px;text-align:center;">' +
        '<h2 style="color:#2d1b4e;">Package not found</h2>' +
        '<p style="color:#777;margin:12px 0 24px;">The package you\'re looking for isn\'t available. Take a look at our full range instead.</p>' +
        '<a href="#packages" style="display:inline-block;background:linear-gradient(135deg,#BF953F,#FCF6BA,#B38728,#FBF5B7,#AA771C);color:#2d1b4e;padding:12px 28px;border-radius:50px;font-weight:700;font-size:0.8rem;text-decoration:none;letter-spacing:0.4px;">Browse Packages</a>' +
        '</div>';
      return;
    }

    document.title = pkg.name + " | Glam by Zebaish";

    // Meta Pixel: "ViewContent" — someone is looking at this specific
    // package's detail page.
    if (typeof fbq === 'function') {
      fbq('track', 'ViewContent', {
        content_ids: [pkg.id],
        content_type: 'product',
        content_name: pkg.name,
        value: pkg.price,
        currency: 'INR'
      });
    }

    var featuresList = (pkg.features || []).map(function (f) {
      return '<li><i class="fa-solid fa-circle-check"></i><span>' + f + '</span></li>';
    }).join("");

    root.innerHTML =
      '<nav class="sd-breadcrumb-bar"><div class="sd-breadcrumb">' +
      '<a href="/">Home</a> <span>/</span> <a href="#packages">Packages</a> <span>/</span> <span class="sd-current">' + pkg.name + '</span>' +
      '</div></nav>' +

      '<div class="sd-wrap">' +
      '<div class="sd-grid">' +
      '<div class="sd-media">' +
      '<img src="' + pkg.image + '" alt="' + pkg.name + '" class="sd-img' + (pkg.fullImage ? ' sd-img--full' : '') + '">' +
      '</div>' +

      '<div class="sd-info">' +
      '<div class="sd-title-row">' +
      '<h1 class="sd-title">' + pkg.name + '</h1>' +
      '<button type="button" id="sdFav" class="sd-btn-icon" aria-label="Add to favourites"><i class="fa-solid fa-heart"></i></button>' +
      '</div>' +
      '<div class="sd-price">' + pkg.priceLabel + '</div>' +

      '<p class="sd-desc">' + pkg.description + '</p>' +

      (featuresList ? '<h3 class="sd-subhead">What\'s Included</h3><ul class="sd-details">' + featuresList + '</ul>' : '') +

      '<div class="sd-actions">' +
      '<a href="/book-now?service=' + pkg.id + '" id="sdBookNow" class="sd-btn-primary" style="width:148px!important;min-width:148px!important;max-width:148px!important;height:38px!important;min-height:38px!important;padding:0 16px!important;border-radius:5px!important;background:linear-gradient(135deg,#BF953F 0%,#D4AF37 45%,#AA771C 100%)!important;color:#fff!important;border:1px solid #B88A20!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;font-size:.68rem!important;font-weight:800!important;letter-spacing:1px!important;box-shadow:0 4px 12px rgba(180,140,35,.18)!important;text-decoration:none!important;"><i class="fa-solid fa-calendar-check" style="color:#fff!important;"></i><span style="color:#fff!important;">Book Now</span></a>' +
      '<button type="button" id="sdAddCart" class="sd-btn-secondary" style="width:155px!important;min-width:155px!important;max-width:155px!important;height:36px!important;min-height:36px!important;padding:0 14px!important;border-radius:4px!important;background:#fff!important;color:#460c61!important;border:1px solid #460c61!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;font-size:.68rem!important;font-weight:800!important;letter-spacing:.8px!important;box-shadow:none!important;"><i class="fa-solid fa-cart-plus" style="color:#460c61!important;"></i><span id="sdAddCartLabel" style="color:#460c61!important;">Add to Cart</span></button>' +
      '</div>' +
      '</div>' +
      '</div>' +

      '<div class="sd-related">' +
      '<h2>You May Also Like</h2>' +
      '<div class="glam-pkg-grid" id="sdRelatedGrid"></div>' +
      '</div>' +
      '<section class="sd-reviews" id="customer-reviews" aria-label="Customer Reviews">' +
      '<div class="sd-reviews-title"><h2>Customer Reviews</h2></div>' +
      '<div class="sd-reviews-panel" id="sdReviewsPanel">' +
      '<div class="sd-reviews-summary"><div class="sd-reviews-stars" id="sdReviewsStars" aria-label="No reviews yet">☆ ☆ ☆ ☆ ☆</div><p id="sdReviewsSummaryText">Be the first to write a review</p></div>' +
      '<div class="sd-reviews-divider" aria-hidden="true"></div>' +
      '<div class="sd-reviews-actions" id="sdReviewsActions"><a href="/contact" id="sdWriteReviewBtn" class="sd-review-btn sd-review-primary">Write a review</a><a href="/contact" class="sd-review-btn sd-review-secondary">Ask a question</a></div>' +
      '</div>' +
      '<div class="sd-reviews-list" id="sdReviewsList"></div>' +
      '</section>' +
      '</div>';

    // wire actions
    var favBtn = document.getElementById("sdFav");
    var cartBtn = document.getElementById("sdAddCart");
    var cartLabel = document.getElementById("sdAddCartLabel");

    function syncButtons() {
      var isFav = window.Glam.isFavorite(pkg.id);
      favBtn.classList.toggle("is-active", isFav);

      var inCart = window.Glam.isInCart(pkg.id);
      cartBtn.classList.toggle("is-active", inCart);
      cartBtn.style.background = inCart ? "#460c61" : "#fff";
      cartBtn.style.color = inCart ? "#fff" : "#460c61";
      cartBtn.style.borderColor = "#460c61";
      var cartIcon = cartBtn.querySelector("i");
      if (cartIcon) cartIcon.style.color = inCart ? "#fff" : "#460c61";
      cartLabel.style.color = inCart ? "#fff" : "#460c61";
      cartLabel.textContent = inCart ? "In Cart" : "Add to Cart";
      cartBtn.querySelector("i").className = inCart ? "fa-solid fa-check" : "fa-solid fa-cart-plus";
    }

    favBtn.addEventListener("click", function () {
      var active = window.Glam.toggleFavorite(pkg.id);
      window.Glam.toast(active ? "Added to favourites" : "Removed from favourites");
      syncButtons();
    });

    cartBtn.addEventListener("click", function () {
      var active = window.Glam.toggleCart(pkg.id);
      window.Glam.toast(active ? "Added to cart" : "Removed from cart");
      syncButtons();
    });

    syncButtons();

    // related packages (everything except this one)
    var relatedGrid = document.getElementById("sdRelatedGrid");
    var related = GLAM_PACKAGES.filter(function (p) { return p.id !== pkg.id; });
    window.Glam.renderPackageCardsInto(relatedGrid, related);
    window.Glam.refreshBadges();

    // Live reviews: list + rating summary + the "Write a review" flow.
    if (window.GlamReviews) {
      window.GlamReviews.mount(pkg);
    }
  }
// Ensure toast is visible and on top of everything
var toastFixStyle = document.createElement("style");
toastFixStyle.textContent =
  "#glamToast{" +
  "position:fixed !important;" +
  "left:50% !important;" +
  "bottom:30px !important;" +
  "transform:translateX(-50%) translateY(20px) !important;" +
  "background:#2d1b4e !important;" +
  "color:#ffffff !important;" +
  "padding:14px 28px !important;" +
  "border-radius:50px !important;" +
  "font-size:0.9rem !important;" +
  "font-weight:600 !important;" +
  "letter-spacing:0.3px !important;" +
  "box-shadow:0 8px 30px rgba(0,0,0,0.35) !important;" +
  "z-index:999999 !important;" +
  "opacity:0 !important;" +
  "transition:opacity 0.3s ease, transform 0.3s ease !important;" +
  "pointer-events:none !important;" +
  "border:2px solid #D4AF37 !important;" +
  "}" +
  "#glamToast.show{" +
  "opacity:1 !important;" +
  "transform:translateX(-50%) translateY(0) !important;" +
  "}";
document.head.appendChild(toastFixStyle);
  var style = document.createElement("style");
  style.textContent =
    ".sd-breadcrumb-bar{background:#F3ECF8;padding:10px 20px;}" +
    ".sd-breadcrumb{max-width:1200px;margin:0 auto;font-size:0.78rem;color:#999;}" +
    ".sd-breadcrumb a{color:#8a7a99;text-decoration:none;}" +
    ".sd-breadcrumb a:hover{color:#D4AF37;}" +
    ".sd-breadcrumb span{margin:0 6px;}" +
    ".sd-current{color:#2d1b4e;font-weight:600;}" +
    ".sd-wrap{max-width:1200px;margin:0 auto;padding:22px 20px 80px;}" +
    ".sd-grid{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:start;}" +
    ".sd-media{position:sticky;top:110px;}" +
    ".sd-img{width:100%;border-radius:20px;object-fit:cover;height:460px;box-shadow:0 20px 50px rgba(45,27,78,0.14);}" +
    ".sd-img.sd-img--full{height:auto;object-fit:contain;}" +
    ".sd-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:8px;}" +
    ".sd-title{font-size:2.1rem;font-weight:800;color:#2d1b4e;margin:0;text-transform:uppercase;letter-spacing:0.5px;}" +
    ".sd-price{font-size:2.6rem;font-weight:800;line-height:1;margin-bottom:22px;background:linear-gradient(135deg,#BF953F,#D4AF37,#AA771C);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}" +
    ".sd-desc{color:#555;line-height:1.8;font-size:0.98rem;margin-bottom:26px;}" +
    ".sd-subhead{color:#2d1b4e;font-size:1.05rem;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:14px;}" +
    ".sd-details{list-style:none;margin:0 0 32px;padding:0;display:grid;gap:12px;}" +
    ".sd-details li{display:flex;align-items:flex-start;gap:10px;color:#444;font-size:0.92rem;line-height:1.5;}" +
    ".sd-details li i{color:#2e9e5b;margin-top:3px;}" +
    ".sd-actions{display:flex;align-items:center;justify-content:flex-start;gap:14px;flex-wrap:wrap;margin-top:18px;}" +
    ".sd-btn-icon{width:38px;height:38px;border-radius:50%;padding:0;border:1.5px solid #eee;color:#2d1b4e;background:#fff;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;font-size:0.9rem;transition:all .25s ease;}" +
    ".sd-btn-icon:hover{border-color:#b3123a;color:#b3123a;}" +
    ".sd-btn-icon.is-active{background:#b3123a;border-color:#b3123a;color:#fff;}" +
    ".sd-btn-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;height:40px;width:auto;min-width:145px;background:linear-gradient(135deg,#BF953F 0%,#D4AF37 45%,#AA771C 100%) !important;color:#fff !important;padding:8px 17px;border-radius:7px;font-weight:800;font-size:.72rem;letter-spacing:1px;text-transform:uppercase;text-decoration:none;box-shadow:0 5px 14px rgba(180,140,35,.18);transition:all .22s ease;border:1px solid #B88A20;text-shadow:0 1px 1px rgba(0,0,0,.18);}" +
    ".sd-btn-primary:hover{background:linear-gradient(135deg,#AA771C 0%,#D4AF37 50%,#BF953F 100%) !important;color:#fff !important;transform:translateY(-1px);box-shadow:0 7px 17px rgba(180,140,35,.24);}" +
    ".sd-btn-secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:40px;height:40px;width:auto;min-width:145px;background:#fff !important;color:#460c61 !important;padding:8px 17px;border-radius:7px;font-weight:800;font-size:.72rem;letter-spacing:1px;text-transform:uppercase;border:1px solid #460c61;cursor:pointer;transition:all .22s ease;box-shadow:none;}" +
    ".sd-btn-secondary:hover,.sd-btn-secondary.is-active{background:#460c61 !important;border-color:#460c61;transform:translateY(-1px);box-shadow:0 6px 15px rgba(70,12,97,.16);}" +
    ".sd-btn-secondary:hover,.sd-btn-secondary:hover i,.sd-btn-secondary:hover span,.sd-btn-secondary.is-active,.sd-btn-secondary.is-active i,.sd-btn-secondary.is-active span{color:#fff !important;}" +
    "@media(max-width:700px){.sd-actions{display:flex;gap:9px;}.sd-btn-primary,.sd-btn-secondary{flex:1 1 0;width:auto;min-width:0;height:40px;min-height:40px;padding:8px 12px;}}" +
    ".sd-related{margin-top:80px;}" +
    ".sd-related h2{font-size:1.6rem;color:#2d1b4e;text-transform:uppercase;letter-spacing:1px;margin-bottom:26px;text-align:center;}" +
    "@media(max-width:900px){.sd-grid{grid-template-columns:1fr;gap:28px;}.sd-media{position:static;}.sd-img{height:320px;}.sd-img.sd-img--full{height:auto;}}" +
    "@media(max-width:600px){.sd-wrap{padding:18px 14px 60px;}.sd-title{font-size:1.55rem;}.sd-price{font-size:2rem;margin-bottom:18px;}.sd-img{height:300px;border-radius:16px;}.sd-img.sd-img--full{height:auto;}.sd-related{margin-top:58px;}.sd-related h2{font-size:1.3rem;}}";
  document.head.appendChild(style);

  document.addEventListener("DOMContentLoaded", render);
})();


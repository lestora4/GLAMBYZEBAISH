/* ========================================================================
   Glam by Zebaish — CUSTOMER REVIEWS WIDGET
   Loads real reviews for the current package onto service-detail.html and
   wires up a Flipkart/Amazon-style "Write a review" modal (star rating,
   title, description, up to 5 photos uploaded to Cloudinary).
   Verified-purchase rule: only a customer with a COMPLETED order for this
   exact package can submit a review, and only once per order.
   ======================================================================== */
(function () {
  "use strict";

  var MAX_IMAGES = 5;
  var MAX_IMAGE_BYTES = 5 * 1024 * 1024;
  var selectedFiles = [];
  var currentPkg = null;
  var currentOrderId = null;

  function esc(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function starsHtml(rating, size) {
    var full = Math.round(rating);
    var out = "";
    for (var i = 1; i <= 5; i++) {
      out += '<i class="fa-solid fa-star" style="color:' + (i <= full ? "#D4AF37" : "#ddd") + (size ? ";font-size:" + size : "") + '"></i>';
    }
    return out;
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return "";
    }
  }

  function toast(msg) {
    if (window.Glam && typeof window.Glam.toast === "function") {
      window.Glam.toast(msg);
    } else {
      alert(msg);
    }
  }

  /* ---------------- one-time CSS ---------------- */
  function injectStyles() {
    if (document.getElementById("sdrv-styles")) return;
    var style = document.createElement("style");
    style.id = "sdrv-styles";
    style.textContent =
      ".sd-reviews-list{max-width:900px;margin:34px auto 0;display:grid;gap:16px;}" +
      ".sdrv-empty{text-align:center;color:#999;font-size:.9rem;padding:10px 0 4px;}" +
      ".sdrv-card{background:#fff;border:1px solid #eee;border-radius:12px;padding:18px 20px;box-shadow:0 4px 14px rgba(45,27,78,.05);}" +
      ".sdrv-head{display:flex;align-items:center;gap:12px;margin-bottom:10px;}" +
      ".sdrv-avatar{width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,#460c61,#7a2ba3);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:.85rem;flex-shrink:0;}" +
      ".sdrv-who{flex:1;min-width:0;}" +
      ".sdrv-name{font-weight:700;color:#2d1b4e;font-size:.92rem;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}" +
      ".sdrv-verified{font-size:.68rem;font-weight:700;color:#2e9e5b;display:inline-flex;align-items:center;gap:4px;background:#eafaf1;padding:2px 8px;border-radius:20px;}" +
      ".sdrv-meta{font-size:.76rem;color:#999;margin-top:2px;}" +
      ".sdrv-stars{font-size:.8rem;letter-spacing:2px;white-space:nowrap;}" +
      ".sdrv-title{font-weight:700;color:#222;margin:2px 0 4px;font-size:.95rem;}" +
      ".sdrv-comment{color:#555;font-size:.9rem;line-height:1.65;white-space:pre-line;}" +
      ".sdrv-images{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;}" +
      ".sdrv-images img{width:64px;height:64px;object-fit:cover;border-radius:8px;cursor:pointer;border:1px solid #eee;}" +
      ".sdrv-artist{margin-top:10px;font-size:.75rem;color:#7a2ba3;font-weight:600;}" +
      /* lightbox */
      ".sdrv-lightbox{position:fixed;inset:0;background:rgba(15,8,20,.88);z-index:100000;display:flex;align-items:center;justify-content:center;padding:30px;}" +
      ".sdrv-lightbox img{max-width:92vw;max-height:88vh;border-radius:8px;}" +
      ".sdrv-lightbox-close{position:absolute;top:20px;right:26px;color:#fff;font-size:1.8rem;cursor:pointer;}" +
      /* modal */
      ".sdrv-overlay{position:fixed;inset:0;background:rgba(20,10,28,.55);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;}" +
      ".sdrv-modal{background:#fff;width:100%;max-width:520px;max-height:92vh;overflow-y:auto;border-radius:16px;box-shadow:0 30px 70px rgba(0,0,0,.35);}" +
      ".sdrv-modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px;border-bottom:1px solid #f0f0f0;position:sticky;top:0;background:#fff;border-radius:16px 16px 0 0;}" +
      ".sdrv-modal-head h3{margin:0;font-size:1.15rem;color:#2d1b4e;font-weight:800;}" +
      ".sdrv-modal-close{cursor:pointer;color:#999;font-size:1.3rem;background:none;border:none;line-height:1;padding:4px;}" +
      ".sdrv-modal-close:hover{color:#333;}" +
      ".sdrv-modal-body{padding:22px;}" +
      ".sdrv-pkg-context{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid #f2f2f2;}" +
      ".sdrv-pkg-context img{width:46px;height:46px;border-radius:8px;object-fit:cover;}" +
      ".sdrv-pkg-context span{font-weight:700;color:#2d1b4e;font-size:.92rem;}" +
      ".sdrv-field-label{font-weight:700;color:#333;font-size:.85rem;margin-bottom:10px;display:block;}" +
      ".sdrv-star-picker{display:flex;gap:8px;margin-bottom:6px;}" +
      ".sdrv-star-picker i{font-size:1.9rem;color:#ddd;cursor:pointer;transition:color .12s ease,transform .12s ease;}" +
      ".sdrv-star-picker i:hover{transform:scale(1.12);}" +
      ".sdrv-star-picker i.is-lit{color:#D4AF37;}" +
      ".sdrv-rating-word{font-size:.8rem;color:#7a2ba3;font-weight:700;min-height:1.2em;margin-bottom:18px;}" +
      ".sdrv-input,.sdrv-textarea{width:100%;border:1.5px solid #e6e0ec;border-radius:10px;padding:12px 14px;font-size:.9rem;font-family:inherit;color:#333;margin-bottom:16px;box-sizing:border-box;transition:border-color .15s ease;}" +
      ".sdrv-input:focus,.sdrv-textarea:focus{outline:none;border-color:#460c61;}" +
      ".sdrv-textarea{min-height:100px;resize:vertical;}" +
      ".sdrv-photo-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;}" +
      ".sdrv-photo-add{width:64px;height:64px;border-radius:10px;border:1.5px dashed #cbb9d8;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#7a2ba3;cursor:pointer;font-size:.65rem;gap:4px;background:#faf7fb;flex-shrink:0;}" +
      ".sdrv-photo-add i{font-size:1.05rem;}" +
      ".sdrv-photo-thumb{position:relative;width:64px;height:64px;flex-shrink:0;}" +
      ".sdrv-photo-thumb img{width:100%;height:100%;object-fit:cover;border-radius:10px;}" +
      ".sdrv-photo-remove{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#2d1b4e;color:#fff;border:2px solid #fff;font-size:.65rem;display:flex;align-items:center;justify-content:center;cursor:pointer;}" +
      ".sdrv-photo-hint{font-size:.72rem;color:#999;margin:0 0 20px;}" +
      ".sdrv-error{color:#c0392b;font-size:.82rem;margin:-8px 0 16px;}" +
      ".sdrv-submit{width:100%;background:linear-gradient(135deg,#BF953F 0%,#D4AF37 45%,#AA771C 100%);color:#fff;border:none;border-radius:10px;height:46px;font-weight:800;font-size:.85rem;letter-spacing:.6px;cursor:pointer;transition:opacity .15s ease;}" +
      ".sdrv-submit:disabled{opacity:.5;cursor:not-allowed;}" +
      ".sdrv-note{text-align:center;font-size:.78rem;color:#999;margin-top:12px;}" +
      "@media(max-width:480px){.sdrv-modal-body{padding:18px;}}";
    document.head.appendChild(style);
  }

  /* ---------------- review list + summary ---------------- */
  function renderSummary(stats) {
    var starsEl = document.getElementById("sdReviewsStars");
    var textEl = document.getElementById("sdReviewsSummaryText");
    if (!starsEl || !textEl) return;
    if (!stats || !stats.total) {
      starsEl.innerHTML = "☆ ☆ ☆ ☆ ☆";
      textEl.textContent = "Be the first to write a review";
      return;
    }
    starsEl.innerHTML = starsHtml(stats.average);
    textEl.textContent = stats.average.toFixed(1) + " out of 5 · " + stats.total + " review" + (stats.total === 1 ? "" : "s");
  }

  function renderList(reviews) {
    var list = document.getElementById("sdReviewsList");
    if (!list) return;
    if (!reviews || !reviews.length) {
      list.innerHTML = "";
      return;
    }
    list.innerHTML = reviews.map(function (r) {
      var initial = (r.customerName || "?").charAt(0).toUpperCase();
      var images = (r.images || []).map(function (url) {
        return '<img src="' + esc(url) + '" alt="Customer photo" onclick="window.GlamReviews.openLightbox(\'' + esc(url) + '\')">';
      }).join("");
      return (
        '<div class="sdrv-card">' +
        '<div class="sdrv-head">' +
        '<div class="sdrv-avatar">' + esc(initial) + "</div>" +
        '<div class="sdrv-who">' +
        '<div class="sdrv-name">' + esc(r.customerName) +
        '<span class="sdrv-verified"><i class="fa-solid fa-circle-check"></i> Verified Booking</span></div>' +
        '<div class="sdrv-meta">' + esc(formatDate(r.createdAt)) + "</div>" +
        "</div>" +
        '<div class="sdrv-stars">' + starsHtml(r.rating) + "</div>" +
        "</div>" +
        (r.title ? '<div class="sdrv-title">' + esc(r.title) + "</div>" : "") +
        (r.comment ? '<div class="sdrv-comment">' + esc(r.comment) + "</div>" : "") +
        (images ? '<div class="sdrv-images">' + images + "</div>" : "") +
        (r.artistName ? '<div class="sdrv-artist"><i class="fa-solid fa-wand-magic-sparkles"></i> Makeup by ' + esc(r.artistName) + "</div>" : "") +
        "</div>"
      );
    }).join("");
  }

  function openLightbox(url) {
    var box = document.createElement("div");
    box.className = "sdrv-lightbox";
    box.innerHTML = '<span class="sdrv-lightbox-close">&times;</span><img src="' + esc(url) + '" alt="Review photo">';
    box.addEventListener("click", function () { box.remove(); });
    document.body.appendChild(box);
  }

  function loadReviews(pkg) {
    fetch("/api/reviews?packageSlug=" + encodeURIComponent(pkg.id) + "&limit=20")
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.success) return;
        renderSummary(data.stats);
        renderList(data.reviews);
      })
      .catch(function () { /* silent — summary just stays at defaults */ });
  }

  /* ---------------- write-review button state ---------------- */
  function setActionButton(pkg, state) {
    var btn = document.getElementById("sdWriteReviewBtn");
    if (!btn) return;

    // Reset to a plain anchor each time so old click handlers don't stack.
    var fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);
    btn = fresh;

    if (state.mode === "guest") {
      btn.textContent = "Write a review";
      btn.href = "/login.html";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        toast("Please log in to write a review");
        window.location.href = "/login.html";
      });
    } else if (state.mode === "not_purchased") {
      btn.textContent = "Write a review";
      btn.href = "/book-now?service=" + pkg.id;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        toast("Book this service to leave a verified review");
        window.location.href = "/book-now?service=" + pkg.id;
      });
    } else if (state.mode === "already_reviewed") {
      btn.textContent = "✓ You reviewed this";
      btn.href = "javascript:void(0)";
      btn.style.opacity = "0.6";
      btn.style.pointerEvents = "none";
    } else if (state.mode === "eligible") {
      btn.textContent = "Write a review";
      btn.href = "javascript:void(0)";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openModal(pkg, state.orderId);
      });
    }
  }

  function checkEligibility(pkg) {
    var token = localStorage.getItem("userToken");
    if (!token) {
      setActionButton(pkg, { mode: "guest" });
      return;
    }
    fetch("/api/reviews/eligibility?packageSlug=" + encodeURIComponent(pkg.id), {
      headers: { Authorization: "Bearer " + token },
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.success) {
          setActionButton(pkg, { mode: "guest" });
          return;
        }
        if (data.canReview) {
          setActionButton(pkg, { mode: "eligible", orderId: data.orderId });
        } else if (data.alreadyReviewed) {
          setActionButton(pkg, { mode: "already_reviewed" });
        } else {
          setActionButton(pkg, { mode: "not_purchased" });
        }
      })
      .catch(function () { setActionButton(pkg, { mode: "guest" }); });
  }

  /* ---------------- write-review modal ---------------- */
  function buildModal(pkg) {
    var overlay = document.createElement("div");
    overlay.className = "sdrv-overlay";
    overlay.id = "sdrvOverlay";
    overlay.innerHTML =
      '<div class="sdrv-modal">' +
      '<div class="sdrv-modal-head"><h3>Rate this service</h3><button type="button" class="sdrv-modal-close" id="sdrvClose" aria-label="Close">&times;</button></div>' +
      '<div class="sdrv-modal-body">' +
      '<div class="sdrv-pkg-context"><img src="' + esc(pkg.image) + '" alt=""><span>' + esc(pkg.name) + "</span></div>" +

      '<span class="sdrv-field-label">Your rating</span>' +
      '<div class="sdrv-star-picker" id="sdrvStarPicker">' +
      [1, 2, 3, 4, 5].map(function (i) {
        return '<i class="fa-solid fa-star" data-value="' + i + '"></i>';
      }).join("") +
      "</div>" +
      '<div class="sdrv-rating-word" id="sdrvRatingWord">Tap a star to rate</div>' +

      '<span class="sdrv-field-label">Review title (optional)</span>' +
      '<input type="text" class="sdrv-input" id="sdrvTitle" maxlength="120" placeholder="Summarise your experience">' +

      '<span class="sdrv-field-label">Your review</span>' +
      '<textarea class="sdrv-textarea" id="sdrvComment" maxlength="2000" placeholder="What did you like? How was the artist, the makeup, the timing?"></textarea>' +

      '<span class="sdrv-field-label">Add photos (optional)</span>' +
      '<div class="sdrv-photo-row" id="sdrvPhotoRow">' +
      '<div class="sdrv-photo-add" id="sdrvPhotoAdd"><i class="fa-solid fa-camera"></i>Add</div>' +
      "</div>" +
      '<p class="sdrv-photo-hint">Up to 5 photos, JPG/PNG/WEBP, 5MB each.</p>' +
      '<input type="file" id="sdrvFileInput" accept="image/jpeg,image/png,image/webp" multiple style="display:none;">' +

      '<div class="sdrv-error" id="sdrvError" style="display:none;"></div>' +
      '<button type="button" class="sdrv-submit" id="sdrvSubmit" disabled>Submit review</button>' +
      '<p class="sdrv-note">Reviews are checked before they go live.</p>' +
      "</div></div>";
    return overlay;
  }

  function updateSubmitState() {
    var submitBtn = document.getElementById("sdrvSubmit");
    var rating = parseInt(document.getElementById("sdrvStarPicker").getAttribute("data-rating") || "0", 10);
    var comment = document.getElementById("sdrvComment").value.trim();
    submitBtn.disabled = !(rating > 0 && comment.length >= 5);
  }

  var RATING_WORDS = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent" };

  function wireStarPicker() {
    var picker = document.getElementById("sdrvStarPicker");
    var word = document.getElementById("sdrvRatingWord");
    var stars = picker.querySelectorAll("i");

    function paint(value) {
      stars.forEach(function (s) {
        s.classList.toggle("is-lit", parseInt(s.getAttribute("data-value"), 10) <= value);
      });
    }

    stars.forEach(function (s) {
      s.addEventListener("mouseenter", function () { paint(parseInt(s.getAttribute("data-value"), 10)); });
      s.addEventListener("click", function () {
        var value = parseInt(s.getAttribute("data-value"), 10);
        picker.setAttribute("data-rating", value);
        word.textContent = RATING_WORDS[value] || "";
        paint(value);
        updateSubmitState();
      });
    });
    picker.addEventListener("mouseleave", function () {
      paint(parseInt(picker.getAttribute("data-rating") || "0", 10));
    });
  }

  function renderPhotoRow() {
    var row = document.getElementById("sdrvPhotoRow");
    var addBtn = document.getElementById("sdrvPhotoAdd");
    var thumbs = selectedFiles.map(function (file, idx) {
      return (
        '<div class="sdrv-photo-thumb"><img src="' + URL.createObjectURL(file) + '">' +
        '<div class="sdrv-photo-remove" data-idx="' + idx + '">&times;</div></div>'
      );
    }).join("");
    row.innerHTML = thumbs + (selectedFiles.length < MAX_IMAGES ? addBtn.outerHTML : "");

    var newAddBtn = document.getElementById("sdrvPhotoAdd");
    if (newAddBtn) {
      newAddBtn.addEventListener("click", function () {
        document.getElementById("sdrvFileInput").click();
      });
    }
    row.querySelectorAll(".sdrv-photo-remove").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selectedFiles.splice(parseInt(btn.getAttribute("data-idx"), 10), 1);
        renderPhotoRow();
      });
    });
  }

  function showError(msg) {
    var errEl = document.getElementById("sdrvError");
    errEl.textContent = msg;
    errEl.style.display = "block";
  }
  function clearError() {
    var errEl = document.getElementById("sdrvError");
    errEl.style.display = "none";
  }

  function closeModal() {
    var overlay = document.getElementById("sdrvOverlay");
    if (overlay) overlay.remove();
    selectedFiles = [];
    currentOrderId = null;
  }

  function openModal(pkg, orderId) {
    currentPkg = pkg;
    currentOrderId = orderId;
    selectedFiles = [];

    var overlay = buildModal(pkg);
    document.body.appendChild(overlay);

    document.getElementById("sdrvClose").addEventListener("click", closeModal);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    wireStarPicker();
    renderPhotoRow();
    document.getElementById("sdrvComment").addEventListener("input", updateSubmitState);

    document.getElementById("sdrvPhotoAdd").addEventListener("click", function () {
      document.getElementById("sdrvFileInput").click();
    });

    document.getElementById("sdrvFileInput").addEventListener("change", function (e) {
      var files = Array.prototype.slice.call(e.target.files || []);
      files.forEach(function (file) {
        if (selectedFiles.length >= MAX_IMAGES) return;
        if (file.size > MAX_IMAGE_BYTES) {
          showError("Each photo must be under 5MB.");
          return;
        }
        clearError();
        selectedFiles.push(file);
      });
      e.target.value = "";
      renderPhotoRow();
    });

    document.getElementById("sdrvSubmit").addEventListener("click", submitReview);
  }

  function submitReview() {
    var submitBtn = document.getElementById("sdrvSubmit");
    var rating = parseInt(document.getElementById("sdrvStarPicker").getAttribute("data-rating") || "0", 10);
    var title = document.getElementById("sdrvTitle").value.trim();
    var comment = document.getElementById("sdrvComment").value.trim();
    var token = localStorage.getItem("userToken");

    if (!token) {
      showError("Your session expired — please log in again.");
      return;
    }
    if (!rating) {
      showError("Please select a star rating.");
      return;
    }
    if (comment.length < 5) {
      showError("Please write a few words about your experience.");
      return;
    }

    clearError();
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";

    var formData = new FormData();
    formData.append("orderId", currentOrderId);
    formData.append("rating", String(rating));
    formData.append("title", title);
    formData.append("comment", comment);
    selectedFiles.forEach(function (file) { formData.append("images", file); });

    fetch("/api/reviews", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
      body: formData,
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (result) {
        if (!result.ok || !result.data.success) {
          showError(result.data.error || "Something went wrong. Please try again.");
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit review";
          return;
        }
        var pkg = currentPkg;
        closeModal();
        toast(result.data.message || "Thanks for your review!");
        checkEligibility(pkg);
      })
      .catch(function () {
        showError("Network error — please check your connection and try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit review";
      });
  }

  /* ---------------- public entry point ---------------- */
  function mount(pkg) {
    injectStyles();
    loadReviews(pkg);
    checkEligibility(pkg);
  }

  window.GlamReviews = {
    mount: mount,
    openLightbox: openLightbox,
  };
})();

Glam by Zebaish — ECOMMERCE GRID UPDATE (v2) — WHAT TO DO WITH THESE 7 FILES
==========================================================================

Drop every file in this folder into the same folder your real project
already keeps book-now.html, checkout.html, index.html, etc. (your
public/ folder, or project root if that's how your Next.js app serves
static files).

REPLACE these 3 (overwrite the existing files):
  - index.html         (built from the index.html you uploaded — old
                         slider removed, ecommerce grid added, nothing
                         else in your page touched)
  - book-now.html
  - checkout.html

ADD/REPLACE these 4:
  - packages-data.js    (rebuilt — only the 6 packages, prices, and
                          descriptions that were already in your
                          index.html; no invented content)
  - cart-favorites.js
  - service-detail.html
  - service-detail.js

WHAT CHANGED IN THIS ROUND
---------------------------
1. Package cards (index.html grid + service-detail "You May Also Like"):
   - Removed the separate "Add to Cart" button — cards now show only
     a "Learn More" button, plus the small heart (favourite) and bag
     (cart) icons in the top corner of each card.
   - All buttons made smaller/less bulky (icons, Learn More, drawer
     buttons, mini-card buttons).

2. service-detail.html page:
   - Added a small background-colour breadcrumb bar (Home / Packages /
     [Package Name]) sitting closer to the header than before.
   - Removed the Duration and Best For rows.
   - Removed the Add to Cart button and the "Adding multiple packages
     to your cart..." note — only "Book This Package" remains.
   - Moved the favourites (heart) icon up next to the package heading.
   - Fixed a broken HTML comment that was making "FOOTER - GLAM BY
     ZEBA (ACCOUNT REMOVED) ========================================"
     show up as visible text on the page.

3. book-now.html:
   - When 2+ packages are selected, a checkbox appears:
     "Use the same date & time for all selected packages" (checked by
     default — same behaviour as before).
   - Unchecking it reveals one date & time field pair per selected
     package (same field styling as the original single date/time
     row), so each package can have its own date/time.

4. checkout.html:
   - The multi-package flow now picks up each package's own date/time
     when it was set individually in book-now.html, falling back to
     the shared date/time otherwise.

LEAVE EVERYTHING ELSE ALONE — not touched by this update:
  about.html, admin-dashboard.html, admin-login.html,
  artist-dashboard.html, blog.html, booking-confirmation.html,
  bridal-makeup-mistakes.html, bridal-skincare-prep.html, contact.html,
  dashboard.html, hd-bridal-makeup.html, login.html,
  privacy-policy.html, register.html, terms.html, zeba.css,
  and everything under app/, lib/, prisma/, vercel.json.

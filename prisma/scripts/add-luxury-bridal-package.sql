-- One-off data script (not a schema migration): inserts the Luxury Bridal
-- Package (Rs. 80,000) at slug 'luxury-bridal'. The front end
-- (packages-data.js -> book-now / checkout) sends this slug to
-- /api/orders/create, which looks the package and its price up in the DB,
-- so without this row the new package cannot be booked.
--
-- Run it in your SQL console (Neon / Supabase / Railway) the same way you
-- ran seed-test-package.sql. Safe to re-run: ON CONFLICT keeps it idempotent.

INSERT INTO "packages" (
  "id", "name", "slug", "description", "shortDescription",
  "price", "gst", "duration", "category", "images", "whatsIncluded",
  "isActive", "sortOrder", "createdAt", "updatedAt"
) VALUES (
  'luxury-bridal-package-001',
  'Luxury Bridal Package',
  'luxury-bridal',
  'An all-inclusive bridal experience designed for the bride & groom. Includes premium bridal makeup, luxury nail services, bridal hairstyling, professional draping and dupatta setting, and complete bridal glam styling.',
  'All-inclusive bridal experience for the bride & groom (package value Rs. 80,000).',
  80000,
  0,
  240,
  'BRIDAL',
  ARRAY['luxury-bridal.webp'],
  ARRAY['Premium Bridal Makeup', 'Luxury Nail Services', 'Bridal Hairstyling', 'Professional Draping & Dupatta Setting', 'Complete Bridal Glam Styling'],
  true,
  6,
  now(),
  now()
)
ON CONFLICT ("slug") DO UPDATE SET
  "name"            = EXCLUDED."name",
  "description"     = EXCLUDED."description",
  "shortDescription"= EXCLUDED."shortDescription",
  "price"           = EXCLUDED."price",
  "gst"             = EXCLUDED."gst",
  "duration"        = EXCLUDED."duration",
  "category"        = EXCLUDED."category",
  "images"          = EXCLUDED."images",
  "whatsIncluded"   = EXCLUDED."whatsIncluded",
  "isActive"        = EXCLUDED."isActive",
  "sortOrder"       = EXCLUDED."sortOrder",
  "updatedAt"       = now();

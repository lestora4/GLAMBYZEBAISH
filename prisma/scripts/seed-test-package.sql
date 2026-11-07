-- One-off data script (not a schema migration): inserts the ₹100 "Test"
-- package that the front end (index.html, book-now.html, checkout.html)
-- already expects at slug 'test'. This is the same row prisma/seed.js
-- upserts — use this instead if you only have SQL console access to the
-- production DB (e.g. Supabase/Neon/Railway) and can't run
-- `npx prisma db seed` directly.
--
-- Safe to re-run: ON CONFLICT keeps this idempotent, matching the seed
-- script's upsert behaviour.

INSERT INTO "packages" (
  "id", "name", "slug", "description", "shortDescription",
  "price", "gst", "duration", "category", "images", "whatsIncluded",
  "isActive", "sortOrder", "createdAt", "updatedAt"
) VALUES (
  'test-package-seed-001',
  'Test',
  'test',
  'A ₹100 demo package used only to walk through the booking and payment flow end-to-end with a client. Not a real makeup service.',
  'Demo package for testing the payment flow (₹100).',
  100,
  0,
  30,
  'PARTY',
  ARRAY['basic.webp'],
  ARRAY['For demoing checkout & payment only', '₹100 token amount', 'Not a real service booking'],
  true,
  -1,
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

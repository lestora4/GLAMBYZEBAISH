/* ========================================================================
   Glam by Zebaish — PACKAGE CATALOG
   Single source of truth for every package card + the service-detail page.
   Keys match the values already used by book-now.html / checkout.html
   (basic-makeup, sangeet-glam, royal-groom, sangeet-reception,
   bridal-signature) so nothing downstream breaks.
   ======================================================================== */
const GLAM_PACKAGES = [
  {
    id: "basic-makeup",
    name: "Signature Glam Makeup",
    image: "basic.webp",
    price: 2999,
    priceLabel: "₹2,999",
    description: "Full-face party makeup with skin preparation and base makeup, eye makeup with lashes (if required), lip makeup, basic hairstyling, and makeup setting for longer wear. Standard products are used in this package.",
    features: [
      "Full-face party makeup",
      "Skin preparation and base makeup",
      "Eye makeup with lashes (if required)",
      "Lip makeup",
      "Basic hairstyling",
      "Makeup setting for longer wear"
    ]
  },
  {
    id: "sangeet-glam",
    name: "Sangeet Glam&Glow",
    image: "sang.webp",
    price: 4999,
    priceLabel: "₹4,999",
    description: "Full-face makeup using professional products, skin preparation and base application, eye makeup with lashes, lip makeup, basic hairstyle/styling, and makeup setting for enhanced longevity. Perfect for brides, bridesmaids, sisters, and family members who want an elegant and festive look for the Sangeet ceremony.",
    features: [
      "Full-face makeup using professional products",
      "Skin preparation and base application",
      "Eye makeup with lashes",
      "Lip makeup",
      "Basic hairstyle/styling",
      "Makeup setting for enhanced longevity"
    ]
  },
  {
    id: "royal-groom",
    name: "Royal Groom Styling",
    image: "groom.webp",
    price: 2499,
    priceLabel: "From ₹2,499",
    description: "Perfect for wedding grooms, engagement ceremonies, reception events, traditional functions, and photoshoots. Includes groom makeup and skin finishing, hair styling, and beard grooming and setting for a premium, long-lasting look.",
    features: [
      "Groom Makeup & Skin Finishing",
      "Hair Styling",
      "Beard Grooming & Setting",
      "Premium Long-lasting Look"
    ]
  },
  {
    id: "sangeet-reception",
    name: "Reception Glam",
    image: "reception.webp",
    price: 8999,
    priceLabel: "From ₹8,999",
    description: "A luxurious, bespoke beauty experience curated for the bride who wants to glow, captivate & leave a lasting impression.",
    features: [
      "Luxury Skin Prep",
      "Flawless HD / Luxury Base",
      "Sculpted & Radiant Complexion",
      "Signature Glam Eyes",
      "Wispy Lashes",
      "Bespoke Lip Look",
      "Soft Contour & Luminous Highlight",
      "Long-Wear, Camera-Ready Finish",
      "Luxury Hairstyling Included",
      "Dupatta / Veil Draping & Setting"
    ]
  },
  {
    id: "bridal-signature",
    name: "Bridal Signature Package",
    image: "bride.webp",
    price: 8999,
    priceLabel: "From ₹8,999",
    description: "Perfect for Hindu weddings, Christian weddings, Nikah ceremonies, and traditional & destination weddings. Complete bridal transformation with premium bridal makeup, luxury hairstyling, saree/gown/dupatta setting, eyelashes, a touch-up kit, and complete bridal finishing.",
    features: [
      "Premium Bridal Makeup",
      "Luxury Hairstyling",
      "Saree/Gown/Dupatta Setting",
      "Eyelashes",
      "Touch-up Kit",
      "Complete Bridal Finishing"
    ]
  },
  {
    id: "luxury-bridal",
    name: "Luxury Bridal Package",
    image: "luxury-bridal.webp",
    
    price: 80000,
    priceLabel: "₹80,000",
    description: "An all-inclusive bridal experience designed for the bride & groom. Includes premium bridal makeup, luxury nail services, bridal hairstyling, professional draping and dupatta setting, and complete bridal glam styling.",
    features: [
      "Premium Bridal Makeup",
      "Luxury Nail Services",
      "Bridal Hairstyling",
      "Professional Draping & Dupatta Setting",
      "Complete Bridal Glam Styling"
    ]
  }
];

// Quick lookup helper
function getPackageById(id) {
  return GLAM_PACKAGES.find(function (p) { return p.id === id; });
}

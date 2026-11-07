/* ========================================================================
   Glam by Zebaish — SERVICE AREA DATA
   We currently take in-person bookings only within Hyderabad, Telangana,
   India. This file is the single source of truth for the "Area / Locality"
   dropdown used on the booking form — each entry maps a known locality to
   its correct pincode so the pincode field can auto-fill instead of the
   customer typing (and mistyping) it.
   ======================================================================== */
const HYDERABAD_AREAS = [
  { area: "Banjara Hills", pincode: "500034" },
  { area: "Jubilee Hills", pincode: "500033" },
  { area: "Madhapur", pincode: "500081" },
  { area: "Hitech City", pincode: "500081" },
  { area: "Gachibowli", pincode: "500032" },
  { area: "Financial District", pincode: "500032" },
  { area: "Nanakramguda", pincode: "500032" },
  { area: "Kondapur", pincode: "500084" },
  { area: "Manikonda", pincode: "500089" },
  { area: "Kukatpally", pincode: "500072" },
  { area: "KPHB Colony", pincode: "500072" },
  { area: "Miyapur", pincode: "500049" },
  { area: "Chandanagar", pincode: "500050" },
  { area: "Bachupally", pincode: "500090" },
  { area: "Nizampet", pincode: "500090" },
  { area: "Ameerpet", pincode: "500016" },
  { area: "Begumpet", pincode: "500016" },
  { area: "Somajiguda", pincode: "500082" },
  { area: "Punjagutta", pincode: "500082" },
  { area: "Himayatnagar", pincode: "500029" },
  { area: "Abids", pincode: "500001" },
  { area: "Koti", pincode: "500095" },
  { area: "Secunderabad", pincode: "500003" },
  { area: "Alwal", pincode: "500010" },
  { area: "Kompally", pincode: "500014" },
  { area: "Sainikpuri", pincode: "500094" },
  { area: "ECIL", pincode: "500062" },
  { area: "Tarnaka", pincode: "500017" },
  { area: "Habsiguda", pincode: "500007" },
  { area: "Nacharam", pincode: "500076" },
  { area: "Yousufguda", pincode: "500045" },
  { area: "SR Nagar", pincode: "500038" },
  { area: "Erragadda", pincode: "500018" },
  { area: "Mehdipatnam", pincode: "500028" },
  { area: "Tolichowki", pincode: "500008" },
  { area: "Attapur", pincode: "500048" },
  { area: "Malakpet", pincode: "500036" },
  { area: "Dilsukhnagar", pincode: "500060" },
  { area: "LB Nagar", pincode: "500074" },
  { area: "Vanasthalipuram", pincode: "500070" },
  { area: "Uppal", pincode: "500039" },
  { area: "Charminar", pincode: "500002" },
  { area: "Shamshabad", pincode: "501218" }
];

// Quick lookup helper — used by the booking form to auto-fill the
// (read-only) pincode field once an area is selected.
function getPincodeForArea(area) {
  var match = HYDERABAD_AREAS.find(function (a) { return a.area === area; });
  return match ? match.pincode : '';
}

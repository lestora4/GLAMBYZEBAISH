/* ========================================================================
   Glam by Zebaish — MULTI-CITY SERVICE AREAS
   In-person bookings are now taken in Hyderabad, Bangalore and Kochi.
   Loads AFTER hyderabad-areas.js (which keeps owning the Hyderabad list)
   and adds the other cities plus city-aware lookup helpers used by the
   booking form's City -> Area -> Pincode selects.
   To add another city later, add one entry to SERVICE_CITIES below.
   ======================================================================== */
const BANGALORE_AREAS = [
  { area: "Koramangala", pincode: "560034" },
  { area: "Indiranagar", pincode: "560038" },
  { area: "HSR Layout", pincode: "560102" },
  { area: "BTM Layout", pincode: "560076" },
  { area: "Jayanagar", pincode: "560041" },
  { area: "JP Nagar", pincode: "560078" },
  { area: "Banashankari", pincode: "560070" },
  { area: "Basavanagudi", pincode: "560004" },
  { area: "Whitefield", pincode: "560066" },
  { area: "Marathahalli", pincode: "560037" },
  { area: "Mahadevapura", pincode: "560048" },
  { area: "KR Puram", pincode: "560036" },
  { area: "Bellandur", pincode: "560103" },
  { area: "Sarjapur Road", pincode: "560035" },
  { area: "Bommanahalli", pincode: "560068" },
  { area: "Electronic City", pincode: "560100" },
  { area: "Domlur", pincode: "560071" },
  { area: "Ulsoor", pincode: "560008" },
  { area: "MG Road", pincode: "560001" },
  { area: "Shivajinagar", pincode: "560051" },
  { area: "Richmond Town", pincode: "560025" },
  { area: "Frazer Town", pincode: "560005" },
  { area: "Vasanth Nagar", pincode: "560052" },
  { area: "Sadashivanagar", pincode: "560080" },
  { area: "Malleshwaram", pincode: "560003" },
  { area: "Rajajinagar", pincode: "560010" },
  { area: "Basaveshwaranagar", pincode: "560079" },
  { area: "Vijayanagar", pincode: "560040" },
  { area: "RT Nagar", pincode: "560032" },
  { area: "Hebbal", pincode: "560024" },
  { area: "Kalyan Nagar", pincode: "560043" },
  { area: "Kammanahalli", pincode: "560084" },
  { area: "Sahakara Nagar", pincode: "560092" },
  { area: "Yelahanka", pincode: "560064" },
  { area: "Kengeri", pincode: "560060" }
];

const KOCHI_AREAS = [
  { area: "Fort Kochi", pincode: "682001" },
  { area: "Mattancherry", pincode: "682002" },
  { area: "Willingdon Island", pincode: "682003" },
  { area: "Pachalam", pincode: "682012" },
  { area: "Thevara", pincode: "682013" },
  { area: "MG Road", pincode: "682016" },
  { area: "Kaloor", pincode: "682017" },
  { area: "Ernakulam North", pincode: "682018" },
  { area: "Vyttila", pincode: "682019" },
  { area: "Kadavanthra", pincode: "682020" },
  { area: "Thrikkakara", pincode: "682021" },
  { area: "Edappally", pincode: "682024" },
  { area: "Palarivattom", pincode: "682025" },
  { area: "Kadamakudy", pincode: "682027" },
  { area: "Vennala", pincode: "682028" },
  { area: "Kakkanad", pincode: "682030" },
  { area: "Marine Drive", pincode: "682031" },
  { area: "Kalamassery", pincode: "682033" },
  { area: "Cheranalloor", pincode: "682034" },
  { area: "Panampilly Nagar", pincode: "682036" },
  { area: "Poonithura", pincode: "682038" },
  { area: "Infopark", pincode: "682042" },
  { area: "Tripunithura", pincode: "682301" },
  { area: "Maradu", pincode: "682304" },
  { area: "Aluva", pincode: "683101" }
];

const SERVICE_CITIES = [
  { city: "Hyderabad", state: "Telangana", areas: HYDERABAD_AREAS },
  { city: "Bangalore", state: "Karnataka", areas: BANGALORE_AREAS },
  { city: "Kochi",     state: "Kerala",    areas: KOCHI_AREAS }
];
const DEFAULT_SERVICE_CITY = "Hyderabad";

function getCityInfo(city) {
  return SERVICE_CITIES.find(function (c) { return c.city === city; }) || SERVICE_CITIES[0];
}
function getStateForCity(city) { return getCityInfo(city).state; }
function getAreasForCity(city) { return getCityInfo(city).areas; }

// City-aware pincode lookup (area names like "MG Road" exist in more than
// one city, so the city is passed whenever it is known). Replaces the
// Hyderabad-only helper from hyderabad-areas.js.
function getPincodeForArea(area, city) {
  var list = city ? getAreasForCity(city) : [].concat.apply([], SERVICE_CITIES.map(function (c) { return c.areas; }));
  var match = list.find(function (a) { return a.area === area; });
  return match ? match.pincode : '';
}

// Best-effort reverse lookup used for saved addresses (which only store
// city + pincode): returns { city, area } or null.
function findAreaByPincode(pincode, preferredCity) {
  var order = SERVICE_CITIES.slice().sort(function (a, b) {
    return (a.city === preferredCity ? -1 : 0) - (b.city === preferredCity ? -1 : 0);
  });
  for (var i = 0; i < order.length; i++) {
    var m = order[i].areas.find(function (a) { return a.pincode === pincode; });
    if (m) return { city: order[i].city, area: m.area };
  }
  return null;
}

function serviceCityNamesText() {
  var n = SERVICE_CITIES.map(function (c) { return c.city; });
  return n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
}

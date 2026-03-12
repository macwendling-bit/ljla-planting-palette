import { useState, useEffect, useRef } from "react";
import React from "react";

// Module-level image cache — persists across re-renders, one fetch per botanical name
const IMG_CACHE = {};

// ─────────────────────────────────────────────────────────────────────────────
// BRAND TOKENS — LeBlanc Jones Landscape Architects
// Pure white ground · near-black ink · one navy accent · Helvetica Neue thin
// Derived from leblancjones.com: white bg, dark navy nav text, hairline rules,
// zero decoration — all information, no ornament.
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  bg:         "#FFFFFF",
  surface:    "#FFFFFF",
  surfaceAlt: "#F9F9F8",
  border:     "#E8E8E6",       // hairline rule — very pale
  borderMid:  "#CECECE",
  ink:        "#111111",       // near-black — LBJ body text
  inkMid:     "#666666",
  inkLight:   "#AAAAAA",
  accent:     "#1B3353",       // LBJ navy — used for nav, active states, links
  accentHover:"#2A4E7A",
  accentTint: "#F0F4F8",       // barely-there blue wash for hover rows
  red:        "#8C2A2A",
  sans:       "'Helvetica Neue', 'Helvetica', Arial, sans-serif",
};

// All categories share the navy family — differentiated only by shade
const CAT = {
  "Deciduous Trees":  { ink: "#1B3353", rule: "#1B3353" },
  "Evergreen Trees":  { ink: "#1A4A3A", rule: "#1A4A3A" },
  "Deciduous Shrubs": { ink: "#2A4A6A", rule: "#2A4A6A" },
  "Evergreen Shrubs": { ink: "#1E4D40", rule: "#1E4D40" },
  Perennials:         { ink: "#2F5878", rule: "#2F5878" },
  Grasses:            { ink: "#3A5F7A", rule: "#3A5F7A" },
  Groundcovers:       { ink: "#1A3D5C", rule: "#1A3D5C" },
  Ferns:              { ink: "#263F5C", rule: "#263F5C" },
  Vines:              { ink: "#334F68", rule: "#334F68" },
};
const DESIGN_STYLES = [
  // ── Ecological ──
  { name: "Naturalistic",    desc: "Ecological reference, self-organized appearance, habitat-driven" },
  { name: "New Perennial",   desc: "Designed plant communities, native-forward, high craft — the Oudolf register" },
  { name: "Woodland",        desc: "Canopy-to-ground layers, shade, fern and shrub character" },
  { name: "Meadow",          desc: "Open grassy drifts, movement, strong seasonality" },
  // ── Designed ──
  { name: "Formal",          desc: "Geometry, symmetry, clipped structure — order is the statement" },
  { name: "Contemporary",    desc: "Minimal palette, bold singular form, strong negative space" },
  { name: "Ornamental",      desc: "Specimen-focused, plants chosen as individuals, restrained and curated" },
  { name: "Romantic",        desc: "Abundant bloom, soft edges, lush and layered" },
];


// ── ZIP PREFIX → SUGGESTED DESIGN STYLES ─────────────────────────────────────
// Based on regional character, climate, and dominant landscape vernacular.
// ── ZIP STYLE SUGGESTIONS ────────────────────────────────────────────────────
// Logic: each ZIP prefix maps to a regional character profile.
// Suggestions are the 2 most characteristic styles for that region.
// A third is derived from project type at render time in getSuggestedStyles().
//
// Regional profiles are based on:
//   Landscape vernacular  — what the native plant communities and cultural
//                           landscape of that region look like
//   Density signal        — urban/suburban/rural character of the prefix
//
// The 8 styles and how they map to regions:
//   Naturalistic  — everywhere with intact ecological character (forests, wetlands)
//   New Perennial — design-forward regions, academic/institutional presence
//   Woodland      — forested regions: New England, Appalachia, Pacific NW
//   Meadow        — open country: Great Plains, Midwest, mountain valleys
//   Formal        — dense urban, historic/civic centers, coastal estates
//   Contemporary  — high-density urban, West Coast, design-forward markets
//   Ornamental    — affluent suburban, horticultural tradition, estate character
//   Romantic      — mid-Atlantic, Southeast, cottage/garden tradition

// Regional character by 2-digit ZIP prefix → [primary, secondary]
// Project type nudges a third suggestion at runtime
const ZIP_REGION_STYLES = {
  // ── New England ──────────────────────────────────────────────
  // Dense forest, rocky coast, strong horticultural tradition
  "01": ["Woodland","Naturalistic"],   // Central MA — Worcester, Springfield
  "02": ["Ornamental","New Perennial"],// Greater Boston — design-forward, estate tradition
  "03": ["Woodland","Naturalistic"],   // NH — forested, rural
  "04": ["Woodland","Naturalistic"],   // ME — forested, coastal
  "05": ["Woodland","Naturalistic"],   // VT — forested, rural
  "06": ["Ornamental","Formal"],       // CT — affluent suburban, shoreline estates
  // ── Mid-Atlantic ─────────────────────────────────────────────
  "07": ["Ornamental","Formal"],       // NJ Shore / Bergen — dense suburban, estate
  "08": ["Naturalistic","Romantic"],   // South NJ — pine barrens, shore cottage
  "09": ["Ornamental","Formal"],       // CT coastal
  "10": ["Contemporary","Formal"],     // NYC — Manhattan, high density
  "11": ["Contemporary","Formal"],     // NYC — outer boroughs
  "12": ["Woodland","Ornamental"],     // Hudson Valley — estate tradition, forest
  "13": ["Woodland","Naturalistic"],   // Upstate NY — forested, rural
  "14": ["Woodland","Naturalistic"],   // Finger Lakes — forested, rural
  "15": ["Ornamental","New Perennial"],// Pittsburgh region — horticultural legacy
  "16": ["Naturalistic","Woodland"],   // NW PA — forested
  "17": ["Ornamental","Formal"],       // Central PA — Harrisburg, estate tradition
  "18": ["Ornamental","Woodland"],     // NE PA — Pocono, suburban Philly edge
  "19": ["Formal","Ornamental"],       // Philadelphia — historic, estate Main Line
  // ── Southeast / DC Metro ─────────────────────────────────────
  "20": ["Formal","Contemporary"],     // DC — civic, institutional
  "21": ["Formal","Ornamental"],       // Baltimore — historic, estate
  "22": ["Formal","Ornamental"],       // Northern VA — suburban DC, estate
  "23": ["Naturalistic","Romantic"],   // Richmond — woodland, romantic gardens
  "24": ["Woodland","Naturalistic"],   // SW VA — Appalachian, forested
  "25": ["Woodland","Naturalistic"],   // WV — forested, rural
  "26": ["Woodland","Naturalistic"],   // WV — forested, rural
  "27": ["Naturalistic","Romantic"],   // Piedmont NC — woodland, garden tradition
  "28": ["Naturalistic","Romantic"],   // Charlotte NC — suburban, garden
  "29": ["Naturalistic","Romantic"],   // SC — coastal, lowcountry, garden tradition
  // ── Deep South ───────────────────────────────────────────────
  "30": ["Romantic","Formal"],         // Atlanta — garden tradition, formal estates
  "31": ["Naturalistic","Romantic"],   // South GA — coastal plain
  "32": ["Naturalistic","Romantic"],   // N/Central FL — woodland, subtropical edge
  "33": ["Naturalistic","Contemporary"],// South FL — subtropical, modern
  "34": ["Naturalistic","Romantic"],   // Central FL
  "35": ["Romantic","Naturalistic"],   // Birmingham AL — garden tradition
  "36": ["Naturalistic","Romantic"],   // S AL — coastal plain
  "37": ["Romantic","Naturalistic"],   // Nashville — garden tradition, strong
  "38": ["Meadow","Naturalistic"],     // Memphis / W TN — river plain, open
  "39": ["Naturalistic","Romantic"],   // Mississippi — woodland, garden
  // ── Midwest ──────────────────────────────────────────────────
  "40": ["New Perennial","Contemporary"],// Louisville — design-forward, urban
  "41": ["Ornamental","Romantic"],     // Lexington KY — horse country, estate
  "43": ["New Perennial","Meadow"],    // Columbus OH — university city, prairie edge
  "44": ["Meadow","New Perennial"],    // Cleveland — Great Lakes, prairie restoration
  "45": ["Ornamental","Romantic"],     // Cincinnati — estate tradition, garden
  "46": ["Meadow","New Perennial"],    // Indianapolis — prairie, restoration
  "47": ["Meadow","Naturalistic"],     // S Indiana — open, rural
  "48": ["Ornamental","Woodland"],     // Detroit metro — estate suburbs
  "49": ["Woodland","Naturalistic"],   // W Michigan — forested, dune
  "50": ["Meadow","Naturalistic"],     // Des Moines — prairie, open
  "51": ["Meadow","Naturalistic"],     // W Iowa — open, agricultural
  "52": ["Meadow","New Perennial"],    // E Iowa — prairie, university towns
  "53": ["Meadow","Woodland"],         // Milwaukee — prairie + forest edge
  "54": ["Woodland","Naturalistic"],   // N Wisconsin — forested
  "55": ["Meadow","New Perennial"],    // Minneapolis — strong native plant culture
  "56": ["Meadow","Naturalistic"],     // Central MN — open, agricultural
  "57": ["Meadow","Naturalistic"],     // South Dakota — open plains
  "58": ["Meadow","Naturalistic"],     // North Dakota — open plains
  "59": ["Meadow","Naturalistic"],     // Eastern MT — open plains
  // ── Chicago Metro ────────────────────────────────────────────
  "60": ["New Perennial","Contemporary"],// Chicago city — design-forward, prairie legacy
  "61": ["Meadow","Naturalistic"],     // Central IL — prairie, agricultural
  "62": ["Meadow","Naturalistic"],     // S Illinois — open
  "63": ["Meadow","New Perennial"],    // St. Louis — prairie, garden tradition
  "64": ["Meadow","New Perennial"],    // Kansas City — prairie, design community
  "65": ["Meadow","Naturalistic"],     // Springfield MO — open, rural
  "66": ["Meadow","Naturalistic"],     // E Kansas — open plains
  "67": ["Meadow","Naturalistic"],     // Central Kansas — open plains
  "68": ["Meadow","Naturalistic"],     // Nebraska — open plains
  "69": ["Meadow","Naturalistic"],     // W Nebraska — open plains
  // ── South / Texas ────────────────────────────────────────────
  "70": ["Romantic","Contemporary"],   // New Orleans — lush, historic, design
  "71": ["Naturalistic","Romantic"],   // N Louisiana — woodland, garden
  "72": ["Naturalistic","Romantic"],   // Arkansas — woodland, garden
  "73": ["Meadow","Naturalistic"],     // Oklahoma — plains, open
  "74": ["Meadow","Naturalistic"],     // NE Oklahoma — plains
  "75": ["Contemporary","Formal"],     // Dallas — urban, contemporary design market
  "76": ["Contemporary","Ornamental"], // Fort Worth — suburban, estate
  "77": ["Naturalistic","Contemporary"],// Houston — subtropical, contemporary
  "78": ["Contemporary","Naturalistic"],// Austin — design-forward, Hill Country
  "79": ["Naturalistic","Meadow"],     // W Texas — arid open
  // ── Mountain West ────────────────────────────────────────────
  "80": ["Contemporary","Naturalistic"],// Denver — design-forward, mountain edge
  "81": ["Naturalistic","Meadow"],     // Western CO — mountain, open
  "82": ["Naturalistic","Meadow"],     // Wyoming — open, arid
  "83": ["Naturalistic","Meadow"],     // Idaho — open, rural
  "84": ["Contemporary","Naturalistic"],// Salt Lake City — urban, arid edge
  // ── Southwest ────────────────────────────────────────────────
  "85": ["Contemporary","Naturalistic"],// Phoenix — desert contemporary
  "86": ["Naturalistic","Meadow"],     // Flagstaff — mountain, open
  "87": ["Naturalistic","Contemporary"],// Albuquerque — arid, design market
  "88": ["Naturalistic","Meadow"],     // Southern NM — arid open
  "89": ["Contemporary","Naturalistic"],// Las Vegas — desert contemporary
  // ── Pacific Coast ────────────────────────────────────────────
  "90": ["Contemporary","Naturalistic"],// LA — design-forward, modern
  "91": ["Contemporary","Ornamental"], // LA suburbs — estate, formal
  "92": ["Contemporary","Naturalistic"],// San Diego — Mediterranean, modern
  "93": ["Naturalistic","Meadow"],     // Central Valley — open, agricultural
  "94": ["Contemporary","New Perennial"],// Bay Area — design-forward, native plant culture
  "95": ["Naturalistic","Contemporary"],// Sacramento / Central CA
  "96": ["Naturalistic","Contemporary"],// N California — coastal, naturalistic
  // ── Pacific Northwest ─────────────────────────────────────────
  "97": ["Woodland","New Perennial"],  // Oregon — forested, strong native plant culture
  "98": ["Woodland","New Perennial"],  // Washington — forested, Puget Sound
  "99": ["Woodland","Naturalistic"],   // N Washington / Alaska — deep forest
};

// Project type nudges — which style gets added as a third suggestion
const PROJECT_TYPE_STYLE_NUDGE = {
  "Residential":              "Ornamental",
  "Multi-Family Residential": "Contemporary",
  "Commercial":               "Contemporary",
  "Civic / Institutional":    "Formal",
  "Hospitality":              "Romantic",
  "Academic":                 "New Perennial",
  "Healthcare":               "Naturalistic",
  "Mixed-Use":                "Contemporary",
  "Parks & Open Space":       "Naturalistic",
  "Other":                    null,
};

function getSuggestedStyles(zip, projectType) {
  if (!zip || zip.length < 2) return [];
  const regional = ZIP_REGION_STYLES[zip.slice(0,2)] || [];
  const nudge = projectType ? PROJECT_TYPE_STYLE_NUDGE[projectType] : null;
  // Add nudge as third if not already in regional pair
  const all = nudge && !regional.includes(nudge)
    ? [...regional, nudge]
    : regional;
  return all;
}

const CATEGORIES  = ["Deciduous Trees", "Evergreen Trees", "Deciduous Shrubs", "Evergreen Shrubs", "Perennials", "Grasses", "Groundcovers", "Ferns", "Vines"];
const SUN_OPTIONS = ["Full Sun", "Part Shade", "Full Shade"];
const MOISTURE_OPTIONS = ["Dry", "Mesic", "Wet"];
const SLOPE_OPTIONS    = ["Flat", "Gentle Slope", "Steep Slope", "Rain Garden"];
const SOIL_OPTIONS     = ["Clay", "Loam", "Sandy", "Rocky", "Peat / Organic", "Silt"];
const USE_OPTIONS = [
  "Accent", "Screening", "Groundcover", "Specimen",
  "Erosion Control", "Shade Tree", "Ornamental Tree",
  "Foundation Planting", "Rain Garden / Bioswale",
  "Pollinator Support", "Wildlife Habitat", "Hedge / Buffer",
  "Woodland Understory", "Edible / Fruiting",
];

const PLANT_DB = [
  { id:1,  cat:"Deciduous Trees",        common:"Eastern Redbud",        botanical:"Cercis canadensis",           size:"20–30′ H × 25–35′ W", bloom:"Mar–Apr", color:"Pink-Magenta",          zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Mesic"],              use:["Specimen","Screening"],              slope:["Flat","Gentle Slope"],                       styles:["Naturalistic","Woodland","Contemporary","Romantic","Naturalistic"],                     favorite:true },
  { id:2,  cat:"Deciduous Trees",        common:"Bur Oak",                botanical:"Quercus macrocarpa",          size:"60–80′ H × 60–80′ W", bloom:"Apr–May", color:"Catkins",               zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun"],                       moisture:["Dry","Mesic"],         use:["Specimen","Screening"],              slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Naturalistic","Meadow","Naturalistic","Formal"],                                      favorite:true },
  { id:3,  cat:"Deciduous Trees",        common:"Serviceberry",           botanical:"Amelanchier arborea",         size:"15–25′ H × 15–20′ W", bloom:"Mar–Apr", color:"White",                 zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Mesic"],              use:["Specimen","Accent"],                 slope:["Flat","Gentle Slope"],                       styles:["Naturalistic","Woodland","Romantic","Contemporary","Formal"],                         favorite:false },
  { id:4,  cat:"Deciduous Trees",        common:"Baldcypress",            botanical:"Taxodium distichum",          size:"50–70′ H × 20–30′ W", bloom:"—",       color:"Rust (fall)",           zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun"],                       moisture:["Mesic","Wet"],         use:["Specimen","Screening"],              slope:["Flat","Rain Garden"],                        styles:["Contemporary","Naturalistic","Naturalistic","Formal"],                                favorite:false },
  { id:5,  cat:"Deciduous Trees",        common:"Pawpaw",                 botanical:"Asimina triloba",             size:"15–30′ H × 15–20′ W", bloom:"Apr–May", color:"Maroon",                zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Part Shade","Full Shade"],        moisture:["Mesic","Wet"],         use:["Screening","Specimen"],              slope:["Flat","Gentle Slope"],                       styles:["Woodland","Naturalistic","Naturalistic","Romantic"],                                    favorite:true },
  { id:32, cat:"Deciduous Trees",        common:"Paper Birch",            botanical:"Betula papyrifera",           size:"50–70′ H × 25–35′ W", bloom:"Apr–May", color:"White bark",            zones:["2a","2b","3a","3b","4a","4b","5a","5b","6a","6b"], sun:["Full Sun","Part Shade"],   moisture:["Mesic","Wet"],         use:["Specimen","Screening"],              slope:["Flat","Gentle Slope"],                       styles:["Naturalistic","Woodland","Contemporary","Contemporary","Naturalistic"],                    favorite:true },
  { id:33, cat:"Deciduous Trees",        common:"Sugar Maple",            botanical:"Acer saccharum",              size:"60–75′ H × 40–50′ W", bloom:"Apr–May", color:"Orange-Red (fall)",     zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a"], sun:["Full Sun","Part Shade"],          moisture:["Mesic"],              use:["Specimen","Screening"],              slope:["Flat","Gentle Slope"],                       styles:["Naturalistic","Formal","Romantic","Naturalistic"],                                      favorite:true },
  { id:34, cat:"Evergreen Trees",        common:"American Holly",         botanical:"Ilex opaca",                  size:"15–30′ H × 10–20′ W", bloom:"May–Jun", color:"Red berries (winter)",  zones:["5a","5b","6a","6b","7a","7b","8a","8b"],     sun:["Full Sun","Part Shade"],          moisture:["Mesic"],              use:["Screening","Specimen"],              slope:["Flat","Gentle Slope"],                       styles:["Formal","Woodland","Contemporary","Naturalistic","Romantic"],                          favorite:false },
  { id:6,  cat:"Deciduous Shrubs",       common:"Oakleaf Hydrangea",      botanical:"Hydrangea quercifolia",       size:"6–8′ H × 6–8′ W",     bloom:"Jun–Jul", color:"White → Parchment",     zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Part Shade","Full Shade"],        moisture:["Mesic"],              use:["Screening","Specimen"],              slope:["Flat","Gentle Slope"],                       styles:["Woodland","Contemporary","Naturalistic","Romantic","Formal"],                          favorite:true },
  { id:7,  cat:"Deciduous Shrubs",       common:"Wild Blue Indigo",       botanical:"Baptisia australis",          size:"3–4′ H × 3–4′ W",     bloom:"Apr–Jun", color:"Blue-Violet",           zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Dry","Mesic"],         use:["Accent","Screening"],                slope:["Flat","Gentle Slope"],                       styles:["Naturalistic","Meadow","Contemporary","Formal"],                                favorite:true },
  { id:8,  cat:"Deciduous Shrubs",       common:"Buttonbush",             botanical:"Cephalanthus occidentalis",   size:"5–12′ H × 5–12′ W",   bloom:"Jun–Sep", color:"White spherical",       zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Wet","Mesic"],         use:["Screening","Accent"],                slope:["Flat","Rain Garden"],                        styles:["Naturalistic","Woodland","Naturalistic"],                                             favorite:false },
  { id:9,  cat:"Deciduous Shrubs",       common:"Fragrant Sumac",         botanical:"Rhus aromatica",              size:"2–6′ H × 6–10′ W",    bloom:"Mar–Apr", color:"Yellow (insignificant)",zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Dry","Mesic"],         use:["Groundcover","Screening"],           slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Naturalistic","Meadow","Naturalistic","Naturalistic"],                               favorite:true },
  { id:10, cat:"Deciduous Shrubs",       common:"American Beautyberry",   botanical:"Callicarpa americana",        size:"3–5′ H × 3–5′ W",     bloom:"Jun–Aug", color:"Magenta berries",       zones:["6a","6b","7a","7b","8a"],                    sun:["Part Shade","Full Shade"],        moisture:["Mesic"],              use:["Accent","Screening"],                slope:["Flat","Gentle Slope"],                       styles:["Woodland","Romantic","Naturalistic","Contemporary"],                                  favorite:false },
  { id:11, cat:"Deciduous Shrubs",       common:"Virginia Sweetspire",    botanical:"Itea virginica",              size:"3–5′ H × 3–5′ W",     bloom:"Jun–Jul", color:"White",                 zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Mesic","Wet"],         use:["Screening","Accent"],                slope:["Flat","Gentle Slope","Rain Garden"],          styles:["Contemporary","Formal","Romantic","Naturalistic"],                                     favorite:true },
  { id:12, cat:"Deciduous Shrubs",       common:"New Jersey Tea",         botanical:"Ceanothus americanus",        size:"3–4′ H × 3–5′ W",     bloom:"May–Jun", color:"White",                 zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Dry","Mesic"],         use:["Accent","Groundcover"],              slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Meadow","Naturalistic","Naturalistic","Romantic"],                                     favorite:false },
  { id:35, cat:"Evergreen Shrubs",       common:"Inkberry",               botanical:"Ilex glabra",                 size:"5–8′ H × 5–8′ W",     bloom:"May–Jun", color:"Black berries (fall)",  zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a","8b"], sun:["Full Sun","Part Shade","Full Shade"], moisture:["Mesic","Wet"], use:["Screening","Accent"],           slope:["Flat","Gentle Slope","Rain Garden"],          styles:["Naturalistic","Naturalistic","Contemporary","Woodland","Formal"],                     favorite:true },
  { id:36, cat:"Deciduous Shrubs",       common:"Bayberry",               botanical:"Morella pensylvanica",        size:"5–10′ H × 5–10′ W",   bloom:"Apr–May", color:"Gray berries (fall)",   zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a"], sun:["Full Sun","Part Shade"],          moisture:["Dry","Mesic"],         use:["Screening","Accent"],                slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Naturalistic","Naturalistic","Naturalistic","Contemporary"],                                favorite:true },
  { id:37, cat:"Deciduous Shrubs",       common:"Highbush Blueberry",     botanical:"Vaccinium corymbosum",        size:"6–12′ H × 6–8′ W",    bloom:"Apr–May", color:"White flowers, Blue berries", zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a","7b"], sun:["Full Sun","Part Shade"], moisture:["Mesic","Wet"], use:["Screening","Specimen","Accent"], slope:["Flat","Gentle Slope"],                       styles:["Naturalistic","Woodland","Romantic","Naturalistic","Naturalistic"],                          favorite:true },
  { id:13, cat:"Grasses",      common:"Little Bluestem",        botanical:"Schizachyrium scoparium",     size:"2–4′ H × 1–2′ W",     bloom:"Aug–Oct", color:"Coppery-Red",           zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun"],                       moisture:["Dry","Mesic"],         use:["Groundcover","Accent"],              slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Naturalistic","Meadow","Contemporary","Naturalistic","Formal"],                       favorite:true },
  { id:14, cat:"Grasses",      common:"Switch Grass",           botanical:"Panicum virgatum",            size:"3–6′ H × 2–3′ W",     bloom:"Aug–Sep", color:"Pinkish-Red",           zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Dry","Mesic","Wet"],   use:["Screening","Accent","Groundcover"],   slope:["Flat","Gentle Slope","Rain Garden"],          styles:["Naturalistic","Meadow","Contemporary","Naturalistic","Formal"],                      favorite:true },
  { id:15, cat:"Grasses",      common:"Prairie Dropseed",       botanical:"Sporobolus heterolepis",      size:"2–3′ H × 2–3′ W",     bloom:"Aug–Sep", color:"Pinkish-Brown",         zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Dry","Mesic"],         use:["Groundcover","Accent"],              slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Meadow","Naturalistic","Contemporary","Formal","Contemporary"],                      favorite:true },
  { id:16, cat:"Grasses",      common:"Blue Wild Rye",          botanical:"Elymus canadensis",           size:"3–5′ H × 2–3′ W",     bloom:"Jul–Aug", color:"Blue-Tan",              zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Dry","Mesic"],         use:["Groundcover","Accent"],              slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Naturalistic","Meadow","Naturalistic"],                                               favorite:false },
  { id:17, cat:"Grasses",      common:"River Oats",             botanical:"Chasmanthium latifolium",     size:"2–4′ H × 1–2′ W",     bloom:"Jul–Sep", color:"Green → Bronze",        zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Part Shade","Full Shade"],        moisture:["Mesic","Wet"],         use:["Groundcover","Accent"],              slope:["Flat","Gentle Slope","Rain Garden"],          styles:["Woodland","Naturalistic","Contemporary","Romantic","Contemporary"],                   favorite:true },
  { id:18, cat:"Grasses",      common:"Big Bluestem",           botanical:"Andropogon gerardii",         size:"4–8′ H × 2–3′ W",     bloom:"Aug–Oct", color:"Turkey-Foot Bronze",    zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun"],                       moisture:["Dry","Mesic"],         use:["Screening","Accent","Groundcover"],   slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Meadow","Naturalistic","Naturalistic"],                                               favorite:false },
  { id:38, cat:"Grasses",      common:"Blue Oat Grass",         botanical:"Helictotrichon sempervirens", size:"2–3′ H × 2′ W",       bloom:"Jun–Jul", color:"Steel Blue",            zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun"],                       moisture:["Dry","Mesic"],         use:["Accent","Groundcover"],              slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Contemporary","Formal","Naturalistic","Naturalistic","Contemporary"],                    favorite:false },
  { id:19, cat:"Groundcovers", common:"Coral Bells",            botanical:"Heuchera americana",          size:"1–2′ H × 1–2′ W",     bloom:"May–Jun", color:"White-Pink",            zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Part Shade","Full Shade"],        moisture:["Mesic"],              use:["Groundcover","Accent"],              slope:["Flat","Gentle Slope"],                       styles:["Woodland","Contemporary","Naturalistic","Romantic","Formal","Contemporary"],               favorite:true },
  { id:20, cat:"Groundcovers", common:"Wild Ginger",            botanical:"Asarum canadense",            size:"6″ H × spreading",    bloom:"Apr–May", color:"Maroon (hidden)",       zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Part Shade","Full Shade"],        moisture:["Mesic","Wet"],         use:["Groundcover"],                       slope:["Flat","Gentle Slope"],                       styles:["Woodland","Contemporary","Formal","Naturalistic"],                                   favorite:false },
  { id:21, cat:"Perennials", common:"Purple Coneflower",      botanical:"Echinacea purpurea",          size:"2–4′ H × 1–2′ W",     bloom:"Jun–Sep", color:"Purple-Pink",           zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Dry","Mesic"],         use:["Accent","Groundcover"],              slope:["Flat","Gentle Slope"],                       styles:["Naturalistic","Meadow","Contemporary","Romantic","Naturalistic"],                      favorite:true },
  { id:22, cat:"Perennials", common:"Swamp Milkweed",         botanical:"Asclepias incarnata",         size:"3–4′ H × 2′ W",       bloom:"Jul–Aug", color:"Pink",                  zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun"],                       moisture:["Mesic","Wet"],         use:["Accent","Groundcover"],              slope:["Flat","Rain Garden"],                        styles:["Naturalistic","Meadow","Romantic","Naturalistic"],                                     favorite:false },
  { id:39, cat:"Perennials", common:"Wild Bergamot",          botanical:"Monarda fistulosa",           size:"2–4′ H × 2–3′ W",     bloom:"Jun–Aug", color:"Lavender-Pink",         zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"], moisture:["Dry","Mesic"],     use:["Accent","Groundcover"],              slope:["Flat","Gentle Slope"],                       styles:["Naturalistic","Meadow","Romantic","Naturalistic"],                                     favorite:true },
  { id:24, cat:"Ferns",        common:"Ostrich Fern",           botanical:"Matteuccia struthiopteris",   size:"3–5′ H × 2–3′ W",     bloom:"—",       color:"Vibrant Green",         zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Part Shade","Full Shade"],        moisture:["Mesic","Wet"],         use:["Groundcover","Screening","Accent"],   slope:["Flat","Gentle Slope"],                       styles:["Woodland","Contemporary","Formal","Romantic","Contemporary"],                         favorite:true },
  { id:25, cat:"Ferns",        common:"Autumn Fern",            botanical:"Dryopteris erythrosora",      size:"18–24″ H × 18–24″ W", bloom:"—",       color:"Copper → Green",        zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Part Shade","Full Shade"],        moisture:["Mesic"],              use:["Groundcover","Accent"],              slope:["Flat","Gentle Slope"],                       styles:["Contemporary","Contemporary","Formal","Woodland","Naturalistic"],                         favorite:false },
  { id:26, cat:"Ferns",        common:"Royal Fern",             botanical:"Osmunda regalis",             size:"3–6′ H × 3–4′ W",     bloom:"—",       color:"Green → Yellow (fall)", zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Part Shade","Full Shade"],        moisture:["Wet","Mesic"],         use:["Specimen","Accent","Screening"],     slope:["Flat","Rain Garden"],                        styles:["Woodland","Naturalistic","Romantic","Naturalistic"],                                    favorite:false },
  { id:27, cat:"Ferns",        common:"Cinnamon Fern",          botanical:"Osmundastrum cinnamomeum",    size:"2–4′ H × 2–3′ W",     bloom:"—",       color:"Green + Cinnamon fronds",zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Part Shade","Full Shade"],       moisture:["Mesic","Wet"],         use:["Accent","Groundcover"],              slope:["Flat","Gentle Slope","Rain Garden"],          styles:["Woodland","Naturalistic","Romantic","Contemporary"],                                  favorite:true },
  { id:40, cat:"Ferns",        common:"Interrupted Fern",       botanical:"Osmunda claytoniana",         size:"2–4′ H × 2–3′ W",     bloom:"—",       color:"Blue-Green",            zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a"], sun:["Part Shade","Full Shade"],        moisture:["Mesic","Wet"],         use:["Accent","Groundcover"],              slope:["Flat","Gentle Slope"],                       styles:["Woodland","Naturalistic","Contemporary","Naturalistic"],                                   favorite:false },
  { id:28, cat:"Vines",        common:"Trumpet Vine",           botanical:"Campsis radicans",            size:"30–40′ climbing",      bloom:"Jun–Sep", color:"Orange-Red",            zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Dry","Mesic"],         use:["Screening","Accent"],                slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Naturalistic","Naturalistic","Romantic","Meadow"],                                     favorite:false },
  { id:29, cat:"Vines",        common:"Virginia Creeper",       botanical:"Parthenocissus quinquefolia", size:"30–50′ climbing",      bloom:"Jun–Aug", color:"Scarlet (fall)",        zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade","Full Shade"], moisture:["Dry","Mesic"],    use:["Groundcover","Screening"],           slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Naturalistic","Woodland","Naturalistic","Romantic","Naturalistic"],                    favorite:true },
  { id:30, cat:"Vines",        common:"Crossvine",              botanical:"Bignonia capreolata",         size:"30–50′ climbing",      bloom:"Apr–May", color:"Orange-Red",            zones:["6a","6b","7a","7b","8a"],                    sun:["Full Sun","Part Shade"],          moisture:["Mesic"],              use:["Screening","Accent"],                slope:["Flat","Gentle Slope"],                       styles:["Contemporary","Formal","Naturalistic","Romantic","Naturalistic"],                     favorite:false },
  { id:31, cat:"Vines",        common:"American Bittersweet",   botanical:"Celastrus scandens",          size:"20–30′ climbing",      bloom:"May–Jun", color:"Orange-Red berries",    zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a"], sun:["Full Sun","Part Shade"],          moisture:["Dry","Mesic"],         use:["Screening","Accent"],                slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Naturalistic","Woodland","Naturalistic","Romantic"],                                    favorite:false },
  // ── LeBlanc Jones portfolio plants — New England coastal, meadow, woodland ──
  { id:50, cat:"Deciduous Trees",        common:"Honey Locust",           botanical:"Gleditsia triacanthos inermis", size:"30–70′ H × 30–50′ W", bloom:"Jun",     color:"Yellow (fall)",        zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun"],               moisture:["Dry","Mesic"],         use:["Specimen","Shade Tree","Screening"],  slope:["Flat","Gentle Slope"],                       styles:["Contemporary","Formal","Naturalistic","New Perennial"],                                favorite:true },
  { id:51, cat:"Deciduous Trees",        common:"Black Locust",           botanical:"Robinia pseudoacacia",          size:"30–50′ H × 25–35′ W", bloom:"May–Jun", color:"White fragrant",       zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun"],               moisture:["Dry","Mesic"],         use:["Specimen","Screening"],              slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Naturalistic","Naturalistic","Naturalistic","Meadow"],                                     favorite:true },
  { id:52, cat:"Evergreen Trees",        common:"Eastern Red Cedar",      botanical:"Juniperus virginiana",          size:"30–65′ H × 8–25′ W",  bloom:"—",       color:"Blue-green, berries",  zones:["2a","2b","3a","3b","4a","4b","5a","5b","6a","6b","7a","7b","8a","8b","9a"], sun:["Full Sun"],               moisture:["Dry","Mesic"],         use:["Screening","Specimen"],              slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Naturalistic","Naturalistic","Naturalistic","Formal","Contemporary"],                       favorite:true },
  { id:53, cat:"Deciduous Trees",        common:"Shadblow Serviceberry",  botanical:"Amelanchier canadensis",        size:"15–25′ H × 10–15′ W", bloom:"Mar–Apr", color:"White, red berries",   zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a","7b"], sun:["Full Sun","Part Shade"],          moisture:["Mesic","Wet"],         use:["Specimen","Accent"],                 slope:["Flat","Gentle Slope","Rain Garden"],          styles:["Naturalistic","Naturalistic","Woodland","Romantic"],                                   favorite:true },
  { id:54, cat:"Deciduous Trees",        common:"Tupelo / Black Gum",     botanical:"Nyssa sylvatica",               size:"30–50′ H × 20–30′ W", bloom:"—",       color:"Scarlet (fall)",       zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a","8b","9a"], sun:["Full Sun","Part Shade"],  moisture:["Mesic","Wet"],         use:["Specimen","Shade Tree"],             slope:["Flat","Gentle Slope","Rain Garden"],          styles:["Naturalistic","Woodland","Contemporary","Naturalistic"],                              favorite:true },
  { id:55, cat:"Deciduous Shrubs",       common:"Beach Plum",             botanical:"Prunus maritima",               size:"3–6′ H × 4–8′ W",     bloom:"Apr–May", color:"White flowers, purple plums", zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a"], sun:["Full Sun"],               moisture:["Dry","Mesic"],         use:["Screening","Accent","Edible / Fruiting"], slope:["Flat","Gentle Slope","Steep Slope"],     styles:["Naturalistic","Naturalistic","Naturalistic","Romantic"],                                     favorite:true },
  { id:56, cat:"Deciduous Shrubs",       common:"Seaside Goldenrod",      botanical:"Solidago sempervirens",         size:"2–5′ H × 1–2′ W",     bloom:"Aug–Oct", color:"Golden Yellow",        zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun"],               moisture:["Dry","Mesic"],         use:["Accent","Pollinator Support"],       slope:["Flat","Gentle Slope","Steep Slope"],          styles:["Naturalistic","Naturalistic","Meadow","Romantic"],                                    favorite:true },
  { id:57, cat:"Deciduous Shrubs",       common:"Sweet Pepperbush",       botanical:"Clethra alnifolia",             size:"3–8′ H × 4–6′ W",     bloom:"Jul–Sep", color:"White fragrant",       zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a","7b","8a","8b"], sun:["Full Sun","Part Shade","Full Shade"], moisture:["Mesic","Wet"],   use:["Screening","Accent","Pollinator Support"], slope:["Flat","Rain Garden"],           styles:["Naturalistic","Naturalistic","Woodland","Romantic","Contemporary"],                    favorite:true },
  { id:58, cat:"Deciduous Shrubs",       common:"Pasture Rose",           botanical:"Rosa carolina",                 size:"2–4′ H × 3–5′ W",     bloom:"Jun–Jul", color:"Pink",                 zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun"],                       moisture:["Dry","Mesic"],         use:["Accent","Erosion Control","Pollinator Support"], slope:["Flat","Gentle Slope","Steep Slope"], styles:["Naturalistic","Naturalistic","Meadow","Romantic","Naturalistic"],                          favorite:false },
  { id:59, cat:"Grasses",      common:"Beach Grass",            botanical:"Ammophila breviligulata",       size:"1–2′ H × spreading",  bloom:"Jul–Aug", color:"Tan",                  zones:["4a","4b","5a","5b","6a","6b","7a","7b"], sun:["Full Sun"],                           moisture:["Dry"],                 use:["Erosion Control","Groundcover"],     slope:["Gentle Slope","Steep Slope"],                styles:["Naturalistic","Naturalistic","Naturalistic"],                                               favorite:true },
  { id:60, cat:"Grasses",      common:"Tufted Hair Grass",      botanical:"Deschampsia cespitosa",         size:"2–3′ H × 2–3′ W",     bloom:"Jun–Aug", color:"Golden-Green",         zones:["4a","4b","5a","5b","6a","6b","7a","7b"], sun:["Part Shade","Full Shade"],            moisture:["Mesic","Wet"],         use:["Accent","Groundcover"],              slope:["Flat","Gentle Slope","Rain Garden"],          styles:["Contemporary","Woodland","Naturalistic","Formal","Contemporary"],                         favorite:true },
  { id:61, cat:"Groundcovers", common:"Seaside Goldenrod",      botanical:"Solidago rugosa 'Fireworks'",   size:"3–4′ H × 2–3′ W",     bloom:"Sep–Oct", color:"Arching Gold",         zones:["4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],          moisture:["Dry","Mesic","Wet"],   use:["Accent","Pollinator Support"],       slope:["Flat","Gentle Slope","Rain Garden"],          styles:["Naturalistic","Naturalistic","Meadow","Romantic"],                                    favorite:true },
  { id:62, cat:"Perennials", common:"Blue False Indigo",      botanical:"Baptisia australis",            size:"3–4′ H × 3–4′ W",     bloom:"May–Jun", color:"Blue-Violet",          zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun"],               moisture:["Dry","Mesic"],         use:["Accent","Groundcover","Specimen"],   slope:["Flat","Gentle Slope"],                       styles:["Naturalistic","Meadow","Contemporary","Formal","Naturalistic"],                      favorite:true },
  { id:63, cat:"Perennials", common:"New England Aster",      botanical:"Symphyotrichum novae-angliae",  size:"3–6′ H × 2–4′ W",     bloom:"Sep–Oct", color:"Purple-Pink",          zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Full Sun","Part Shade"],  moisture:["Dry","Mesic"],         use:["Accent","Pollinator Support","Wildlife Habitat"], slope:["Flat","Gentle Slope"],   styles:["Naturalistic","Meadow","Naturalistic","Romantic"],                                    favorite:true },
  { id:64, cat:"Ferns",        common:"Sensitive Fern",         botanical:"Onoclea sensibilis",            size:"18–30″ H × spreading", bloom:"—",      color:"Blue-Green + Beaded fronds", zones:["3a","3b","4a","4b","5a","5b","6a","6b","7a","7b","8a"], sun:["Part Shade","Full Shade"], moisture:["Wet","Mesic"],     use:["Groundcover","Accent"],              slope:["Flat","Rain Garden"],                        styles:["Woodland","Naturalistic","Naturalistic","Contemporary"],                              favorite:false },
];

// ─────────────────────────────────────────────────────────────────────────────
// ZIP PREFIX → USDA HARDINESS ZONE  (first 3 digits of ZIP)
// ─────────────────────────────────────────────────────────────────────────────
const ZIP_PREFIX_ZONES = {
  "010":"5b","011":"5b","012":"5b","013":"5a","014":"6a","015":"6a","016":"6a","017":"6a",
  "018":"6a","019":"6b","020":"6b","021":"6b","022":"6b","023":"6b","024":"6b",
  "025":"7a","026":"7a","027":"7a","028":"7a","029":"6b",
  "030":"5b","031":"5b","032":"5a","033":"5a","034":"5a","035":"5a","036":"5a","037":"5a","038":"6a","039":"6a",
  "040":"6a","041":"6a","042":"5b","043":"5b","044":"5a","045":"5a","046":"5a","047":"4b","048":"4b","049":"4a",
  "050":"5a","051":"5a","052":"5a","053":"5b","054":"5b","055":"4b","056":"4b","057":"4b","058":"4a","059":"4a",
  "060":"6b","061":"6a","062":"6a","063":"6b","064":"6b","065":"6b","066":"7a","067":"6b","068":"7a","069":"7a",
  "070":"7a","071":"7a","072":"7a","073":"7a","074":"7a","075":"7a","076":"7a","077":"7a","078":"7a","079":"7a",
  "080":"7a","081":"7a","082":"7a","083":"7a","084":"7a","085":"7a","086":"7a","087":"7a","088":"7a","089":"7a",
  "100":"7a","101":"7a","102":"7a","103":"7a","104":"7a","105":"6b","106":"6b","107":"6b","108":"6b","109":"6b",
  "110":"7a","111":"7a","112":"7a","113":"7a","114":"7a","115":"7a","116":"7a","117":"7a","118":"7a","119":"7a",
  "120":"5b","121":"5b","122":"5b","123":"5b","124":"6a","125":"6a","126":"5b","127":"5a","128":"5a","129":"5a",
  "130":"5b","131":"5b","132":"5b","133":"5a","134":"5a","135":"5a","136":"5a","137":"5b","138":"5a","139":"5a",
  "140":"6a","141":"6a","142":"6a","143":"5b","144":"5b","145":"5b","146":"5b","147":"5b","148":"5b","149":"5b",
  "150":"6a","151":"6a","152":"6a","153":"6a","154":"6a","155":"6a","156":"6a","157":"6a","158":"6a","159":"6a",
  "160":"6a","161":"6a","162":"6a","163":"6a","164":"6a","165":"6a","166":"6a","167":"6a","168":"6a","169":"6a",
  "170":"6b","171":"6b","172":"6b","173":"6b","174":"6b","175":"6b","176":"6b","177":"6b","178":"6b","179":"6b",
  "180":"6b","181":"6b","182":"6b","183":"6b","184":"6b","185":"6b","186":"6b","187":"6b","188":"6b","189":"6b",
  "190":"7a","191":"7a","192":"7a","193":"6b","194":"6b","195":"7a","196":"7a","197":"7a","198":"7a","199":"7a",
  "200":"7a","201":"7a","202":"7a","203":"7a","204":"7a","205":"7a","206":"7a","207":"7a","208":"7a","209":"7a",
  "210":"7a","211":"7a","212":"7a","213":"7a","214":"7a","215":"7a","216":"7a","217":"7a","218":"7a","219":"7a",
  "220":"7a","221":"7a","222":"7a","223":"7a","224":"7a","225":"7a","226":"7a","227":"7a","228":"7a","229":"7a",
  "230":"7b","231":"7b","232":"7b","233":"7b","234":"7b","235":"7b","236":"7b","237":"7b","238":"7b","239":"7b",
  "240":"6b","241":"6b","242":"6b","243":"6b","244":"6b","245":"6b","246":"6b","247":"6a","248":"6a","249":"6a",
  "250":"6a","251":"6a","252":"6a","253":"6a","254":"6a","255":"6a","256":"6a","257":"6a","258":"6a","259":"6a",
  "260":"6a","261":"6a","262":"6a","263":"6a","264":"6a","265":"6a","266":"6a","267":"6a","268":"6a",
  "270":"7b","271":"7b","272":"7b","273":"7b","274":"7b","275":"7b","276":"7b","277":"7b","278":"7b","279":"7b",
  "280":"7b","281":"7b","282":"7b","283":"7b","284":"7b","285":"7b","286":"7b","287":"6b","288":"6b","289":"6b",
  "290":"8a","291":"8a","292":"8a","293":"7b","294":"8a","295":"8a","296":"7b","297":"7a","298":"7b","299":"8a",
  "300":"7b","301":"7b","302":"7b","303":"7b","304":"7a","305":"7b","306":"7b","307":"7a",
  "308":"8a","309":"8a","310":"8a","311":"8a","312":"8a","313":"8b","314":"8b","315":"8a","316":"8a","317":"8a","318":"8b","319":"8b",
  "320":"9a","321":"9a","322":"9a","323":"8b","324":"8b","325":"8b","326":"8b","327":"9a","328":"9a","329":"9a",
  "330":"10a","331":"10a","332":"10a","333":"10a","334":"10a","335":"9b","336":"9b","337":"9b","338":"9b",
  "339":"9b","340":"11a","341":"9b","342":"9b","344":"9b","346":"9b","347":"9a","349":"9b",
  "350":"7a","351":"7a","352":"7a","354":"7a","355":"7a","356":"7a","357":"7a","358":"7a","359":"7a","360":"7a",
  "361":"7b","362":"7b","363":"7b","364":"7b","365":"8a","366":"8a","367":"8a","368":"8a","369":"8a",
  "370":"6b","371":"6b","372":"6b","373":"7a","374":"7a","376":"7a","377":"6b","378":"6b","379":"6b",
  "380":"7a","381":"7a","382":"7a","383":"7a","384":"7a","385":"7a","386":"7b","387":"7b","388":"7b","389":"7b",
  "390":"8a","391":"8a","392":"8a","393":"8a","394":"8a","395":"8a","396":"8a","397":"8a",
  "400":"6b","401":"6b","402":"6b","403":"6b","404":"6b","405":"6b","406":"6b","407":"6b","408":"6b","409":"6b",
  "410":"6a","411":"6a","412":"6a","413":"6a","414":"6a","415":"6a","416":"6a","417":"6a","418":"6a",
  "420":"6b","421":"6b","422":"6b","423":"6b","424":"6b","425":"6a","426":"6a","427":"6a",
  "430":"6a","431":"6a","432":"6a","433":"6a","434":"6a","435":"5b","436":"5b","437":"5b","438":"5b","439":"6a",
  "440":"6a","441":"6a","442":"6a","443":"6a","444":"6a","445":"6a","446":"6a","447":"6a","448":"6a","449":"6a",
  "450":"6b","451":"6b","452":"6b","453":"6b","454":"6b","455":"5b","456":"5b","457":"6a","458":"6a",
  "460":"6a","461":"6a","462":"6a","463":"6a","464":"6a","465":"5b","466":"5b","467":"5b","468":"5b","469":"6a",
  "470":"6a","471":"6a","472":"6a","473":"6a","474":"6a","475":"6a","476":"6a","477":"6a","478":"6a","479":"6a",
  "480":"6a","481":"6a","482":"6a","483":"6a","484":"6a","485":"6a","486":"5b","487":"5b","488":"5b","489":"5b",
  "490":"5b","491":"5b","492":"6a","493":"5a","494":"5a","495":"5a","496":"5a","497":"5b","498":"5b","499":"5b",
  "500":"5a","501":"5a","502":"5a","503":"5a","504":"5a","505":"5a","506":"5a","507":"5a","508":"5a",
  "510":"5a","511":"5a","512":"5a","513":"5a","514":"5a","515":"5a","516":"5a",
  "520":"5a","521":"5a","522":"5a","523":"5a","524":"5a","525":"5a","526":"5a","527":"5a","528":"5a",
  "530":"5a","531":"5a","532":"5a","534":"5a","535":"5b","537":"5a","538":"5a","539":"5a",
  "540":"4b","541":"4b","542":"4b","543":"4b","544":"4b","545":"4b","546":"4b","547":"5a","548":"5a","549":"5a",
  "550":"4b","551":"4b","553":"4b","554":"4b","555":"4b","556":"4a","557":"4a","558":"4a","559":"4a",
  "560":"4a","561":"4a","562":"4a","563":"4a","564":"4a","565":"3b","566":"3b","567":"3b",
  "570":"4b","571":"4b","572":"4b","573":"4b","574":"4b","575":"4a","576":"4a","577":"4a",
  "580":"4a","581":"4a","582":"4a","583":"4a","584":"4a","585":"4a","586":"3b","587":"3b","588":"3b",
  "590":"5a","591":"5a","592":"5a","593":"5a","594":"5a","595":"4b","596":"5a","597":"5a","598":"5a","599":"5a",
  "600":"5b","601":"5b","602":"5b","603":"5b","604":"5b","605":"5b","606":"5b","607":"5b","608":"5b","609":"5b",
  "610":"5b","611":"5b","612":"5b","613":"5b","614":"5b","615":"5b","616":"5b","617":"5b","618":"6a","619":"6a",
  "620":"6a","621":"6a","622":"6a","623":"6a","624":"6a","625":"6a","626":"6a","627":"6a","628":"6a","629":"6a",
  "630":"6a","631":"6a","633":"6a","634":"6a","635":"6a","636":"6a","637":"6a","638":"6a","639":"6a",
  "640":"6a","641":"6a","644":"6a","645":"6a","646":"6a","647":"6a","648":"6a",
  "650":"6a","651":"6a","652":"6a","653":"6a","654":"6b","655":"6b","656":"6b","657":"6b","658":"6b",
  "660":"6a","661":"6a","662":"6a","664":"6a","665":"6a","666":"6a","667":"6a","668":"6a","669":"6a",
  "670":"6a","671":"6a","672":"6a","673":"6a","674":"6a","675":"6a","676":"6a","677":"6a","678":"6a","679":"6a",
  "680":"5b","681":"5b","683":"5b","684":"5b","685":"5b","686":"5b","687":"5b","688":"5b","689":"5b",
  "690":"5a","691":"5a","692":"5a","693":"5a",
  "700":"8b","701":"8b","703":"8b","704":"8b","705":"8a","706":"8a","707":"9a","708":"9a",
  "710":"8a","711":"8a","712":"8a","713":"8a","714":"8a",
  "716":"7b","717":"7b","718":"7b","719":"7b","720":"7b","721":"7b","722":"7b","723":"7b","724":"7a","725":"7a",
  "726":"7a","727":"7a","728":"7a","729":"7b",
  "730":"7a","731":"7a","734":"7a","735":"7a","736":"7a","737":"7a","738":"7a","739":"7a",
  "740":"7a","741":"7a","743":"7a","744":"7a","745":"7a","746":"7a","747":"7b","748":"7b","749":"7b",
  "750":"8a","751":"8a","752":"8a","753":"8a","754":"8a","755":"8a","756":"8a","757":"8a","758":"8a","759":"8a",
  "760":"8a","761":"8a","762":"8a","763":"8a","764":"8a","765":"8a","766":"8a","767":"8a","768":"8a","769":"8a",
  "770":"9a","771":"9a","772":"9a","773":"9a","774":"9a","775":"9a","776":"9a","777":"9a","778":"9a","779":"9a",
  "780":"9a","781":"8b","782":"8b","783":"8b","784":"8b","785":"8a","786":"8b","787":"8b","788":"9a","789":"9a",
  "790":"7a","791":"7a","792":"7a","793":"7a","794":"7a","795":"8a","796":"8a","797":"8a","798":"8a","799":"8a",
  "800":"5b","801":"5b","802":"5b","803":"5b","804":"5b","805":"5b","806":"5b","807":"5b","808":"5b","809":"5b",
  "810":"6a","811":"6a","812":"6a","813":"6a","814":"6a","815":"6a","816":"6b",
  "820":"5a","821":"5a","822":"5a","823":"5a","824":"5a","825":"5a","826":"5a","827":"5a","828":"5a","829":"5a",
  "830":"5a","831":"5a","832":"5b","833":"5b","834":"5b","835":"5b","836":"5b","837":"5b","838":"5b",
  "840":"6b","841":"6b","842":"6b","843":"6b","844":"5b","845":"5b","846":"6b","847":"6b",
  "850":"9b","851":"9b","852":"9b","853":"9b","855":"9b","856":"8b","857":"8b","859":"8b","860":"7a","861":"7a","863":"8b","864":"8b","865":"8b",
  "870":"7a","871":"7a","872":"7a","873":"6b","874":"7a","875":"7b","877":"7b","878":"7b","879":"8a","880":"8a","881":"8a","882":"8a","883":"8a","884":"8a",
  "890":"9b","891":"9b","893":"9b","894":"8b","895":"8b","897":"8b","898":"8b",
  "900":"10a","901":"10a","902":"10a","903":"10a","904":"10a","905":"10a","906":"10a","907":"10a","908":"10a",
  "910":"10a","911":"10a","912":"10a","913":"10a","914":"10a","915":"10a","916":"9b","917":"9b","918":"9b","919":"10a",
  "920":"10a","921":"10a","922":"9b","923":"9b","924":"9b","925":"9b","926":"9b","927":"9b","928":"9b",
  "930":"9b","931":"9b","932":"9a","933":"9a","934":"9b","935":"9a","936":"9a","937":"9a","938":"9a","939":"9a",
  "940":"9b","941":"9b","942":"9b","943":"9b","944":"9b","945":"9b","946":"9b","947":"9b","948":"9a","949":"9b",
  "950":"9b","951":"9b","952":"9b","953":"9b","954":"9b","955":"8b","956":"9a","957":"9a","958":"9a","959":"8b",
  "960":"8a","961":"8a",
  "970":"8b","971":"8b","972":"8b","973":"8b","974":"8b","975":"8b","976":"8b","977":"8b","978":"8a","979":"8b",
  "980":"8b","981":"8b","982":"8b","983":"8a","984":"8b","985":"8a","986":"8b","987":"8a","988":"7a","989":"7a",
  "990":"7a","991":"7a","992":"7a","993":"7a","994":"7a",
  "995":"5a","996":"5a","997":"5a","998":"4a","999":"3a",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const MAX_PER_CAT   = 20;
const DEFAULT_PER_CAT = 5;
const MIN_RESULTS   = 4;

function getZoneFromZip(zip) {
  if (!zip || zip.length < 5) return null;
  return ZIP_PREFIX_ZONES[zip.slice(0, 3)] || null;
}

const SING = { "Deciduous Trees":"deciduous tree", "Evergreen Trees":"evergreen tree", "Deciduous Shrubs":"deciduous shrub", "Evergreen Shrubs":"evergreen shrub", Perennials:"perennial", Grasses:"grass", Groundcovers:"groundcover", Ferns:"fern", Vines:"vine" };

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = (seed + 1) * 1664525 + 1013904223;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}


// ─────────────────────────────────────────────────────────────────────────────
// COMPANION GROUPS — LJLA pairing logic encoded from project history
// Each group is a set of base species (genus + epithet, lowercase) that the
// firm has consistently specified together. Plants score +1 for each group-mate
// already present anywhere in the palette. Higher score = surfaces first on regen.
// ─────────────────────────────────────────────────────────────────────────────
const COMPANION_GROUPS = [
  // ── Native shrub backbone ── (Clethra + Ilex + Fothergilla + Hamamelis + Viburnum)
  // Shows up across 2112, 2233, 2314, 2412 — structural layer for naturalistic/edge
  ["clethra alnifolia", "ilex verticillata", "fothergilla gardenii", "fothergilla major",
   "hamamelis virginiana", "hamamelis vernalis", "viburnum nudum", "viburnum dentatum"],

  // ── Viburnum sequential interest stacking ──
  // Fragrant early (Carlesii/Bodnantense) → structural mid (Plicatum) → berries/winter (Nudum/Winterthur)
  ["viburnum carlesii", "viburnum plicatum", "viburnum nudum", "viburnum dentatum",
   "viburnum bodnantense", "viburnum acerifolium", "viburnum lentago"],

  // ── White fragrance walled garden ── (2233)
  // Calycanthus + Viburnum carlesii + Lilac + Mockorange + Daphne, held by evergreen structure
  ["viburnum carlesii", "calycanthus floridus", "philadelphus coronarius", "syringa meyeri",
   "daphne odora", "kalmia latifolia", "pieris japonica", "cephalotaxus harringtonia"],

  // ── Shade perennial quartet ── (2325, 2412, 2233)
  // Silver foliage contrast + bold form (Hosta Krossa Regal) + soft movement (Hakonechloa)
  ["brunnera macrophylla", "pulmonaria saccharata", "pulmonaria officinalis",
   "hosta sieboldiana", "hosta plantaginea", "hakonechloa macra"],

  // ── Native meadow grass trio + Dennstaedtia ── (2112, 2233)
  ["panicum virgatum", "andropogon gerardii", "sporobolus heterolepis", "dennstaedtia punctilobula"],

  // ── Fall color tree sequence ── (2112 meadow list)
  // Early red (Nyssa) → mid orange (Acer triflorum, Parrotia) → late gold (Cercidiphyllum, Tilia)
  ["nyssa sylvatica", "acer rubrum", "liquidambar styraciflua", "parrotia persica",
   "cercidiphyllum japonicum", "crataegus viridis"],

  // ── Autumn tree sequence variant ── (2134)
  ["nyssa sylvatica", "acer triflorum", "tilia americana", "cercidiphyllum japonicum"],

  // ── Amelanchier + formal evergreen understory ── (2325, 2314, 2134)
  // Serviceberry as featured entry tree, anchored by evergreen structural layer
  ["amelanchier canadensis", "amelanchier laevis", "amelanchier arborea",
   "taxus cuspidata", "taxus media", "buxus sempervirens", "ilex opaca"],

  // ── Clematis integrifolia scramblers ── (2325)
  // Non-twining types used as perennial scramblers through a shrub layer
  ["clematis integrifolia", "clematis heracleifolia", "clematis recta"],
];

// Returns the base species key: "Panicum virgatum 'Shenandoah'" → "panicum virgatum"
function companionBase(botanical) {
  return (botanical || "").toLowerCase().split(/[\u2018\u2019'"]/)[0].trim()
    .split(" ").slice(0, 2).join(" ");
}

// Score how many group-mates of this candidate are already present in the palette.
// presentBases = Set of companionBase() strings already in the full palette.
function companionScore(botanical, presentBases) {
  const base = companionBase(botanical);
  let score = 0;
  for (const group of COMPANION_GROUPS) {
    if (!group.includes(base)) continue;
    for (const mate of group) {
      if (mate !== base && presentBases.has(mate)) score++;
    }
  }
  return score;
}

// Merged lookup: LJLA favorites first (favorite:true), then fill from LOCAL_PLANT_LOOKUP
// Favorites that duplicate a botanical in LOCAL_PLANT_LOOKUP take precedence (richer data)
// ─────────────────────────────────────────────────────────────────────────────
// TOXICITY
// Sources: ASPCA, NC State Extension, Cornell Poisonous Plants
// severity: "high" = potentially fatal | "moderate" = systemic | "mild" = irritant
// who: "both" = humans + pets | "pets" = pets only
// ─────────────────────────────────────────────────────────────────────────────
const TOXIC_GENERA = {
  "Taxus":        { severity: "high",     who: "both", note: "All parts (except aril) fatal to humans, dogs, horses" },
  "Daphne":       { severity: "high",     who: "both", note: "All parts highly toxic to humans and animals" },
  "Convallaria":  { severity: "high",     who: "both", note: "Cardiac glycosides — toxic to humans and animals" },
  "Kalmia":       { severity: "high",     who: "both", note: "Grayanotoxins in all parts — toxic to humans and animals" },
  "Rhododendron": { severity: "high",     who: "both", note: "Grayanotoxins in all parts — toxic to humans and animals" },
  "Pieris":       { severity: "high",     who: "both", note: "Grayanotoxins — toxic to humans and animals" },
  "Actaea":       { severity: "high",     who: "both", note: "Toxic berries — can cause cardiac arrest" },
  "Cephalotaxus": { severity: "moderate", who: "both", note: "Alkaloids — similar toxicity profile to Taxus" },
  "Nandina":      { severity: "moderate", who: "both", note: "Cyanogenic glycosides in berries — toxic to birds and pets" },
  "Wisteria":     { severity: "moderate", who: "both", note: "Seeds and pods toxic to humans and pets" },
  "Ilex":         { severity: "moderate", who: "both", note: "Berries toxic if ingested in quantity" },
  "Buxus":        { severity: "moderate", who: "both", note: "Alkaloids in all parts" },
  "Iris":         { severity: "moderate", who: "pets", note: "Roots and leaves toxic to dogs and cats" },
  "Vinca":        { severity: "moderate", who: "pets", note: "Toxic to dogs, cats, and horses" },
  "Euphorbia":    { severity: "moderate", who: "both", note: "Toxic sap — skin and eye irritant" },
  "Clematis":     { severity: "mild",     who: "both", note: "GI irritation if ingested" },
  "Brunnera":     { severity: "mild",     who: "both", note: "May cause skin irritation on contact" },
};

function getPlantToxicity(botanical) {
  if (!botanical) return null;
  // Match on genus — handle × hybrid notation
  const genus = botanical.split(/[\s×]/)[0].replace(/[^A-Za-z]/g, "");
  return TOXIC_GENERA[genus] || null;
}

function getLocalPlants({ zone, styles, sun, moisture, use, slope, soil, seed = 0 }) {
  const pass = (rStyle, rUse, rSlope, rMoisture, rSoil) =>
    PLANT_DB.filter(p => {
      if (zone && !p.zones.includes(zone)) return false;
      if (!rStyle && styles?.length && !styles.some(s => p.styles.includes(s))) return false;
      if (sun && !p.sun.includes(sun)) return false;
      if (!rMoisture && moisture && !p.moisture.includes(moisture)) return false;
      if (!rUse && use?.length && !use.some(u => p.use.includes(u))) return false;
      if (!rSlope && slope && !p.slope.includes(slope)) return false;
      if (!rSoil && soil && p.soil?.length && !p.soil.includes(soil)) return false;
      return true;
    });

  let r = pass(false, false, false, false, false);
  if (r.length < MIN_RESULTS) r = pass(false, false, false, false, true); // relax soil first
  if (r.length < MIN_RESULTS) r = pass(true, false, false, false, true);
  if (r.length < MIN_RESULTS) r = pass(true, true, false, false, true);
  if (r.length < MIN_RESULTS) r = pass(true, true, true, false, true);
  if (r.length < MIN_RESULTS) r = pass(true, true, true, true, true);

  const favs = seededShuffle(r.filter(p => p.favorite), seed);
  const rest = seededShuffle(r.filter(p => !p.favorite), seed);
  return [...favs, ...rest];
}

function buildCatState(plants) {
  const active = {}, pool = {};
  CATEGORIES.forEach(cat => {
    const items = plants.filter(p => p.cat === cat);
    active[cat] = items.slice(0, DEFAULT_PER_CAT);
    pool[cat]   = items.slice(DEFAULT_PER_CAT);
  });
  return { active, pool };
}

// Depth-tracking JSON extractor — finds the outermost complete [ ] or { } structure.
// Simple indexOf/lastIndexOf is wrong: it grabs inner arrays inside objects (e.g.
// {"zones":["5a","5b"]} → incorrectly returns ["5a","5b"]).
function extractOutermostJSON(raw) {
  const first = raw.search(/[\[{]/);
  if (first === -1) throw new Error("No JSON found in response");
  const open  = raw[first];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = first; i < raw.length; i++) {
    const ch = raw[i];
    if (escape)          { escape = false; continue; }
    if (ch === "\\")     { escape = true;  continue; }
    if (ch === '"')      { inStr = !inStr; continue; }
    if (inStr)           continue;
    if (ch === open)     depth++;
    else if (ch === close) { depth--; if (depth === 0) return raw.slice(first, i + 1); }
  }
  throw new Error("Malformed JSON in response");
}

// Centralised API helper. API key is injected by claude.ai infrastructure — do not add it here.
// onDebug(entry) captures { label, prompt, ts, status, raw, extracted, error } for the debug panel.
async function claudeAPI(prompt, maxTokens = 1200, onDebug = null, label = "call") {
  const entry = { label, prompt, ts: new Date().toLocaleTimeString(), status: null, raw: null, extracted: null, error: null };
  const report = (extra = {}) => { if (onDebug) onDebug({ ...entry, ...extra }); };
  try {
    const res = { ok: false, status: 503, json: async () => ({}) }
    entry.status = res.status;
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      entry.error = errBody?.error?.message || `HTTP ${res.status}`;
      report(); throw new Error(entry.error);
    }
    const data = await res.json();
    entry.raw = (data.content || []).map(b => b.text || "").join("").trim();
    try {
      entry.extracted = extractOutermostJSON(entry.raw);
    } catch (e) {
      entry.error = `JSON extraction failed: ${e.message}`;
      report(); throw new Error(entry.error + " | Raw: " + entry.raw.slice(0, 300));
    }
    report(); return entry.extracted;
  } catch (e) {
    if (!entry.error) entry.error = e.message;
    report(); throw e;
  }
}

async function fetchClaudePalette() { return []; }


async function fetchClaudeCategory() { return []; }


// ── LOCAL PLANT LOOKUP — primary data source (~220 species) ──────────────────
const LJLA_FAVORITES = [

  // ── DECIDUOUS TREES (33) ──
  { common:"American Hornbeam", botanical:"Carpinus caroliniana", cat:"Deciduous Trees", size:"20–35 ft H × 20–30 ft W", bloom:"Mar–Apr", color:"Muscle-like gray bark; orange-yellow fall", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade", "Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Apple Serviceberry", botanical:"Amelanchier × grandiflora 'Autumn Brilliance'", cat:"Deciduous Trees", size:"15–25 ft H × 15–20 ft W", bloom:"Apr–May", color:"White flowers; orange-red fall color", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Aurora Dogwood", botanical:"Cornus × 'Rutban'", cat:"Deciduous Trees", size:"15–20 ft H × 15–20 ft W", bloom:"May", color:"Large white bracts; red fruit; red fall", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Autumn Brilliance Serviceberry", botanical:"Amelanchier laevis 'Autumn Brilliance'", cat:"Deciduous Trees", size:"15–25 ft H × 15–20 ft W", bloom:"Apr–May", color:"White flowers; red-purple fruit; orange-red fall", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Black Gum", botanical:"Nyssa sylvatica", cat:"Deciduous Trees", size:"30–50 ft H × 20–30 ft W", bloom:"—", color:"Brilliant scarlet fall color; glossy summer foliage", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Bowhall Red Maple", botanical:"Acer rubrum 'Bowhall'", cat:"Deciduous Trees", size:"45–55 ft H × 12–15 ft W", bloom:"—", color:"Narrow columnar form; orange-red fall color", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Dawn Redwood", botanical:"Metasequoia glyptostroboides", cat:"Deciduous Trees", size:"70–100 ft H × 25–35 ft W", bloom:"—", color:"Feathery bright green foliage; rich cinnamon-orange fall", zoneMin:4, zoneMax:8, sun:["Full Sun"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Dr. Merrill Magnolia", botanical:"Magnolia × loebneri 'Dr. Merrill'", cat:"Deciduous Trees", size:"20–30 ft H × 20–25 ft W", bloom:"Mar–Apr", color:"Large pure white star-like flowers; very floriferous", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Eastern Hophornbeam", botanical:"Ostrya virginiana", cat:"Deciduous Trees", size:"25–40 ft H × 20–30 ft W", bloom:"Apr–May", color:"Hop-like fruit clusters; yellow fall color", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Eastern Redbud", botanical:"Cercis canadensis", cat:"Deciduous Trees", size:"20–30 ft H × 25–35 ft W", bloom:"Mar–Apr", color:"Magenta-pink flowers on bare branches before leaves; heart-shaped foliage; yellow fall", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Firestarter® Black Gum", botanical:"Nyssa sylvatica 'Firestarter®'", cat:"Deciduous Trees", size:"20–30 ft H × 15–20 ft W", bloom:"—", color:"Intense scarlet-orange fall color; more compact than species", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Flowering Dogwood", botanical:"Cornus florida", cat:"Deciduous Trees", size:"15–30 ft H × 15–30 ft W", bloom:"Apr–May", color:"White bracts; red berries; scarlet fall color", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Frans Fontaine Hornbeam", botanical:"Carpinus betulus 'Frans Fontaine'", cat:"Deciduous Trees", size:"30–40 ft H × 10–15 ft W", bloom:"—", color:"Narrow columnar; dark green serrated foliage; yellow fall", zoneMin:4, zoneMax:7, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Green Gable Black Gum", botanical:"Nyssa sylvatica 'Green Gable'", cat:"Deciduous Trees", size:"25–35 ft H × 15–20 ft W", bloom:"—", color:"Intense red-orange fall color; upright oval form", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Japanese Maple", botanical:"Acer palmatum", cat:"Deciduous Trees", size:"15–25 ft H × 15–25 ft W", bloom:"—", color:"Red/purple/green foliage; brilliant fall color", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Japanese Stewartia", botanical:"Stewartia pseudocamellia", cat:"Deciduous Trees", size:"20–40 ft H × 15–25 ft W", bloom:"Jun–Jul", color:"White camellia-like flowers; exfoliating mosaic bark; red-orange fall", zoneMin:5, zoneMax:7, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Judy Zuk Magnolia", botanical:"Magnolia 'Judy Zuk'", cat:"Deciduous Trees", size:"15–20 ft H × 15–20 ft W", bloom:"Apr–May", color:"White star flowers with slight pink blush; later-blooming", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Katsura", botanical:"Cercidiphyllum japonicum", cat:"Deciduous Trees", size:"40–60 ft H × 25–40 ft W", bloom:"—", color:"Heart-shaped leaves; spicy-sweet fall scent", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Kindred Spirit Oak", botanical:"Quercus robur 'Kindred Spirit'", cat:"Deciduous Trees", size:"40–45 ft H × 5–8 ft W", bloom:"—", color:"Very narrow columnar; dark green lobed leaves; brown fall", zoneMin:4, zoneMax:8, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Kousa Dogwood", botanical:"Cornus kousa", cat:"Deciduous Trees", size:"15–30 ft H × 15–30 ft W", bloom:"Jun", color:"White bracts; red raspberry-like fruit; red fall", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Lustre Serviceberry", botanical:"Amelanchier laevis 'Lustre'", cat:"Deciduous Trees", size:"15–20 ft H × 12–15 ft W", bloom:"Apr–May", color:"White flowers; glossy foliage; red fall color", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Moonglow Sweetbay Magnolia", botanical:"Magnolia virginiana 'Moonglow'", cat:"Deciduous Trees", size:"20–30 ft H × 10–15 ft W", bloom:"Jun–Aug", color:"White fragrant flowers; upright columnar form; silvery leaf undersides", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Paperbark Maple", botanical:"Acer griseum", cat:"Deciduous Trees", size:"20–30 ft H × 15–25 ft W", bloom:"—", color:"Cinnamon-orange peeling bark; brilliant scarlet fall color", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Persian Ironwood", botanical:"Parrotia persica", cat:"Deciduous Trees", size:"20–40 ft H × 15–30 ft W", bloom:"Feb–Mar", color:"Exfoliating bark; crimson-orange-yellow fall color; red winter flowers", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Red Maple", botanical:"Acer rubrum", cat:"Deciduous Trees", size:"40–60 ft H × 30–50 ft W", bloom:"—", color:"Red flowers Mar–Apr; blazing orange-red fall", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Stellar Pink Dogwood", botanical:"Cornus × 'Rutgan'", cat:"Deciduous Trees", size:"15–20 ft H × 15–20 ft W", bloom:"May", color:"Pink bracts; red fruit; red fall color", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Sterling Silver Linden", botanical:"Tilia tomentosa 'Sterling'", cat:"Deciduous Trees", size:"35–50 ft H × 20–30 ft W", bloom:"Jul", color:"Fragrant yellow flowers; silver leaf undersides", zoneMin:4, zoneMax:7, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Sugar Maple", botanical:"Acer saccharum", cat:"Deciduous Trees", size:"60–75 ft H × 40–50 ft W", bloom:"—", color:"Brilliant orange-yellow-red fall color", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Sweet Gum", botanical:"Liquidambar styraciflua", cat:"Deciduous Trees", size:"60–75 ft H × 40–50 ft W", bloom:"—", color:"Stellar purple-red-orange fall color", zoneMin:5, zoneMax:9, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Sweetbay Magnolia", botanical:"Magnolia virginiana", cat:"Deciduous Trees", size:"10–35 ft H × 10–25 ft W", bloom:"Jun–Aug", color:"Creamy white fragrant flowers; semi-evergreen in mild zones", zoneMin:5, zoneMax:10, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Three-Flowered Maple", botanical:"Acer triflorum", cat:"Deciduous Trees", size:"20–25 ft H × 15–20 ft W", bloom:"—", color:"Peeling bark; exceptional orange-red fall color", zoneMin:4, zoneMax:7, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"White Oak", botanical:"Quercus alba", cat:"Deciduous Trees", size:"50–80 ft H × 50–80 ft W", bloom:"—", color:"Burgundy-red fall color; acorns for wildlife", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Winter King Hawthorn", botanical:"Crataegus viridis 'Winter King'", cat:"Deciduous Trees", size:"20–25 ft H × 20–25 ft W", bloom:"May", color:"White flowers; persistent red berries into winter", zoneMin:4, zoneMax:7, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },

  // ── EVERGREEN TREES (11) ──
  { common:"Canada Hemlock", botanical:"Tsuga canadensis", cat:"Evergreen Trees", size:"40–70 ft H × 25–35 ft W", bloom:"—", color:"Soft dark green needles; graceful pendulous branches", zoneMin:3, zoneMax:7, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Eastern Red Cedar", botanical:"Juniperus virginiana", cat:"Evergreen Trees", size:"30–65 ft H × 8–20 ft W", bloom:"—", color:"Blue-gray berries; red-brown bark; silver-green foliage", zoneMin:2, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"False Cypress", botanical:"Chamaecyparis obtusa", cat:"Evergreen Trees", size:"40–75 ft H × 10–20 ft W", bloom:"—", color:"Dark green fan-like foliage; reddish-brown bark", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Hetz Wintergreen Arborvitae", botanical:"Thuja occidentalis 'Hetz Wintergreen'", cat:"Evergreen Trees", size:"20–30 ft H × 5–8 ft W", bloom:"—", color:"Dark green foliage; good winter color retention; narrow pyramidal", zoneMin:3, zoneMax:7, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Hillspire Eastern Red Cedar", botanical:"Juniperus virginiana 'Hillspire'", cat:"Evergreen Trees", size:"15–20 ft H × 4–6 ft W", bloom:"—", color:"Dense narrow columnar; dark green; good winter color", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Jack Pine", botanical:"Pinus banksiana", cat:"Evergreen Trees", size:"30–60 ft H × 15–25 ft W", bloom:"—", color:"Twisted needles; rugged open form", zoneMin:2, zoneMax:6, sun:["Full Sun"], moisture:["Dry"], favorite:true },
  { common:"Japanese Cedar", botanical:"Cryptomeria japonica", cat:"Evergreen Trees", size:"50–70 ft H × 20–30 ft W", bloom:"—", color:"Soft blue-green scale-like foliage; reddish-brown peeling bark", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Norway Spruce", botanical:"Picea abies", cat:"Evergreen Trees", size:"40–60 ft H × 20–30 ft W", bloom:"—", color:"Dark green needles; pendulous branchlets; large cones", zoneMin:2, zoneMax:7, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Taylor Eastern Red Cedar", botanical:"Juniperus virginiana 'Taylor'", cat:"Evergreen Trees", size:"20–30 ft H × 3–5 ft W", bloom:"—", color:"Very narrow columnar; gray-green; cold-hardy", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Virescens Arborvitae", botanical:"Thuja plicata 'Virescens'", cat:"Evergreen Trees", size:"20–30 ft H × 8–12 ft W", bloom:"—", color:"Rich dark green glossy foliage; retains color in winter", zoneMin:5, zoneMax:7, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"White Spruce", botanical:"Picea glauca", cat:"Evergreen Trees", size:"40–60 ft H × 10–20 ft W", bloom:"—", color:"Blue-green needles; dense pyramidal form", zoneMin:2, zoneMax:6, sun:["Full Sun"], moisture:["Mesic"], favorite:true },

  // ── DECIDUOUS SHRUBS (59) ──
  { common:"Alleghany Viburnum", botanical:"Viburnum rhytidophylloides 'Alleghany'", cat:"Deciduous Shrubs", size:"8–10 ft H × 8–10 ft W", bloom:"May", color:"Cream flowers; red to black berries; semi-evergreen", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Arctic Fire Red Twig Dogwood", botanical:"Cornus sericea 'Arctic Fire'", cat:"Deciduous Shrubs", size:"3–4 ft H × 3–5 ft W", bloom:"May–Jun", color:"Brilliant red winter stems; white flowers; white berries", zoneMin:2, zoneMax:7, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Arrowwood Viburnum", botanical:"Viburnum dentatum", cat:"Deciduous Shrubs", size:"6–10 ft H × 6–10 ft W", bloom:"May–Jun", color:"White flat-top flowers; blue-black berries; glossy foliage; red-purple fall", zoneMin:2, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Baby Kim Lilac", botanical:"Syringa 'Baby Kim'", cat:"Deciduous Shrubs", size:"2–3 ft H × 2–3 ft W", bloom:"May", color:"Lavender fragrant flowers; very compact", zoneMin:3, zoneMax:7, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Bayberry", botanical:"Myrica pensylvanica", cat:"Deciduous Shrubs", size:"5–12 ft H × 5–12 ft W", bloom:"—", color:"Aromatic foliage; waxy gray-blue berries; semi-evergreen", zoneMin:3, zoneMax:7, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Beach Rose", botanical:"Rosa rugosa", cat:"Deciduous Shrubs", size:"3–6 ft H × 3–6 ft W", bloom:"Jun–Sep", color:"Pink or white fragrant flowers; large orange-red hips", zoneMin:2, zoneMax:7, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Bloomerang Dark Purple Lilac", botanical:"Syringa 'Bloomerang Dark Purple'", cat:"Deciduous Shrubs", size:"4–5 ft H × 4–5 ft W", bloom:"May, Aug–Sep", color:"Deep purple very fragrant flowers; reblooming", zoneMin:3, zoneMax:7, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Blue Mist Fothergilla", botanical:"Fothergilla gardenii 'Blue Mist'", cat:"Deciduous Shrubs", size:"2–3 ft H × 2–3 ft W", bloom:"Apr–May", color:"White fragrant flowers; distinctive blue-gray summer foliage; orange-red fall", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Bobo Hydrangea", botanical:"Hydrangea paniculata 'Bobo'", cat:"Deciduous Shrubs", size:"2–3 ft H × 3–4 ft W", bloom:"Jul–Sep", color:"White panicles aging to pink; compact", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Bodnant Viburnum", botanical:"Viburnum × bodnantense 'Dawn'", cat:"Deciduous Shrubs", size:"8–10 ft H × 5–7 ft W", bloom:"Nov–Mar", color:"Deep rose-pink fragrant flowers on bare branches in winter", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Bottlebrush Buckeye", botanical:"Aesculus parviflora", cat:"Deciduous Shrubs", size:"8–12 ft H × 8–15 ft W", bloom:"Jul–Aug", color:"White bottlebrush flowers; large compound leaves; yellow fall", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Common Witch-Hazel", botanical:"Hamamelis virginiana", cat:"Deciduous Shrubs", size:"10–15 ft H × 10–15 ft W", bloom:"Oct–Nov", color:"Yellow fragrant ribbon-like flowers in late fall/early winter", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Dora Amateis Rhododendron", botanical:"Rhododendron 'Dora Amateis'", cat:"Deciduous Shrubs", size:"3–4 ft H × 4–5 ft W", bloom:"May", color:"White flowers flushed pink; semi-evergreen", zoneMin:5, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Doublefile Viburnum", botanical:"Viburnum plicatum f. tomentosum", cat:"Deciduous Shrubs", size:"8–10 ft H × 9–12 ft W", bloom:"May", color:"White lacecap flowers in horizontal tiers; red then black fruit; red fall", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Dwarf Blue Arctic Willow", botanical:"Salix purpurea 'Nana'", cat:"Deciduous Shrubs", size:"3–5 ft H × 4–6 ft W", bloom:"—", color:"Blue-gray fine-textured foliage; graceful arching habit", zoneMin:3, zoneMax:7, sun:["Full Sun"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Dwarf Witch Alder", botanical:"Fothergilla gardenii", cat:"Deciduous Shrubs", size:"2–3 ft H × 2–3 ft W", bloom:"Apr–May", color:"White fragrant bottlebrush flowers; orange-red-yellow fall", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Endless Summer Hydrangea", botanical:"Hydrangea macrophylla 'Endless Summer'", cat:"Deciduous Shrubs", size:"3–5 ft H × 3–5 ft W", bloom:"Jun–Sep", color:"Blue (acidic soil) or pink (alkaline) mophead flowers; reblooming", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Espaliered Apple", botanical:"Malus pumila (espalier)", cat:"Deciduous Shrubs", size:"6–15 ft H × 6–20 ft W (trained)", bloom:"Apr–May", color:"White-pink flowers; edible fruit; trained form", zoneMin:4, zoneMax:8, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Eternal Fragrance Daphne", botanical:"Daphne transatlantica 'Eternal Fragrance'", cat:"Deciduous Shrubs", size:"2–3 ft H × 2–3 ft W", bloom:"May–Oct", color:"Intensely fragrant white-pink flowers; repeat blooming", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Haas Halo Hydrangea", botanical:"Hydrangea arborescens 'Haas Halo'", cat:"Deciduous Shrubs", size:"3–5 ft H × 4–6 ft W", bloom:"Jun–Sep", color:"Large lacecap white flowers; neater than Annabelle", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Henry's Garnet Sweetspire", botanical:"Itea virginica 'Henry's Garnet'", cat:"Deciduous Shrubs", size:"3–4 ft H × 4–5 ft W", bloom:"Jun–Jul", color:"Fragrant white racemes; brilliant crimson-maroon fall", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Hummingbird Summersweet", botanical:"Clethra alnifolia 'Hummingbird'", cat:"Deciduous Shrubs", size:"2–4 ft H × 2–4 ft W", bloom:"Jul–Aug", color:"Fragrant white spikes; compact; yellow fall", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Kelsey's Dwarf Dogwood", botanical:"Cornus sericea 'Kelseyi'", cat:"Deciduous Shrubs", size:"2 ft H × 3 ft W", bloom:"May–Jun", color:"Bright red winter stems; very compact", zoneMin:2, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Korean Spice Viburnum", botanical:"Viburnum carlesii", cat:"Deciduous Shrubs", size:"4–8 ft H × 4–8 ft W", bloom:"Apr–May", color:"Intensely fragrant white-pink snowball flowers", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Lanarth White Hydrangea", botanical:"Hydrangea macrophylla 'Lanarth White'", cat:"Deciduous Shrubs", size:"4–6 ft H × 4–6 ft W", bloom:"Jun–Aug", color:"Flat white lacecap flowers; clean white; reliable", zoneMin:5, zoneMax:9, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Lemon Drop Azalea", botanical:"Rhododendron 'Lemon Drop'", cat:"Deciduous Shrubs", size:"3–5 ft H × 3–5 ft W", bloom:"May–Jun", color:"Clear yellow fragrant flowers", zoneMin:5, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Limelight Prime Hydrangea", botanical:"Hydrangea paniculata 'Limelight Prime'", cat:"Deciduous Shrubs", size:"4–6 ft H × 4–6 ft W", bloom:"Jun–Sep", color:"Lime-green panicles aging to pink-red; earlier than Limelight", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Little Henry Sweetspire", botanical:"Itea virginica 'Little Henry'", cat:"Deciduous Shrubs", size:"2–3 ft H × 2–3 ft W", bloom:"Jun–Jul", color:"White fragrant racemes; crimson fall color; compact", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Little Lime Hydrangea", botanical:"Hydrangea paniculata 'Little Lime'", cat:"Deciduous Shrubs", size:"3–5 ft H × 3–5 ft W", bloom:"Jul–Sep", color:"Lime-green panicles aging to pink; compact", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Little Quick Fire Hydrangea", botanical:"Hydrangea paniculata 'Little Quick Fire'", cat:"Deciduous Shrubs", size:"3–5 ft H × 4–5 ft W", bloom:"Jun–Sep", color:"White panicles aging to deep pink; earliest panicle hydrangea", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Mapleleaf Viburnum", botanical:"Viburnum acerifolium", cat:"Deciduous Shrubs", size:"4–6 ft H × 3–4 ft W", bloom:"May–Jun", color:"White flowers; pink-black berries; pink-purple fall color", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Mount Airy Fothergilla", botanical:"Fothergilla major 'Mount Airy'", cat:"Deciduous Shrubs", size:"5–6 ft H × 5–6 ft W", bloom:"Apr–May", color:"White fragrant bottlebrush flowers; outstanding fall color", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Newport Doublefile Viburnum", botanical:"Viburnum plicatum f. tomentosum 'Newzam'", cat:"Deciduous Shrubs", size:"5–6 ft H × 7–9 ft W", bloom:"May", color:"White lacecap flowers in horizontal tiers; red to black fruit; red fall", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Oakleaf Hydrangea", botanical:"Hydrangea quercifolia", cat:"Deciduous Shrubs", size:"4–6 ft H × 4–6 ft W", bloom:"Jun–Jul", color:"White conical flowers aging to parchment; oak-like leaves; cinnamon exfoliating bark; maroon fall", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Pee Gee Hydrangea", botanical:"Hydrangea paniculata 'Grandiflora'", cat:"Deciduous Shrubs", size:"8–15 ft H × 6–10 ft W", bloom:"Jul–Sep", color:"Large white panicles aging to pink-brown; persistent", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Pinxterbloom Azalea", botanical:"Rhododendron periclymenoides", cat:"Deciduous Shrubs", size:"4–6 ft H × 4–6 ft W", bloom:"Apr–May", color:"Pale pink-lavender fragrant flowers before leaves", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Prague Viburnum", botanical:"Viburnum × pragense", cat:"Deciduous Shrubs", size:"8–10 ft H × 8–10 ft W", bloom:"May", color:"White flowers; semi-evergreen leathery leaves", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Redvein Enkianthus", botanical:"Enkianthus campanulatus", cat:"Deciduous Shrubs", size:"6–8 ft H × 6–8 ft W", bloom:"May", color:"Pendulous cream-pink bell flowers with red veining; brilliant fall color", zoneMin:4, zoneMax:7, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Renaissance Spirea", botanical:"Spiraea × vanhouttei 'Renaissance'", cat:"Deciduous Shrubs", size:"5–6 ft H × 5–7 ft W", bloom:"May", color:"White bridal wreath-type cascading flowers", zoneMin:3, zoneMax:8, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Rose of Sharon", botanical:"Hibiscus syriacus", cat:"Deciduous Shrubs", size:"8–12 ft H × 6–10 ft W", bloom:"Jul–Sep", color:"Large pink/white/purple hollyhock-like flowers", zoneMin:5, zoneMax:9, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Ruby Spice Summersweet", botanical:"Clethra alnifolia 'Ruby Spice'", cat:"Deciduous Shrubs", size:"4–6 ft H × 3–5 ft W", bloom:"Jul–Aug", color:"Deep rose-pink fragrant spikes; yellow fall color", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Shirobana Spiraea", botanical:"Spiraea japonica 'Shirobana'", cat:"Deciduous Shrubs", size:"2–3 ft H × 2–3 ft W", bloom:"Jun–Aug", color:"Simultaneous white and deep pink flowers on same plant", zoneMin:3, zoneMax:8, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Simply Scentsational Sweetshrub", botanical:"Calycanthus floridus 'Simply Scentsational'", cat:"Deciduous Shrubs", size:"4–6 ft H × 4–6 ft W", bloom:"May–Jul", color:"White magnolia-like fragrant flowers", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Sixteen Candles Summersweet", botanical:"Clethra alnifolia 'Sixteen Candles'", cat:"Deciduous Shrubs", size:"3–5 ft H × 4–5 ft W", bloom:"Jul–Aug", color:"Upright white candle-like spikes; yellow fall", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Smooth Witherod", botanical:"Viburnum nudum", cat:"Deciduous Shrubs", size:"6–12 ft H × 6–12 ft W", bloom:"Jun", color:"White flowers; berries ripening from pink to blue-black; glossy red fall", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Snow Queen Oakleaf Hydrangea", botanical:"Hydrangea quercifolia 'Snow Queen'", cat:"Deciduous Shrubs", size:"4–6 ft H × 4–6 ft W", bloom:"Jun–Jul", color:"Large upright white panicles; dark red fall foliage", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Snowbelle Mockorange", botanical:"Philadelphus 'Snowbelle'", cat:"Deciduous Shrubs", size:"4–5 ft H × 4–5 ft W", bloom:"Jun", color:"Double white intensely fragrant flowers", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Snowflake Oakleaf Hydrangea", botanical:"Hydrangea quercifolia 'Snowflake'", cat:"Deciduous Shrubs", size:"5–8 ft H × 5–8 ft W", bloom:"Jun–Jul", color:"Double white flowers aging to parchment; excellent fall", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Spice Baby Viburnum", botanical:"Viburnum carlesii 'Spice Baby'", cat:"Deciduous Shrubs", size:"2–3 ft H × 2–3 ft W", bloom:"Apr–May", color:"Fragrant white-pink flowers; very compact", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Summer Snowflake Viburnum", botanical:"Viburnum plicatum f. tomentosum 'Summer Snowflake'", cat:"Deciduous Shrubs", size:"5–8 ft H × 8–10 ft W", bloom:"May–Aug", color:"White lacecap flowers; reblooms intermittently through summer", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Summersweet", botanical:"Clethra alnifolia", cat:"Deciduous Shrubs", size:"3–8 ft H × 4–6 ft W", bloom:"Jul–Aug", color:"Fragrant white flower spikes; yellow fall color", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Swamp Azalea", botanical:"Rhododendron viscosum", cat:"Deciduous Shrubs", size:"5–8 ft H × 5–8 ft W", bloom:"Jun–Jul", color:"White very fragrant flowers; late blooming", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Sweet Fern", botanical:"Comptonia peregrina", cat:"Deciduous Shrubs", size:"2–4 ft H × 4–8 ft W", bloom:"—", color:"Aromatic fern-like leaves; brown catkin fruit", zoneMin:2, zoneMax:6, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Sweetgale", botanical:"Myrica gale", cat:"Deciduous Shrubs", size:"2–4 ft H × 3–5 ft W", bloom:"Apr", color:"Aromatic foliage; catkins; yellow-brown", zoneMin:1, zoneMax:6, sun:["Full Sun"], moisture:["Wet"], favorite:true },
  { common:"The Velvet Fog Smokebush", botanical:"Cotinus coggygria 'The Velvet Fog'", cat:"Deciduous Shrubs", size:"8–12 ft H × 8–12 ft W", bloom:"Jun–Jul", color:"Burgundy-purple foliage; smoky pink-purple plumed flowers", zoneMin:5, zoneMax:8, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Tiny Tuff Stuff Mountain Hydrangea", botanical:"Hydrangea serrata 'Tiny Tuff Stuff'", cat:"Deciduous Shrubs", size:"1.5–2 ft H × 2–3 ft W", bloom:"Jun–Aug", color:"Lacecap pink-lavender flowers; reblooming", zoneMin:5, zoneMax:9, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Weston's Innocence Azalea", botanical:"Rhododendron 'Weston's Innocence'", cat:"Deciduous Shrubs", size:"4–6 ft H × 4–6 ft W", bloom:"May", color:"Pure white fragrant flowers", zoneMin:5, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Winterberry", botanical:"Ilex verticillata", cat:"Deciduous Shrubs", size:"6–10 ft H × 6–10 ft W", bloom:"—", color:"Brilliant red berries persisting through winter (with pollenizer)", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Winterthur Viburnum", botanical:"Viburnum nudum 'Winterthur'", cat:"Deciduous Shrubs", size:"5–6 ft H × 5–6 ft W", bloom:"Jun", color:"White flowers; multi-colored pink to blue-black berries; red fall", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },

  // ── EVERGREEN SHRUBS (22) ──
  { common:"Blue Princess Holly", botanical:"Ilex × meserveae 'Blue Princess'", cat:"Evergreen Shrubs", size:"8–10 ft H × 6–8 ft W", bloom:"—", color:"Glossy blue-green foliage; bright red berries (with pollenizer)", zoneMin:4, zoneMax:7, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Compact Inkberry", botanical:"Ilex glabra 'Compacta'", cat:"Evergreen Shrubs", size:"4–5 ft H × 4–5 ft W", bloom:"—", color:"Glossy black berries; clean dark green foliage", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Cunningham's White Rhododendron", botanical:"Rhododendron × 'Cunningham's White'", cat:"Evergreen Shrubs", size:"4–6 ft H × 4–6 ft W", bloom:"May", color:"White flowers with yellow-green blotch", zoneMin:4, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"English Boxwood", botanical:"Buxus sempervirens", cat:"Evergreen Shrubs", size:"2–20 ft H (var.) × 2–20 ft W", bloom:"—", color:"Dense evergreen; classic formal hedge", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"English Yew", botanical:"Taxus baccata", cat:"Evergreen Shrubs", size:"20–60 ft H × 20–60 ft W (unpruned)", bloom:"—", color:"Dark dense foliage; red aril berries (toxic); responds well to shearing", zoneMin:6, zoneMax:7, sun:["Full Sun", "Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Ever Low Yew", botanical:"Taxus × media 'Ever Low'", cat:"Evergreen Shrubs", size:"2–4 ft H × 4–8 ft W", bloom:"—", color:"Very low spreading dark evergreen", zoneMin:4, zoneMax:7, sun:["Full Sun", "Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Green Gem Boxwood", botanical:"Buxus 'Green Gem'", cat:"Evergreen Shrubs", size:"2–3 ft H × 2–3 ft W", bloom:"—", color:"Dense dark green globe; holds color in winter", zoneMin:5, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Green Mountain Boxwood", botanical:"Buxus 'Green Mountain'", cat:"Evergreen Shrubs", size:"3–5 ft H × 2–3 ft W", bloom:"—", color:"Dense upright dark green form; good winter color", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Grey Owl Juniper", botanical:"Juniperus virginiana 'Grey Owl'", cat:"Evergreen Shrubs", size:"3–4 ft H × 4–6 ft W", bloom:"—", color:"Soft silver-gray foliage; spreading low form", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"H.M. Eddie Yew", botanical:"Taxus × media 'H.M. Eddie'", cat:"Evergreen Shrubs", size:"4–6 ft H × 6–8 ft W", bloom:"—", color:"Dense dark green; spreading form", zoneMin:4, zoneMax:7, sun:["Full Sun", "Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Hatfield Yew", botanical:"Taxus × media 'Hatfieldii'", cat:"Evergreen Shrubs", size:"10–12 ft H × 10–12 ft W", bloom:"—", color:"Dense dark green upright-spreading form", zoneMin:4, zoneMax:7, sun:["Full Sun", "Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Hicks Yew", botanical:"Taxus × media 'Hicksii'", cat:"Evergreen Shrubs", size:"12–20 ft H × 3–4 ft W", bloom:"—", color:"Narrow columnar dark green; red berries", zoneMin:4, zoneMax:7, sun:["Full Sun", "Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Janet Blair Rhododendron", botanical:"Rhododendron 'Janet Blair'", cat:"Evergreen Shrubs", size:"6–8 ft H × 6–8 ft W", bloom:"May–Jun", color:"Large light pink-lavender flowers", zoneMin:5, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Japanese Andromeda", botanical:"Pieris japonica", cat:"Evergreen Shrubs", size:"6–8 ft H × 6–8 ft W", bloom:"Mar–Apr", color:"Drooping white flower chains; new growth bronzy-red", zoneMin:5, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Japanese Plum Yew", botanical:"Cephalotaxus harringtonia prostrata", cat:"Evergreen Shrubs", size:"2–3 ft H × 4–6 ft W", bloom:"—", color:"Low spreading; dark yew-like needles; excellent shade tolerance", zoneMin:5, zoneMax:9, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Longstalk Holly", botanical:"Ilex pedunculosa", cat:"Evergreen Shrubs", size:"8–15 ft H × 6–10 ft W", bloom:"—", color:"Small red berries on long stalks; smooth non-spiny leaves", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Mountain Laurel", botanical:"Kalmia latifolia", cat:"Evergreen Shrubs", size:"5–15 ft H × 5–15 ft W", bloom:"May–Jun", color:"Pink-white intricate flowers; glossy dark leaves", zoneMin:4, zoneMax:9, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"NewGen Freedom Boxwood", botanical:"Buxus 'NewGen Freedom'", cat:"Evergreen Shrubs", size:"3–4 ft H × 3–4 ft W", bloom:"—", color:"Dense dark green; excellent disease resistance", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Rosebay Rhododendron", botanical:"Rhododendron maximum", cat:"Evergreen Shrubs", size:"5–15 ft H × 5–15 ft W", bloom:"Jun–Jul", color:"White-pale pink flowers; large bold leaves", zoneMin:3, zoneMax:7, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Sea Green Juniper", botanical:"Juniperus chinensis 'Sea Green'", cat:"Evergreen Shrubs", size:"4–6 ft H × 6–8 ft W", bloom:"—", color:"Arching dark green feathery foliage; mint-green new growth", zoneMin:4, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Shore Juniper", botanical:"Juniperus conferta", cat:"Evergreen Shrubs", size:"1–2 ft H × 6–8 ft W", bloom:"—", color:"Silver-blue prickly foliage; low spreading", zoneMin:5, zoneMax:9, sun:["Full Sun"], moisture:["Dry"], favorite:true },
  { common:"Tide Hill Boxwood", botanical:"Buxus microphylla 'Tide Hill'", cat:"Evergreen Shrubs", size:"1–2 ft H × 3–4 ft W", bloom:"—", color:"Low spreading; dark green; excellent winter color retention", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },

  // ── PERENNIALS (76) ──
  { common:"Album Cranesbill", botanical:"Geranium sanguineum 'Album'", cat:"Perennials", size:"8–12 in H × 18–24 in W", bloom:"Jun–Sep", color:"White flowers; finely cut foliage; good fall color", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Allegheny Spurge", botanical:"Pachysandra procumbens", cat:"Perennials", size:"6–10 in H × spreading", bloom:"Apr", color:"White flowers; semi-evergreen mottled leaves", zoneMin:4, zoneMax:9, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Angelina Stonecrop", botanical:"Sedum rupestre 'Angelina'", cat:"Perennials", size:"2–5 in H × spreading", bloom:"Jul–Aug", color:"Yellow flowers; chartreuse-golden needle foliage; orange fall", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Dry"], favorite:true },
  { common:"Appalachian Sedge", botanical:"Carex appalachica", cat:"Perennials", size:"6–12 in H × 12–18 in W", bloom:"—", color:"Fine-textured arching bright green blades", zoneMin:4, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Autumn Bride Coral Bells", botanical:"Heuchera villosa 'Autumn Bride'", cat:"Perennials", size:"18–24 in H × 18–24 in W", bloom:"Aug–Sep", color:"White flowers in late summer; large velvety maple-like leaves", zoneMin:4, zoneMax:9, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Bevans Geranium", botanical:"Geranium × cantabrigiense 'Biokovo'", cat:"Perennials", size:"8–12 in H × 24–30 in W", bloom:"May–Jun", color:"White-flushed pink flowers; very fragrant foliage; semi-evergreen", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Bigroot Geranium", botanical:"Geranium macrorrhizum 'Bevan's Variety'", cat:"Perennials", size:"12–15 in H × 24–30 in W", bloom:"May–Jun", color:"Magenta-pink flowers; fragrant lobed foliage; semi-evergreen; reddish fall", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Black Cohosh", botanical:"Actaea racemosa", cat:"Perennials", size:"4–6 ft H × 3–4 ft W", bloom:"Jun–Aug", color:"Tall white fragrant wand-like flowers; large bold leaves", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Black Garlic Allium", botanical:"Allium nigrum", cat:"Perennials", size:"12–18 in H × 6–8 in W", bloom:"May–Jun", color:"White flowers with dark center; ornamental seed heads", zoneMin:5, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Blue Emerald Creeping Phlox", botanical:"Phlox subulata 'Blue Emerald'", cat:"Perennials", size:"3–6 in H × 24–30 in W", bloom:"Apr–May", color:"Lavender-blue flowers; evergreen needle foliage", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Blue Ice Blue Star", botanical:"Amsonia 'Blue Ice'", cat:"Perennials", size:"12–18 in H × 12–18 in W", bloom:"May", color:"Steel-blue star flowers; compact; golden fall foliage", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Blue Jean Baby Russian Sage", botanical:"Perovskia atriplicifolia 'Blue Jean Baby'", cat:"Perennials", size:"24–30 in H × 24–30 in W", bloom:"Jul–Sep", color:"Lavender-blue flowers; silver-white stems; aromatic", zoneMin:4, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Blue Moon Woodland Phlox", botanical:"Phlox divaricata 'Blue Moon'", cat:"Perennials", size:"10–15 in H × 18–24 in W", bloom:"Apr–May", color:"Fragrant lavender-blue flowers", zoneMin:4, zoneMax:9, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Bottle Rocket Leopard Plant", botanical:"Ligularia dentata 'Bottle Rocket'", cat:"Perennials", size:"3–4 ft H × 2–3 ft W", bloom:"Jul–Sep", color:"Orange-yellow daisy flowers; large rounded chocolate-green leaves", zoneMin:4, zoneMax:8, sun:["Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Bowman's Root", botanical:"Gillenia trifoliata", cat:"Perennials", size:"3–4 ft H × 2–3 ft W", bloom:"May–Jun", color:"Delicate white star flowers; red fall color", zoneMin:4, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Braunlaub Rodgersia", botanical:"Rodgersia pinnata 'Braunlaub'", cat:"Perennials", size:"3–4 ft H × 3–4 ft W", bloom:"Jun–Jul", color:"Creamy-pink plumes; bronze-tinted pinnate leaves", zoneMin:4, zoneMax:7, sun:["Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Bridal Veil Astilbe", botanical:"Astilbe 'Bridal Veil'", cat:"Perennials", size:"2–3 ft H × 2–3 ft W", bloom:"Jun–Jul", color:"White plumes; ferny foliage", zoneMin:3, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Canada Anemone", botanical:"Anemone canadensis", cat:"Perennials", size:"1–2 ft H × spreading", bloom:"May–Jul", color:"White flowers with golden stamens", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Caradonna Salvia", botanical:"Salvia nemorosa 'Caradonna'", cat:"Perennials", size:"18–24 in H × 18–24 in W", bloom:"May–Jun", color:"Violet flowers on dark black-purple stems", zoneMin:4, zoneMax:8, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Catlin's Giant Carpet Bugle", botanical:"Ajuga reptans 'Catlin's Giant'", cat:"Perennials", size:"6–8 in H × spreading", bloom:"Apr–May", color:"Large bronze-purple leaves; blue flower spikes", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Catmint", botanical:"Nepeta × faassenii 'Walker's Low'", cat:"Perennials", size:"18–24 in H × 24–30 in W", bloom:"May–Sep", color:"Lavender-blue flowers; aromatic gray-green foliage; long bloom", zoneMin:3, zoneMax:8, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Citron Daylily", botanical:"Hemerocallis 'Citrina'", cat:"Perennials", size:"30–40 in H × 24–30 in W", bloom:"Jun–Jul", color:"Pale lemon-yellow fragrant evening-blooming flowers", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Creeping Mazus", botanical:"Mazus reptans", cat:"Perennials", size:"1–2 in H × spreading", bloom:"Apr–Jun", color:"Small purple flowers; creeping mat", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Crystal Blue Salvia", botanical:"Salvia nemorosa 'Crystal Blue'", cat:"Perennials", size:"12–18 in H × 12–18 in W", bloom:"May–Jun", color:"Clear blue-violet flowers; compact", zoneMin:4, zoneMax:8, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Culver's Root", botanical:"Veronicastrum virginicum", cat:"Perennials", size:"4–6 ft H × 2–3 ft W", bloom:"Jul–Aug", color:"Tall white candelabra spikes; whorled leaves", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Domino Barrenwort", botanical:"Epimedium × 'Domino'", cat:"Perennials", size:"8–12 in H × 12–18 in W", bloom:"Apr", color:"White and violet bicolor spurred flowers; semi-evergreen heart leaves", zoneMin:4, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Dwarf Crested Iris", botanical:"Iris cristata", cat:"Perennials", size:"4–6 in H × spreading", bloom:"Apr–May", color:"Lavender-blue flowers with yellow crest", zoneMin:3, zoneMax:9, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Dwarf Goat's Beard", botanical:"Aruncus aethusifolius", cat:"Perennials", size:"8–12 in H × 8–12 in W", bloom:"Jun", color:"Creamy white feathery plumes; finely textured foliage", zoneMin:3, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Dwarf Lady's Mantle", botanical:"Alchemilla erythropoda", cat:"Perennials", size:"6–8 in H × 8–12 in W", bloom:"May–Jun", color:"Chartreuse frothy flowers; blue-green scalloped leaves", zoneMin:3, zoneMax:7, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Foamflower", botanical:"Tiarella cordifolia", cat:"Perennials", size:"6–12 in H × spreading", bloom:"Apr–May", color:"White-pink foamy spikes; mottled maple-like leaves", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Goat's Beard", botanical:"Aruncus dioicus", cat:"Perennials", size:"4–6 ft H × 4–6 ft W", bloom:"Jun", color:"Large creamy white plumes; bold compound leaves", zoneMin:3, zoneMax:7, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Great White Heron Iris", botanical:"Iris ensata 'Great White Heron'", cat:"Perennials", size:"3–4 ft H × 2–3 ft W", bloom:"Jun–Jul", color:"Large pure white flowers", zoneMin:4, zoneMax:9, sun:["Full Sun"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Honorine Jobert Windflower", botanical:"Anemone 'Honorine Jobert'", cat:"Perennials", size:"3–4 ft H × 2–3 ft W", bloom:"Aug–Oct", color:"Single pure white flowers with golden stamens; late-season", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Hummelo Betony", botanical:"Stachys officinalis 'Hummelo'", cat:"Perennials", size:"18–24 in H × 18–24 in W", bloom:"Jun–Aug", color:"Dense rosy-purple spikes; compact neat clumps", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Hyperion Daylily", botanical:"Hemerocallis 'Hyperion'", cat:"Perennials", size:"36–40 in H × 24–30 in W", bloom:"Jul", color:"Large fragrant lemon-yellow flowers", zoneMin:3, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Immortality Iris", botanical:"Iris germanica 'Immortality'", cat:"Perennials", size:"24–28 in H × 18–24 in W", bloom:"May, Aug–Sep", color:"White ruffled flowers; reliably reblooming", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Ivory Prince Hellebore", botanical:"Helleborus 'Ivory Prince'", cat:"Perennials", size:"12–15 in H × 12–18 in W", bloom:"Feb–Apr", color:"Ivory-cream outward-facing flowers; early spring", zoneMin:4, zoneMax:9, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Jack Frost Siberian Bugloss", botanical:"Brunnera macrophylla 'Jack Frost'", cat:"Perennials", size:"12–18 in H × 18–24 in W", bloom:"Apr–May", color:"Blue forget-me-not flowers; large silver-frosted heart leaves", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Kneiffii Goat's Beard", botanical:"Aruncus dioicus 'Kneiffii'", cat:"Perennials", size:"3–4 ft H × 2–3 ft W", bloom:"Jun", color:"White plumes; very finely cut lacy foliage", zoneMin:3, zoneMax:7, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Krossa Regal Hosta", botanical:"Hosta 'Krossa Regal'", cat:"Perennials", size:"3–4 ft H × 4–5 ft W", bloom:"Jul", color:"Large blue-gray vase-shaped leaves; tall lavender flower scapes", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Lamb's Ear", botanical:"Stachys byzantina", cat:"Perennials", size:"12–15 in H × 18–24 in W", bloom:"Jun–Jul", color:"Pink flowers; dense silver-white woolly leaves", zoneMin:4, zoneMax:8, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Lenten Rose", botanical:"Helleborus orientalis", cat:"Perennials", size:"18–24 in H × 18–24 in W", bloom:"Feb–Apr", color:"Nodding flowers in white/pink/purple/slate; semi-evergreen", zoneMin:4, zoneMax:9, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Lily of the Valley", botanical:"Convallaria majalis", cat:"Perennials", size:"6–8 in H × spreading", bloom:"May", color:"Fragrant white bell flowers; broad green leaves", zoneMin:2, zoneMax:7, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Magnus Purple Coneflower", botanical:"Echinacea purpurea 'Magnus'", cat:"Perennials", size:"2–3 ft H × 1.5–2 ft W", bloom:"Jun–Aug", color:"Large rosy-purple flat-petaled flowers; orange cone", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"May Night Sage", botanical:"Salvia × sylvestris 'May Night'", cat:"Perennials", size:"18–24 in H × 18–24 in W", bloom:"May–Jun", color:"Deep indigo-blue flowers; gray-green foliage", zoneMin:4, zoneMax:8, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Mother of the Bride Hellebore", botanical:"Helleborus 'Mother of the Bride'", cat:"Perennials", size:"12–18 in H × 12–18 in W", bloom:"Feb–Apr", color:"Double cream-white flowers with picotee edge", zoneMin:4, zoneMax:9, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Pennsylvania Sedge", botanical:"Carex pensylvanica", cat:"Perennials", size:"6–9 in H × spreading", bloom:"—", color:"Fine-textured dark green mounding blades", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Plum Pudding Coral Bells", botanical:"Heuchera 'Plum Pudding'", cat:"Perennials", size:"12–15 in H × 18–24 in W", bloom:"Jun–Jul", color:"White flowers; shiny deep plum-purple foliage", zoneMin:4, zoneMax:9, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"PowWow White Coneflower", botanical:"Echinacea purpurea 'PowWow White'", cat:"Perennials", size:"18–24 in H × 12–18 in W", bloom:"Jun–Sep", color:"Pure white flat flowers with orange cone; compact", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Praying Hands Hosta", botanical:"Hosta 'Praying Hands'", cat:"Perennials", size:"18 in H × 18 in W", bloom:"Jul–Aug", color:"Narrow upright cupped dark green and white-edged leaves; lavender flowers", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Pumila Astilbe", botanical:"Astilbe chinensis 'Pumila'", cat:"Perennials", size:"12–15 in H × 12–15 in W", bloom:"Aug", color:"Mauve-pink spikes; compact; late blooming", zoneMin:4, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Rozanne Cranesbill", botanical:"Geranium 'Rozanne'", cat:"Perennials", size:"12–18 in H × 18–24 in W", bloom:"Jun–Oct", color:"Violet-blue flowers with white center; extremely long bloom", zoneMin:5, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Snow Star Masterwort", botanical:"Astrantia major 'Snow Star'", cat:"Perennials", size:"18–24 in H × 18–24 in W", bloom:"Jun–Aug", color:"White pincushion-like flowers with papery bracts; long bloom", zoneMin:4, zoneMax:7, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Snowbell", botanical:"Leucojum aestivum 'Gravetye Giant'", cat:"Perennials", size:"12–18 in H × 6–8 in W", bloom:"Apr–May", color:"White nodding bells with green tips", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Snowflake Catmint", botanical:"Nepeta 'Snowflake'", cat:"Perennials", size:"12–18 in H × 18–24 in W", bloom:"May–Sep", color:"White flowers; aromatic foliage; long bloom", zoneMin:4, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Sterling Silver Bugloss", botanical:"Brunnera macrophylla 'Sterling Silver'", cat:"Perennials", size:"12–15 in H × 18–24 in W", bloom:"Apr–May", color:"Blue flowers; heavily silver-mottled leaves", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Storm Cloud Blue Star", botanical:"Amsonia tabernaemontana 'Storm Cloud'", cat:"Perennials", size:"18–24 in H × 18–24 in W", bloom:"May", color:"Steel-blue star flowers; dark stems; brilliant gold fall foliage", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Sweet Woodruff", botanical:"Galium odoratum", cat:"Perennials", size:"6–8 in H × spreading", bloom:"Apr–May", color:"Tiny white starry flowers; whorled bright green leaves", zoneMin:4, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Tall Vervain", botanical:"Verbena bonariensis", cat:"Perennials", size:"3–5 ft H × 1–2 ft W", bloom:"Jul–Oct", color:"Tiny violet-purple flowers on tall airy branching stems", zoneMin:7, zoneMax:11, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Tanna Burnet", botanical:"Sanguisorba officinalis 'Tanna'", cat:"Perennials", size:"12–18 in H × 12–18 in W", bloom:"Jun–Sep", color:"Dark wine-red bottlebrush flowers; compact", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Total Recall Iris", botanical:"Iris germanica 'Total Recall'", cat:"Perennials", size:"30–36 in H × 18–24 in W", bloom:"May, Aug–Sep", color:"Deep violet-blue reblooming bearded iris", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Trevi Fountain Lungwort", botanical:"Pulmonaria 'Trevi Fountain'", cat:"Perennials", size:"12–15 in H × 18–24 in W", bloom:"Mar–Apr", color:"Cobalt-blue flowers; silver-spotted leaves", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Twinkle Toes Lungwort", botanical:"Pulmonaria 'Twinkle Toes'", cat:"Perennials", size:"10–12 in H × 18–24 in W", bloom:"Mar–Apr", color:"White flowers with pink-edged petals; silver-spotted leaves", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Variegated Solomon's Seal", botanical:"Polygonatum falcatum 'Variegatum'", cat:"Perennials", size:"18–24 in H × 18–24 in W", bloom:"May", color:"White-edged arching leaves; small white bells", zoneMin:4, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Variegated Solomon's Seal", botanical:"Polygonatum odoratum 'Variegatum'", cat:"Perennials", size:"18–24 in H × 18–24 in W", bloom:"May", color:"White-tipped striped leaves; small white bell flowers", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Vision in White Astilbe", botanical:"Astilbe chinensis 'Vision in White'", cat:"Perennials", size:"15–18 in H × 15–18 in W", bloom:"Jul–Aug", color:"White plumes; compact; later blooming", zoneMin:4, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Visions in Pink Astilbe", botanical:"Astilbe chinensis 'Visions in Pink'", cat:"Perennials", size:"15–18 in H × 15–18 in W", bloom:"Jul–Aug", color:"Pink-lavender plumes; compact; late blooming", zoneMin:4, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Waterperry Blue Speedwell", botanical:"Veronica peduncularis 'Waterperry Blue'", cat:"Perennials", size:"4–6 in H × 12–18 in W", bloom:"Apr–Jun", color:"Pale sky-blue flowers; semi-evergreen mat foliage", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"White Cloud Calamint", botanical:"Calamintha nepeta 'White Cloud'", cat:"Perennials", size:"12–18 in H × 18–24 in W", bloom:"Jul–Oct", color:"Tiny white flowers in clouds; long bloom; aromatic", zoneMin:5, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"White Emperor Tulip", botanical:"Tulipa fosteriana 'White Emperor'", cat:"Perennials", size:"12–18 in H × 4–6 in W", bloom:"Apr", color:"Large pure white flowers with yellow base", zoneMin:3, zoneMax:8, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"White Nancy Dead Nettle", botanical:"Lamium maculatum 'White Nancy'", cat:"Perennials", size:"4–6 in H × spreading", bloom:"Apr–Jun", color:"White flowers; silvery foliage with green edges", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"White Tinge Sedge", botanical:"Carex albicans", cat:"Perennials", size:"6–12 in H × 12–18 in W", bloom:"—", color:"Thin arching medium-green blades with white tips", zoneMin:5, zoneMax:9, sun:["Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"White Wands Speedwell", botanical:"Veronica 'Magic Show White Wands'", cat:"Perennials", size:"10–14 in H × 12–15 in W", bloom:"Jun–Sep", color:"White spikes; compact; long bloom", zoneMin:4, zoneMax:8, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Wild Ginger", botanical:"Asarum canadense", cat:"Perennials", size:"6 in H × spreading", bloom:"Apr", color:"Dark matte green heart-shaped leaves; inconspicuous maroon flowers", zoneMin:3, zoneMax:7, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Yellow Waxbells", botanical:"Kirengeshoma palmata", cat:"Perennials", size:"3–4 ft H × 3–4 ft W", bloom:"Aug–Oct", color:"Waxy pale yellow tubular nodding flowers; maple-like leaves", zoneMin:5, zoneMax:8, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Yellowroot", botanical:"Xanthorhiza simplicissima", cat:"Perennials", size:"2–3 ft H × spreading", bloom:"Mar–Apr", color:"Yellow-tinged leaves; small star flowers; yellow roots", zoneMin:3, zoneMax:9, sun:["Part Shade", "Shade"], moisture:["Wet", "Mesic"], favorite:true },

  // ── GRASSES (6) ──
  { common:"Big Bluestem", botanical:"Andropogon gerardii", cat:"Grasses", size:"4–8 ft H × 2–3 ft W", bloom:"Aug–Sep", color:"Blue-green foliage; turkey-foot seed heads; rich burgundy-orange fall", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Hakone Grass", botanical:"Hakonechloa macra", cat:"Grasses", size:"12–18 in H × 12–18 in W", bloom:"—", color:"Cascading bright green blades; golden fall color", zoneMin:5, zoneMax:9, sun:["Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Hameln Fountain Grass", botanical:"Pennisetum alopecuroides 'Hameln'", cat:"Grasses", size:"2–3 ft H × 2–3 ft W", bloom:"Aug–Sep", color:"Creamy-white bottlebrush plumes; golden fall color", zoneMin:5, zoneMax:9, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Karl Foerster Feather Reed Grass", botanical:"Calamagrostis × acutiflora 'Karl Foerster'", cat:"Grasses", size:"4–5 ft H × 2–3 ft W", bloom:"Jun–Jul", color:"Feathery pinkish plumes aging to wheat; strongly upright", zoneMin:4, zoneMax:9, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Prairie Dropseed", botanical:"Sporobolus heterolepis", cat:"Grasses", size:"2–3 ft H × 2–3 ft W", bloom:"Aug–Sep", color:"Arching mounds; fragrant seed heads; orange fall color", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Switchgrass", botanical:"Panicum virgatum", cat:"Grasses", size:"3–6 ft H × 2–4 ft W", bloom:"Aug–Sep", color:"Fine airy red-pink seed heads; blue-green or red foliage", zoneMin:4, zoneMax:9, sun:["Full Sun"], moisture:["Wet", "Mesic", "Dry"], favorite:true },

  // ── GROUNDCOVERS (6) ──
  { common:"Common Periwinkle", botanical:"Vinca minor", cat:"Groundcovers", size:"3–6 in H × spreading", bloom:"Apr–May", color:"Blue-purple or white small flowers; glossy evergreen leaves", zoneMin:4, zoneMax:9, sun:["Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Creeping Liriope", botanical:"Liriope spicata", cat:"Groundcovers", size:"8–12 in H × spreading", bloom:"Aug–Sep", color:"Purple spikes; strappy dark green blades; black berries", zoneMin:4, zoneMax:10, sun:["Full Sun", "Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"English Ivy", botanical:"Hedera helix var. baltica", cat:"Groundcovers", size:"6–8 in H × spreading", bloom:"—", color:"Glossy dark green lobed leaves; evergreen", zoneMin:4, zoneMax:9, sun:["Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Gro-Low Sumac", botanical:"Rhus aromatica 'Gro-Low'", cat:"Groundcovers", size:"1.5–2 ft H × 6–8 ft W", bloom:"Apr", color:"Aromatic tri-lobed leaves; red berries; brilliant orange-red fall", zoneMin:3, zoneMax:9, sun:["Full Sun"], moisture:["Dry"], favorite:true },
  { common:"Japanese Pachysandra", botanical:"Pachysandra terminalis", cat:"Groundcovers", size:"6–8 in H × spreading", bloom:"Apr–May", color:"White flowers; glossy dark green whorled leaves; evergreen", zoneMin:4, zoneMax:9, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Purple Wintercreeper", botanical:"Euonymus fortunei 'Coloratus'", cat:"Groundcovers", size:"6–12 in H × 4–6 ft W", bloom:"—", color:"Green leaves turning purple-red in fall; semi-evergreen", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic", "Dry"], favorite:true },

  // ── FERNS (10) ──
  { common:"Champion's Wood Fern", botanical:"Dryopteris championii", cat:"Ferns", size:"2–3 ft H × 2–3 ft W", bloom:"—", color:"Semi-evergreen; dark glossy leathery fronds", zoneMin:5, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Ghost Fern", botanical:"Athyrium 'Ghost'", cat:"Ferns", size:"24–30 in H × 24–30 in W", bloom:"—", color:"Silver-gray upright fronds with dark midribs; striking", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Hayscented Fern", botanical:"Dennstaedtia punctilobula", cat:"Ferns", size:"1.5–2 ft H × spreading", bloom:"—", color:"Fragrant yellow-green lacy fronds; colony-forming", zoneMin:3, zoneMax:8, sun:["Full Sun", "Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Intermedia Wood Fern", botanical:"Dryopteris intermedia", cat:"Ferns", size:"18–24 in H × 18–24 in W", bloom:"—", color:"Semi-evergreen lacy deep green fronds", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Japanese Tassel Fern", botanical:"Polystichum polyblepharum", cat:"Ferns", size:"18–24 in H × 18–24 in W", bloom:"—", color:"Glossy dark green shuttlecock fronds; evergreen", zoneMin:5, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Lady Fern", botanical:"Athyrium filix-femina", cat:"Ferns", size:"2–3 ft H × 2–3 ft W", bloom:"—", color:"Delicate light green lacy fronds; deciduous", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Lady in Red Lady Fern", botanical:"Athyrium filix-femina 'Lady in Red'", cat:"Ferns", size:"2–3 ft H × 2–3 ft W", bloom:"—", color:"Red-stemmed lacy fronds; vivid color contrast", zoneMin:3, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Male Fern", botanical:"Dryopteris filix-mas", cat:"Ferns", size:"2–4 ft H × 2–3 ft W", bloom:"—", color:"Bold upright semi-evergreen shuttlecock fronds", zoneMin:4, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Ostrich Fern", botanical:"Matteuccia struthiopteris", cat:"Ferns", size:"3–5 ft H × 3–6 ft W", bloom:"—", color:"Elegant vase-shaped bright green fronds; colony-forming", zoneMin:2, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Wet", "Mesic"], favorite:true },
  { common:"Sensitive Fern", botanical:"Onoclea sensibilis", cat:"Ferns", size:"18–24 in H × spreading", bloom:"—", color:"Broad coarse-textured fronds; colony-forming in wet soils", zoneMin:2, zoneMax:10, sun:["Part Shade", "Shade"], moisture:["Wet", "Mesic"], favorite:true },

  // ── VINES (8) ──
  { common:"Arabella Clematis", botanical:"Clematis integrifolia 'Arabella'", cat:"Vines", size:"4–6 ft H × 3–5 ft W", bloom:"Jun–Sep", color:"Mauve-blue flowers; non-twining; long bloom", zoneMin:4, zoneMax:9, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Boston Ivy", botanical:"Parthenocissus tricuspidata", cat:"Vines", size:"30–50 ft H × unlimited", bloom:"—", color:"Glossy three-lobed leaves; brilliant scarlet fall; self-clinging", zoneMin:4, zoneMax:8, sun:["Full Sun", "Part Shade", "Shade"], moisture:["Mesic", "Dry"], favorite:true },
  { common:"Climbing Cloud Rose", botanical:"Rosa 'Climbing Cloud'", cat:"Vines", size:"8–15 ft H × 6–8 ft W", bloom:"Jun, Sep", color:"White fragrant flowers; once-blooming with some repeat", zoneMin:5, zoneMax:9, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Climbing Hydrangea", botanical:"Hydrangea anomala subsp. petiolaris", cat:"Vines", size:"30–50 ft H × unlimited", bloom:"Jun", color:"White lacecap flowers; exfoliating bark; golden fall", zoneMin:4, zoneMax:8, sun:["Part Shade", "Shade"], moisture:["Mesic"], favorite:true },
  { common:"Durandii Clematis", botanical:"Clematis integrifolia 'Durandii'", cat:"Vines", size:"4–6 ft H × 3–5 ft W", bloom:"Jun–Sep", color:"Large deep indigo-violet flowers; non-twining", zoneMin:4, zoneMax:9, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Fascination Clematis", botanical:"Clematis integrifolia 'Fascination'", cat:"Vines", size:"4–6 ft H × 3–5 ft W", bloom:"Jun–Sep", color:"Blue-violet bell flowers; non-twining", zoneMin:4, zoneMax:9, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
  { common:"Huldine Clematis", botanical:"Clematis viticella 'Huldine'", cat:"Vines", size:"10–15 ft H × 4–6 ft W", bloom:"Jul–Sep", color:"Translucent white flowers with purple bar reverse; viticella type", zoneMin:4, zoneMax:9, sun:["Full Sun", "Part Shade"], moisture:["Mesic"], favorite:true },
  { common:"Lady Banks' Rose", botanical:"Rosa banksiae", cat:"Vines", size:"12–20 ft H × 10–15 ft W", bloom:"Apr–May", color:"Clusters of small white or yellow fragrant flowers; thornless", zoneMin:7, zoneMax:9, sun:["Full Sun"], moisture:["Mesic"], favorite:true },
];

const LOCAL_PLANT_LOOKUP = [

  // ── DECIDUOUS TREES (30) — zones 6–7 ──────────────────────────────────────
  { common:"White Oak",               botanical:"Quercus alba",                    cat:"Deciduous Trees",  size:"60-100 ft H × 50-80 ft W",  bloom:"Apr-May", color:"Orange-red (fall)",           zoneMin:3, zoneMax:9 },
  { common:"Red Oak",                 botanical:"Quercus rubra",                   cat:"Deciduous Trees",  size:"60-75 ft H × 45-60 ft W",   bloom:"Apr-May", color:"Bright red (fall)",           zoneMin:3, zoneMax:8 },
  { common:"Pin Oak",                 botanical:"Quercus palustris",               cat:"Deciduous Trees",  size:"60-70 ft H × 25-40 ft W",   bloom:"Apr-May", color:"Scarlet (fall)",              zoneMin:4, zoneMax:8 },
  { common:"Scarlet Oak",             botanical:"Quercus coccinea",                cat:"Deciduous Trees",  size:"70-75 ft H × 40-50 ft W",   bloom:"Apr-May", color:"Scarlet (fall)",              zoneMin:4, zoneMax:9 },
  { common:"Swamp White Oak",         botanical:"Quercus bicolor",                 cat:"Deciduous Trees",  size:"50-60 ft H × 50-60 ft W",   bloom:"Apr-May", color:"Yellow-bronze (fall)",        zoneMin:3, zoneMax:8 },
  { common:"Willow Oak",              botanical:"Quercus phellos",                 cat:"Deciduous Trees",  size:"40-60 ft H × 30-40 ft W",   bloom:"Apr",     color:"Yellow-red (fall)",           zoneMin:5, zoneMax:9 },
  { common:"Chestnut Oak",            botanical:"Quercus montana",                 cat:"Deciduous Trees",  size:"60-70 ft H × 60-70 ft W",   bloom:"Apr-May", color:"Orange-brown (fall)",         zoneMin:4, zoneMax:8 },
  { common:"Shagbark Hickory",        botanical:"Carya ovata",                     cat:"Deciduous Trees",  size:"60-80 ft H × 25-35 ft W",   bloom:"Apr-May", color:"Yellow (fall)",               zoneMin:4, zoneMax:8 },
  { common:"Bitternut Hickory",       botanical:"Carya cordiformis",               cat:"Deciduous Trees",  size:"50-75 ft H × 40-50 ft W",   bloom:"Apr-May", color:"Yellow (fall)",               zoneMin:4, zoneMax:9 },
  { common:"American Beech",          botanical:"Fagus grandifolia",               cat:"Deciduous Trees",  size:"50-70 ft H × 40-60 ft W",   bloom:"Apr-May", color:"Golden-bronze (fall)",        zoneMin:3, zoneMax:9 },
  { common:"American Hornbeam",       botanical:"Carpinus caroliniana",            cat:"Deciduous Trees",  size:"20-35 ft H × 20-30 ft W",   bloom:"Apr-May", color:"Orange-red (fall)",           zoneMin:3, zoneMax:9 },
  { common:"Ironwood",                botanical:"Ostrya virginiana",               cat:"Deciduous Trees",  size:"25-40 ft H × 15-30 ft W",   bloom:"Mar-May", color:"Yellow (fall)",               zoneMin:3, zoneMax:9 },
  { common:"River Birch",             botanical:"Betula nigra",                    cat:"Deciduous Trees",  size:"40-70 ft H × 40-60 ft W",   bloom:"Mar-Apr", color:"Exfoliating bark, Yellow (fall)", zoneMin:4, zoneMax:9 },
  { common:"Paper Birch",             botanical:"Betula papyrifera",               cat:"Deciduous Trees",  size:"50-70 ft H × 25-45 ft W",   bloom:"Apr-May", color:"White bark, Yellow (fall)",   zoneMin:2, zoneMax:7 },
  { common:"Tulip Tree",              botanical:"Liriodendron tulipifera",         cat:"Deciduous Trees",  size:"70-90 ft H × 35-50 ft W",   bloom:"May-Jun", color:"Yellow-green tulip flowers",  zoneMin:4, zoneMax:9 },
  { common:"Sweetgum",                botanical:"Liquidambar styraciflua",         cat:"Deciduous Trees",  size:"60-75 ft H × 40-50 ft W",   bloom:"Mar-May", color:"Red-purple-orange (fall)",    zoneMin:5, zoneMax:9 },
  { common:"Sycamore",                botanical:"Platanus occidentalis",           cat:"Deciduous Trees",  size:"75-100 ft H × 75-100 ft W", bloom:"Apr-Jun", color:"White mottled bark",          zoneMin:4, zoneMax:9 },
  { common:"Red Maple",               botanical:"Acer rubrum",                     cat:"Deciduous Trees",  size:"40-60 ft H × 30-50 ft W",   bloom:"Mar-Apr", color:"Red flowers + fall color",    zoneMin:3, zoneMax:9 },
  { common:"Sugar Maple",             botanical:"Acer saccharum",                  cat:"Deciduous Trees",  size:"60-75 ft H × 40-50 ft W",   bloom:"Apr-May", color:"Orange-red (fall)",           zoneMin:3, zoneMax:8 },
  { common:"Black Gum",               botanical:"Nyssa sylvatica",                 cat:"Deciduous Trees",  size:"30-50 ft H × 20-30 ft W",   bloom:"—",       color:"Scarlet (fall)",              zoneMin:4, zoneMax:9 },
  { common:"Shadblow Serviceberry",   botanical:"Amelanchier canadensis",          cat:"Deciduous Trees",  size:"15-25 ft H × 10-15 ft W",   bloom:"Mar-Apr", color:"White, red berries",          zoneMin:3, zoneMax:7 },
  { common:"Allegheny Serviceberry",  botanical:"Amelanchier laevis",              cat:"Deciduous Trees",  size:"15-25 ft H × 10-15 ft W",   bloom:"Apr-May", color:"White, purple-black berries", zoneMin:4, zoneMax:8 },
  { common:"Flowering Dogwood",       botanical:"Cornus florida",                  cat:"Deciduous Trees",  size:"15-30 ft H × 15-30 ft W",   bloom:"Apr-May", color:"White or Pink",               zoneMin:5, zoneMax:9 },
  { common:"Kousa Dogwood",           botanical:"Cornus kousa",                    cat:"Deciduous Trees",  size:"15-30 ft H × 15-30 ft W",   bloom:"May-Jun", color:"White bracts",                zoneMin:5, zoneMax:8 },
  { common:"Eastern Redbud",          botanical:"Cercis canadensis",               cat:"Deciduous Trees",  size:"20-30 ft H × 25-35 ft W",   bloom:"Mar-Apr", color:"Magenta-Pink",                zoneMin:4, zoneMax:9 },
  { common:"Sassafras",               botanical:"Sassafras albidum",               cat:"Deciduous Trees",  size:"30-60 ft H × 25-40 ft W",   bloom:"Apr-May", color:"Orange-red (fall)",           zoneMin:4, zoneMax:9 },
  { common:"Black Cherry",            botanical:"Prunus serotina",                 cat:"Deciduous Trees",  size:"50-80 ft H × 30-60 ft W",   bloom:"Apr-May", color:"White racemes",               zoneMin:3, zoneMax:9 },
  { common:"Pawpaw",                  botanical:"Asimina triloba",                 cat:"Deciduous Trees",  size:"15-30 ft H × 15-20 ft W",   bloom:"Mar-May", color:"Maroon flowers, tropical fruit", zoneMin:5, zoneMax:8 },
  { common:"American Basswood",       botanical:"Tilia americana",                 cat:"Deciduous Trees",  size:"50-80 ft H × 35-50 ft W",   bloom:"Jun-Jul", color:"Pale yellow fragrant",        zoneMin:2, zoneMax:8 },
  { common:"Honey Locust",            botanical:"Gleditsia triacanthos inermis",   cat:"Deciduous Trees",  size:"30-70 ft H × 30-50 ft W",   bloom:"Jun",     color:"Yellow (fall)",               zoneMin:3, zoneMax:8 },

  // ── EVERGREEN TREES (30) — zones 6–7 ──────────────────────────────────────
  { common:"Eastern Red Cedar",       botanical:"Juniperus virginiana",            cat:"Evergreen Trees",  size:"30-65 ft H × 8-25 ft W",    bloom:"—",       color:"Blue-green, silver berries",  zoneMin:2, zoneMax:9 },
  { common:"Atlantic White Cedar",    botanical:"Chamaecyparis thyoides",          cat:"Evergreen Trees",  size:"40-50 ft H × 10-20 ft W",   bloom:"—",       color:"Blue-green foliage",          zoneMin:4, zoneMax:9 },
  { common:"Eastern White Pine",      botanical:"Pinus strobus",                   cat:"Evergreen Trees",  size:"50-80 ft H × 20-40 ft W",   bloom:"—",       color:"Blue-green needles",          zoneMin:3, zoneMax:8 },
  { common:"Pitch Pine",              botanical:"Pinus rigida",                    cat:"Evergreen Trees",  size:"40-60 ft H × 30-50 ft W",   bloom:"—",       color:"Dark green needles",          zoneMin:4, zoneMax:7 },
  { common:"Virginia Pine",           botanical:"Pinus virginiana",                cat:"Evergreen Trees",  size:"15-40 ft H × 10-30 ft W",   bloom:"—",       color:"Yellow-green needles",        zoneMin:4, zoneMax:8 },
  { common:"Loblolly Pine",           botanical:"Pinus taeda",                     cat:"Evergreen Trees",  size:"60-90 ft H × 25-35 ft W",   bloom:"—",       color:"Dark green needles",          zoneMin:6, zoneMax:9 },
  { common:"Eastern Hemlock",         botanical:"Tsuga canadensis",                cat:"Evergreen Trees",  size:"40-70 ft H × 25-35 ft W",   bloom:"—",       color:"Dark green feathery",         zoneMin:3, zoneMax:7 },
  { common:"Carolina Hemlock",        botanical:"Tsuga caroliniana",               cat:"Evergreen Trees",  size:"45-60 ft H × 20-25 ft W",   bloom:"—",       color:"Dark green, pendulous",       zoneMin:4, zoneMax:7 },
  { common:"American Holly",          botanical:"Ilex opaca",                      cat:"Evergreen Trees",  size:"15-30 ft H × 10-20 ft W",   bloom:"May-Jun", color:"Red berries (winter)",        zoneMin:5, zoneMax:9 },
  { common:"Southern Magnolia",       botanical:"Magnolia grandiflora",            cat:"Evergreen Trees",  size:"60-80 ft H × 30-50 ft W",   bloom:"May-Jun", color:"White fragrant",              zoneMin:6, zoneMax:10 },
  { common:"Sweetbay Magnolia",       botanical:"Magnolia virginiana",             cat:"Evergreen Trees",  size:"10-35 ft H × 10-20 ft W",   bloom:"May-Jun", color:"White fragrant, semi-evergreen", zoneMin:5, zoneMax:10 },
  { common:"Norway Spruce",           botanical:"Picea abies",                     cat:"Evergreen Trees",  size:"40-60 ft H × 25-30 ft W",   bloom:"—",       color:"Dark green, pendulous",       zoneMin:2, zoneMax:7 },
  { common:"Colorado Blue Spruce",    botanical:"Picea pungens",                   cat:"Evergreen Trees",  size:"30-60 ft H × 10-20 ft W",   bloom:"—",       color:"Steel blue",                  zoneMin:2, zoneMax:7 },
  { common:"White Fir",               botanical:"Abies concolor",                  cat:"Evergreen Trees",  size:"30-50 ft H × 15-30 ft W",   bloom:"—",       color:"Blue-green",                  zoneMin:3, zoneMax:7 },
  { common:"Fraser Fir",              botanical:"Abies fraseri",                   cat:"Evergreen Trees",  size:"30-40 ft H × 20-25 ft W",   bloom:"—",       color:"Dark green, silver undersides", zoneMin:4, zoneMax:7 },
  { common:"Balsam Fir",              botanical:"Abies balsamea",                  cat:"Evergreen Trees",  size:"45-75 ft H × 20-25 ft W",   bloom:"—",       color:"Dark green aromatic",         zoneMin:3, zoneMax:6 },
  { common:"Arborvitae",              botanical:"Thuja occidentalis",              cat:"Evergreen Trees",  size:"10-40 ft H × 10-15 ft W",   bloom:"—",       color:"Green-gold",                  zoneMin:2, zoneMax:7 },
  { common:"Green Giant Arborvitae",  botanical:"Thuja 'Green Giant'",             cat:"Evergreen Trees",  size:"30-40 ft H × 12-18 ft W",   bloom:"—",       color:"Dark green",                  zoneMin:5, zoneMax:8 },
  { common:"Leyland Cypress",         botanical:"x Cuprocyparis leylandii",        cat:"Evergreen Trees",  size:"60-70 ft H × 15-25 ft W",   bloom:"—",       color:"Blue-green",                  zoneMin:6, zoneMax:10 },
  { common:"Japanese Cryptomeria",    botanical:"Cryptomeria japonica",            cat:"Evergreen Trees",  size:"50-60 ft H × 20-30 ft W",   bloom:"—",       color:"Green, bronze in winter",     zoneMin:5, zoneMax:8 },
  { common:"Nellie R. Stevens Holly", botanical:"Ilex x 'Nellie R. Stevens'",      cat:"Evergreen Trees",  size:"15-25 ft H × 8-12 ft W",    bloom:"May",     color:"Red berries (winter)",        zoneMin:6, zoneMax:9 },
  { common:"Foster's Holly",          botanical:"Ilex x attenuata 'Fosteri'",      cat:"Evergreen Trees",  size:"20-30 ft H × 6-10 ft W",    bloom:"May",     color:"Red berries (winter)",        zoneMin:6, zoneMax:9 },
  { common:"Savannah Holly",          botanical:"Ilex x attenuata 'Savannah'",     cat:"Evergreen Trees",  size:"30-40 ft H × 8-12 ft W",    bloom:"May",     color:"Red berries (winter)",        zoneMin:6, zoneMax:9 },
  { common:"Japanese Black Pine",     botanical:"Pinus thunbergii",                cat:"Evergreen Trees",  size:"20-40 ft H × 20-40 ft W",   bloom:"—",       color:"Dark green, coastal form",    zoneMin:5, zoneMax:8 },
  { common:"Shore Pine",              botanical:"Pinus contorta",                  cat:"Evergreen Trees",  size:"25-50 ft H × 15-25 ft W",   bloom:"—",       color:"Dark yellow-green",           zoneMin:4, zoneMax:8 },
  { common:"White Spruce",            botanical:"Picea glauca",                    cat:"Evergreen Trees",  size:"40-60 ft H × 10-20 ft W",   bloom:"—",       color:"Blue-green",                  zoneMin:2, zoneMax:6 },
  { common:"Douglas Fir",             botanical:"Pseudotsuga menziesii",           cat:"Evergreen Trees",  size:"40-70 ft H × 12-20 ft W",   bloom:"—",       color:"Blue-green",                  zoneMin:4, zoneMax:6 },
  { common:"Inkberry Holly",          botanical:"Ilex glabra",                     cat:"Evergreen Trees",  size:"5-8 ft H × 5-8 ft W",       bloom:"May-Jun", color:"Black berries (fall)",        zoneMin:4, zoneMax:9 },
  { common:"Longleaf Pine",           botanical:"Pinus palustris",                 cat:"Evergreen Trees",  size:"60-100 ft H × 30-40 ft W",  bloom:"—",       color:"Long dark green needles",     zoneMin:7, zoneMax:10 },
  { common:"Sargent's Weeping Hemlock", botanical:"Tsuga canadensis 'Sargentii'",  cat:"Evergreen Trees",  size:"8-10 ft H × 15-20 ft W",    bloom:"—",       color:"Dark green weeping",          zoneMin:4, zoneMax:7 },

  // ── DECIDUOUS SHRUBS (30) — zones 6–7 ─────────────────────────────────────
  { common:"Witch Hazel",             botanical:"Hamamelis virginiana",            cat:"Deciduous Shrubs", size:"15-20 ft H × 15-20 ft W",   bloom:"Oct-Dec", color:"Yellow fragrant",             zoneMin:3, zoneMax:8 },
  { common:"Vernal Witch Hazel",      botanical:"Hamamelis vernalis",              cat:"Deciduous Shrubs", size:"6-10 ft H × 6-10 ft W",     bloom:"Jan-Mar", color:"Yellow-orange fragrant",      zoneMin:4, zoneMax:8 },
  { common:"Spicebush",               botanical:"Lindera benzoin",                 cat:"Deciduous Shrubs", size:"6-12 ft H × 6-12 ft W",     bloom:"Mar-Apr", color:"Yellow fragrant",             zoneMin:4, zoneMax:9 },
  { common:"Black Chokeberry",        botanical:"Aronia melanocarpa",              cat:"Deciduous Shrubs", size:"3-5 ft H × 3-5 ft W",       bloom:"Apr-May", color:"White flowers, black berries", zoneMin:3, zoneMax:8 },
  { common:"Red Chokeberry",          botanical:"Aronia arbutifolia",              cat:"Deciduous Shrubs", size:"6-10 ft H × 3-5 ft W",      bloom:"Apr-May", color:"White flowers, red berries",  zoneMin:4, zoneMax:9 },
  { common:"Winterberry",             botanical:"Ilex verticillata",               cat:"Deciduous Shrubs", size:"6-10 ft H × 6-10 ft W",     bloom:"Jun-Jul", color:"Red berries (fall-winter)",   zoneMin:3, zoneMax:9 },
  { common:"Bayberry",                botanical:"Morella pensylvanica",            cat:"Deciduous Shrubs", size:"5-10 ft H × 5-10 ft W",     bloom:"Apr-May", color:"Gray aromatic berries",       zoneMin:2, zoneMax:7 },
  { common:"Highbush Blueberry",      botanical:"Vaccinium corymbosum",            cat:"Deciduous Shrubs", size:"6-12 ft H × 6-8 ft W",      bloom:"Apr-May", color:"White, blue berries",         zoneMin:4, zoneMax:7 },
  { common:"Sweet Pepperbush",        botanical:"Clethra alnifolia",               cat:"Deciduous Shrubs", size:"3-8 ft H × 4-6 ft W",       bloom:"Jul-Sep", color:"White fragrant",              zoneMin:3, zoneMax:9 },
  { common:"Beach Plum",              botanical:"Prunus maritima",                 cat:"Deciduous Shrubs", size:"3-6 ft H × 4-8 ft W",       bloom:"Apr-May", color:"White flowers, purple plums", zoneMin:3, zoneMax:7 },
  { common:"Virginia Sweetspire",     botanical:"Itea virginica",                  cat:"Deciduous Shrubs", size:"3-5 ft H × 3-5 ft W",       bloom:"Jun-Jul", color:"White fragrant",              zoneMin:5, zoneMax:9 },
  { common:"Buttonbush",              botanical:"Cephalanthus occidentalis",       cat:"Deciduous Shrubs", size:"5-12 ft H × 5-12 ft W",     bloom:"Jun-Sep", color:"White spherical",             zoneMin:5, zoneMax:11 },
  { common:"Arrowwood Viburnum",      botanical:"Viburnum dentatum",               cat:"Deciduous Shrubs", size:"6-10 ft H × 6-10 ft W",     bloom:"May-Jun", color:"White, blue berries",         zoneMin:3, zoneMax:8 },
  { common:"Blackhaw",                botanical:"Viburnum prunifolium",            cat:"Deciduous Shrubs", size:"12-15 ft H × 6-12 ft W",    bloom:"Apr-May", color:"White, blue-black berries",   zoneMin:3, zoneMax:9 },
  { common:"Nannyberry",              botanical:"Viburnum lentago",                cat:"Deciduous Shrubs", size:"14-16 ft H × 6-10 ft W",    bloom:"May-Jun", color:"White, blue-black berries",   zoneMin:2, zoneMax:7 },
  { common:"Smooth Hydrangea",        botanical:"Hydrangea arborescens",           cat:"Deciduous Shrubs", size:"3-5 ft H × 3-5 ft W",       bloom:"Jun-Sep", color:"White",                       zoneMin:3, zoneMax:9 },
  { common:"Oakleaf Hydrangea",       botanical:"Hydrangea quercifolia",           cat:"Deciduous Shrubs", size:"6-8 ft H × 6-8 ft W",       bloom:"Jun-Aug", color:"White, peeling bark",         zoneMin:5, zoneMax:9 },
  { common:"Sweetshrub",              botanical:"Calycanthus floridus",            cat:"Deciduous Shrubs", size:"6-9 ft H × 6-12 ft W",      bloom:"Apr-Jun", color:"Maroon fragrant",             zoneMin:4, zoneMax:9 },
  { common:"Fothergilla",             botanical:"Fothergilla gardenii",            cat:"Deciduous Shrubs", size:"3-5 ft H × 3-5 ft W",       bloom:"Apr-May", color:"White fragrant, red-orange fall", zoneMin:5, zoneMax:9 },
  { common:"Large Fothergilla",       botanical:"Fothergilla major",               cat:"Deciduous Shrubs", size:"6-10 ft H × 5-9 ft W",      bloom:"Apr-May", color:"White fragrant, fall color",  zoneMin:4, zoneMax:8 },
  { common:"American Hazelnut",       botanical:"Corylus americana",               cat:"Deciduous Shrubs", size:"8-15 ft H × 8-15 ft W",     bloom:"Mar-Apr", color:"Catkins, orange fall",        zoneMin:4, zoneMax:9 },
  { common:"Elderberry",              botanical:"Sambucus canadensis",             cat:"Deciduous Shrubs", size:"5-12 ft H × 5-12 ft W",     bloom:"Jun-Jul", color:"White flat-top, black berries", zoneMin:3, zoneMax:9 },
  { common:"Wild Azalea",             botanical:"Rhododendron periclymenoides",    cat:"Deciduous Shrubs", size:"4-6 ft H × 4-6 ft W",       bloom:"Apr-May", color:"Pink-White fragrant",         zoneMin:4, zoneMax:9 },
  { common:"Swamp Azalea",            botanical:"Rhododendron viscosum",           cat:"Deciduous Shrubs", size:"5-8 ft H × 5-8 ft W",       bloom:"Jun-Jul", color:"White fragrant",              zoneMin:3, zoneMax:9 },
  { common:"New Jersey Tea",          botanical:"Ceanothus americanus",            cat:"Deciduous Shrubs", size:"3-4 ft H × 3-5 ft W",       bloom:"May-Jul", color:"White fragrant",              zoneMin:4, zoneMax:8 },
  { common:"Meadowsweet",             botanical:"Spiraea alba",                    cat:"Deciduous Shrubs", size:"2-5 ft H × 2-4 ft W",       bloom:"Jun-Aug", color:"White",                       zoneMin:3, zoneMax:8 },
  { common:"Steeplebush",             botanical:"Spiraea tomentosa",               cat:"Deciduous Shrubs", size:"2-4 ft H × 1-3 ft W",       bloom:"Jul-Sep", color:"Pink-Purple",                 zoneMin:4, zoneMax:8 },
  { common:"Pasture Rose",            botanical:"Rosa carolina",                   cat:"Deciduous Shrubs", size:"2-4 ft H × 3-5 ft W",       bloom:"Jun-Jul", color:"Pink",                        zoneMin:4, zoneMax:8 },
  { common:"Leadplant",               botanical:"Amorpha canescens",               cat:"Deciduous Shrubs", size:"2-4 ft H × 2-4 ft W",       bloom:"Jun-Aug", color:"Purple-blue",                 zoneMin:2, zoneMax:8 },
  { common:"Lowbush Blueberry",       botanical:"Vaccinium angustifolium",         cat:"Deciduous Shrubs", size:"1-2 ft H × 1-2 ft W",       bloom:"May-Jun", color:"White, blue berries",         zoneMin:3, zoneMax:6 },

  // ── EVERGREEN SHRUBS (30) — zones 6–7 ─────────────────────────────────────
  { common:"Mountain Laurel",         botanical:"Kalmia latifolia",                cat:"Evergreen Shrubs", size:"5-15 ft H × 5-15 ft W",     bloom:"May-Jun", color:"Pink-White",                  zoneMin:4, zoneMax:9 },
  { common:"Sheep Laurel",            botanical:"Kalmia angustifolia",             cat:"Evergreen Shrubs", size:"1-3 ft H × 2-4 ft W",       bloom:"May-Jun", color:"Rose-Pink",                   zoneMin:2, zoneMax:6 },
  { common:"Inkberry",                botanical:"Ilex glabra",                     cat:"Evergreen Shrubs", size:"5-8 ft H × 5-8 ft W",       bloom:"May-Jun", color:"Black berries (fall)",        zoneMin:4, zoneMax:9 },
  { common:"Rosebay Rhododendron",    botanical:"Rhododendron maximum",            cat:"Evergreen Shrubs", size:"5-15 ft H × 5-15 ft W",     bloom:"Jun-Jul", color:"White-Pink",                  zoneMin:3, zoneMax:7 },
  { common:"PJM Rhododendron",        botanical:"Rhododendron 'PJM'",              cat:"Evergreen Shrubs", size:"3-6 ft H × 3-6 ft W",       bloom:"Mar-Apr", color:"Lavender-Pink",               zoneMin:4, zoneMax:8 },
  { common:"Catawba Rhododendron",    botanical:"Rhododendron catawbiense",        cat:"Evergreen Shrubs", size:"6-10 ft H × 6-10 ft W",     bloom:"May-Jun", color:"Lavender-Purple",             zoneMin:4, zoneMax:8 },
  { common:"Leucothoe",               botanical:"Leucothoe fontanesiana",          cat:"Evergreen Shrubs", size:"3-6 ft H × 6-8 ft W",       bloom:"Apr-May", color:"White, red winter foliage",   zoneMin:5, zoneMax:8 },
  { common:"Pieris / Andromeda",      botanical:"Pieris japonica",                 cat:"Evergreen Shrubs", size:"9-12 ft H × 6-8 ft W",      bloom:"Mar-Apr", color:"White fragrant chains",       zoneMin:5, zoneMax:8 },
  { common:"Mountain Pieris",         botanical:"Pieris floribunda",               cat:"Evergreen Shrubs", size:"2-6 ft H × 2-6 ft W",       bloom:"Mar-Apr", color:"White fragrant",              zoneMin:4, zoneMax:6 },
  { common:"American Boxwood",        botanical:"Buxus sempervirens",              cat:"Evergreen Shrubs", size:"5-15 ft H × 5-15 ft W",     bloom:"Apr",     color:"Dark green formal",           zoneMin:5, zoneMax:8 },
  { common:"Korean Boxwood",          botanical:"Buxus sinica var. insularis",     cat:"Evergreen Shrubs", size:"2-4 ft H × 2-4 ft W",       bloom:"Apr",     color:"Green, hardy",                zoneMin:4, zoneMax:9 },
  { common:"Oregon Grape",            botanical:"Mahonia aquifolium",              cat:"Evergreen Shrubs", size:"3-6 ft H × 3-5 ft W",       bloom:"Mar-Apr", color:"Yellow, blue berries",        zoneMin:5, zoneMax:9 },
  { common:"Sweetbox",                botanical:"Sarcococca hookeriana",           cat:"Evergreen Shrubs", size:"3-5 ft H × 3-6 ft W",       bloom:"Feb-Mar", color:"White fragrant",              zoneMin:6, zoneMax:9 },
  { common:"Skip Laurel",             botanical:"Prunus laurocerasus 'Schipkaensis'", cat:"Evergreen Shrubs", size:"5-10 ft H × 6-10 ft W", bloom:"Apr-May", color:"White, screening",            zoneMin:6, zoneMax:9 },
  { common:"Otto Luyken Laurel",      botanical:"Prunus laurocerasus 'Otto Luyken'", cat:"Evergreen Shrubs", size:"3-4 ft H × 6-8 ft W",   bloom:"Apr-May", color:"White",                       zoneMin:6, zoneMax:9 },
  { common:"Yew",                     botanical:"Taxus x media",                   cat:"Evergreen Shrubs", size:"4-20 ft H × 4-20 ft W",     bloom:"—",       color:"Dark green, red arils",       zoneMin:4, zoneMax:7 },
  { common:"Japanese Holly",          botanical:"Ilex crenata",                    cat:"Evergreen Shrubs", size:"3-10 ft H × 3-10 ft W",     bloom:"May-Jun", color:"Dark green fine-textured",    zoneMin:5, zoneMax:8 },
  { common:"Wintergreen",             botanical:"Gaultheria procumbens",           cat:"Evergreen Shrubs", size:"3-6 in H × spreading",       bloom:"Jun-Aug", color:"White, red berries",          zoneMin:3, zoneMax:8 },
  { common:"Compact Inkberry",        botanical:"Ilex glabra 'Compacta'",          cat:"Evergreen Shrubs", size:"3-4 ft H × 3-4 ft W",       bloom:"May-Jun", color:"Black berries",               zoneMin:4, zoneMax:9 },
  { common:"Blue Holly",              botanical:"Ilex x meserveae",                cat:"Evergreen Shrubs", size:"6-10 ft H × 4-6 ft W",      bloom:"May",     color:"Red berries (winter)",        zoneMin:4, zoneMax:7 },
  { common:"Skimmia",                 botanical:"Skimmia japonica",                cat:"Evergreen Shrubs", size:"3-5 ft H × 3-5 ft W",       bloom:"Apr-May", color:"White fragrant, red berries", zoneMin:6, zoneMax:8 },
  { common:"Holly Osmanthus",         botanical:"Osmanthus heterophyllus",         cat:"Evergreen Shrubs", size:"8-10 ft H × 8-10 ft W",     bloom:"Oct-Nov", color:"White fragrant",              zoneMin:6, zoneMax:9 },
  { common:"Aucuba",                  botanical:"Aucuba japonica",                 cat:"Evergreen Shrubs", size:"6-10 ft H × 5-9 ft W",      bloom:"Mar-Apr", color:"Gold-splashed dark green",    zoneMin:6, zoneMax:10 },
  { common:"Nandina",                 botanical:"Nandina domestica",               cat:"Evergreen Shrubs", size:"4-8 ft H × 2-4 ft W",       bloom:"May-Jun", color:"Red berries + fall color",    zoneMin:6, zoneMax:9 },
  { common:"Dwarf Fothergilla",       botanical:"Fothergilla gardenii 'Blue Mist'", cat:"Evergreen Shrubs", size:"2-3 ft H × 2-4 ft W",     bloom:"Apr-May", color:"White fragrant, fall color",  zoneMin:5, zoneMax:9 },
  { common:"Possumhaw Holly",         botanical:"Ilex decidua",                    cat:"Evergreen Shrubs", size:"7-10 ft H × 5-10 ft W",     bloom:"Apr-May", color:"Orange-red berries",          zoneMin:3, zoneMax:9 },
  { common:"Fragrant Tea Olive",      botanical:"Osmanthus fragrans",              cat:"Evergreen Shrubs", size:"10-30 ft H × 10-15 ft W",   bloom:"Sep-Nov", color:"White fragrant",              zoneMin:7, zoneMax:11 },
  { common:"Creeping Mahonia",        botanical:"Mahonia repens",                  cat:"Evergreen Shrubs", size:"1-2 ft H × 3-5 ft W",       bloom:"Mar-Apr", color:"Yellow, blue berries",        zoneMin:5, zoneMax:9 },
  { common:"Carolina Rhododendron",   botanical:"Rhododendron carolinianum",       cat:"Evergreen Shrubs", size:"3-6 ft H × 3-6 ft W",       bloom:"Apr-May", color:"Rose-Pink",                   zoneMin:4, zoneMax:8 },
  { common:"Drooping Leucothoe",      botanical:"Leucothoe fontanesiana 'Rainbow'", cat:"Evergreen Shrubs", size:"3-5 ft H × 4-6 ft W",     bloom:"Apr-May", color:"White, variegated foliage",   zoneMin:5, zoneMax:8 },

  // ── PERENNIALS (30) — zones 6–7 ───────────────────────────────────────────
  { common:"Purple Coneflower",       botanical:"Echinacea purpurea",              cat:"Perennials",       size:"2-5 ft H × 1-2 ft W",       bloom:"Jun-Oct", color:"Purple-Pink",                 zoneMin:3, zoneMax:9 },
  { common:"Black-eyed Susan",        botanical:"Rudbeckia hirta",                 cat:"Perennials",       size:"1-3 ft H × 1-2 ft W",       bloom:"Jun-Oct", color:"Golden Yellow",               zoneMin:3, zoneMax:9 },
  { common:"Orange Coneflower",       botanical:"Rudbeckia fulgida",               cat:"Perennials",       size:"2-3 ft H × 1-2 ft W",       bloom:"Jul-Oct", color:"Golden Orange",               zoneMin:3, zoneMax:9 },
  { common:"New England Aster",       botanical:"Symphyotrichum novae-angliae",    cat:"Perennials",       size:"3-6 ft H × 2-4 ft W",       bloom:"Sep-Oct", color:"Purple-Pink",                 zoneMin:3, zoneMax:8 },
  { common:"Blue Wood Aster",         botanical:"Symphyotrichum cordifolium",      cat:"Perennials",       size:"2-4 ft H × 2-3 ft W",       bloom:"Sep-Oct", color:"Lavender-Blue",               zoneMin:3, zoneMax:8 },
  { common:"Calico Aster",            botanical:"Symphyotrichum lateriflorum",     cat:"Perennials",       size:"2-3 ft H × 2-3 ft W",       bloom:"Sep-Oct", color:"White-Lavender",              zoneMin:3, zoneMax:8 },
  { common:"Fireworks Goldenrod",     botanical:"Solidago rugosa 'Fireworks'",     cat:"Perennials",       size:"3-4 ft H × 2-3 ft W",       bloom:"Sep-Oct", color:"Arching gold",                zoneMin:4, zoneMax:8 },
  { common:"Stiff Goldenrod",         botanical:"Solidago rigida",                 cat:"Perennials",       size:"2-4 ft H × 1-2 ft W",       bloom:"Aug-Oct", color:"Golden Yellow",               zoneMin:3, zoneMax:8 },
  { common:"Zigzag Goldenrod",        botanical:"Solidago flexicaulis",            cat:"Perennials",       size:"1-3 ft H × 1-2 ft W",       bloom:"Aug-Oct", color:"Golden Yellow",               zoneMin:3, zoneMax:8 },
  { common:"Blue False Indigo",       botanical:"Baptisia australis",              cat:"Perennials",       size:"3-4 ft H × 3-4 ft W",       bloom:"May-Jun", color:"Blue-Violet",                 zoneMin:3, zoneMax:9 },
  { common:"Wild Bergamot",           botanical:"Monarda fistulosa",               cat:"Perennials",       size:"2-4 ft H × 2-3 ft W",       bloom:"Jun-Aug", color:"Lavender-Pink",               zoneMin:3, zoneMax:9 },
  { common:"Bee Balm",                botanical:"Monarda didyma",                  cat:"Perennials",       size:"2-4 ft H × 2-3 ft W",       bloom:"Jun-Aug", color:"Red",                         zoneMin:4, zoneMax:9 },
  { common:"Swamp Milkweed",          botanical:"Asclepias incarnata",             cat:"Perennials",       size:"3-4 ft H × 2-3 ft W",       bloom:"Jun-Aug", color:"Pink-Mauve",                  zoneMin:3, zoneMax:9 },
  { common:"Butterfly Weed",          botanical:"Asclepias tuberosa",              cat:"Perennials",       size:"1-2 ft H × 1-2 ft W",       bloom:"Jun-Sep", color:"Bright Orange",               zoneMin:3, zoneMax:9 },
  { common:"Joe-pye Weed",            botanical:"Eutrochium purpureum",            cat:"Perennials",       size:"4-7 ft H × 2-4 ft W",       bloom:"Aug-Sep", color:"Mauve-Pink",                  zoneMin:4, zoneMax:9 },
  { common:"Dense Blazing Star",      botanical:"Liatris spicata",                 cat:"Perennials",       size:"2-4 ft H × 1-2 ft W",       bloom:"Jul-Sep", color:"Purple-Magenta",              zoneMin:3, zoneMax:9 },
  { common:"Blue Star",               botanical:"Amsonia tabernaemontana",         cat:"Perennials",       size:"2-3 ft H × 2-3 ft W",       bloom:"Apr-May", color:"Pale Blue",                   zoneMin:3, zoneMax:9 },
  { common:"Wild Columbine",          botanical:"Aquilegia canadensis",            cat:"Perennials",       size:"1-3 ft H × 1-2 ft W",       bloom:"Apr-Jun", color:"Red-Yellow",                  zoneMin:3, zoneMax:8 },
  { common:"Wild Geranium",           botanical:"Geranium maculatum",              cat:"Perennials",       size:"1-2 ft H × 1-2 ft W",       bloom:"Apr-Jun", color:"Lavender-Pink",               zoneMin:3, zoneMax:8 },
  { common:"Golden Alexander",        botanical:"Zizia aurea",                     cat:"Perennials",       size:"1-3 ft H × 1-3 ft W",       bloom:"Apr-Jun", color:"Golden Yellow",               zoneMin:3, zoneMax:8 },
  { common:"Ironweed",                botanical:"Vernonia noveboracensis",          cat:"Perennials",       size:"4-6 ft H × 2-4 ft W",       bloom:"Aug-Sep", color:"Vivid Purple",                zoneMin:5, zoneMax:9 },
  { common:"Cup Plant",               botanical:"Silphium perfoliatum",            cat:"Perennials",       size:"6-8 ft H × 2-4 ft W",       bloom:"Jul-Sep", color:"Yellow",                      zoneMin:4, zoneMax:9 },
  { common:"Virginia Bluebells",      botanical:"Mertensia virginica",             cat:"Perennials",       size:"1-2 ft H × 1-2 ft W",       bloom:"Mar-May", color:"Sky Blue",                    zoneMin:3, zoneMax:8 },
  { common:"Wild Blue Phlox",         botanical:"Phlox divaricata",                cat:"Perennials",       size:"10-15 in H × 10-15 in W",   bloom:"Apr-May", color:"Lavender-Blue",               zoneMin:3, zoneMax:9 },
  { common:"Prairie Blazing Star",    botanical:"Liatris pycnostachya",            cat:"Perennials",       size:"3-5 ft H × 1-2 ft W",       bloom:"Jul-Sep", color:"Purple-Magenta",              zoneMin:3, zoneMax:9 },
  { common:"White Wild Indigo",       botanical:"Baptisia alba",                   cat:"Perennials",       size:"3-4 ft H × 3-4 ft W",       bloom:"May-Jun", color:"White",                       zoneMin:4, zoneMax:8 },
  { common:"Common Milkweed",         botanical:"Asclepias syriaca",               cat:"Perennials",       size:"2-4 ft H × spreading",       bloom:"Jun-Aug", color:"Pink-Mauve fragrant",         zoneMin:3, zoneMax:9 },
  { common:"Spotted Joe-pye Weed",    botanical:"Eutrochium maculatum",            cat:"Perennials",       size:"4-6 ft H × 2-3 ft W",       bloom:"Jul-Sep", color:"Mauve-Pink",                  zoneMin:2, zoneMax:8 },
  { common:"Wild Lupine",             botanical:"Lupinus perennis",                cat:"Perennials",       size:"1-2 ft H × 1-2 ft W",       bloom:"May-Jun", color:"Blue-Violet",                 zoneMin:4, zoneMax:8 },
  { common:"Purple Dome Aster",       botanical:"Symphyotrichum novae-angliae 'Purple Dome'", cat:"Perennials", size:"18-24 in H × 24 in W", bloom:"Aug-Oct", color:"Deep purple",            zoneMin:3, zoneMax:8 },

  // ── GRASSES (30) — zones 6–7 ──────────────────────────────────────────────
  { common:"Little Bluestem",         botanical:"Schizachyrium scoparium",         cat:"Grasses",          size:"2-4 ft H × 1-2 ft W",       bloom:"Aug-Oct", color:"Coppery-Red (fall)",          zoneMin:3, zoneMax:9 },
  { common:"Big Bluestem",            botanical:"Andropogon gerardii",             cat:"Grasses",          size:"4-8 ft H × 2-3 ft W",       bloom:"Aug-Sep", color:"Purple-bronze",               zoneMin:3, zoneMax:9 },
  { common:"Switch Grass",            botanical:"Panicum virgatum",                cat:"Grasses",          size:"3-6 ft H × 2-3 ft W",       bloom:"Aug-Sep", color:"Pinkish-Red (fall)",          zoneMin:4, zoneMax:9 },
  { common:"Shenandoah Switch Grass", botanical:"Panicum virgatum 'Shenandoah'",  cat:"Grasses",          size:"3-4 ft H × 2-3 ft W",       bloom:"Aug-Sep", color:"Red fall color",              zoneMin:4, zoneMax:9 },
  { common:"Heavy Metal Switch Grass", botanical:"Panicum virgatum 'Heavy Metal'", cat:"Grasses",         size:"5-6 ft H × 2 ft W",         bloom:"Aug-Sep", color:"Metallic blue-green",         zoneMin:4, zoneMax:9 },
  { common:"Indian Grass",            botanical:"Sorghastrum nutans",              cat:"Grasses",          size:"3-5 ft H × 1-2 ft W",       bloom:"Aug-Sep", color:"Copper-gold",                 zoneMin:4, zoneMax:9 },
  { common:"Prairie Dropseed",        botanical:"Sporobolus heterolepis",          cat:"Grasses",          size:"2-3 ft H × 2-3 ft W",       bloom:"Aug-Sep", color:"Pinkish-brown",               zoneMin:3, zoneMax:9 },
  { common:"Beach Grass",             botanical:"Ammophila breviligulata",         cat:"Grasses",          size:"1-2 ft H × spreading",       bloom:"Jul-Aug", color:"Tan seed heads",              zoneMin:4, zoneMax:7 },
  { common:"Tufted Hair Grass",       botanical:"Deschampsia cespitosa",           cat:"Grasses",          size:"2-3 ft H × 2-3 ft W",       bloom:"Jun-Aug", color:"Golden-Green",                zoneMin:4, zoneMax:7 },
  { common:"Northern Sea Oats",       botanical:"Chasmanthium latifolium",         cat:"Grasses",          size:"2-4 ft H × 1-2 ft W",       bloom:"Jul-Sep", color:"Green-bronze dangling oats",  zoneMin:4, zoneMax:8 },
  { common:"Tussock Sedge",           botanical:"Carex stricta",                   cat:"Grasses",          size:"2-3 ft H × 1-2 ft W",       bloom:"May-Jun", color:"Green-brown",                 zoneMin:3, zoneMax:8 },
  { common:"Pennsylvania Sedge",      botanical:"Carex pensylvanica",              cat:"Grasses",          size:"6-12 in H × spreading",      bloom:"Apr-May", color:"Fine green",                  zoneMin:3, zoneMax:8 },
  { common:"Blue Wood Sedge",         botanical:"Carex flaccosperma",              cat:"Grasses",          size:"8-12 in H × spreading",      bloom:"Mar-Apr", color:"Blue-green",                  zoneMin:5, zoneMax:9 },
  { common:"Bottlebrush Grass",       botanical:"Elymus hystrix",                  cat:"Grasses",          size:"2-3 ft H × 1-2 ft W",       bloom:"Jun-Aug", color:"Green-tan",                   zoneMin:4, zoneMax:8 },
  { common:"Virginia Wild Rye",       botanical:"Elymus virginicus",               cat:"Grasses",          size:"2-4 ft H × 1-2 ft W",       bloom:"Jun-Aug", color:"Green-tan",                   zoneMin:3, zoneMax:8 },
  { common:"Blue Oat Grass",          botanical:"Helictotrichon sempervirens",     cat:"Grasses",          size:"2-3 ft H × 2 ft W",          bloom:"Jun-Jul", color:"Steel Blue",                  zoneMin:4, zoneMax:9 },
  { common:"Saltmeadow Cordgrass",    botanical:"Spartina patens",                 cat:"Grasses",          size:"1-3 ft H × spreading",       bloom:"Jul-Sep", color:"Tan-green",                   zoneMin:4, zoneMax:9 },
  { common:"Soft Rush",               botanical:"Juncus effusus",                  cat:"Grasses",          size:"1-3 ft H × 1-2 ft W",       bloom:"Jun-Aug", color:"Green stems",                 zoneMin:4, zoneMax:9 },
  { common:"Blue Fescue",             botanical:"Festuca glauca",                  cat:"Grasses",          size:"6-12 in H × 6-12 in W",      bloom:"May-Jun", color:"Silvery-blue",                zoneMin:4, zoneMax:8 },
  { common:"Karl Foerster Grass",     botanical:"Calamagrostis x acutiflora 'Karl Foerster'", cat:"Grasses", size:"4-6 ft H × 2-3 ft W", bloom:"Jun-Jul", color:"Pink-tan feathery",           zoneMin:4, zoneMax:9 },
  { common:"Overdam Feather Reed Grass", botanical:"Calamagrostis x acutiflora 'Overdam'", cat:"Grasses", size:"3-4 ft H × 2-3 ft W",    bloom:"Jun-Jul", color:"White-edged, pink",           zoneMin:4, zoneMax:9 },
  { common:"Fountain Grass",          botanical:"Pennisetum alopecuroides",        cat:"Grasses",          size:"2-4 ft H × 2-3 ft W",       bloom:"Aug-Sep", color:"Pink-tan plumes",             zoneMin:5, zoneMax:9 },
  { common:"Moudry Fountain Grass",   botanical:"Pennisetum alopecuroides 'Moudry'", cat:"Grasses",       size:"2-3 ft H × 2-3 ft W",       bloom:"Aug-Sep", color:"Black-purple plumes",         zoneMin:5, zoneMax:9 },
  { common:"Japanese Forest Grass",   botanical:"Hakonechloa macra",               cat:"Grasses",          size:"12-18 in H × 18-24 in W",   bloom:"Aug-Sep", color:"Gold-green cascading",        zoneMin:5, zoneMax:9 },
  { common:"Sesleria",                botanical:"Sesleria autumnalis",              cat:"Grasses",          size:"12-18 in H × 18 in W",       bloom:"Sep-Oct", color:"Yellow-green",                zoneMin:5, zoneMax:8 },
  { common:"Cord Grass",              botanical:"Spartina alterniflora",           cat:"Grasses",          size:"3-7 ft H × spreading",       bloom:"Aug-Sep", color:"Green-tan",                   zoneMin:5, zoneMax:9 },
  { common:"Common Rush",             botanical:"Juncus tenuis",                   cat:"Grasses",          size:"8-24 in H × clumping",       bloom:"Jun-Aug", color:"Green-tan",                   zoneMin:3, zoneMax:8 },
  { common:"Poverty Oat Grass",       botanical:"Danthonia spicata",               cat:"Grasses",          size:"8-18 in H × 8-12 in W",      bloom:"Jun-Jul", color:"Green-tan",                   zoneMin:3, zoneMax:8 },
  { common:"Bog Rush",                botanical:"Juncus articulatus",              cat:"Grasses",          size:"8-24 in H × clumping",       bloom:"Jun-Aug", color:"Brown seed heads",            zoneMin:3, zoneMax:8 },
  { common:"River Oats",              botanical:"Chasmanthium latifolium",          cat:"Grasses",          size:"2-4 ft H × 1-2 ft W",       bloom:"Jul-Sep", color:"Bronze dangling",             zoneMin:4, zoneMax:8 },

  // ── GROUNDCOVERS (30) — zones 6–7 ─────────────────────────────────────────
  { common:"Wild Ginger",             botanical:"Asarum canadense",                cat:"Groundcovers",     size:"6-12 in H × spreading",      bloom:"Apr-May", color:"Brown-purple hidden flower",  zoneMin:3, zoneMax:8 },
  { common:"Bloodroot",               botanical:"Sanguinaria canadensis",          cat:"Groundcovers",     size:"6-9 in H × 6-9 in W",       bloom:"Mar-Apr", color:"White",                       zoneMin:3, zoneMax:9 },
  { common:"Creeping Phlox",          botanical:"Phlox stolonifera",               cat:"Groundcovers",     size:"6-9 in H × spreading",       bloom:"Apr-May", color:"Purple-Pink",                 zoneMin:5, zoneMax:9 },
  { common:"Blue-eyed Grass",         botanical:"Sisyrinchium angustifolium",      cat:"Groundcovers",     size:"8-18 in H × 6-12 in W",     bloom:"May-Jun", color:"Blue-violet",                 zoneMin:4, zoneMax:9 },
  { common:"Coral Bells",             botanical:"Heuchera americana",              cat:"Groundcovers",     size:"12-18 in H × 12-18 in W",   bloom:"May-Jun", color:"Cream, marbled foliage",      zoneMin:4, zoneMax:9 },
  { common:"Palace Purple Coral Bells", botanical:"Heuchera micrantha 'Palace Purple'", cat:"Groundcovers", size:"12-18 in H × 18 in W",    bloom:"Jun-Jul", color:"White, purple foliage",       zoneMin:4, zoneMax:8 },
  { common:"Foamflower",              botanical:"Tiarella cordifolia",             cat:"Groundcovers",     size:"6-12 in H × spreading",      bloom:"Apr-May", color:"White-Pink",                  zoneMin:3, zoneMax:7 },
  { common:"Wild Strawberry",         botanical:"Fragaria virginiana",             cat:"Groundcovers",     size:"4-6 in H × spreading",       bloom:"Apr-Jun", color:"White, red berries",          zoneMin:3, zoneMax:9 },
  { common:"Green-and-Gold",          botanical:"Chrysogonum virginianum",         cat:"Groundcovers",     size:"6-12 in H × spreading",      bloom:"Mar-Jun", color:"Yellow",                      zoneMin:5, zoneMax:9 },
  { common:"Creeping Jenny",          botanical:"Lysimachia nummularia",           cat:"Groundcovers",     size:"2-4 in H × spreading",       bloom:"Jun-Aug", color:"Yellow",                      zoneMin:3, zoneMax:8 },
  { common:"Bunchberry",              botanical:"Cornus canadensis",               cat:"Groundcovers",     size:"4-6 in H × spreading",       bloom:"May-Jun", color:"White bracts, red berries",   zoneMin:2, zoneMax:6 },
  { common:"Partridgeberry",          botanical:"Mitchella repens",                cat:"Groundcovers",     size:"1-2 in H × spreading",       bloom:"May-Jun", color:"White fragrant, red berries", zoneMin:3, zoneMax:9 },
  { common:"Trout Lily",              botanical:"Erythronium americanum",          cat:"Groundcovers",     size:"4-8 in H × 4-8 in W",       bloom:"Apr-May", color:"Yellow",                      zoneMin:3, zoneMax:8 },
  { common:"Jack-in-the-Pulpit",      botanical:"Arisaema triphyllum",             cat:"Groundcovers",     size:"1-3 ft H × 6-12 in W",      bloom:"Apr-May", color:"Green-purple, red berries",   zoneMin:4, zoneMax:9 },
  { common:"Wild Blue Violet",        botanical:"Viola sororia",                   cat:"Groundcovers",     size:"4-8 in H × spreading",       bloom:"Mar-Jun", color:"Blue-violet",                 zoneMin:3, zoneMax:9 },
  { common:"Canada Anemone",          botanical:"Anemone canadensis",              cat:"Groundcovers",     size:"1-2 ft H × spreading",       bloom:"May-Jul", color:"White",                       zoneMin:3, zoneMax:8 },
  { common:"Allegheny Spurge",        botanical:"Pachysandra procumbens",          cat:"Groundcovers",     size:"6-12 in H × spreading",      bloom:"Mar-Apr", color:"White-Pink, mottled foliage", zoneMin:4, zoneMax:9 },
  { common:"Japanese Pachysandra",    botanical:"Pachysandra terminalis",          cat:"Groundcovers",     size:"8-12 in H × spreading",      bloom:"Apr-May", color:"White, dark green",           zoneMin:4, zoneMax:8 },
  { common:"Bearberry",               botanical:"Arctostaphylos uva-ursi",         cat:"Groundcovers",     size:"6-12 in H × spreading",      bloom:"Apr-May", color:"Pink-White, red berries",     zoneMin:2, zoneMax:6 },
  { common:"Liriope",                 botanical:"Liriope muscari",                 cat:"Groundcovers",     size:"12-18 in H × 12-18 in W",   bloom:"Aug-Sep", color:"Lavender spikes",             zoneMin:5, zoneMax:10 },
  { common:"Creeping Liriope",        botanical:"Liriope spicata",                 cat:"Groundcovers",     size:"8-12 in H × spreading",      bloom:"Jul-Aug", color:"Lavender-White",              zoneMin:4, zoneMax:10 },
  { common:"Barrenwort",              botanical:"Epimedium x rubrum",              cat:"Groundcovers",     size:"8-12 in H × spreading",      bloom:"Apr-May", color:"Red-Pink",                    zoneMin:4, zoneMax:8 },
  { common:"Mondo Grass",             botanical:"Ophiopogon japonicus",            cat:"Groundcovers",     size:"6-12 in H × spreading",      bloom:"Jul-Aug", color:"Lavender-White",              zoneMin:6, zoneMax:10 },
  { common:"Lily of the Valley",      botanical:"Convallaria majalis",             cat:"Groundcovers",     size:"6-8 in H × spreading",       bloom:"Apr-May", color:"White fragrant bells",        zoneMin:3, zoneMax:8 },
  { common:"Sweet Woodruff",          botanical:"Galium odoratum",                 cat:"Groundcovers",     size:"6-8 in H × spreading",       bloom:"Apr-May", color:"White fragrant",              zoneMin:4, zoneMax:8 },
  { common:"European Wild Ginger",    botanical:"Asarum europaeum",                cat:"Groundcovers",     size:"3-5 in H × spreading",       bloom:"Apr-May", color:"Glossy dark green",           zoneMin:4, zoneMax:8 },
  { common:"Creeping Sedum",          botanical:"Sedum spurium",                   cat:"Groundcovers",     size:"3-6 in H × spreading",       bloom:"Jun-Aug", color:"Pink-Red",                    zoneMin:3, zoneMax:8 },
  { common:"Wintergreen",             botanical:"Gaultheria procumbens",           cat:"Groundcovers",     size:"3-6 in H × spreading",       bloom:"Jun-Aug", color:"White, red berries",          zoneMin:3, zoneMax:8 },
  { common:"Silver Wild Ginger",      botanical:"Asarum splendens",                cat:"Groundcovers",     size:"6-8 in H × spreading",       bloom:"Apr-May", color:"Silver-marbled leaves",       zoneMin:6, zoneMax:9 },
  { common:"Yellow Barrenwort",       botanical:"Epimedium x versicolor",          cat:"Groundcovers",     size:"8-12 in H × spreading",      bloom:"Apr-May", color:"Yellow",                      zoneMin:4, zoneMax:9 },

  // ── FERNS (30) — zones 6–7 ────────────────────────────────────────────────
  { common:"Christmas Fern",          botanical:"Polystichum acrostichoides",      cat:"Ferns",            size:"1-2 ft H × 1-2 ft W",       bloom:"—",       color:"Dark green evergreen",        zoneMin:3, zoneMax:9 },
  { common:"Ostrich Fern",            botanical:"Matteuccia struthiopteris",       cat:"Ferns",            size:"3-5 ft H × 2-3 ft W",       bloom:"—",       color:"Bright green vase-shaped",    zoneMin:4, zoneMax:8 },
  { common:"Sensitive Fern",          botanical:"Onoclea sensibilis",              cat:"Ferns",            size:"18-30 in H × spreading",     bloom:"—",       color:"Blue-green + beaded fronds",  zoneMin:3, zoneMax:8 },
  { common:"Royal Fern",              botanical:"Osmunda regalis",                 cat:"Ferns",            size:"3-6 ft H × 3-4 ft W",       bloom:"—",       color:"Green, Yellow (fall)",        zoneMin:4, zoneMax:8 },
  { common:"Cinnamon Fern",           botanical:"Osmundastrum cinnamomeum",        cat:"Ferns",            size:"2-4 ft H × 2-3 ft W",       bloom:"—",       color:"Green + cinnamon fronds",     zoneMin:4, zoneMax:8 },
  { common:"Interrupted Fern",        botanical:"Osmunda claytoniana",             cat:"Ferns",            size:"2-4 ft H × 2-3 ft W",       bloom:"—",       color:"Blue-green",                  zoneMin:3, zoneMax:7 },
  { common:"Wood Fern",               botanical:"Dryopteris marginalis",           cat:"Ferns",            size:"18-24 in H × 18-24 in W",   bloom:"—",       color:"Blue-green evergreen",        zoneMin:3, zoneMax:8 },
  { common:"Autumn Fern",             botanical:"Dryopteris erythrosora",          cat:"Ferns",            size:"18-24 in H × 18-24 in W",   bloom:"—",       color:"Copper → green",              zoneMin:4, zoneMax:8 },
  { common:"Male Fern",               botanical:"Dryopteris filix-mas",            cat:"Ferns",            size:"2-4 ft H × 2-3 ft W",       bloom:"—",       color:"Dark green semi-evergreen",   zoneMin:3, zoneMax:8 },
  { common:"Goldie's Fern",           botanical:"Dryopteris goldiana",             cat:"Ferns",            size:"3-4 ft H × 3-4 ft W",       bloom:"—",       color:"Golden-green",                zoneMin:3, zoneMax:8 },
  { common:"New York Fern",           botanical:"Thelypteris noveboracensis",      cat:"Ferns",            size:"1-2 ft H × spreading",       bloom:"—",       color:"Lime-green",                  zoneMin:3, zoneMax:8 },
  { common:"Marsh Fern",              botanical:"Thelypteris palustris",           cat:"Ferns",            size:"1-2 ft H × spreading",       bloom:"—",       color:"Bright green",                zoneMin:4, zoneMax:8 },
  { common:"Hay-scented Fern",        botanical:"Dennstaedtia punctilobula",       cat:"Ferns",            size:"1-2.5 ft H × spreading",     bloom:"—",       color:"Yellow-green",                zoneMin:3, zoneMax:8 },
  { common:"Lady Fern",               botanical:"Athyrium filix-femina",           cat:"Ferns",            size:"2-3 ft H × 2-3 ft W",       bloom:"—",       color:"Bright green lacy",           zoneMin:4, zoneMax:9 },
  { common:"Japanese Painted Fern",   botanical:"Athyrium niponicum 'Pictum'",     cat:"Ferns",            size:"12-18 in H × 12-18 in W",   bloom:"—",       color:"Silver-gray-green",           zoneMin:3, zoneMax:8 },
  { common:"Ghost Fern",              botanical:"Athyrium 'Ghost'",                cat:"Ferns",            size:"18-24 in H × 18-24 in W",   bloom:"—",       color:"Silvery-gray-green",          zoneMin:3, zoneMax:8 },
  { common:"Maidenhair Fern",         botanical:"Adiantum pedatum",                cat:"Ferns",            size:"12-18 in H × 12-18 in W",   bloom:"—",       color:"Bright green fan fronds",     zoneMin:3, zoneMax:8 },
  { common:"Bracken Fern",            botanical:"Pteridium aquilinum",             cat:"Ferns",            size:"2-4 ft H × spreading",       bloom:"—",       color:"Green-yellow",                zoneMin:3, zoneMax:9 },
  { common:"Ebony Spleenwort",        botanical:"Asplenium platyneuron",           cat:"Ferns",            size:"8-20 in H × 8-12 in W",     bloom:"—",       color:"Dark green, ebony stems",     zoneMin:3, zoneMax:8 },
  { common:"Netted Chain Fern",       botanical:"Woodwardia areolata",             cat:"Ferns",            size:"12-18 in H × spreading",     bloom:"—",       color:"Dark green, red new growth",  zoneMin:3, zoneMax:9 },
  { common:"Virginia Chain Fern",     botanical:"Woodwardia virginica",            cat:"Ferns",            size:"2-4 ft H × spreading",       bloom:"—",       color:"Dark green",                  zoneMin:3, zoneMax:9 },
  { common:"Rattlesnake Fern",        botanical:"Botrychium virginianum",          cat:"Ferns",            size:"12-24 in H × 12-18 in W",   bloom:"—",       color:"Bright yellow-green",         zoneMin:3, zoneMax:8 },
  { common:"Oak Fern",                botanical:"Gymnocarpium dryopteris",         cat:"Ferns",            size:"8-12 in H × spreading",      bloom:"—",       color:"Bright green triangular",     zoneMin:2, zoneMax:6 },
  { common:"Rock Polypody",           botanical:"Polypodium virginianum",          cat:"Ferns",            size:"6-12 in H × spreading",      bloom:"—",       color:"Dark green evergreen",        zoneMin:3, zoneMax:8 },
  { common:"Spinulose Wood Fern",     botanical:"Dryopteris carthusiana",          cat:"Ferns",            size:"18-24 in H × 18-24 in W",   bloom:"—",       color:"Light green lacy",            zoneMin:3, zoneMax:8 },
  { common:"Crested Wood Fern",       botanical:"Dryopteris cristata",             cat:"Ferns",            size:"18-24 in H × 12-18 in W",   bloom:"—",       color:"Blue-green",                  zoneMin:3, zoneMax:8 },
  { common:"Broad Beech Fern",        botanical:"Phegopteris hexagonoptera",       cat:"Ferns",            size:"12-18 in H × spreading",     bloom:"—",       color:"Bright green triangular",     zoneMin:4, zoneMax:8 },
  { common:"Southern Maidenhair",     botanical:"Adiantum capillus-veneris",       cat:"Ferns",            size:"12-18 in H × 12-18 in W",   bloom:"—",       color:"Bright green delicate",       zoneMin:5, zoneMax:10 },
  { common:"Walking Fern",            botanical:"Asplenium rhizophyllum",          cat:"Ferns",            size:"4-8 in H × spreading",       bloom:"—",       color:"Dark green strap-like",       zoneMin:3, zoneMax:8 },
  { common:"Long Beech Fern",         botanical:"Phegopteris connectilis",         cat:"Ferns",            size:"8-15 in H × spreading",      bloom:"—",       color:"Pale green",                  zoneMin:2, zoneMax:7 },

  // ── VINES (30) — zones 6–7 ────────────────────────────────────────────────
  { common:"Virginia Creeper",        botanical:"Parthenocissus quinquefolia",     cat:"Vines",            size:"30-50 ft climbing",           bloom:"Jun-Aug", color:"Scarlet (fall)",              zoneMin:4, zoneMax:9 },
  { common:"Trumpet Vine",            botanical:"Campsis radicans",                cat:"Vines",            size:"30-40 ft climbing",           bloom:"Jun-Sep", color:"Orange-Red",                  zoneMin:4, zoneMax:9 },
  { common:"Coral Honeysuckle",       botanical:"Lonicera sempervirens",           cat:"Vines",            size:"10-20 ft climbing",           bloom:"Mar-Sep", color:"Red-Orange tubular",          zoneMin:4, zoneMax:9 },
  { common:"Crossvine",               botanical:"Bignonia capreolata",             cat:"Vines",            size:"30-50 ft climbing",           bloom:"Apr-May", color:"Orange-Red",                  zoneMin:6, zoneMax:9 },
  { common:"Dutchman's Pipe",         botanical:"Aristolochia macrophylla",        cat:"Vines",            size:"20-30 ft climbing",           bloom:"May-Jun", color:"Pipe-shaped brown-green",     zoneMin:4, zoneMax:8 },
  { common:"Passionflower",           botanical:"Passiflora incarnata",            cat:"Vines",            size:"6-30 ft climbing",            bloom:"Jun-Sep", color:"Lavender intricate",          zoneMin:5, zoneMax:9 },
  { common:"American Bittersweet",    botanical:"Celastrus scandens",              cat:"Vines",            size:"20-30 ft climbing",           bloom:"May-Jun", color:"Orange-red berries",          zoneMin:3, zoneMax:8 },
  { common:"Wild Grape",              botanical:"Vitis riparia",                   cat:"Vines",            size:"20-50 ft climbing",           bloom:"May-Jun", color:"Blue-black edible grapes",    zoneMin:2, zoneMax:8 },
  { common:"Groundnut",               botanical:"Apios americana",                 cat:"Vines",            size:"3-10 ft climbing",            bloom:"Jul-Sep", color:"Maroon-Pink fragrant",        zoneMin:3, zoneMax:9 },
  { common:"American Wisteria",       botanical:"Wisteria frutescens",             cat:"Vines",            size:"15-30 ft climbing",           bloom:"Apr-May", color:"Lilac-Purple",                zoneMin:5, zoneMax:9 },
  { common:"Amethyst Falls Wisteria", botanical:"Wisteria frutescens 'Amethyst Falls'", cat:"Vines",      size:"10-15 ft climbing",           bloom:"May-Jun", color:"Lavender-Purple",             zoneMin:5, zoneMax:9 },
  { common:"Climbing Hydrangea",      botanical:"Hydrangea anomala petiolaris",    cat:"Vines",            size:"30-50 ft climbing",           bloom:"Jun-Jul", color:"White lacecap",               zoneMin:4, zoneMax:7 },
  { common:"Virgin's Bower",          botanical:"Clematis virginiana",             cat:"Vines",            size:"12-20 ft climbing",           bloom:"Jul-Sep", color:"White feathery",              zoneMin:3, zoneMax:9 },
  { common:"Jackman Clematis",        botanical:"Clematis x jackmanii",            cat:"Vines",            size:"8-12 ft climbing",            bloom:"Jun-Sep", color:"Purple",                      zoneMin:4, zoneMax:8 },
  { common:"Sweet Autumn Clematis",   botanical:"Clematis terniflora",             cat:"Vines",            size:"15-30 ft climbing",           bloom:"Aug-Sep", color:"White fragrant",              zoneMin:3, zoneMax:9 },
  { common:"Boston Ivy",              botanical:"Parthenocissus tricuspidata",     cat:"Vines",            size:"30-50 ft climbing",           bloom:"Jun-Jul", color:"Scarlet (fall)",              zoneMin:4, zoneMax:8 },
  { common:"Yellow Trumpet Creeper",  botanical:"Campsis radicans 'Flava'",        cat:"Vines",            size:"25-40 ft climbing",           bloom:"Jun-Sep", color:"Yellow-Orange",               zoneMin:4, zoneMax:9 },
  { common:"Japanese Hydrangea Vine", botanical:"Schizophragma hydrangeoides",     cat:"Vines",            size:"30-45 ft climbing",           bloom:"Jun-Jul", color:"White lacecap",               zoneMin:5, zoneMax:8 },
  { common:"Carolina Jasmine",        botanical:"Gelsemium sempervirens",          cat:"Vines",            size:"10-20 ft climbing",           bloom:"Feb-May", color:"Yellow fragrant",             zoneMin:6, zoneMax:9 },
  { common:"Pipevine",                botanical:"Aristolochia tomentosa",          cat:"Vines",            size:"20-30 ft climbing",           bloom:"May-Jun", color:"Pipe-shaped yellow-green",    zoneMin:5, zoneMax:8 },
  { common:"Moonseed",                botanical:"Menispermum canadense",           cat:"Vines",            size:"10-15 ft climbing",           bloom:"Jun-Jul", color:"White, black berries",        zoneMin:4, zoneMax:8 },
  { common:"Five-leaf Akebia",        botanical:"Akebia quinata",                  cat:"Vines",            size:"20-40 ft climbing",           bloom:"Apr-May", color:"Purple fragrant",             zoneMin:4, zoneMax:8 },
  { common:"Hardy Kiwi",              botanical:"Actinidia kolomikta",             cat:"Vines",            size:"15-20 ft climbing",           bloom:"May-Jun", color:"White, pink-white foliage",   zoneMin:4, zoneMax:8 },
  { common:"Inkberry Vine",           botanical:"Ampelopsis glandulosa",           cat:"Vines",            size:"10-20 ft climbing",           bloom:"Jun-Aug", color:"Blue-black berries",          zoneMin:5, zoneMax:8 },
  { common:"Porcelain Berry",         botanical:"Ampelopsis brevipedunculata",     cat:"Vines",            size:"10-20 ft climbing",           bloom:"Jun-Aug", color:"Turquoise-purple berries",    zoneMin:5, zoneMax:8 },
  { common:"Major Wheeler Honeysuckle", botanical:"Lonicera sempervirens 'Major Wheeler'", cat:"Vines",   size:"8-15 ft climbing",            bloom:"May-Sep", color:"Deep red tubular",            zoneMin:4, zoneMax:9 },
  { common:"Silkvine",                botanical:"Periploca graeca",                cat:"Vines",            size:"20-35 ft climbing",           bloom:"Jun-Jul", color:"Purple-green fragrant",       zoneMin:6, zoneMax:9 },
  { common:"Mountain Hydrangea",      botanical:"Hydrangea serrata",               cat:"Vines",            size:"4-6 ft climbing/mounding",    bloom:"Jun-Sep", color:"White-Pink lacecap",          zoneMin:5, zoneMax:9 },
  { common:"Bittersweet Nightshade",  botanical:"Solanum dulcamara",               cat:"Vines",            size:"6-10 ft climbing",            bloom:"Jun-Sep", color:"Purple, red berries",         zoneMin:3, zoneMax:8 },
  { common:"Hairy Clematis",          botanical:"Clematis terniflora",             cat:"Vines",            size:"15-30 ft climbing",           bloom:"Aug-Sep", color:"White fragrant",              zoneMin:5, zoneMax:9 },
];

// ─────────────────────────────────────────────────────────────────────────────
// VARIETIES — groups LJLA_FAVORITES by base species for in-card dropdown
// ─────────────────────────────────────────────────────────────────────────────
// Extract genus+species key — groups same base species regardless of cultivar/var.
// Splits on: cultivar markers ' " ‘ ’, var. / subsp. / f. designations
// Does NOT split on the letter x — only the × hybrid sign (U+00D7) is ignored
function plantBaseKey(botanical) {
  if (!botanical) return "";
  // strip hybrid × and everything after a cultivar apostrophe or var./subsp./f. marker
  const s = botanical
    .replace(/×\s*/g, "")          // remove × hybrid sign
    .replace(/[\u2018\u2019'"]/g, "\u007C") // turn cultivar quotes into a split marker
    .replace(/\s+(var\.|subsp\.|f\.|cv\.).*$/i, "") // strip var. subsp. etc
    .split("\u007C")[0]                // take base before cultivar
    .trim()
    .toLowerCase();
  // return first two words = genus + species
  return s.split(/\s+/).slice(0, 2).join(" ").trim();
}

// Annotate every LJLA plant with its varietyKey at build time — used for stable VARIETIES_MAP lookup
const LJLA_FAVORITES_KEYED = LJLA_FAVORITES.map((p, i) => ({ ...p, id: p.id ?? `fav_${i}`, varietyKey: plantBaseKey(p.botanical) }));

const VARIETIES_MAP = (() => {
  const map = {};
  for (const p of LJLA_FAVORITES_KEYED) {
    if (!map[p.varietyKey]) map[p.varietyKey] = [];
    map[p.varietyKey].push(p);
  }
  for (const key of Object.keys(map)) {
    if (map[key].length < 2) delete map[key];
  }
  return map;
})();

function getMergedLookup() {
  const favBotanicals = new Set(LJLA_FAVORITES_KEYED.map(p => p.botanical));
  const base = LOCAL_PLANT_LOOKUP
    .filter(p => !favBotanicals.has(p.botanical))
    .map((p, i) => p.id != null ? p : { ...p, id: `local_${i}` });
  return [...LJLA_FAVORITES_KEYED, ...base];
}

// Zone string to number: "6b" → 6.5, "6a" → 6.0
function zoneToNum(z) {
  if (!z) return 6;
  const n = parseFloat(z);
  return isNaN(n) ? 6 : n + (z.endsWith("b") ? 0.5 : 0);
}

// Look up a plant by name (common or partial botanical) in the local dict
function localPlantLookup(name, zone) {
  const q = name.toLowerCase().trim();
  const zn = zoneToNum(zone);
  // Try exact common name first, then partial match
  const merged = getMergedLookup();
  let match = merged.find(p => p.common.toLowerCase() === q)
    || merged.find(p => p.botanical.toLowerCase() === q)
    || merged.find(p => p.common.toLowerCase().includes(q) || q.includes(p.common.toLowerCase().split(" ")[0]))
    || merged.find(p => p.botanical.toLowerCase().includes(q.split(" ")[0]));
  if (!match) return null;
  const zoneOk = zn >= match.zoneMin && zn <= match.zoneMax;
  return {
    botanical: match.botanical,
    common: match.common,
    cat: match.cat,
    size: match.size,
    bloom: match.bloom,
    color: match.color,
    zoneOk,
    conditionsOk: true,
    warning: zoneOk ? null : `Typically suited to zones ${match.zoneMin}–${match.zoneMax}; verify for zone ${zone}`,
    favorite: false,
    manual: true,
  };
}

async function verifyPlant({ name, zone, sun, moisture, slope, use, styles, onDebug = null }) {
  const siteDesc = [sun, moisture, slope].filter(Boolean).join(", ");
  const useDesc  = use?.length ? use.join(", ") : null;

  const prompt = `You are a landscape architect's plant assistant. The user has typed something into an "add plant" field. It may be:
- An exact species name (common or botanical): return that plant.
- A partial or approximate name: return the best matching species.
- A descriptive request (e.g. "tall purple flowering perennial", "something for screening with fall color"): recommend the single most appropriate species for the site.

User input: "${name}"
Site: USDA Zone ${zone}${siteDesc ? ", " + siteDesc : ""}${useDesc ? ", use: " + useDesc : ""}

Return ONLY a JSON object, no markdown, no explanation:
{"botanical":"Latin name","common":"common name","cat":"Deciduous Trees|Evergreen Trees|Deciduous Shrubs|Evergreen Shrubs|Perennials|Grasses|Groundcovers|Ferns|Vines","size":"H × W or climbing distance","bloom":"Mon-Mon or —","color":"brief color/interest description","zoneOk":true|false,"conditionsOk":true|false,"warning":null|"brief note if mismatch","favorite":false,"manual":true}

Rules:
- Always return a real, commercially available species — never null.
- zoneOk: true if the species is appropriate for zone ${zone}.
- conditionsOk: true if it suits the site conditions.
- warning: short note only if there is a meaningful concern; otherwise null.
- For descriptive requests, pick the single best match; do not explain your reasoning.`;

  try {
    const text = await claudeAPI(prompt, 500, onDebug, "manual-add");
    const clean = text.replace(/^```json|^```|```$/gm, "").trim();
    const result = JSON.parse(clean);
    if (!result.botanical) throw new Error("no botanical");
    return result;
  } catch (e) {
    // Fall back to local dictionary for exact name matches
    const local = localPlantLookup(name, zone);
    if (local) return local;
    throw new Error("Could not identify a plant from that input. Try a species name or be more specific.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; -webkit-font-smoothing: antialiased; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  ::selection { background: #E8EFF5; }
  @keyframes spin  { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; transform:translateY(3px); } to { opacity:1; transform:translateY(0); } }
  input, button, textarea { font-family: inherit; }
  input:focus { outline: none; border-color: #1B3353 !important; }
  button:focus-visible { outline: 1px solid #1B3353; outline-offset: 2px; }
  .fade-in { animation: fadeIn 0.2s ease forwards; }
`;

function Spinner() {
  return <span style={{ display:"inline-block", animation:"spin 0.9s linear infinite", fontSize:13 }}>◌</span>;
}

function Label({ children, muted }) {
  return (
    <div style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: muted ? T.inkLight : T.inkMid, marginBottom: 9 }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, variant = "ghost", disabled, small, style: extra = {} }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
    fontFamily: T.sans, fontWeight: 300, letterSpacing: "0.04em",
    cursor: disabled ? "not-allowed" : "pointer",
    border: "none", outline: "none", transition: "all 0.12s",
    opacity: disabled ? 0.4 : 1,
    padding: small ? "5px 13px" : "8px 18px",
    fontSize: small ? 11 : 12,
    borderRadius: 0,
    ...extra,
  };
  const styles = {
    primary: { background: T.accent,    color: "#fff" },
    ghost:   { background: "transparent", color: T.inkMid, border: `1px solid ${T.border}` },
    subtle:  { background: T.accentTint, color: T.accent,  border: `1px solid ${T.border}` },
    link:    { background: "transparent", color: T.accent,  padding: 0, fontWeight: 300, fontSize: small ? 11 : 12 },
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ ...base, ...styles[variant] }}
      onMouseEnter={e => { if (!disabled && variant === "primary") e.currentTarget.style.background = T.accentHover; }}
      onMouseLeave={e => { if (!disabled && variant === "primary") e.currentTarget.style.background = T.accent; }}>
      {children}
    </button>
  );
}

function Input({ value, onChange, placeholder, width, onKeyDown, autoFocus, style: extra = {} }) {
  return (
    <input value={value} onChange={onChange} onKeyDown={onKeyDown} placeholder={placeholder} autoFocus={autoFocus}
      style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 300, color: T.ink, background: "#fff",
        border: `1px solid ${T.border}`, borderRadius: 0, padding: "9px 11px",
        width: width || "100%", ...extra }} />
  );
}

function Divider() {
  return <div style={{ borderTop: `1px solid ${T.border}`, margin: "20px 0" }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANT DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────

function PlantDetailModal({ plant, locked, onToggleLock, onRemove, onChangeVariety, onClose }) {
  const c = CAT[plant.cat] || { ink: T.accent };
  const toxicity = getPlantToxicity(plant.botanical);
  const imgUrl = usePlantImage(plant.botanical);
  const varieties = VARIETIES_MAP[plant.varietyKey || plantBaseKey(plant.botanical)] || null;
  const hasVarieties = varieties && varieties.length > 1;

  // Close on backdrop click or Escape key
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const Row = ({ label, value }) => value ? (
    <div style={{ display: "flex", gap: 12, marginBottom: 6 }}>
      <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 500, letterSpacing: "0.12em",
        textTransform: "uppercase", color: T.inkLight, width: 80, flexShrink: 0, paddingTop: 1 }}>
        {label}
      </span>
      <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 300, color: T.ink, lineHeight: 1.4 }}>
        {value}
      </span>
    </div>
  ) : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", width: "100%", maxWidth: 560,
          maxHeight: "90vh", overflowY: "auto",
          display: "flex", flexDirection: "column",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}>
        {/* accent rule */}
        <div style={{ height: 3, background: c.ink, flexShrink: 0 }} />

        {/* image */}
        <div style={{ width: "100%", paddingTop: "50%", position: "relative", background: T.surfaceAlt, flexShrink: 0 }}>
          <div style={{ position: "absolute", inset: 0 }}>
            {imgUrl
              ? <img src={imgUrl} alt={plant.common}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                  justifyContent: "center", color: T.inkLight, opacity: 0.15, fontSize: 40 }}>⬡</div>
            }
          </div>
          {/* close button */}
          <button type="button" onClick={onClose}
            style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.9)",
              border: "none", cursor: "pointer", width: 28, height: 28, fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center", color: T.ink }}
            onMouseEnter={e => e.currentTarget.style.background = "#fff"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.9)"}>
            ×
          </button>
        </div>

        {/* header */}
        <div style={{ padding: "20px 24px 12px" }}>
          {hasVarieties ? (
            <select value={plant.botanical}
              onChange={e => {
                const chosen = varieties.find(v => v.botanical === e.target.value);
                if (chosen && onChangeVariety) onChangeVariety(plant.id, chosen);
              }}
              style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 300, color: T.ink,
                background: "transparent", border: "none", borderBottom: `1px solid ${T.borderMid}`,
                padding: "0 20px 2px 0", cursor: "pointer", appearance: "none",
                width: "100%", marginBottom: 4 }}>
              {varieties.map(v => <option key={v.botanical} value={v.botanical}>{v.common}</option>)}
            </select>
          ) : (
            <div style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 300, color: T.ink, marginBottom: 4 }}>
              {plant.common}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a href={`https://www.google.com/search?q=${encodeURIComponent(plant.botanical + " plant")}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 300, fontStyle: "italic",
                color: T.inkMid, textDecoration: "none" }}
              onMouseEnter={e => e.currentTarget.style.color = T.accent}
              onMouseLeave={e => e.currentTarget.style.color = T.inkMid}>
              {plant.botanical}
            </a>
            {toxicity && (
              <span
                title={toxicity.note}
                style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 400,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  color: toxicity.severity === "high" ? T.red : toxicity.severity === "moderate" ? "#A07030" : T.inkLight,
                  cursor: "help" }}>
                {toxicity.severity === "high" ? "Toxic" : "Toxic"} · {toxicity.who === "both" ? "humans & pets" : toxicity.who === "pets" ? "pets" : "contact"}
              </span>
            )}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${T.border}`, margin: "0 24px" }} />

        {/* details */}
        <div style={{ padding: "16px 24px 20px" }}>
          <Row label="Category"  value={plant.cat} />
          <Row label="Size"      value={plant.size} />
          <Row label="Bloom"     value={plant.bloom && plant.bloom !== "—" ? plant.bloom : null} />
          <Row label="Color"     value={plant.color} />
          <Row label="Sun"       value={plant.sun?.join(", ")} />
          <Row label="Moisture"  value={plant.moisture?.join(", ")} />
          <Row label="Zones"     value={plant.zoneMin && plant.zoneMax ? `${plant.zoneMin}–${plant.zoneMax}` : plant.zones?.join(", ")} />
          {plant.styles?.length > 0 && (
            <Row label="Styles" value={[...new Set(plant.styles)].join(", ")} />
          )}
          {plant.use?.length > 0 && (
            <Row label="Use" value={plant.use.join(", ")} />
          )}
        </div>

        {/* action bar */}
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 24px",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {onToggleLock && (
              <button type="button" onClick={() => { onToggleLock(plant.id); }}
                style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 300, letterSpacing: "0.08em",
                  background: locked ? T.accent : "transparent",
                  color: locked ? "#fff" : T.inkMid,
                  border: `1px solid ${locked ? T.accent : T.border}`,
                  padding: "6px 14px", cursor: "pointer" }}>
                {locked ? "● Locked" : "○ Lock"}
              </button>
            )}
            {!locked && onRemove && (
              <button type="button"
                onClick={() => { onRemove(plant.id); onClose(); }}
                style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 300, letterSpacing: "0.08em",
                  background: "transparent", color: T.red,
                  border: `1px solid ${T.border}`,
                  padding: "6px 14px", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.red}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
                Remove
              </button>
            )}
          </div>
          <button type="button" onClick={onClose}
            style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 300, letterSpacing: "0.08em",
              background: "transparent", color: T.inkMid,
              border: `1px solid ${T.border}`,
              padding: "6px 14px", cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PLANT CARD — catalog / specimen sheet aesthetic
// ─────────────────────────────────────────────────────────────────────────────


// ── PLANT IMAGE — direct Wikimedia Commons img src, no fetch needed ──────────


function usePlantImage(botanical) {
  const [imgUrl, setImgUrl] = useState(IMG_CACHE[botanical] ?? null);
  useEffect(() => {
    if (!botanical) return;
    if (IMG_CACHE[botanical] !== undefined) { setImgUrl(IMG_CACHE[botanical]); return; }
    IMG_CACHE[botanical] = null;
    // Use the MediaWiki action API with &origin=* — this endpoint is CORS-enabled
    // and works from sandboxed iframes, unlike the REST summary endpoint.
    const title = botanical.replace(/ /g, "_").replace(/[×]/g, "");
    const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&pithumbsize=400&origin=*`;
    fetch(url)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const pages = data?.query?.pages || {};
        const page  = Object.values(pages)[0];
        const src   = page?.thumbnail?.source || null;
        IMG_CACHE[botanical] = src;
        setImgUrl(src);
      })
      .catch(() => { IMG_CACHE[botanical] = null; });
  }, [botanical]);
  return imgUrl;
}

function PlantCard({ plant, locked, onToggleLock, onRemove, onChangeVariety, gridSize = 3, onSelect }) {
  const c = CAT[plant.cat] || { ink: T.accent };
  const toxicity = getPlantToxicity(plant.botanical);
  const varieties = VARIETIES_MAP[plant.varietyKey || plantBaseKey(plant.botanical)] || null;
  const hasVarieties = varieties && varieties.length > 1;
  const imgUrl = usePlantImage(plant.botanical);

  const infoSize = gridSize <= 3 ? 11 : 10;
  // Info panel height is fixed so all cards are uniform
  const infoPad = gridSize >= 4 ? "6px 8px" : "8px 10px";

  return (
    <div className="fade-in" onClick={() => onSelect && onSelect(plant)} style={{
      display: "flex", flexDirection: "column",
      background: locked ? T.accentTint : "#fff",
      border: `1px solid ${T.border}`,
      transition: "background 0.15s",
      overflow: "hidden",
      cursor: onSelect ? "pointer" : "default",
    }}>
      {/* top accent rule */}
      <div style={{ height: 2, background: c.ink, opacity: locked ? 0.8 : 0.4, flexShrink: 0 }} />

      {/* square image via padding-top trick */}
      <div style={{ width: "100%", paddingTop: "100%", position: "relative", flexShrink: 0, background: T.surfaceAlt, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          {imgUrl
            ? <img src={imgUrl} alt={plant.common}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{
                width: "100%", height: "100%", display: "flex",
                alignItems: "center", justifyContent: "center",
                color: T.inkLight, opacity: 0.2, fontSize: 22,
              }}>⬡</div>
          }
        </div>
        {/* lock / remove overlay buttons top-right */}
        <div style={{ position: "absolute", top: 4, right: 4, display: "flex", flexDirection: "column", gap: 2 }}>
          {onToggleLock && (
            <button type="button" onClick={e => { e.stopPropagation(); onToggleLock(plant.id); }}
              title={locked ? "Unlock" : "Lock — survives regenerate"}
              style={{
                background: locked ? T.accent : "rgba(255,255,255,0.82)",
                border: "none", cursor: "pointer",
                color: locked ? "#fff" : T.inkMid,
                fontSize: 9, width: 20, height: 20,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.12s",
              }}>
              {locked ? "●" : "○"}
            </button>
          )}
          {!locked && onRemove && (
            <button type="button" onClick={e => { e.stopPropagation(); onRemove(plant.id); }} title="Remove"
              style={{
                background: "rgba(255,255,255,0.82)", border: "none",
                cursor: "pointer", color: T.inkMid, fontSize: 14, width: 20, height: 20,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.red; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.82)"; e.currentTarget.style.color = T.inkMid; }}>
              ×
            </button>
          )}
        </div>
      </div>

      {/* info strip — fixed height so all cards match */}
      <div style={{ padding: infoPad, height: 68, boxSizing: "border-box", overflow: "hidden", flexShrink: 0 }}>

        {/* common name row — with toxicity skull inline */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 2 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {hasVarieties ? (
              <select value={plant.botanical}
                onClick={e => e.stopPropagation()}
                onChange={e => {
                  e.stopPropagation();
                  const chosen = varieties.find(v => v.botanical === e.target.value);
                  if (chosen && onChangeVariety) onChangeVariety(plant.id, chosen);
                }}
                style={{ fontFamily: T.sans, fontSize: infoSize, fontWeight: 400, color: T.ink,
                  background: "transparent", border: "none", borderBottom: `1px solid ${T.borderMid}`,
                  padding: "0 12px 1px 0", cursor: "pointer", appearance: "none", width: "100%" }}>
                {varieties.map(v => <option key={v.botanical} value={v.botanical}>{v.common}</option>)}
              </select>
            ) : (
              <div style={{ fontFamily: T.sans, fontSize: infoSize, fontWeight: 400, color: T.ink,
                lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis",
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {plant.common}
                {plant.manual && plant.zoneOk === false && (
                  <span style={{ fontSize: 8, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: T.red, marginLeft: 4 }}>Zone</span>
                )}
              </div>
            )}
          </div>
          {toxicity && (
            <span
              title={`Toxic — ${toxicity.note}`}
              style={{
                display: "inline-block",
                width: 5, height: 5, borderRadius: "50%",
                background: toxicity.severity === "high" ? T.red : toxicity.severity === "moderate" ? "#A07030" : T.inkLight,
                flexShrink: 0, marginTop: 4, cursor: "help",
                opacity: toxicity.severity === "mild" ? 0.5 : 1,
              }} />
          )}
        </div>

        {/* botanical name — plain text in card; link only in detail modal */}
        <div style={{ fontFamily: T.sans, fontSize: infoSize - 1, fontWeight: 300, fontStyle: "italic",
          color: T.inkLight, display: "block",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {plant.botanical}
        </div>

        {/* bloom / size — only at larger sizes */}
        {gridSize <= 4 && (
          <div style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 300, color: T.inkLight,
            marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {plant.size}{plant.bloom && plant.bloom !== "—" ? ` · ${plant.bloom}` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY SECTION
// ─────────────────────────────────────────────────────────────────────────────

function CategorySection({ name, plants, lockedIds, onToggleLock, onRemove, onAdd, adding, addError, onChangeVariety, gridSize, onSelect }) {
  const c = CAT[name] || { ink: T.accent };
  const atMax = plants.length >= MAX_PER_CAT;
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: c.ink }}>{name}</span>
          <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.inkLight }}>{plants.length} / {MAX_PER_CAT}</span>
        </div>
        {!atMax && (
          <button type="button" onClick={() => { if (!adding) onAdd(name); }} disabled={adding}
            style={{ background: "none", border: "none", cursor: adding ? "default" : "pointer", fontFamily: T.sans, fontSize: 10, fontWeight: 300, letterSpacing: "0.03em", color: adding ? T.inkLight : T.accent, display: "flex", alignItems: "center", gap: 4, padding: 0 }}>
            {adding ? <><Spinner /> finding…</> : `+ add ${SING[name]}`}
          </button>
        )}
      </div>
      <div style={{ borderTop: `1px solid ${c.ink}`, opacity: 0.2 }} />
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${gridSize || 3}, 1fr)`,
        gap: 2,
        marginTop: 2,
        width: "100%",
        boxSizing: "border-box",
      }}>
        {[...plants]
          .sort((a, b) => {
            const aLocked = lockedIds?.has(a.id) ? 0 : 1;
            const bLocked = lockedIds?.has(b.id) ? 0 : 1;
            if (aLocked !== bLocked) return aLocked - bLocked;
            return a.common.localeCompare(b.common);
          })
          .map(p => (
            <PlantCard key={p.id} plant={p} locked={lockedIds?.has(p.id)}
              onToggleLock={onToggleLock} onRemove={onRemove} onChangeVariety={onChangeVariety}
              gridSize={gridSize || 3} onSelect={onSelect} />
          ))
        }
      </div>
      {addError && (
        <div style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 300, color: T.red, padding: "6px 0" }}>{addError}</div>
      )}
      {atMax && (
        <div style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 300, color: T.inkLight, padding: "8px 0", textAlign: "center" }}>Maximum {MAX_PER_CAT} reached</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ZoneModal({ initial, onSave, onClose }) {
  const [name,     setName]     = useState(initial?.name     || "");
  const [sun,      setSun]      = useState(initial?.sun      || "");
  const [moisture, setMoisture] = useState(initial?.moisture || "");
  const [slope,    setSlope]    = useState(initial?.slope    || "");
  const [soil,     setSoil]     = useState(initial?.soil     || "");
  const [use,      setUse]      = useState(initial?.use      || []);

  const toggleUse = u => setUse(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);
  const canSave = name.trim();

  const PillRow = ({ opts, val, set }) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {opts.map(o => {
        const active = val === o;
        return (
          <button key={o} type="button" onClick={() => set(o)}
            style={{ padding: "5px 13px", fontFamily: T.sans, fontSize: 11, fontWeight: 300, cursor: "pointer",
              background: active ? T.accent : "transparent", color: active ? "#fff" : T.inkMid,
              border: `1px solid ${active ? T.accent : T.border}`, borderRadius: 0, transition: "all 0.12s" }}>
            {o}
          </button>
        );
      })}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", width: 540, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 300, letterSpacing: "0.06em", textTransform: "uppercase", color: T.ink }}>{initial ? "Edit Zone" : "Add Planting Zone"}</span>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkLight, fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>
        <div style={{ padding: "24px" }}>
          <div style={{ marginBottom: 20 }}>
            <Label>Zone label</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Front Entry, Rain Garden…" autoFocus />
          </div>
          <div style={{ marginBottom: 20 }}>
            <Label>Sun exposure <span style={{fontFamily:T.sans,fontSize:10,fontWeight:300,color:T.inkLight,fontStyle:"italic",marginLeft:6}}>optional</span></Label>
            <PillRow opts={SUN_OPTIONS} val={sun} set={setSun} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <Label>Soil moisture <span style={{fontFamily:T.sans,fontSize:10,fontWeight:300,color:T.inkLight,fontStyle:"italic",marginLeft:6}}>optional</span></Label>
            <PillRow opts={MOISTURE_OPTIONS} val={moisture} set={setMoisture} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <Label>Slope / drainage <span style={{fontFamily:T.sans,fontSize:10,fontWeight:300,color:T.inkLight,fontStyle:"italic",marginLeft:6}}>optional</span></Label>
            <PillRow opts={SLOPE_OPTIONS} val={slope} set={setSlope} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
              <Label style={{ marginBottom: 0 }}>Soil type</Label>
              <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.inkLight, fontStyle: "italic" }}>optional</span>
            </div>
            <PillRow opts={SOIL_OPTIONS} val={soil} set={v => setSoil(prev => prev === v ? "" : v)} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <Label>Primary use — select all that apply <span style={{fontFamily:T.sans,fontSize:10,fontWeight:300,color:T.inkLight,fontStyle:"italic",marginLeft:6}}>optional</span></Label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {USE_OPTIONS.map(u => {
                const active = use.includes(u);
                return (
                  <button key={u} type="button" onClick={() => toggleUse(u)}
                    style={{ padding: "5px 12px", fontFamily: T.sans, fontSize: 11, fontWeight: 300, cursor: "pointer",
                      background: active ? T.accentTint : "transparent", color: active ? T.accent : T.inkMid,
                      border: `1px solid ${active ? T.accent : T.border}`, borderRadius: 0, transition: "all 0.12s" }}>
                    {u}
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn onClick={onClose} variant="ghost">Cancel</Btn>
            <Btn onClick={() => canSave && onSave({ name: name.trim(), sun, moisture, slope, soil, use })} variant="primary" disabled={!canSave}>
              {initial ? "Save Changes" : "Add Zone"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREENS
// ─────────────────────────────────────────────────────────────────────────────

function ProjectsScreen({ projects, onNew, onOpen }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 40, paddingBottom: 24, borderBottom: `1px solid ${T.border}` }}>
        <div>
          <div style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 300, letterSpacing: "0.16em", textTransform: "uppercase", color: T.inkMid, marginBottom: 10 }}>Planting Palette Studio</div>
          <div style={{ fontFamily: T.sans, fontSize: 28, fontWeight: 300, color: T.ink, letterSpacing: "-0.01em", lineHeight: 1 }}>Projects</div>
        </div>
        <Btn onClick={onNew} variant="primary">+ New Project</Btn>
      </div>

      {projects.length === 0 ? (
        <div style={{ padding: "64px 0", textAlign: "center" }}>
          <div style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 300, color: T.inkLight, marginBottom: 20 }}>No projects yet. Create your first to begin.</div>
          <Btn onClick={onNew} variant="primary">+ New Project</Btn>
        </div>
      ) : (
        <div>
          {projects.map((p) => (
            <div key={p.id} onClick={() => onOpen(p)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: `1px solid ${T.border}`, cursor: "pointer", transition: "padding-left 0.12s", gap: 16 }}
              onMouseEnter={e => { e.currentTarget.style.paddingLeft = "8px"; e.currentTarget.style.color = T.accent; }}
              onMouseLeave={e => { e.currentTarget.style.paddingLeft = "0px"; e.currentTarget.style.color = ""; }}>
              <div>
                <div style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 300, color: T.ink, letterSpacing: "0.01em" }}>{p.name}</div>
                <div style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 300, color: T.inkMid, marginTop: 3, letterSpacing: "0.02em" }}>
                  {p.type && <>{p.type} · </>}ZIP {p.municipality} · Zone {p.zone} · {p.zones.length} {p.zones.length === 1 ? "zone" : "zones"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end", flexShrink: 0 }}>
                {p.styles.map(s => (
                  <span key={s} style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 300, letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkMid, border: `1px solid ${T.border}`, padding: "3px 8px" }}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const PROJECT_TYPES = [
  "Residential",
  "Multi-Family Residential",
  "Commercial",
  "Civic / Institutional",
  "Hospitality",
  "Academic",
  "Healthcare",
  "Mixed-Use",
  "Parks & Open Space",
  "Other",
];

// Styles that are strongly incongruous with a project type are dimmed (not hidden).
// Everything remains selectable — this is guidance, not enforcement.
const STYLE_CONFLICTS = {
  "Residential":              [],
  "Multi-Family Residential": ["Meadow", "Naturalistic"],
  "Commercial":               ["Romantic", "Meadow"],
  "Civic / Institutional":    ["Romantic", "Ornamental"],
  "Hospitality":              [],
  "Academic":                 ["Ornamental"],
  "Healthcare":               [],
  "Mixed-Use":                ["Meadow", "Romantic"],
  "Parks & Open Space":       ["Ornamental", "Formal"],
  "Other":                    [],
};

function NewProjectScreen({ onSave, onCancel }) {
  const [name,        setName]        = useState("");
  const [zip,         setZip]         = useState("");
  const [projectType, setProjectType] = useState("");
  const [styles,      setStyles]      = useState([]);
  const [suggestApplied, setSuggestApplied] = useState(false);

  const zone = getZoneFromZip(zip);
  const zipOk = zip.length === 5 && !!zone;
  const suggested = getSuggestedStyles(zip, projectType);
  const canSave = name.trim() && zipOk && projectType && styles.length > 0;

  const toggleStyle = s => setStyles(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  // Auto-apply suggestions when ZIP resolves — only once per ZIP
  React.useEffect(() => {
    if (zipOk && suggested.length > 0 && !suggestApplied) {
      setStyles(suggested);
      setSuggestApplied(true);
    }
  }, [zipOk]);

  // Reset suggestion flag if ZIP changes
  React.useEffect(() => { setSuggestApplied(false); }, [zip]);

  return (
    <div>
      <Btn onClick={onCancel} variant="link" small style={{ marginBottom: 16, color: T.inkLight }}>← Back</Btn>
      <div style={{ fontFamily: T.sans, fontSize: 30, fontWeight: 300, color: T.ink, marginBottom: 4 }}>New Project</div>
      <div style={{ fontFamily: T.sans, fontSize: 13, color: T.inkMid, fontWeight: 300, marginBottom: 32 }}>
        Zone and style apply across all planting zones in this project.
      </div>

      <div style={{ maxWidth: 520 }}>
        <div style={{ marginBottom: 24 }}>
          <Label>Project name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Riverside Residence" autoFocus />
        </div>

        <div style={{ marginBottom: 24 }}>
          <Label>Project type</Label>
          <select value={projectType} onChange={e => setProjectType(e.target.value)}
            style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 300, color: projectType ? T.ink : T.inkLight,
              background: "#fff", border: `1px solid ${T.border}`, borderRadius: 0,
              padding: "9px 11px", width: "100%", cursor: "pointer" }}>
            <option value="">Select type…</option>
            {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Label>Zip code</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Input value={zip} onChange={e => setZip(e.target.value.replace(/\D/g,"").slice(0,5))} placeholder="e.g. 02101" width={140} style={{ letterSpacing: "0.08em" }} />
            {zip.length === 5 && (
              zipOk
                ? <span style={{ fontFamily: T.sans, fontSize: 12, color: T.accent }}>Zone {zone}</span>
                : <span style={{ fontFamily: T.sans, fontSize: 12, color: T.red }}>Not recognized</span>
            )}
          </div>
          {zipOk && suggested.length > 0 && (
            <div style={{ marginTop: 8, fontFamily: T.sans, fontSize: 11, fontWeight: 300, color: T.inkMid }}>
              Suggested for this region: {suggested.join(", ")} — adjust below as needed.
            </div>
          )}
        </div>

        <div style={{ marginBottom: 32 }}>
          <Label>Design style — select all that apply</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: T.border }}>
            {DESIGN_STYLES.map(s => {
              const active = styles.includes(s.name);
              const conflicts = STYLE_CONFLICTS[projectType] || [];
              const dimmed = !active && conflicts.includes(s.name);
              return (
                <div key={s.name} onClick={() => toggleStyle(s.name)}
                  style={{ padding: "11px 14px", cursor: "pointer", opacity: dimmed ? 0.4 : 1,
                    background: active ? T.accentTint : "#fff", transition: "background 0.1s, opacity 0.15s",
                    display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 12, height: 12, border: `1px solid ${active ? T.accent : T.borderMid}`, background: active ? T.accent : "transparent", flexShrink: 0, marginTop: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {active && <span style={{ color: "#fff", fontSize: 8, lineHeight: 1 }}>✓</span>}
                  </div>
                  <div>
                    <div style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 300, color: T.ink, letterSpacing: "0.02em" }}>{s.name}</div>
                    <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.inkLight, marginTop: 2 }}>{s.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {projectType && (STYLE_CONFLICTS[projectType] || []).length > 0 && (
            <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.inkLight, marginTop: 8 }}>
              Dimmed styles are atypical for {projectType} projects — still selectable if intentional.
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
          <Btn onClick={() => canSave && onSave({ name: name.trim(), municipality: zip, zone, type: projectType, styles, zones: [] })} variant="primary" disabled={!canSave}>
            Create Project
          </Btn>
        </div>
      </div>
    </div>
  );
}

function ProjectScreen({ project, onBack, onAddZone, onOpenZone, onEditZone }) {
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [editingZoneIdx, setEditingZoneIdx] = useState(null);

  function handleSaveZone(data) {
    if (editingZoneIdx !== null) {
      onEditZone(editingZoneIdx, data);
    } else {
      onAddZone(data);
    }
    setShowZoneModal(false);
    setEditingZoneIdx(null);
  }

  const existingZone = editingZoneIdx !== null ? project.zones[editingZoneIdx] : null;

  return (
    <div>
      {showZoneModal && (
        <ZoneModal initial={existingZone} onSave={handleSaveZone} onClose={() => { setShowZoneModal(false); setEditingZoneIdx(null); }} />
      )}

      <Btn onClick={onBack} variant="link" small style={{ marginBottom: 16, color: T.inkLight }}>← Projects</Btn>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16 }}>
        <div>
          <div style={{ fontFamily: T.sans, fontSize: 30, fontWeight: 300, color: T.ink, lineHeight: 1.05 }}>{project.name}</div>
          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.inkMid, marginTop: 5, fontWeight: 300 }}>
            {project.type && <>{project.type} · </>}ZIP {project.municipality} · USDA Zone {project.zone}
            <span style={{ margin: "0 8px", color: T.border }}>|</span>
            {project.styles.join(", ")}
          </div>
        </div>
        <Btn onClick={() => { setEditingZoneIdx(null); setShowZoneModal(true); }} variant="subtle" small>+ Add Zone</Btn>
      </div>

      {project.zones.length === 0 ? (
        <div style={{ borderTop: `1px solid ${T.border}`, padding: "48px 0", textAlign: "center" }}>
          <div style={{ fontFamily: T.sans, fontStyle: "italic", fontSize: 20, fontWeight: 300, color: T.inkLight, marginBottom: 8 }}>No planting zones</div>
          <div style={{ fontFamily: T.sans, fontSize: 13, color: T.inkLight, fontWeight: 300, marginBottom: 20 }}>Add a zone to start building your palette.</div>
          <Btn onClick={() => setShowZoneModal(true)} variant="primary">+ Add Zone</Btn>
        </div>
      ) : (
        <div>
          {project.zones.map((z, i) => (
            <div key={i} style={{ borderTop: `1px solid ${T.border}`, padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div onClick={() => onOpenZone(i)} style={{ cursor: "pointer", flex: 1 }}>
                <div style={{ fontFamily: T.sans, fontSize: 17, fontWeight: 300, color: T.ink }}>{z.name}</div>
                <div style={{ fontFamily: T.sans, fontSize: 11, color: T.inkMid, marginTop: 3, fontWeight: 300 }}>
                  {z.sun} · {z.moisture} · {z.slope}{z.soil ? ` · ${z.soil}` : ""}
                  {z.use?.length ? ` · ${z.use.join(", ")}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Btn onClick={() => { setEditingZoneIdx(i); setShowZoneModal(true); }} variant="ghost" small>Edit</Btn>
                <Btn onClick={() => onOpenZone(i)} variant="subtle" small>Open Palette →</Btn>
              </div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${T.border}` }} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ZONE PALETTE VIEW
// ─────────────────────────────────────────────────────────────────────────────

function ZonePaletteView({ zone, projectZone, projectStyles, onBack }) {
  const useArr = Array.isArray(zone.use) ? zone.use : [zone.use];
  const siteArgs = { zone: projectZone, styles: projectStyles, sun: zone.sun, moisture: zone.moisture, use: useArr, slope: zone.slope, soil: zone.soil || "" };

  // ── state ──
  const [catActive, setCatActive] = useState(() => Object.fromEntries(CATEGORIES.map(c => [c, []])));
  const [catPool,   setCatPool]   = useState(() => Object.fromEntries(CATEGORIES.map(c => [c, []])));
  const [lockedIds,      setLockedIds]      = useState(new Set());
  const [loadingCats,    setLoadingCats]    = useState(new Set());
  const [addErrors,      setAddErrors]      = useState({});
  const [isPopulating,   setIsPopulating]   = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenNote,      setRegenNote]      = useState(null);
  const [showDiscovery,  setShowDiscovery]  = useState(false);
  const [showExport,     setShowExport]     = useState(false);
  const [gridSize,       setGridSize]       = useState(3);
  const [selectedPlant,  setSelectedPlant]  = useState(null);
  const [manualInput,    setManualInput]    = useState("");
  const [showManual,     setShowManual]     = useState(false);
  const [manualPending,  setManualPending]  = useState(false);
  const [manualError,    setManualError]    = useState(null);
  const [debugLog,       setDebugLog]       = useState([]);
  const [showDebug,      setShowDebug]      = useState(false);
  const addDebug = React.useCallback(entry => setDebugLog(prev => [entry, ...prev].slice(0, 20)), []);

  // ── precedent scan state ──
  const [showPrecedent,    setShowPrecedent]    = useState(false);
  const [precedentFile,    setPrecedentFile]    = useState(null);
  const [precedentPreview, setPrecedentPreview] = useState(null);
  const [precedentScanning,setPrecedentScanning]= useState(false);
  const [precedentResults, setPrecedentResults] = useState(null);  // { found: [{common,botanical,cat,notes}], raw }
  const [precedentError,   setPrecedentError]   = useState(null);
  const [precedentAdded,   setPrecedentAdded]   = useState(new Set()); // botanicals added this session
  const fileInputRef = React.useRef(null);

  // refs so async callbacks always read current state
  const activeRef    = React.useRef(catActive);
  const poolRef      = React.useRef(catPool);
  const lockedIdsRef = React.useRef(lockedIds);
  React.useEffect(() => { activeRef.current    = catActive; }, [catActive]);
  React.useEffect(() => { poolRef.current      = catPool;   }, [catPool]);
  React.useEffect(() => { lockedIdsRef.current = lockedIds; }, [lockedIds]);

  // ── auto-populate on mount — local DB instant, AI upgrades pool silently ──
  React.useEffect(() => {
    let cancelled = false;
    async function populate() {
      // 1. Local DB immediately — favorites first, then rest
      const zn   = zoneToNum(String(siteArgs.zone));
      const sun  = siteArgs.sun || "";
      const mois = siteArgs.moisture || "";
      const full = getMergedLookup();

      // Filter helper with cascading fallback so thin categories still populate
      function filterForZone(relaxSun, relaxMoisture) {
        return full.filter(p => {
          if (zn < p.zoneMin || zn > p.zoneMax) return false;
          if (!relaxSun && sun && p.sun?.length && !p.sun.includes(sun)) return false;
          if (!relaxMoisture && mois && p.moisture?.length && !p.moisture.includes(mois)) return false;
          return true;
        });
      }

      // Use strictest match first; fall back per-category if pool too thin
      const strict  = filterForZone(false, false);
      const noSun   = filterForZone(true,  false);  // relax sun only
      const noMois  = filterForZone(false, true);   // relax moisture only
      const zoneOnly= filterForZone(true,  true);   // zone-only fallback

      // For each category, pick the tightest filter that has ≥ DEFAULT_PER_CAT plants
      const merged = {};
      CATEGORIES.forEach(cat => {
        const s  = strict.filter(p => p.cat === cat);
        const ns = noSun.filter(p => p.cat === cat);
        const nm = noMois.filter(p => p.cat === cat);
        const zo = zoneOnly.filter(p => p.cat === cat);
        merged[cat] = s.length >= DEFAULT_PER_CAT ? s
          : ns.length >= s.length ? ns
          : nm.length >= s.length ? nm
          : zo;
      });

      // Flatten to single sorted array: favorites first, then alpha
      const all = CATEGORIES.flatMap(cat => merged[cat]);
      const local = [...all].sort((a, b) => {
        if (a.favorite && !b.favorite) return -1;
        if (!a.favorite && b.favorite) return 1;
        return a.common.localeCompare(b.common);
      });
      if (!cancelled) {
        const { active, pool } = buildCatState(local);
        setCatActive(active); setCatPool(pool);
        setIsPopulating(false);
      }
      // 2. Silently try AI — on success, add fresh species to pool
      try {
        const known = local.map(p => p.botanical).filter(Boolean);
        const plants = await fetchClaudePalette({ ...siteArgs, count: 6, excludes: known, onDebug: addDebug });
        if (!cancelled && plants.length > 0) {
          const knownSet = new Set(known);
          CATEGORIES.forEach(cat => {
            const fresh = plants.filter(p => p.cat === cat && !knownSet.has(p.botanical));
            if (fresh.length > 0) setCatPool(prev => ({ ...prev, [cat]: [...(prev[cat] || []), ...fresh] }));
          });
        }
      } catch { /* AI unavailable — local DB is sufficient */ }
    }
    populate();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── derived ──
  const activeCats  = CATEGORIES; // always show all 6 categories
  const total       = CATEGORIES.reduce((n, c) => n + (catActive[c] || []).length, 0);
  const lockedCount = CATEGORIES.reduce((n, c) => n + (catActive[c] || []).filter(p => lockedIds.has(p.id)).length, 0);

  // ── helpers ──
  function toggleLock(id) {
    setLockedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function changeVariety(id, newPlantData) {
    setCatActive(prev => {
      const next = { ...prev };
      for (const cat of CATEGORIES) {
        if ((prev[cat] || []).some(p => p.id === id)) {
          next[cat] = prev[cat].map(p =>
            p.id === id ? { ...newPlantData, id, favorite: newPlantData.favorite ?? false, varietyKey: newPlantData.varietyKey || plantBaseKey(newPlantData.botanical) } : p
          );
          break;
        }
      }
      return next;
    });
  }

  function removeFromCategory(id) {
    for (const cat of CATEGORIES) {
      const idx = (catActive[cat] || []).findIndex(p => p.id === id);
      if (idx === -1) continue;
      const plant = catActive[cat][idx];
      setCatActive(prev => ({ ...prev, [cat]: prev[cat].filter(p => p.id !== id) }));
      setCatPool(prev => ({ ...prev, [cat]: [...(prev[cat] || []), plant] }));
      return;
    }
  }

  function applyNewPool(allPlants) {
    const cur = activeRef.current;
    const newActive = {}, newPool = {};
    CATEGORIES.forEach(cat => {
      const locked = (cur[cat] || []).filter(p => lockedIds.has(p.id));
      const count  = Math.max((cur[cat] || []).length, DEFAULT_PER_CAT);
      const needed = Math.max(count - locked.length, 0);
      const fresh  = allPlants.filter(p => p.cat === cat);
      newActive[cat] = [...locked, ...fresh.slice(0, needed)];
      newPool[cat]   = fresh.slice(needed);
    });
    setCatActive(newActive); setCatPool(newPool);
  }

  // ── add by category — local DB is primary, AI silently upgrades pool ──
  async function addToCategory(cat) {
    const cur  = activeRef.current[cat] || [];
    const pool = poolRef.current[cat]   || [];
    if (cur.length >= MAX_PER_CAT) return;
    setAddErrors(prev => ({ ...prev, [cat]: null }));

    // 1. Serve from pool cache immediately if available
    if (pool.length > 0) {
      const [next, ...rest] = pool;
      setCatActive(prev => ({ ...prev, [cat]: [...(prev[cat] || []), next] }));
      setCatPool(prev => ({ ...prev, [cat]: rest }));
      // Silently try to refill pool from AI in background
      const allKnown = CATEGORIES.flatMap(c => [...(activeRef.current[c] || []), ...(poolRef.current[c] || [])]);
      const excludes = allKnown.map(p => p.botanical).filter(Boolean);
      fetchClaudeCategory({ cat, ...siteArgs, excludes, onDebug: addDebug })
        .then(plants => {
          if (plants.length > 0) setCatPool(prev => ({ ...prev, [cat]: [...(prev[cat] || []), ...plants] }));
        }).catch(() => {});
      return;
    }

    // 2. Pull from local DB instantly — no loading state, no spinner
    const allKnown = CATEGORIES.flatMap(c => [...(activeRef.current[c] || []), ...(poolRef.current[c] || [])]);
    const knownBotanicals = new Set(allKnown.map(p => p.botanical).filter(Boolean));
    const local = getLocalPlants({ ...siteArgs, seed: Date.now() })
      .filter(p => p.cat === cat && !knownBotanicals.has(p.botanical));

    if (local.length > 0) {
      const [next, ...rest] = local;
      setCatActive(prev => ({ ...prev, [cat]: [...(prev[cat] || []), next] }));
      setCatPool(prev => ({ ...prev, [cat]: [...(prev[cat] || []), ...rest] }));
    } else {
      // Relax filters — try zone-only match
      const zoneOnly = PLANT_DB.filter(p => p.zones.includes(siteArgs.zone) && p.cat === cat && !knownBotanicals.has(p.botanical));
      if (zoneOnly.length > 0) {
        const [next, ...rest] = zoneOnly;
        setCatActive(prev => ({ ...prev, [cat]: [...(prev[cat] || []), next] }));
        setCatPool(prev => ({ ...prev, [cat]: [...(prev[cat] || []), ...rest] }));
      } else {
        setAddErrors(prev => ({ ...prev, [cat]: `No more ${cat.toLowerCase()} in library for zone ${siteArgs.zone}` }));
      }
    }

    // 3. Silently try AI to upgrade pool for next click
    const excludes2 = new Set([...allKnown.map(p => p.botanical).filter(Boolean)]);
    fetchClaudeCategory({ cat, ...siteArgs, excludes: [...excludes2], onDebug: addDebug })
      .then(plants => {
        const fresh = plants.filter(p => !excludes2.has(p.botanical));
        if (fresh.length > 0) setCatPool(prev => ({ ...prev, [cat]: [...(prev[cat] || []), ...fresh] }));
      }).catch(() => {});
  }

  // ── precedent image scan — upload image, Claude identifies plants ──
  async function scanPrecedentImage(file) {
    setPrecedentScanning(true); setPrecedentError(null); setPrecedentResults(null);
    try {
      const base64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(",")[1]);
        reader.onerror = () => rej(new Error("File read failed"));
        reader.readAsDataURL(file);
      });
      const mediaType = file.type || "image/jpeg";
      const prompt = `You are a landscape architect's plant identification assistant. Examine this planting design image carefully.

Identify every plant species you can recognize — both by visual characteristics and any labels, text, or planting plans visible in the image.

Site context: USDA Zone ${projectZone}, ${siteArgs.sun || "unknown sun"}, ${siteArgs.moisture || "unknown moisture"}.

Return ONLY a JSON object, no markdown:
{
  "found": [
    { "common": "common name", "botanical": "Latin name", "cat": "Deciduous Trees|Evergreen Trees|Deciduous Shrubs|Evergreen Shrubs|Perennials|Grasses|Groundcovers|Ferns|Vines", "confidence": "high|medium|low", "notes": "brief identifying note" }
  ],
  "scene": "one sentence describing the overall planting composition"
}

Rules:
- Only include plants you can genuinely identify — don't guess.
- For labeled plans, trust the text. For photos, use visual characteristics.
- "cat" must be one of the nine exact values listed.
- If no plants are identifiable, return { "found": [], "scene": "..." }.`;

      const response = { ok: false, status: 503, json: async () => ({}) }
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || `API error ${response.status}`);
      const raw = data.content.map(b => b.text || "").join("");
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setPrecedentResults(parsed);
    } catch (e) {
      setPrecedentError(`Scan failed: ${e.message}`);
    }
    setPrecedentScanning(false);
  }

  function addPrecedentPlant(plant) {
    const cat = CATEGORIES.includes(plant.cat) ? plant.cat : "Perennials";
    const id = `precedent_${plant.botanical.replace(/ /g,"_")}_${Date.now()}`;
    const entry = {
      id, cat, common: plant.common, botanical: plant.botanical,
      size: "—", bloom: "—", color: plant.notes || "—",
      zoneMin: 3, zoneMax: 9, favorite: false, manual: true,
      zoneOk: true, conditionsOk: true, warning: null,
    };
    setCatActive(prev => ({ ...prev, [cat]: [...(prev[cat] || []), entry] }));
    setLockedIds(prev => { const s = new Set(prev); s.add(id); return s; });
    setPrecedentAdded(prev => new Set([...prev, plant.botanical]));
  }

  // ── manual add — local lookup first, AI optional upgrade ──
  async function handleManualAdd() {
    const name = manualInput.trim();
    if (!name) return;
    setManualPending(true); setManualError(null);

    // Check only what's visible in the palette — not the background pool
    const knownBotanicals = CATEGORIES.flatMap(c => (activeRef.current[c] || []).map(p => p.botanical)).filter(Boolean);

    // 1. Try local dictionary first — instant
    const localResult = localPlantLookup(name, projectZone);
    if (localResult && localResult.botanical) {
      if (knownBotanicals.includes(localResult.botanical)) {
        setManualError(`${localResult.botanical} is already in the palette`);
        setManualPending(false); return;
      }
      const plant = { ...localResult, id: `manual_${Date.now()}`, favorite: false };
      const cat = CATEGORIES.includes(localResult.cat) ? localResult.cat : "Deciduous Shrubs";
      setCatActive(prev => ({ ...prev, [cat]: [...(prev[cat] || []), plant] }));
      setManualInput(""); setShowManual(false);
      setManualPending(false);
      // Silently try AI to enrich the card in background (future enhancement)
      return;
    }

    // 2. Try AI
    try {
      const result = await verifyPlant({ name, zone: projectZone, ...siteArgs, onDebug: addDebug });
      if (!result.botanical) {
        setManualError("Plant not recognized — try the botanical name or check spelling");
      } else if (knownBotanicals.includes(result.botanical)) {
        setManualError(`${result.botanical} is already in the palette`);
      } else {
        const plant = { ...result, id: `manual_${Date.now()}`, favorite: false };
        const cat = CATEGORIES.includes(result.cat) ? result.cat : "Deciduous Shrubs";
        setCatActive(prev => ({ ...prev, [cat]: [...(prev[cat] || []), plant] }));
        setManualInput(""); setShowManual(false);
      }
    } catch {
      setManualError("Could not identify a match — try a species name or a more specific description.");
    }
    setManualPending(false);
  }

  // ── species diversity helpers ──────────────────────────────────────────────
  // "Panicum virgatum 'Shenandoah'" → "panicum virgatum"
  function baseSpecies(botanical) {
    return (botanical || "").split(/['']/)[0].trim().toLowerCase().split(" ").slice(0, 2).join(" ");
  }
  // true if the name includes a named cultivar e.g. 'Shenandoah'
  function hasCultivar(botanical) {
    return /[''"]/.test(botanical || "");
  }
  // Two plants conflict if they share the same base species AND at least one lacks a cultivar name
  function speciesConflicts(botanical, usedBaseSpecies) {
    const base = baseSpecies(botanical);
    if (!usedBaseSpecies.has(base)) return false;           // different species — fine
    if (hasCultivar(botanical)) return false;               // this one is a named cultivar
    return true;                                            // unnamed species, already represented
  }
  // Add a botanical to the tracking set; only register the base if it has no cultivar
  function registerSpecies(botanical, usedBaseSpecies) {
    if (!hasCultivar(botanical)) usedBaseSpecies.add(baseSpecies(botanical));
  }

  // ── regenerate — replace unlocked slots with fresh species from LOCAL_PLANT_LOOKUP ──
  async function runRegenerate(discovery) {
    setIsRegenerating(true); setRegenNote(null);

    const cur      = activeRef.current;
    const locked   = lockedIdsRef.current;   // fresh ref — no stale closure
    const zn       = zoneToNum(projectZone);
    const newActive = {};
    const callSeed  = Date.now();

    // Build full exclusion set: every botanical currently in palette
    const allKnown = new Set(
      CATEGORIES.flatMap(c => (cur[c] || []).map(p => p.botanical)).filter(Boolean)
    );

    CATEGORIES.forEach(cat => {
      const current  = cur[cat] || [];
      const lockedPlants   = current.filter(p => locked.has(p.id));
      const unlockedPlants = current.filter(p => !locked.has(p.id));
      const needed = unlockedPlants.length;

      if (needed === 0) { newActive[cat] = lockedPlants; return; }

      // Track which base species are already committed (from locked plants)
      const usedBaseSpecies = new Set();
      lockedPlants.forEach(p => registerSpecies(p.botanical, usedBaseSpecies));

      // Candidate pool: filtered by zone, category, AND site conditions
      const sun_r  = siteArgs.sun || "";
      const mois_r = siteArgs.moisture || "";
      const use_r  = siteArgs.use || [];
      const all_merged = getMergedLookup().filter(p => p.cat === cat && !allKnown.has(p.botanical));

      function regenPool(relaxSun, relaxMoisture) {
        return all_merged.filter(p => {
          if (zn < p.zoneMin || zn > p.zoneMax) return false;
          if (!relaxSun && sun_r && p.sun?.length && !p.sun.includes(sun_r)) return false;
          if (!relaxMoisture && mois_r && p.moisture?.length && !p.moisture.includes(mois_r)) return false;
          return true;
        });
      }

      // Strictest first; fall back only if pool would leave slots empty
      let pool = regenPool(false, false);
      if (pool.length < needed) pool = regenPool(true, false);
      if (pool.length < needed) pool = regenPool(false, true);
      if (pool.length < needed) pool = regenPool(true, true);

      // Shuffle differently each call (base randomness)
      const shuffled = seededShuffle(pool, callSeed + cat.charCodeAt(0));

      // Build set of base species already present anywhere in the full palette
      // (includes all categories, locked + unlocked — for companion scoring)
      const presentBases = new Set(
        CATEGORIES.flatMap(c => (cur[c] || []).map(p => companionBase(p.botanical)))
      );

      // Stable-sort by companion score descending — companions of locked/existing plants
      // float to the top while zero-score plants stay in their shuffled order
      shuffled.sort((a, b) => companionScore(b.botanical, presentBases) - companionScore(a.botanical, presentBases));

      // Fill slots — skip any candidate whose base species is already represented (unless it's a named cultivar)
      const replacements = [];
      let si = 0;
      for (let i = 0; i < needed; i++) {
        // Advance past species conflicts
        while (si < shuffled.length && speciesConflicts(shuffled[si].botanical, usedBaseSpecies)) si++;
        const pick = shuffled[si];
        if (pick) {
          const id = `regen_${pick.botanical.replace(/ /g,'_')}_${callSeed}_${i}`;
          replacements.push({ ...pick, id, favorite: false });
          allKnown.add(pick.botanical);
          registerSpecies(pick.botanical, usedBaseSpecies);
          si++;
        }
        // If pool fully exhausted for this category, slot stays empty (don't pad with duplicates)
      }

      newActive[cat] = [...lockedPlants, ...replacements];
    });

    setCatActive(newActive);
    setCatPool(() => { const c = {}; CATEGORIES.forEach(cat => { c[cat] = []; }); return c; });
    setIsRegenerating(false);

    // Silently try AI to seed fresh pool for next regenerate
    const allNow = CATEGORIES.flatMap(c => (newActive[c] || []).map(p => p.botanical)).filter(Boolean);
    fetchClaudePalette({ ...siteArgs, count: 6, excludes: allNow, isDiscovery: discovery, onDebug: addDebug })
      .then(plants => {
        if (plants.length > 0) {
          const known = new Set(allNow);
          CATEGORIES.forEach(cat => {
            const fresh = plants.filter(p => p.cat === cat && !known.has(p.botanical));
            if (fresh.length > 0) setCatPool(prev => ({ ...prev, [cat]: [...(prev[cat] || []), ...fresh] }));
          });
        }
      }).catch(() => {});
  }

  const loading = isPopulating || isRegenerating;

  const FloatingRegen = () => (
    <button
      type="button"
      onClick={() => runRegenerate(showDiscovery)}
      disabled={loading}
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 120,
        padding: "10px 22px",
        background: loading ? T.borderMid : T.accent,
        border: "none", borderRadius: 2,
        cursor: loading ? "default" : "pointer",
        color: "#fff",
        fontFamily: T.sans, fontSize: 11, fontWeight: 500,
        letterSpacing: "0.12em", textTransform: "uppercase",
        display: "flex", alignItems: "center", gap: 7,
        boxShadow: "0 2px 12px rgba(27,51,83,0.22)",
        transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = T.accentHover; }}
      onMouseLeave={e => { if (!loading) e.currentTarget.style.background = loading ? T.borderMid : T.accent; }}
    >
      {isRegenerating ? <><Spinner /> Regenerating…</> : "Regenerate"}
    </button>
  );

  // ── EXPORT MODAL ──
  const ExportModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,24,20,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div style={{ background: T.surface, width: 560, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: `1px solid ${T.border}` }}>
          <div>
            <div style={{ fontFamily: T.sans, fontSize: 20, fontWeight: 300, color: T.ink }}>Export Palette</div>
            <div style={{ fontFamily: T.sans, fontSize: 12, color: T.inkMid, marginTop: 2, fontWeight: 300 }}>{zone.name} · {total} species</div>
          </div>
          <button type="button" onClick={() => setShowExport(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.inkLight, fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {/* header block */}
          <div style={{ borderBottom: `2px solid ${T.ink}`, paddingBottom: 12, marginBottom: 16 }}>
            <div style={{ fontFamily: T.sans, fontSize: 24, fontWeight: 300, color: T.ink }}>{zone.name}</div>
            <div style={{ fontFamily: T.sans, fontSize: 11, color: T.inkMid, marginTop: 4, fontWeight: 300 }}>
              {zone.sun} · {zone.moisture} · {zone.slope}{zone.soil ? ` · ${zone.soil}` : ""}{zone.soil ? ` · ${zone.soil}` : ""} · {useArr.join(", ")}
            </div>
          </div>
          {activeCats.map(cat => (
            <div key={cat} style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: CAT[cat]?.ink || T.accent, marginBottom: 6 }}>{cat}</div>
              {(catActive[cat] || []).map(p => (
                <div key={p.id} style={{ display: "flex", gap: 12, padding: "7px 0", borderTop: `1px solid ${T.border}`, alignItems: "baseline" }}>
                  <div style={{ fontFamily: T.sans, fontStyle: "italic", fontSize: 13, fontWeight: 300, color: T.ink, minWidth: 180 }}>{p.botanical}</div>
                  <div style={{ fontFamily: T.sans, fontSize: 11, color: T.inkMid, fontWeight: 300 }}>{p.common} · {p.size}{p.bloom && p.bloom !== "—" ? ` · ${p.bloom}` : ""}</div>
                  {lockedIds.has(p.id) && <span style={{ fontFamily: T.sans, fontSize: 10, color: T.accent }}>⚑</span>}
                </div>
              ))}
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Btn onClick={() => setShowExport(false)} variant="ghost">Close</Btn>
            <Btn variant="primary">↓ Download PDF</Btn>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <FloatingRegen />
      {showExport && <ExportModal />}

      {/* nav */}
      <Btn onClick={onBack} variant="link" small style={{ marginBottom: 16, color: T.inkLight }}>← {/* project name */}</Btn>

      {/* page header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: T.inkMid, marginBottom: 4 }}>Planting Zone</div>
          <div style={{ fontFamily: T.sans, fontSize: 28, fontWeight: 300, color: T.ink, lineHeight: 1 }}>{zone.name}</div>
          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.inkMid, marginTop: 6, fontWeight: 300 }}>
            {zone.sun} · {zone.moisture} · {zone.slope}{zone.soil ? ` · ${zone.soil}` : ""}
            {useArr.length ? ` · ${useArr.join(", ")}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Btn onClick={() => setShowManual(v => !v)} variant={showManual ? "subtle" : "ghost"} small>✎ Add manually</Btn>
          <Btn onClick={() => { setShowPrecedent(v => !v); setPrecedentResults(null); setPrecedentFile(null); setPrecedentPreview(null); setPrecedentError(null); }} variant={showPrecedent ? "subtle" : "ghost"} small>⊞ Scan precedent</Btn>
          <Btn onClick={() => setShowExport(true)} variant="ghost" small>Export</Btn>
        </div>
      </div>

      {/* manual add bar */}
      {showManual && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: "16px", marginBottom: 16 }}>
          <Label>Add a species — by name, or describe what you need</Label>
          <div style={{ display: "flex", gap: 8 }}>
            <Input value={manualInput} onChange={e => setManualInput(e.target.value)}
              placeholder="e.g. Quercus alba, White Oak, or tall purple fall-blooming perennial…"
              onKeyDown={e => { if (e.key === "Enter") handleManualAdd(); }}
              style={{ flex: 1 }} />
            <Btn onClick={handleManualAdd} variant="primary" disabled={!manualInput.trim() || manualPending} style={{ whiteSpace: "nowrap" }}>
              {manualPending ? <><Spinner /> Finding…</> : "Find & Add →"}
            </Btn>
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.inkLight, marginTop: 6 }}>
            Try: "something for screening with winter interest" · "low groundcover for dry shade" · "Clethra"
          </div>
          {manualError && <div style={{ fontFamily: T.sans, fontSize: 12, color: T.red, marginTop: 8 }}>{manualError}</div>}
        </div>
      )}

      {/* precedent scan panel */}
      {showPrecedent && (
        <div style={{ border: `1px solid ${T.border}`, marginBottom: 16, background: T.surfaceAlt }}>
          <div style={{ padding: "14px 16px", borderBottom: precedentFile ? `1px solid ${T.border}` : "none" }}>
            <Label>Scan planting precedent</Label>
            <div style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 300, color: T.inkLight, marginBottom: 12 }}>
              Upload a photo, sketch, or planting plan — Claude will identify species and add them to this zone.
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => {
                const f = e.target.files[0];
                if (!f) return;
                setPrecedentFile(f);
                setPrecedentResults(null);
                setPrecedentError(null);
                setPrecedentAdded(new Set());
                const reader = new FileReader();
                reader.onload = ev => setPrecedentPreview(ev.target.result);
                reader.readAsDataURL(f);
              }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Btn onClick={() => fileInputRef.current?.click()} variant="ghost" small>
                {precedentFile ? "↑ Replace image" : "↑ Upload image"}
              </Btn>
              {precedentFile && (
                <Btn onClick={() => scanPrecedentImage(precedentFile)} variant="primary" small disabled={precedentScanning}>
                  {precedentScanning ? <><Spinner /> Scanning…</> : "Scan for plants →"}
                </Btn>
              )}
              {precedentFile && (
                <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 300, color: T.inkLight }}>{precedentFile.name}</span>
              )}
            </div>
            {precedentError && <div style={{ fontFamily: T.sans, fontSize: 12, color: T.red, marginTop: 8 }}>{precedentError}</div>}
          </div>

          {precedentPreview && !precedentResults && !precedentScanning && (
            <div style={{ padding: "12px 16px" }}>
              <img src={precedentPreview} alt="precedent"
                style={{ maxWidth: "100%", maxHeight: 240, objectFit: "contain", display: "block", border: `1px solid ${T.border}` }} />
            </div>
          )}

          {precedentResults && (
            <div style={{ padding: "14px 16px" }}>
              {precedentResults.scene && (
                <div style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 300, fontStyle: "italic", color: T.inkMid, marginBottom: 14 }}>
                  {precedentResults.scene}
                </div>
              )}
              {precedentResults.found.length === 0 ? (
                <div style={{ fontFamily: T.sans, fontSize: 12, color: T.inkLight, fontWeight: 300 }}>No identifiable plants found in this image.</div>
              ) : (
                <div>
                  <div style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: T.inkMid, marginBottom: 10 }}>
                    {precedentResults.found.length} species identified
                  </div>
                  {precedentResults.found.map((plant, i) => {
                    const alreadyIn = [...(Object.values(catActive).flat())].some(p => p.botanical === plant.botanical);
                    const justAdded = precedentAdded.has(plant.botanical);
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}`, gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: T.sans, fontSize: 13, fontWeight: 300, color: T.ink }}>{plant.common}</span>
                            <span style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase",
                              color: plant.confidence === "high" ? T.accent : plant.confidence === "medium" ? T.inkMid : T.inkLight }}>
                              {plant.confidence}
                            </span>
                          </div>
                          <div style={{ fontFamily: T.sans, fontSize: 11, fontStyle: "italic", fontWeight: 300, color: T.inkMid }}>{plant.botanical}</div>
                          {plant.notes && <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.inkLight, marginTop: 2 }}>{plant.notes}</div>}
                          <div style={{ fontFamily: T.sans, fontSize: 9, color: T.inkLight, marginTop: 2 }}>{plant.cat}</div>
                        </div>
                        <div style={{ flexShrink: 0 }}>
                          {alreadyIn || justAdded ? (
                            <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.inkLight }}>✓ In palette</span>
                          ) : (
                            <Btn onClick={() => addPrecedentPlant(plant)} variant="subtle" small>+ Add</Btn>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 12 }}>
                    <Btn onClick={() => {
                      precedentResults.found.forEach(p => {
                        const alreadyIn = [...(Object.values(catActive).flat())].some(x => x.botanical === p.botanical);
                        if (!alreadyIn && !precedentAdded.has(p.botanical)) addPrecedentPlant(p);
                      });
                    }} variant="primary" small>Add all to zone →</Btn>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`, marginBottom: 24, gap: 8, flexWrap: "wrap" }}>
        <div style={{ fontFamily: T.sans, fontSize: 12, color: T.inkMid, fontWeight: 300 }}>
          {loading ? "—" : `${total} species · ${CATEGORIES.length} categories`}
          {lockedCount > 0 && ` · ${lockedCount} locked`}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {lockedCount > 0 && (
            <Btn onClick={() => setLockedIds(new Set())} variant="ghost" small>Unlock all</Btn>
          )}
          <Btn onClick={() => { const n = !showDiscovery; setShowDiscovery(n); runRegenerate(n); }} variant={showDiscovery ? "subtle" : "ghost"} small disabled={loading}>
            ✦ {showDiscovery ? "Discovery on" : "Discovery"}
          </Btn>
          <Btn onClick={() => runRegenerate(showDiscovery)} variant={loading ? "ghost" : "primary"} small disabled={loading}>
            {isRegenerating ? <><Spinner /> Regenerating…</> : "⟳ Regenerate"}
          </Btn>
          <button type="button" onClick={() => setShowDebug(v => !v)}
            title="Toggle API debug log"
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: T.sans, fontSize: 10, fontWeight: 300, letterSpacing: "0.08em", color: debugLog.some(e => e.error) ? T.red : showDebug ? T.accent : T.inkLight, padding: "4px 2px" }}>
            {debugLog.some(e => e.error) ? "⚠ debug" : "debug"}
            {debugLog.length > 0 && <span style={{ marginLeft: 3 }}>({debugLog.length})</span>}
          </button>
        </div>
      </div>

      {regenNote && (
        <div style={{ fontFamily: T.sans, fontSize: 11, color: T.inkMid, marginBottom: 16, fontWeight: 300 }}>{regenNote}</div>
      )}

      {showDebug && (
        <div style={{ border: `1px solid ${T.border}`, marginBottom: 24, background: T.surfaceAlt }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${T.border}` }}>
            <span style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: T.inkMid }}>API Debug Log</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="button" onClick={async () => {
                // Minimal ping — simplest possible API call
                const pingEntry = { label: "ping", prompt: "Reply with the word OK.", ts: new Date().toLocaleTimeString(), status: null, raw: null, extracted: null, error: null };
                try {
                  const res = { ok: false, status: 503, json: async () => ({}) }
                  pingEntry.status = res.status;
                  const data = await res.json();
                  pingEntry.raw = JSON.stringify(data).slice(0, 300);
                  if (!res.ok) pingEntry.error = data?.error?.message || `HTTP ${res.status}`;
                } catch (e) {
                  pingEntry.error = `fetch threw: ${e.constructor.name}: ${e.message}`;
                }
                addDebug(pingEntry);
              }} style={{ background: "none", border: `1px solid ${T.border}`, cursor: "pointer", fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.accent, padding: "3px 8px" }}>
                Ping API
              </button>
              <button type="button" onClick={() => setDebugLog([])} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.inkLight }}>Clear</button>
              <button type="button" onClick={() => setShowDebug(false)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: T.sans, fontSize: 14, color: T.inkLight, lineHeight: 1 }}>×</button>
            </div>
          </div>
          {debugLog.length === 0 ? (
            <div style={{ padding: "16px 14px", fontFamily: T.sans, fontSize: 11, fontWeight: 300, color: T.inkLight }}>No calls yet. Hit "Ping API" to test connectivity, or trigger a regenerate/add.</div>
          ) : debugLog.map((entry, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${T.border}`, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: entry.error ? T.red : T.accent }}>{entry.label}</span>
                <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.inkLight }}>{entry.ts}</span>
                {entry.status != null && <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: entry.status === 200 ? T.accent : T.red }}>HTTP {entry.status}</span>}
              </div>
              {entry.error && (
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: 11, color: T.red, background: "#FFF5F5", padding: "6px 8px", marginBottom: 4, wordBreak: "break-all" }}>
                  ✗ {entry.error}
                </div>
              )}
              {entry.raw && (
                <details style={{ marginTop: 4 }}>
                  <summary style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.inkMid, cursor: "pointer", listStyle: "none" }}>
                    Raw ({entry.raw.length} chars) {entry.extracted ? "✓ parsed" : ""}
                  </summary>
                  <pre style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: T.inkMid, background: "#F5F5F5", padding: "8px", marginTop: 4, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 200, overflowY: "auto" }}>{entry.raw}</pre>
                </details>
              )}
              <details style={{ marginTop: 4 }}>
                <summary style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, color: T.inkLight, cursor: "pointer", listStyle: "none" }}>Prompt</summary>
                <pre style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: T.inkLight, background: "#F5F5F5", padding: "8px", marginTop: 4, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 160, overflowY: "auto" }}>{entry.prompt}</pre>
              </details>
            </div>
          ))}
        </div>
      )}

      {/* grid size slider */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 400, letterSpacing: "0.14em", textTransform: "uppercase", color: T.inkLight, whiteSpace: "nowrap" }}>Grid</span>
        <input type="range" min={2} max={6} step={1} value={gridSize}
          onChange={e => setGridSize(Number(e.target.value))}
          style={{ flex: 1, maxWidth: 120, accentColor: T.accent, cursor: "pointer" }} />
        <span style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 300, color: T.inkLight, minWidth: 12 }}>{gridSize}</span>
      </div>

      {/* palette content */}
      {loading ? (
        <div>
          <div style={{ fontFamily: T.sans, fontSize: 12, color: T.inkLight, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Spinner /> Building palette for zone {projectZone}…
          </div>
          {[1,2,3].map(i => (
            <div key={i} style={{ marginBottom: 28 }}>
              <div style={{ height: 12, background: T.border, width: 80, marginBottom: 8, borderRadius: 1, opacity: 1-i*0.2 }} />
              {[1,2,3,4,5].map(j => (
                <div key={j} style={{ height: 44, background: T.border, marginBottom: 2, borderRadius: 1, opacity: 0.3 }} />
              ))}
            </div>
          ))}
        </div>
      ) : (
        CATEGORIES.map(cat => (
          <CategorySection
            key={cat}
            name={cat}
            plants={catActive[cat] || []}
            lockedIds={lockedIds}
            onToggleLock={toggleLock}
            onRemove={removeFromCategory}
            onAdd={addToCategory}
            adding={loadingCats.has(cat)}
            addError={addErrors[cat]}
            onChangeVariety={changeVariety}
            gridSize={gridSize}
            onSelect={p => setSelectedPlant(p)}
          />
        ))
      )}

      {/* lock hint */}
      {!loading && total > 0 && lockedCount === 0 && (
        <div style={{ marginTop: 16, fontFamily: T.sans, fontSize: 11, color: T.inkLight, fontWeight: 300 }}>
          ⚐ Flag a species to keep it when regenerating
        </div>
      )}

      {/* plant detail modal */}
      {selectedPlant && (
        <PlantDetailModal
          plant={selectedPlant}
          locked={lockedIds.has(selectedPlant.id)}
          onToggleLock={id => { toggleLock(id); setSelectedPlant(prev => prev ? { ...prev } : null); }}
          onRemove={id => { removeFromCategory(id); setSelectedPlant(null); }}
          onChangeVariety={(id, data) => { changeVariety(id, data); setSelectedPlant({ ...data, id }); }}
          onClose={() => setSelectedPlant(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_PROJECT = {
  id: "demo",
  name: "Riverside Residence",
  municipality: "02101",
  zone: "6b",
  styles: ["Naturalistic", "Woodland"],
  zones: [
    { name: "Front Entry",   sun: "Full Sun",   moisture: "Dry",   slope: "Gentle Slope", use: ["Accent", "Foundation Planting"] },
    { name: "Rear Rain Garden", sun: "Full Sun", moisture: "Wet",  slope: "Rain Garden",  use: ["Rain Garden / Bioswale", "Pollinator Support"] },
    { name: "Woodland", sun: "Part Shade", moisture: "Mesic", slope: "Flat",         use: ["Woodland Understory", "Wildlife Habitat"] },
  ],
};

export default function App() {
  const [projects,    setProjects]    = useState([DEMO_PROJECT]);
  const [screen,      setScreen]      = useState("projects"); // projects | new | project | palette
  const [activeProj,  setActiveProj]  = useState(null);
  const [activeZoneI, setActiveZoneI] = useState(null);

  function openProject(p) { setActiveProj(p); setScreen("project"); }
  function openZone(i)     { setActiveZoneI(i); setScreen("palette"); }

  function saveProject(data) {
    const p = { ...data, id: `p_${Date.now()}` };
    setProjects(prev => [...prev, p]);
    setActiveProj(p);
    setScreen("project");
  }

  function addZone(zoneData) {
    setActiveProj(prev => {
      const updated = { ...prev, zones: [...prev.zones, zoneData] };
      setProjects(ps => ps.map(p => p.id === updated.id ? updated : p));
      return updated;
    });
  }

  function editZone(idx, zoneData) {
    setActiveProj(prev => {
      const zones = prev.zones.map((z, i) => i === idx ? zoneData : z);
      const updated = { ...prev, zones };
      setProjects(ps => ps.map(p => p.id === updated.id ? updated : p));
      return updated;
    });
  }

  const activeZone = activeProj?.zones[activeZoneI];

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: "#fff" }}>
        {/* top bar — mirrors LBJ nav: thin weight, tracked caps, hairline rule */}
        <div style={{ borderBottom: `1px solid ${T.border}`, background: "#fff" }}>
          <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 48 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div onClick={() => setScreen("projects")} style={{ cursor: "pointer", fontFamily: T.sans, fontSize: 10, fontWeight: 300, letterSpacing: "0.18em", textTransform: "uppercase", color: T.ink }}>
                LeBlanc Jones <span style={{fontSize:8,color:T.inkLight,letterSpacing:"0.05em",marginLeft:4}}>v37</span>
              </div>
              <div style={{ width: 1, height: 12, background: T.border }} />
              <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkMid }}>Planting Palette</div>
            </div>
            {/* breadcrumb */}
            <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 300, letterSpacing: "0.06em", color: T.inkLight, display: "flex", alignItems: "center", gap: 10 }}>
              {activeProj && (
                <>
                  <span onClick={() => setScreen("project")} style={{ cursor: "pointer", color: screen === "palette" ? T.inkMid : T.inkLight, textTransform: "uppercase", letterSpacing: "0.08em" }}>{activeProj.name}</span>
                  {screen === "palette" && activeZone && (
                    <><span style={{ color: T.border, margin: "0 2px" }}>–</span><span style={{ color: T.inkLight, textTransform: "uppercase", letterSpacing: "0.08em" }}>{activeZone.name}</span></>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* main */}
        <div style={{ maxWidth: "100%", width: "100%", boxSizing: "border-box", padding: "32px 24px", overflowX: "hidden" }}>
          {screen === "projects" && (
            <ProjectsScreen projects={projects} onNew={() => setScreen("new")} onOpen={openProject} />
          )}
          {screen === "new" && (
            <NewProjectScreen onSave={saveProject} onCancel={() => setScreen("projects")} />
          )}
          {screen === "project" && activeProj && (
            <ProjectScreen project={activeProj} onBack={() => setScreen("projects")} onAddZone={addZone} onOpenZone={openZone} onEditZone={editZone} />
          )}
          {screen === "palette" && activeProj && activeZone && (
            <ZonePaletteView zone={activeZone} projectZone={activeProj.zone} projectStyles={activeProj.styles} onBack={() => setScreen("project")} />
          )}
        </div>
      </div>
    </>
  );
}
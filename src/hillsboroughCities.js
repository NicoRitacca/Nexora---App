// Fixed lists of postal (mailing) city names for Hillsborough County, FL —
// the names that actually show up as "city" on a Sunbiz business address,
// not neighborhood or community-plan names. Many well-known Hillsborough
// neighborhoods (Town 'n' Country, Citrus Park, Egypt Lake, Carrollwood,
// Westchase, etc.) use "Tampa" as their postal city and so aren't listed
// separately here.
//
// Method: every ZIP code the Census Bureau's 2020 ZCTA-to-county
// relationship file assigns to Hillsborough County (the same file
// scripts/count-filings.js uses to flag a filing's ZIP as "full" or
// "partial" coverage) was checked against actual Sunbiz filings — a sample
// of 213 daily corporate-filing files spanning 2022–2026 pulled from the
// Sunbiz SFTP server. For each ZIP, the dominant postal city string used in
// those filings was kept (and, for the handful of ZIPs genuinely shared by
// two postal cities in real, substantial numbers — 33573 "Ruskin"/"Sun City
// Center", 33617 and 33637 "Tampa"/"Temple Terrace" — both were kept).
// Stray one-off typos and businesses that just typed a neighborhood name
// were excluded. One ZIP, 33503 (Balm), had no filings in the sampled
// files; a single older filing (2022-09-14) confirmed "Balm" directly.
//
// Grouping: this isn't a full/partial ZIP-coverage split (that flag still
// drives the separate "Border area" badge shown on individual
// opportunities). It's whether the city itself is mainly in Hillsborough —
// Lithia, Lutz, Odessa, and Wimauma are Hillsborough communities even
// though a couple of their ZIPs also reach into Pasco or Manatee County.
// BORDER_AREA_CITIES holds only cities actually based in a neighboring
// county (Pasco, Polk, Manatee, Pinellas) whose ZIP happens to dip into
// Hillsborough.
export const HILLSBOROUGH_CITIES = [
  'Apollo Beach',
  'Balm',
  'Brandon',
  'Dover',
  'Durant',
  'Gibsonton',
  'Lithia',
  'Lutz',
  'Mango',
  'Odessa',
  'Plant City',
  'Riverview',
  'Ruskin',
  'Seffner',
  'Sun City Center',
  'Tampa',
  'Temple Terrace',
  'Thonotosassa',
  'Valrico',
  'Wimauma',
].sort()

export const BORDER_AREA_CITIES = ['Lakeland', 'Mulberry', 'Zephyrhills'].sort()

// Cautious check for a Sunbiz business name that is essentially a person's
// name plus an entity suffix (e.g. "ANDREW HILL, LLC", "JOHN M SMITH LLC",
// "KURT KASPAR LLC"). Flags a 3-word core only when every word is itself a
// common first or last name - so a real business name that happens to
// contain a common surname (e.g. "DIXON SALES TEAM LLC", "SANCHEZ VENDOR
// SERVICES LLC") is never flagged, since "SALES"/"TEAM" or "VENDOR"/
// "SERVICES" aren't name words. For a 2-word core, a common first name
// followed by any one other word is also flagged - unless that other word
// is a known business/industry term (see BUSINESS_WORDS), which protects
// real "<first name> <product/service>"-style business names (e.g. "SEAN
// SOLUTIONS LLC"). This intentionally favors missing some person-named
// filings over hiding real businesses.

// Common entity-suffix words (after stripping punctuation), stripped
// repeatedly from the end of the name before the name check runs.
const SUFFIX_WORDS = new Set([
  'LLC', 'LLLP', 'LLP', 'PLLC', 'PLC', 'PC', 'PA', 'LP', 'LTD', 'LIMITED',
  'LIABILITY', 'COMPANY', 'CO', 'CORP', 'CORPORATION', 'INC', 'INCORPORATED',
])

// A deliberately small, common-name list - large enough to catch typical
// cases, small enough to keep false positives (flagging a real business) at
// bay. Single-letter tokens (middle initials, "M") are always accepted.
const FIRST_NAMES = new Set([
  'JAMES', 'JOHN', 'ROBERT', 'MICHAEL', 'WILLIAM', 'DAVID', 'RICHARD', 'JOSEPH',
  'THOMAS', 'CHARLES', 'CHRISTOPHER', 'DANIEL', 'MATTHEW', 'ANTHONY', 'MARK',
  'DONALD', 'STEVEN', 'PAUL', 'ANDREW', 'JOSHUA', 'KENNETH', 'KEVIN', 'BRIAN',
  'GEORGE', 'TIMOTHY', 'RONALD', 'EDWARD', 'JASON', 'JEFFREY', 'RYAN', 'JACOB', 'KURT',
  'GARY', 'NICHOLAS', 'ERIC', 'JONATHAN', 'STEPHEN', 'LARRY', 'JUSTIN', 'SCOTT',
  'BRANDON', 'BENJAMIN', 'SAMUEL', 'GREGORY', 'ALEXANDER', 'FRANK', 'PATRICK',
  'RAYMOND', 'JACK', 'DENNIS', 'JERRY', 'TYLER', 'AARON', 'JOSE', 'ADAM',
  'NATHAN', 'HENRY', 'ZACHARY', 'DOUGLAS', 'PETER', 'KYLE', 'NOAH', 'ETHAN',
  'JEREMY', 'WALTER', 'CHRISTIAN', 'KEITH', 'ROGER', 'TERRY', 'AUSTIN', 'SEAN',
  'GERALD', 'CARL', 'HAROLD', 'DYLAN', 'ARTHUR', 'JORDAN', 'JESSE', 'BRYAN',
  'BILLY', 'BRUCE', 'GABRIEL', 'JOE', 'LOGAN', 'ALAN', 'JUAN', 'ALBERT',
  'WILLIE', 'ELIJAH', 'WAYNE', 'RANDY', 'VINCENT', 'MASON', 'ROY', 'RALPH',
  'BOBBY', 'RUSSELL', 'BRADLEY', 'PHILIP', 'EUGENE', 'LUIS', 'CARLOS', 'LOUIS',
  'MARY', 'PATRICIA', 'JENNIFER', 'LINDA', 'ELIZABETH', 'BARBARA', 'SUSAN',
  'JESSICA', 'SARAH', 'KAREN', 'LISA', 'NANCY', 'BETTY', 'MARGARET', 'SANDRA',
  'ASHLEY', 'KIMBERLY', 'EMILY', 'DONNA', 'MICHELLE', 'DOROTHY', 'CAROL',
  'AMANDA', 'MELISSA', 'DEBORAH', 'STEPHANIE', 'REBECCA', 'SHARON', 'LAURA',
  'CYNTHIA', 'KATHLEEN', 'AMY', 'SHIRLEY', 'ANGELA', 'HELEN', 'ANNA', 'BRENDA',
  'PAMELA', 'NICOLE', 'SAMANTHA', 'KATHERINE', 'EMMA', 'RUTH', 'CHRISTINE',
  'CATHERINE', 'DEBRA', 'RACHEL', 'CAROLYN', 'JANET', 'VIRGINIA', 'MARIA',
  'HEATHER', 'DIANE', 'JULIE', 'JOYCE', 'VICTORIA', 'KELLY', 'CHRISTINA',
  'LAUREN', 'JOAN', 'EVELYN', 'JUDITH', 'MEGAN', 'ANDREA', 'CHERYL', 'HANNAH',
  'JACQUELINE', 'MARTHA', 'GLORIA', 'TERESA', 'ANN', 'SARA', 'MADISON',
  'FRANCES', 'KATHRYN', 'JANICE', 'JEAN', 'ABIGAIL', 'ALICE', 'JULIA', 'JUDY',
  'SOPHIA', 'GRACE', 'DENISE', 'AMBER', 'DORIS', 'MARILYN', 'DANIELLE',
  'BEVERLY', 'ISABELLA', 'THERESA', 'DIANA', 'NATALIE', 'BRITTANY',
  'CHARLOTTE', 'MARIE', 'KAYLA', 'ALEXIS', 'LORI', 'MOLLY',
])

const LAST_NAMES = new Set([
  'SMITH', 'JOHNSON', 'WILLIAMS', 'BROWN', 'JONES', 'GARCIA', 'MILLER',
  'DAVIS', 'RODRIGUEZ', 'MARTINEZ', 'HERNANDEZ', 'LOPEZ', 'GONZALEZ', 'WILSON',
  'ANDERSON', 'THOMAS', 'TAYLOR', 'MOORE', 'JACKSON', 'MARTIN', 'LEE', 'PEREZ',
  'THOMPSON', 'WHITE', 'HARRIS', 'SANCHEZ', 'CLARK', 'RAMIREZ', 'LEWIS',
  'ROBINSON', 'WALKER', 'YOUNG', 'ALLEN', 'KING', 'WRIGHT', 'SCOTT', 'TORRES',
  'NGUYEN', 'HILL', 'FLORES', 'GREEN', 'ADAMS', 'NELSON', 'BAKER', 'HALL',
  'RIVERA', 'CAMPBELL', 'MITCHELL', 'CARTER', 'ROBERTS', 'GOMEZ', 'PHILLIPS',
  'EVANS', 'TURNER', 'DIAZ', 'PARKER', 'CRUZ', 'EDWARDS', 'COLLINS', 'REYES',
  'STEWART', 'MORRIS', 'MORALES', 'MURPHY', 'COOK', 'ROGERS', 'GUTIERREZ',
  'ORTIZ', 'MORGAN', 'COOPER', 'PETERSON', 'BAILEY', 'REED', 'KELLY',
  'HOWARD', 'RAMOS', 'KIM', 'COX', 'WARD', 'RICHARDSON', 'WATSON', 'BROOKS',
  'CHAVEZ', 'WOOD', 'JAMES', 'BENNETT', 'GRAY', 'MENDOZA', 'RUIZ', 'HUGHES',
  'PRICE', 'ALVAREZ', 'CASTILLO', 'SANDERS', 'PATEL', 'MYERS', 'LONG', 'ROSS',
  'FOSTER', 'JIMENEZ', 'POWELL', 'JENKINS', 'PERRY', 'RUSSELL', 'SULLIVAN',
  'BELL', 'COLEMAN', 'BUTLER', 'HENDERSON', 'BARNES', 'GONZALES', 'FISHER',
  'VASQUEZ', 'SIMMONS', 'ROMERO', 'JORDAN', 'PATTERSON', 'ALEXANDER',
  'HAMILTON', 'GRAHAM', 'REYNOLDS', 'GRIFFIN', 'WALLACE', 'MORENO', 'WEST',
  'COLE', 'HAYES', 'BRYANT', 'HERRERA', 'GIBSON', 'ELLIS', 'TRAN', 'MEDINA',
  'AGUILAR', 'STEVENS', 'MURRAY', 'FORD', 'CASTRO', 'MARSHALL', 'OWENS',
  'HARRISON', 'FERNANDEZ', 'MCDONALD', 'WOODS', 'WASHINGTON', 'KENNEDY',
  'WELLS', 'VARGAS', 'HENRY', 'CHEN', 'FREEMAN', 'WEBB', 'TUCKER', 'GUZMAN',
  'BURNS', 'CRAWFORD', 'OLSON', 'SIMPSON', 'PORTER', 'HUNTER', 'GORDON',
  'MENDEZ', 'SILVA', 'SHAW', 'SNYDER', 'MASON', 'DIXON', 'MUNOZ', 'HUNT',
  'HICKS', 'HOLMES', 'PALMER', 'WAGNER', 'BLACK', 'ROBERTSON', 'BOYD', 'ROSE',
  'STONE', 'SALAZAR', 'FOX', 'WARREN', 'MILLS', 'MEYER', 'RICE', 'SCHMIDT',
  'GARZA', 'DANIELS', 'FERGUSON', 'NICHOLS', 'STEPHENS', 'SOTO', 'WEAVER',
  'RYAN', 'GARDNER', 'PAYNE', 'GRANT', 'DUNN', 'KELLEY', 'SPENCER', 'HAWKINS',
  'ARNOLD', 'PIERCE', 'VAZQUEZ', 'HANSEN', 'PETERS', 'SANTOS', 'HART',
  'BRADLEY', 'KNIGHT', 'ELLIOTT', 'CUNNINGHAM', 'DUNCAN', 'ARMSTRONG',
  'HUDSON', 'CARROLL', 'LANE', 'RILEY', 'ANDREWS', 'ALVARADO', 'RAY',
  'DELGADO', 'BERRY', 'PERKINS', 'HOFFMAN', 'JOHNSTON', 'MATTHEWS', 'PENA',
  'RICHARDS', 'CONTRERAS', 'WILLIS', 'CARPENTER', 'LAWRENCE', 'SANDOVAL',
  'GUERRERO', 'GEORGE', 'CHAPMAN', 'RIOS', 'ESTRADA', 'ORTEGA', 'WATKINS',
  'GREENE', 'NUNEZ', 'WHEELER', 'VALDEZ', 'HARPER', 'BURKE', 'LARSON',
  'SANTIAGO', 'MALDONADO', 'MORRISON', 'FRANKLIN', 'CARLSON', 'AUSTIN',
  'DOMINGUEZ', 'CARR', 'LAWSON', 'JACOBS', 'OBRIEN', 'LYNCH', 'SINGH', 'VEGA',
  'BISHOP', 'MONTGOMERY', 'OLIVER', 'JENSEN', 'HARVEY', 'WILLIAMSON',
  'GILBERT', 'DEAN', 'SIMS', 'ESPINOZA', 'HOWELL', 'LI', 'WONG', 'REID',
  'HANSON', 'LE', 'MCCOY', 'GARRETT', 'BURTON', 'FULLER', 'WANG', 'WEBER',
  'WELCH', 'ROJAS', 'LUCAS', 'MARQUEZ', 'FIELDS', 'LYNN', 'CATLETT', 'MOLLOY',
])

// Common generic business/industry nouns - a second word drawn from this
// list means the name is almost certainly "<first name> <what it sells>",
// not a person's own two-word name, so it's never flagged even when the
// first word is a common first name.
const BUSINESS_WORDS = new Set([
  'GROUP', 'VENTURES', 'VENTURE', 'SOLUTIONS', 'SOLUTION', 'HOLDINGS', 'HOLDING',
  'ENTERPRISES', 'ENTERPRISE', 'PROPERTIES', 'PROPERTY', 'REALTY', 'SERVICES',
  'SERVICE', 'CONSULTING', 'MANAGEMENT', 'CAPITAL', 'PARTNERS', 'PARTNER',
  'ASSOCIATES', 'TRANSPORT', 'TRANSPORTATION', 'LOGISTICS', 'TRUCKING',
  'DELIVERY', 'CLEANING', 'CLEANERS', 'RENTALS', 'RENTAL', 'AUTO', 'AUTOMOTIVE',
  'MOTORS', 'MOTORWORKS', 'DETAILING', 'TOWING', 'CHARTERS', 'CHARTER', 'TOURS',
  'TOUR', 'PHOTOGRAPHY', 'VIDEOGRAPHY', 'PRODUCTIONS', 'PRODUCTION', 'STUDIO',
  'STUDIOS', 'MEDIA', 'MARKETING', 'ADVERTISING', 'DIGITAL', 'TECHNOLOGY',
  'TECHNOLOGIES', 'TECH', 'SOFTWARE', 'DEVELOPMENT', 'DEVELOPMENTS',
  'DEVELOPERS', 'DESIGN', 'DESIGNS', 'FINANCIAL', 'FINANCE', 'FUNDING', 'FUNDS',
  'FUND', 'LENDING', 'LENDERS', 'INSURANCE', 'MORTGAGE', 'INVESTMENTS',
  'INVESTMENT', 'ACCOUNTING', 'BOOKKEEPING', 'TAX', 'LEGAL', 'LAW', 'ATTORNEYS',
  'ADVISORY', 'ADVISORS', 'ADVISOR', 'STAFFING', 'RECRUITING', 'CATERING',
  'EVENTS', 'EVENT', 'ENTERTAINMENT', 'SECURITY', 'STORAGE', 'SUPPLY',
  'SUPPLIES', 'WHOLESALE', 'RETAIL', 'MARKET', 'MARKETS', 'IMPORTS', 'EXPORTS',
  'TRADING', 'DISTRIBUTORS', 'DISTRIBUTION', 'GLOBAL', 'INTERNATIONAL',
  'EXPRESS', 'FOOD', 'FOODS', 'APPAREL', 'FASHION', 'JEWELRY', 'FURNITURE',
  'DECOR', 'HOME', 'HOMES', 'PETS', 'CARE', 'HEALTH', 'HEALTHCARE', 'WELLNESS',
  'FITNESS', 'GYM', 'YOGA', 'NAILS', 'HAIR', 'BEAUTY', 'SALON', 'SPA', 'DELI',
  'PIZZA', 'BAKERY', 'CAFE', 'COFFEE', 'DINER', 'GRILL', 'KITCHEN', 'DESSERTS',
  'SWEETS', 'CANDY', 'BOUTIQUE', 'SHOP', 'STORE', 'GROCERY', 'PHARMACY',
  'CLINIC', 'DENTAL', 'MEDICAL', 'THERAPY', 'COUNSELING', 'PLUMBING',
  'ELECTRIC', 'ELECTRICAL', 'ROOFING', 'FLOORING', 'PAINTING', 'LANDSCAPING',
  'CONSTRUCTION', 'CONTRACTING', 'CONTRACTORS', 'BUILDERS', 'REMODELING',
  'REPAIR', 'REPAIRS', 'PERFORMANCE', 'BUSINESS', 'COMMERCE', 'TEAM',
  'COLLECTIVE', 'NETWORK', 'NETWORKING', 'BRANDS', 'BRAND', 'CORE', 'LAB',
  'LABS', 'HUB', 'WORKS', 'SYSTEMS', 'STRATEGIES', 'STRATEGY', 'PERMITS',
  'PERMIT', 'CABINETS', 'GRANITE', 'STONE', 'CONCRETE', 'EXTERIOR', 'INTERIOR',
  'ELEVATION', 'ASSURANCE', 'INTEGRITY', 'LEGACY', 'EXPERTS', 'EXPERT',
])

export function isLikelyPersonName(rawName) {
  if (!rawName) return false

  let tokens = rawName
    .toUpperCase()
    .replace(/[.,'"]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  // Strip entity-suffix words repeatedly from the end (handles multi-word
  // suffixes like "LIMITED LIABILITY COMPANY").
  while (tokens.length > 0 && SUFFIX_WORDS.has(tokens[tokens.length - 1])) {
    tokens = tokens.slice(0, -1)
  }

  if (tokens.length < 2 || tokens.length > 3) return false

  if (tokens.length === 2) {
    const [first, second] = tokens
    // "FIRST_NAME LAST_NAME" (e.g. "ANDREW HILL").
    if (FIRST_NAMES.has(first) && LAST_NAMES.has(second)) return true
    // "FIRST_NAME <any other word>" (e.g. "KURT KASPAR"), unless that other
    // word is a known business/industry term (e.g. "SEAN SOLUTIONS").
    if (FIRST_NAMES.has(first) && second.length > 1 && !BUSINESS_WORDS.has(second)) return true
    return false
  }

  // 3-word core (e.g. "JOHN M SMITH", "MOLLY MOLLOY CATLETT") - every word
  // must be a recognized name word (a single letter counts as an initial).
  const isNameWord = (t) => t.length === 1 || FIRST_NAMES.has(t) || LAST_NAMES.has(t)
  if (!tokens.every(isNameWord)) return false

  const hasFirst = tokens.some((t) => FIRST_NAMES.has(t))
  const hasLast = tokens.some((t) => LAST_NAMES.has(t))
  return hasFirst && hasLast
}

// Removes business records whose name is likely just a person's name - see
// isLikelyPersonName() above. Only ever applied to business records (never
// events), since the privacy concern is specific to Sunbiz filer names.
export function filterOutPersonNames(businesses) {
  return businesses.filter((b) => !isLikelyPersonName(b.name))
}

// MEPC Commander — Application Configuration
// ────────────────────────────────────────────
// REQUIRED BEFORE FIRST USE:
//   1. Set SUPABASE_URL and SUPABASE_ANON_KEY (from Supabase Dashboard → Settings → API)
//   2. Update COMPANY block with your company details
// See docs/setup.md for step-by-step instructions.

export const CONFIG = {
  SUPABASE_URL:      'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

  APP_NAME: 'MEPC Commander',
  VERSION:  '1.1.0',

  TAX_RATE: 0.05,
  CURRENCY: 'CAD',

  COMPANY: {
    name:    'MEC Mechanical Inc.',
    address: '1936 Powell Street',
    city:    'Vancouver',
    province:'BC',
    postal:  'V5L 1J3',
    phone:   '604-298-8383',
    email:   'admin@mecmechanical.ca',
    gst:     '000000000 RT0001',
    website: 'www.mecmechanical.ca',
  },

  LABOUR_RATES: {
    weekday_callout: 145.00,
    weekday_hourly:  115.00,
    weekend_callout: 260.00,
    weekend_hourly:  230.00,
    pm_hourly:       115.00,
    minimum_hours:   2,
  },

  // From Material_Markup_Matrix.xlsx
  MARKUP_MATRIX: [
    { from: 0.01,    to: 2.49,    multiplier: 3.21, label: '$0.01 – $2.49' },
    { from: 2.50,    to: 4.99,    multiplier: 2.68, label: '$2.50 – $4.99' },
    { from: 5.00,    to: 19.99,   multiplier: 2.07, label: '$5.00 – $19.99' },
    { from: 20.00,   to: 79.99,   multiplier: 1.87, label: '$20.00 – $79.99' },
    { from: 80.00,   to: 149.99,  multiplier: 1.79, label: '$80.00 – $149.99' },
    { from: 150.00,  to: 999.99,  multiplier: 1.61, label: '$150.00 – $999.99' },
    { from: 1000.00, to: 1999.99, multiplier: 1.50, label: '$1,000 – $1,999' },
    { from: 2000.00, to: 2999.99, multiplier: 1.45, label: '$2,000 – $2,999' },
    { from: 3000.00, to: null,    multiplier: 1.34, label: '$3,000 and up' },
  ],

  PROPOSAL_VALID_DAYS: 30,
  QUOTE_VALID_DAYS:    30,
  PM_OVERHEAD_PCT:     0.30,
  PM_MARGIN_PCT:       0.20,

  FREQUENCIES: [
    { value: 'monthly',     label: 'Monthly',     visits: 12 },
    { value: 'quarterly',   label: 'Quarterly',   visits: 4  },
    { value: 'semi-annual', label: 'Semi-Annual', visits: 2  },
    { value: 'annual',      label: 'Annual',      visits: 1  },
    { value: 'custom',      label: 'Custom',      visits: 0  },
  ],

  QUOTE_STATUSES:    ['draft','sent','pending-approval','approved','deferred','declined','expired'],
  PROPOSAL_STATUSES: ['draft','sent','accepted','active','expired','cancelled'],

  EQUIPMENT_CATEGORIES: [
    'HVAC','Hydronic','Plumbing','Drainage','Controls',
    'Backup & Fuel','Chemical Treatment','Pool','Irrigation',
    'Compressed Air','Radiant / Snowmelt','Meters & Gauges','Valves',
  ],

  CONDITION_OPTIONS:  ['Excellent','Good','Fair','Poor','Critical'],
  BUILDING_TYPES:     ['Commercial','Strata / Residential','Industrial','Institutional','Mixed-Use','Highrise'],

  DEFICIENCY_PRIORITIES: [
    { value: 'Critical', label: 'Critical', color: '#dc2626' },
    { value: 'High',     label: 'High',     color: '#f97316' },
    { value: 'Medium',   label: 'Medium',   color: '#d97706' },
    { value: 'Low',      label: 'Low',      color: '#64748b' },
  ],
};

export function getMarkupMultiplier(costDollars) {
  for (const tier of CONFIG.MARKUP_MATRIX) {
    if (costDollars >= tier.from && (tier.to === null || costDollars <= tier.to)) {
      return tier.multiplier;
    }
  }
  return 1.34;
}

export function applyMarkup(costDollars) {
  return +(costDollars * getMarkupMultiplier(costDollars)).toFixed(2);
}

export function calcPMSellPrice(totalHours) {
  const labourCost   = totalHours * CONFIG.LABOUR_RATES.pm_hourly;
  const withOverhead = labourCost * (1 + CONFIG.PM_OVERHEAD_PCT);
  return +(withOverhead / (1 - CONFIG.PM_MARGIN_PCT)).toFixed(2);
}

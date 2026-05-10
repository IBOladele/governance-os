/**
 * Jurisdiction-specific compliance obligation templates.
 *
 * This is a hand-maintained table of the annual filing deadlines that apply to
 * private limited companies / payment institutions in each country where your organization
 * has an entity. Dates are expressed relative to FYE unless they are fixed
 * calendar dates (absoluteMonth/absoluteDay).
 *
 * Sources (as of 2026, general knowledge — NOT a substitute for local counsel):
 *   Singapore  — ACRA Annual Return 7 mo after FYE; IRAS YA tax return 30 Nov
 *   UK         — Companies House confirmation statement + accounts 9 mo after
 *                FYE; HMRC CT600 12 mo after FYE
 *   US         — Form 1120 federal corporate return 15 Apr (3.5 mo after 31
 *                Dec FYE); Delaware franchise tax 1 Mar
 *   Netherlands— KVK financial statements 8 mo after FYE; CIT return 5 mo
 *   Lithuania  — Bank of Lithuania annual report 4 mo; CIT 15 Jun
 *   Malta      — MBR annual return within 42 days of made-up date; CIT 9 mo
 *   Australia  — ASIC annual review (on anniversary, not FYE); ATO tax 15 May
 *   Hong Kong  — Companies Registry annual return 42 days after anniversary;
 *                IRD profits tax 4 mo after FYE
 *   India      — MCA AOC-4 within 30 days of AGM; MGT-7 within 60 days; CIT
 *                Oct/Nov of AY
 *   Japan      — NTA corporate tax 2 mo after FYE
 *   Canada     — T2 within 6 mo of FYE
 *   Brazil     — ECF annual 31 Jul; DCTFWeb monthly
 *   Colombia   — DIAN renta filing Apr-May
 *   Mexico     — ISR annual return 31 Mar
 *   Indonesia  — SPT PPh Badan 30 Apr
 *   Malaysia   — SSM annual return within 30 days of anniversary; LHDN Form C
 *                7 mo after FYE
 *   New Zealand— Companies Office annual return (anniversary); IRD IR4 7 Jul
 *
 * IMPORTANT: These are broad rules-of-thumb. Extensions, public holidays,
 * filing category (small/large), and entity type all shift the actual dates.
 * Treat every auto-generated obligation as a draft to be reviewed by the
 * responsible team before the due date is relied upon.
 */

export interface ObligationRule {
  requirementType: string;
  regulator: string;
  description: string;
  owner: 'Legal Team' | 'Finance Team' | 'Tax Team' | 'Compliance Team';
  recurrence: 'annual' | 'quarterly' | 'monthly' | 'none';
  /** Months to add to the FYE to get the due date. Mutually exclusive with absolute fields. */
  offsetMonthsFromFye?: number;
  /** If set, due date is the given month (1-12) and day, in the year FYE falls in (or next year). */
  absoluteMonth?: number;
  absoluteDay?: number;
  /** If true, the absolute date is in the year AFTER the FYE. Default true when absolute*. */
  nextCalendarYear?: boolean;
}

export interface JurisdictionRules {
  country: string;
  /** Obligations that always apply to any entity in this country. */
  obligations: ObligationRule[];
}

export const JURISDICTION_RULES: Record<string, JurisdictionRules> = {
  Singapore: {
    country: 'Singapore',
    obligations: [
      {
        requirementType: 'Annual Return',
        regulator: 'ACRA',
        description: 'Annual Return filing with ACRA (within 7 months of FYE for private companies)',
        owner: 'Legal Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 7,
      },
      {
        requirementType: 'Corporate Tax Filing',
        regulator: 'IRAS',
        description: 'Corporate Income Tax Return (Form C-S / Form C) — due 30 November',
        owner: 'Tax Team',
        recurrence: 'annual',
        absoluteMonth: 11,
        absoluteDay: 30,
      },
      {
        requirementType: 'Estimated Chargeable Income',
        regulator: 'IRAS',
        description: 'ECI filing within 3 months of FYE',
        owner: 'Tax Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 3,
      },
    ],
  },
  'United Kingdom': {
    country: 'United Kingdom',
    obligations: [
      {
        requirementType: 'Confirmation Statement',
        regulator: 'Companies House',
        description: 'Confirmation statement (CS01) — due within 14 days of review period',
        owner: 'Legal Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 12,
      },
      {
        requirementType: 'Annual Accounts',
        regulator: 'Companies House',
        description: 'Statutory annual accounts — due 9 months after FYE for private companies',
        owner: 'Finance Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 9,
      },
      {
        requirementType: 'Corporate Tax Filing',
        regulator: 'HMRC',
        description: 'CT600 Corporation Tax Return — due 12 months after FYE',
        owner: 'Tax Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 12,
      },
    ],
  },
  'United States': {
    country: 'United States',
    obligations: [
      {
        requirementType: 'Federal Income Tax Return',
        regulator: 'IRS',
        description: 'Form 1120 Federal Corporate Income Tax Return — due 15 April',
        owner: 'Tax Team',
        recurrence: 'annual',
        absoluteMonth: 4,
        absoluteDay: 15,
      },
      {
        requirementType: 'Delaware Franchise Tax',
        regulator: 'Delaware Division of Corporations',
        description: 'Delaware annual franchise tax + report — due 1 March',
        owner: 'Legal Team',
        recurrence: 'annual',
        absoluteMonth: 3,
        absoluteDay: 1,
      },
    ],
  },
  Netherlands: {
    country: 'Netherlands',
    obligations: [
      {
        requirementType: 'Annual Financial Statements',
        regulator: 'KVK',
        description: 'Annual financial statements filing with Chamber of Commerce — within 8 months of FYE',
        owner: 'Finance Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 8,
      },
      {
        requirementType: 'Corporate Income Tax Return',
        regulator: 'Belastingdienst',
        description: 'Vennootschapsbelasting (CIT) return — within 5 months of FYE',
        owner: 'Tax Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 5,
      },
    ],
  },
  Lithuania: {
    country: 'Lithuania',
    obligations: [
      {
        requirementType: 'Annual Financial Statements',
        regulator: 'Bank of Lithuania',
        description: 'Annual report filing with Bank of Lithuania — within 4 months of FYE',
        owner: 'Finance Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 4,
      },
      {
        requirementType: 'Corporate Tax Filing',
        regulator: 'STI (Lithuanian Tax Inspectorate)',
        description: 'Annual CIT return — due 15 June',
        owner: 'Tax Team',
        recurrence: 'annual',
        absoluteMonth: 6,
        absoluteDay: 15,
      },
      {
        requirementType: 'Own Funds Return (COREP)',
        regulator: 'Bank of Lithuania',
        description: 'Quarterly own funds / prudential return',
        owner: 'Compliance Team',
        recurrence: 'quarterly',
      },
    ],
  },
  Malta: {
    country: 'Malta',
    obligations: [
      {
        requirementType: 'Annual Return',
        regulator: 'MBR',
        description: 'Annual Return filing with Malta Business Registry',
        owner: 'Legal Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 12,
      },
      {
        requirementType: 'Corporate Tax Filing',
        regulator: 'CFR Malta',
        description: 'Corporate income tax return — within 9 months of FYE',
        owner: 'Tax Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 9,
      },
    ],
  },
  Australia: {
    country: 'Australia',
    obligations: [
      {
        requirementType: 'ASIC Annual Review',
        regulator: 'ASIC',
        description: 'Annual company review (due on anniversary of registration)',
        owner: 'Legal Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 12,
      },
      {
        requirementType: 'Corporate Tax Filing',
        regulator: 'ATO',
        description: 'Company tax return — due 15 May following the income year',
        owner: 'Tax Team',
        recurrence: 'annual',
        absoluteMonth: 5,
        absoluteDay: 15,
      },
    ],
  },
  'Hong Kong': {
    country: 'Hong Kong',
    obligations: [
      {
        requirementType: 'Annual Return',
        regulator: 'Companies Registry',
        description: 'Annual Return (NAR1) filed within 42 days of anniversary of incorporation',
        owner: 'Legal Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 12,
      },
      {
        requirementType: 'Profits Tax Return',
        regulator: 'IRD',
        description: 'Profits Tax Return — typically due 4 months after FYE (Dec FYE: mid-August)',
        owner: 'Tax Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 4,
      },
    ],
  },
  India: {
    country: 'India',
    obligations: [
      {
        requirementType: 'Annual Return (MGT-7)',
        regulator: 'MCA',
        description: 'Annual Return MGT-7 — within 60 days of AGM',
        owner: 'Legal Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 8,
      },
      {
        requirementType: 'Financial Statements (AOC-4)',
        regulator: 'MCA',
        description: 'Financial Statements AOC-4 — within 30 days of AGM',
        owner: 'Finance Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 7,
      },
      {
        requirementType: 'Corporate Tax Filing',
        regulator: 'Income Tax Department',
        description: 'ITR-6 Corporate Income Tax Return — due 31 October',
        owner: 'Tax Team',
        recurrence: 'annual',
        absoluteMonth: 10,
        absoluteDay: 31,
      },
    ],
  },
  Japan: {
    country: 'Japan',
    obligations: [
      {
        requirementType: 'Corporate Tax Filing',
        regulator: 'NTA',
        description: 'Corporate tax return (Houjin-zei) — due 2 months after FYE',
        owner: 'Tax Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 2,
      },
      {
        requirementType: 'Consumption Tax Return',
        regulator: 'NTA',
        description: 'Annual consumption tax return — 2 months after FYE',
        owner: 'Tax Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 2,
      },
    ],
  },
  Canada: {
    country: 'Canada',
    obligations: [
      {
        requirementType: 'T2 Corporate Income Tax Return',
        regulator: 'CRA',
        description: 'T2 Corporate Income Tax Return — within 6 months of FYE',
        owner: 'Tax Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 6,
      },
      {
        requirementType: 'Annual Return',
        regulator: 'Corporations Canada',
        description: 'Federal annual return (anniversary basis)',
        owner: 'Legal Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 12,
      },
    ],
  },
  Brazil: {
    country: 'Brazil',
    obligations: [
      {
        requirementType: 'ECF Filing',
        regulator: 'Receita Federal',
        description: 'Escrituração Contábil Fiscal (annual) — due 31 July',
        owner: 'Tax Team',
        recurrence: 'annual',
        absoluteMonth: 7,
        absoluteDay: 31,
      },
      {
        requirementType: 'ECD Filing',
        regulator: 'Receita Federal',
        description: 'Escrituração Contábil Digital — due last business day of May',
        owner: 'Finance Team',
        recurrence: 'annual',
        absoluteMonth: 5,
        absoluteDay: 31,
      },
    ],
  },
  Colombia: {
    country: 'Colombia',
    obligations: [
      {
        requirementType: 'Corporate Income Tax Return (Renta)',
        regulator: 'DIAN',
        description: 'Annual Renta filing — due April-May depending on NIT',
        owner: 'Tax Team',
        recurrence: 'annual',
        absoluteMonth: 4,
        absoluteDay: 30,
      },
    ],
  },
  Mexico: {
    country: 'Mexico',
    obligations: [
      {
        requirementType: 'ISR Annual Return',
        regulator: 'SAT',
        description: 'Annual Impuesto Sobre la Renta return — due 31 March',
        owner: 'Tax Team',
        recurrence: 'annual',
        absoluteMonth: 3,
        absoluteDay: 31,
      },
    ],
  },
  Indonesia: {
    country: 'Indonesia',
    obligations: [
      {
        requirementType: 'SPT PPh Badan',
        regulator: 'DJP',
        description: 'Annual corporate income tax return — due 30 April',
        owner: 'Tax Team',
        recurrence: 'annual',
        absoluteMonth: 4,
        absoluteDay: 30,
      },
    ],
  },
  Malaysia: {
    country: 'Malaysia',
    obligations: [
      {
        requirementType: 'Annual Return',
        regulator: 'SSM',
        description: 'SSM Annual Return — within 30 days of anniversary of incorporation',
        owner: 'Legal Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 12,
      },
      {
        requirementType: 'Corporate Tax Filing (Form C)',
        regulator: 'LHDN',
        description: 'Form C Corporate Tax Return — 7 months after FYE',
        owner: 'Tax Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 7,
      },
    ],
  },
  'New Zealand': {
    country: 'New Zealand',
    obligations: [
      {
        requirementType: 'Annual Return',
        regulator: 'Companies Office',
        description: 'Annual return (on anniversary month)',
        owner: 'Legal Team',
        recurrence: 'annual',
        offsetMonthsFromFye: 12,
      },
      {
        requirementType: 'IR4 Income Tax Return',
        regulator: 'Inland Revenue',
        description: 'Company tax return — due 7 July (standard) following income year',
        owner: 'Tax Team',
        recurrence: 'annual',
        absoluteMonth: 7,
        absoluteDay: 7,
      },
    ],
  },
};

/**
 * Add N months to a UTC date, clamping the day-of-month to the last valid day
 * in the target month. This avoids JS's default `setMonth` overflow behaviour
 * where e.g. Dec 31 + 2 months becomes Mar 3 instead of Feb 28.
 */
function addMonthsClamped(date: Date, months: number): Date {
  const originalDay = date.getUTCDate();
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  // Last day of the target month (day 0 of month+1 = last day of month)
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(originalDay, lastDay)));
}

/**
 * Resolve an ObligationRule to a concrete due Date, given the entity's FYE
 * month/day and a reference "today" against which we want to find the next
 * occurrence.
 */
export function computeDueDate(
  rule: ObligationRule,
  fyeMonth: number, // 0-11
  fyeDay: number,
  today: Date,
): Date {
  if (rule.absoluteMonth != null && rule.absoluteDay != null) {
    let y = today.getUTCFullYear();
    let candidate = new Date(Date.UTC(y, rule.absoluteMonth - 1, rule.absoluteDay));
    if (candidate <= today) {
      y += 1;
      candidate = new Date(Date.UTC(y, rule.absoluteMonth - 1, rule.absoluteDay));
    }
    return candidate;
  }

  // offsetMonthsFromFye path — anchor on the next FYE in the future
  const offset = rule.offsetMonthsFromFye ?? 0;
  let year = today.getUTCFullYear();
  let fye = new Date(Date.UTC(year, fyeMonth, fyeDay));
  let due = addMonthsClamped(fye, offset);
  if (due <= today) {
    year += 1;
    fye = new Date(Date.UTC(year, fyeMonth, fyeDay));
    due = addMonthsClamped(fye, offset);
  }
  return due;
}

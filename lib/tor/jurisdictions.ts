/**
 * Jurisdiction-specific Companies Act requirements for Board Terms of Reference.
 * Each entry contains the statutory defaults that apply unless the constitution
 * or SHA says otherwise.
 */

export interface JurisdictionTemplate {
  country: string;
  act: string;          // Name of the primary legislation
  actYear: number;
  regulator: string;    // Primary corporate regulator
  quorumDefault: number;           // minimum directors for quorum (statutory)
  noticePeriodDays: number;        // minimum notice for board meetings
  annualMeetingRequired: boolean;  // whether AGM is mandatory
  minutesRetentionYears: number;   // statutory minimum retention
  directorDutiesSummary: string;   // plain-English duties summary
  keyStatutoryClauses: string[];   // mandatory provisions to include in ToR
  reservedMattersDefaults: string[]; // common reserved matters for this jurisdiction
  disclaimer: string;
}

export const JURISDICTION_TEMPLATES: Record<string, JurisdictionTemplate> = {

  Singapore: {
    country: 'Singapore',
    act: 'Companies Act',
    actYear: 1967,
    regulator: 'Accounting and Corporate Regulatory Authority (ACRA)',
    quorumDefault: 2,
    noticePeriodDays: 14,
    annualMeetingRequired: true,
    minutesRetentionYears: 5,
    directorDutiesSummary:
      'Directors owe fiduciary duties to act honestly and in the best interests of the company (s.157), exercise reasonable care, skill and diligence, avoid conflicts of interest, and not make improper use of company information or position.',
    keyStatutoryClauses: [
      'Board composition shall comply with the Singapore Companies Act (Cap. 50) and any applicable MAS regulations.',
      'Each director must comply with the duty to act honestly and use reasonable diligence in the discharge of their duties (s.157, Companies Act).',
      'Directors must disclose any conflict of interest at the earliest opportunity (s.156, Companies Act).',
      'A register of directors\' interests must be maintained and disclosed at each meeting where relevant.',
      'The Company Secretary shall be a natural person ordinarily resident in Singapore (s.171, Companies Act).',
      'Board minutes must be kept for at least five (5) years and made available to directors on request.',
      'The Board shall ensure the company files its Annual Return with ACRA within the prescribed deadline.',
    ],
    reservedMattersDefaults: [
      'Approval of annual operating budget and any material variance thereto',
      'Capital expenditure exceeding SGD 500,000 per transaction',
      'Entering into contracts or commitments exceeding SGD 1,000,000 in aggregate',
      'Acquisition or disposal of any business, subsidiary, or material asset',
      'Appointment and removal of the Chief Executive Officer',
      'Approval of the annual financial statements',
      'Declaration of dividends',
      'Changes to the company\'s constitution or share capital',
      'Approval of related-party transactions',
      'Any transaction with a director or connected person',
      'Commencement or settlement of material litigation',
      'Obtaining or refinancing credit facilities exceeding SGD 2,000,000',
      'Approval of MAS licence applications or regulatory submissions',
    ],
    disclaimer:
      'This Terms of Reference is a starting point based on Singapore Companies Act (Cap. 50) defaults as at the date of generation. It must be reviewed by qualified Singapore legal counsel before adoption and updated to reflect the company\'s constitution, any Shareholder Agreement, and applicable MAS or other regulatory requirements.',
  },

  'United Kingdom': {
    country: 'United Kingdom',
    act: 'Companies Act',
    actYear: 2006,
    regulator: 'Companies House / Financial Conduct Authority (FCA)',
    quorumDefault: 2,
    noticePeriodDays: 7,
    annualMeetingRequired: true,
    minutesRetentionYears: 10,
    directorDutiesSummary:
      'Directors owe statutory duties under ss.171–177 of the Companies Act 2006: to act within powers, promote the success of the company, exercise independent judgment, exercise reasonable care skill and diligence, avoid conflicts of interest, not accept benefits from third parties, and declare interests in proposed transactions.',
    keyStatutoryClauses: [
      'The Board shall operate in accordance with the Companies Act 2006 and the company\'s Articles of Association.',
      'Each director must act in accordance with the seven general duties set out in ss.171–177 of the Companies Act 2006.',
      'Directors must declare any direct or indirect interest in a proposed transaction or arrangement (s.177, Companies Act 2006).',
      'The Board shall maintain a register of directors\' interests and review it at the commencement of each meeting.',
      'Minutes of all Board meetings must be recorded and retained for at least ten (10) years (s.248, Companies Act 2006).',
      'Where the Company holds an FCA authorisation, the Board shall ensure ongoing compliance with the FCA\'s Threshold Conditions and SYSC requirements.',
      'The Board shall approve the Annual Report and Accounts and ensure timely filing at Companies House.',
    ],
    reservedMattersDefaults: [
      'Approval of annual budget and business plan',
      'Capital expenditure exceeding £250,000 per transaction or £500,000 in aggregate per annum',
      'Entering into contracts with a value exceeding £500,000',
      'Acquisition or disposal of any subsidiary, business or material asset',
      'Appointment and removal of the CEO and CFO',
      'Approval of annual financial statements and dividend declaration',
      'Amendments to the Articles of Association',
      'Issue or buyback of shares',
      'Related-party transactions',
      'Material changes to the group structure',
      'Commencement or settlement of litigation exceeding £100,000',
      'Approval of FCA regulatory submissions and material regulatory notifications',
      'Approval of any material outsourcing arrangements',
    ],
    disclaimer:
      'This Terms of Reference is a starting point based on the UK Companies Act 2006 as at the date of generation. It must be reviewed by qualified UK legal counsel before adoption and updated to reflect the company\'s Articles of Association, any Shareholder Agreement, and applicable FCA or other regulatory requirements.',
  },

  Malta: {
    country: 'Malta',
    act: 'Companies Act',
    actYear: 1995,
    regulator: 'Malta Business Registry (MBR) / Malta Financial Services Authority (MFSA)',
    quorumDefault: 2,
    noticePeriodDays: 7,
    annualMeetingRequired: true,
    minutesRetentionYears: 10,
    directorDutiesSummary:
      'Directors owe duties under the Companies Act (Cap. 386) to act honestly and in good faith in the best interests of the company, exercise the care, diligence and skill of a reasonably prudent person, and avoid conflicts of interest. MFSA-regulated entities are additionally subject to the fit and proper requirements under the relevant MFSA Rules.',
    keyStatutoryClauses: [
      'The Board shall operate in accordance with the Companies Act (Cap. 386) and the company\'s Memorandum and Articles of Association.',
      'Each director must comply with the duty of care and loyalty to the company as set out in the Companies Act (Cap. 386).',
      'Directors must disclose any personal interest in a transaction or arrangement at the earliest opportunity.',
      'Minutes of all Board meetings must be recorded and retained for at least ten (10) years.',
      'Where the Company holds an MFSA licence, the Board shall ensure ongoing compliance with applicable MFSA Rules and the requirements of the relevant EU Directive or Regulation (including PSD2 / EMD2 as applicable).',
      'The Board shall ensure annual accounts are prepared and submitted to the Malta Business Registry within the prescribed deadline.',
      'At least one director must be resident in the EU for MFSA-regulated entities, unless a waiver has been granted.',
    ],
    reservedMattersDefaults: [
      'Approval of annual budget and business plan',
      'Capital expenditure exceeding €200,000 per transaction',
      'Entering into contracts exceeding €500,000 in value',
      'Acquisition or disposal of any subsidiary or material asset',
      'Appointment and removal of the Chief Executive Officer',
      'Approval of annual financial statements',
      'Declaration of dividends',
      'Amendments to the Memorandum and Articles of Association',
      'Issue or buyback of shares',
      'Related-party transactions and intragroup arrangements',
      'Material changes to MFSA licence conditions or regulatory permissions',
      'Approval of AML/CFT policies and appointment of the MLRO',
      'Commencement or settlement of material litigation',
    ],
    disclaimer:
      'This Terms of Reference is a starting point based on the Malta Companies Act (Cap. 386) and applicable MFSA requirements as at the date of generation. It must be reviewed by qualified Maltese legal counsel before adoption and updated to reflect the company\'s Memorandum and Articles of Association, any Shareholder Agreement, and all applicable MFSA Rules.',
  },

  Lithuania: {
    country: 'Lithuania',
    act: 'Law on Companies',
    actYear: 2000,
    regulator: 'State Enterprise Centre of Registers / Bank of Lithuania (Lietuvos bankas)',
    quorumDefault: 2,
    noticePeriodDays: 7,
    annualMeetingRequired: true,
    minutesRetentionYears: 10,
    directorDutiesSummary:
      'Directors owe duties under the Law on Companies of the Republic of Lithuania to act in the best interests of the company, exercise reasonable care and diligence, avoid conflicts of interest, and maintain confidentiality. Directors of Bank of Lithuania-supervised entities are additionally subject to fit and proper requirements.',
    keyStatutoryClauses: [
      'The Board shall operate in accordance with the Law on Companies of the Republic of Lithuania and the company\'s Articles of Association.',
      'Each director must act honestly and in the best interests of the company and its shareholders.',
      'Directors must disclose any conflict of interest without delay and abstain from voting on the relevant matter.',
      'Minutes of all Board meetings must be signed by all directors present and retained for at least ten (10) years.',
      'Where the Company holds a Bank of Lithuania licence (e.g. EMI, PI licence), the Board shall ensure ongoing compliance with applicable Bank of Lithuania supervisory requirements and EU Directives.',
      'The Board shall oversee the preparation and approval of annual financial statements in accordance with Lithuanian law.',
      'The Board shall ensure that the company maintains adequate AML/CFT controls as required by applicable Lithuanian and EU anti-money laundering legislation.',
    ],
    reservedMattersDefaults: [
      'Approval of annual budget and strategic plan',
      'Capital expenditure exceeding €150,000 per transaction',
      'Entering into contracts exceeding €300,000 in value',
      'Acquisition or disposal of any subsidiary or material asset',
      'Appointment and removal of the Chief Executive Officer',
      'Approval of annual financial statements',
      'Declaration of dividends or profit distribution',
      'Amendments to the Articles of Association',
      'Changes to share capital or issue of new shares',
      'Related-party transactions',
      'Material changes to Bank of Lithuania licence conditions',
      'Approval of AML/CFT programme and appointment of the MLRO',
      'Commencement or settlement of material litigation',
      'Material outsourcing arrangements',
    ],
    disclaimer:
      'This Terms of Reference is a starting point based on the Lithuanian Law on Companies and applicable Bank of Lithuania requirements as at the date of generation. It must be reviewed by qualified Lithuanian legal counsel before adoption.',
  },

  Australia: {
    country: 'Australia',
    act: 'Corporations Act',
    actYear: 2001,
    regulator: 'Australian Securities and Investments Commission (ASIC)',
    quorumDefault: 2,
    noticePeriodDays: 14,
    annualMeetingRequired: true,
    minutesRetentionYears: 7,
    directorDutiesSummary:
      'Directors owe duties under the Corporations Act 2001 (Cth) to act in good faith in the best interests of the corporation and for a proper purpose (s.181), exercise care and diligence (s.180), avoid improper use of position (s.182) or information (s.183), and manage conflicts of interest.',
    keyStatutoryClauses: [
      'The Board shall operate in accordance with the Corporations Act 2001 (Cth) and the company\'s Constitution.',
      'Each director must comply with the duties of care and diligence (s.180), good faith (s.181), and must not improperly use their position (s.182) or information (s.183).',
      'Directors must disclose any material personal interest in a matter being considered by the Board (s.191).',
      'Minutes of Board proceedings must be kept for at least seven (7) years (s.251A).',
      'The Board shall approve the annual financial report and directors\' report in compliance with s.292 of the Corporations Act.',
      'The Board shall ensure lodgement of annual returns and other documents with ASIC within prescribed timeframes.',
      'Where the Company holds an ASIC licence (e.g. Australian Financial Services Licence), the Board shall maintain oversight of ongoing licence compliance.',
    ],
    reservedMattersDefaults: [
      'Approval of annual budget and business plan',
      'Capital expenditure exceeding AUD 500,000 per transaction',
      'Entering into contracts or commitments exceeding AUD 1,000,000',
      'Acquisition or disposal of any business, subsidiary or material asset',
      'Appointment and removal of the Chief Executive Officer',
      'Approval of annual financial statements',
      'Declaration of dividends',
      'Amendments to the Constitution',
      'Issue or buy-back of shares',
      'Related-party transactions under Chapter 2E of the Corporations Act',
      'Commencement or settlement of material litigation',
      'Approval of AFSL notifications and regulatory submissions to ASIC',
    ],
    disclaimer:
      'This Terms of Reference is a starting point based on the Corporations Act 2001 (Cth) as at the date of generation. It must be reviewed by qualified Australian legal counsel before adoption.',
  },

  India: {
    country: 'India',
    act: 'Companies Act',
    actYear: 2013,
    regulator: 'Registrar of Companies / Reserve Bank of India (RBI)',
    quorumDefault: 2,
    noticePeriodDays: 7,
    annualMeetingRequired: true,
    minutesRetentionYears: 8,
    directorDutiesSummary:
      'Directors owe duties under s.166 of the Companies Act, 2013 to act in accordance with the articles, act in good faith to promote the objects of the company, exercise duties with due and reasonable care, skill and diligence, not involve in a situation of direct or indirect conflict of interest, and not achieve or attempt to achieve any undue gain or advantage.',
    keyStatutoryClauses: [
      'The Board shall operate in accordance with the Companies Act, 2013 and the company\'s Memorandum and Articles of Association.',
      'Each director must comply with the duties set out in s.166 of the Companies Act, 2013.',
      'Directors must disclose their interest in any contract or arrangement at the Board meeting (s.184).',
      'Minutes of Board meetings must be retained permanently or for such period as prescribed under applicable rules.',
      'The Board shall ensure that related-party transactions are approved in accordance with s.188 of the Companies Act, 2013.',
      'Where the Company is a payment aggregator or regulated by the RBI, the Board shall ensure ongoing compliance with applicable RBI Master Directions.',
      'The Board shall ensure timely filing of all forms and returns with the Registrar of Companies.',
    ],
    reservedMattersDefaults: [
      'Approval of annual budget and business plan',
      'Capital expenditure exceeding INR 50,000,000 per transaction',
      'Entering into contracts exceeding INR 100,000,000 in value',
      'Acquisition or disposal of any subsidiary or material asset',
      'Appointment and removal of Managing Director / CEO',
      'Approval of annual financial statements',
      'Declaration of dividend',
      'Alterations to Memorandum or Articles of Association',
      'Issue of shares or debentures',
      'Related-party transactions under s.188 of the Companies Act, 2013',
      'Borrowings beyond limits set under s.180(1)(c)',
      'Commencement or settlement of material litigation',
      'RBI regulatory submissions and licence-related matters',
    ],
    disclaimer:
      'This Terms of Reference is a starting point based on the Indian Companies Act, 2013 as at the date of generation. It must be reviewed by qualified Indian legal counsel before adoption.',
  },

  Netherlands: {
    country: 'Netherlands',
    act: 'Dutch Civil Code (Burgerlijk Wetboek)',
    actYear: 1992,
    regulator: 'Dutch Authority for the Financial Markets (AFM) / De Nederlandsche Bank (DNB)',
    quorumDefault: 2,
    noticePeriodDays: 7,
    annualMeetingRequired: true,
    minutesRetentionYears: 7,
    directorDutiesSummary:
      'Directors owe duties under Book 2 of the Dutch Civil Code to properly perform their management tasks, act in the interests of the company and its stakeholders, and avoid conflicts of interest. Directors of DNB/AFM-supervised entities are additionally subject to suitability and reliability (deskundigheid en betrouwbaarheid) requirements.',
    keyStatutoryClauses: [
      'The Board shall operate in accordance with Book 2 of the Dutch Civil Code (Burgerlijk Wetboek) and the company\'s Articles of Association (Statuten).',
      'Each director must act in the interests of the company and its affiliated enterprise.',
      'Directors must report any conflict of interest to the Board and refrain from participating in deliberation and decision-making on the relevant matter.',
      'Minutes of Board meetings must be kept and retained for at least seven (7) years.',
      'Where the Company holds a DNB or AFM authorisation, the Board shall ensure ongoing compliance with applicable Dutch financial supervision legislation (Wet op het financieel toezicht).',
      'The Board shall ensure annual accounts are prepared and deposited with the Dutch Trade Register (Handelsregister) within the prescribed deadline.',
    ],
    reservedMattersDefaults: [
      'Approval of annual budget and multi-year plan',
      'Capital expenditure exceeding €300,000 per transaction',
      'Entering into contracts exceeding €750,000 in value',
      'Acquisition or disposal of any participation or material asset',
      'Appointment and removal of the Chief Executive Officer',
      'Approval of annual financial statements',
      'Profit distribution proposals to the General Meeting',
      'Amendments to the Articles of Association (Statuten)',
      'Issue or repurchase of shares',
      'Related-party transactions',
      'Material changes to DNB/AFM licence conditions',
      'Commencement or settlement of material litigation',
    ],
    disclaimer:
      'This Terms of Reference is a starting point based on Book 2 of the Dutch Civil Code and applicable Dutch financial supervision legislation as at the date of generation. It must be reviewed by qualified Dutch legal counsel before adoption.',
  },

  Malaysia: {
    country: 'Malaysia',
    act: 'Companies Act',
    actYear: 2016,
    regulator: 'Companies Commission of Malaysia (SSM) / Bank Negara Malaysia (BNM)',
    quorumDefault: 2,
    noticePeriodDays: 14,
    annualMeetingRequired: true,
    minutesRetentionYears: 7,
    directorDutiesSummary:
      'Directors owe duties under the Companies Act 2016 to act in good faith in the best interests of the company, exercise reasonable care, skill and diligence, and avoid conflicts of interest. Directors of BNM-regulated entities are additionally subject to the fit and proper requirements under applicable BNM policy documents.',
    keyStatutoryClauses: [
      'The Board shall operate in accordance with the Companies Act 2016 and the company\'s Constitution.',
      'Each director must comply with the fiduciary duties and duty of care under ss.213–217 of the Companies Act 2016.',
      'Directors must disclose any conflict of interest at the earliest opportunity (s.221, Companies Act 2016).',
      'Minutes of all Board meetings must be retained for at least seven (7) years.',
      'Where the Company holds a BNM licence or approval, the Board shall ensure ongoing compliance with applicable BNM policy documents and guidelines.',
      'The Board shall ensure annual financial statements and other returns are lodged with SSM within the prescribed timeframe.',
    ],
    reservedMattersDefaults: [
      'Approval of annual budget and business plan',
      'Capital expenditure exceeding MYR 1,000,000 per transaction',
      'Entering into contracts exceeding MYR 2,000,000 in value',
      'Acquisition or disposal of any subsidiary or material asset',
      'Appointment and removal of the Chief Executive Officer',
      'Approval of annual financial statements',
      'Declaration of dividends',
      'Amendments to the Constitution',
      'Issue or buyback of shares',
      'Related-party transactions',
      'Material changes to BNM licence conditions',
      'Commencement or settlement of material litigation exceeding MYR 500,000',
    ],
    disclaimer:
      'This Terms of Reference is a starting point based on the Malaysian Companies Act 2016 as at the date of generation. It must be reviewed by qualified Malaysian legal counsel before adoption.',
  },

  'Hong Kong': {
    country: 'Hong Kong',
    act: 'Companies Ordinance',
    actYear: 2014,
    regulator: 'Companies Registry / Hong Kong Monetary Authority (HKMA)',
    quorumDefault: 2,
    noticePeriodDays: 14,
    annualMeetingRequired: true,
    minutesRetentionYears: 10,
    directorDutiesSummary:
      'Directors owe duties under the Companies Ordinance (Cap. 622) and common law to act in good faith in the best interests of the company, exercise care, skill and diligence, avoid conflicts of interest, and not make unauthorised profit from their position.',
    keyStatutoryClauses: [
      'The Board shall operate in accordance with the Companies Ordinance (Cap. 622) and the company\'s Articles of Association.',
      'Each director must comply with the statutory and common law duties applicable to directors in Hong Kong.',
      'Directors must disclose any conflict of interest promptly and in accordance with the Companies Ordinance.',
      'Minutes of all Board meetings must be retained for at least ten (10) years.',
      'The Board shall ensure annual returns and audited financial statements are filed with the Companies Registry within the prescribed deadlines.',
      'Where the Company holds a licence from the HKMA or SFC, the Board shall ensure ongoing compliance with applicable ordinances and codes of conduct.',
    ],
    reservedMattersDefaults: [
      'Approval of annual budget and business plan',
      'Capital expenditure exceeding HKD 2,000,000 per transaction',
      'Entering into contracts exceeding HKD 5,000,000 in value',
      'Acquisition or disposal of any subsidiary or material asset',
      'Appointment and removal of the Chief Executive Officer',
      'Approval of annual financial statements',
      'Declaration of dividends',
      'Amendments to the Articles of Association',
      'Issue or buyback of shares',
      'Connected transactions',
      'Material changes to HKMA or SFC licence conditions',
      'Commencement or settlement of material litigation',
    ],
    disclaimer:
      'This Terms of Reference is a starting point based on the Hong Kong Companies Ordinance (Cap. 622) as at the date of generation. It must be reviewed by qualified Hong Kong legal counsel before adoption.',
  },

  UAE: {
    country: 'UAE',
    act: 'Federal Companies Law',
    actYear: 2021,
    regulator: 'Securities and Commodities Authority (SCA) / Central Bank of the UAE (CBUAE)',
    quorumDefault: 2,
    noticePeriodDays: 7,
    annualMeetingRequired: true,
    minutesRetentionYears: 5,
    directorDutiesSummary:
      'Directors owe duties under Federal Decree-Law No. 32 of 2021 on Commercial Companies to act in the best interests of the company, exercise reasonable care and diligence, avoid conflicts of interest, and comply with applicable UAE financial regulations.',
    keyStatutoryClauses: [
      'The Board shall operate in accordance with Federal Decree-Law No. 32 of 2021 and the company\'s Memorandum and Articles of Association.',
      'Each director must act in the best interests of the company and exercise their powers in good faith.',
      'Directors must disclose any conflict of interest and refrain from voting on the relevant matter.',
      'Minutes of all Board meetings must be recorded and retained for at least five (5) years.',
      'Where the Company holds a CBUAE licence (e.g. PSP licence), the Board shall ensure ongoing compliance with applicable CBUAE regulations and standards.',
      'The Board shall ensure financial statements are prepared and submitted to relevant authorities within prescribed deadlines.',
    ],
    reservedMattersDefaults: [
      'Approval of annual budget and business plan',
      'Capital expenditure exceeding AED 1,000,000 per transaction',
      'Entering into contracts exceeding AED 2,000,000 in value',
      'Acquisition or disposal of any subsidiary or material asset',
      'Appointment and removal of the Chief Executive Officer',
      'Approval of annual financial statements',
      'Distribution of profits',
      'Amendments to the Memorandum and Articles of Association',
      'Changes to share capital',
      'Related-party transactions',
      'Material changes to CBUAE or SCA licence conditions',
      'Commencement or settlement of material litigation',
    ],
    disclaimer:
      'This Terms of Reference is a starting point based on UAE Federal Decree-Law No. 32 of 2021 as at the date of generation. It must be reviewed by qualified UAE legal counsel before adoption.',
  },
};

/** Returns the best matching template for a given country string, falling back to a generic template. */
export function getJurisdictionTemplate(country: string): JurisdictionTemplate {
  // Direct match
  if (JURISDICTION_TEMPLATES[country]) return JURISDICTION_TEMPLATES[country];

  // Fuzzy match
  const lower = country.toLowerCase();
  for (const [key, tmpl] of Object.entries(JURISDICTION_TEMPLATES)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) {
      return tmpl;
    }
  }

  // Generic fallback
  return {
    country,
    act: 'applicable Companies legislation',
    actYear: new Date().getFullYear(),
    regulator: 'the relevant corporate regulator',
    quorumDefault: 2,
    noticePeriodDays: 7,
    annualMeetingRequired: true,
    minutesRetentionYears: 7,
    directorDutiesSummary:
      'Directors owe fiduciary duties to act honestly and in good faith in the best interests of the company, exercise reasonable care, skill and diligence, and avoid conflicts of interest.',
    keyStatutoryClauses: [
      'The Board shall operate in accordance with applicable companies legislation and the company\'s constitutional documents.',
      'Each director must act in good faith in the best interests of the company.',
      'Directors must disclose any conflict of interest at the earliest opportunity.',
      'Minutes of all Board meetings must be recorded and retained in accordance with applicable law.',
      'The Board shall ensure the company meets all statutory filing obligations.',
    ],
    reservedMattersDefaults: [
      'Approval of annual budget and business plan',
      'Material capital expenditure',
      'Acquisition or disposal of any subsidiary or material asset',
      'Appointment and removal of the Chief Executive Officer',
      'Approval of annual financial statements',
      'Declaration of dividends',
      'Amendments to constitutional documents',
      'Related-party transactions',
      'Commencement or settlement of material litigation',
    ],
    disclaimer:
      'This Terms of Reference is a starting point based on applicable companies legislation as at the date of generation. It must be reviewed by qualified local legal counsel before adoption.',
  };
}

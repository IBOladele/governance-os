/**
 * POST /api/entities/[id]/tor
 *
 * Stage 1 — Generates a Board Terms of Reference Word document (.docx)
 * using jurisdiction-specific Companies Act templates + user-supplied details.
 *
 * Stage 2 — If constitution / SHA files are uploaded (multipart), extracts
 * relevant clauses via Claude API and merges them into the template before
 * generating the document.
 *
 * Body (multipart/form-data):
 *   data         JSON string with TorFormData (see below)
 *   constitution (optional) PDF or DOCX file — company constitution / articles
 *   sha          (optional) PDF or DOCX file — Shareholder Agreement
 *
 * Returns: application/vnd.openxmlformats-officedocument.wordprocessingml.document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEntities, getDirectors } from '@/lib/db/queries';
import { getJurisdictionTemplate } from '@/lib/tor/jurisdictions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface TorFormData {
  quorum: number;
  meetingFrequency: string;       // e.g. "Quarterly"
  noticePeriodDays: number;
  chairCastingVote: boolean;
  reservedMatters: string[];      // selected from defaults + any custom ones added
  customReservedMatters: string;  // free-text additions, one per line
  purpose: string;                // entity purpose / business description
  effectiveDate: string;          // YYYY-MM-DD
}

// ── helpers ──────────────────────────────────────────────────────────────────

async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf')) {
    // Basic PDF text extraction — strips binary, keeps readable ASCII runs
    const raw = buffer.toString('latin1');
    const textBlocks: string[] = [];
    // Match PDF text operators: (text) Tj  and  [(text)] TJ
    const tjRe = /\(([^)]{1,2000})\)\s*Tj/g;
    const tjArrRe = /\[([^\]]{1,5000})\]\s*TJ/g;
    let m: RegExpExecArray | null;
    while ((m = tjRe.exec(raw)) !== null) {
      const t = m[1].replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\\\/g, '\\');
      if (t.trim().length > 3) textBlocks.push(t);
    }
    while ((m = tjArrRe.exec(raw)) !== null) {
      const inner = m[1].replace(/\([^)]*\)/g, s => s.slice(1, -1));
      if (inner.trim().length > 3) textBlocks.push(inner);
    }
    const text = textBlocks.join(' ').replace(/\s+/g, ' ').slice(0, 80000);
    return text || '[Could not extract text from PDF — please provide a text-based PDF]';
  }

  if (name.endsWith('.docx')) {
    // Extract from docx: unzip and read word/document.xml
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(buffer);
      const docXml = await zip.file('word/document.xml')?.async('string');
      if (!docXml) return '[Could not read document.xml from DOCX]';
      // Strip XML tags, decode entities
      const text = docXml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80000);
      return text || '[Empty document]';
    } catch {
      return '[Could not parse DOCX file]';
    }
  }

  return '[Unsupported file type — please upload PDF or DOCX]';
}

async function analyzeDocumentsWithClaude(
  entityName: string,
  country: string,
  constitutionText: string | null,
  shaText: string | null,
): Promise<{
  constitutionClauses: string[];
  shaClauses: string[];
  conflicts: string[];
  quorumOverride: number | null;
  noticeOverride: number | null;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { constitutionClauses: [], shaClauses: [], conflicts: [], quorumOverride: null, noticeOverride: null };
  }

  const docs: string[] = [];
  if (constitutionText) docs.push(`=== CONSTITUTION / ARTICLES OF ASSOCIATION ===\n${constitutionText.slice(0, 30000)}`);
  if (shaText) docs.push(`=== SHAREHOLDER AGREEMENT (SHA) ===\n${shaText.slice(0, 30000)}`);
  if (docs.length === 0) return { constitutionClauses: [], shaClauses: [], conflicts: [], quorumOverride: null, noticeOverride: null };

  const prompt = `You are a corporate governance expert reviewing documents for ${entityName} (${country}).

Extract the following information from the provided documents and return it as valid JSON only, with no additional text.

Documents:
${docs.join('\n\n')}

Extract:
1. constitutionClauses: Array of strings — specific clauses from the Constitution/Articles relevant to board governance (quorum, voting, meetings, powers, reserved matters). Each string should be a complete, standalone clause or paraphrase. Max 10.
2. shaClauses: Array of strings — specific clauses from the SHA relevant to board governance (reserved matters, veto rights, board composition, consent requirements). Max 10.
3. conflicts: Array of strings — any conflicts or inconsistencies between the Constitution and SHA that the board should be aware of. Max 5.
4. quorumOverride: number or null — if the documents specify a quorum different from the statutory default, provide that number. Otherwise null.
5. noticeOverride: number or null — if the documents specify a minimum notice period (in days) for board meetings, provide that number. Otherwise null.

Return ONLY valid JSON matching this schema:
{
  "constitutionClauses": ["string"],
  "shaClauses": ["string"],
  "conflicts": ["string"],
  "quorumOverride": number | null,
  "noticeOverride": number | null
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    console.error('[tor/analyze] Claude API error:', response.status);
    return { constitutionClauses: [], shaClauses: [], conflicts: [], quorumOverride: null, noticeOverride: null };
  }

  const json = await response.json();
  const text = json.content?.[0]?.text ?? '{}';
  try {
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? '{}');
    return {
      constitutionClauses: parsed.constitutionClauses ?? [],
      shaClauses: parsed.shaClauses ?? [],
      conflicts: parsed.conflicts ?? [],
      quorumOverride: typeof parsed.quorumOverride === 'number' ? parsed.quorumOverride : null,
      noticeOverride: typeof parsed.noticeOverride === 'number' ? parsed.noticeOverride : null,
    };
  } catch {
    return { constitutionClauses: [], shaClauses: [], conflicts: [], quorumOverride: null, noticeOverride: null };
  }
}

// ── Document generation ───────────────────────────────────────────────────────

async function generateTorDocx(params: {
  entity: { id: string; name: string; country: string; legalStructure: string; registrationNumber: string; regulator: string | null };
  directors: { name: string; role: string }[];
  form: TorFormData;
  aiAnalysis: Awaited<ReturnType<typeof analyzeDocumentsWithClaude>>;
  hasConstitution: boolean;
  hasSha: boolean;
}): Promise<Buffer> {
  const { entity, directors, form, aiAnalysis } = params;
  const tmpl = getJurisdictionTemplate(entity.country);

  const quorum = aiAnalysis.quorumOverride ?? form.quorum ?? tmpl.quorumDefault;
  const noticeDays = aiAnalysis.noticeOverride ?? form.noticePeriodDays ?? tmpl.noticePeriodDays;

  const allReservedMatters = [
    ...form.reservedMatters,
    ...(form.customReservedMatters
      ? form.customReservedMatters.split('\n').map(s => s.trim()).filter(Boolean)
      : []),
  ];

  const today = new Date(form.effectiveDate || Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Build JS for docx generation
  const script = `
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
        LevelFormat, Header, Footer, PageNumber, TabStopType, TabStopPosition } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};

const cell = (text, opts = {}) => new TableCell({
  borders: opts.noBorder ? noBorders : borders,
  width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
  shading: opts.shading ? { fill: opts.shading, type: ShadingType.CLEAR } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children: [new Paragraph({
    children: [new TextRun({ text: String(text), bold: !!opts.bold, size: opts.size ?? 20, font: 'Arial', color: opts.color ?? '000000' })],
    alignment: opts.align ?? AlignmentType.LEFT,
  })],
});

const h = (text, level) => new Paragraph({
  heading: level,
  children: [new TextRun({ text, font: 'Arial', bold: true })],
  spacing: { before: 240, after: 120 },
});

const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, font: 'Arial', size: opts.size ?? 20, italic: !!opts.italic, color: opts.color ?? '000000' })],
  spacing: { before: 80, after: 80 },
  alignment: opts.align,
});

const bullet = (text) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  children: [new TextRun({ text, font: 'Arial', size: 20 })],
  spacing: { before: 40, after: 40 },
});

const numbered = (text) => new Paragraph({
  numbering: { reference: 'numbers', level: 0 },
  children: [new TextRun({ text, font: 'Arial', size: 20 })],
  spacing: { before: 40, after: 40 },
});

const divider = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '4472C4', space: 1 } },
  children: [],
  spacing: { before: 120, after: 120 },
});

const directors = ${JSON.stringify(params.directors)};
const reservedMatters = ${JSON.stringify(allReservedMatters)};
const keyStatutoryClauses = ${JSON.stringify(tmpl.keyStatutoryClauses)};
const constitutionClauses = ${JSON.stringify(aiAnalysis.constitutionClauses)};
const shaClauses = ${JSON.stringify(aiAnalysis.shaClauses)};
const conflicts = ${JSON.stringify(aiAnalysis.conflicts)};
const hasConstitution = ${params.hasConstitution};
const hasSha = ${params.hasSha};

const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Arial', size: 20 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, color: '1F3864', font: 'Arial' },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, color: '2E5496', font: 'Arial' },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, color: '404040', font: 'Arial' },
        paragraph: { spacing: { before: 160, after: 60 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [
            new TextRun({ text: ${JSON.stringify(entity.name + ' — Board Terms of Reference')}, font: 'Arial', size: 16, color: '888888' }),
            new TextRun({ text: '\\t', children: [] }),
            new TextRun({ text: 'CONFIDENTIAL', font: 'Arial', size: 16, bold: true, color: 'C00000' }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 1 } },
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          children: [
            new TextRun({ text: ${JSON.stringify(entity.country + ' | ' + tmpl.act + ' ' + tmpl.actYear)}, font: 'Arial', size: 16, color: '888888' }),
            new TextRun({ text: '\\t', children: [] }),
            new TextRun({ text: 'Page ', font: 'Arial', size: 16, color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '888888' }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 1 } },
        })],
      }),
    },
    children: [
      // ── Cover ──────────────────────────────────────────────────────────────
      new Paragraph({
        children: [new TextRun({ text: 'BOARD OF DIRECTORS', font: 'Arial', size: 48, bold: true, color: '1F3864' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 720, after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: 'TERMS OF REFERENCE', font: 'Arial', size: 40, bold: true, color: '2E5496' })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 480 },
      }),
      divider(),
      new Paragraph({ spacing: { before: 240, after: 80 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: ${JSON.stringify(entity.name)}, font: 'Arial', size: 28, bold: true, color: '333333' })],
      }),
      p(${JSON.stringify(entity.legalStructure + ' · ' + entity.country)}, { align: AlignmentType.CENTER, color: '666666' }),
      p(${JSON.stringify('Registration No. ' + entity.registrationNumber)}, { align: AlignmentType.CENTER, color: '888888' }),
      new Paragraph({ spacing: { before: 480, after: 0 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Effective Date: ' + ${JSON.stringify(today)}, font: 'Arial', size: 20, italic: true, color: '555555' })],
      }),
      new Paragraph({ spacing: { before: 80, after: 0 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Version 1.0', font: 'Arial', size: 18, color: '888888' })],
      }),

      // ── Disclaimer banner ─────────────────────────────────────────────────
      new Paragraph({ spacing: { before: 480, after: 0 }, pageBreakBefore: false, children: [] }),
      new Table({
        width: { size: 9386, type: WidthType.DXA },
        columnWidths: [9386],
        rows: [new TableRow({ children: [new TableCell({
          borders,
          shading: { fill: 'FFF3CD', type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 180, right: 180 },
          width: { size: 9386, type: WidthType.DXA },
          children: [
            new Paragraph({ children: [new TextRun({ text: '⚠  LEGAL DISCLAIMER', font: 'Arial', size: 18, bold: true, color: '856404' })], spacing: { before: 0, after: 80 } }),
            new Paragraph({ children: [new TextRun({ text: ${JSON.stringify(tmpl.disclaimer)}, font: 'Arial', size: 16, color: '856404' })], spacing: { before: 0, after: 0 } }),
          ],
        })})] }),
      }),

      // ── Section 1: Purpose ────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      h('1. Purpose and Authority', HeadingLevel.HEADING_1),
      p('These Terms of Reference ("ToR") govern the operation of the Board of Directors (the "Board") of ' + ${JSON.stringify(entity.name)} + ' (the "Company"). They are established in accordance with the ' + ${JSON.stringify(tmpl.act + ' ' + tmpl.actYear)} + ' and the Company\'s constitutional documents.'),
      p('The Board is the highest governing body of the Company and is collectively responsible for the long-term success of the Company, setting strategic direction, and ensuring robust governance, risk management, and internal controls.'),
      hasConstitution || hasSha ? p('These ToR incorporate matters extracted from the Company\'s constitutional documents and, where applicable, the Shareholder Agreement. In the event of any conflict, the constitutional documents and SHA shall prevail over these ToR.', { italic: true }) : null,

      // ── Section 2: Composition ─────────────────────────────────────────────
      h('2. Board Composition', HeadingLevel.HEADING_1),
      p('The composition of the Board shall comply with the Company\'s constitutional documents and the ' + ${JSON.stringify(tmpl.act + ' ' + tmpl.actYear)} + '.'),
      h('2.1  Current Directors', HeadingLevel.HEADING_2),
      new Table({
        width: { size: 9386, type: WidthType.DXA },
        columnWidths: [4693, 4693],
        rows: [
          new TableRow({ children: [
            cell('Name', { bold: true, shading: 'DEEAF1', width: 4693 }),
            cell('Role', { bold: true, shading: 'DEEAF1', width: 4693 }),
          ]}),
          ...directors.map(d => new TableRow({ children: [
            cell(d.name, { width: 4693 }),
            cell(d.role, { width: 4693 }),
          ]})),
          ...(directors.length === 0 ? [new TableRow({ children: [
            cell('No directors on record', { width: 9386 }),
          ]})] : []),
        ],
      }),

      // ── Section 3: Meetings ────────────────────────────────────────────────
      h('3. Board Meetings', HeadingLevel.HEADING_1),
      h('3.1  Frequency', HeadingLevel.HEADING_2),
      p('The Board shall meet at least ' + ${JSON.stringify(form.meetingFrequency ?? 'quarterly')} + '. Additional meetings may be convened by the Chairperson or by any two directors giving notice to the Company Secretary.'),
      h('3.2  Quorum', HeadingLevel.HEADING_2),
      p('The quorum for a Board meeting shall be ' + ${JSON.stringify(quorum)} + ' director(s). If a quorum is not present within thirty (30) minutes of the appointed time, the meeting shall be adjourned.'),
      h('3.3  Notice', HeadingLevel.HEADING_2),
      p('Not less than ' + ${JSON.stringify(noticeDays)} + ' days\' written notice of each Board meeting shall be given to all directors, together with the draft agenda and supporting papers. In cases of urgency, a shorter notice period may be agreed by all directors.'),
      h('3.4  Voting and Resolutions', HeadingLevel.HEADING_2),
      p('Decisions of the Board shall be made by a simple majority of votes cast. Each director shall have one vote. ' + (${JSON.stringify(form.chairCastingVote)} ? 'In the event of an equality of votes, the Chairperson shall have a second casting vote.' : 'In the event of an equality of votes, the motion shall be deemed to have failed.')),
      p('The Board may also pass written resolutions signed by all directors entitled to vote, in lieu of a physical meeting, in accordance with the Company\'s constitutional documents.'),
      h('3.5  Minutes', HeadingLevel.HEADING_2),
      p('Minutes of each Board meeting shall be prepared by the Company Secretary, approved by the Chairperson, and distributed to all directors within fourteen (14) days of the meeting. Minutes shall be retained for a minimum of ' + ${JSON.stringify(tmpl.minutesRetentionYears)} + ' years in accordance with the ' + ${JSON.stringify(tmpl.act + ' ' + tmpl.actYear)} + '.'),

      // ── Section 4: Roles ───────────────────────────────────────────────────
      h('4. Roles and Responsibilities', HeadingLevel.HEADING_1),
      h('4.1  Chairperson', HeadingLevel.HEADING_2),
      ...['Lead the Board and ensure its effectiveness', 'Set the agenda in consultation with the CEO and Company Secretary', 'Facilitate constructive Board discussion and decision-making', 'Ensure directors receive accurate and timely information', 'Act as primary liaison between the Board and management'].map(bullet),
      h('4.2  Company Secretary', HeadingLevel.HEADING_2),
      ...['Maintain the statutory registers and corporate records', 'Circulate Board papers and minutes', 'Ensure the Company meets its statutory filing obligations with ' + ${JSON.stringify(tmpl.regulator)}, 'Advise the Board on governance and procedural matters'].map(bullet),
      h('4.3  Individual Directors', HeadingLevel.HEADING_2),
      p(${JSON.stringify(tmpl.directorDutiesSummary)}),

      // ── Section 5: Statutory compliance ────────────────────────────────────
      h('5. Statutory and Regulatory Compliance', HeadingLevel.HEADING_1),
      p('The Board shall ensure the Company complies with the following key statutory requirements under the ' + ${JSON.stringify(tmpl.act + ' ' + tmpl.actYear)} + ':'),
      ...keyStatutoryClauses.map(numbered),

      // ── Section 6: Constitution clauses (Stage 2) ──────────────────────────
      ...(constitutionClauses.length > 0 ? [
        h('6. Constitutional Provisions', HeadingLevel.HEADING_1),
        p('The following provisions were extracted from the Company\'s Constitution / Articles of Association and are incorporated into these Terms of Reference:'),
        ...constitutionClauses.map(numbered),
      ] : []),

      // ── Section 7: SHA clauses (Stage 2) ──────────────────────────────────
      ...(shaClauses.length > 0 ? [
        h((constitutionClauses.length > 0 ? '7' : '6') + '. Shareholder Agreement Provisions', HeadingLevel.HEADING_1),
        p('The following provisions were extracted from the Shareholder Agreement and are incorporated into these Terms of Reference:'),
        ...shaClauses.map(numbered),
      ] : []),

      // ── Section: Conflicts (Stage 2) ───────────────────────────────────────
      ...(conflicts.length > 0 ? [
        h('⚠  Identified Conflicts and Inconsistencies', HeadingLevel.HEADING_1),
        p('The following potential conflicts or inconsistencies were identified between the Constitution and the Shareholder Agreement. These should be reviewed by legal counsel before this ToR is adopted:', { color: 'C00000', italic: true }),
        ...conflicts.map(c => new Paragraph({
          numbering: { reference: 'numbers', level: 0 },
          children: [new TextRun({ text: c, font: 'Arial', size: 20, color: 'C00000' })],
          spacing: { before: 40, after: 40 },
        })),
      ] : []),

      // ── Section: Reserved Matters ──────────────────────────────────────────
      h((shaClauses.length > 0 ? '8' : constitutionClauses.length > 0 ? '7' : '6') + '. Reserved Matters', HeadingLevel.HEADING_1),
      p('The following matters are reserved for Board approval and may not be delegated to management without prior Board authorisation:'),
      ...reservedMatters.map(numbered),
      ...(reservedMatters.length === 0 ? [p('No reserved matters defined. Please review and add as appropriate.', { italic: true, color: '888888' })] : []),

      // ── Section: Conflicts of Interest ─────────────────────────────────────
      h('Conflicts of Interest', HeadingLevel.HEADING_1),
      p('Each director must declare any actual or potential conflict of interest to the Board at the earliest opportunity. A director with a conflict shall, unless the Board determines otherwise, withdraw from the discussion and shall not vote on the relevant matter.'),
      p('A register of directors\' interests shall be maintained by the Company Secretary and reviewed at the commencement of each Board meeting.'),

      // ── Section: Confidentiality ───────────────────────────────────────────
      h('Confidentiality', HeadingLevel.HEADING_1),
      p('All information provided to directors in their capacity as directors is confidential. Directors must not disclose confidential information to third parties without the prior written consent of the Board, except as required by law or regulation.'),
      p('This obligation of confidentiality shall survive a director\'s departure from the Board.'),

      // ── Section: Review ────────────────────────────────────────────────────
      h('Review of Terms of Reference', HeadingLevel.HEADING_1),
      p('These Terms of Reference shall be reviewed at least annually by the Board and updated as necessary to reflect changes in applicable law, regulation, or the Company\'s governance structure. Any amendments must be approved by a resolution of the Board.'),

      // ── Signature block ───────────────────────────────────────────────────
      new Paragraph({ children: [new PageBreak()] }),
      h('Adoption and Sign-off', HeadingLevel.HEADING_1),
      p('These Terms of Reference were adopted by the Board of ' + ${JSON.stringify(entity.name)} + ' on ' + ${JSON.stringify(today)} + '.'),
      new Paragraph({ spacing: { before: 480 }, children: [] }),
      new Table({
        width: { size: 9386, type: WidthType.DXA },
        columnWidths: [4693, 4693],
        rows: [
          new TableRow({ children: [
            cell('Chairperson', { bold: true, shading: 'DEEAF1', width: 4693 }),
            cell('Date', { bold: true, shading: 'DEEAF1', width: 4693 }),
          ]}),
          new TableRow({ children: [
            cell('Name: _______________________________', { width: 4693 }),
            cell('_______________________________', { width: 4693 }),
          ]}),
          new TableRow({ children: [
            cell('Signature: ___________________________', { width: 4693 }),
            cell('', { width: 4693 }),
          ]}),
        ],
      }),
      new Paragraph({ spacing: { before: 360 }, children: [] }),
      new Table({
        width: { size: 9386, type: WidthType.DXA },
        columnWidths: [4693, 4693],
        rows: [
          new TableRow({ children: [
            cell('Company Secretary', { bold: true, shading: 'DEEAF1', width: 4693 }),
            cell('Date', { bold: true, shading: 'DEEAF1', width: 4693 }),
          ]}),
          new TableRow({ children: [
            cell('Name: _______________________________', { width: 4693 }),
            cell('_______________________________', { width: 4693 }),
          ]}),
          new TableRow({ children: [
            cell('Signature: ___________________________', { width: 4693 }),
            cell('', { width: 4693 }),
          ]}),
        ],
      }),
    ].filter(Boolean),
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/tmp/tor_output.docx', buf);
  process.exit(0);
}).catch(e => { console.error(e); process.exit(1); });
`;

  const { execSync } = await import('child_process');
  const { writeFileSync, readFileSync } = await import('fs');
  const path = await import('path');

  // Write the script next to the project's node_modules so require() resolves correctly
  const projectRoot = process.cwd();
  const scriptPath = path.join(projectRoot, 'tor_gen_tmp.js');
  const outputPath = path.join(projectRoot, 'tor_output_tmp.docx');

  // Update output path in script to use absolute path
  const scriptWithPaths = script.replace(
    "'/tmp/tor_output.docx'",
    JSON.stringify(outputPath)
  );

  writeFileSync(scriptPath, scriptWithPaths);
  try {
    execSync(`node ${JSON.stringify(scriptPath)}`, {
      stdio: 'pipe',
      timeout: 30000,
      cwd: projectRoot,
    });
    return readFileSync(outputPath);
  } finally {
    // Clean up temp files
    try { require('fs').unlinkSync(scriptPath); } catch { /* ignore */ }
    try { require('fs').unlinkSync(outputPath); } catch { /* ignore */ }
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // CRIT-6: require authentication before generating or serving any document
  const { requireAuth } = await import('@/lib/auth/require');
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const { ctx } = auth;

  try {
    const { id } = await params;

    // Verify the entity belongs to the caller's org before generating the ToR
    const { prisma } = await import('@/lib/prisma');
    const ownedEntity = await prisma.entity.findFirst({
      where: { id, organisationId: ctx.organisationId },
    });
    if (!ownedEntity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

    const [entities, directors] = await Promise.all([getEntities(), getDirectors()]);
    const entity = entities.find(e => e.id === id);
    if (!entity) return NextResponse.json({ error: 'Entity not found' }, { status: 404 });

    const entityDirectors = directors.filter(d => d.entityId === id && d.isActive);

    // Parse multipart form
    const formData = await request.formData();
    const dataRaw = formData.get('data');
    if (!dataRaw || typeof dataRaw !== 'string') {
      return NextResponse.json({ error: 'Missing form data' }, { status: 400 });
    }
    const form: TorFormData = JSON.parse(dataRaw);

    // Stage 2: extract text from uploaded documents
    const constitutionFile = formData.get('constitution') as File | null;
    const shaFile = formData.get('sha') as File | null;

    const [constitutionText, shaText] = await Promise.all([
      constitutionFile ? extractTextFromFile(constitutionFile) : Promise.resolve(null),
      shaFile ? extractTextFromFile(shaFile) : Promise.resolve(null),
    ]);

    // Stage 2: analyze with Claude
    const aiAnalysis = await analyzeDocumentsWithClaude(
      entity.name,
      entity.country,
      constitutionText,
      shaText,
    );

    // Generate Word document
    const buffer = await generateTorDocx({
      entity: {
        id: entity.id,
        name: entity.name,
        country: entity.country,
        legalStructure: entity.legalStructure,
        registrationNumber: entity.registrationNumber,
        regulator: entity.regulator,
      },
      directors: entityDirectors.map(d => ({ name: d.name, role: d.role })),
      form,
      aiAnalysis,
      hasConstitution: !!constitutionFile,
      hasSha: !!shaFile,
    });

    const filename = `${entity.name.replace(/[^a-zA-Z0-9]/g, '_')}_Board_ToR_${new Date().toISOString().slice(0, 10)}.docx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });

  } catch (err) {
    console.error('[POST /api/entities/:id/tor]', err);
    return NextResponse.json({ error: 'Failed to generate ToR document' }, { status: 500 });
  }
}

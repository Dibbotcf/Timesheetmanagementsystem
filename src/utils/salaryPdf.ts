import { jsPDF } from 'jspdf';
import type { Signature } from '../App';
import TCF_LOGO_PATH from '../assets/tcf-logo-landscape.png';
import {
  SalarySheet, SalaryRow, SalaryCalc, computeSalary, fmtMoney, fmtHours, fmtJoin, takaInWords,
  MONTH_NAMES, attendanceMonthFor,
} from '../lib/salary';

// Native jsPDF drawing only — html2canvas cannot parse Tailwind v4's oklch() colours.

const COMPANY = 'TOKYO CONSULTING FIRM LIMITED';
const getImgFmt = (url: string) => url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg') ? 'JPEG' : url.startsWith('data:image/webp') ? 'WEBP' : 'PNG';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const monthLabel = (s: SalarySheet) => `${MONTH_NAMES[s.month]}, ${s.year}`;

type Sigs = { approvedBy?: Signature };

function drawSignature(pdf: jsPDF, sig: Signature | undefined, label: string, x: number, y: number, w: number) {
  if (sig?.imageUrl) {
    try { pdf.addImage(sig.imageUrl, getImgFmt(sig.imageUrl), x + w / 2 - 15, y - 13, 30, 11); }
    catch { pdf.setFont('times', 'italic'); pdf.setFontSize(10); pdf.text(sig.name, x + w / 2, y - 4, { align: 'center' }); }
  }
  pdf.setDrawColor(60); pdf.setLineWidth(0.3);
  pdf.line(x, y, x + w, y);
  pdf.setFont('times', 'bold'); pdf.setFontSize(9); pdf.setTextColor(20);
  pdf.text(label, x + w / 2, y + 4, { align: 'center' });
  if (sig) { pdf.setFont('times', 'normal'); pdf.setFontSize(8); pdf.text(sig.name, x + w / 2, y + 8, { align: 'center' }); }
}

// ── Statement of Salary & Allowances (legal landscape, one row per employee) ──
function drawStatement(pdf: jsPDF, sheet: SalarySheet, sigs: Sigs) {
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
  const M = 8;
  // Same headings, order and grouping as HR's workbook
  const cols: { h: string; w: number; a?: 'l' | 'c' }[] = [
    { h: 'SL No.', w: 8, a: 'c' }, { h: 'Name', w: 35, a: 'l' }, { h: 'Designation', w: 27, a: 'l' }, { h: 'Joining Date', w: 15, a: 'c' },
    { h: 'Basic Salary', w: 14 }, { h: 'House Rent', w: 13 }, { h: 'Conveyance', w: 15 }, { h: 'Medical Allowance', w: 13 },
    { h: 'Special Allowance', w: 13 }, { h: 'Gross Salary', w: 15 }, { h: 'Company contribution to PF', w: 15 }, { h: 'Days of Month', w: 9, a: 'c' },
    { h: 'Rate Per Hour', w: 10 }, { h: 'Overtime Hours', w: 11 }, { h: 'Total Overtime', w: 13 },
    { h: 'Total Payable', w: 15 }, { h: 'Tax', w: 12 }, { h: 'PF Deduction', w: 12 }, { h: 'Salary Deduction', w: 12 }, { h: 'Loan Adjustment', w: 13 },
    { h: 'Net Payable', w: 15 }, { h: 'Remarks', w: 15, a: 'l' }, { h: 'Late (Minutes)', w: 12, a: 'c' },
  ];
  const DED = [16, 17, 18, 19]; // under the merged "Deduction" heading
  const xs: number[] = []; cols.reduce((x, c) => (xs.push(x), x + c.w), M);
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const rowH = 6.5, headH = 14;

  const calcs = sheet.rows.map(r => computeSalary(r));

  const drawHeader = (y: number) => {
    pdf.setFont('times', 'bold'); pdf.setFontSize(15); pdf.setTextColor(0);
    pdf.text(COMPANY, W / 2, y + 5, { align: 'center' });
    pdf.setFontSize(10.5);
    pdf.text('Statement of Salary & Allowances', W / 2, y + 10.5, { align: 'center' });
    pdf.text(`For the month of  ${monthLabel(sheet)}`, W / 2, y + 15.5, { align: 'center' });
    const ty = y + 19;
    // Workbook look: light blue header, black bold text, black grid
    pdf.setFillColor(219, 229, 241); pdf.rect(M, ty, tableW, headH, 'F');
    pdf.setDrawColor(60); pdf.setLineWidth(0.2);
    pdf.rect(M, ty, tableW, headH);
    pdf.setTextColor(0); pdf.setFont('times', 'bold'); pdf.setFontSize(6.4);
    const half = headH / 2;
    cols.forEach((c, i) => {
      const inDed = DED.includes(i);
      const top = inDed ? ty + half : ty, h = inDed ? half : headH;
      const lines = pdf.splitTextToSize(c.h, c.w - 1.2) as string[];
      const startY = top + h / 2 - (lines.length - 1) * 1.25 + 0.9;
      lines.forEach((ln, k) => pdf.text(ln, xs[i] + c.w / 2, startY + k * 2.5, { align: 'center' }));
      if (i > 0 && !(inDed && i !== DED[0])) pdf.line(xs[i], ty, xs[i], ty + headH);
      else if (inDed) pdf.line(xs[i], ty + half, xs[i], ty + headH);
    });
    const dx = xs[DED[0]], dw = DED.reduce((a, i) => a + cols[i].w, 0);
    pdf.line(dx, ty + half, dx + dw, ty + half);
    pdf.text('Deduction', dx + dw / 2, ty + half / 2 + 1, { align: 'center' });
    return ty + headH;
  };

  const cellText = (text: string, i: number, y: number, h: number) => {
    const c = cols[i];
    const pad = 1.2;
    const fitted = (pdf.splitTextToSize(text, c.w - pad * 2) as string[])[0] || '';
    const tx = c.a === 'l' ? xs[i] + pad : c.a === 'c' ? xs[i] + c.w / 2 : xs[i] + c.w - pad;
    pdf.text(fitted, tx, y + h / 2 + 1.1, { align: c.a === 'l' ? 'left' : c.a === 'c' ? 'center' : 'right' });
  };

  const drawGrid = (y0: number, y1: number) => {
    pdf.setDrawColor(60); pdf.setLineWidth(0.2);
    xs.forEach(x => pdf.line(x, y0, x, y1));
    pdf.line(M + tableW, y0, M + tableW, y1);
  };

  let y = drawHeader(M);
  let pageTop = y;
  sheet.rows.forEach((r, idx) => {
    if (y + rowH > H - 36) { drawGrid(pageTop, y); pdf.addPage(); y = drawHeader(M); pageTop = y; }
    const c = calcs[idx];
    pdf.setDrawColor(60); pdf.setLineWidth(0.2); pdf.line(M, y + rowH, M + tableW, y + rowH);
    pdf.setFont('times', 'normal'); pdf.setFontSize(7.2); pdf.setTextColor(20);
    const vals = [
      String(idx + 1).padStart(2, '0'), r.name, r.designation, fmtJoin(r.joiningDate),
      fmtMoney(c.basic), fmtMoney(c.houseRent), fmtMoney(c.conveyance), fmtMoney(c.medical),
      fmtMoney(c.special), fmtMoney(c.gross), fmtMoney(c.pfCompany), String(r.days),
      fmtMoney(c.ratePerHour), fmtHours(r.otHours), fmtMoney(c.otAmount),
      fmtMoney(c.totalPayable), fmtMoney(c.tax), fmtMoney(c.pfDeduction), fmtMoney(c.salaryDeduction), fmtMoney(c.loanDeduction),
      fmtMoney(c.netPayable), r.remarks || '', r.lateMinutes ? String(r.lateMinutes) : '0',
    ];
    vals.forEach((v, i) => {
      if (i === 20) pdf.setFont('times', 'bold');
      pdf.setTextColor(20);
      cellText(v, i, y, rowH);
      pdf.setFont('times', 'normal');
    });
    y += rowH;
  });

  // Totals
  const sum = (f: (c: SalaryCalc, r: SalaryRow) => number) => calcs.reduce((s, c, i) => s + f(c, sheet.rows[i]), 0);
  const totals: Record<number, string> = {
    4: fmtMoney(sum(c => c.basic)), 5: fmtMoney(sum(c => c.houseRent)), 6: fmtMoney(sum(c => c.conveyance)),
    7: fmtMoney(sum(c => c.medical)), 8: fmtMoney(sum(c => c.special)), 9: fmtMoney(sum(c => c.gross)),
    10: fmtMoney(sum(c => c.pfCompany)), 13: fmtHours(sum((_, r) => r.otHours)), 14: fmtMoney(sum(c => c.otAmount)),
    15: fmtMoney(sum(c => c.totalPayable)), 16: fmtMoney(sum(c => c.tax)), 17: fmtMoney(sum(c => c.pfDeduction)),
    18: fmtMoney(sum(c => c.salaryDeduction)), 19: fmtMoney(sum(c => c.loanDeduction)), 20: fmtMoney(sum(c => c.netPayable)),
  };
  pdf.setFillColor(242, 242, 242); pdf.rect(M, y, tableW, rowH + 0.5, 'F');
  pdf.setDrawColor(60); pdf.setLineWidth(0.4); pdf.line(M, y + rowH + 0.5, M + tableW, y + rowH + 0.5);
  pdf.setTextColor(0); pdf.setFont('times', 'bold'); pdf.setFontSize(7.4);
  pdf.text('Total', xs[1] + 1.2, y + rowH / 2 + 1.3);
  Object.entries(totals).forEach(([i, v]) => cellText(v, +i, y + 0.25, rowH));
  drawGrid(pageTop, y + rowH + 0.5);
  y += rowH + 0.5;

  const netTotal = sum(c => c.netPayable);
  pdf.setTextColor(20); pdf.setFont('times', 'bold'); pdf.setFontSize(9.5);
  pdf.text(`Taka In Word: ${takaInWords(netTotal)}.`, M + 2, y + 6);

  const sy = Math.min(H - 12, y + 26);
  const sw = 60;
  drawSignature(pdf, sigs.approvedBy, 'Approved By', W - M - 10 - sw, sy, sw);

}

// ── Payslips (A4 portrait, one employee per page) ─────────────────────────────
// Modern layout (Helvetica): header · employee card · 3 totals · earnings | deductions ·
// attendance strip · amount in words · Approved By. The printed statement keeps the workbook look.
const NAVY: [number, number, number] = [30, 41, 59];
const INK: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [226, 232, 240];
const SOFT: [number, number, number] = [248, 250, 252];
const RED: [number, number, number] = [185, 28, 28];
const bdt = (n: number) => (Math.round(n) === 0 ? '-' : `${n < 0 ? '-' : ''}${Math.abs(Math.round(n)).toLocaleString('en-US')}`);

async function drawPayslips(pdf: jsPDF, sheet: SalarySheet, rows: SalaryRow[], sigs: Sigs, startOnNewPage: boolean) {
  const logo = await loadImage(TCF_LOGO_PATH);
  const att = attendanceMonthFor(sheet.year, sheet.month);
  const period = `${MONTH_NAMES[att.month]} ${att.year}`;
  const color = (c: [number, number, number]) => pdf.setTextColor(c[0], c[1], c[2]);
  const font = (style: 'normal' | 'bold' | 'italic', size: number) => { pdf.setFont('helvetica', style); pdf.setFontSize(size); };

  rows.forEach((r, pageIdx) => {
    if (pageIdx > 0 || startOnNewPage) pdf.addPage('a4', 'portrait');
    const W = pdf.internal.pageSize.getWidth();
    const M = 16, CW = W - 2 * M;
    const c = computeSalary(r);
    let y = 14;

    // ── Header ──
    if (logo) { const lh = 13, lw = lh * (logo.width / logo.height); pdf.addImage(logo, 'PNG', M, y, lw, lh); }
    font('bold', 13); color(INK);
    pdf.text(COMPANY, W - M, y + 4.5, { align: 'right' });
    font('normal', 9); color(MUTED);
    pdf.text(`Salary for ${period}`, W - M, y + 10, { align: 'right' });
    const tag = 'PAYSLIP'; font('bold', 8);
    const tw = pdf.getTextWidth(tag) + 6;
    pdf.setFillColor(...NAVY); pdf.roundedRect(W - M - tw, y + 12.5, tw, 5.5, 1.5, 1.5, 'F');
    pdf.setTextColor(255, 255, 255); pdf.text(tag, W - M - tw / 2, y + 16.3, { align: 'center' });
    y += 22;
    pdf.setDrawColor(...NAVY); pdf.setLineWidth(0.8); pdf.line(M, y, W - M, y);
    y += 6;

    // ── Employee card ──
    const cardH = 30;
    pdf.setFillColor(...SOFT); pdf.setDrawColor(...LINE); pdf.setLineWidth(0.25);
    pdf.roundedRect(M, y, CW, cardH, 2.5, 2.5, 'FD');
    font('bold', 14); color(INK);
    pdf.text((pdf.splitTextToSize(r.name, 78) as string[])[0], M + 5, y + 9);
    font('normal', 9.5); color(MUTED);
    pdf.text(r.designation || 'Designation not set', M + 5, y + 15.5);
    font('normal', 8.5);
    pdf.text(`Employee ID  ${r.eid || '-'}`, M + 5, y + 23);
    const grid: [string, string][] = [
      ['Joining Date', fmtJoin(r.joiningDate)], ['Pay Period', period],
      ['Days of Month', String(r.days)], ['Issued On', new Date().toLocaleDateString('en-GB')],
    ];
    const gx = M + 92, gw = (CW - 92) / 2;
    grid.forEach(([k, v], i) => {
      const x = gx + (i % 2) * gw, yy = y + 8.5 + Math.floor(i / 2) * 12;
      font('normal', 7.5); color(MUTED); pdf.text(k.toUpperCase(), x, yy);
      font('bold', 10); color(INK); pdf.text(v, x, yy + 4.5);
    });
    y += cardH + 6;

    // ── Three totals ──
    const earnTotal = c.gross + c.otAmount + (c.loanDeduction < 0 ? -c.loanDeduction : 0);
    const dedTotal = c.tax + c.pfDeduction + c.salaryDeduction + Math.max(c.loanDeduction, 0);
    const kpiW = (CW - 8) / 3, kpiH = 19;
    const kpis: { label: string; value: string; dark?: boolean; tone?: [number, number, number] }[] = [
      { label: 'GROSS EARNINGS', value: `BDT ${bdt(earnTotal)}` },
      { label: 'TOTAL DEDUCTIONS', value: `BDT ${bdt(dedTotal)}`, tone: dedTotal ? RED : INK },
      { label: 'NET PAYABLE', value: `BDT ${bdt(c.netPayable)}`, dark: true },
    ];
    kpis.forEach((k, i) => {
      const x = M + i * (kpiW + 4);
      if (k.dark) { pdf.setFillColor(...NAVY); pdf.roundedRect(x, y, kpiW, kpiH, 2.5, 2.5, 'F'); }
      else { pdf.setFillColor(255, 255, 255); pdf.setDrawColor(...LINE); pdf.roundedRect(x, y, kpiW, kpiH, 2.5, 2.5, 'FD'); }
      font('bold', 7.5); k.dark ? pdf.setTextColor(203, 213, 225) : color(MUTED);
      pdf.text(k.label, x + 5, y + 7);
      font('bold', 14); k.dark ? pdf.setTextColor(255, 255, 255) : color(k.tone || INK);
      pdf.text(k.value, x + 5, y + 14.5);
    });
    y += kpiH + 7;

    // ── Earnings | Deductions ──
    const earnings: [string, number][] = [['Basic Salary', c.basic]];
    if (r.structure !== 'flat') earnings.push(['House Rent', c.houseRent], ['Conveyance', c.conveyance], ['Medical Allowance', c.medical]);
    earnings.push(['Special Allowance', c.special]);
    earnings.push([r.otHours ? `Overtime (${fmtHours(r.otHours)} h x ${Math.round(c.ratePerHour)})` : 'Overtime', c.otAmount]);
    if (c.loanDeduction < 0) earnings.push(['Loan Adjustment (refund)', -c.loanDeduction]);
    const deductions: [string, number][] = [
      ['Income Tax', c.tax],
      ['Provident Fund', c.pfDeduction],
      [r.lateMinutes && r.lateDeduction ? `Late Deduction (${r.lateMinutes} min)` : 'Late Deduction', c.salaryDeduction],
      ['Loan Adjustment', Math.max(c.loanDeduction, 0)],
    ];
    const colW = (CW - 6) / 2, rowH = 7.2, headH = 8.5;
    const n = Math.max(earnings.length, deductions.length);
    const table = (x: number, title: string, items: [string, number][], total: number, totalLabel: string, tone: [number, number, number]) => {
      const h = headH + n * rowH + headH;
      pdf.setFillColor(255, 255, 255); pdf.setDrawColor(...LINE); pdf.setLineWidth(0.25);
      pdf.roundedRect(x, y, colW, h, 2.5, 2.5, 'FD');
      // header (rounded top, square bottom)
      pdf.setFillColor(241, 245, 249); pdf.roundedRect(x, y, colW, headH, 2.5, 2.5, 'F'); pdf.rect(x, y + headH - 2.5, colW, 2.5, 'F');
      font('bold', 9.5); color(INK); pdf.text(title, x + 4, y + 5.6);
      font('bold', 7.5); color(MUTED); pdf.text('AMOUNT (BDT)', x + colW - 4, y + 5.6, { align: 'right' });
      let yy = y + headH;
      for (let i = 0; i < n; i++) {
        if (i % 2 === 1) { pdf.setFillColor(...SOFT); pdf.rect(x + 0.2, yy, colW - 0.4, rowH, 'F'); }
        const it = items[i];
        if (it) {
          font('normal', 9); color(INK);
          pdf.text((pdf.splitTextToSize(it[0], colW - 30) as string[])[0], x + 4, yy + 4.8);
          color(it[1] ? INK : MUTED);
          pdf.text(bdt(it[1]), x + colW - 4, yy + 4.8, { align: 'right' });
        }
        yy += rowH;
      }
      pdf.setDrawColor(...LINE); pdf.line(x, yy, x + colW, yy);
      font('bold', 9.5); color(INK); pdf.text(totalLabel, x + 4, yy + 5.6);
      color(tone); pdf.text(bdt(total), x + colW - 4, yy + 5.6, { align: 'right' });
    };
    table(M, 'Earnings', earnings, earnTotal, 'Total Earnings', INK);
    table(M + colW + 6, 'Deductions', deductions, dedTotal, 'Total Deductions', dedTotal ? RED : INK);
    y += headH + n * rowH + headH + 7;

    // ── Attendance & contributions strip ──
    const facts: [string, string][] = [
      ['OVERTIME', r.otHours ? `${fmtHours(r.otHours)} h x ${Math.round(c.ratePerHour)} = ${bdt(c.otAmount)}` : 'None'],
      ['LATE', r.lateMinutes ? `${r.lateMinutes} min${r.lateDeduction ? ` = ${bdt(c.salaryDeduction)}` : ' (not deducted)'}` : 'None'],
      ['COMPANY PF CONTRIBUTION', c.pfCompany ? `BDT ${bdt(c.pfCompany)}` : 'Not applicable'],
    ];
    const fw = CW / 3, fh = 15;
    pdf.setFillColor(...SOFT); pdf.setDrawColor(...LINE); pdf.roundedRect(M, y, CW, fh, 2.5, 2.5, 'FD');
    facts.forEach(([k, v], i) => {
      const x = M + i * fw;
      if (i) { pdf.setDrawColor(...LINE); pdf.line(x, y + 3, x, y + fh - 3); }
      font('bold', 7); color(MUTED); pdf.text(k, x + 5, y + 5.8);
      font('bold', 9.5); color(INK); pdf.text((pdf.splitTextToSize(v, fw - 9) as string[])[0], x + 5, y + 11);
    });
    y += fh + 6;

    // ── Amount in words (+ remarks) ──
    font('bold', 7.5); color(MUTED); pdf.text('NET PAYABLE IN WORDS', M, y + 1);
    font('italic', 10); color(INK); pdf.text(`${takaInWords(c.netPayable)}.`, M, y + 6.5);
    y += 11;
    if (r.remarks) {
      font('bold', 7.5); color(MUTED); pdf.text('REMARKS', M, y + 2);
      font('normal', 9.5); color(INK); pdf.text((pdf.splitTextToSize(r.remarks, CW) as string[])[0], M, y + 7.5);
    }

    // ── Approved By (right) + note (left) ──
    const sy = 262, sw = 60, sx = W - M - sw;
    if (sigs.approvedBy?.imageUrl) {
      try { pdf.addImage(sigs.approvedBy.imageUrl, getImgFmt(sigs.approvedBy.imageUrl), sx + sw / 2 - 16, sy - 15, 32, 12); }
      catch { font('italic', 11); color(INK); pdf.text(sigs.approvedBy.name, sx + sw / 2, sy - 4, { align: 'center' }); }
    }
    pdf.setDrawColor(...INK); pdf.setLineWidth(0.3); pdf.line(sx, sy, sx + sw, sy);
    font('bold', 9); color(INK); pdf.text('Approved By', sx + sw / 2, sy + 4.5, { align: 'center' });
    if (sigs.approvedBy) { font('normal', 8); color(MUTED); pdf.text(`${sigs.approvedBy.name}${sigs.approvedBy.role ? ` · ${sigs.approvedBy.role}` : ''}`, sx + sw / 2, sy + 9, { align: 'center' }); }
    font('normal', 8); color(MUTED);
    pdf.text('This is a system-generated payslip.', M, sy + 4.5);
    pdf.text('Please keep it confidential.', M, sy + 9);

    // ── Footer ──
    pdf.setDrawColor(...LINE); pdf.setLineWidth(0.25); pdf.line(M, 282, W - M, 282);
    font('normal', 7.5); color(MUTED);
    pdf.text(`${COMPANY}  ·  Payslip ${period}  ·  Generated ${new Date().toLocaleDateString('en-GB')}`, W / 2, 287, { align: 'center' });
  });

}

// ── Downloads ─────────────────────────────────────────────────────────────────
const monthTag = (s: SalarySheet) => `${MONTH_NAMES[s.month]}_${s.year}`;
export const payslipFileName = (s: SalarySheet, r: SalaryRow) => `Payslip_${r.name.replace(/[^\w]+/g, '_')}_${monthTag(s)}.pdf`;
const statementDoc = () => new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'legal' });
const pause = (ms: number) => new Promise(r => setTimeout(r, ms)); // browsers drop back-to-back downloads

/** The Statement of Salary & Allowances only. */
export function downloadStatementPdf(sheet: SalarySheet, sigs: Sigs) {
  const pdf = statementDoc();
  drawStatement(pdf, sheet, sigs);
  pdf.save(`Salary_Statement_${monthTag(sheet)}.pdf`);
}

/** All the given payslips in one PDF (one page each). */
export async function downloadPayslips(sheet: SalarySheet, rows: SalaryRow[], sigs: Sigs, fileName?: string) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  await drawPayslips(pdf, sheet, rows, sigs, false);
  pdf.save(fileName || `Payslips_${monthTag(sheet)}.pdf`);
}

/** One PDF file per employee. */
export async function downloadPayslipsSeparately(sheet: SalarySheet, rows: SalaryRow[], sigs: Sigs) {
  for (const [i, r] of rows.entries()) {
    if (i) await pause(450);
    await downloadPayslips(sheet, [r], sigs, payslipFileName(sheet, r));
  }
}

/** Statement (landscape) followed by every payslip (portrait) in a single PDF. */
export async function downloadStatementAndPayslips(sheet: SalarySheet, rows: SalaryRow[], sigs: Sigs) {
  const pdf = statementDoc();
  drawStatement(pdf, sheet, sigs);
  await drawPayslips(pdf, sheet, rows, sigs, true);
  pdf.save(`Salary_${monthTag(sheet)}_Statement_and_Payslips.pdf`);
}

/** Statement file, then one file per payslip. */
export async function downloadStatementAndPayslipsSeparately(sheet: SalarySheet, rows: SalaryRow[], sigs: Sigs) {
  downloadStatementPdf(sheet, sigs);
  if (rows.length) { await pause(450); await downloadPayslipsSeparately(sheet, rows, sigs); }
}

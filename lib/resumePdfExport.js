// =============================
// PDF Resume Export — Pixel-perfect match with ResumePreview.jsx
// Gradient header, skill badges, filled bullets, two-column layout
// =============================
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

async function captureElementPages(element) {
  const A4_RATIO = 297 / 210;
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const fullW = canvas.width;
  const pageH = Math.floor(fullW * A4_RATIO);
  const totalH = canvas.height;
  const pages = [];
  for (let top = 0; top < totalH; top += pageH) {
    const sliceH = Math.min(pageH, totalH - top);
    const slice = document.createElement("canvas");
    slice.width = fullW;
    slice.height = sliceH;
    const ctx = slice.getContext("2d");
    ctx.drawImage(canvas, 0, top, fullW, sliceH, 0, 0, fullW, sliceH);
    pages.push({ dataUrl: slice.toDataURL("image/png"), widthPx: fullW, heightPx: sliceH });
  }
  return pages;
}

// ===== COLOR PALETTE — matches ResumePreview.jsx =====
const C = {
  headerFrom: [79, 70, 229],       // indigo-600
  headerVia: [67, 56, 202],        // indigo-700
  headerTo: [126, 34, 206],        // purple-700
  white: [255, 255, 255],
  headlineOnHeader: [199, 210, 254],// indigo-200
  contactOnHeader: [199, 210, 254], // indigo-100
  textDark: [30, 41, 59],          // slate-800
  textBody: [71, 85, 105],         // slate-600
  sidebarBg: [248, 250, 252],      // slate-50
  sidebarBorder: [241, 245, 249],  // slate-100
  indigo500: [99, 102, 241],
  teal500: [20, 184, 166],
  amber500: [245, 158, 11],
  purple500: [168, 85, 247],
  indigo600: [79, 70, 229],
  amber600: [217, 119, 6],
  teal600: [13, 148, 136],
  violet600: [124, 58, 237],
  dividerLine: [199, 210, 254],    // indigo-200
  badgeBg: [238, 242, 255],        // indigo-50
  badgeBorder: [224, 231, 255],    // indigo-100
  badgeText: [67, 56, 202],        // indigo-700
  bulletFill: [129, 140, 248],     // indigo-400
  catLabel: [99, 102, 241],        // indigo-500
};

// ===== LAYOUT CONSTANTS =====
const PW = 210, PH = 297;
const HEADER_H = 44;
const SIDEBAR_W = 60;
const L_PAD = 6;
const L_X = L_PAD;
const L_W = SIDEBAR_W - L_PAD - 4;
const M_X = SIDEBAR_W + 5;
const M_W = PW - M_X - 12;
const BODY_TOP = HEADER_H + 7;

// ===== HELPERS =====
function lerp(a, b, t) { return Math.round(a + (b - a) * t); }
function lerpC(c1, c2, t) { return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]; }
function setF(doc, style, size) { doc.setFontSize(size); doc.setFont("helvetica", style); }
function wrap(doc, text, w) { return doc.splitTextToSize(String(text || ""), w); }

// ===== GRADIENT HEADER (from-indigo-600 via-indigo-700 to-purple-700) =====
function drawHeader(doc, contact, sections) {
  const steps = 60;
  const sh = HEADER_H / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const c = t < 0.5
      ? lerpC(C.headerFrom, C.headerVia, t * 2)
      : lerpC(C.headerVia, C.headerTo, (t - 0.5) * 2);
    doc.setFillColor(...c);
    doc.rect(0, i * sh, PW, sh + 0.2, "F");
  }
  const x = L_PAD + 2;
  doc.setTextColor(...C.white);
  setF(doc, "bold", 24);
  doc.text(contact.name || "Your Name", x, 17);
  const hl = contact.headline || sections.headline || "";
  if (hl) {
    setF(doc, "normal", 10.5);
    doc.setTextColor(...C.headlineOnHeader);
    doc.text(hl, x, 24);
  }
  const parts = [contact.email, contact.phone, contact.location, contact.linkedin, contact.github].filter(Boolean);
  if (parts.length) {
    setF(doc, "normal", 7.5);
    doc.setTextColor(...C.contactOnHeader);
    const lines = wrap(doc, parts.join("   ·   "), PW - L_PAD * 2 - 4);
    let cy = 31;
    for (const line of lines) { doc.text(line, x, cy); cy += 3.5; }
  }
}

// ===== SIDEBAR BACKGROUND + BORDER =====
function drawSidebarBg(doc, fromY = 0) {
  doc.setFillColor(...C.sidebarBg);
  doc.rect(0, fromY, SIDEBAR_W, PH - fromY, "F");
  doc.setDrawColor(...C.sidebarBorder);
  doc.setLineWidth(0.3);
  doc.line(SIDEBAR_W, fromY, SIDEBAR_W, PH);
}

// ===== SECTION TITLE: accent dot + uppercase title + thin full-width divider =====
function drawSectionTitle(doc, title, x, y, width, accent) {
  doc.setFillColor(...accent);
  doc.circle(x + 1.3, y - 1, 1.3, "F");
  setF(doc, "bold", 8.5);
  doc.setTextColor(...C.textDark);
  doc.text(title.toUpperCase(), x + 5, y);
  const dy = y + 2.5;
  doc.setDrawColor(...C.dividerLine);
  doc.setLineWidth(0.25);
  doc.line(x, dy, x + width, dy);
  return dy + 4;
}

// ===== SKILL BADGES (rounded rect chips matching preview) =====
function drawBadges(doc, items, x, startY, maxW) {
  let cx = x, cy = startY;
  const h = 4.5, px = 2.5, gx = 1.8, gy = 1.8;
  for (const text of items) {
    if (!text) continue;
    setF(doc, "bold", 7.5);
    const tw = doc.getTextWidth(String(text));
    const bw = tw + px * 2;
    if (cx + bw > x + maxW && cx > x) { cx = x; cy += h + gy; }
    if (cy + h > PH - 12) break;
    doc.setFillColor(...C.badgeBg);
    doc.setDrawColor(...C.badgeBorder);
    doc.setLineWidth(0.2);
    doc.roundedRect(cx, cy, bw, h, 1, 1, "FD");
    doc.setTextColor(...C.badgeText);
    setF(doc, "bold", 7.5);
    doc.text(String(text), cx + px, cy + 3.2);
    cx += bw + gx;
  }
  return cy + h + 2.5;
}

// ===== CATEGORIZED SKILLS =====
function drawCatSkills(doc, cats, x, y, maxW) {
  for (const [cat, skills] of Object.entries(cats)) {
    if (y > PH - 20) break;
    setF(doc, "bold", 7);
    doc.setTextColor(...C.catLabel);
    doc.text(cat.toUpperCase(), x, y);
    y += 3.5;
    y = drawBadges(doc, Array.isArray(skills) ? skills : [String(skills)], x, y, maxW);
    y += 1;
  }
  return y;
}

// ===== BULLET ITEMS (filled indigo circle + text) =====
function drawBullets(doc, items, x, y, maxW, paginate) {
  for (const item of items) {
    if (!item) continue;
    setF(doc, "normal", 8);
    const lines = wrap(doc, item, maxW - 5);
    const blockH = lines.length * 3.5 + 2;
    if (paginate && y + blockH > PH - 12) {
      doc.addPage();
      drawSidebarBg(doc, 0);
      y = 14;
    }
    doc.setFillColor(...C.bulletFill);
    doc.circle(x + 0.65, y - 0.5, 0.55, "F");
    doc.setTextColor(...C.textBody);
    setF(doc, "normal", 8);
    doc.text(lines, x + 3.5, y);
    y += blockH;
  }
  return y;
}

function drawStructuredExperience(doc, items, x, y, maxW, paginate) {
  for (const item of items) {
    if (!item) continue;

    if (typeof item !== "object") {
      y = drawBullets(doc, [item], x, y, maxW, paginate);
      continue;
    }

    const heading = [
      String(item.title || "").trim(),
      item.company ? ` — ${String(item.company || "").trim()}` : "",
      item.location ? `, ${String(item.location || "").trim()}` : "",
    ].join("");
    const bullets = Array.isArray(item.bullets)
      ? item.bullets.map((bullet) => String(bullet || "").trim()).filter(Boolean)
      : [];
    const headingLines = heading ? wrap(doc, heading, maxW - 18) : [];
    const dateLines = item.dates ? wrap(doc, String(item.dates || "").trim(), 28) : [];
    const bulletHeight = bullets.reduce((sum, bullet) => {
      const lines = wrap(doc, bullet, maxW - 5);
      return sum + lines.length * 3.5 + 2;
    }, 0);
    const blockH = Math.max(headingLines.length, dateLines.length) * 3.5 + (bullets.length > 0 ? 1.5 : 0) + bulletHeight + 1.5;

    if (paginate && y + blockH > PH - 12) {
      doc.addPage();
      drawSidebarBg(doc, 0);
      y = 14;
    }

    if (headingLines.length > 0) {
      doc.setTextColor(...C.textDark);
      setF(doc, "bold", 8.5);
      doc.text(headingLines, x, y);
    }

    if (dateLines.length > 0) {
      doc.setTextColor(...C.textBody);
      setF(doc, "normal", 7.5);
      doc.text(dateLines, x + maxW - 28, y, { align: "left" });
    }

    y += Math.max(headingLines.length, dateLines.length, 1) * 3.5 + 1;

    if (bullets.length > 0) {
      y = drawBullets(doc, bullets, x, y, maxW, paginate);
    }

    y += 1.5;
  }

  return y;
}

function drawStructuredEducation(doc, items, x, y, maxW, paginate) {
  for (const item of items) {
    if (!item) continue;

    if (typeof item !== "object") {
      y = drawBullets(doc, [item], x, y, maxW, paginate);
      continue;
    }

    const heading = [
      String(item.degree || "").trim(),
      item.institution ? ` — ${String(item.institution || "").trim()}` : "",
    ].join("");
    const headingLines = heading ? wrap(doc, heading, maxW - 18) : [];
    const dateLines = item.dates ? wrap(doc, String(item.dates || "").trim(), 28) : [];
    const blockH = Math.max(headingLines.length, dateLines.length, 1) * 3.5 + 1.5;

    if (paginate && y + blockH > PH - 12) {
      doc.addPage();
      drawSidebarBg(doc, 0);
      y = 14;
    }

    if (headingLines.length > 0) {
      doc.setTextColor(...C.textDark);
      setF(doc, "bold", 8.5);
      doc.text(headingLines, x, y);
    }

    if (dateLines.length > 0) {
      doc.setTextColor(...C.textBody);
      setF(doc, "normal", 7.5);
      doc.text(dateLines, x + maxW - 28, y, { align: "left" });
    }

    y += Math.max(headingLines.length, dateLines.length, 1) * 3.5 + 1.5;
  }

  return y;
}

// ===== MAIN GENERATOR =====
export function generateResumePdf(resumeData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const sections = resumeData?.sections || {};
  const contact = resumeData?.contact || {};

  // Page 1 backgrounds + header
  drawSidebarBg(doc, HEADER_H);
  drawHeader(doc, contact, sections);

  // ===== LEFT SIDEBAR =====
  let ly = BODY_TOP;

  if (sections.coreSkills?.length) {
    ly = drawSectionTitle(doc, "Core Skills", L_X, ly, L_W, C.indigo500);
    if (sections.skillCategories && typeof sections.skillCategories === "object") {
      ly = drawCatSkills(doc, sections.skillCategories, L_X, ly, L_W);
    } else {
      ly = drawBadges(doc, sections.coreSkills, L_X, ly, L_W);
    }
    ly += 3;
  }

  if (sections.tools?.length) {
    ly = drawSectionTitle(doc, "Tools", L_X, ly, L_W, C.teal500);
    ly = drawBadges(doc, sections.tools, L_X, ly, L_W);
    ly += 3;
  }

  if (sections.certifications?.length) {
    ly = drawSectionTitle(doc, "Certifications", L_X, ly, L_W, C.amber500);
    ly = drawBullets(doc, sections.certifications, L_X, ly, L_W, false);
    ly += 3;
  }

  if (sections.competencies?.length) {
    ly = drawSectionTitle(doc, "Competencies", L_X, ly, L_W, C.purple500);
    ly = drawBullets(doc, sections.competencies, L_X, ly, L_W, false);
    ly += 3;
  }

  if (sections.aiSkills?.length) {
    ly = drawSectionTitle(doc, "AI Skills", L_X, ly, L_W, C.teal500);
    ly = drawBadges(doc, sections.aiSkills, L_X, ly, L_W);
  }

  // ===== RIGHT MAIN CONTENT =====
  let ry = BODY_TOP;

  if (sections.summary) {
    ry = drawSectionTitle(doc, "Professional Summary", M_X, ry, M_W, C.indigo600);
    setF(doc, "normal", 8.5);
    doc.setTextColor(...C.textBody);
    const lines = wrap(doc, sections.summary, M_W);
    doc.text(lines, M_X, ry);
    ry += lines.length * 3.8 + 5;
  }

  if (sections.experience?.length) {
    if (ry > PH - 30) { doc.addPage(); drawSidebarBg(doc); ry = 14; }
    ry = drawSectionTitle(doc, "Professional Experience", M_X, ry, M_W, C.indigo600);
    ry = drawStructuredExperience(doc, sections.experience, M_X, ry, M_W, true);
    ry += 4;
  }

  if (sections.achievements?.length) {
    if (ry > PH - 30) { doc.addPage(); drawSidebarBg(doc); ry = 14; }
    ry = drawSectionTitle(doc, "Key Achievements", M_X, ry, M_W, C.amber600);
    ry = drawBullets(doc, sections.achievements, M_X, ry, M_W, true);
    ry += 4;
  }

  if (sections.education?.length) {
    if (ry > PH - 30) { doc.addPage(); drawSidebarBg(doc); ry = 14; }
    ry = drawSectionTitle(doc, "Education", M_X, ry, M_W, C.teal600);
    ry = drawStructuredEducation(doc, sections.education, M_X, ry, M_W, true);
    ry += 4;
  }

  if (sections.projects?.length) {
    if (ry > PH - 30) { doc.addPage(); drawSidebarBg(doc); ry = 14; }
    ry = drawSectionTitle(doc, "Projects", M_X, ry, M_W, C.violet600);
    ry = drawBullets(doc, sections.projects, M_X, ry, M_W, true);
  }

  // Fallback: plain text
  if (!sections.summary && !sections.experience?.length && resumeData?.fullText) {
    let y = BODY_TOP;
    setF(doc, "normal", 9);
    doc.setTextColor(...C.textBody);
    const lines = wrap(doc, resumeData.fullText, M_W);
    for (const line of lines) {
      if (y > PH - 12) { doc.addPage(); drawSidebarBg(doc); y = 14; }
      doc.text(line, M_X, y);
      y += 4;
    }
  }

  return doc;
}

export async function downloadResumePdfFromElement(element, filename = "Resume.pdf") {
  const pages = await captureElementPages(element);

  if (pages.length === 0) {
    throw new Error("Resume preview capture returned no pages.");
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  pages.forEach((page, index) => {
    if (index > 0) {
      doc.addPage();
    }

    const pageHeight = (210 * page.heightPx) / page.widthPx;
    doc.addImage(page.dataUrl, "PNG", 0, 0, 210, pageHeight, undefined, "FAST");
  });

  doc.save(filename);
}

/**
 * Generate and download the resume PDF.
 * @param {Object} resumeData
 * @param {string} [filename]
 */
export function downloadResumePdf(resumeData, filename = "Resume.pdf") {
  const doc = generateResumePdf(resumeData);
  doc.save(filename);
}

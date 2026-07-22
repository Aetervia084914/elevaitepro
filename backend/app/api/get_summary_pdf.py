"""
POST /get-summary-pdf

Generates a pixel-perfect ATS Summary PDF via Playwright.
Replicates AtsPanel exactly: gradient accent cards, SVG score rings, priority +
category badges, description sub-text.
"""
from __future__ import annotations

import html
import logging
import math
import re
from typing import Any

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel

router = APIRouter(tags=["summary-pdf"])


# ── Pydantic request models ────────────────────────────────────────────────────

class SectionScores(BaseModel):
    skills: int = 0
    competencies: int = 0
    certifications: int = 0


class AtsScore(BaseModel):
    overallScore: int = 0
    sectionScores: SectionScores = SectionScores()
    strengths: list[Any] = []
    gaps: Any = []
    recommendations: Any = []


class AtsResume(BaseModel):
    headline: str = ""
    summary: str = ""


class RequirementItem(BaseModel):
    id: str = ""
    title: str = ""
    description: str = ""
    category: str = ""
    priority: str = ""
    importance: str = ""
    learningPath: str = ""
    provider: str = ""
    timeToAcquire: str = ""
    marketValue: str = ""
    difficulty: str = ""


class SummaryPdfRequest(BaseModel):
    career_goal: str = "Summary"
    ats_score: AtsScore = AtsScore()
    ats_resume: AtsResume = AtsResume()
    required_skills: list[RequirementItem] = []
    required_ai_skills: list[RequirementItem] = []
    required_competencies: list[RequirementItem] = []
    required_certifications: list[RequirementItem] = []


# ── Utility helpers ────────────────────────────────────────────────────────────

def e(value: Any) -> str:
    """HTML-escape any value for safe inline insertion."""
    return html.escape(str(value or ""))


def ensure_list(value: Any) -> list[str]:
    """Normalise strings or None → list of strings (mirrors React ensureArray)."""
    if not value:
        return []
    if isinstance(value, list):
        return [str(v).strip() for v in value if v]
    return [s.strip() for s in re.split(r"[.\n]", str(value)) if s.strip()]


def priority_meta(item: RequirementItem, is_cert: bool = False) -> tuple[str, str, str]:
    """Return (label, badge_css_class, dot_hex_color) for a requirement item."""
    raw = (item.priority or item.importance or "").lower()
    if raw in ("high", "critical"):
        return (item.priority or item.importance, "badge-rose", "#f43f5e")
    if raw in ("medium", "important"):
        return (item.priority or item.importance, "badge-amber", "#f59e0b")
    if raw in ("low", "beneficial"):
        return (item.priority or item.importance, "badge-emerald", "#10b981")

    # Certification fallback: market value or provider
    if is_cert:
        mv = (item.marketValue or "").lower()
        if mv in ("high", "very high"):
            return (item.marketValue, "badge-rose", "#f43f5e")
        if item.provider:
            return (item.provider, "badge-purple", "#9333ea")

    return ("", "badge-neutral", "#94a3b8")


# ── SVG Score Ring ─────────────────────────────────────────────────────────────

def score_ring_svg(score: int, label: str, size: str = "lg") -> str:
    r      = 54   if size == "lg" else 32
    sw     = 8    if size == "lg" else 6
    dim    = 132  if size == "lg" else 80
    fs     = "1.5rem" if size == "lg" else "0.9rem"
    cx     = dim / 2
    circ   = 2 * math.pi * r
    offset = circ - (max(0, min(score, 100)) / 100) * circ
    color  = "#10b981" if score >= 70 else "#f59e0b" if score >= 40 else "#ec4899"

    return f"""
<div class="ring-wrap">
  <svg width="{dim}" height="{dim}" style="transform:rotate(-90deg);">
    <circle cx="{cx}" cy="{cx}" r="{r}" fill="none"
      stroke="rgba(148,163,184,0.25)" stroke-width="{sw}"/>
    <circle cx="{cx}" cy="{cx}" r="{r}" fill="none"
      stroke="{color}" stroke-width="{sw}" stroke-linecap="round"
      stroke-dasharray="{circ:.4f}" stroke-dashoffset="{offset:.4f}"/>
    <text x="{cx}" y="{cx}" text-anchor="middle" dominant-baseline="central"
      transform="rotate(90,{cx},{cx})" fill="#0f172a"
      style="font-size:{fs};font-weight:700;font-family:-apple-system,'Segoe UI',sans-serif;"
    >{score}</text>
  </svg>
  <span class="ring-label">{e(label)}</span>
</div>"""


# ── Requirement item row ───────────────────────────────────────────────────────

def req_item_html(item: RequirementItem, is_cert: bool = False) -> str:
    label, badge_cls, dot_color = priority_meta(item, is_cert)
    category = item.category if item.category and item.category != label else ""
    sub = item.description or item.learningPath or item.provider or item.timeToAcquire or ""

    badges = ""
    if label:
        badges += f'<span class="badge {badge_cls}">{e(label)}</span>'
    if category:
        badges += f'<span class="badge badge-neutral">{e(category)}</span>'

    sub_html = f'<p class="req-sub">{e(sub)}</p>' if sub else ""

    return f"""
<li class="req-item">
  <span class="req-dot" style="background:{dot_color};"></span>
  <div class="req-body">
    <div class="req-top">
      <span class="req-title">{e(item.title)}</span>
      <div class="req-badges">{badges}</div>
    </div>
    {sub_html}
  </div>
</li>"""


# ── Requirement section block ──────────────────────────────────────────────────

def req_section_html(
    title: str,
    items: list[RequirementItem],
    icon_gradient: str,
    label_color: str,
    empty_label: str = "All requirements completed",
    is_cert: bool = False,
) -> str:
    count = len(items)
    count_str = f"{count} item{'s' if count != 1 else ''}"

    if count == 0:
        content = f"""
<div class="empty-state">
  <span class="empty-check">&#10003;</span>
  <span class="empty-text">{e(empty_label)}</span>
</div>"""
    else:
        rows = "".join(req_item_html(it, is_cert) for it in items)
        content = f'<ul class="req-list">{rows}</ul>'

    return f"""
<div class="req-section">
  <div class="req-sec-hdr">
    <div class="req-sec-left">
      <span class="req-sec-icon" style="background:{icon_gradient};"></span>
      <span class="req-sec-label" style="color:{label_color};">{e(title)}</span>
    </div>
    <span class="req-sec-count">{count_str}</span>
  </div>
  {content}
</div>"""


# ── Card wrapper ───────────────────────────────────────────────────────────────

def card_html(accent: str, title: str, icon_html: str, body: str) -> str:
    return f"""
<div class="card mb">
  <div class="card-accent" style="background:{accent};"></div>
  <div class="card-hdr">
    <div class="card-icon" style="background:{accent};">{icon_html}</div>
    <span class="card-title">{e(title)}</span>
  </div>
  <div class="card-body">{body}</div>
</div>"""


# ── Full HTML document builder ─────────────────────────────────────────────────

CSS = """
@page { size: A4; margin: 10mm 12mm 10mm 12mm; }
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0;padding:0;}
body{font-family:'Segoe UI',Calibri,'Helvetica Neue',Arial,sans-serif;
  background:#f8fafc;color:#1e293b;font-size:13px;line-height:1.5;}

/* ── Layout ── */
.wrap{padding:0;}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;}
.mb{margin-bottom:12px;}

/* ── Page header ── */
.page-hdr{
  background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 55%,#c026d3 100%);
  border-radius:14px;padding:16px 20px;margin-bottom:16px;color:white;
}
.page-hdr h1{font-size:20px;font-weight:800;letter-spacing:-0.025em;margin-bottom:2px;}
.page-hdr p{font-size:11px;opacity:.75;font-weight:500;}

/* ── Cards ── */
.card{
  background:white;border-radius:14px;border:1px solid #f1f5f9;
  box-shadow:0 4px 24px rgba(15,23,42,0.07);overflow:hidden;
}
.card-accent{height:3px;width:100%;}
.card-hdr{
  padding:10px 14px 7px;display:flex;align-items:center;gap:8px;
  border-bottom:1px solid #f8fafc;
}
.card-icon{
  width:26px;height:26px;border-radius:7px;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;font-size:11px;
}
.card-title{font-size:12px;font-weight:600;color:#1e293b;}
.card-body{padding:10px 14px 14px;}

/* ── Bullet list ── */
.bullet-list{list-style:none;display:flex;flex-direction:column;gap:5px;}
.bullet-item{display:flex;align-items:flex-start;gap:8px;font-size:11px;color:#475569;line-height:1.5;}
.bullet-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:4px;}

/* ── Badges ── */
.badge{
  display:inline-block;font-size:9px;font-weight:700;
  padding:2px 5px;border-radius:5px;border:1px solid;
  letter-spacing:.04em;white-space:nowrap;
}
.badge-rose   {background:#fff1f2;color:#e11d48;border-color:#fecdd3;}
.badge-amber  {background:#fffbeb;color:#92400e;border-color:#fde68a;}
.badge-emerald{background:#ecfdf5;color:#065f46;border-color:#a7f3d0;}
.badge-neutral{background:#f8fafc;color:#475569;border-color:#e2e8f0;}
.badge-purple {background:#faf5ff;color:#7c3aed;border-color:#e9d5ff;}

/* ── Requirement section ── */
.req-section{
  border:1px solid #f1f5f9;border-radius:12px;
  background:linear-gradient(135deg,#ffffff,rgba(248,250,252,0.5));
  padding:10px 12px;margin-bottom:8px;
}
.req-section:last-child{margin-bottom:0;}
.req-sec-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
.req-sec-left{display:flex;align-items:center;gap:7px;}
.req-sec-icon{width:24px;height:24px;border-radius:7px;flex-shrink:0;}
.req-sec-label{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;}
.req-sec-count{font-size:9px;font-weight:700;color:#94a3b8;}

/* ── Requirement items ── */
.req-list{list-style:none;display:flex;flex-direction:column;gap:5px;}
.req-item{
  display:flex;align-items:flex-start;gap:8px;
  background:white;border:1px solid #f1f5f9;
  border-radius:9px;padding:7px 9px;
}
.req-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:4px;}
.req-body{flex:1;min-width:0;}
.req-top{display:flex;align-items:flex-start;justify-content:space-between;gap:6px;}
.req-title{font-size:11px;font-weight:700;color:#1e293b;line-height:1.3;flex:1;}
.req-badges{display:flex;gap:3px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end;}
.req-sub{margin-top:3px;font-size:9.5px;color:#64748b;line-height:1.4;}

/* ── Empty state ── */
.empty-state{
  display:flex;align-items:center;gap:7px;
  background:#f0fdf4;border:1px solid #bbf7d0;
  border-radius:8px;padding:7px 10px;
}
.empty-check{color:#16a34a;font-size:13px;font-weight:700;}
.empty-text{font-size:10px;font-weight:600;color:#15803d;}

/* ── Score rings ── */
.rings-bg{
  background:linear-gradient(135deg,rgba(238,242,255,0.7),#ffffff,rgba(245,243,255,0.7));
  border:1px solid rgba(224,231,255,0.6);border-radius:12px;
  padding:16px;display:flex;align-items:center;justify-content:center;
  gap:28px;flex-wrap:wrap;
}
.ring-wrap{display:flex;flex-direction:column;align-items:center;gap:6px;}
.ring-label{font-size:10px;color:#64748b;font-weight:600;text-align:center;}

/* ── ATS CV preview ── */
.cv-headline{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:3px;}
.cv-summary{font-size:10px;color:#475569;line-height:1.5;margin-bottom:10px;}
.kw-label{
  font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
  color:#94a3b8;margin-bottom:5px;
}
.kw-badge{
  background:linear-gradient(135deg,#eef2ff,#f5f3ff);
  border:1px solid #e0e7ff;border-radius:8px;padding:4px 10px;
  font-size:10px;font-weight:700;color:#4338ca;display:inline-block;
}
.req-group-label{
  font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
  color:#64748b;margin:12px 0 6px;display:flex;align-items:center;gap:4px;
}
"""

ICON_SVG = {
    "trending": '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/><polyline points="16,7 22,7 22,13"/></svg>',
    "alert":    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    "light":    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>',
    "file":     '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>',
    "gauge":    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 100 20 10 10 0 000-20z"/><path d="M12 6v6l4 2"/></svg>',
}


def build_html(req: SummaryPdfRequest) -> str:
    ats = req.ats_score
    resume = req.ats_resume
    strengths = ensure_list(ats.strengths)
    gaps      = ensure_list(ats.gaps)
    recs      = ensure_list(ats.recommendations)

    # ── Strengths card ────────────────────────────────────────────────────────
    strengths_body = (
        f'<ul class="bullet-list">'
        + "".join(
            f'<li class="bullet-item"><span class="bullet-dot" style="background:#34d399;"></span><span>{e(s)}</span></li>'
            for s in strengths
        )
        + "</ul>"
        if strengths
        else '<p style="font-size:11px;color:#94a3b8;">No strengths listed.</p>'
    )
    strengths_card = card_html(
        "linear-gradient(90deg,#34d399,#2dd4bf)",
        "Strengths", ICON_SVG["trending"], strengths_body,
    )

    # ── Gaps card ─────────────────────────────────────────────────────────────
    gaps_body = (
        f'<ul class="bullet-list">'
        + "".join(
            f'<li class="bullet-item"><span class="bullet-dot" style="background:#fbbf24;"></span><span>{e(g)}</span></li>'
            for g in gaps
        )
        + "</ul>"
        if gaps
        else '<p style="font-size:11px;color:#94a3b8;">No gaps listed.</p>'
    )
    gaps_card = card_html(
        "linear-gradient(90deg,#fbbf24,#fb923c)",
        "Gaps", ICON_SVG["alert"], gaps_body,
    )

    # ── Recommendations card ───────────────────────────────────────────────────
    recs_body = (
        f'<ul class="bullet-list">'
        + "".join(
            f'<li class="bullet-item"><span class="bullet-dot" style="background:#c084fc;"></span><span>{e(r)}</span></li>'
            for r in recs
        )
        + "</ul>"
        if recs
        else '<p style="font-size:11px;color:#94a3b8;">No recommendations listed.</p>'
    )
    recs_card = card_html(
        "linear-gradient(90deg,#a855f7,#ec4899)",
        "Recommendations", ICON_SVG["light"], recs_body,
    )

    # ── ATS CV Preview card ────────────────────────────────────────────────────
    headline_html = f'<p class="cv-headline">{e(resume.headline)}</p>' if resume.headline else ""
    summary_html  = f'<p class="cv-summary">{e(resume.summary)}</p>'   if resume.summary  else ""
    role_badge    = f'<span class="kw-badge">&#9658; {e(req.career_goal)}</span>' if req.career_goal else ""

    req_sections = (
        '<p class="req-group-label">&#10024; Required to land this role</p>'
        + req_section_html("Required Skills",        req.required_skills,        "linear-gradient(135deg,#6366f1,#3b82f6)", "#4f46e5", "All required skills completed")
        + req_section_html("Required AI Skills",     req.required_ai_skills,     "linear-gradient(135deg,#8b5cf6,#a855f7)", "#7c3aed", "All AI skills completed")
        + req_section_html("Required Competencies",  req.required_competencies,  "linear-gradient(135deg,#f59e0b,#f97316)", "#d97706", "All required competencies completed")
        + req_section_html("Required Certifications",req.required_certifications,"linear-gradient(135deg,#a855f7,#ec4899)", "#9333ea", "All required certifications completed", is_cert=True)
    )

    cv_body = f"""
{headline_html}
{summary_html}
<p class="kw-label">&#9670; Keyword Optimization</p>
<div style="margin-bottom:10px;">{role_badge}</div>
{req_sections}
"""
    cv_card = card_html(
        "linear-gradient(90deg,#6366f1,#a855f7,#ec4899)",
        "ATS-Ready CV Preview", ICON_SVG["file"], cv_body,
    )

    # ── ATS Score card ─────────────────────────────────────────────────────────
    ss = ats.sectionScores
    rings_html = (
        score_ring_svg(ats.overallScore, "Overall", "lg")
        + score_ring_svg(ss.skills,       "Skills",        "sm")
        + score_ring_svg(ss.competencies, "Competencies",  "sm")
        + score_ring_svg(ss.certifications,"Certifications","sm")
    )
    score_body = f'<div class="rings-bg">{rings_html}</div>'
    score_card = card_html(
        "linear-gradient(90deg,#6366f1,#a855f7,#ec4899)",
        "ATS Score", ICON_SVG["gauge"], score_body,
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(req.career_goal)} Summary</title>
<style>{CSS}</style>
</head>
<body>
<div class="wrap">

  <div class="page-hdr">
    <h1>{e(req.career_goal)}</h1>
    <p>ATS Summary &amp; Career Gap Analysis</p>
  </div>

  <div class="grid-2">
    {strengths_card}
    {gaps_card}
  </div>

  {recs_card}
  {cv_card}
  {score_card}

</div>
</body>
</html>"""


# ── PDF renderer ─────────────────────────────────────────────────────────────

from app.api.pdf_renderer import render_html_to_pdf_async

logger = logging.getLogger(__name__)


async def _html_to_pdf(html_content: str) -> bytes:
    return await render_html_to_pdf_async(
        html_content,
        media="print",
        viewport_width=1240,
        viewport_height=1754,
        format="A4",
        margin={
            "top": "10mm",
            "right": "12mm",
            "bottom": "10mm",
            "left": "12mm",
        },
    )


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.post("/get-summary-pdf")
async def get_summary_pdf(req: SummaryPdfRequest) -> Response:
    """Generate and return the ATS Summary as a downloadable PDF."""
    try:
        html_doc  = build_html(req)
        pdf_bytes = await _html_to_pdf(html_doc)
    except Exception as exc:
        logger.exception("[SummaryPDF] generation failed: %s", exc)
        detail = f"{type(exc).__name__}: {exc}"
        code   = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if isinstance(exc, RuntimeError)
            else status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        raise HTTPException(status_code=code, detail=detail) from exc

    safe_name  = re.sub(r"[^a-zA-Z0-9_\-]", "_", req.career_goal or "Summary").strip("_") or "Summary"
    filename   = f"{safe_name}_Summary.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
        },
    )

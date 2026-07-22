'use client';

import { useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  Wrench,
  UserCircle,
  Mail,
  MessageSquare,
  Clock,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Send,
  ExternalLink,
} from 'lucide-react';

/* ── FAQ DATA ── */
const faqs = [
  {
    q: 'How do I use the platform?',
    a: 'After signing in, complete the onboarding flow to set your target role and industry. elevAIte pro then runs a gap analysis against live job-market data and generates your personalised career intelligence report — no manual input required beyond your profile.',
  },
  {
    q: 'How do I upload my profile?',
    a: 'Navigate to your Profile from the dashboard and use the Upload CV section. We accept PDF and DOCX files up to 5 MB. Once uploaded, the AI processes your experience and skills within seconds and pre-fills your career baseline automatically.',
  },
  {
    q: 'How is the analysis generated?',
    a: 'Our AI engine cross-references your profile against a curated database of role requirements, current job-market demand signals, and competency frameworks. The result is a prioritised gap map — not a generic checklist, but evidence-backed insight tied to your target role.',
  },
  {
    q: 'How do I update my account details?',
    a: 'Go to Settings in the top navigation. From there you can update your name, email, password, and subscription preferences. Changes save instantly; email updates require a re-verification step for security.',
  },
  {
    q: 'How do I contact support?',
    a: 'Use the ticket form below or email us directly at contact@aetervia.co.uk For urgent billing queries, include your account email and a brief description. We aim to respond within one business day.',
  },
];

/* ── QUICK-HELP CARDS ── */
const quickCards = [

  {
    icon: HelpCircle,
    title: 'FAQs',
    desc: 'Instant answers to the questions we hear most often.',
    link: '#faq',
    grad: 'linear-gradient(145deg,rgba(0,188,212,0.16),rgba(0,188,212,0.05))',
    border: 'rgba(0,188,212,0.28)',
    iconBg: 'linear-gradient(135deg,#00ACC1,#4DD0E1)',
    shadow: '0 4px 20px rgba(0,188,212,0.18)',
    tagBg: 'rgba(0,188,212,0.10)',
    tagColor: '#00838F',
    tagBorder: 'rgba(0,188,212,0.25)',
    tag: 'Quick answers',
  },
  {
    icon: Wrench,
    title: 'Technical Support',
    desc: 'Troubleshooting for integrations, uploads, and analysis errors.',
    link: '#ticket',
    grad: 'linear-gradient(145deg,rgba(124,77,255,0.16),rgba(124,77,255,0.05))',
    border: 'rgba(124,77,255,0.28)',
    iconBg: 'linear-gradient(135deg,#7C4DFF,#AB47BC)',
    shadow: '0 4px 20px rgba(124,77,255,0.18)',
    tagBg: 'rgba(124,77,255,0.10)',
    tagColor: '#6A1B9A',
    tagBorder: 'rgba(124,77,255,0.25)',
    tag: 'Tech help',
  },
  {
    icon: UserCircle,
    title: 'Account Support',
    desc: 'Help with billing, subscription, and account access issues.',
    link: '#ticket',
    grad: 'linear-gradient(145deg,rgba(99,102,241,0.16),rgba(79,70,229,0.05))',
    border: 'rgba(99,102,241,0.28)',
    iconBg: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
    shadow: '0 4px 20px rgba(99,102,241,0.18)',
    tagBg: 'rgba(99,102,241,0.10)',
    tagColor: '#4338CA',
    tagBorder: 'rgba(99,102,241,0.25)',
    tag: 'Billing & access',
  },
];

/* ── CONTACT CARDS ── */
const contactCards = [
  {
    icon: Mail,
    title: 'Email Support',
    value: 'contact@elevaitepro.co.uk',
    sub: 'Response within 1 business day',
    grad: 'linear-gradient(145deg,rgba(57,73,171,0.15),rgba(57,73,171,0.04))',
    border: 'rgba(57,73,171,0.22)',
    iconBg: 'linear-gradient(135deg,#3949AB,#7986CB)',
    valColor: '#1A237E',
  },
  // {
  //   icon: MessageSquare,
  //   title: 'Live Chat',
  //   value: 'Available in-app',
  //   sub: 'Mon – Fri, 09:00 – 17:00 GMT',
  //   grad: 'linear-gradient(145deg,rgba(0,188,212,0.14),rgba(0,188,212,0.04))',
  //   border: 'rgba(0,188,212,0.22)',
  //   iconBg: 'linear-gradient(135deg,#00ACC1,#4DD0E1)',
  //   valColor: '#006064',
  // },
  {
    icon: Clock,
    title: 'Response Time',
    value: '< 48 hours',
    sub: 'Typical resolution time',
    grad: 'linear-gradient(145deg,rgba(124,77,255,0.14),rgba(124,77,255,0.04))',
    border: 'rgba(124,77,255,0.22)',
    iconBg: 'linear-gradient(135deg,#7C4DFF,#AB47BC)',
    valColor: '#4527A0',
  },
];

/* ── SUBJECT OPTIONS ── */
const subjects = [
  'General enquiry',
  'Technical issue',
  'Billing & subscription',
  'Account access',
  'Feature request',
  'Other',
];

/* ════════════════════════════════════════════
   SUPPORT COMPONENT
════════════════════════════════════════════ */
export default function Support() {
  /* FAQ accordion */
  const [openFaq, setOpenFaq] = useState(null);

  /* Form state */
  const [form, setForm] = useState({ name: '', email: '', subject: '', description: '' });
  const [errors, setErrors] = useState({});
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'error'
  const [submitError, setSubmitError] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.';
    if (!form.subject) e.subject = 'Please choose a subject.';
    if (!form.description.trim()) e.description = 'Description is required.';
    else if (form.description.trim().length < 20) e.description = 'Please provide at least 20 characters.';
    return e;
  };

  const handleChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/fastapi/submitticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject,
          description: form.description.trim(),
        }),
      });
      let data = {};
      try { data = await res.json(); } catch { /* non-JSON error response */ }
      if (!res.ok) {
        setSubmitError(data.detail || data.error || 'Something went wrong. Please try again.');
        setSubmitStatus('error');
        return;
      }
      setSubmitStatus('success');
      setTicketNumber(data.ticket_number || '');
      setForm({ name: '', email: '', subject: '', description: '' });
      setErrors({});
    } catch {
      setSubmitError('Network error. Please check your connection and try again.');
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Shared inline styles ── */
  const panelBase = {
    background: 'linear-gradient(145deg,rgba(255,255,255,0.88),rgba(255,255,255,0.65))',
    backdropFilter: 'blur(40px) saturate(220%)',
    WebkitBackdropFilter: 'blur(40px) saturate(220%)',
    border: '1px solid rgba(255,255,255,0.9)',
    borderRadius: 24,
    boxShadow: '0 24px 80px rgba(99,102,241,0.12),0 8px 32px rgba(124,58,237,0.08),inset 0 1px 0 rgba(255,255,255,0.98)',
  };

  const inputBase = {
    width: '100%',
    borderRadius: 11,
    border: '1px solid rgba(57,73,171,0.18)',
    padding: '13px 15px',
    fontSize: 14,
    outline: 'none',
    background: 'rgba(255,255,255,0.92)',
    color: 'var(--indigo-d,#1A237E)',
    fontFamily: "var(--font-dmsans),'DM Sans',sans-serif",
    transition: 'border-color 0.2s,box-shadow 0.2s',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
    fontFamily: "var(--font-dmsans),'DM Sans',sans-serif",
  };

  const errorStyle = {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: "var(--font-dmsans),'DM Sans',sans-serif",
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: "var(--font-manrope),'Manrope',ui-sans-serif,system-ui,sans-serif",
      }}
    >
      {/* ══════════════════════════════════════
          HEADER  (mirrors .hiw-header styling)
      ══════════════════════════════════════ */}
      <div
        style={{
          background: 'linear-gradient(155deg,#0c1630 0%,#0f1e3d 30%,#162044 60%,#111a38 100%)',
          clipPath: 'polygon(0 0,100% 0,100% 75%,0 100%)',
          padding: '120px 80px 120px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient orbs */}
        <div style={{ position:'absolute',top:'-30%',right:'-10%',width:'60%',height:'150%',background:'radial-gradient(ellipse,rgba(99,102,241,0.35) 0%,rgba(124,58,237,0.2) 40%,transparent 70%)',pointerEvents:'none' }} />
        <div style={{ position:'absolute',bottom:'-20%',left:'-5%',width:'50%',height:'100%',background:'radial-gradient(ellipse,rgba(30,63,168,0.45) 0%,rgba(6,182,212,0.12) 50%,transparent 70%)',pointerEvents:'none' }} />

        <div style={{ position:'relative',zIndex:1,maxWidth:800 }}>
          {/* Label badge */}
          <div
            style={{
              display:'inline-flex',alignItems:'center',gap:8,
              background:'linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))',
              border:'1px solid rgba(167,139,250,0.3)',
              borderRadius:100,padding:'7px 18px',
              fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.75)',
              textTransform:'uppercase',letterSpacing:'0.1em',
              marginBottom:22,backdropFilter:'blur(16px) saturate(180%)',
              WebkitBackdropFilter:'blur(16px) saturate(180%)',
              boxShadow:'0 4px 20px rgba(99,102,241,0.2),inset 0 1px 0 rgba(255,255,255,0.12)',
              fontFamily:"var(--font-bricolage),'Bricolage Grotesque',sans-serif",
            }}
          >
            💬 elevAIte pro Support
          </div>

          {/* H1 */}
          <h1
            style={{
              fontFamily:"var(--font-bricolage),'Bricolage Grotesque',sans-serif",
              fontSize:'clamp(44px,5.5vw,68px)',
              fontWeight:800,letterSpacing:'-0.04em',
              color:'white',lineHeight:1.02,marginBottom:18,
              textShadow:'0 2px 16px rgba(99,102,241,0.25)',
            }}
          >
            Support<br />
            <em
              style={{
                fontStyle:'normal',
                background:'linear-gradient(100deg,#818cf8,#a78bfa,#22d3ee)',
                WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
                backgroundClip:'text',
                filter:'drop-shadow(0 2px 10px rgba(129,140,248,0.35))',
              }}
            >
              Centre
            </em>
          </h1>

          {/* Sub */}
          <p style={{ fontSize:16,color:'rgba(255,255,255,0.5)',fontWeight:400,maxWidth:500,lineHeight:1.68,letterSpacing:'0.005em' }}>
            We're here to help. Browse the resources below, check the FAQs, or submit a ticket — and we'll get back to you within one business day.
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════ */}
      <div style={{ maxWidth:1200,margin:'0 auto',padding:'80px 80px 100px' }}>

        {/* ── 1. QUICK HELP CARDS ── */}
        <div style={{ marginBottom:80 }}>
          <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:40 }}>
            <div style={{ flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(57,73,171,0.25),transparent)' }} />
            <span style={{ fontSize:11,fontWeight:700,color:'rgba(99,102,241,0.7)',letterSpacing:'0.15em',textTransform:'uppercase',whiteSpace:'nowrap',fontFamily:"var(--font-bricolage),'Bricolage Grotesque',sans-serif" }}>Quick Help</span>
            <div style={{ flex:1,height:1,background:'linear-gradient(90deg,rgba(57,73,171,0.25),transparent)' }} />
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,maxWidth:960,margin:'0 auto' }}>
            {quickCards.map((c) => {
              const Icon = c.icon;
              return (
                <a
                  key={c.title}
                  href={c.link}
                  style={{
                    background: c.grad,
                    border: `1px solid ${c.border}`,
                    borderRadius: 22,
                    padding: '28px 24px',
                    textDecoration: 'none',
                    display: 'block',
                    boxShadow: c.shadow,
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    transition: 'transform 0.28s cubic-bezier(.25,.46,.45,.94),box-shadow 0.28s',
                    cursor: 'pointer',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-8px) scale(1.01)'; e.currentTarget.style.boxShadow=c.shadow.replace('0.18','0.32'); }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0) scale(1)'; e.currentTarget.style.boxShadow=c.shadow; }}
                >
                  {/* glossy top line */}
                  <div style={{ position:'absolute',top:0,left:'10%',right:'10%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)',pointerEvents:'none' }} />

                  {/* icon */}
                  <div
                    style={{
                      width:52,height:52,borderRadius:16,display:'flex',alignItems:'center',justifyContent:'center',
                      marginBottom:18,background:c.iconBg,
                      boxShadow:`0 4px 16px ${c.border}`,
                      position:'relative',overflow:'hidden',
                    }}
                  >
                    <div style={{ position:'absolute',top:2,left:'10%',right:'10%',height:1,background:'rgba(255,255,255,0.45)',borderRadius:'50%',pointerEvents:'none' }} />
                    <Icon size={22} color="white" strokeWidth={2} />
                  </div>

                  <div
                    style={{
                      fontFamily:"var(--font-bricolage),'Bricolage Grotesque',sans-serif",
                      fontSize:17,fontWeight:700,color:'var(--indigo-d,#1A237E)',marginBottom:8,lineHeight:1.3,
                    }}
                  >
                    {c.title}
                  </div>
                  <p style={{ fontSize:13.5,color:'#546E7A',lineHeight:1.7,marginBottom:16 }}>{c.desc}</p>

                  <div
                    style={{
                      display:'inline-flex',alignItems:'center',gap:5,
                      fontSize:11,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',
                      padding:'4px 10px',borderRadius:7,
                      background:c.tagBg,color:c.tagColor,border:`1px solid ${c.tagBorder}`,
                    }}
                  >
                    {c.tag} <ExternalLink size={10} />
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* ── 2. FAQ SECTION ── */}
        <div id="faq" style={{ marginBottom:80 }}>
          <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:40 }}>
            <div style={{ flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(57,73,171,0.25),transparent)' }} />
            <span style={{ fontSize:11,fontWeight:700,color:'rgba(99,102,241,0.7)',letterSpacing:'0.15em',textTransform:'uppercase',whiteSpace:'nowrap',fontFamily:"var(--font-bricolage),'Bricolage Grotesque',sans-serif" }}>Frequently Asked Questions</span>
            <div style={{ flex:1,height:1,background:'linear-gradient(90deg,rgba(57,73,171,0.25),transparent)' }} />
          </div>

          <div style={{ ...panelBase, padding:0, overflow:'hidden' }}>
            {faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={i}
                  style={{
                    borderBottom: i < faqs.length - 1 ? '1px solid rgba(99,102,241,0.10)' : 'none',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    style={{
                      width:'100%',padding:'22px 28px',
                      display:'flex',alignItems:'center',justifyContent:'space-between',
                      background:'none',border:'none',cursor:'pointer',textAlign:'left',
                      fontFamily:"var(--font-dmsans),'DM Sans',sans-serif",
                      transition:'background 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background='linear-gradient(135deg,rgba(99,102,241,0.04),rgba(124,58,237,0.02))'; }}
                    onMouseLeave={e => { e.currentTarget.style.background='none'; }}
                  >
                    <span
                      style={{
                        fontSize:15,fontWeight:600,color:'#0f172a',lineHeight:1.4,paddingRight:16,
                        fontFamily:"var(--font-dmsans),'DM Sans',sans-serif",
                      }}
                    >
                      {faq.q}
                    </span>
                    <span
                      style={{
                        flexShrink:0,width:28,height:28,
                        display:'flex',alignItems:'center',justifyContent:'center',
                        borderRadius:8,
                        background: isOpen
                          ? 'linear-gradient(135deg,#3949AB,#7C4DFF)'
                          : 'rgba(57,73,171,0.08)',
                        transition:'background 0.22s,transform 0.22s',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    >
                      <ChevronDown size={16} color={isOpen ? 'white' : '#3949AB'} strokeWidth={2.5} />
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding:'0 28px 22px 28px',
                        fontSize:14,color:'#475569',lineHeight:1.75,
                        fontFamily:"var(--font-dmsans),'DM Sans',sans-serif",
                        animation:'srCardIn 0.3s cubic-bezier(.22,.8,.2,1) both',
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 3. CONTACT INFO ── */}
        <div style={{ marginBottom:80 }}>
          <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:40 }}>
            <div style={{ flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(57,73,171,0.25),transparent)' }} />
            <span style={{ fontSize:11,fontWeight:700,color:'rgba(99,102,241,0.7)',letterSpacing:'0.15em',textTransform:'uppercase',whiteSpace:'nowrap',fontFamily:"var(--font-bricolage),'Bricolage Grotesque',sans-serif" }}>Contact Us</span>
            <div style={{ flex:1,height:1,background:'linear-gradient(90deg,rgba(57,73,171,0.25),transparent)' }} />
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:20,maxWidth:800,margin:'0 auto' }}>
            {contactCards.map((c) => {
              const Icon = c.icon;
              return (
                <div
                  key={c.title}
                  style={{
                    background: c.grad,
                    border: `1px solid ${c.border}`,
                    borderRadius: 22,
                    padding: '26px 24px',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 40px rgba(57,73,171,0.08)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'transform 0.25s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; }}
                >
                  <div style={{ position:'absolute',top:0,left:'10%',right:'10%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.85),transparent)',pointerEvents:'none' }} />

                  <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:14 }}>
                    <div style={{ width:44,height:44,borderRadius:13,display:'flex',alignItems:'center',justifyContent:'center',background:c.iconBg,boxShadow:`0 4px 14px ${c.border}`,flexShrink:0 }}>
                      <Icon size={20} color="white" strokeWidth={2} />
                    </div>
                    <span style={{ fontFamily:"var(--font-bricolage),'Bricolage Grotesque',sans-serif",fontSize:15,fontWeight:700,color:'var(--indigo-d,#1A237E)' }}>{c.title}</span>
                  </div>

                  <div style={{ fontSize:15,fontWeight:700,color:c.valColor,marginBottom:5,fontFamily:"var(--font-dmsans),'DM Sans',sans-serif" }}>{c.value}</div>
                  <div style={{ fontSize:13,color:'#607D8B',fontFamily:"var(--font-dmsans),'DM Sans',sans-serif" }}>{c.sub}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 4. TICKET FORM ── */}
        <div id="ticket">
          <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:40 }}>
            <div style={{ flex:1,height:1,background:'linear-gradient(90deg,transparent,rgba(57,73,171,0.25),transparent)' }} />
            <span style={{ fontSize:11,fontWeight:700,color:'rgba(99,102,241,0.7)',letterSpacing:'0.15em',textTransform:'uppercase',whiteSpace:'nowrap',fontFamily:"var(--font-bricolage),'Bricolage Grotesque',sans-serif" }}>Submit a Ticket</span>
            <div style={{ flex:1,height:1,background:'linear-gradient(90deg,rgba(57,73,171,0.25),transparent)' }} />
          </div>

          <div style={{ ...panelBase, padding:'40px 48px' }}>
            {/* Success state */}
            {submitStatus === 'success' && (
              <div
                style={{
                  display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                  gap:16,padding:'40px 0',textAlign:'center',
                }}
              >
                <div style={{ width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,rgba(5,150,105,0.15),rgba(16,185,129,0.08))',border:'1px solid rgba(5,150,105,0.25)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 24px rgba(5,150,105,0.14)' }}>
                  <CheckCircle size={30} color="#047857" strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontFamily:"var(--font-bricolage),'Bricolage Grotesque',sans-serif",fontSize:22,fontWeight:800,color:'var(--indigo-d,#1A237E)',marginBottom:8 }}>Ticket received!</div>
                  <p style={{ fontSize:14,color:'#546E7A',lineHeight:1.7,maxWidth:420,margin:'0 auto' }}>
                    Thanks for reaching out. We'll review your message and get back to you at the email you provided within one business day.
                  </p>
                </div>
                {ticketNumber && (
                  <div style={{ display:'inline-flex',flexDirection:'column',alignItems:'center',gap:4,padding:'12px 26px',borderRadius:14,background:'rgba(99,102,241,0.07)',border:'1px solid rgba(99,102,241,0.2)' }}>
                    <span style={{ fontSize:11,fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:'#6366F1',fontFamily:"var(--font-dmsans),'DM Sans',sans-serif" }}>Your ticket number</span>
                    <span style={{ fontFamily:"var(--font-bricolage),'Bricolage Grotesque',sans-serif",fontSize:22,fontWeight:800,letterSpacing:'0.5px',color:'#4338CA' }}>{ticketNumber}</span>
                    <span style={{ fontSize:12,color:'#9CA3AF',fontFamily:"var(--font-dmsans),'DM Sans',sans-serif" }}>A confirmation has been emailed to you — keep this number for reference.</span>
                  </div>
                )}
                <button
                  onClick={() => setSubmitStatus(null)}
                  style={{
                    marginTop:8,padding:'12px 28px',borderRadius:12,border:'none',cursor:'pointer',
                    background:'linear-gradient(135deg,#3949AB,#7C4DFF)',
                    color:'white',fontSize:14,fontWeight:700,
                    fontFamily:"var(--font-dmsans),'DM Sans',sans-serif",
                    boxShadow:'0 4px 20px rgba(57,73,171,0.35)',
                    transition:'transform 0.2s,box-shadow 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(57,73,171,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(57,73,171,0.35)'; }}
                >
                  Submit another ticket
                </button>
              </div>
            )}

            {/* Error banner */}
            {submitStatus === 'error' && (
              <div style={{ display:'flex',alignItems:'center',gap:10,padding:'14px 18px',borderRadius:12,background:'rgba(220,38,38,0.07)',border:'1px solid rgba(220,38,38,0.2)',marginBottom:24,color:'#991B1B',fontSize:13,fontFamily:"var(--font-dmsans),'DM Sans',sans-serif" }}>
                <AlertCircle size={16} strokeWidth={2} />
                {submitError || 'Something went wrong. Please try again or email contact@elevaite.pro directly.'}
              </div>
            )}

            {/* Form */}
            {submitStatus !== 'success' && (
              <form onSubmit={handleSubmit} noValidate>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20 }}>
                  {/* Name */}
                  <div>
                    <label style={labelStyle}>Name <span style={{ color:'#dc2626' }}>*</span></label>
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={form.name}
                      onChange={e => handleChange('name', e.target.value)}
                      maxLength={100}
                      style={{
                        ...inputBase,
                        borderColor: errors.name ? '#dc2626' : 'rgba(57,73,171,0.18)',
                        boxShadow: errors.name ? '0 0 0 3px rgba(220,38,38,0.1)' : 'none',
                      }}
                      onFocus={e => { if (!errors.name) e.target.style.borderColor='#3949AB'; e.target.style.boxShadow='0 0 0 3px rgba(57,73,171,0.09)'; }}
                      onBlur={e => { if (!errors.name) { e.target.style.borderColor='rgba(57,73,171,0.18)'; e.target.style.boxShadow='none'; } }}
                    />
                    {errors.name && <div style={errorStyle}><AlertCircle size={12} strokeWidth={2} />{errors.name}</div>}
                  </div>

                  {/* Email */}
                  <div>
                    <label style={labelStyle}>Email <span style={{ color:'#dc2626' }}>*</span></label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={e => handleChange('email', e.target.value)}
                      maxLength={150}
                      style={{
                        ...inputBase,
                        borderColor: errors.email ? '#dc2626' : 'rgba(57,73,171,0.18)',
                        boxShadow: errors.email ? '0 0 0 3px rgba(220,38,38,0.1)' : 'none',
                      }}
                      onFocus={e => { if (!errors.email) e.target.style.borderColor='#3949AB'; e.target.style.boxShadow='0 0 0 3px rgba(57,73,171,0.09)'; }}
                      onBlur={e => { if (!errors.email) { e.target.style.borderColor='rgba(57,73,171,0.18)'; e.target.style.boxShadow='none'; } }}
                    />
                    {errors.email && <div style={errorStyle}><AlertCircle size={12} strokeWidth={2} />{errors.email}</div>}
                  </div>
                </div>

                {/* Subject */}
                <div style={{ marginBottom:20 }}>
                  <label style={labelStyle}>Subject <span style={{ color:'#dc2626' }}>*</span></label>
                  <select
                    value={form.subject}
                    onChange={e => handleChange('subject', e.target.value)}
                    style={{
                      ...inputBase,
                      cursor: 'pointer',
                      borderColor: errors.subject ? '#dc2626' : 'rgba(57,73,171,0.18)',
                      boxShadow: errors.subject ? '0 0 0 3px rgba(220,38,38,0.1)' : 'none',
                      appearance: 'none',
                      backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%233949AB' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 14px center',
                      paddingRight: 40,
                    }}
                  >
                    <option value="">Choose a subject…</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.subject && <div style={errorStyle}><AlertCircle size={12} strokeWidth={2} />{errors.subject}</div>}
                </div>

                {/* Description */}
                <div style={{ marginBottom:28 }}>
                  <label style={labelStyle}>
                    Description <span style={{ color:'#dc2626' }}>*</span>
                    <span style={{ fontWeight:400,color:'#9CA3AF',marginLeft:8 }}>({form.description.trim().length}/1000)</span>
                  </label>
                  <textarea
                    placeholder="Describe your issue or question in detail…"
                    value={form.description}
                    onChange={e => handleChange('description', e.target.value)}
                    maxLength={1000}
                    rows={5}
                    style={{
                      ...inputBase,
                      resize: 'vertical',
                      minHeight: 120,
                      borderColor: errors.description ? '#dc2626' : 'rgba(57,73,171,0.18)',
                      boxShadow: errors.description ? '0 0 0 3px rgba(220,38,38,0.1)' : 'none',
                    }}
                    onFocus={e => { if (!errors.description) e.target.style.borderColor='#3949AB'; e.target.style.boxShadow='0 0 0 3px rgba(57,73,171,0.09)'; }}
                    onBlur={e => { if (!errors.description) { e.target.style.borderColor='rgba(57,73,171,0.18)'; e.target.style.boxShadow='none'; } }}
                  />
                  {errors.description && <div style={errorStyle}><AlertCircle size={12} strokeWidth={2} />{errors.description}</div>}
                </div>

                {/* Submit */}
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:16 }}>
                  <p style={{ fontSize:13,color:'#9CA3AF',fontFamily:"var(--font-dmsans),'DM Sans',sans-serif" }}>
                    <span style={{ color:'#dc2626' }}>*</span> Required fields
                  </p>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-p"
                    style={{
                      display:'inline-flex',alignItems:'center',gap:9,
                      padding:'14px 32px',borderRadius:14,border:'none',cursor: submitting ? 'not-allowed' : 'pointer',
                      background:'linear-gradient(145deg,#4f46e5,#7c3aed,#ec4899)',
                      color:'white',fontSize:15,fontWeight:700,
                      fontFamily:"var(--font-dmsans),'DM Sans',sans-serif",
                      boxShadow:'0 6px 24px rgba(99,102,241,0.4),inset 0 1px 0 rgba(255,255,255,0.22)',
                      transition:'transform 0.2s,box-shadow 0.2s,opacity 0.2s',
                      opacity: submitting ? 0.7 : 1,
                    }}
                    onMouseEnter={e => { if (!submitting) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 36px rgba(99,102,241,0.55),inset 0 1px 0 rgba(255,255,255,0.28)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 6px 24px rgba(99,102,241,0.4),inset 0 1px 0 rgba(255,255,255,0.22)'; }}
                  >
                    {submitting ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation:'srSpin 0.8s linear infinite' }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        Sending…
                      </>
                    ) : (
                      <><Send size={16} strokeWidth={2} /> Send Ticket</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════
          BOTTOM BAND  (mirrors .hiw-bottom-band)
      ══════════════════════════════════════ */}
      <div
        style={{
          background: 'linear-gradient(155deg,#0c1630 0%,#0f1e3d 40%,#162044 100%)',
          clipPath: 'polygon(0 25%,100% 0,100% 100%,0 100%)',
          padding: '100px 80px 60px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position:'absolute',inset:0,pointerEvents:'none',background:'linear-gradient(160deg,rgba(255,255,255,0.04) 0%,transparent 40%)' }} />
        <div style={{ position:'absolute',top:0,left:'15%',right:'15%',height:1,pointerEvents:'none',background:'linear-gradient(90deg,transparent,rgba(129,140,248,0.25),transparent)' }} />

        <p
          style={{
            fontFamily:"var(--font-bricolage),'Bricolage Grotesque',sans-serif",
            fontSize:'clamp(18px,2.3vw,26px)',fontWeight:700,
            color:'rgba(255,255,255,0.82)',letterSpacing:'-0.025em',
            lineHeight:1.45,maxWidth:600,margin:'0 auto',
            position:'relative',zIndex:1,textShadow:'0 1px 8px rgba(0,0,0,0.3)',
          }}
        >
          Still need help? Our team is just a message away.{' '}
          <strong
            style={{
              background:'linear-gradient(100deg,#818cf8,#22d3ee)',
              WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',
              backgroundClip:'text',
              filter:'drop-shadow(0 2px 8px rgba(129,140,248,0.3))',
            }}
          >
            We've got you covered.
          </strong>
        </p>
      </div>
    </div>
  );
}

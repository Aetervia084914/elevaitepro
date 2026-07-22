'use client';

import { AlertCircle, Shield, FileText, CheckCircle, CreditCard, Lock, Scale, Database } from 'lucide-react';

const GROUPS = [
  {
    label: 'The Basics',
    items: [
      {
        icon: FileText,
        title: 'Who We Are',
        body: 'Aetervia Limited operates elevAItepro. For any account or legal queries, contact us at contact@elevaitepro.co.uk',
      },
      {
        icon: CheckCircle,
        title: 'Eligibility',
        body: 'You must be 16 or over to use this platform. Users aged 16–17 require verifiable parental or guardian consent before purchasing. Under-16s may not use the platform.',
      },
      {
        icon: Lock,
        title: 'Accounts',
        body: 'You are responsible for keeping your login credentials secure and for all activity under your account. Notify us immediately at contact@elevaitepro.co.uk if you suspect any unauthorised access.',
      },
    ],
  },
  {
    label: 'Payments & Cancellation',
    items: [
      {
        icon: CreditCard,
        title: 'Pricing Model',
        body: 'elevAItepro operates on a pay-per-analysis basis. One payment covers one CV analysed against up to three AI-suggested roles. There is no subscription and no recurring billing.',
      },
      {
        icon: Shield,
        title: '14-Day Cancellation Right',
        body: 'Under UK consumer law, you have 14 days from purchase to cancel. If you tick the consent box at checkout, you are requesting the service begins immediately. Once delivery is complete, the 14-day cancellation right lapses. This does not affect your statutory rights.',
      },
      {
        icon: AlertCircle,
        title: 'Refunds',
        body: 'If an analysis fails through a fault on our platform, we will re-run the analysis or issue a refund at our discretion. Contact us within 7 days of the issue arising at contact@elevaitepro.co.uk',
      },
    ],
  },
  {
    label: 'AI Outputs & Intellectual Property',
    items: [
      {
        icon: FileText,
        title: 'AI Outputs',
        body: 'Our platform uses AI to generate skills gap assessments, role-match recommendations, and career pathways, produced using a proprietary skills taxonomy and AI modelling. All outputs are informational only. They do not constitute careers advice, employment guidance, or a guarantee of any outcome. Results may reflect the limitations of AI technology and the information you provide.',
      },
      {
        icon: CheckCircle,
        title: 'Your Content',
        body: 'You retain ownership of all content you upload, including your CV. By uploading, you grant Aetervia Limited a limited licence to process your content solely to deliver the requested analysis. We do not sell, share, or use your CV to train AI models without your explicit consent.',
      },
      {
        icon: Shield,
        title: 'Platform IP',
        body: 'All platform software, design, branding, and analysis methodology belongs to Aetervia Limited. You may not scrape, copy, or reverse-engineer any part of the service.',
      },
    ],
  },
  {
    label: 'Your Rights & Our Data Practices',
    items: [
      {
        icon: Database,
        title: 'Data & Privacy',
        body: 'We process your personal data in accordance with UK GDPR and the Data Protection Act 2018. We are registered with the Information Commissioner\'s Office (ICO). Your data is held on UK/EU infrastructure and is not transferred outside the UK/EEA without appropriate safeguards. Full details are set out in our Privacy Policy at elevaitepro.co.uk/privacy',
        rights: [
          'Right of access — request a copy of the data we hold about you',
          'Right to rectification — ask us to correct inaccurate data',
          'Right to erasure — ask us to delete your data',
          'Right to object — object to certain types of processing',
          'Right to data portability — request your data in a portable format',
        ],
      },
    ],
  },
  {
    label: 'Liability & Disputes',
    items: [
      {
        icon: Scale,
        title: 'Liability Cap',
        body: 'Our total liability to you is capped at the amount you paid to us in the 12 months preceding any claim. We are not liable for any indirect, consequential, or economic losses arising from your use of the platform.',
      },
      {
        icon: FileText,
        title: 'Governing Law',
        body: 'These Terms are governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.',
      },
      {
        icon: AlertCircle,
        title: 'Changes To These Terms',
        body: 'We will notify you of any material changes to these Terms at least 30 days before they take effect. Continued use of the platform after that date constitutes acceptance of the updated Terms.',
      },
    ],
  },
];

/* ── icon colour palette (one per item, cycled) ── */
const PALETTE = [
  { bg: 'linear-gradient(135deg,#3949AB,#7986CB)', shadow: 'rgba(57,73,171,0.28)' },
  { bg: 'linear-gradient(135deg,#00ACC1,#4DD0E1)', shadow: 'rgba(0,188,212,0.28)' },
  { bg: 'linear-gradient(135deg,#7C4DFF,#AB47BC)', shadow: 'rgba(124,77,255,0.28)' },
  { bg: 'linear-gradient(135deg,#4f46e5,#7c3aed)', shadow: 'rgba(99,102,241,0.28)' },
  { bg: 'linear-gradient(135deg,#E91E63,#F06292)', shadow: 'rgba(233,30,99,0.28)' },
  { bg: 'linear-gradient(135deg,#F59E0B,#FBBF24)', shadow: 'rgba(245,158,11,0.28)' },
  { bg: 'linear-gradient(135deg,#059669,#34D399)', shadow: 'rgba(5,150,105,0.28)' },
  { bg: 'linear-gradient(135deg,#FF5722,#FF8A65)', shadow: 'rgba(255,87,34,0.28)' },
  { bg: 'linear-gradient(135deg,#0284C7,#38BDF8)', shadow: 'rgba(2,132,199,0.28)' },
  { bg: 'linear-gradient(135deg,#9333EA,#C084FC)', shadow: 'rgba(147,51,234,0.28)' },
  { bg: 'linear-gradient(135deg,#DC2626,#F87171)', shadow: 'rgba(220,38,38,0.28)' },
  { bg: 'linear-gradient(135deg,#0D9488,#5EEAD4)', shadow: 'rgba(13,148,136,0.28)' },
  { bg: 'linear-gradient(135deg,#6D28D9,#A78BFA)', shadow: 'rgba(109,40,217,0.28)' },
];

const panelBase = {
  background: 'linear-gradient(145deg,rgba(255,255,255,0.88),rgba(255,255,255,0.65))',
  backdropFilter: 'blur(40px) saturate(220%)',
  WebkitBackdropFilter: 'blur(40px) saturate(220%)',
  border: '1px solid rgba(255,255,255,0.9)',
  borderRadius: 20,
  boxShadow: '0 24px 80px rgba(99,102,241,0.10),0 8px 32px rgba(124,58,237,0.06),inset 0 1px 0 rgba(255,255,255,0.98)',
};

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, marginTop: 56 }}>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,transparent,rgba(57,73,171,0.22),transparent)' }} />
      <span
        style={{
          fontSize: 11, fontWeight: 700, color: 'rgba(99,102,241,0.75)',
          letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap',
          fontFamily: "var(--font-bricolage),'Bricolage Grotesque',sans-serif",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,rgba(57,73,171,0.22),transparent)' }} />
    </div>
  );
}

export default function Terms() {
  return (
    <div style={{ minHeight: '100vh', fontFamily: "var(--font-manrope),'Manrope',ui-sans-serif,system-ui,sans-serif" }}>

      {/* ── HERO HEADER ── */}
      <div
        style={{
          background: 'linear-gradient(155deg,#0c1630 0%,#0f1e3d 30%,#162044 60%,#111a38 100%)',
          clipPath: 'polygon(0 0,100% 0,100% 78%,0 100%)',
          padding: '120px 80px 130px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ambient orbs */}
        <div style={{ position:'absolute',top:'-30%',right:'-10%',width:'60%',height:'150%',background:'radial-gradient(ellipse,rgba(99,102,241,0.32) 0%,rgba(124,58,237,0.18) 40%,transparent 70%)',pointerEvents:'none' }} />
        <div style={{ position:'absolute',bottom:'-20%',left:'-5%',width:'50%',height:'100%',background:'radial-gradient(ellipse,rgba(30,63,168,0.40) 0%,rgba(6,182,212,0.10) 50%,transparent 70%)',pointerEvents:'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 800 }}>
       

          {/* H1 */}
          <h1
            style={{
              fontFamily: "var(--font-bricolage),'Bricolage Grotesque',sans-serif",
              fontSize: 'clamp(44px,5.5vw,68px)',
              fontWeight: 800, letterSpacing: '-0.04em',
              color: 'white', lineHeight: 1.02, marginBottom: 18,
              textShadow: '0 2px 16px rgba(99,102,241,0.25)',
            }}
          >
            Terms of{' '}
            <em
              style={{
                fontStyle: 'normal',
                background: 'linear-gradient(100deg,#818cf8,#a78bfa,#22d3ee)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 2px 10px rgba(129,140,248,0.35))',
              }}
            >
              Service
            </em>
          </h1>

          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: 400, maxWidth: 520, lineHeight: 1.68, letterSpacing: '0.005em' }}>
            Operated by Aetervia Limited, registered in England and Wales. Please read these Terms carefully before using elevAItepro.
          </p>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '80px 40px 100px' }}>

        {/* Important Notice */}
        <div
          style={{
            ...panelBase,
            border: '1px solid rgba(245,158,11,0.35)',
            background: 'linear-gradient(145deg,rgba(254,243,199,0.85),rgba(255,251,235,0.70))',
            boxShadow: '0 8px 40px rgba(245,158,11,0.12),inset 0 1px 0 rgba(255,255,255,0.95)',
            padding: '28px 32px',
            marginBottom: 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position:'absolute',top:0,left:'10%',right:'10%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)',pointerEvents:'none' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'linear-gradient(135deg,#F59E0B,#FBBF24)',
                boxShadow: '0 4px 14px rgba(245,158,11,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <AlertCircle size={20} color="white" strokeWidth={2.2} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: '#92400E', marginBottom: 6,
                  fontFamily: "var(--font-bricolage),'Bricolage Grotesque',sans-serif",
                }}
              >
                Important Notice
              </div>
              <p style={{ fontSize: 14, color: '#78350F', lineHeight: 1.75, margin: 0, fontFamily: "var(--font-dmsans),'DM Sans',sans-serif" }}>
                elevAItepro is a career intelligence tool, not a recruitment agency, careers counsellor, or regulated adviser. AI outputs are indicative — not professional advice. You remain responsible for your own career decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Section groups */}
        {GROUPS.map((group, gi) => {
          const flatBase = GROUPS.slice(0, gi).reduce((s, g) => s + g.items.length, 0);
          return (
          <div key={group.label}>
            <SectionDivider label={group.label} />
            <div style={{ ...panelBase, padding: 0, overflow: 'hidden' }}>
              {group.items.map((item, idx) => {
                const Icon = item.icon;
                const tok = PALETTE[(flatBase + idx) % PALETTE.length];
                const isLast = idx === group.items.length - 1;
                return (
                  <div
                    key={item.title}
                    style={{
                      padding: '28px 32px',
                      borderBottom: isLast ? 'none' : '1px solid rgba(99,102,241,0.08)',
                      display: 'flex',
                      gap: 20,
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* icon */}
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: 13, flexShrink: 0,
                        background: tok.bg,
                        boxShadow: `0 4px 16px ${tok.shadow}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', overflow: 'hidden',
                      }}
                    >
                      <div style={{ position:'absolute',top:2,left:'10%',right:'10%',height:1,background:'rgba(255,255,255,0.45)',borderRadius:'50%',pointerEvents:'none' }} />
                      <Icon size={20} color="white" strokeWidth={2} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: "var(--font-bricolage),'Bricolage Grotesque',sans-serif",
                          fontSize: 16, fontWeight: 700,
                          color: 'var(--indigo-d,#1A237E)',
                          marginBottom: 8, lineHeight: 1.3,
                        }}
                      >
                        {item.title}
                      </div>
                      <p
                        style={{
                          fontSize: 14, color: '#475569', lineHeight: 1.78, margin: 0,
                          fontFamily: "var(--font-dmsans),'DM Sans',sans-serif",
                        }}
                      >
                        {item.body}
                      </p>

                      {/* GDPR rights list */}
                      {item.rights && (
                        <div style={{ marginTop: 16 }}>
                          <div
                            style={{
                              fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                              color: 'rgba(99,102,241,0.75)', marginBottom: 10,
                              fontFamily: "var(--font-bricolage),'Bricolage Grotesque',sans-serif",
                            }}
                          >
                            Your rights under UK GDPR
                          </div>
                          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {item.rights.map((r) => (
                              <li key={r} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                <div
                                  style={{
                                    width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                                    background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(124,58,237,0.06))',
                                    border: '1px solid rgba(99,102,241,0.18)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  }}
                                >
                                  <CheckCircle size={11} color="#6366F1" strokeWidth={2.5} />
                                </div>
                                <span style={{ fontSize: 13.5, color: '#475569', lineHeight: 1.6, fontFamily: "var(--font-dmsans),'DM Sans',sans-serif" }}>{r}</span>
                              </li>
                            ))}
                          </ul>
                          <p style={{ fontSize: 13, color: '#64748B', marginTop: 14, fontFamily: "var(--font-dmsans),'DM Sans',sans-serif" }}>
                            To exercise any of these rights, contact{' '}
                            <a href="mailto:contact@elevaitepro.co.uk" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 600 }}>contact@elevaitepro.co.uk</a>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}

      </div>

      {/* ── BOTTOM BAND ── */}
      <div
        style={{
          background: 'linear-gradient(155deg,#0c1630 0%,#0f1e3d 40%,#162044 100%)',
          clipPath: 'polygon(0 22%,100% 0,100% 100%,0 100%)',
          padding: '100px 80px 60px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position:'absolute',inset:0,pointerEvents:'none',background:'linear-gradient(160deg,rgba(255,255,255,0.04) 0%,transparent 40%)' }} />
        <div style={{ position:'absolute',top:0,left:'15%',right:'15%',height:1,pointerEvents:'none',background:'linear-gradient(90deg,transparent,rgba(129,140,248,0.25),transparent)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <p
            style={{
              fontFamily: "var(--font-bricolage),'Bricolage Grotesque',sans-serif",
              fontSize: 'clamp(18px,2.2vw,24px)', fontWeight: 700,
              color: 'rgba(255,255,255,0.82)', letterSpacing: '-0.02em',
              lineHeight: 1.45, maxWidth: 560, margin: '0 auto 28px',
              textShadow: '0 1px 8px rgba(0,0,0,0.3)',
            }}
          >
            Questions about these Terms?{' '}
            <strong
              style={{
                background: 'linear-gradient(100deg,#818cf8,#22d3ee)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(0 2px 8px rgba(129,140,248,0.3))',
              }}
            >
             
            </strong>
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 24, marginBottom: 40 }}>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('navigateTo', { detail: { view: 'support' } }));
                setTimeout(() => {
                  const el = document.getElementById('ticket');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                textDecoration: 'none',
                padding: '12px 22px', borderRadius: 14,
                background: 'linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transition: 'transform 0.22s,border-color 0.22s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor='rgba(129,140,248,0.35)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.1)'; }}
            >
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontFamily: "var(--font-bricolage),'Bricolage Grotesque',sans-serif" }}>Email us</span>
              <span style={{ fontSize: 13, color: 'rgba(129,140,248,0.9)', fontFamily: "var(--font-dmsans),'DM Sans',sans-serif", fontWeight: 500 }}>contact@elevaitepro.co.uk</span>
            </button>
          </div>

     
        </div>
      </div>

    </div>
  );
}

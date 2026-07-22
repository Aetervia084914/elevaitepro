'use client';

export default function HowItWorks() {
  return (
    <div className="hiw-wrapper">

      {/* ── HEADER ── */}
      <div className="hiw-header">
        <div className="hiw-header-inner">
          <div className="hiw-h-label">⚡ The elevAIte pro Gap Engine</div>
          <h1 className="hiw-h1">
            How It 
            <em className="hiw-h1-em"> Works</em>
          </h1>
          <p className="hiw-h-sub">From aspiration to action — three intelligent steps.</p>
        </div>
      </div>

      {/* ── STEPS ── */}
      <div className="hiw-steps-section">
        <div className="hiw-steps-grid">

          {/* Step 1 */}
          <div className="hiw-step-col">
            <div className="hiw-step-top">
              <div className="hiw-step-circle hiw-c1">01</div>
              <div className="hiw-step-meta">
                <div className="hiw-meta-tag">Gap Analysis</div>
                <div className="hiw-meta-name">AI Blueprint</div>
              </div>
            </div>
            <span className="hiw-step-emoji">🎯</span>
            <div className="hiw-step-title">Assess Your Ambition</div>
            <p className="hiw-step-body">Tell elevAIte pro your target role, industry, and level. Our AI analyses job market data to build a precise competency blueprint — technical skills, soft skills,AI skills, and behaviours — for where you want to go.</p>
          </div>

          {/* Step 2 */}
          <div className="hiw-step-col">
            <div className="hiw-step-top">
              <div className="hiw-step-circle hiw-c2">02</div>
              <div className="hiw-step-meta">
                <div className="hiw-meta-tag">Precision Learning</div>
                <div className="hiw-meta-name">Self-Assessment</div>
              </div>
            </div>
            <span className="hiw-step-emoji">🔍</span>
            <div className="hiw-step-title">Map Your Gaps</div>
            <p className="hiw-step-body">A structured self-assessment and AI-powered analysis surfaces your competency gaps, soft skill blind spots, AI skill gaps and confidence levels. You see exactly what's missing — not just on paper, but in practice.</p>
          </div>

          {/* Step 3 */}
          <div className="hiw-step-col">
            <div className="hiw-step-top">
              <div className="hiw-step-circle hiw-c3">03</div>
              <div className="hiw-step-meta">
                <div className="hiw-meta-tag">Role Intelligence</div>
                <div className="hiw-meta-name">Targeted Paths</div>
              </div>
            </div>
            <span className="hiw-step-emoji">🚀</span>
            <div className="hiw-step-title">Close Gaps With Purpose</div>
            <p className="hiw-step-body">elevAIte pro recommends targeted courses, projects, and mentors matched to your specific gaps. Every resource has a reason — tied directly to a competency you need to unlock your next role.</p>
          </div>

        </div>
      </div>

      {/* ── BOTTOM BAND ── */}
      <div className="hiw-bottom-band">
        <p className="hiw-bottom-p">Not just a CV tool. A <strong className="hiw-bottom-strong">career intelligence engine</strong> that closes the gap between ambition and reality.</p>
      </div>

    </div>
  );
}

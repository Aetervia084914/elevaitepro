'use client';

export default function Testimonials() {
  return (
    <section className="testi-section">
      <div className="section-label">
        <div className="sl-line"></div>
        <div className="sl-text">Success Stories</div>
        <div className="sl-line r"></div>
      </div>
      <div className="testi-grid">
        <div className="testi-card">
          <div className="testi-stars">
            <span className="ts">★</span><span className="ts">★</span>
            <span className="ts">★</span><span className="ts">★</span><span className="ts">★</span>
          </div>
          <div className="testi-quote">&ldquo;elevAIte pro found me a role I never thought possible. The skill gap analysis was scarily accurate — I went from underqualified to hired at Google in 8 weeks.&rdquo;</div>
          <div className="testi-author">
            <div className="ta-av" style={{ background: 'linear-gradient(135deg,#3949AB,#7986CB)' }}>SK</div>
            <div>
              <div className="ta-name">Sarah K.</div>
              <div className="ta-role">Sr. UX Designer, Google</div>
            </div>
          </div>
        </div>
        <div className="testi-card">
          <div className="testi-stars">
            <span className="ts">★</span><span className="ts">★</span>
            <span className="ts">★</span><span className="ts">★</span><span className="ts">★</span>
          </div>
          <div className="testi-quote">&ldquo;The roadmap was crystal clear. I knew exactly what to learn, in what order, and why. Stripe reached out before I even finished the plan.&rdquo;</div>
          <div className="testi-author">
            <div className="ta-av" style={{ background: 'linear-gradient(135deg,#00ACC1,#00897B)' }}>JL</div>
            <div>
              <div className="ta-name">James L.</div>
              <div className="ta-role">Staff Engineer, Stripe</div>
            </div>
          </div>
        </div>
        <div className="testi-card">
          <div className="testi-stars">
            <span className="ts">★</span><span className="ts">★</span>
            <span className="ts">★</span><span className="ts">★</span><span className="ts">★</span>
          </div>
          <div className="testi-quote">&ldquo;I was switching industries at 34. elevAIte pro mapped my transferable skills and helped me land a PM role at a Series B startup in 6 weeks flat.&rdquo;</div>
          <div className="testi-author">
            <div className="ta-av" style={{ background: 'linear-gradient(135deg,#7C4DFF,#AB47BC)' }}>RP</div>
            <div>
              <div className="ta-name">Ria P.</div>
              <div className="ta-role">Product Manager, Notion</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

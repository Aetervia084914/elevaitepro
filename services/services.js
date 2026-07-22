

// ─── Session-aware headers helper ───
function getSessionHeaders(extra = {}) {
  const sessionId = typeof window !== 'undefined' ? window.localStorage.getItem('sessionId') : null;
  const headers = { 'Content-Type': 'application/json', ...extra };
  if (sessionId) headers['x-session-id'] = sessionId;
  return headers;
}

// ─── Full Analysis ───
export async function getFullAnalysis(cvContent, careerGoal, comparisonCareerGoals, region) {
  try {
    const response = await fetch('/api/getanalysis', {
      method: 'POST',
      headers: getSessionHeaders(),
      body: JSON.stringify({
        cvContent,
        careerGoal,
        comparisonCareerGoals,
        region
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('RESOURCES_EXHAUSTED');
      }
      if (response.status === 503) {
        throw new Error('SERVER_BUSY');
      }
      const errorData = await response.json();
      throw new Error(errorData.error || 'Analysis failed');
    }

    // Prefer the API response body (authoritative and avoids file read race).
    // The API route only returns after finishing the write to lib/response_received.json.
    let rawData = null;
    try {
      rawData = await response.json();
    } catch (e) {
      rawData = null;
    }

    // Fallback to the debug file only if needed.
    if (!rawData || typeof rawData !== 'object') {
      try {
        // IMPORTANT: don't import JSON as a module here.
        // If lib/response_received.json is empty/invalid, Turbopack will fail at build/SSR time.
        const debugRes = await fetch('/response_received.json', { cache: 'no-store' });
        if (debugRes.ok) {
          rawData = await debugRes.json();
        }
      } catch (e) {
        rawData = null;
      }
    }
    
    // Extract the actual data - OpenAI wraps response in { result: {...}, model: "..." }
    const data = rawData?.result || rawData;
    
    // Map data to expected component structure for AnalysisDashboard
    const mappedData = {
      region,
      tabs: {
        // 1. Skills Tab → skillGaps (new structure from updated prompt)
        skillGaps: (data.skillGaps || []).map((sg, i) => ({
          id: `sg-${i + 1}`,
          // accept multiple possible property names from the API: gap, skill, title, name
          title: sg.gap || sg.skill || sg.title || sg.name || "",
          description: sg.description || sg.details || sg.note || "",
          category: sg.category || "Technical",
          priority: sg.priority || "Medium",
          learningPath: sg.learningPath || sg.learning_path || "",
          checked: false,
          progress: 0
        })),

        // 1b. AI Skills Tab → aiSkills (AI/ML/GenAI skills required for the target role)
        aiSkills: (data.aiSkills || []).map((s, i) => ({
          id: `ai-${i + 1}`,
          title: s.skill || s.gap,
          description: s.description,
          category: s.category || "Applied",
          priority: s.priority || "Medium",
          learningPath: s.learningPath,
          checked: false,
          progress: 0
        })),

        // 2. Competencies Tab → missingCompetencies (new structure from updated prompt)
        competencies: (data.missingCompetencies || []).map((comp, i) => ({
          id: `comp-${i + 1}`,
          title: comp.competency,
          description: comp.description,
          importance: comp.importance || "High",
          timeToAcquire: comp.timeToAcquire || "3-6 months",
          resources: comp.resources || [],
          checked: false,
          progress: 0
        })),

        // 3. Certifications Tab → requiredCertifications (new structure from updated prompt)
        certifications: (data.requiredCertifications || []).map((cert, i) => {
          // Safely get certification name with fallback
          const certName = cert.certificationName || cert.certification || 'Unknown Certification';
          const prep = cert.preparationPath || cert.structuredPreparationPath || cert.preparation_path || {};
          const totalPrepDuration =
            prep.totalPreparationDuration ||
            prep.total_preparation_duration ||
            cert.totalPreparationDuration ||
            cert.total_preparation_duration ||
            cert.duration ||
            "3 months";

          const rawLearningSequence = prep.learningSequence || prep.learning_sequence;
          let learningSteps = [];
          if (Array.isArray(rawLearningSequence)) {
            learningSteps = rawLearningSequence;
          } else if (typeof rawLearningSequence === 'string' && rawLearningSequence.trim()) {
            // Try splitting by common delimiters: ->, newlines, numbered items, bullets
            // If none found, split by commas for sentence-style sequences
            const hasDelimiters = /->|\n|\r|\d+\.|\u2022/.test(rawLearningSequence);
            if (hasDelimiters) {
              learningSteps = rawLearningSequence
                .split(/\s*(?:->|\n|\r|\d+\.|•)\s*/)
                .map((s) => s.trim())
                .filter(Boolean);
            } else {
              // Split by commas for sentence-style like "Study X, complete Y, read Z"
              learningSteps = rawLearningSequence
                .split(/,\s+/)
                .map((s) => s.trim())
                .filter(Boolean);
            }
          }

          const handsOnProjects = prep.handsOnProjects || prep.hands_on_projects || [];
          const milestones = prep.milestonesAndOutcomes || prep.milestones_and_outcomes || prep.milestones || [];

          const steps = (learningSteps.length > 0 ? learningSteps : [])
            .map((step, j) => ({
              id: `step-${i + 1}-${j + 1}`,
              stepNumber: j + 1,
              title: step,
              description: `Complete ${step}`,
              duration: "1 month",
              resources: [
                "Official documentation",
                "Practice exams",
                "Hands-on labs"
              ],
              milestones: Array.isArray(handsOnProjects) ? handsOnProjects : Array.isArray(milestones) ? milestones : [],
              completed: false
            }));

          const flowDiagram =
            cert.certificationPathwayRoadmap ||
            cert.certification_pathway_roadmap ||
            cert.certificationPathway ||
            cert.certification_pathway ||
            cert.flowDiagram ||
            "";
          
          return {
            id: `cert-${i + 1}`,
            // UI expects title
            title: certName,
            // keep name for backward compatibility
            name: certName,
            provider: certName.includes("AWS") ? "Amazon Web Services" : 
           certName.includes("Azure") ? "Microsoft" : 
           certName.includes("Microsoft") ? "Microsoft" : 
           certName.includes("Google") ? "Google" : 
           certName.includes("CompTIA") ? "CompTIA" :
           certName.includes("Splunk") ? "Splunk" :
           certName.includes("GIAC") ? "GIAC/SANS" :
           certName.includes("CSA") || certName.includes("EC-Council") ? "EC-Council" :
           certName.includes("CQF") ? "CQF Institute" :
           certName.includes("FRM") ? "GARP" :
           certName.includes("Certificate") ? "Professional Institute" : "Other",
            description: cert.description || `${certName} certification for AI Engineer role`,
            difficulty: cert.difficulty || "Medium",
            duration: totalPrepDuration,
            marketValue: cert.marketValue || "High",
            totalDuration: totalPrepDuration,
            steps,
            flowDiagram,
            hasPathFlow: Boolean(flowDiagram || steps.length),
            preparation: {
              eligibilityPrerequisites: prep.eligibilityPrerequisites || prep.eligibility_prerequisites || "",
              foundationKnowledge: prep.foundationKnowledge || prep.foundation_knowledge || "",
              learningSequence: rawLearningSequence || "",
              handsOnProjects: handsOnProjects,
              examPreparationStrategy: prep.examPreparationStrategy || prep.exam_preparation_strategy || "",
              mockTestsAndRevision: prep.mockTestsAndRevision || prep.mock_tests_and_revision || "",
              examRegistrationAndAttempt: prep.examRegistrationAndAttempt || prep.exam_registration_and_attempt || "",
              postCertificationApplication: prep.postCertificationApplication || prep.post_certification_application || "",
              milestonesAndOutcomes: milestones,
              totalPreparationDuration: totalPrepDuration,
            },
            checked: false,
            progress: 0
          };
        }) || []
      },

      // 4. ATS Matrix Tab → atsScoring (new structure from updated prompt)
      atsScore: {
        overallScore: data.atsScoring?.overallScore || data.atsScoring?.matchScore || data.atsScoring?.currentMatchScore || data.atsScoring?.current_score || 58,
        sectionScores: {
          skills: data.atsScoring?.technicalScore || data.atsScoring?.currentMatchScore || data.atsScoring?.current_score || 58,
          competencies: data.atsScoring?.domainScore || data.atsScoring?.currentMatchScore || data.atsScoring?.current_score || 58,
          certifications: data.atsScoring?.softSkillsScore || data.atsScoring?.currentMatchScore || data.atsScoring?.current_score || 58,
        },
        strengths: Array.isArray(data.atsScoring?.strengths)
          ? data.atsScoring.strengths
          : [],
        gaps: Array.isArray(data.atsScoring?.gaps)
          ? data.atsScoring.gaps
          : [],
        recommendations: Array.isArray(data.atsScoring?.recommendations)
          ? data.atsScoring.recommendations
          : [],
        // Backwards-compatible fallback: derive from freeform feedback when dedicated fields aren't present.
        ...(Array.isArray(data.atsScoring?.feedback) && {
          strengths: (Array.isArray(data.atsScoring?.strengths) && data.atsScoring.strengths.length > 0)
            ? data.atsScoring.strengths
            : data.atsScoring.feedback
                .filter((f) => /strong|good|well|excellent|solid/i.test(String(f)))
                .map((f) => String(f)),
          gaps: (Array.isArray(data.atsScoring?.gaps) && data.atsScoring.gaps.length > 0)
            ? data.atsScoring.gaps
            : data.atsScoring.feedback
                .filter((f) => /lack|missing|no evidence|lacks|no mention|absent/i.test(String(f)))
                .map((f) => String(f)),
          recommendations: (Array.isArray(data.atsScoring?.recommendations) && data.atsScoring.recommendations.length > 0)
            ? data.atsScoring.recommendations
            : data.atsScoring.feedback.map((f) => String(f)),
        }),
      },

        atsResume: {
        headline: `${careerGoal} | ${region}`,
        summary: `Professional with focus on ${(data.skillGaps || []).slice(0, 2).map(s => (s.gap || s.skill || s.title || s.name)).filter(Boolean).join(', ') || 'AI skills'} for ${region} market.`,
        coreSkills: (data.skillGaps || []).map(s => s.gap || s.skill || s.title || s.name).filter(Boolean),
        competencies: (data.missingCompetencies || []).map(c => c.competency),
        certifications: (data.requiredCertifications || []).map(c => c.certificationName || c.certification),
        keywordOptimization: [careerGoal, ...((data.skillGaps || []).slice(0, 4).map(s => (s.gap || s.skill || s.title || s.name)).filter(Boolean))],
      },

      // 6. Timeline Tab → careerRoadmapTimeline
      timelineAnalytics: (() => {
        const cr = data.careerRoadmap || data.careerRoadmapTimeline || {};
        const phaseDefs = [
          { key: 'phase1', label: 'Foundation & Quick Wins', range: '0 – 3 months', months: 3 },
          { key: 'phase2', label: 'Skill Building & Certification', range: '3 – 6 months', months: 3 },
          { key: 'phase3', label: 'Deepening & Specialisation', range: '6 – 12 months', months: 6 },
          { key: 'phase4', label: 'Leadership & Advancement', range: '12 – 18 months', months: 6 },
        ];

        // Handle already-structured phases from careerRoadmap (normalised array form
        // or object form with { timeline, focus, actions } values)
        // Check if cr is an object with phase keys, not just truthy (empty arrays are falsy)
        if (typeof cr === 'object' && Object.keys(cr).some(k => phaseDefs.some(p => p.key === k))) {
          const _coerce = (val) => {
            if (!val) return [];
            if (Array.isArray(val)) return val.filter(Boolean);
            if (typeof val === 'object') {
              const items = val.actions ?? val.milestones ?? val.focus;
              if (Array.isArray(items)) return items.filter(Boolean);
              if (typeof items === 'string' && items.trim())
                return items.split(/[.;]/).map(s => s.trim()).filter(Boolean);
            }
            if (typeof val === 'string' && val.trim())
              return val.split(/[.;]/).map(s => s.trim()).filter(Boolean);
            return [];
          };
          const phases = phaseDefs
            .map(p => ({ ...p, items: _coerce(cr[p.key]) }))
            .filter(p => p.items.length > 0)
            .map(p => ({ phase: p.label, range: p.range, durationMonths: p.months, focus: p.items }));
          const totalDurationMonths = phases.reduce((s, p) => s + p.durationMonths, 0) || 18;
          return {
            totalDurationMonths,
            phases,
            monthlyBreakdown: phases.map(p => ({ month: p.range, focusAreas: p.focus })),
          };
        }

        // Fallback: legacy array or object shapes
        const crt = data.careerRoadmapTimeline;
        if (!crt) return { totalDurationMonths: 18, phases: [], monthlyBreakdown: [] };

        let phases = [];
        // Helper: parse duration string "0-3 months" → number of months
        const _parseDurationMonths = (p) => {
          if (typeof p?.durationMonths === 'number') return p.durationMonths;
          const dur = typeof p?.duration === 'string' ? p.duration : '';
          const m = dur.match(/(\d+)\s*[-–]\s*(\d+)\s*months?/i);
          if (m) return parseInt(m[2]) - parseInt(m[1]);
          const single = dur.match(/(\d+)\s*months?/i);
          if (single) return parseInt(single[1]);
          return 3;
        };
        // Helper: extract action items from a phase object
        // Priority: actions[] > milestones[] > focus (array or string)
        const _extractFocusItems = (p) => {
          const candidate = p?.actions ?? p?.milestones ?? p?.focus ?? [];
          if (Array.isArray(candidate) && candidate.length > 0) return candidate.filter(Boolean);
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.split(/[.;]/).map(f => f.trim()).filter(f => f.length > 0);
          }
          return [];
        };

        if (Array.isArray(crt)) {
          phases = crt.map((p, i) => {
            const phaseLabel = typeof p?.phase === 'string' ? p.phase : `Phase ${i + 1}`;
            return {
              phase: phaseLabel.replace(/Phase \d+:\s*/i, '').trim(),
              range: typeof p?.duration === 'string' ? p.duration : '',
              durationMonths: _parseDurationMonths(p),
              focus: _extractFocusItems(p),
            };
          });
        } else if (typeof crt === 'object') {
          phases = Object.entries(crt).map(([key, value]) => {
            if (value && typeof value === 'object') {
              return {
                phase: key.replace(/phase_?\d+/i, `Phase ${key.replace(/\D/g, '')}`).trim() || key,
                range: typeof value.timeline === 'string' ? value.timeline : typeof value.duration === 'string' ? value.duration : '',
                durationMonths: _parseDurationMonths(value),
                focus: _extractFocusItems(value),
              };
            }
            const text = typeof value === 'string' ? value : '';
            return {
              phase: (text || key).replace(/Months \d+\s*-\s*\d+:\s*/i, '').trim(),
              range: '',
              durationMonths: 3,
              focus: text ? text.split(/[.;]/).map(f => f.trim()).filter(f => f.length > 0) : [],
            };
          });
        }
        const totalDurationMonths = phases.reduce((s, p) => s + p.durationMonths, 0) || 18;
        return {
          totalDurationMonths,
          phases,
          monthlyBreakdown: phases.map(p => ({ month: p.phase, focusAreas: p.focus })),
        };
      })(),

      // 5. Component Analytics Tab → comparison (new structure from updated prompt)
      careerComparison: data.comparison ? [{
        careerGoal: data.comparison.comparisonRole || data.comparison.role || data.comparison.targetRole,
        atsScore: data.atsScoring?.overallScore || data.atsScoring?.current_score || 58,
        totalDurationMonths: parseInt(data.comparison.transitionDuration?.match(/\d+/)?.[0] || data.comparison.transition_duration?.match(/\d+/)?.[0] || 6),
        certificationCount: (data.requiredCertifications || []).length,
        difficultyLevel: data.comparison.difficulty?.split('(')[0]?.trim() || "Medium",
      }] : [],

      // 7. Market Intelligence → marketIntelligence (pass through from OpenAI)
      marketIntelligence: data.marketIntelligence || null,

      adminAnalytics: {
        skillsDemandFrequency: (data.skillGaps || []).map((s, i) => ({ skill: s.gap, count: 90 - i * 5 })),
        topCertifications: (data.requiredCertifications || []).map((c, i) => ({ certification: c.certificationName || c.certification, count: 85 - i * 10 })),
        averageAtsScore: data.atsScoring?.overallScore || data.atsScoring?.current_score || 58,
        averageUpskillingTimeMonths: 12,
      },

      uiHints: {
        enableDrawer: true,
        enablePdfExport: true,
        enableCareerComparison: !!data.comparison,
        adminView: true,
      },
    };

    // Save mappedData to log file for debugging (server-side only)
    if (typeof window === 'undefined') {
      const fs = require('fs').promises;
      const path = require('path');
      
      try {
        // Create logs directory if it doesn't exist
        const logsDir = path.join(process.cwd(), 'log');
        await fs.mkdir(logsDir, { recursive: true });
        
        // Save mappedData to file
        const mappedDataPath = path.join(logsDir, 'mappeddata.txt');
        await fs.writeFile(mappedDataPath, JSON.stringify(mappedData, null, 2), 'utf8');
        console.log('✅ Mapped data saved to log/mappeddata.txt');
      } catch (fileError) {
        console.error('Failed to save mapped data file:', fileError);
      }
    }

    return mappedData;
//=====================================================

  } catch (error) {
    console.error('Analysis service error:', error);
    throw error;
  }
}

export async function generateBestResume({
  cvContent,
  careerGoal,
  region,
  completedSkills = [],
  completedCompetencies = [],
  completedCertifications = [],
  atsScore,
  marketIntelligence,
}) {
  const response = await fetch('/api/generateresume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cvContent,
      careerGoal,
      region,
      completedSkills,
      completedCompetencies,
      completedCertifications,
      atsScore,
      marketIntelligence,
    }),
  });

  if (!response.ok) {
    let details = '';
    try {
      details = await response.text();
    } catch (e) {}
    throw new Error(details || 'Resume generation failed');
  }

  const json = await response.json();
  return json?.result || null;
}

export function getBackendBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL
    || process.env.BACKEND_API_BASE_URL
    || process.env.FASTAPI_BASE_URL
    || 'http://127.0.0.1:8009';
}

export function getFastApiBaseUrl() {
  return process.env.FASTAPI_URL
    || process.env.NEXT_PUBLIC_FASTAPI_BASE_URL
    || process.env.FASTAPI_BASE_URL
    || process.env.NEXT_PUBLIC_DROPDOWN_FASTAPI_BASE_URL
    || 'http://127.0.0.1:8002';
}

export function getFastApiProxyBasePath() {
  return '/api/fastapi';
}

export function getToolNormalizerBaseUrl() {
  return process.env.NEXT_PUBLIC_TOOL_NORMALIZER_API_BASE_URL
    || process.env.FASTAPI_URL
    || process.env.NEXT_PUBLIC_FASTAPI_BASE_URL
    || process.env.FASTAPI_BASE_URL
    || 'http://127.0.0.1:8002';
}

export function getSkillNormalizerBaseUrl() {
  return process.env.NEXT_PUBLIC_SKILL_NORMALIZER_API_BASE_URL
    || process.env.FASTAPI_URL
    || process.env.NEXT_PUBLIC_FASTAPI_BASE_URL
    || process.env.FASTAPI_BASE_URL
    || process.env.NEXT_PUBLIC_TOOL_NORMALIZER_API_BASE_URL
    || 'http://127.0.0.1:8002';
}

export function getDropdownFastApiBaseUrl() {
  return getFastApiProxyBasePath();
}

function normalizeDropdownItems(data) {
  const rawItems = Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.industries)
        ? data.industries
        : Array.isArray(data?.jobtitles)
          ? data.jobtitles
          : Array.isArray(data?.job_titles)
            ? data.job_titles
            : Array.isArray(data?.results)
              ? data.results
              : [];
  return rawItems
    .map((item) => {
      if (typeof item === 'string') return item;
      return item?.value || item?.label || '';
    })
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function normalizeToolNormalizerResponse(data) {
  return {
    tools: Array.isArray(data?.tools)
      ? data.tools.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    normalized_tools: Array.isArray(data?.normalized_tools)
      ? data.normalized_tools.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    matches: Array.isArray(data?.matches) ? data.matches : [],
    rejected: Array.isArray(data?.rejected) ? data.rejected : [],
    unmatched_terms: Array.isArray(data?.unmatched_terms)
      ? data.unmatched_terms.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    ambiguous_terms: Array.isArray(data?.ambiguous_terms)
      ? data.ambiguous_terms.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    noise_terms: Array.isArray(data?.noise_terms)
      ? data.noise_terms.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    debug_matches: Array.isArray(data?.debug_matches) ? data.debug_matches : [],
  };
}

function normalizeSkillNormalizerResponse(data) {
  return {
    results: Array.isArray(data?.results) ? data.results : [],
    normalized_skill_names: Array.isArray(data?.normalized_skill_names)
      ? data.normalized_skill_names.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    normalized_string: String(data?.normalized_string || '').trim(),
    total_input: Number.isFinite(data?.total_input) ? data.total_input : 0,
    total_matched: Number.isFinite(data?.total_matched) ? data.total_matched : 0,
    total_unmatched: Number.isFinite(data?.total_unmatched) ? data.total_unmatched : 0,
  };
}

function normalizeSkillAutoSearchResponse(data) {
  return {
    query: String(data?.query || '').trim(),
    suggestions: Array.isArray(data?.suggestions)
      ? data.suggestions
          .map((item) => ({
            skill_id: String(item?.skill_id || '').trim(),
            skill_name: String(item?.skill_name || '').trim(),
            skill_type: item?.skill_type == null ? null : String(item.skill_type).trim(),
            industry: item?.industry == null ? null : String(item.industry).trim(),
            subcategory: item?.subcategory == null ? null : String(item.subcategory).trim(),
          }))
          .filter((item) => item.skill_name)
      : [],
    total: Number.isFinite(data?.total) ? data.total : 0,
  };
}

function normalizeToolAutoSearchResponse(data) {
  return {
    query: String(data?.query || '').trim(),
    suggestions: Array.isArray(data?.suggestions)
      ? data.suggestions
          .map((item) => ({
            tool_id: String(item?.tool_id || '').trim(),
            display_name: String(item?.display_name || '').trim(),
            canonical_name: String(item?.canonical_name || '').trim(),
            category: item?.category == null ? null : String(item.category).trim(),
            matched_on: String(item?.matched_on || '').trim(),
          }))
          .filter((item) => item.display_name)
      : [],
    total: Number.isFinite(data?.total) ? data.total : 0,
  };
}

export async function normalizePrimaryTools(rawText, signal) {
  const normalizedRawText = String(rawText || '').trim();
  if (!normalizedRawText) {
    return normalizeToolNormalizerResponse({});
  }

  const baseUrl = getFastApiProxyBasePath();
  const endpointCandidates = [
    `${baseUrl}/tool_normalizer/normalize-tools`,
    `${baseUrl}/tool_normalizer/normalize_tools`,
    `${baseUrl}/normalize-tools`,
  ];

  try {
    let lastError = null;

    for (const endpoint of endpointCandidates) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw_text: normalizedRawText }),
        ...(signal ? { signal } : {}),
      });

      if (response.ok) {
        return normalizeToolNormalizerResponse(await response.json());
      }

      if (response.status !== 404) {
        let details = '';
        try {
          details = await response.text();
        } catch (e) {}
        lastError = new Error(details || 'Failed to normalize primary tools');
        break;
      }
    }

    throw lastError || new Error('Failed to normalize primary tools');
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.warn('Primary tool normalization request failed:', error);
    throw error;
  }
}

export async function normalizeCoreSkills(rawText, signal) {
  const normalizedRawText = String(rawText || '').trim();
  if (!normalizedRawText) {
    return normalizeSkillNormalizerResponse({});
  }

  const baseUrl = getFastApiProxyBasePath();

  try {
    const endpoint = `${baseUrl}/skill_normalizer/normalize`;

    const plainTextResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'text/plain',
      },
      body: normalizedRawText,
      ...(signal ? { signal } : {}),
    });

    if (plainTextResponse.ok) {
      return normalizeSkillNormalizerResponse(await plainTextResponse.json());
    }

    if (![415, 422].includes(plainTextResponse.status)) {
      throw new Error('Failed to normalize core skills');
    }

    const jsonResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw_text: normalizedRawText }),
      ...(signal ? { signal } : {}),
    });

    if (!jsonResponse.ok) {
      throw new Error('Failed to normalize core skills');
    }

    return normalizeSkillNormalizerResponse(await jsonResponse.json());
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.warn('Core skill normalization request failed:', error);
    throw error;
  }
}

export async function searchToolSuggestions(query, options = {}, signal) {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) {
    return normalizeToolAutoSearchResponse({});
  }

  const baseUrl = getFastApiProxyBasePath();
  const url = new URL(`${baseUrl}/tool_normalizer/ToolAutoSearch`, window.location.origin);
  url.searchParams.set('query', normalizedQuery);

  const limit = Number.isFinite(options?.limit) ? options.limit : 8;
  url.searchParams.set('limit', String(limit));

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      ...(signal ? { signal } : {}),
    });

    if (!response.ok) {
      throw new Error('Failed to load tool suggestions');
    }

    return normalizeToolAutoSearchResponse(await response.json());
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.warn('Tool suggestion request failed:', error);
    throw error;
  }
}

export async function searchSkillSuggestions(query, options = {}, signal) {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) {
    return normalizeSkillAutoSearchResponse({});
  }

  const baseUrl = getFastApiProxyBasePath();
  const url = new URL(`${baseUrl}/skill_normalizer/SkillAutoSearch`, window.location.origin);
  url.searchParams.set('query', normalizedQuery);

  const normalizedIndustry = String(options?.industry || '').trim();
  if (normalizedIndustry) {
    url.searchParams.set('industry', normalizedIndustry);
  }

  const limit = Number.isFinite(options?.limit) ? options.limit : 8;
  url.searchParams.set('limit', String(limit));

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      ...(signal ? { signal } : {}),
    });

    if (!response.ok) {
      throw new Error('Failed to load skill suggestions');
    }

    return normalizeSkillAutoSearchResponse(await response.json());
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.warn('Skill suggestion request failed:', error);
    throw error;
  }
}

export async function writeSelectedInfo(data, signal) {
  try {
    const response = await fetch('/api/selectedinfo', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data || {}),
      ...(signal ? { signal } : {}),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.warn('[writeSelectedInfo] Endpoint unavailable:', responseData?.error || `Status ${response.status}`);
      // Return success even if endpoint fails - this is optional functionality
      return { success: true, skipped: true };
    }

    return responseData;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    // Gracefully handle failures - don't break app flow
    console.warn('[writeSelectedInfo] Request failed:', error.message);
    return { success: true, skipped: true };
  }
}

export async function getFutureRolePrediction(rawText, location, candidateId, signal) {
  try {
    const response = await fetch(`/api/fastapi/getresume_futureroles`, {
      method: 'POST',
      headers: getSessionHeaders(),
      body: JSON.stringify({ raw_text: rawText, location, candidateId }),
      ...(signal ? { signal } : {}),
    });

    const responseData = await response.json().catch(() => ({}));

    if (!response.ok || !responseData?.success) {
      throw new Error(responseData?.error || 'Failed to get future role prediction');
    }

    return {
      bestFitIndustry: String(responseData?.best_fit_industry || '').trim(),
      possibleJobTitles: Array.isArray(responseData?.possible_job_titles)
        ? responseData.possible_job_titles.map(s => String(s || '').trim()).filter(Boolean)
        : [],
      coreSkills: responseData?.core_skills && typeof responseData.core_skills === 'object'
        ? responseData.core_skills : {},
      toolsAndTechnologies: responseData?.tools_and_technologies && typeof responseData.tools_and_technologies === 'object'
        ? responseData.tools_and_technologies : {},
      education: responseData?.education ?? null,
      certifications: Array.isArray(responseData?.certifications)
        ? responseData.certifications.map(s => String(s || '').trim()).filter(Boolean)
        : [],
      workExperience: responseData?.work_experience ?? null,
      projects: responseData?.projects ?? null,
      inferredSeniority: String(responseData?.inferred_seniority || '').trim(),
      roles: Array.isArray(responseData?.roles)
        ? responseData.roles.map(s => String(s || '').trim()).filter(Boolean)
        : [],
      confidenceScores: responseData?.confidence_scores && typeof responseData.confidence_scores === 'object'
        ? responseData.confidence_scores : {},
      whySuggested: responseData?.why_suggested && typeof responseData.why_suggested === 'object'
        ? responseData.why_suggested : {},
    };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.warn('[getFutureRolePrediction] Request failed:', error);
    throw error;
  }
}

export async function getIndustryHeadlines(industry, signal) {
  const normalizedIndustry = (industry || '').trim();
  if (!normalizedIndustry) return [];
  const baseUrl = getDropdownFastApiBaseUrl();
  try {
    const response = await fetch(
      `${baseUrl}/getJobtitles?industry=${encodeURIComponent(normalizedIndustry)}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        ...(signal ? { signal } : {}),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to load job titles');
    }
    return normalizeDropdownItems(await response.json());
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.warn('Job title request failed:', error);
    throw error;
  }
}

export async function getIndustries(signal) {
  const baseUrl = getDropdownFastApiBaseUrl();
  try {
    const response = await fetch(`${baseUrl}/getIndustries`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) {
      throw new Error('Failed to load industries');
    }
    return normalizeDropdownItems(await response.json());
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.warn('Industry request failed:', error);
    throw error;
  }
}

function buildHeadlineSuggestUrl(query, limit) {
  return `/api/headline?q=${encodeURIComponent(query)}&limit=${limit}`;
}

// Optional endpoint - returns empty suggestions if unavailable
export async function getHeadlineSuggestions(query, limit = 5, signal) {
  const trimmedQuery = (query || '').trim();
  if (!trimmedQuery) {
    return {
      query: '',
      normalized_query: '',
      suggestions: [],
    };
  }

  try {
    const response = await fetch(buildHeadlineSuggestUrl(trimmedQuery, limit), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });

    if (!response.ok) {
      return {
        query: trimmedQuery,
        normalized_query: trimmedQuery.toLowerCase(),
        suggestions: [],
      };
    }

    return await response.json();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw error;
    }
    console.warn('Headline suggestion request failed:', error);
    return {
      query: trimmedQuery,
      normalized_query: trimmedQuery.toLowerCase(),
      suggestions: [],
    };
  }
}

// ─── Summary PDF — calls Next.js /api/generatesummarypdf (Chromium renderer) ───

export async function downloadSummaryPdfFromBackend({
  careerGoal,
  atsScore,
  atsResume,
  requiredSkills = [],
  requiredAiSkills = [],
  requiredCompetencies = [],
  requiredCertifications = [],
}) {
  const payload = {
    career_goal: careerGoal || 'Summary',
    ats_score: atsScore || {},
    ats_resume: atsResume || {},
    required_skills: requiredSkills.map(({ id, title, description, category, priority, importance, learningPath, provider, timeToAcquire, marketValue, difficulty }) =>
      ({ id: id || '', title: title || '', description: description || '', category: category || '', priority: priority || '', importance: importance || '', learningPath: learningPath || '', provider: provider || '', timeToAcquire: timeToAcquire || '', marketValue: marketValue || '', difficulty: difficulty || '' })),
    required_ai_skills: requiredAiSkills.map(({ id, title, description, category, priority, importance, learningPath }) =>
      ({ id: id || '', title: title || '', description: description || '', category: category || '', priority: priority || '', importance: importance || '', learningPath: learningPath || '' })),
    required_competencies: requiredCompetencies.map(({ id, title, description, importance, timeToAcquire }) =>
      ({ id: id || '', title: title || '', description: description || '', importance: importance || '', timeToAcquire: timeToAcquire || '' })),
    required_certifications: requiredCertifications.map(({ id, title, provider, description, difficulty, marketValue }) =>
      ({ id: id || '', title: title || '', provider: provider || '', description: description || '', difficulty: difficulty || '', marketValue: marketValue || '' })),
  };

  const response = await fetch('/api/generatesummarypdf', {
    method: 'POST',
    headers: getSessionHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || `Summary PDF generation failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = String(careerGoal || 'Summary').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Summary';
  a.href = url;
  a.download = `${safeName}_Summary.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Backend resume export — calls /generate-resume (Redis/PG → Playwright PDF / python-docx DOCX) ───

export async function downloadResumeFromBackend({
  format = 'pdf',
  careerGoal = '',
  region = '',
  completedSkills = [],
  completedAiSkills = [],
  completedCompetencies = [],
  completedCertifications = [],
} = {}) {
  const payload = {
    format,
    career_goal: careerGoal,
    region,
    completed_skills: completedSkills,
    completed_ai_skills: completedAiSkills,
    completed_competencies: completedCompetencies,
    completed_certifications: completedCertifications,
  };

  const response = await fetch('/api/fastapi/generate-resume', {
    method: 'POST',
    headers: getSessionHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || `Resume generation failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ext = format === 'docx' ? 'docx' : 'pdf';
  const safeName = String(careerGoal || 'Resume').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Resume';
  a.href = url;
  a.download = `${safeName}_Resume.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Persistent completion tracking — Dashboard Analysis (usercompletedgaps) ───

export async function saveCompletedGap({
  candidateId,
  itemType,
  itemId,
  itemTitle = '',
  targetRole = '',
  region = '',
  isCompleted = true,
} = {}) {
  const response = await fetch('/api/fastapi/save-completed-gap', {
    method: 'POST',
    headers: getSessionHeaders(),
    body: JSON.stringify({
      candidateId,
      itemType,
      itemId,
      itemTitle,
      targetRole,
      region,
      isCompleted,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Failed to save completion (${response.status})`);
  }
  return data;
}

export async function deleteCompletedGap({
  candidateId,
  itemType,
  itemId,
  targetRole = '',
} = {}) {
  const response = await fetch('/api/fastapi/delete-completed-gap', {
    method: 'POST',
    headers: getSessionHeaders(),
    body: JSON.stringify({
      candidateId,
      itemType,
      itemId,
      targetRole,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Failed to delete completion (${response.status})`);
  }
  return data;
}

export async function getCompletedGaps({ candidateId, targetRole = '', region = '' } = {}) {
  const params = new URLSearchParams();
  if (candidateId) params.set('candidateId', candidateId);
  if (targetRole) params.set('targetRole', targetRole);
  if (region) params.set('region', region);
  const qs = params.toString();

  const response = await fetch(`/api/fastapi/get-completed-gaps${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: getSessionHeaders(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || `Failed to load completion (${response.status})`);
  }
  return Array.isArray(data.completed) ? data.completed : [];
}

export async function downloadResumePdfFromPreview({
  resumeData,
  careerGoal = '',
  previewElement = null,
} = {}) {
  const sections = resumeData?.sections || {};
  const contact = resumeData?.contact || {};
  const hasStructuredMain = Boolean(sections.summary || sections.experience?.length);
  const resume = {
    contact: {
      name: contact.name || sections.name || '',
      headline: contact.headline || sections.headline || careerGoal || '',
      email: contact.email || sections.email || '',
      phone: contact.phone || sections.phone || '',
      location: contact.location || sections.location || '',
      linkedin: contact.linkedin || sections.linkedin || '',
      github: contact.github || sections.github || sections.portfolio || '',
      website: contact.website || '',
    },
    summary: sections.summary || (!hasStructuredMain ? resumeData?.fullText || '' : ''),
    coreSkills: Array.isArray(sections.coreSkills) ? sections.coreSkills : [],
    skillCategories: sections.skillCategories && typeof sections.skillCategories === 'object' ? sections.skillCategories : null,
    tools: Array.isArray(sections.tools) ? sections.tools : [],
    toolCategories: sections.toolCategories && typeof sections.toolCategories === 'object' ? sections.toolCategories : null,
    competencies: Array.isArray(sections.competencies) ? sections.competencies : [],
    certifications: Array.isArray(sections.certifications) ? sections.certifications : [],
    experience: Array.isArray(sections.experience) ? sections.experience : [],
    education: Array.isArray(sections.education) ? sections.education : [],
    achievements: Array.isArray(sections.achievements) ? sections.achievements : [],
    projects: Array.isArray(sections.projects) ? sections.projects : [],
  };

  const collectDocumentStyles = () => {
    if (typeof document === 'undefined') return '';

    const css = [];
    Array.from(document.styleSheets || []).forEach((sheet) => {
      try {
        const rules = Array.from(sheet.cssRules || []);
        css.push(rules.map((rule) => rule.cssText).join('\n'));
      } catch (error) {
        if (sheet.href) {
          css.push(`@import url("${sheet.href}");`);
        }
      }
    });
    return css.join('\n');
  };

  const html = previewElement?.outerHTML || '';
  const styles = collectDocumentStyles();
  const filename = resume?.contact?.name || careerGoal || 'Resume';

  const response = await fetch('/api/generateresumepdf', {
    method: 'POST',
    headers: getSessionHeaders(),
    body: JSON.stringify({ html, styles, filename, resume, career_goal: careerGoal }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || `Resume PDF generation failed (${response.status})`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = String(resume?.contact?.name || careerGoal || 'Resume').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Resume';
  a.href = url;
  a.download = `${safeName}_Resume.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Resume preview data — calls /generate-resume-preview (PG cv_upload → sessionactivity) ───

export async function getResumePreviewData({ careerGoal = '', region = '' } = {}) {
  const params = new URLSearchParams();
  if (careerGoal) params.set('career_goal', careerGoal);
  if (region) params.set('region', region);
  const qs = params.toString();
  const url = `${getFastApiProxyBasePath()}/generate-resume-preview${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getSessionHeaders(),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.detail || `Resume preview failed (${response.status})`);
  }

  const json = await response.json();
  if (!json?.success || !json?.data) {
    throw new Error('No resume data available');
  }
  return json.data;
}

// ─── Cache-first role analysis — calls /role-analysis (Redis → PG → session → OpenAI) ───

export async function fetchRoleAnalysisCacheFirst(targetRole, region, careerGoal, forceRefresh = false, whySuggested = '') {
  const response = await fetch('/api/fastapi/role-analysis', {
    method: 'POST',
    headers: getSessionHeaders(),
    body: JSON.stringify({
      target_role: targetRole,
      region: region || 'United Kingdom',
      force_refresh: forceRefresh,
      why_suggested: whySuggested || '',
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.detail || data?.error || 'Cache-first role analysis failed');
  }
  const mapped = data.analysis?.tabs
    ? data.analysis
    : mapRoleAnalysisToMappedData(data.analysis, region, careerGoal);
  mapped._source = data.source;
  return mapped;
}

// ─── GetAnalysis — calls FastAPI /GetAnalysis directly ───────────────────────

export async function getAnalysisFromFastAPI(payload, region, careerGoal) {
  const response = await fetch('/api/fastapi/GetAnalysis', {
    method: 'POST',
    headers: getSessionHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'GetAnalysis failed');
  }
  const roleData = Array.isArray(data.roleAnalyses) ? data.roleAnalyses[0] : null;
  if (!roleData) throw new Error('GetAnalysis returned no role data');
  return mapRoleAnalysisToMappedData(roleData, region, careerGoal);
}

// ─── Precompute Analysis (Redis-cached per-role) ───

export async function precomputeAnalysis(payload) {
  const response = await fetch('/api/precompute-analysis', {
    method: 'POST',
    headers: getSessionHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    const failedDetail = Array.isArray(data?.failedRoles)
      ? data.failedRoles.map(r => `${r.role}: ${r.error}`).join('; ')
      : '';
    const msg = data?.error || 'Precompute analysis failed';
    console.error('[precomputeAnalysis]', msg, failedDetail);
    throw new Error(failedDetail ? `${msg} — ${failedDetail}` : msg);
  }
  return data;
}

export async function fetchCachedRoleAnalysis(role, region, careerGoal) {
  const response = await fetch('/api/fastapi/get-cached-analysis', {
    method: 'POST',
    headers: getSessionHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    throw new Error(data?.error || 'Failed to retrieve cached analysis');
  }
  return mapRoleAnalysisToMappedData(data.roleAnalysis, region, careerGoal);
}

/**
 * Validates if analysis data is complete and has meaningful content
 * Returns false if data is null, undefined, or has blank/empty critical fields
 */
export function isAnalysisDataComplete(analysisData) {
  if (!analysisData || typeof analysisData !== 'object') {
    console.info('[isAnalysisDataComplete] Data is null/undefined or not an object');
    return false;
  }

  // Check if tabs object exists and has content
  const tabs = analysisData?.tabs;
  if (!tabs || typeof tabs !== 'object') {
    console.info('[isAnalysisDataComplete] No tabs object found');
    return false;
  }

  // Check critical tab arrays for meaningful content
  const hasSkillGaps = Array.isArray(tabs.skillGaps) && tabs.skillGaps.length > 0;
  const hasCompetencies = Array.isArray(tabs.competencies) && tabs.competencies.length > 0;
  const hasCertifications = Array.isArray(tabs.certifications) && tabs.certifications.length > 0;
  const hasAtsScore = analysisData?.atsScore?.overallScore !== undefined && analysisData.atsScore.overallScore > 0;

  // Validate individual entries don't have blank titles/descriptions
  const skillGapsValid = hasSkillGaps && tabs.skillGaps.some(sg => sg?.title?.trim() && sg?.description?.trim());
  const competenciesValid = hasCompetencies && tabs.competencies.some(c => c?.title?.trim() && c?.description?.trim());
  const certificationsValid = hasCertifications && tabs.certifications.some(c => c?.title?.trim());

  // Data is complete if it has at least 2 of these key sections with valid content
  const validSections = [skillGapsValid, competenciesValid, certificationsValid, hasAtsScore].filter(Boolean).length;
  const isComplete = validSections >= 2;

  console.info('[isAnalysisDataComplete]', {
    hasSkillGaps,
    hasCompetencies,
    hasCertifications,
    hasAtsScore,
    validSections,
    isComplete,
  });

  return isComplete;
}

export function mapRoleAnalysisToMappedData(roleData, region, careerGoal) {
  const data = roleData || {};

  return {
    region,
    tabs: {
      skillGaps: (data.skillGaps || []).map((sg, i) => ({
        id: `sg-${i + 1}`,
        title: sg.gap || sg.skill || sg.title || sg.name || '',
        description: sg.description || sg.details || sg.note || '',
        category: sg.category || 'Technical',
        priority: sg.priority || 'Medium',
        learningPath: sg.learningPath || sg.learning_path || '',
        checked: false,
        progress: 0,
      })),

      aiSkills: (data.aiSkills || []).map((s, i) => ({
        id: `ai-${i + 1}`,
        title: s.skill || s.gap,
        description: s.description,
        category: s.category || 'Applied',
        priority: s.priority || 'Medium',
        learningPath: s.learningPath,
        checked: false,
        progress: 0,
      })),

      competencies: (data.competencies || []).map((comp, i) => ({
        id: `comp-${i + 1}`,
        title: comp.competency,
        description: comp.description,
        importance: comp.importance || 'High',
        timeToAcquire: comp.timeToAcquire || '3-6 months',
        resources: comp.resources || [],
        checked: false,
        progress: 0,
      })),

      certifications: (data.certifications || []).map((cert, i) => {
        const certName = cert.name || 'Unknown Certification';
        const steps = (cert.steps || []).map((step, j) => ({
          id: `step-${i + 1}-${j + 1}`,
          stepNumber: step.stepNumber || j + 1,
          title: step.title,
          description: step.description,
          duration: step.duration || '1 month',
          resources: step.resources || ['Official documentation', 'Practice exams', 'Hands-on labs'],
          milestones: step.milestones || [],
          completed: false,
        }));

        return {
          id: `cert-${i + 1}`,
          title: certName,
          name: certName,
          provider: cert.provider || 'Other',
          description: cert.description || `${certName} certification`,
          difficulty: cert.difficulty || 'Medium',
          duration: cert.duration || cert.totalDuration || '3 months',
          marketValue: cert.marketValue || 'High',
          totalDuration: cert.totalDuration || cert.duration || '3 months',
          steps,
          flowDiagram: cert.flowDiagram || '',
          hasPathFlow: Boolean(cert.flowDiagram || steps.length),
          preparation: {
            eligibilityPrerequisites: '',
            foundationKnowledge: '',
            learningSequence: '',
            handsOnProjects: [],
            examPreparationStrategy: '',
            mockTestsAndRevision: '',
            examRegistrationAndAttempt: '',
            postCertificationApplication: '',
            milestonesAndOutcomes: [],
            totalPreparationDuration: cert.totalDuration || cert.duration || '3 months',
          },
          checked: false,
          progress: 0,
        };
      }),
    },

    atsScore: {
      overallScore: data.atsScore?.overallScore || 58,
      sectionScores: {
        skills: data.atsScore?.skillsScore || data.atsScore?.overallScore || 58,
        competencies: data.atsScore?.competenciesScore || data.atsScore?.overallScore || 58,
        certifications: data.atsScore?.certificationsScore || data.atsScore?.overallScore || 58,
      },
      strengths: Array.isArray(data.atsScore?.strengths) ? data.atsScore.strengths : [],
      gaps: Array.isArray(data.atsScore?.gaps) ? data.atsScore.gaps : [],
      recommendations: Array.isArray(data.atsScore?.recommendations) ? data.atsScore.recommendations : [],
      keywordRecommendations: Array.isArray(data.atsScore?.keywordRecommendations) ? data.atsScore.keywordRecommendations : [],
    },

    fitSummary: data.fitSummary || null,
    comparisonInfo: data.comparisonInfo || null,
    careerRoadmap: data.careerRoadmap || null,

    atsResume: {
      headline: `${careerGoal} | ${region}`,
      summary: `Professional targeting ${careerGoal} role in the ${region} market.`,
      coreSkills: (data.skillGaps || []).map((s) => s.gap),
      competencies: (data.competencies || []).map((c) => c.competency),
      certifications: (data.certifications || []).map((c) => c.name),
      keywordOptimization: [careerGoal, ...(data.skillGaps || []).slice(0, 4).map((s) => s.gap)],
    },

    timelineAnalytics: (() => {
      // Accept the normalised key (careerRoadmap) or the raw OpenAI key
      // (careerRoadmapTimeline), which reaches us unnormalised from cached entries.
      const cr = data.careerRoadmap || data.careerRoadmapTimeline || {};
      
      // ✅ TIMELINE DEBUG: Log what we received
      console.log('[Timeline Mapping] Raw careerRoadmap from data:', cr);
      console.log('[Timeline Mapping] Data keys:', Object.keys(data));
      
      const phaseDefs = [
        { key: 'phase1', label: 'Foundation & Quick Wins', range: '0 – 3 months', months: 3 },
        { key: 'phase2', label: 'Skill Building & Certification', range: '3 – 6 months', months: 3 },
        { key: 'phase3', label: 'Deepening & Specialisation', range: '6 – 12 months', months: 6 },
        { key: 'phase4', label: 'Leadership & Advancement', range: '12 – 18 months', months: 6 },
      ];
      // Check if cr is an object with phase keys (handle both empty and populated arrays)
      const hasPhaseStructure = typeof cr === 'object' && Object.keys(cr).some(k => phaseDefs.some(p => p.key === k));
      console.log('[Timeline Mapping] Has phase structure:', hasPhaseStructure, 'CR keys:', Object.keys(cr));
      
      // Coerce a phase value (array | { actions|milestones|focus } | string) → string[]
      const _coerce = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.filter(Boolean);
        if (typeof val === 'object') {
          const items = val.actions ?? val.milestones ?? val.focus;
          if (Array.isArray(items)) return items.filter(Boolean);
          if (typeof items === 'string' && items.trim())
            return items.split(/[.;]/).map(s => s.trim()).filter(Boolean);
        }
        if (typeof val === 'string' && val.trim())
          return val.split(/[.;]/).map(s => s.trim()).filter(Boolean);
        return [];
      };
      const phases = phaseDefs
        .map(p => ({ ...p, focus: _coerce(cr[p.key]) }))
        .filter(p => p.focus.length > 0)
        .map(p => ({
          phase: p.label,
          range: p.range,
          durationMonths: p.months,
          focus: p.focus,
        }));
      
      console.log('[Timeline Mapping] Extracted phases:', phases.length, 'phases with', phases.reduce((sum, p) => sum + p.focus.length, 0), 'total actions');
      
      const totalDurationMonths = phases.reduce((s, p) => s + p.durationMonths, 0) || 18;
      const monthlyBreakdown = phases.map(p => ({
        month: p.range,
        focusAreas: p.focus,
      }));
      // Only return timeline if phase structure exists and has populated phases
      if (hasPhaseStructure && phases.length > 0) {
        console.log('[Timeline Mapping] ✅ Returning valid timeline with', phases.length, 'phases');
        return { totalDurationMonths, phases, monthlyBreakdown };
      }
      console.log('[Timeline Mapping] ⚠️ No valid phase structure found, returning empty timeline');
      return { totalDurationMonths: 18, phases: [], monthlyBreakdown: [] };
    })(),

    careerComparison: (data.comparisonMatrix || []).map((item) => ({
      careerGoal: item.role,
      atsScore: item.score || 58,
      totalDurationMonths: item.durationMonths || 6,
      certificationCount: (data.certifications || []).length,
      difficultyLevel: item.difficulty || 'Medium',
    })),

    marketIntelligence: data.marketIntelligence || null,

    adminAnalytics: {
      skillsDemandFrequency: (data.skillGaps || []).map((s, i) => ({ skill: s.gap, count: 90 - i * 5 })),
      topCertifications: (data.certifications || []).map((c, i) => ({ certification: c.name, count: 85 - i * 10 })),
      averageAtsScore: data.atsScore?.overallScore || 58,
      averageUpskillingTimeMonths: 12,
    },

    uiHints: {
      enableDrawer: true,
      enablePdfExport: true,
      enableCareerComparison: (data.comparisonMatrix || []).length > 0,
      adminView: true,
    },
  };
}

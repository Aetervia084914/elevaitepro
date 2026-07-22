"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { PostPaymentBanner } from "./PostPaymentBanner.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs.jsx";
import { Button } from "./ui/button.jsx";
import { Badge } from "./ui/badge.jsx";
import { Card, CardContent } from "./ui/card.jsx";
import Card1 from "./Card1.jsx";
import { SkillGapCard } from "./skill-gap-card.jsx";
import { CompetencyCard } from "./competency-card.jsx";
import CertificationCard from "./certification-card.jsx";
import { CertificationDrawer } from "./certification-drawer.jsx";
import AtsPanel from "./ats-panel.jsx";
import AtsTooltip from "./AtsTooltip.jsx";
import { TimelinePanel } from "./timeline-panel.jsx";
import { ComparisonPanel } from "./comparison-panel.jsx";
import { ProgressCircleCard } from "./progress-circle-card.jsx";
import { getStorage } from "../lib/storageClient.js";
import { generateUpdatedResumePdf, downloadSummaryPdfFromBackend, isAnalysisDataComplete, saveCompletedGap, getCompletedGaps } from "../services/services.js";
import { buildStructuredResume } from "../lib/parseCvSections.js";
import MarketIntelligencePanel from "./MarketIntelligencePanel.jsx";
import { FitSummaryPanel } from "./fit-summary-panel.jsx";
import { ComparisonInfoPanel } from "./comparison-info-panel.jsx";
import { KeywordRecommendationsPanel } from "./keyword-recommendations-panel.jsx";
import { ResumePreview } from "./ResumePreview.jsx";
import Waiting, { ANALYSIS_STEPS } from "./Waiting.jsx";
import {
  Zap,
  Award,
  Gauge,
  Brain,
  Calendar,
  Sparkles,
  BookOpen,
  UploadCloud,
  Briefcase,
  ChevronLeft,
  Target,
  TrendingUp,
  ShieldCheck,
  FileText,
  Download,
  LogOut,
  BarChart3,
  ChevronRight,
  Trophy,
  Layers,
  Globe,
  LineChart,
  X,
  Menu,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { downloadResumePdfFromElement } from "../lib/resumePdfExport.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.jsx";
// Map a positional item id (sg-1, ai-1, comp-1, cert-1) to its stored item_type.
function itemTypeFor(id) {
  const s = String(id || '');
  if (s.startsWith('sg-')) return 'SkillGap';
  if (s.startsWith('ai-')) return 'AISkill';
  if (s.startsWith('comp-')) return 'Competency';
  if (s.startsWith('cert-')) return 'Certification';
  return '';
}

export function AnalysisDashboard({ data, careerGoal, onBack, onExit, onOpenPayment, userProfile, selectedPlan, cvText, selectedInfo, selectedLocation, bannerStage = 'RESULTS', creditsRemaining = 0, candidateId = null }) {
    const [isMarketIntelOpen, setIsMarketIntelOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isResumeGenerating, setIsResumeGenerating] = useState(false);
  const [resumePreviewData, setResumePreviewData] = useState(null);
  const [isResumePreviewOpen, setIsResumePreviewOpen] = useState(false);
  const [isSummaryDownloading, setIsSummaryDownloading] = useState(false);
  const [currentCreditsRemaining, setCurrentCreditsRemaining] = useState(creditsRemaining);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [alternativeRoles, setAlternativeRoles] = useState([]);
  const [analyzingRole, setAnalyzingRole] = useState(null);
  const [isAnalyzingAlt, setIsAnalyzingAlt] = useState(false);
  const [isWaitingForAnalysis, setIsWaitingForAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [currentAnalyzedRole, setCurrentAnalyzedRole] = useState(careerGoal);
  const summaryContentRef = useRef(null);
  
  // State to hold the current analysis data (updates when role changes)
  const [currentAnalysisData, setCurrentAnalysisData] = useState(data);

  if (!data) return null;

  const { atsScore, tabs, atsResume, region } = currentAnalysisData;
  const selectedIndustryDomain = String(selectedInfo?.industryDomain || '').trim();
  const selectedPrimaryTools = Array.isArray(selectedInfo?.primaryTools)
    ? selectedInfo.primaryTools.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const selectedJobTitles = Array.isArray(selectedInfo?.currentJobTitle)
    ? selectedInfo.currentJobTitle.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const selectedJobLevel = String(selectedInfo?.jobLevel || '').trim();
  const selectedDesiredRole = String(currentAnalyzedRole || selectedInfo?.desiredRole || careerGoal || '').trim();
  const [plan, setPlan] = useState(selectedPlan || "Starter");
  const [analysisDone, setAnalysisDone] = useState(false);
  const [learningPercentState, setLearningPercentState] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const storageData = await getStorage();
        if (storageData) {
          setAnalysisDone(Boolean(storageData.analysisCompleted));
          setPlan(selectedPlan || storageData.plan || (typeof window !== 'undefined' ? (localStorage.getItem('plan') || 'Starter') : 'Starter'));
          return;
        }
      } catch (e) {}
      try {
        const ac = localStorage.getItem('analysisCompleted') === 'true';
        const storedPlan = selectedPlan || localStorage.getItem('plan') || 'Starter';
        setAnalysisDone(ac);
        setPlan(storedPlan);
      } catch (e) {}
    })();
  }, []);
  
  // ✅ Update currentAnalysisData when data prop changes
  useEffect(() => {
    if (data) {
      setCurrentAnalysisData(data);
    }
  }, [data]);

  // Fetch current credits from userjourney table
  useEffect(() => {
    if (!candidateId) return;

    const fetchCredits = async () => {
      try {
        const res = await fetch(`/api/fastapi/get-journey?candidateId=${encodeURIComponent(candidateId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.journey?.credits_remaining !== undefined) {
            setCurrentCreditsRemaining(data.journey.credits_remaining);
          }
        }
      } catch (err) {
        console.error('[AnalysisDashboard] Error fetching journey credits:', err);
        // Fallback to prop value on error
      }
    };

    fetchCredits();
  }, [candidateId]);

  // Fetch alternative roles from roleanalysis table
  useEffect(() => {
    if (!candidateId) return;

    const fetchRoles = async () => {
      try {
        const res = await fetch(`/api/fastapi/get-candidate-roles?candidateId=${encodeURIComponent(candidateId)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.roles)) {
            // Filter out the currently analyzed role
            const filtered = data.roles.filter(
              (role) => String(role.target_role || '').trim().toLowerCase() !== String(currentAnalyzedRole || '').trim().toLowerCase()
            );
            setAlternativeRoles(filtered);
          }
        }
      } catch (err) {
        console.error('[AnalysisDashboard] Error fetching alternative roles:', err);
      }
    };

    fetchRoles();
  }, [candidateId, currentAnalyzedRole]);

  // Handle getting analysis for an alternative role
  const handleGetAnalysisForRole = useCallback(async (roleData) => {
    if (!roleData || !roleData.target_role || isAnalyzingAlt) return;

    const targetRole = String(roleData.target_role || '').trim();
    const roleRegion = String(roleData.region || selectedLocation || '').trim();
    const whySuggested = String(roleData.why_suggested || '').trim();

    setAnalyzingRole(targetRole);
    setIsAnalyzingAlt(true);
    setIsWaitingForAnalysis(true);
    setAnalysisError('');

    try {
      // Use cache-first approach similar to hero.jsx
      const { fetchRoleAnalysisCacheFirst, getAnalysisFromFastAPI, isAnalysisDataComplete: validateAnalysis } = await import('../services/services.js');
      
      let result = null;

      // Tier 1: Check useranalysis table for previously saved analyses
      try {
        const cachedAnalysisRes = await fetch('/api/fastapi/get-cached-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId,
            targetRole,
            region: roleRegion,
          }),
        }).then(r => r.json());

        if (cachedAnalysisRes.success && cachedAnalysisRes.cached && cachedAnalysisRes.data) {
          // ✅ TIMELINE FIX: Ensure cached data has tabs structure (mapped format)
          // If it has tabs.skillGaps, it's already mapped; otherwise it's raw OpenAI format
          const isMappedFormat = cachedAnalysisRes.data?.tabs?.skillGaps !== undefined;
          
          console.log('[GetAnalysisAlt] Tier 1 data format check:', {
            isMapped: isMappedFormat,
            hasTimeline: !!cachedAnalysisRes.data?.timelineAnalytics,
            hasCareerRoadmap: !!cachedAnalysisRes.data?.careerRoadmap,
            dataKeys: Object.keys(cachedAnalysisRes.data || {}).slice(0, 10)
          });
          
          // Validate that cached data is complete
          if (validateAnalysis(cachedAnalysisRes.data)) {
            result = cachedAnalysisRes.data;
            console.log('[GetAnalysisAlt] Tier 1 (useranalysis table) hit with valid data from', cachedAnalysisRes.metadata?.createdAt);
          } else {
            console.info('[GetAnalysisAlt] Tier 1 (useranalysis table) hit but data is incomplete/blank — continuing to Tier 2');
          }
        }
      } catch (tier1Err) {
        console.info('[GetAnalysisAlt] Tier 1 check failed, continuing to Tier 2:', tier1Err?.message);
      }

      // Tier 2: Try cache-first (Redis → PG → session)
      if (!result || !result.tabs || !validateAnalysis(result)) {
        try {
          result = await fetchRoleAnalysisCacheFirst(targetRole, roleRegion, targetRole, false, whySuggested);
          // Validate Redis/cache data
          if (validateAnalysis(result)) {
            console.log('[GetAnalysisAlt] Tier 2 (cache-first) hit with valid data — source:', result?._source);
          } else {
            console.info('[GetAnalysisAlt] Tier 2 (cache-first) hit but data is incomplete/blank — continuing to Tier 3');
            result = null;
          }
        } catch (cacheMiss) {
          console.info('[GetAnalysisAlt] Tier 2 miss, continuing to Tier 3 (FastAPI):', cacheMiss?.message);
        }
      }

      // Tier 3: Fallback to FastAPI if cache misses or data is incomplete
      if (!result || !result.tabs || !validateAnalysis(result)) {
        console.info('[GetAnalysisAlt] Calling Tier 3 (FastAPI GetAnalysis)');
        // Fallback to FastAPI if cache miss or incomplete data
        const analysisPayload = {
          yearsOfExperience: selectedInfo?.jobLevel || '',
          industry: selectedInfo?.industryDomain || '',
          currentRoles: selectedInfo?.currentJobTitle?.join(', ') || '',
          tools: Array.isArray(selectedInfo?.primaryTools) ? selectedInfo.primaryTools.join(', ') : '',
          certifications: '',
          skills: '',
          suggestedFutureRoles: [{
            role: targetRole,
            whySuggested: whySuggested,
          }],
          region: roleRegion,
          comparisonCareerGoals: [],
        };
        result = await getAnalysisFromFastAPI(analysisPayload, roleRegion, targetRole);
        console.log('[GetAnalysisAlt] Tier 3 (FastAPI) success');
      }

      if (!result || !result.tabs) {
        throw new Error('Analysis response has invalid structure — missing tabs');
      }

      // Update all tab states with new analysis data
      setSkillGaps(result.tabs?.skillGaps || []);
      setAiSkills(result.tabs?.aiSkills || []);
      setCompetencies(result.tabs?.competencies || []);
      setCertifications(result.tabs?.certifications || []);
      setCurrentAnalyzedRole(targetRole);
      
      // ✅ UPDATE: Set current analysis data to refresh market intelligence and summary
      setCurrentAnalysisData(result);
      
      // ✅ TIMELINE DEBUG: Log timeline data extraction
      console.log('[Timeline Debug] Raw result.timelineAnalytics:', result?.timelineAnalytics);
      console.log('[Timeline Debug] Timeline phases count:', result?.timelineAnalytics?.phases?.length || 0);
      console.log('[Timeline Debug] Timeline total months:', result?.timelineAnalytics?.totalDurationMonths || 0);

      // Scroll to top
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Close sidebar
      setIsSidebarOpen(false);

      // Save analysis to database for future retrieval
      if (candidateId && targetRole) {
        fetch('/api/fastapi/save-api-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId,
            targetRole,
            region: roleRegion,
            analysis: result,
            whySuggested: whySuggested || `Analysis for ${targetRole} role transition`,
            triggeredFrom: 'sidebar',
          }),
        })
          .then(r => r.json())
          .then(r => {
            if (r?.success) {
              console.log('[GetAnalysisAlt] Analysis saved to database');
            } else {
              console.warn('[GetAnalysisAlt] Failed to save analysis:', r?.error);
            }
          })
          .catch(err => console.warn('[GetAnalysisAlt] Error saving analysis:', err));
      }

      // Return the new analysis data
      return { success: true, data: result, targetRole };
    } catch (err) {
      console.error('[GetAnalysisAlt] Failed:', err);
      setAnalysisError(err?.message || 'Analysis failed');
      return { success: false, error: err?.message || 'Analysis failed' };
    } finally {
      setAnalyzingRole(null);
      setIsAnalyzingAlt(false);
      setIsWaitingForAnalysis(false);
    }
  }, [candidateId, selectedInfo, selectedLocation, isAnalyzingAlt]);

  const [skillGaps, setSkillGaps] = useState(data?.tabs?.skillGaps || []);
  const [aiSkills, setAiSkills] = useState(data?.tabs?.aiSkills || []);
  const [competencies, setCompetencies] = useState(data?.tabs?.competencies || []);
  const [certifications, setCertifications] = useState(data?.tabs?.certifications || []);
  const [drawerCert, setDrawerCert] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("skills");

  // Shared toggle handler: optimistic UI update, persist to DB, revert on failure.
  const handleItemToggle = useCallback((list, setList, id) => {
    const item = (list || []).find((x) => x.id === id);
    if (!item) return;
    const nextChecked = !item.checked;

    // 1. Optimistic UI update
    setList((prev) => prev.map((x) => x.id === id ? { ...x, checked: nextChecked } : x));

    // 2. Persist (no-op if we can't identify the owner or item type)
    if (!candidateId) return;
    const itemType = itemTypeFor(id);
    if (!itemType) return;

    saveCompletedGap({
      candidateId,
      itemType,
      itemId: id,
      itemTitle: item.title || item.name || '',
      targetRole: currentAnalyzedRole || careerGoal || '',
      region: selectedLocation || region || '',
      isCompleted: nextChecked,
    }).catch((err) => {
      // 3. Revert on failure so UI and DB stay consistent
      console.error('[AnalysisDashboard] Failed to persist completion, reverting:', err);
      setList((prev) => prev.map((x) => x.id === id ? { ...x, checked: !nextChecked } : x));
    });
  }, [candidateId, currentAnalyzedRole, careerGoal, selectedLocation, region]);

  const toggleSkillGap = useCallback(
    (id) => handleItemToggle(skillGaps, setSkillGaps, id),
    [handleItemToggle, skillGaps]
  );
  const toggleAiSkill = useCallback(
    (id) => handleItemToggle(aiSkills, setAiSkills, id),
    [handleItemToggle, aiSkills]
  );
  const toggleCompetency = useCallback(
    (id) => handleItemToggle(competencies, setCompetencies, id),
    [handleItemToggle, competencies]
  );
  const toggleCertification = useCallback(
    (id) => handleItemToggle(certifications, setCertifications, id),
    [handleItemToggle, certifications]
  );

  // Load persisted completion state from DB and pre-check matching items.
  // Runs on mount and whenever the analysed role changes (role switching
  // re-populates the item arrays with checked=false, which we then restore).
  useEffect(() => {
    if (!candidateId) return;
    let cancelled = false;
    (async () => {
      try {
        const completed = await getCompletedGaps({
          candidateId,
          targetRole: currentAnalyzedRole || careerGoal || '',
          region: selectedLocation || region || '',
        });
        if (cancelled || !Array.isArray(completed) || completed.length === 0) return;
        const done = new Set(completed.map((c) => `${c.itemType}:${c.itemId}`));
        const applyChecked = (listItem) => {
          const t = itemTypeFor(listItem.id);
          return done.has(`${t}:${listItem.id}`) ? { ...listItem, checked: true } : listItem;
        };
        setSkillGaps((prev) => (prev || []).map(applyChecked));
        setAiSkills((prev) => (prev || []).map(applyChecked));
        setCompetencies((prev) => (prev || []).map(applyChecked));
        setCertifications((prev) => (prev || []).map(applyChecked));
      } catch (err) {
        console.error('[AnalysisDashboard] Failed to load completion state:', err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidateId, currentAnalyzedRole]);

  const checkedSkills = (skillGaps || []).filter((s) => s.checked).length;
  const checkedAiSkills = (aiSkills || []).filter((s) => s.checked).length;
  const checkedComps = (competencies || []).filter((c) => c.checked).length;
  const checkedCerts = (certifications || []).filter((c) => c.checked).length;
  const totalItems = (skillGaps?.length || 0) + (aiSkills?.length || 0) + (competencies?.length || 0) + (certifications?.length || 0);
  const totalChecked = checkedSkills + checkedAiSkills + checkedComps + checkedCerts;
  const skillProgress = (skillGaps?.length || 0) > 0 ? Math.round((checkedSkills / skillGaps.length) * 100) : 0;
  const aiProgress = (aiSkills?.length || 0) > 0 ? Math.round((checkedAiSkills / aiSkills.length) * 100) : 0;
  const compProgress = (competencies?.length || 0) > 0 ? Math.round((checkedComps / competencies.length) * 100) : 0;
  const certProgress = (certifications?.length || 0) > 0 ? Math.round((checkedCerts / certifications.length) * 100) : 0;

  const handleDownloadSummary = useCallback(async () => {
    if (isSummaryDownloading) return;
    setIsSummaryDownloading(true);
    try {
      await downloadSummaryPdfFromBackend({
        careerGoal,
        atsScore: currentAnalysisData?.atsScore,
        atsResume: currentAnalysisData?.atsResume,
        requiredSkills:        (skillGaps        || []).filter((s) => !s.checked),
        requiredAiSkills:      (aiSkills          || []).filter((s) => !s.checked),
        requiredCompetencies:  (competencies      || []).filter((c) => !c.checked),
        requiredCertifications:(certifications    || []).filter((c) => !c.checked),
      });
    } catch (err) {
      console.error('[Summary PDF] backend generation failed:', err);
    } finally {
      setIsSummaryDownloading(false);
    }
  }, [careerGoal, data, skillGaps, aiSkills, competencies, certifications, isSummaryDownloading]);

  useEffect(() => {
    const percent = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;
    setLearningPercentState(percent);
  }, [totalChecked, totalItems]);
async function handleGenerateCv() {
  if (isResumeGenerating) return;
  setIsResumeGenerating(true);
  try {
    const completedSkills = (skillGaps || []).filter((s) => s.checked).map((s) => ({
      title: s.title || s.gap || s.name,
      category: s.category || 'Technical'
    })).filter((s) => s.title);
    const completedAiSkills = (aiSkills || []).filter((s) => s.checked).map((s) => s.title || s.skill || s.name).filter(Boolean);
    const completedCompetencies = (competencies || []).filter((c) => c.checked).map((c) => c.title || c.competency || c.name).filter(Boolean);
    const completedCertifications = (certifications || []).filter((c) => c.checked).map((c) => c.title || c.name || c.certification).filter(Boolean);

    // Deterministic ATS Score Update
    const baseAts = currentAnalysisData?.atsScore?.overallScore || 0;
    const skillBonus = Math.min(completedSkills.length * 2, 12);
    const aiSkillBonus = Math.min(completedAiSkills.length * 2, 10);
    const compBonus = Math.min(completedCompetencies.length * 1.5, 9);
    const certBonus = Math.min(completedCertifications.length * 3, 12);
    const updatedAtsScore = Math.min(Math.round(baseAts + skillBonus + aiSkillBonus + compBonus + certBonus), 95);

    // ── Read structured resume data from backend preview endpoint ──
    let backendResume = null;
    try {
      const { getResumePreviewData } = await import('../services/services.js');
      backendResume = await getResumePreviewData({ careerGoal, region: selectedLocation });
      console.log('[handleGenerateCv] Loaded resume data from backend preview endpoint');
    } catch (previewErr) {
      console.warn('[handleGenerateCv] Backend preview read failed, using fallback:', previewErr.message);
    }

    let structured;
    if (backendResume) {
      structured = {
        ...backendResume,
        coreSkills: [
          ...(backendResume.coreSkills || []),
          ...completedSkills.filter((s) => !(backendResume.coreSkills || []).includes(s)),
        ],
        aiSkills: [
          ...(backendResume.aiSkills || []),
          ...completedAiSkills.filter((s) => !(backendResume.aiSkills || []).includes(s)),
        ],
        competencies: [
          ...(backendResume.competencies || []),
          ...completedCompetencies.filter((c) => !(backendResume.competencies || []).includes(c)),
        ],
        certifications: [
          ...(backendResume.certifications || []),
          ...completedCertifications.filter((c) => !(backendResume.certifications || []).includes(c)),
        ],
      };
    } else {
      // Legacy path: try Redis cache, then minimal local state
      const sessionId = typeof window !== 'undefined' ? window.localStorage.getItem('sessionId') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (sessionId) headers['x-session-id'] = sessionId;
      let cached = null;
      try {
        const cacheRes = await fetch('/api/getCachedResume', { method: 'GET', headers });
        if (cacheRes.ok) {
          const cacheJson = await cacheRes.json();
          if (cacheJson?.success && cacheJson?.data) {
            cached = cacheJson.data;
            console.log('[handleGenerateCv] Loaded resume data from Redis cache');
          }
        }
      } catch (cacheErr) {
        console.warn('[handleGenerateCv] Redis cache read failed:', cacheErr.message);
      }

      if (cached) {
        structured = buildStructuredResume(cached, {
          userProfile,
          careerGoal,
          selectedLocation,
          selectedInfo,
          completedSkills,
          completedAiSkills,
          completedCompetencies,
          completedCertifications,
        });
      } else {
        structured = {
          contact: {
            name: userProfile?.name || '',
            headline: userProfile?.headline || careerGoal || '',
            email: userProfile?.email || '',
            phone: userProfile?.phone || '',
            location: userProfile?.location || selectedLocation || '',
            linkedin: '',
            github: '',
          },
          summary: '',
          coreSkills: completedSkills,
          aiSkills: completedAiSkills,
          skillCategories: null,
          tools: Array.isArray(selectedInfo?.primaryTools) ? selectedInfo.primaryTools : [],
          competencies: completedCompetencies,
          certifications: completedCertifications,
          experience: [],
          education: [],
          projects: [],
        };
      }
    }

    const resumeForPreview = {
      fullText: backendResume?.rawText || cvText || '',
      updatedAtsScore,
      skillsAdded: completedSkills,
      aiSkillsAdded: completedAiSkills,
      competenciesAdded: completedCompetencies,
      certificationsAdded: completedCertifications,
      validationPassed: true,
      contact: structured.contact,
      dbData: backendResume?.dbData || null,  // ← Add dbData from backend
      sections: {
        headline: structured.contact.headline || careerGoal || '',
        summary: structured.summary,
        coreSkills: structured.coreSkills,
        aiSkills: structured.aiSkills,
        skillCategories: structured.skillCategories,
        toolCategories: structured.toolCategories || null,
        tools: structured.tools,
        experience: structured.experience,
        achievements: [],
        certifications: structured.certifications,
        competencies: structured.competencies,
        education: structured.education,
        projects: structured.projects,
      },
    };
    setResumePreviewData(resumeForPreview);
    setIsResumePreviewOpen(true);
  } catch (e) {
    console.error("Resume preview failed:", e);
  } finally {
    setIsResumeGenerating(false);
  }
}
  function handleLogout() {
    // Clear user session and navigate using onExit callback
    if (typeof window !== 'undefined') {
      try {
        // Clear any stored session data
        localStorage.removeItem('sessionId');
        localStorage.removeItem('career_app_storage');
        localStorage.removeItem('analysisCompleted');
      } catch (e) {
        // localStorage might not be available in some contexts
      }
    }
    
    // Call the onExit callback to navigate to onboarding/home
    if (typeof onExit === 'function') {
      onExit();
    } else if (typeof window !== 'undefined') {
      // Fallback: set hash for hash-based routing
      window.location.hash = '#onboarding';
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden selection:bg-indigo-500 selection:text-white bg-gradient-to-br from-white via-sky-50/60 to-indigo-50/40">
   
      <Dialog open={isResumeGenerating}>
        <DialogContent className="sm:max-w-[440px] rounded-2xl border border-white bg-white/95 backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.12)]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5 text-slate-800">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                <FileText className="h-4 w-4 text-white" />
              </div>
              Generating your CV
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              Please wait while we create an ATS-optimized CV using AI.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-3 text-sm text-slate-500 bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/50">
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse" />
            Waiting for AI response...
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Resume Preview Modal ===== */}
      {isResumePreviewOpen && resumePreviewData && (
        <ResumePreview
          resumeData={resumePreviewData}
          careerGoal={careerGoal}
          onClose={() => setIsResumePreviewOpen(false)}
        />
      )}

      {/* ===== Analysis Waiting Modal ===== */}
      <Waiting
        isOpen={isWaitingForAnalysis}
        title="Analyzing Role"
        subtitle={`Generating analysis for ${analyzingRole || 'your target role'}...`}
        steps={ANALYSIS_STEPS}
        footerMessage="This may take a few minutes..."
      />

      <AnimatePresence>
        {isMarketIntelOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/10 backdrop-blur-sm overflow-y-auto"
            style={{ zIndex: 110 }}
          >
            <div className="relative w-full max-w-4xl mx-auto my-8 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.12)] bg-white/95 backdrop-blur-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white">
              <MarketIntelligencePanel role={currentAnalyzedRole} marketIntelligence={currentAnalysisData?.marketIntelligence} onClose={() => setIsMarketIntelOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed top-[-10%] left-[-8%] w-[700px] h-[700px] bg-gradient-to-br from-purple-200/30 via-cyan-200/20 to-pink-200/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-8%] w-[700px] h-[700px] bg-gradient-to-tr from-blue-200/25 via-indigo-200/20 to-purple-200/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-sky-200/15 to-violet-200/15 blur-[160px] rounded-full pointer-events-none" />

      <header className="sticky top-0 z-50 px-3 md:px-6 pt-3">
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-3 md:p-4 flex items-center justify-between gap-3 bg-white/80 backdrop-blur-2xl border border-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative overflow-hidden">
          {/* Subtle top gradient accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

          {/* Logo + Title */}
          <div className="flex items-center gap-3 relative z-10 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_4px_16px_rgba(99,102,241,0.3)] flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-slate-800 tracking-tight leading-none whitespace-nowrap">
              Dashboard{" "}
              <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">Manager</span>
            </h1>
          </div>

          {/* Location + Desired Role pills */}
          <div className="hidden lg:flex items-center gap-2 relative z-10 flex-1 justify-center flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500/90 to-indigo-600/90 backdrop-blur-sm border border-indigo-300/40 shadow-[0_2px_8px_rgba(99,102,241,0.25)] flex items-center gap-1.5 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none rounded-xl" />
              <Globe className="w-3.5 h-3.5 text-indigo-100 relative z-10" />
              <span className="text-[12px] font-medium tracking-tight text-indigo-100 relative z-10">
                Location: <span className="text-white font-semibold">{selectedLocation || region || 'Global'}</span>
              </span>
            </div>
            {selectedDesiredRole && (
              <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500/90 to-emerald-600/90 backdrop-blur-sm border border-teal-300/30 shadow-[0_2px_8px_rgba(20,184,166,0.25)] flex items-center gap-2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none rounded-xl" />
                <span className="text-[12px] font-medium tracking-tight text-teal-100 relative z-10">
                  Desired Role: <span className="text-white font-semibold">{selectedDesiredRole}</span>
                </span>
              </div>
            )}
          </div>

          {/* Exit button */}
          <div className="flex items-center gap-2 relative z-10 flex-shrink-0">
            <Button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              size="sm"
              variant="outline"
              className="bg-white/80 hover:bg-white text-indigo-600 hover:text-indigo-700 border-indigo-400/60 hover:border-indigo-500 shadow-[0_2px_8px_rgba(99,102,241,0.15)] font-semibold rounded-xl h-10 px-4 text-[12px] tracking-tight transition-all duration-300 backdrop-blur-sm"
            >
              <Menu className="w-4 h-4 mr-2" />
             Compare Other Roles
            </Button>
            <Button
              onClick={handleLogout}
              size="sm"
              variant="outline"
              className="bg-white/80 hover:bg-white text-rose-600 hover:text-rose-700 border-rose-400/60 hover:border-rose-500 shadow-[0_2px_8px_rgba(239,68,68,0.15)] font-semibold rounded-xl h-10 px-4 text-[12px] tracking-tight transition-all duration-300 backdrop-blur-sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Exit
            </Button>
          </div>
        </motion.div>
        {isMarketIntelOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/10 backdrop-blur-sm">
            <div className="bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.12)] max-w-2xl w-full p-6 relative border border-white">
              <button onClick={() => setIsMarketIntelOpen(false)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xl font-bold transition-colors">×</button>
              <MarketIntelligencePanel role={currentAnalyzedRole} marketIntelligence={currentAnalysisData?.marketIntelligence} onClose={() => setIsMarketIntelOpen(false)} />
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-7xl px-4 md:px-8 py-4">
        <PostPaymentBanner
          currentStage={bannerStage}
          creditsRemaining={currentCreditsRemaining}
          onCreditsClick={onOpenPayment}
          onStageClick={(stage) => {
            if (stage === 'RESULTS') {
              onOpenPayment?.();
            }
          }}
        />
      </div>

      {/* ===== COLLAPSIBLE SIDEBAR ===== */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] bg-black/20 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ x: -600 }}
        animate={{ x: isSidebarOpen ? 0 : -600 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed left-0 top-0 h-screen w-[600px] z-[95] bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-r border-slate-200 shadow-2xl overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Other Roles</h3>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-[1px] bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

          {/* Content */}
          <div className="space-y-4">
            {alternativeRoles && alternativeRoles.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-600 px-2">
                  {alternativeRoles.length} alternative role{alternativeRoles.length !== 1 ? 's' : ''} found
                </p>
                {alternativeRoles.map((role, idx) => (
                  <div
                    key={`${role.target_role}-${role.region}-${idx}`}
                    className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/60 hover:border-indigo-300 hover:shadow-md transition-all cursor-default group"
                  >
                    <div className="flex items-start gap-2 mb-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors line-clamp-2">
                          {role.target_role || 'Unknown Role'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {role.region || 'Global'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Why Suggested Section */}
                    {role.why_suggested && (
                      <div className="mb-3 p-2.5 rounded-lg bg-white/70 border border-indigo-100/50 max-h-96 overflow-y-auto">
                        <p className="text-[10.5px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Why Suggested</p>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {role.why_suggested}
                        </p>
                      </div>
                    )}
                    
                    {/* Get Analysis Button */}
                    <Button
                      onClick={async () => {
                        await handleGetAnalysisForRole(role);
                      }}
                      disabled={isAnalyzingAlt}
                      size="sm"
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold rounded-lg h-9 text-[12px] transition-all duration-300 shadow-[0_4px_12px_rgba(99,102,241,0.25)] border-none"
                    >
                      {analyzingRole === role.target_role && isAnalyzingAlt ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3 mr-1" />
                          Get Analysis
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-sm font-medium text-slate-600">No alternative roles</p>
                <p className="text-xs text-slate-400 mt-2">
                  Currently viewing the primary role analysis
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ===== YOUR NEXT STEPS ===== */}
      <div className="mx-auto max-w-7xl px-4 md:px-8 pt-3 pb-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          className="rounded-3xl relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(238,242,255,0.80) 50%, rgba(245,240,255,0.80) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.9)",
            boxShadow: "0 8px 40px rgba(99,102,241,0.10), 0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-transparent pointer-events-none rounded-3xl" />
          <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-3xl bg-gradient-to-r from-indigo-500 via-purple-500 via-fuchsia-500 to-rose-400 pointer-events-none" />

          <div className="relative z-10 px-5 pt-4 pb-4">
            <p className="text-[11px] font-black tracking-[0.18em] uppercase mb-3"
              style={{
                background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}>
              Your Next Steps
            </p>

            <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
              {[
                {
                  num: 1,
                  title: "Review your skill gaps",
                  desc: "Competence, Soft Skills & AI Skills — see exactly what's holding you back",
                  icon: Layers,
                  badge: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%)",
                  badgeShadow: "rgba(99,102,241,0.45)",
                  cardBg: "linear-gradient(135deg, rgba(238,242,255,0.95) 0%, rgba(245,243,255,0.90) 100%)",
                  cardBorder: "rgba(165,180,252,0.50)",
                  cardShadow: "0 4px 20px rgba(99,102,241,0.12)",
                },
                {
                  num: 2,
                  title: "Check certifications",
                  desc: "The fastest courses to close each gap",
                  icon: Award,
                  badge: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 60%, #c026d3 100%)",
                  badgeShadow: "rgba(139,92,246,0.45)",
                  cardBg: "linear-gradient(135deg, rgba(245,243,255,0.90) 0%, rgba(250,240,255,0.85) 100%)",
                  cardBorder: "rgba(196,181,253,0.45)",
                  cardShadow: "0 4px 20px rgba(139,92,246,0.10)",
                },
                {
                  num: 3,
                  title: "Try another role",
                  desc: "Compare your fit for up to 3 roles, free",
                  icon: TrendingUp,
                  badge: "linear-gradient(135deg, #06b6d4 0%, #6366f1 60%, #8b5cf6 100%)",
                  badgeShadow: "rgba(6,182,212,0.45)",
                  cardBg: "linear-gradient(135deg, rgba(236,254,255,0.90) 0%, rgba(238,242,255,0.85) 100%)",
                  cardBorder: "rgba(165,243,252,0.50)",
                  cardShadow: "0 4px 20px rgba(6,182,212,0.10)",
                },
                {
                  num: 4,
                  title: "Get your results",
                  desc: "Summary, Intelligence Report & your optimised CV",
                  icon: Sparkles,
                  badge: "linear-gradient(135deg, #f43f5e 0%, #ec4899 50%, #a855f7 100%)",
                  badgeShadow: "rgba(244,63,94,0.45)",
                  cardBg: "linear-gradient(135deg, rgba(255,241,245,0.90) 0%, rgba(253,242,255,0.85) 100%)",
                  cardBorder: "rgba(253,164,175,0.45)",
                  cardShadow: "0 4px 20px rgba(244,63,94,0.10)",
                },
              ].map((step, idx, arr) => {
                const Icon = step.icon;
                return (
                  <div key={step.num} className="flex items-center gap-3 flex-1 min-w-0">
                    <motion.div
                      whileHover={{ y: -3, scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 320, damping: 22 }}
                      className="flex-1 min-w-0 rounded-2xl px-4 py-3.5 flex items-center gap-3.5 relative overflow-hidden cursor-default"
                      style={{
                        background: step.cardBg,
                        border: `1px solid ${step.cardBorder}`,
                        boxShadow: `${step.cardShadow}, inset 0 1px 0 rgba(255,255,255,0.85)`,
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-white/55 to-transparent pointer-events-none rounded-2xl" />
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative z-10"
                        style={{
                          background: step.badge,
                          boxShadow: `0 4px 14px ${step.badgeShadow}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                        }}
                      >
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
                        <span className="text-[13px] font-black text-white relative z-10 leading-none">{step.num}</span>
                      </div>
                      <div className="relative z-10 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: "#6366f1", opacity: 0.8 }} />
                          <p className="text-[12px] font-bold tracking-tight text-slate-800 leading-tight truncate">{step.title}</p>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 leading-snug line-clamp-2">{step.desc}</p>
                      </div>
                    </motion.div>
                    {idx < arr.length - 1 && (
                      <ChevronRight className="w-4 h-4 shrink-0 text-slate-300" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      <div className="mx-auto max-w-7xl px-4 md:px-8 py-6">
        <div className="flex items-center justify-between gap-6 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <motion.div whileHover={{ y: -1, scale: 1.02 }} className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/70 backdrop-blur-xl border border-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all ${analysisDone || learningPercentState > 0 ? 'opacity-100' : 'opacity-40 grayscale'}`}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-50 to-fuchsia-50 flex items-center justify-center border border-purple-100 shadow-sm">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-[13px] font-bold tracking-tight text-slate-700">Learning {learningPercentState}%</span>
            </motion.div>

            <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/70 backdrop-blur-xl border border-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-500 ${totalChecked === totalItems && totalItems > 0 ? 'opacity-100 cursor-pointer' : 'opacity-40 grayscale cursor-not-allowed'}`}>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all border shadow-sm ${totalChecked === totalItems && totalItems > 0 ? 'bg-gradient-to-br from-emerald-400 to-teal-400 border-emerald-300 shadow-[0_4px_12px_rgba(16,185,129,0.25)]' : 'bg-slate-50 border-slate-200'}`}>
                <Briefcase className={`h-5 w-5 transition-colors ${totalChecked === totalItems && totalItems > 0 ? 'text-white' : 'text-slate-400'}`} />
              </div>
              <span className={`text-[13px] font-bold tracking-tight transition-colors ${totalChecked === totalItems && totalItems > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>Ready</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-start md:justify-end">
            <Button onClick={() => setIsSummaryOpen(true)} size="sm" className="bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl h-12 px-6 text-[14px] tracking-tight transition-all duration-300 shadow-[0_8px_18px_rgba(15,23,42,0.18)] border-none min-w-[136px]">
              <Gauge className="w-5 h-5 mr-2" />
              Summary
            </Button>
            <Button onClick={() => setIsMarketIntelOpen(true)} size="sm" className="bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-2xl h-12 px-6 text-[14px] tracking-tight transition-all duration-300 shadow-[0_8px_18px_rgba(251,191,36,0.32)] border-none min-w-[148px]">
              <LineChart className="w-5 h-5 mr-2" />
              Intelligence
            </Button>
            <Button onClick={handleGenerateCv} disabled={isResumeGenerating} size="sm" className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold rounded-2xl h-12 px-6 text-[14px] tracking-tight transition-all duration-300 shadow-[0_8px_20px_rgba(99,102,241,0.32)] border-none min-w-[136px]">
              <FileText className="w-5 h-5 mr-2" />
              {isResumeGenerating ? "Generating..." : "CV"}
            </Button>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 md:px-8 pb-12 flex flex-col lg:flex-row gap-6">
        <div className="flex flex-col gap-4 w-full lg:w-56">
          <div className="p-2">
            <ProgressCircleCard label="Skills" percent={skillProgress} checked={checkedSkills} total={skillGaps?.length || 0} color="indigo" icon={<Zap className="text-indigo-500" />}  />
          </div>
          <div className="p-2">
            <ProgressCircleCard label="AI Skills" percent={aiProgress} checked={checkedAiSkills} total={aiSkills?.length || 0} color="purple" icon={<Sparkles className="text-purple-500" />} />
          </div>
          <div className="p-2">
            <ProgressCircleCard label="Competence" percent={compProgress} checked={checkedComps} total={competencies?.length || 0} color="teal" icon={<Brain className="text-amber-500" />} />
          </div>
          <div className="p-2">
            <ProgressCircleCard label="Certifications" percent={certProgress} checked={checkedCerts} total={certifications?.length || 0} color="orange" icon={<Award className="text-purple-500" />} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              // { title: 'ATS match', value: data?.atsScore?.overallScore || 0, unit: '%', icon: Gauge, gradient: 'from-indigo-500 to-blue-500', bg: 'bg-gradient-to-br from-indigo-50 to-blue-50', border: 'border-indigo-100', color: 'text-indigo-600', hasTooltip: true },
              { title: 'Skill gaps', value: skillGaps?.length || 0, unit: '', icon: Zap, gradient: 'from-emerald-400 to-teal-400', bg: 'bg-gradient-to-br from-emerald-50 to-teal-50', border: 'border-emerald-100', color: 'text-emerald-600' },
              { title: 'AI Skills Gaps', value: aiSkills?.length || 0, unit: '', icon: Sparkles, gradient: 'from-purple-400 to-pink-400', bg: 'bg-gradient-to-br from-purple-50 to-pink-50', border: 'border-purple-100', color: 'text-purple-600' },
              { title: 'Competencies', value: competencies?.length || 0, unit: '', icon: Brain, gradient: 'from-amber-400 to-orange-400', bg: 'bg-gradient-to-br from-amber-50 to-orange-50', border: 'border-amber-100', color: 'text-amber-600' },
              { title: 'Certifications', value: certifications?.length || 0, unit: '', icon: Award, gradient: 'from-purple-500 to-pink-500', bg: 'bg-gradient-to-br from-purple-50 to-pink-50', border: 'border-purple-100', color: 'text-purple-600' },
            ].map((metric, idx) => {
              const Icon = metric.icon;
              return (
                <motion.div key={idx} whileHover={{ y: -3, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className={`rounded-2xl p-4 border ${metric.border} ${metric.bg} backdrop-blur-xl flex items-center gap-3.5 relative overflow-hidden group shadow-[0_4px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.10)] transition-shadow duration-300`}>
                  {/* Glossy shine overlay */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${metric.gradient} flex items-center justify-center shrink-0 shadow-md relative z-10`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="relative z-10 min-w-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{metric.value}</span>
                      <span className={`text-[13px] font-semibold tracking-tight ${metric.color}`}>{metric.unit}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <p className="text-sm font-medium tracking-tight text-slate-500 truncate leading-none">{metric.title}</p>
                      {metric.hasTooltip && <AtsTooltip />}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white/80 backdrop-blur-xl p-1 rounded-2xl border border-slate-100 mb-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-nowrap overflow-x-auto no-scrollbar gap-1">
              {[
                { value: "skills", label: "Skills Gaps", icon: Zap },
                { value: "aiSkills", label: "AI Skills Gaps", icon: Sparkles },
                { value: "competencies", label: "Missing Competencies", icon: Brain },
                { value: "certifications", label: "Required Certifications", icon: Award },
                { value: "timeline", label: "Timelines", icon: Calendar },
                { value: "fit", label: "Role Fit", icon: Target },
                { value: "keywords", label: "ATS Keywords", icon: TrendingUp },
                // { value: "comparison", label: "Logic", icon: BarChart3, condition: currentAnalysisData?.uiHints?.enableCareerComparison },
              ].filter(t => t.condition !== false).map((tab) => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-shrink-0 flex items-center gap-1 px-3 py-2.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(99,102,241,0.25)] rounded-xl transition-all duration-300 text-[11px] font-semibold tracking-tight text-slate-500 hover:text-indigo-500 hover:bg-indigo-50/50 whitespace-nowrap min-w-max">
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <TabsContent value="skills" className="mt-0 outline-none">
                <div className="rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-4 space-y-3">
                  {(skillGaps || []).map((gap) => <SkillGapCard key={gap.id} item={gap} onToggle={toggleSkillGap} />)}
                </div>
              </TabsContent>
              <TabsContent value="aiSkills" className="mt-0 outline-none">
                <div className="rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-4 space-y-3">
                  {(aiSkills || []).length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No AI-specific skills returned for this role.
                    </div>
                  ) : (
                    (aiSkills || []).map((item) => <SkillGapCard key={item.id} item={item} onToggle={toggleAiSkill} />)
                  )}
                </div>
              </TabsContent>
              <TabsContent value="competencies" className="mt-0 outline-none">
                <div className="rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-4 space-y-3">
                  {(competencies || []).map((comp) => <CompetencyCard key={comp.id} item={comp} onToggle={toggleCompetency} />)}
                </div>
              </TabsContent>
              <TabsContent value="certifications" className="mt-0 outline-none">
                <div className="rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-4 space-y-3">
                  {(certifications || []).map((cert) => <CertificationCard key={cert.id} item={cert} onToggle={toggleCertification} />)}
                </div>
              </TabsContent>
              <TabsContent value="timeline" className="mt-0 outline-none">
                <div className="rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-4">
                  <TimelinePanel timeline={currentAnalysisData?.timelineAnalytics} />
                </div>
              </TabsContent>
              <TabsContent value="fit" className="mt-0 outline-none">
                <div className="rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-4">
                  <FitSummaryPanel fitSummary={currentAnalysisData?.fitSummary} completionPercent={learningPercentState} />
                </div>
              </TabsContent>
              <TabsContent value="keywords" className="mt-0 outline-none">
                <div className="rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-4">
                  <KeywordRecommendationsPanel
                    keywords={data?.atsScore?.keywordRecommendations || []}
                    strengths={data?.atsScore?.strengths || []}
                    gaps={data?.atsScore?.gaps || []}
                  />
                </div>
              </TabsContent>
              <TabsContent value="comparison" className="mt-0 outline-none">
                <div className="rounded-2xl border border-slate-100 bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.05)] p-4">
                  <ComparisonPanel items={currentAnalysisData?.careerComparison || []} />
                </div>
              </TabsContent>
            </motion.div>
          </Tabs>


        </div>
      </main>

      <CertificationDrawer cert={drawerCert} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <AnimatePresence>
        {isSummaryOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/10 backdrop-blur-sm overflow-y-auto"
            style={{ zIndex: 120 }}
          >
            <div className="relative w-full max-w-4xl mx-auto my-8 rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.12)] overflow-hidden max-h-[90vh] flex flex-col border border-white">
              <div className="absolute inset-0 bg-white" />
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/40" />
              <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-200/20 to-purple-200/20 blur-3xl" />
              <div className="absolute -bottom-24 left-24 w-96 h-96 rounded-full bg-gradient-to-br from-purple-200/20 to-pink-200/20 blur-3xl" />

              {/* Gradient accent bar at top */}
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-10" />

              <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white/90 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_4px_12px_rgba(99,102,241,0.3)]">
                    <Gauge className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold tracking-tight text-slate-800">Summary</h2>
                    <p className="text-[11px] font-medium tracking-tight text-slate-400">CV readiness overview</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={handleDownloadSummary}
                    disabled={isSummaryDownloading}
                    size="sm"
                    className="h-9 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-[12px] tracking-tight shadow-[0_4px_12px_rgba(99,102,241,0.3)] hover:shadow-[0_6px_16px_rgba(99,102,241,0.4)] transition-all duration-300 border-none gap-1.5 disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isSummaryDownloading ? 'Downloading…' : 'Download'}
                  </Button>
                  <button onClick={() => setIsSummaryOpen(false)} className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div ref={summaryContentRef} className="relative p-6 overflow-y-auto bg-white/80 backdrop-blur-xl">
                <AtsPanel
                  atsScore={currentAnalysisData?.atsScore}
                  atsResume={currentAnalysisData?.atsResume}
                  selectedRole={String(careerGoal || '').trim()}
                  requiredSkills={(skillGaps || []).filter((s) => !s.checked)}
                  requiredAiSkills={(aiSkills || []).filter((s) => !s.checked)}
                  requiredCompetencies={(competencies || []).filter((c) => !c.checked)}
                  requiredCertifications={(certifications || []).filter((c) => !c.checked)}
                  hideScore
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Sparkles, ChevronLeft, ChevronDown, Zap, Activity, Target, Globe, Plus, X, FileText, Heart, GraduationCap, Pen, Loader2, Cpu, Network, GraduationCap as UniIcon, TrendingUp, Brain, Briefcase, MapPin, Upload, User, Compass, Lock, Shield, Lightbulb, Edit3, CheckCircle, BarChart2, LogOut, AlertCircle, Database, Layers, AppWindow, Server, Cloud, Wrench, Package, Terminal, BarChart } from 'lucide-react';
import { Button } from './ui/button.jsx';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.jsx";
import { Input } from "./ui/input.jsx";
import { Label } from "./ui/label.jsx";
import { Textarea } from "./ui/textarea.jsx";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group.jsx";
import { ProfessionalHeadlineAutocomplete } from './ProfessionalHeadlineAutocomplete.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./ui/select.jsx";
import { Badge } from "./ui/badge.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog.jsx";

import { getStorage, setFlag } from '../lib/storageClient.js';
import { AnalysisDashboard } from "./analysis-dashboard.jsx";
import Waiting, { ANALYSIS_STEPS } from './Waiting.jsx';
import { FutureRolesLoadingModal } from './FutureRolesLoadingModal.jsx';
import { PostPaymentBanner } from './PostPaymentBanner.jsx';
import { getFullAnalysis, getIndustryHeadlines, normalizePrimaryTools, normalizeCoreSkills, searchToolSuggestions, searchSkillSuggestions, writeSelectedInfo, precomputeAnalysis, fetchCachedRoleAnalysis, getFutureRolePrediction, getAnalysisFromFastAPI, fetchRoleAnalysisCacheFirst, mapRoleAnalysisToMappedData, isAnalysisDataComplete } from '../services/services.js';
import Card1 from './Card1.jsx';
import { cn } from '../lib/utils.js';

const REGIONS = ["UK", "Ireland","USA"];
const JOBLEVEL=[
  "Intern",
  "Trainee",
  "Entry Level",
  "Junior",
  "Associate",
  "Mid-Level",
  "Professional",
  "Senior",
  "Lead",
  "Principal",
  "Manager",
  "Senior Manager",
  "Director",
  "Senior Director",
  "Head",
  "Vice President",
  "Senior Vice President",
  "Executive Vice President",
  "C-Level"
]

export function Hero({ onBack, onLogout, onStartAnalysis, onOpenPayment, targetRole, selectedPlan, verificationMessage, userData, preloadedAnalysis = null, topupError, onClearTopupError }) {
  const [industries, setIndustries] = useState([]);
  const [agreed, setAgreed] = useState(false);

  const [cvContent, setCvContent] = useState("");
  const [activeTab, setActiveTab] = useState('cv');

  // Resume upload state
  const [cvUploading, setCvUploading] = useState(false);
  const [cvUploadError, setCvUploadError] = useState("");
  const [cvParsed, setCvParsed] = useState(false);
  const [cvWorkExperience, setCvWorkExperience] = useState("");
  const [cvWorkExpEditing, setCvWorkExpEditing] = useState(false);
  const [cvEducation, setCvEducation] = useState("");
  const [cvEduEditing, setCvEduEditing] = useState(false);
  const [cvYearsOfExperience, setCvYearsOfExperience] = useState("");
  const [cvTools, setCvTools] = useState("");
  const [cvSkills, setCvSkills] = useState("");
  const [cvCertifications, setCvCertifications] = useState("");
  const [cvBestIndustry, setCvBestIndustry] = useState("");
  const [cvCurrentRoles, setCvCurrentRoles] = useState("");
  const [cvLocation, setCvLocation] = useState(preloadedAnalysis?.region || "");
  const [locationOptions, setLocationOptions] = useState([]);
  const [cvWarnings, setCvWarnings] = useState([]);
  const [cvApiResponses, setCvApiResponses] = useState({ uploadResume: null, skillExtract: null });
  const [cvToolInput, setCvToolInput] = useState('');
  const [cvSkillInput, setCvSkillInput] = useState('');
  const [cvCertInput, setCvCertInput] = useState('');
  // Categorized tools state — dynamic from API categories
  const [cvCategorizedTools, setCvCategorizedTools] = useState({});   // { category_key: [tool_names] }
  const [cvToolCategories, setCvToolCategories] = useState([]);       // ordered category keys
  // CV future roles — from OpenAI via futureroles.txt
  const [cvFutureRoles, setCvFutureRoles] = useState([]);             // all_plausible_future_roles
  const [cvSelectedFutureRole, setCvSelectedFutureRole] = useState('');    // single selected role (radio)
  const [cvInferredSeniority, setCvInferredSeniority] = useState('');
  const [cvConfidenceScores, setCvConfidenceScores] = useState({});
  const [cvWhySuggested, setCvWhySuggested] = useState({});
  const [cvFutureRolesLoading, setCvFutureRolesLoading] = useState(false);
  const [cvFutureRolesError, setCvFutureRolesError] = useState('');
  const [cvAnalysisPrecomputing, setCvAnalysisPrecomputing] = useState(false);
  const [cvAnalysisPrecomputed, setCvAnalysisPrecomputed] = useState(false);
  const [cvPrecomputeError, setCvPrecomputeError] = useState('');
  const [careerGoal, setCareerGoal] = useState(preloadedAnalysis?.targetRole || targetRole || "");
  const [region, setRegion] = useState("Global");
  const [isLoading, setIsLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState(preloadedAnalysis?.analysis || null);

  useEffect(() => {
    if (analysisData) {
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [analysisData]);

  const [errorModal, setErrorModal] = useState({
    isOpen: false,
    type: '',
    title: '',
    message: ''
  });
  const userJourney = userData?.userJourney || userData?.user_journey || userData?.journey || {};
  const journeyCurrentStage =
    userJourney.currentStage ||
    userJourney.current_stage ||
    userData?.currentStage ||
    userData?.current_stage ||
    'UPLOAD_CV';
  const [bannerStage, setBannerStage] = useState(journeyCurrentStage);
  const journeyCreditsRaw =
    userJourney.creditsRemaining ??
    userJourney.credits_remaining ??
    userData?.creditsRemaining ??
    userData?.credits_remaining ??
    1;
  const initialCredits = Number.isFinite(Number(journeyCreditsRaw))
    ? Number(journeyCreditsRaw)
    : 1;
  const [journeyCreditsRemaining, setJourneyCreditsRemaining] = useState(initialCredits);

  // Derived: journey is fully complete — CV already uploaded and analysis done
  const journeyComplete = bannerStage === 'RESULTS' && journeyCreditsRemaining <= 0;

  // =============================
  // NoCV Mode - Manual Resume Form State
  // =============================
  const [manualResume, setManualResume] = useState({
    name: "",
    email: "",
    phone: "",
    headline: "",
    headlineCanonical: "",
    headlineIndustry: "",
    headlineScore: null,
    headlineSourceDataset: "",
    headlineAlias: "",
    currentJobTitle: [],
    yearsOfExperience: "",
    industryDomain: "",
    primaryTools: [],
    skills: [],
    workExperience: "",
    education: "",
    certifications: "",
    achievements: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [formTouched, setFormTouched] = useState({});
  const [manualSubmitAttempted, setManualSubmitAttempted] = useState(false);
  const [primaryToolInput, setPrimaryToolInput] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [normalizedPrimaryTools, setNormalizedPrimaryTools] = useState([]);
  const [normalizedPrimaryToolsLoading, setNormalizedPrimaryToolsLoading] = useState(false);
  const [normalizedPrimaryToolsError, setNormalizedPrimaryToolsError] = useState("");
  const [normalizedPrimaryToolsSource, setNormalizedPrimaryToolsSource] = useState("");
  const [toolSuggestions, setToolSuggestions] = useState([]);
  const [toolSuggestionsLoading, setToolSuggestionsLoading] = useState(false);
  const [toolSuggestionsError, setToolSuggestionsError] = useState("");
  const [normalizedCoreSkills, setNormalizedCoreSkills] = useState([]);
  const [normalizedCoreSkillsLoading, setNormalizedCoreSkillsLoading] = useState(false);
  const [normalizedCoreSkillsError, setNormalizedCoreSkillsError] = useState("");
  const [normalizedCoreSkillsSource, setNormalizedCoreSkillsSource] = useState("");
  const [skillSuggestions, setSkillSuggestions] = useState([]);
  const [skillSuggestionsLoading, setSkillSuggestionsLoading] = useState(false);
  const [skillSuggestionsError, setSkillSuggestionsError] = useState("");
  const [futureRoleOptions, setFutureRoleOptions] = useState([]);
  const [futureRoleWhySuggested, setFutureRoleWhySuggested] = useState({});
  const [futureRoleSuggestionsError, setFutureRoleSuggestionsError] = useState("");
  const [isSavingSelectedInfo, setIsSavingSelectedInfo] = useState(false);
  const [isAutoFetchingFutureRoles, setIsAutoFetchingFutureRoles] = useState(false);
  const [industriesLoading, setIndustriesLoading] = useState(true);
  const [industriesError, setIndustriesError] = useState("");
  const [jobTitles, setJobTitles] = useState([]);
  const [jobTitlesLoading, setJobTitlesLoading] = useState(false);
  const [jobTitlesError, setJobTitlesError] = useState("");
  const [jobTitleMenuOpen, setJobTitleMenuOpen] = useState(false);
  const [jobTitleSearch, setJobTitleSearch] = useState("");
  const jobTitleMenuRef = useRef(null);
  const hasAutoFetchedFutureRoles = useRef(false);
  const lastAutoFetchedFutureRolesKey = useRef("");
  const canvasRef = useRef(null);
  const beamsRef = useRef(null);

  function normalizeTagEntries(items) {
    return Array.isArray(items)
      ? items.map((item) => String(item || '').trim()).filter(Boolean)
      : [];
  }

  function buildNormalizationKey(items) {
    return normalizeTagEntries(items).join(', ');
  }

  // Convert decimal years to "X years and Y months" format
  function formatYearsAndMonths(decimalYears) {
    if (!decimalYears || isNaN(decimalYears)) return '—';
    
    const years = Math.floor(decimalYears);
    const monthsDecimal = (decimalYears - years) * 12;
    const months = Math.round(monthsDecimal);
    
    if (years === 0 && months === 0) return '< 1 month';
    if (years === 0) return `${months} month${months !== 1 ? 's' : ''}`;
    if (months === 0) return `${years} year${years !== 1 ? 's' : ''}`;
    
    return `${years} year${years !== 1 ? 's' : ''} and ${months} month${months !== 1 ? 's' : ''}`;
  }

  // Build a set of items already shown in categorized tool sections so Skills doesn't repeat them
  const categorizedToolSet = useMemo(() => {
    const set = new Set();
    for (const tools of Object.values(cvCategorizedTools)) {
      for (const t of tools) {
        if (t) set.add(t.toLowerCase());
      }
    }
    return set;
  }, [cvCategorizedTools]);

  const filteredCvSkills = useMemo(() => {
    return cvSkills.split(',').map(s => s.trim()).filter(Boolean).filter(s => !categorizedToolSet.has(s.toLowerCase()));
  }, [cvSkills, categorizedToolSet]);

  // DISABLED: getFutureRole useEffect — future roles are now populated by the unified
  // getFutureRolePrediction call during CV upload (see handleCvFileChange).
  // The old separate call to getFutureRole is no longer needed.
  useEffect(() => {
    if (!cvParsed) return;
    // Future roles already populated during upload — just finalize uploading state
    setCvUploading(false);
  }, [cvParsed]);

  // NOTE: GetAnalysis is no longer auto-triggered after getFutureRole.
  // It is invoked on demand from the "Get Analysis" button for the SELECTED role only.
  // When the user picks a different future role, the previous role's analysis cache
  // is cleared before re-running, so Redis only ever holds the currently selected role.

  // When the user changes the selected future role, drop the precomputed flag
  // so the "Get Analysis" button reflects that a fresh analysis run is needed.
  useEffect(() => {
    setCvAnalysisPrecomputed(false);
    setCvPrecomputeError('');
  }, [cvSelectedFutureRole]);

  const normalizedPrimaryToolEntries = useMemo(() => normalizeTagEntries(normalizedPrimaryTools), [normalizedPrimaryTools]);
  const normalizedCoreSkillEntries = useMemo(() => normalizeTagEntries(normalizedCoreSkills), [normalizedCoreSkills]);
  const normalizedPrimaryToolsRequestKey = useMemo(() => buildNormalizationKey(manualResume.primaryTools), [manualResume.primaryTools]);
  const normalizedCoreSkillsRequestKey = useMemo(() => buildNormalizationKey(manualResume.skills), [manualResume.skills]);
  const filteredToolSuggestions = useMemo(() => {
    const selectedToolSet = new Set(normalizeTagEntries(manualResume.primaryTools).map((item) => item.toLowerCase()));
    return toolSuggestions.filter((item) => {
      const normalizedName = String(item?.display_name || '').trim().toLowerCase();
      return normalizedName && !selectedToolSet.has(normalizedName);
    });
  }, [manualResume.primaryTools, toolSuggestions]);
  const filteredSkillSuggestions = useMemo(() => {
    const selectedSkillSet = new Set(normalizeTagEntries(manualResume.skills).map((item) => item.toLowerCase()));
    return skillSuggestions.filter((item) => {
      const normalizedName = String(item?.skill_name || '').trim().toLowerCase();
      return normalizedName && !selectedSkillSet.has(normalizedName);
    });
  }, [manualResume.skills, skillSuggestions]);
  const availableTargetRoles = useMemo(() => {
    const seen = new Set();

    return futureRoleOptions
      .map((item) => String(item || '').trim())
      .filter((item) => {
        if (!item) return false;
        const normalizedItem = item.toLowerCase();
        if (seen.has(normalizedItem)) return false;
        seen.add(normalizedItem);
        return true;
      });
  }, [futureRoleOptions]);
  const selectedFutureRoleExplanation = useMemo(() => {
    const normalizedCareerGoal = String(careerGoal || '').trim();
    if (!normalizedCareerGoal) {
      return "";
    }

    return String(futureRoleWhySuggested?.[normalizedCareerGoal] || '').trim();
  }, [careerGoal, futureRoleWhySuggested]);
  const autoFutureRoleRequestKey = useMemo(() => {
    if (!manualResume.industryDomain || manualResume.currentJobTitle.length === 0 || !manualResume.yearsOfExperience || !region || region === 'Global') {
      return "";
    }

    return JSON.stringify({
      industryDomain: manualResume.industryDomain,
      currentJobTitle: normalizeTagEntries(manualResume.currentJobTitle),
      yearsOfExperience: manualResume.yearsOfExperience,
      region,
      primaryTools: normalizedPrimaryToolEntries,
      skills: normalizedCoreSkillEntries,
    });
  }, [
    manualResume.industryDomain,
    manualResume.currentJobTitle,
    manualResume.yearsOfExperience,
    normalizedPrimaryToolEntries,
    normalizedCoreSkillEntries,
    region,
  ]);

  useEffect(() => {
    (async () => {
      try {
        await setFlag('profileCompleted', true);
      } catch (e) {
        console.warn('Failed to persist profile flag', e);
      }
    })();
  }, []);

  // Initialize userjourney when Hero mounts with userData
  useEffect(() => {
    if (!userData?.id) return;

    (async () => {
      try {
        const res = await fetch('/api/fastapi/init-journey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId: userData.id,
            currentStage: 'UPLOAD_CV',
            creditsRemaining: userData?.creditsRemaining ?? 1,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          console.warn('[init-journey] Failed:', data.error);
          return;
        }

        const { created, journey } = data;
        if (created) {
          console.log('[init-journey] New userjourney created for candidate', userData.id);
        } else {
          console.log('[init-journey] Existing userjourney found for candidate', userData.id);
        }

        if (journey?.current_stage) {
          setBannerStage(journey.current_stage);
        }
      } catch (err) {
        console.warn('[init-journey] Error initializing journey:', err.message);
      }
    })();
  }, [userData?.id]);

  // Fetch latest analysis for returning users at RESULTS stage if not preloaded
  useEffect(() => {
    if (!userData?.id || analysisData) return; // Skip if no user or analysis already loaded
    if (journeyCurrentStage !== 'RESULTS' && journeyCurrentStage !== 'ANALYSIS') return; // Only for returning users

    (async () => {
      try {
        const res = await fetch(`/api/fastapi/get-latest-analysis?candidateId=${encodeURIComponent(userData.id)}`, {
          method: 'GET',
          cache: 'no-store',
        });

        if (!res.ok) {
          console.warn('[fetch-latest-analysis] Failed with status:', res.status);
          return;
        }

        const data = await res.json().catch(() => ({}));
        if (!data.success || !data.analysis) {
          console.warn('[fetch-latest-analysis] No analysis found or success is false');
          return;
        }

        // Check if analysis is already mapped (has tabs property) or raw data that needs mapping
        let mappedAnalysis = data.analysis;
        if (!data.analysis.tabs) {
          // Raw data needs mapping
          mappedAnalysis = mapRoleAnalysisToMappedData(data.analysis, data.region || 'Global', data.targetRole);
        }
        setAnalysisData(mappedAnalysis);
      } catch (err) {
        console.warn('[fetch-latest-analysis] Error fetching analysis:', err.message);
      }
    })();
  }, [userData?.id, analysisData, journeyCurrentStage]);

  // Industries loaded from static list — no API call needed
  useEffect(() => {
    setIndustries([
      "Agriculture & Environment",
      "Business & Management",
      "Customer & Client Support",
      "Design",
      "Education",
      "Engineering",
      "Finance",
      "Healthcare",
      "Human Resources",
      "Information Technology",
      "Legal",
      "Logistics & Supply Chain",
      "Manufacturing",
      "Marketing & Sales",
    ]);
    setIndustriesLoading(false);
  }, []);

  // Load location options from CSV
  useEffect(() => {
    fetch('/locations.csv')
      .then(res => res.text())
      .then(text => {
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        // Skip header row
        const opts = lines.slice(1).filter(l => l.toLowerCase() !== 'location');
        setLocationOptions(opts);
      })
      .catch(() => setLocationOptions([]));
  }, []);

  useEffect(() => {
    const industry = manualResume.industryDomain;
    if (!industry) {
      setJobTitles([]);
      setJobTitlesError("");
      setJobTitlesLoading(false);
      return;
    }
    const controller = new AbortController();
    setJobTitlesLoading(true);
    setJobTitlesError("");
    getIndustryHeadlines(industry, controller.signal)
      .then((titles) => {
        setJobTitles(titles);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setJobTitles([]);
        setJobTitlesError('Unable to load job titles right now.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setJobTitlesLoading(false);
        }
      });
    return () => controller.abort();
  }, [manualResume.industryDomain]);

  useEffect(() => {
    if (!jobTitleMenuOpen) return;
    function handleClickOutside(e) {
      if (jobTitleMenuRef.current && !jobTitleMenuRef.current.contains(e.target)) {
        setJobTitleMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [jobTitleMenuOpen]);

  useEffect(() => {
    const normalizedRawTools = normalizedPrimaryToolsRequestKey;

    if (!normalizedRawTools) {
      setNormalizedPrimaryTools([]);
      setNormalizedPrimaryToolsError("");
      setNormalizedPrimaryToolsLoading(false);
      setNormalizedPrimaryToolsSource("");
      return;
    }

    const controller = new AbortController();
    setNormalizedPrimaryTools([]);
    setNormalizedPrimaryToolsError("");
    setNormalizedPrimaryToolsLoading(true);
    const timer = setTimeout(() => {
      normalizePrimaryTools(normalizedRawTools, controller.signal)
        .then((result) => {
          setNormalizedPrimaryTools(Array.isArray(result?.normalized_tools) ? result.normalized_tools : []);
          setNormalizedPrimaryToolsSource(normalizedRawTools);
        })
        .catch((error) => {
          if (error?.name === 'AbortError') return;
          setNormalizedPrimaryTools([]);
          setNormalizedPrimaryToolsError('Unable to normalize tools right now.');
          setNormalizedPrimaryToolsSource(normalizedRawTools);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setNormalizedPrimaryToolsLoading(false);
          }
        });
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [normalizedPrimaryToolsRequestKey]);

  useEffect(() => {
    const query = primaryToolInput.trim();

    if (!query) {
      setToolSuggestions([]);
      setToolSuggestionsError("");
      setToolSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    setToolSuggestionsError("");
    setToolSuggestionsLoading(true);

    const timer = setTimeout(() => {
      searchToolSuggestions(
        query,
        {
          limit: 8,
        },
        controller.signal
      )
        .then((result) => {
          setToolSuggestions(Array.isArray(result?.suggestions) ? result.suggestions : []);
        })
        .catch((error) => {
          if (error?.name === 'AbortError') return;
          setToolSuggestions([]);
          setToolSuggestionsError('Unable to load tool suggestions right now.');
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setToolSuggestionsLoading(false);
          }
        });
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [primaryToolInput]);

  useEffect(() => {
    const normalizedRawSkills = normalizedCoreSkillsRequestKey;

    if (!normalizedRawSkills) {
      setNormalizedCoreSkills([]);
      setNormalizedCoreSkillsError("");
      setNormalizedCoreSkillsLoading(false);
      setNormalizedCoreSkillsSource("");
      return;
    }

    const controller = new AbortController();
    setNormalizedCoreSkills([]);
    setNormalizedCoreSkillsError("");
    setNormalizedCoreSkillsLoading(true);
    const timer = setTimeout(() => {
      normalizeCoreSkills(normalizedCoreSkillsRequestKey, controller.signal)
        .then((result) => {
          setNormalizedCoreSkills(Array.isArray(result?.normalized_skill_names) ? result.normalized_skill_names : []);
          setNormalizedCoreSkillsSource(normalizedCoreSkillsRequestKey);
        })
        .catch((error) => {
          if (error?.name === 'AbortError') return;
          setNormalizedCoreSkills([]);
          setNormalizedCoreSkillsError('Unable to normalize skills right now.');
          setNormalizedCoreSkillsSource(normalizedCoreSkillsRequestKey);
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setNormalizedCoreSkillsLoading(false);
          }
        });
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [normalizedCoreSkillsRequestKey]);

  useEffect(() => {
    const query = skillInput.trim();

    if (!query) {
      setSkillSuggestions([]);
      setSkillSuggestionsError("");
      setSkillSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    setSkillSuggestionsError("");
    setSkillSuggestionsLoading(true);

    const timer = setTimeout(() => {
      searchSkillSuggestions(
        query,
        {
          industry: manualResume.industryDomain,
          limit: 8,
        },
        controller.signal
      )
        .then((result) => {
          setSkillSuggestions(Array.isArray(result?.suggestions) ? result.suggestions : []);
        })
        .catch((error) => {
          if (error?.name === 'AbortError') return;
          setSkillSuggestions([]);
          setSkillSuggestionsError('Unable to load skill suggestions right now.');
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setSkillSuggestionsLoading(false);
          }
        });
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [manualResume.industryDomain, skillInput]);

  useEffect(() => {
    if (!(manualSubmitAttempted || formTouched.primaryTools)) return;
    const errors = validateManualResume(manualResume);
    setFormErrors(prev => {
      const next = { ...prev };
      if (errors.primaryTools) next.primaryTools = errors.primaryTools;
      else delete next.primaryTools;
      return next;
    });
  }, [manualResume.primaryTools, normalizedPrimaryTools, normalizedPrimaryToolsLoading, normalizedPrimaryToolsError, normalizedPrimaryToolsSource, manualSubmitAttempted, formTouched.primaryTools]);

  useEffect(() => {
    if (!(manualSubmitAttempted || formTouched.skills)) return;
    const errors = validateManualResume(manualResume);
    setFormErrors(prev => {
      const next = { ...prev };
      if (errors.skills) next.skills = errors.skills;
      else delete next.skills;
      return next;
    });
  }, [manualResume.skills, normalizedCoreSkills, normalizedCoreSkillsLoading, normalizedCoreSkillsError, normalizedCoreSkillsSource, manualSubmitAttempted, formTouched.skills]);

  const filteredJobTitles = useMemo(() => {
    const normalizedSearch = jobTitleSearch.trim().toLowerCase();
    if (!normalizedSearch) return jobTitles;
    return jobTitles.filter(title => title.toLowerCase().includes(normalizedSearch));
  }, [jobTitles, jobTitleSearch]);

  function getPrimaryToolsValidationError(fields) {
    const rawToolEntries = normalizeTagEntries(fields?.primaryTools);
    const rawToolKey = buildNormalizationKey(fields?.primaryTools);
    const normalizationPending = Boolean(rawToolKey) && rawToolKey !== normalizedPrimaryToolsSource;

    if (rawToolEntries.length === 0) {
      return "Please add at least 2 tools or technologies";
    }
    if (normalizationPending || normalizedPrimaryToolsLoading) {
      return "Waiting for normalized tools...";
    }
    if (normalizedPrimaryToolsError) {
      return "Unable to validate normalized tools right now";
    }
    if (normalizedPrimaryToolEntries.length < 2) {
      return normalizedPrimaryToolEntries.length === 0
        ? "Please add at least 2 recognizable normalized tools"
        : "Please add at least one more recognizable normalized tool";
    }
    return "";
  }

  function getCoreSkillsValidationError(fields) {
    const rawSkillEntries = normalizeTagEntries(fields?.skills);
    const rawSkillKey = buildNormalizationKey(fields?.skills);
    const normalizationPending = Boolean(rawSkillKey) && rawSkillKey !== normalizedCoreSkillsSource;

    if (rawSkillEntries.length === 0) {
      return "Skills are required";
    }
    if (normalizationPending || normalizedCoreSkillsLoading) {
      return "Waiting for normalized skills...";
    }
    if (normalizedCoreSkillsError) {
      return "Unable to validate normalized skills right now";
    }
    if (normalizedCoreSkillEntries.length < 3) {
      const skillsNeeded = 3 - normalizedCoreSkillEntries.length;
      return normalizedCoreSkillEntries.length === 0
        ? "Please add at least 3 recognizable normalized skills"
        : `Please add at least ${skillsNeeded} more recognizable normalized skill${skillsNeeded === 1 ? '' : 's'}`;
    }
    return "";
  }

  function getSelectedInfoValidationErrors(fields) {
    const errors = {};
    if (!fields?.industryDomain) {
      errors.industryDomain = "Industry / Domain is required";
    }
    if (!Array.isArray(fields?.currentJobTitle) || fields.currentJobTitle.length === 0) {
      errors.currentJobTitle = "Please select at least one job title";
    }
    if (!fields?.yearsOfExperience) {
      errors.yearsOfExperience = "Job level is required";
    }

    const primaryToolsValidationError = getPrimaryToolsValidationError(fields);
    if (primaryToolsValidationError) {
      errors.primaryTools = primaryToolsValidationError;
    }

    const coreSkillsValidationError = getCoreSkillsValidationError(fields);
    if (coreSkillsValidationError) {
      errors.skills = coreSkillsValidationError;
    }

    if (!region || region === 'Global') {
      errors.region = "Please select a location";
    }

    return errors;
  }

  function buildSelectedInfoPayload(fields) {
    return {
      'industry/domain': String(fields?.industryDomain || '').trim(),
      'current job title selected': Array.isArray(fields?.currentJobTitle)
        ? fields.currentJobTitle.map((item) => String(item || '').trim()).filter(Boolean)
        : [],
      'job level': String(fields?.yearsOfExperience || '').trim(),
      'normalized tools': normalizedPrimaryToolEntries,
      'normalized skills': normalizedCoreSkillEntries,
      location: String(region || '').trim(),
    };
  }

  async function runAnalysis(text, overrideGoal) {
    const goal = (overrideGoal || careerGoal || '').trim();
    if (!text || !goal) return;
    if (overrideGoal) setCareerGoal(overrideGoal);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsLoading(true);
    await new Promise((res) => setTimeout(res, 2500));
    try {
      const result = await getFullAnalysis(text, goal, [], region);
      if (!result || !result.tabs) {
        throw new Error('Analysis returned invalid data — missing tabs');
      }
      try {
        await setFlag('analysisCompleted', true);
        await setFlag('cvText', text);
      } catch (e) {
        console.warn('Failed to persist analysis flag', e);
      }
      setAnalysisData(result);
      
      // Save analysis to database for returning users to access at RESULTS stage
      if (userData?.id && goal) {
        fetch('/api/fastapi/save-api-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId: userData.id,
            targetRole: goal,
            region: region || 'Global',
            analysis: result,
            whySuggested: `Analysis for ${goal} role transition`
          }),
        })
          .then(r => r.json())
          .then(r => {
            if (r?.success) {
              console.log('[Analysis] Analysis saved to database for future retrieval');
            } else {
              console.warn('[Analysis] Failed to save analysis:', r?.error);
            }
          })
          .catch(err => console.warn('[Analysis] Error saving analysis to database:', err));
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      
      // Handle specific error types
      if (error.message === 'RESOURCES_EXHAUSTED') {
        setErrorModal({
          isOpen: true,
          type: 'resources_exhausted',
          title: 'Resources Exhausted',
          message: 'The AI service has reached its usage limit. Please try again in a few minutes or contact support for assistance.'
        });
      } else if (error.message === 'SERVER_BUSY') {
        setErrorModal({
          isOpen: true,
          type: 'server_busy',
          title: 'Server Busy',
          message: 'The AI service is currently experiencing high traffic. Please wait a moment and try again.'
        });
      } else {
        setErrorModal({
          isOpen: true,
          type: 'general_error',
          title: 'Analysis Failed',
          message: 'An unexpected error occurred. Please try again or contact support if the issue persists.'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  // =============================
  // Get Future Role Handler
  // =============================
  async function fetchFutureRolesInternal(showAlerts = true) {
    const requestStartedAt = !showAlerts ? Date.now() : 0;
    try {
      setIsSavingSelectedInfo(true);
      if (!showAlerts) {
        setIsAutoFetchingFutureRoles(true);
      }
      setFutureRoleSuggestionsError("");
      const selectedInfoPayload = buildSelectedInfoPayload(manualResume);
      await writeSelectedInfo(selectedInfoPayload);

      // Build a text profile from form fields for the FastAPI future-role prediction
      const fields = manualResume;
      const profileLines = [
        `Industry: ${String(fields?.industryDomain || '').trim()}`,
        `Current Job Titles: ${Array.isArray(fields?.currentJobTitle) ? fields.currentJobTitle.join(', ') : ''}`,
        `Years of Experience: ${String(fields?.yearsOfExperience || '').trim()}`,
        `Skills: ${Array.isArray(normalizedCoreSkillEntries) ? normalizedCoreSkillEntries.join(', ') : ''}`,
        `Tools: ${Array.isArray(normalizedPrimaryToolEntries) ? normalizedPrimaryToolEntries.join(', ') : ''}`,
        `Certifications: ${String(fields?.certifications || '').trim()}`,
      ].filter(l => !l.endsWith(': '));
      const profileText = profileLines.join('\n');

      try {
        const prediction = await getFutureRolePrediction(profileText, String(region || '').trim(), userData?.id);
        const nextFutureRoles = Array.isArray(prediction?.roles) ? prediction.roles : [];
        const nextWhySuggested = prediction?.whySuggested && typeof prediction.whySuggested === 'object'
          ? prediction.whySuggested
          : {};
        setFutureRoleOptions(nextFutureRoles);
        setFutureRoleWhySuggested(nextWhySuggested);

        // Advance journey stage UPLOAD_CV → ANALYSIS now that roles are populated
        if (nextFutureRoles.length > 0 && userData?.id) {
          fetch('/api/fastapi/advance-journey-next', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ candidateId: userData.id }),
          })
            .then(r => r.json())
            .then(r => {
              if (r?.currentStage) setBannerStage(r.currentStage);
              const newCredits = r?.journey?.credits_remaining ?? r?.creditsRemaining;
              if (newCredits != null) setJourneyCreditsRemaining(newCredits);
              else if (r?.error) console.warn('[advance-journey]', r.error);
            })
            .catch(err => console.warn('[advance-journey] Failed:', err));
        }

        if (nextFutureRoles.length === 0) {
          setCareerGoal("");
          setFutureRoleSuggestionsError('No future roles were returned for this profile right now.');
          if (showAlerts) {
            alert('Profile saved successfully, but no future roles were returned.');
          }
        } else {
          const normalizedCurrentCareerGoal = String(careerGoal || '').trim().toLowerCase();
          const hasCurrentCareerGoal = nextFutureRoles.some(
            (role) => String(role || '').trim().toLowerCase() === normalizedCurrentCareerGoal
          );
          setCareerGoal(hasCurrentCareerGoal ? careerGoal : nextFutureRoles[0]);
          if (showAlerts) {
            alert('Profile saved and future roles loaded into the Target Role dropdown.');
          }
        }
      } catch (futureRoleError) {
        console.error('Failed to load future role suggestions:', futureRoleError);
        setFutureRoleWhySuggested({});
        setFutureRoleSuggestionsError('Unable to load future role suggestions right now.');
        if (showAlerts) {
          alert('Profile saved, but future role suggestions could not be loaded right now.');
        }
      }
    } catch (error) {
      console.error('Failed to fetch future roles:', error);
      if (showAlerts) {
        alert('Unable to fetch future roles right now.');
      }
    } finally {
      setIsSavingSelectedInfo(false);
      if (!showAlerts) {
        const elapsed = Date.now() - requestStartedAt;
        const remainingDelay = Math.max(0, 900 - elapsed);
        if (remainingDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingDelay));
        }
        setIsAutoFetchingFutureRoles(false);
      }
    }
  }

  async function handleGetFutureRole(e) {
    e.preventDefault();
    const selectedInfoErrors = getSelectedInfoValidationErrors(manualResume);
    setFormTouched(prev => ({
      ...prev,
      industryDomain: true,
      currentJobTitle: true,
      yearsOfExperience: true,
      primaryTools: true,
      skills: true,
      region: true,
    }));
    setFormErrors(prev => {
      const next = { ...prev };
      if (selectedInfoErrors.industryDomain) next.industryDomain = selectedInfoErrors.industryDomain;
      else delete next.industryDomain;
      if (selectedInfoErrors.currentJobTitle) next.currentJobTitle = selectedInfoErrors.currentJobTitle;
      else delete next.currentJobTitle;
      if (selectedInfoErrors.yearsOfExperience) next.yearsOfExperience = selectedInfoErrors.yearsOfExperience;
      else delete next.yearsOfExperience;
      if (selectedInfoErrors.primaryTools) next.primaryTools = selectedInfoErrors.primaryTools;
      else delete next.primaryTools;
      if (selectedInfoErrors.skills) next.skills = selectedInfoErrors.skills;
      else delete next.skills;
      if (selectedInfoErrors.region) next.region = selectedInfoErrors.region;
      else delete next.region;
      return next;
    });

    if (Object.keys(selectedInfoErrors).length > 0) {
      return;
    }

    hasAutoFetchedFutureRoles.current = true;
    lastAutoFetchedFutureRolesKey.current = autoFutureRoleRequestKey;
    await fetchFutureRolesInternal(true);
  }

  function handleBackToInput() {
    setAnalysisData(null);
  }

  async function handleCvFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if user agreed to submit
    if (!agreed) {
      setCvUploadError("Please check the 'I agree to submit' checkbox before uploading your CV.");
      e.target.value = '';
      return;
    }
    
    if (!cvLocation) {
      setCvUploadError("Please select the location before uploading your CV.");
      e.target.value = '';
      return;
    }
    setCvUploading(true);
    setCvUploadError("");
    setCvParsed(false);
    setCvWarnings([]);
    setCvBestIndustry("");
    setCvCurrentRoles("");
    setCvApiResponses({ uploadResume: null, skillExtract: null });

    const sessionId = typeof window !== 'undefined' ? window.localStorage.getItem('sessionId') : null;
    try {
      // ── Step 1: Upload resume to get raw_text ──
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(
        `/api/fastapi/uploadresume`,
        {
          method: 'POST',
          body: form,
          headers: sessionId ? { 'x-session-id': sessionId } : {},
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setCvUploadError(data.detail || 'Upload failed. Please try again.');
        setCvUploading(false);
        return;
      }

      const rawText = data.raw_text || '';
      if (!rawText.trim()) {
        setCvUploadError('Could not extract text from the uploaded file.');
        setCvUploading(false);
        return;
      }

      setCvContent(rawText);
      setCvWarnings(data.warnings || []);
      setCvApiResponses(prev => ({ ...prev, uploadResume: data }));

      // ── Step 2: Call unified futureroleprediction via OpenAI ──
      console.log('[CV Upload] Calling getFutureRolePrediction with raw_text + location:', cvLocation);
      const prediction = await getFutureRolePrediction(rawText, cvLocation, userData?.id);
      console.log('[CV Upload] Prediction received:', prediction);

      // ── Step 3: Populate all cv* fields from unified AI response ──
      setCvBestIndustry(prediction.bestFitIndustry || '');
      setCvCurrentRoles((prediction.possibleJobTitles || []).join(', '));
      setCvWorkExperience(prediction.workExperience || '');
      setCvEducation(prediction.education || '');
      
      // ✅ DEBUG: Log years_of_experience from backend
      console.log('[CV Upload] Backend years_of_experience:', data.years_of_experience);
      console.log('[CV Upload] work_experience text length:', (data.work_experience || '').length);
      
      setCvYearsOfExperience(data.years_of_experience != null ? String(data.years_of_experience) : '');
      setCvCertifications((prediction.certifications || []).join(', '));

      // Skills from core_skills keys
      const skillNames = Object.keys(prediction.coreSkills || {});
      setCvSkills(skillNames.join(', '));

      // Tools from tools_and_technologies — build categorized tools by category
      const toolsObj = prediction.toolsAndTechnologies || {};
      const categorized = {};
      const categoryOrder = [];
      for (const [toolName, category] of Object.entries(toolsObj)) {
        if (!categorized[category]) {
          categorized[category] = [];
          categoryOrder.push(category);
        }
        categorized[category].push(toolName);
      }
      setCvCategorizedTools(categorized);
      setCvToolCategories(categoryOrder);
      setCvTools(Object.keys(toolsObj).join(', '));

      // Future roles from Phase 2
      const roles = prediction.roles || [];
      setCvFutureRoles(roles);
      setCvInferredSeniority(prediction.inferredSeniority || '');
      setCvConfidenceScores(prediction.confidenceScores || {});
      setCvWhySuggested(prediction.whySuggested || {});
      setCvSelectedFutureRole(roles[0] || '');
      setCvFutureRolesLoading(false);
      setCvFutureRolesError('');

      // Save future roles to database
      if (roles.length > 0 && userData?.id) {
        fetch('/api/fastapi/save-future-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId: userData.id,
            roles: roles,
            location: cvLocation,
            whySuggested: prediction.whySuggested || {},
            confidenceScores: prediction.confidenceScores || {}
          })
        })
          .then(r => r.json())
          .then(r => console.log('[CV Upload] Future roles saved:', r))
          .catch(err => console.warn('[CV Upload] Error saving future roles:', err));
      }

      // Advance journey stage UPLOAD_CV → ANALYSIS now that roles are populated
      if (roles.length > 0 && userData?.id) {
        fetch('/api/fastapi/advance-journey-next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidateId: userData.id }),
        })
          .then(r => r.json())
          .then(r => { 
            if (r?.currentStage) setBannerStage(r.currentStage);
            const newCredits = r?.journey?.credits_remaining ?? r?.creditsRemaining;
            if (newCredits != null) setJourneyCreditsRemaining(newCredits);
            else if (r?.error) console.warn('[advance-journey]', r.error);
          })
          .catch(err => console.warn('[advance-journey] Failed:', err));
      }

      // Build detailed API response store
      const fullApiResponse = {
        uploadResume: data,
        prediction,
        toolsExtraction: {
          tools: Object.keys(toolsObj),
          categorized_tools: categorized,
          tool_categories: categoryOrder,
        },
        skillsExtraction: {
          skills: skillNames,
        },
        certificationsExtraction: {
          certifications: prediction.certifications || [],
        },
        warnings: data.warnings || [],
        sections_found: data.sections_found || [],
        timestamp: new Date().toISOString(),
      };
      setCvApiResponses(fullApiResponse);

      // Persist to api.json with candidateId
      if (userData?.id) {
        fetch('/api/fastapi/save-api-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId: userData.id,
            cvData: fullApiResponse
          }),
        })
          .then(r => r?.json())
          .then(r => { if (r?.success) console.log('[API] CV response saved'); })
          .catch(err => console.warn('[API] Failed to save CV response:', err));
      }
      console.log('[CV API Responses] saved to api.json', fullApiResponse);

      setCvParsed(true);
    } catch (err) {
      console.error('[CV Upload] Error:', err);
      setCvUploadError(err?.message || 'Network error. Please check your connection and try again.');
      setCvUploading(false);
    } finally {
      e.target.value = '';
    }
  }

  // =============================
  // Form Validation Logic
  // =============================
  function validateManualResume(fields) {
    const errors = {};
    if (!fields.name || fields.name.trim().length < 2) {
      errors.name = fields.name?.trim() ? "Name must be at least 2 characters" : "Please enter your name";
    }
    if (!fields.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
      errors.email = fields.email?.trim() ? "Please enter a valid email address" : "Please enter your email address";
    }
    if (!fields.phone || !/^\+?[\d\s\-()]{7,}$/.test(fields.phone.trim())) {
      errors.phone = fields.phone?.trim() ? "Please enter a valid phone number" : "Please enter your phone number";
    }
    if (!fields.currentJobTitle || !Array.isArray(fields.currentJobTitle) || fields.currentJobTitle.length === 0) {
      errors.currentJobTitle = "Please select at least one job title";
    }
    if (!fields.yearsOfExperience) {
      errors.yearsOfExperience = "Job level is required";
    }
    if (!fields.industryDomain) {
      errors.industryDomain = "Industry / Domain is required";
    }
    const primaryToolsValidationError = getPrimaryToolsValidationError(fields);
    if (primaryToolsValidationError) {
      errors.primaryTools = primaryToolsValidationError;
    }
    const coreSkillsValidationError = getCoreSkillsValidationError(fields);
    if (coreSkillsValidationError) {
      errors.skills = coreSkillsValidationError;
    }
    if (!careerGoal || !careerGoal.trim()) {
      errors.careerGoal = "Vision target is required";
    }
    if (!region || region === 'Global') {
      errors.region = "Please select a location";
    }
    return errors;
  }

  // =============================
  // Manual Resume Input Handler
  // =============================
  function handleManualInputChange(field, value) {
    const isIndustryChange = field === 'industryDomain';
    const industryDependentFieldReset = isIndustryChange
      ? {
          currentJobTitle: [],
          yearsOfExperience: "",
          primaryTools: [],
          skills: [],
          workExperience: "",
          education: "",
          certifications: "",
          achievements: "",
        }
      : {};

    const updated = {
      ...manualResume,
      [field]: value,
      ...industryDependentFieldReset,
      ...(field === 'headline'
        ? {
            headlineCanonical: "",
            headlineIndustry: "",
            headlineScore: null,
            headlineSourceDataset: "",
            headlineAlias: "",
          }
        : {}),
    };

    setManualResume(prev => ({
      ...prev,
      [field]: value,
      ...industryDependentFieldReset,
      ...(field === 'headline'
        ? {
            headlineCanonical: "",
            headlineIndustry: "",
            headlineScore: null,
            headlineSourceDataset: "",
            headlineAlias: "",
          }
        : {}),
    }));
    if (isIndustryChange) {
      setJobTitleMenuOpen(false);
      setJobTitleSearch("");
      setJobTitles([]);
      setJobTitlesError("");
      setCareerGoal("");
      setFutureRoleOptions([]);
      setFutureRoleWhySuggested({});
      setFutureRoleSuggestionsError("");
      setPrimaryToolInput("");
      setToolSuggestions([]);
      setToolSuggestionsError("");
      setToolSuggestionsLoading(false);
      setNormalizedPrimaryTools([]);
      setNormalizedPrimaryToolsError("");
      setNormalizedPrimaryToolsLoading(false);
      setNormalizedPrimaryToolsSource("");
      setSkillInput("");
      setSkillSuggestions([]);
      setSkillSuggestionsError("");
      setSkillSuggestionsLoading(false);
      setNormalizedCoreSkills([]);
      setNormalizedCoreSkillsError("");
      setNormalizedCoreSkillsLoading(false);
      setNormalizedCoreSkillsSource("");
    }
    setFormTouched(prev => ({
      ...prev,
      [field]: true,
      ...(isIndustryChange
        ? {
            currentJobTitle: false,
            yearsOfExperience: false,
            primaryTools: false,
            skills: false,
            workExperience: false,
            education: false,
            certifications: false,
            achievements: false,
          }
        : {}),
    }));
    if (manualSubmitAttempted || formTouched[field]) {
      const errors = validateManualResume(updated);
      setFormErrors(prev => {
        const next = { ...prev };
        if (errors[field]) next[field] = errors[field];
        else delete next[field];
        if (isIndustryChange) {
          delete next.currentJobTitle;
          delete next.yearsOfExperience;
          delete next.primaryTools;
          delete next.skills;
          delete next.workExperience;
          delete next.education;
          delete next.certifications;
          delete next.achievements;
        }
        return next;
      });
    }
  }

  function updateCurrentJobTitles(updated) {
    setManualResume(prev => ({ ...prev, currentJobTitle: updated }));
    setFormTouched(prev => ({ ...prev, currentJobTitle: true }));
    setJobTitleSearch("");
    if (manualSubmitAttempted || formTouched.currentJobTitle) {
      const errs = validateManualResume({ ...manualResume, currentJobTitle: updated });
      setFormErrors(prev => {
        const next = { ...prev };
        if (errs.currentJobTitle) next.currentJobTitle = errs.currentJobTitle;
        else delete next.currentJobTitle;
        return next;
      });
    }
  }

  function handleHeadlineSelection(selection) {
    const updatedResume = {
      ...manualResume,
      headline: selection.displayValue,
      headlineCanonical: selection.canonical_headline,
      headlineIndustry: selection.industry || "",
      headlineScore: typeof selection.score === 'number' ? selection.score : null,
      headlineSourceDataset: selection.source_dataset || "",
      headlineAlias: selection.alias_headline || "",
    };

    setManualResume(prev => ({
      ...prev,
      headline: selection.displayValue,
      headlineCanonical: selection.canonical_headline,
      headlineIndustry: selection.industry || "",
      headlineScore: typeof selection.score === 'number' ? selection.score : null,
      headlineSourceDataset: selection.source_dataset || "",
      headlineAlias: selection.alias_headline || "",
    }));
    setFormTouched(prev => ({ ...prev, headline: true }));
    if (manualSubmitAttempted || formTouched.headline) {
      const errors = validateManualResume(updatedResume);
      setFormErrors(prev => {
        const next = { ...prev };
        if (errors.headline) next.headline = errors.headline;
        else delete next.headline;
        return next;
      });
    }
  }

  function shouldShowError(field) {
    return (manualSubmitAttempted || formTouched[field]) && formErrors[field];
  }

  const hasValidNormalizedPrimaryTools = !getPrimaryToolsValidationError(manualResume);
  const hasValidNormalizedCoreSkills = !getCoreSkillsValidationError(manualResume);
  const canSaveSelectedInfo =
    !!manualResume.industryDomain &&
    manualResume.currentJobTitle.length > 0 &&
    !!manualResume.yearsOfExperience &&
    hasValidNormalizedPrimaryTools &&
    hasValidNormalizedCoreSkills &&
    !!region && region !== 'Global';

  useEffect(() => {
    if (!canSaveSelectedInfo) {
      hasAutoFetchedFutureRoles.current = false;
      lastAutoFetchedFutureRolesKey.current = "";
      return;
    }

    if (lastAutoFetchedFutureRolesKey.current !== autoFutureRoleRequestKey) {
      hasAutoFetchedFutureRoles.current = false;
    }

    if (!autoFutureRoleRequestKey || hasAutoFetchedFutureRoles.current || isSavingSelectedInfo || isAutoFetchingFutureRoles) {
      return;
    }

    hasAutoFetchedFutureRoles.current = true;
    lastAutoFetchedFutureRolesKey.current = autoFutureRoleRequestKey;
    fetchFutureRolesInternal(false);
  }, [autoFutureRoleRequestKey, canSaveSelectedInfo, isAutoFetchingFutureRoles, isSavingSelectedInfo]);

  // All mandatory fields except Target Role (careerGoal) are valid
  const allPreTargetFilled =
    manualResume.name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualResume.email.trim()) &&
    /^\+?[\d\s\-()]{7,}$/.test(manualResume.phone.trim()) &&
    !!manualResume.industryDomain &&
    manualResume.currentJobTitle.length > 0 &&
    !!manualResume.yearsOfExperience &&
    hasValidNormalizedPrimaryTools &&
    hasValidNormalizedCoreSkills &&
    !!region && region !== 'Global';

  // All mandatory fields including Target Role are valid
  const allMandatoryFilled = allPreTargetFilled && !!careerGoal.trim();

  function handleCareerGoalChange(value) {
    setCareerGoal(value);
    setFormTouched(prev => ({ ...prev, careerGoal: true }));
    if (manualSubmitAttempted || formTouched.careerGoal) {
      setFormErrors(prev => {
        const next = { ...prev };
        if (!value || !value.trim()) next.careerGoal = "Vision target is required";
        else delete next.careerGoal;
        return next;
      });
    }
  }

  function handleRegionChange(value) {
    setRegion(value);
    setFormTouched(prev => ({ ...prev, region: true }));
    if (manualSubmitAttempted || formTouched.region) {
      setFormErrors(prev => {
        const next = { ...prev };
        if (!value || value === 'Global') next.region = "Please select a location";
        else delete next.region;
        return next;
      });
    }
  }

  function handleAddPrimaryTool(tool) {
    const trimmed = tool.trim();
    if (!trimmed) return;
    const updated = [...manualResume.primaryTools, trimmed];
    setManualResume(prev => ({ ...prev, primaryTools: updated }));
    setPrimaryToolInput("");
    setToolSuggestions([]);
    setToolSuggestionsError("");
    setFormTouched(prev => ({ ...prev, primaryTools: true }));
    if (manualSubmitAttempted || formTouched.primaryTools) {
      const errs = validateManualResume({ ...manualResume, primaryTools: updated });
      setFormErrors(prev => {
        const next = { ...prev };
        if (errs.primaryTools) next.primaryTools = errs.primaryTools;
        else delete next.primaryTools;
        return next;
      });
    }
  }

  function handleRemovePrimaryTool(idx) {
    const updated = manualResume.primaryTools.filter((_, i) => i !== idx);
    setManualResume(prev => ({ ...prev, primaryTools: updated }));
    setFormTouched(prev => ({ ...prev, primaryTools: true }));
    if (manualSubmitAttempted || formTouched.primaryTools) {
      const errs = validateManualResume({ ...manualResume, primaryTools: updated });
      setFormErrors(prev => {
        const next = { ...prev };
        if (errs.primaryTools) next.primaryTools = errs.primaryTools;
        else delete next.primaryTools;
        return next;
      });
    }
  }

  function handleAddSkill(skill) {
    const trimmed = skill.trim();
    if (!trimmed) return;
    const updated = [...manualResume.skills, trimmed];
    setManualResume(prev => ({ ...prev, skills: updated }));
    setSkillInput("");
    setSkillSuggestions([]);
    setSkillSuggestionsError("");
    setFormTouched(prev => ({ ...prev, skills: true }));
    if (manualSubmitAttempted || formTouched.skills) {
      const errs = validateManualResume({ ...manualResume, skills: updated });
      setFormErrors(prev => {
        const next = { ...prev };
        if (errs.skills) next.skills = errs.skills;
        else delete next.skills;
        return next;
      });
    }
  }

  function handleRemoveSkill(idx) {
    const updated = manualResume.skills.filter((_, i) => i !== idx);
    setManualResume(prev => ({ ...prev, skills: updated }));
    setFormTouched(prev => ({ ...prev, skills: true }));
    if (manualSubmitAttempted || formTouched.skills) {
      const errs = validateManualResume({ ...manualResume, skills: updated });
      setFormErrors(prev => {
        const next = { ...prev };
        if (errs.skills) next.skills = errs.skills;
        else delete next.skills;
        return next;
      });
    }
  }

  // =============================
  // Manual Resume Submit Handler
  // =============================
  async function handleManualResumeSubmit(e) {
    e.preventDefault();
    setManualSubmitAttempted(true);
    const errors = validateManualResume(manualResume);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const resumeText = [
      `Name: ${manualResume.name}`,
      `Email: ${manualResume.email}`,
      `Phone: ${manualResume.phone}`,
      manualResume.headline ? `Professional Headline: ${manualResume.headline}` : '',
      manualResume.currentJobTitle.length > 0 ? `Current Job Title: ${manualResume.currentJobTitle.join(', ')}` : '',
      manualResume.yearsOfExperience ? `Job Level: ${manualResume.yearsOfExperience}` : '',
      manualResume.industryDomain ? `Industry / Domain: ${manualResume.industryDomain}` : '',
      manualResume.primaryTools.length > 0 ? `Primary Tools / Tech: ${manualResume.primaryTools.join(', ')}` : '',
      manualResume.skills.length > 0 ? `\nCore Skills:\n${manualResume.skills.join(', ')}` : '',
      manualResume.workExperience ? `\nWork Experience:\n${manualResume.workExperience}` : '',
      manualResume.education ? `\nEducation:\n${manualResume.education}` : '',
      manualResume.certifications ? `\nCertifications:\n${manualResume.certifications}` : '',
      manualResume.achievements ? `\nAchievements:\n${manualResume.achievements}` : '',
    ].filter(Boolean).join('\n');
    setCvContent(resumeText);
    await runAnalysis(resumeText);
  }

  // ── Background animation hooks (must run before any early return to keep hook order stable) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, animId;
    const particles = [];
    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
    const COLORS = [[99,120,230],[0,188,212],[124,77,255],[41,182,246],[255,255,255]];
    for (let i = 0; i < 80; i++) {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      particles.push({ x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight, r: Math.random()*2.5+0.5, a: Math.random()*Math.PI*2, speed: Math.random()*0.3+0.05, drift: (Math.random()-0.5)*0.008, opacity: Math.random()*0.5+0.1, color: c });
    }
    function draw() {
      ctx.clearRect(0,0,W,H);
      particles.forEach(p => {
        p.a += p.drift; p.x += Math.cos(p.a)*p.speed; p.y += Math.sin(p.a)*p.speed*0.4;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${p.opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animId); };
  }, []);

  useEffect(() => {
    const container = beamsRef.current;
    if (!container) return;
    const timeouts = [];
    function spawnBeam() {
      const beam = document.createElement('div');
      beam.className = 'beam';
      const h = 150 + Math.random()*250;
      beam.style.cssText = `height:${h}px;left:${Math.random()*100}%;top:0;animation-duration:${6+Math.random()*8}s;animation-delay:${Math.random()*4}s;opacity:0;`;
      container.appendChild(beam);
      const t = setTimeout(() => beam.remove(), 16000);
      timeouts.push(t);
    }
    for (let i = 0; i < 8; i++) spawnBeam();
    const interval = setInterval(spawnBeam, 2000);
    return () => { clearInterval(interval); timeouts.forEach(clearTimeout); };
  }, []);

  if (analysisData) {
    return <AnalysisDashboard
      data={analysisData}
      careerGoal={careerGoal}
      onBack={handleBackToInput}
      onExit={onLogout}
      onOpenPayment={onOpenPayment}
      selectedPlan={selectedPlan}
      cvText={cvContent}
      selectedLocation={cvLocation || ''}
      bannerStage={bannerStage}
      creditsRemaining={journeyCreditsRemaining}
      candidateId={userData?.id}
      selectedInfo={{
        industryDomain: manualResume.industryDomain || "",
        primaryTools: Array.isArray(manualResume.primaryTools) ? manualResume.primaryTools : [],
        currentJobTitle: Array.isArray(manualResume.currentJobTitle) ? manualResume.currentJobTitle : [],
        jobLevel: manualResume.yearsOfExperience || "",
        desiredRole: String(careerGoal || '').trim(),
      }}
      userProfile={{
        name: manualResume.name || userData?.name || '',
        email: manualResume.email || userData?.email || '',
        phone: manualResume.phone || '',
        headline: manualResume.headline || careerGoal || '',
        location: region || '',
      }}
    />;
  }

  const SR = {
    label:     { display:'flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight:700, color:'var(--text-2)', marginBottom:7, paddingLeft:2 },
    err:       { fontSize:11, color:'#dc2626', marginTop:4 },
    input:     { width:'100%', padding:'13px 16px', borderRadius:14, border:'1px solid var(--input-border)', background:'linear-gradient(180deg,rgba(255,255,255,0.97),var(--input-bg))', color:'var(--text)', fontFamily:'inherit', fontSize:14, fontWeight:500, lineHeight:1.5, outline:'none', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.85),var(--shadow-sm)', transition:'border-color var(--tr),box-shadow var(--tr)' },
    chip:      { display:'inline-flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:999, background:'linear-gradient(180deg,rgba(255,255,255,0.92),var(--chip-bg))', border:'1px solid rgba(59,130,246,0.20)', color:'var(--chip-text)', fontSize:12, fontWeight:800, boxShadow:'var(--shadow-sm)' },
    chipSkl:   { display:'inline-flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:999, background:'linear-gradient(180deg,rgba(255,255,255,0.92),rgba(109,40,217,0.06))', border:'1px solid rgba(109,40,217,0.18)', color:'#5b21b6', fontSize:12, fontWeight:800, boxShadow:'var(--shadow-sm)' },
    tagInput:  { flex:1, minWidth:140, outline:'none', background:'transparent', fontSize:13, fontWeight:500, color:'var(--text)', border:'none', fontFamily:'inherit' },
    normBox:   { marginTop:10, padding:'12px 14px', borderRadius:12, background:'rgba(109,40,217,0.04)', border:'1px solid rgba(109,40,217,0.14)' },
    iconDot:   (g='a') => ({ width:40, height:40, borderRadius:13, display:'grid', placeItems:'center', background:`var(--gradient-${g})`, boxShadow:'0 10px 26px rgba(79,126,248,0.28)', flexShrink:0, color:'white' }),
    secHead:   (sh='sh1') => ({ display:'flex', alignItems:'center', gap:14, padding:'15px 18px 20px', marginBottom:20, borderRadius:18, background:`var(--${sh})`, borderBottom:'1px solid rgba(110,130,210,0.10)' }),
    btnPrimary:(dis) => ({ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 26px', borderRadius:14, fontSize:14, fontWeight:700, color:'white', background: dis?'rgba(91,33,182,0.35)':'var(--gradient-a)', border:'none', cursor:dis?'not-allowed':'pointer', fontFamily:'inherit', boxShadow:dis?'none':'0 12px 30px rgba(79,126,248,0.36),0 2px 6px rgba(79,126,248,0.18)', transition:'transform var(--tr),box-shadow var(--tr)', opacity:dis?0.55:1 }),
    btnGhost:  { display:'inline-flex', alignItems:'center', gap:8, padding:'13px 26px', borderRadius:14, fontSize:14, fontWeight:700, color:'var(--text-2)', background:'rgba(255,255,255,0.85)', border:'1px solid var(--border-strong)', cursor:'pointer', fontFamily:'inherit', boxShadow:'var(--shadow-sm)' },
    btnOutline:{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 26px', borderRadius:14, fontSize:14, fontWeight:700, color:'var(--accent)', background:'transparent', border:'1.5px solid rgba(79,126,248,0.38)', cursor:'pointer', fontFamily:'inherit' },
    secDivider:(iconBg='linear-gradient(135deg,#6366f1,#4f46e5)',lineColor='rgba(99,102,241,0.18)') => ({
      wrapper: { display:'flex', alignItems:'center', gap:10, margin:'22px 0 12px' },
      iconWrap: { width:28, height:28, borderRadius:8, background:iconBg, display:'grid', placeItems:'center', color:'white', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.12)' },
      label:    { fontSize:11, fontWeight:800, color:'#374151', textTransform:'uppercase', letterSpacing:'0.10em' },
      line:     { flex:1, height:1, background:`linear-gradient(90deg,${lineColor},transparent)` },
    }),
  };

  return (
    <div style={{ fontFamily:"'Outfit','DM Sans',ui-sans-serif,system-ui,sans-serif", background:'transparent', minHeight:'100vh', overflowX:'hidden', position:'relative', color:'var(--text)' }}>
      {verificationMessage && (
        <div style={{ background:'linear-gradient(90deg,#4f46e5,#7c3aed)', color:'white', padding:'12px 20px', textAlign:'center', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>✉</span>
          {verificationMessage}
        </div>
      )}
      <Dialog open={isSavingSelectedInfo && !isAutoFetchingFutureRoles}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-vibrant-azure animate-spin" />
              Processing
            </DialogTitle>
            <DialogDescription>
              Please wait while we generate your prompt and get future roles.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex h-2 w-2 rounded-full bg-vibrant-azure animate-pulse" />
            Getting future roles...
          </div>
        </DialogContent>
      </Dialog>
      <FutureRolesLoadingModal open={isAutoFetchingFutureRoles} />
      <Waiting isOpen={cvUploading} />
      <Waiting
        isOpen={isLoading}
        title="Generating Career Analysis"
        subtitle="Our AI is evaluating your profile against the target role — this takes a moment..."
        steps={ANALYSIS_STEPS}
        footerMessage="Hang tight — your personalised report is being built..."
      />
      {/* Page background */}
      <div className="bg-mesh" />
      <canvas id="grain" ref={canvasRef} />
      <div className="beams" ref={beamsRef} />

      {/* Page wrapper */}
      <div style={{position:'relative',zIndex:1,padding:'36px 20px 80px'}}>
        <div style={{width:'min(1100px,100%)',margin:'0 auto'}}>
          {/* ── Hero Card ── */}
          <div className="relative rounded-[30px] overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(255,255,255,0.52)_100%)] [backdrop-filter:blur(40px)_saturate(220%)_brightness(1.04)] border border-[rgba(255,255,255,0.85)] mb-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(255,255,255,0.40),0_8px_32px_rgba(57,73,171,0.18),0_32px_80px_rgba(57,73,171,0.12)] animate-sr-card-in before:content-[''] before:absolute before:inset-0 before:bg-[linear-gradient(160deg,rgba(255,255,255,0.45)_0%,transparent_55%)] before:pointer-events-none before:z-0 after:content-[''] after:absolute after:top-0 after:left-[10%] after:right-[10%] after:h-[1px] after:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)] after:pointer-events-none after:z-0">


            {/* Glass inner card */}
            <div className="relative z-[1] bg-[linear-gradient(160deg,rgba(255,255,255,0.13)_0%,rgba(255,255,255,0.04)_60%,rgba(109,40,217,0.08)_100%)] border border-[rgba(255,255,255,0.22)] rounded-[30px] px-10 py-11 backdrop-blur-[28px] shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_2px_0_rgba(255,255,255,0.18)_inset] flex items-start gap-9 flex-wrap before:content-[''] before:absolute before:top-0 before:left-[10%] before:right-[10%] before:h-[1px] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent)] before:rounded-full before:pointer-events-none after:content-[''] after:absolute after:inset-0 after:rounded-[30px] after:bg-[radial-gradient(ellipse_at_20%_0%,rgba(167,139,250,0.14)_0%,transparent_60%)] after:pointer-events-none">

              {/* Left column */}
              <div className="flex-1 min-w-[280px] relative z-[1]">
                <div className="inline-flex items-center gap-[10px] bg-[rgba(255,255,255,0.88)] border border-[rgba(99,102,241,0.22)] rounded-[14px] py-[8px] px-[14px] mb-5 shadow-[0_2px_12px_rgba(99,102,241,0.15),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-[8px]">
                  {/* Logo icon — matches navbar exactly */}
                  <div className="w-[32px] h-[32px] rounded-[9px] bg-[linear-gradient(135deg,#818cf8,#6366f1)] grid place-items-center shadow-[0_3px_10px_rgba(99,102,241,0.40),inset_0_1px_0_rgba(255,255,255,0.30)] shrink-0">
                    <svg className="w-[16px] h-[16px]" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 2L17 6.5V13.5L10 18L3 13.5V6.5L10 2Z" fill="white" opacity="0.9"/>
                      <path d="M10 7L13 8.75V12.25L10 14L7 12.25V8.75L10 7Z" fill="white" opacity="0.5"/>
                    </svg>
                  </div>
                  {/* Brand name — dark elev + gradient Aite */}
                  <span className="font-plusJakarta tracking-[-0.025em] font-bold text-[18px] leading-none text-[#0f172a]">
                    elev<span className="bg-[linear-gradient(135deg,#4f7df3,#7c3aed)] bg-clip-text text-transparent">AIte pro</span>
                  </span>
                </div>
                <h1 className="font-playfair text-[clamp(2.5rem,4.2vw,3.9rem)] font-extrabold leading-[1.04] tracking-[-0.045em] text-[#0f172a] mb-5 max-w-[560px]">
                  Map your{' '}<em className="italic font-extrabold bg-[linear-gradient(135deg,#7c3aed_0%,#4f46e5_50%,#0ea5e9_100%)] bg-clip-text text-transparent">future</em>{' '}career trajectory
                </h1>
                <p className="font-plusJakarta text-[15px] text-[#1e293b] leading-[1.88] mb-6 max-w-[500px] font-normal tracking-[0.01em]">
                  Our intelligence engine analyses your skills, experience, and ambitions &mdash; then maps the highest-value role transitions available to you in today&apos;s market.
                </p>
                <div className="flex flex-wrap gap-[9px] mb-6">
                  <div className="relative overflow-hidden inline-flex items-center gap-2 py-[9px] px-[17px] rounded-full font-plusJakarta text-[11.5px] font-bold text-white bg-[linear-gradient(135deg,#0369a1_0%,#0284c7_45%,#1d4ed8_100%)] border border-[rgba(2,132,199,0.70)] shadow-[0_4px_20px_rgba(29,78,216,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] cursor-default transition-transform duration-200 hover:-translate-y-[2px] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[50%] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent)] before:pointer-events-none"><Zap size={13}/>AI-Powered Role Matching</div>
                  <div className="relative overflow-hidden inline-flex items-center gap-2 py-[9px] px-[17px] rounded-full font-plusJakarta text-[11.5px] font-bold text-white bg-[linear-gradient(135deg,#3b0764_0%,#6d28d9_30%,#4f46e5_65%,#be185d_100%)] border border-[rgba(139,92,246,0.65)] shadow-[0_4px_20px_rgba(109,40,217,0.55),inset_0_1px_0_rgba(255,255,255,0.25)] cursor-default transition-transform duration-200 hover:-translate-y-[2px] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[50%] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent)] before:pointer-events-none"><BarChart2 size={13}/>Live Market Benchmarking</div>
                  <div className="relative overflow-hidden inline-flex items-center gap-2 py-[9px] px-[17px] rounded-full font-plusJakarta text-[11.5px] font-bold text-white bg-[linear-gradient(135deg,#f97316_0%,#ec4899_100%)] border border-[rgba(249,115,22,0.60)] shadow-[0_4px_20px_rgba(236,72,153,0.50),inset_0_1px_0_rgba(255,255,255,0.25)] cursor-default transition-transform duration-200 hover:-translate-y-[2px] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[50%] before:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),transparent)] before:pointer-events-none"><Globe size={13}/>Global Role Coverage</div>
                </div>
                <div className="flex items-center justify-center gap-[10px] px-5 py-[10px] rounded-[14px] w-full relative overflow-hidden bg-[linear-gradient(135deg,#064e3b_0%,#0d9488_45%,#0891b2_100%)] border border-[rgba(6,182,212,0.45)] shadow-[0_4px_24px_rgba(8,145,178,0.45),inset_0_1px_0_rgba(255,255,255,0.22)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[1px] before:bg-[linear-gradient(90deg,transparent,rgba(125,211,252,0.70),transparent)]">
                  <Lock size={13} className="text-[#7dd3fc] shrink-0"/>
                  <span className="font-plusJakarta text-[11.5px] text-[rgba(224,242,254,0.92)] leading-none whitespace-nowrap">
                    <strong className="text-white font-bold">Your CV is never stored.</strong>{' '}Processed in-session only, encrypted end-to-end, and deleted immediately after extraction.
                  </span>
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-4 w-[290px] min-w-[260px] relative z-[1]">
                {(onLogout || onBack) && (
                  <button type="button" onClick={onLogout || onBack} className="flex items-center justify-center gap-[9px] w-full px-[22px] py-[13px] rounded-[18px] font-plusJakarta text-[13px] font-bold text-[#dc2626] bg-transparent border-2 border-[#dc2626] transition-all duration-200 hover:bg-[linear-gradient(135deg,#dc2626,#b91c1c)] hover:text-white hover:border-[#ef4444] hover:-translate-y-[1px] active:scale-[0.98]">
                    <LogOut size={15} strokeWidth={2.2}/>
                    Sign Out
                  </button>
                )}
                {/* How it works — commercial amber */}
                <div className="relative overflow-hidden rounded-[20px] p-5 bg-[linear-gradient(135deg,#78350f_0%,#b45309_40%,#d97706_75%,#f59e0b_100%)] border border-[rgba(251,191,36,0.35)] shadow-none before:content-[''] before:absolute before:top-0 before:left-[8%] before:right-[8%] before:h-[1px] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.50),transparent)] before:rounded-full after:content-[''] after:absolute after:bottom-0 after:right-0 after:w-[130px] after:h-[130px] after:bg-[radial-gradient(circle,rgba(255,190,70,0.22)_0%,transparent_70%)] after:pointer-events-none">
                  <div className="font-plusJakarta text-[10.5px] font-bold tracking-[0.13em] uppercase text-white mb-[14px] flex items-center gap-2 relative z-[1] [text-shadow:0_1px_4px_rgba(0,0,0,0.30)]">
                    How it works &mdash; 

                  </div>
                  <div className="relative z-[1]">
                    {['Upload your CV in any format — PDF, DOCX or plain text.','Our AI parses your skills and experience in under 10 seconds.','Review the extracted profile and edit any field before analysis.','Get personalised role matches and career path recommendations.'].map((step,i)=>(
                      <div key={i} className={`flex items-start gap-3 ${i<3?'mb-[13px]':''}`}>
                        <span className="w-[26px] h-[26px] rounded-full shrink-0 bg-white text-[#7a3808] text-[10.5px] font-extrabold grid place-items-center mt-[1px] shadow-[0_2px_10px_rgba(0,0,0,0.22)]">{i+1}</span>
                        <span className="font-plusJakarta text-[12.5px] text-[rgba(255,240,215,0.95)] leading-[1.62] font-medium">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {topupError && (
            <div className="w-full mb-3 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span className="text-[13px] font-semibold text-rose-700 flex-1">{topupError}</span>
              <button onClick={onClearTopupError} className="text-rose-400 hover:text-rose-600">
                <X size={14} />
              </button>
            </div>
          )}

          <PostPaymentBanner
            currentStage={bannerStage}
            creditsRemaining={journeyCreditsRemaining}
            onCreditsClick={onOpenPayment}
            onStageClick={(stage) => {
              if (stage === 'RESULTS') {
                onOpenPayment?.();
              }
            }}
          />

          {/* ── Mode Tab Switcher — Manual Entry hidden ── */}

          {/* ── CV Mode Panel ── */}
          {activeTab==='cv' && (
            <div className="sr-app-card sr-card-in" style={{padding:30}}>
              <div style={{position:'relative',zIndex:1}}>

                {/* ── JOURNEY COMPLETE — shown when credits are exhausted ── */}
                {journeyComplete && (
                  <div style={{textAlign:'center',padding:'36px 24px',borderRadius:20,background:'linear-gradient(135deg,rgba(16,185,129,0.07),rgba(5,150,105,0.04))',border:'1px solid rgba(16,185,129,0.22)',marginBottom:24}}>
                    <div style={{width:56,height:56,borderRadius:999,background:'linear-gradient(135deg,#10b981,#059669)',display:'grid',placeItems:'center',margin:'0 auto 16px',boxShadow:'0 8px 24px rgba(16,185,129,0.30)',color:'white'}}>
                      <CheckCircle size={26}/>
                    </div>
                    <h3 style={{fontSize:19,fontWeight:800,color:'#065f46',margin:'0 0 8px',letterSpacing:'-0.02em'}}>Analysis Complete</h3>
                    <p style={{fontSize:14,color:'#047857',margin:'0 0 20px',lineHeight:1.7,maxWidth:440,marginLeft:'auto',marginRight:'auto'}}>
                      Your career analysis has been completed and your credit has been used. To start a new analysis with a different CV, you will need to complete a new payment.
                    </p>
                    <div style={{display:'inline-flex',alignItems:'center',gap:8,padding:'11px 22px',borderRadius:12,background:'linear-gradient(135deg,#7c3aed,#6366f1)',color:'white',fontSize:13,fontWeight:700,boxShadow:'0 6px 20px rgba(109,40,217,0.30)',cursor:'default'}}>
                      <AlertCircle size={15}/>
                      New payment required to upload another CV
                    </div>
                  </div>
                )}

                {/* ── UPLOAD CV — Section Head (hidden when journey complete) ── */}
                {!journeyComplete && <div style={SR.secHead('sh1')}>
                  <div style={SR.iconDot('a')}><Upload size={18}/></div>
                  <div>
                    <h3 style={{fontSize:17,fontWeight:700,letterSpacing:'-0.025em',color:'var(--text)',margin:0}}>Upload CV</h3>
                    <p style={{fontSize:13,color:'var(--muted)',margin:'3px 0 0',lineHeight:1.5}}>Let our AI extract your experience, skills and profile automatically &mdash; saving you time.</p>
                  </div>
                </div>}

                {/* ── IMPORTANT BANNER — Single red-highlighted sentence (centered) ── */}
                {!journeyComplete && (
                  <div style={{marginTop:16,marginBottom:16,display:'flex',justifyContent:'center'}}>
                    <div style={{
                      maxWidth:980,
                      width:'100%',
                      position:'relative',
                      borderRadius:16,
                      background:'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
                      border:'1.5px solid rgba(161,98,7,0.15)',
                      padding:'20px 24px',
                      boxShadow:'0 4px 24px rgba(161,98,7,0.08), 0 1px 6px rgba(161,98,7,0.04)',
                      backdropFilter:'blur(8px)',
                    }}>
                      {/* Premium accent bar */}
                      <div style={{
                        position:'absolute',
                        top:0,
                        left:0,
                        right:0,
                        height:3,
                        borderRadius:'16px 16px 0 0',
                        background:'linear-gradient(90deg, #f59e0b 0%, #d97706 50%, #f59e0b 100%)',
                        opacity:0.8
                      }} />
                      
                      {/* Icon and content container */}
                      <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
                        {/* Premium icon */}
                        <div style={{
                          width:40,
                          height:40,
                          borderRadius:12,
                          background:'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'center',
                          flexShrink:0,
                          boxShadow:'0 8px 16px rgba(245,158,11,0.25), 0 2px 8px rgba(217,119,6,0.15)',
                          border:'1px solid rgba(255,255,255,0.4)',
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        
                        {/* Text content */}
                        <div style={{flex:1,paddingTop:2}}>
                          {/* Heading */}
                          <div style={{
                            fontSize:15,
                            fontWeight:700,
                            color:'#78350f',
                            marginBottom:6,
                            letterSpacing:'-0.01em',
                            lineHeight:1.3,
                            fontFamily:'system-ui, -apple-system, "Segoe UI", sans-serif'
                          }}>
                            Premium AI Analysis – Single Credit Usage
                          </div>
                          
                          {/* Body text */}
                          <div style={{
                            fontSize:13.5,
                            fontWeight:500,
                            color:'#92400e',
                            lineHeight:1.6,
                            letterSpacing:'-0.005em',
                            fontFamily:'system-ui, -apple-system, "Segoe UI", sans-serif'
                          }}>
                            Please ensure your CV is professionally formatted and contains accurate information. Our advanced AI system will perform a comprehensive career analysis using{' '}
                            <span style={{
                              fontWeight:700,
                              color:'#78350f',
                              background:'rgba(251,191,36,0.2)',
                              padding:'1px 6px',
                              borderRadius:4,
                              whiteSpace:'nowrap'
                            }}>one credit</span>
                            {' '}per complete evaluation.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── LOCATION (hidden when journey complete) ──
                {!journeyComplete && (() => { const sd=SR.secDivider('linear-gradient(135deg,#6366f1,#4f46e5)','rgba(99,102,241,0.18)'); return (
                  <div style={sd.wrapper}>
                    <span style={sd.iconWrap}><MapPin size={13}/></span>
                    <span style={sd.label}>Location</span>
                  </div>
                ); })()} */}

                {/* Location selector — hidden when journey complete */}
                {!journeyComplete && <div style={{marginBottom:16,borderRadius:14,border:'1px solid rgba(99,102,241,0.18)',background:'linear-gradient(135deg,rgba(99,102,241,0.06),rgba(79,70,229,0.02))',padding:'14px 18px',display:'flex',alignItems:'center',gap:14}}>
                  <span style={{width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,#6366f1,#4f46e5)',display:'grid',placeItems:'center',color:'white',flexShrink:0,boxShadow:'0 4px 10px rgba(99,102,241,0.26)'}}>
                    <MapPin size={16}/>
                  </span>
                  <div style={{flex:1}}>
                    <label style={{fontSize:10.5,fontWeight:700,color:'rgba(79,70,229,0.8)',textTransform:'uppercase',letterSpacing:'0.08em',display:'block',marginBottom:4}}>Location <span style={{color:'#dc2626'}}>*</span></label>
                    <select
                      value={cvLocation}
                      onChange={e=>{setCvLocation(e.target.value);setCvUploadError('');}}
                      disabled={bannerStage === 'ANALYSIS'}
                      style={{width:'100%',padding:'8px 10px',borderRadius:10,border:'1.5px solid rgba(99,102,241,0.22)',background:'white',fontSize:13,fontWeight:600,color:'var(--text)',outline:'none',fontFamily:'inherit',cursor:'pointer',boxSizing:'border-box'}}
                    >
                      <option value="">Select location…</option>
                      {locationOptions.map(loc=>(
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                </div>}

                {/* Drop zone — hidden when journey complete */}
                {!journeyComplete && <div style={{border:`2px dashed ${cvUploading?'var(--accent)':'var(--input-border)'}`,borderRadius:18,padding:'22px 24px',textAlign:'center',background:'linear-gradient(180deg,rgba(255,255,255,0.85),var(--chip-bg))',cursor:cvUploading||bannerStage==='ANALYSIS'?'not-allowed':'pointer',transition:'all var(--tr)',opacity:cvUploading||bannerStage==='ANALYSIS'?0.5:1,pointerEvents:bannerStage==='ANALYSIS'?'none':'auto'}} onClick={()=>!cvUploading&&bannerStage!=='ANALYSIS'&&document.getElementById('srCvFileInput').click()}>
                  <input type="file" id="srCvFileInput" style={{display:'none'}} accept=".pdf,.doc,.docx,.ods,.txt" onChange={handleCvFileChange} disabled={cvUploading||bannerStage==='ANALYSIS'} />
                  <div style={{width:44,height:44,borderRadius:14,background:'var(--gradient-a)',display:'grid',placeItems:'center',margin:'0 auto 10px',boxShadow:'var(--shadow-md)',color:'white'}}>
                    <FileText size={20}/>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:'var(--text)',marginBottom:4}}>
                    {cvUploading ? 'Parsing your CV…' : <>Drop your CV here or <span style={{color:'var(--accent)'}}>browse files</span></>}
                  </div>
                  <div style={{fontSize:12,color:'var(--muted)'}}>PDF, DOCX, DOC, ODS or TXT &middot; Max 10 MB</div>
                  {cvUploading && (
                    <div style={{marginTop:10,height:3,borderRadius:999,background:'var(--chip-bg)',overflow:'hidden',maxWidth:200,margin:'10px auto 0'}}>
                      <div style={{height:'100%',width:'60%',borderRadius:999,background:'var(--gradient-a)',animation:'sr-pulse 1.4s ease-in-out infinite'}} />
                    </div>
                  )}
                </div>}

                {/* Upload error */}
                {cvUploadError && (
                  <div style={{marginTop:14,padding:'12px 16px',borderRadius:12,background:'rgba(220,38,38,0.07)',border:'1px solid rgba(220,38,38,0.22)',color:'#dc2626',fontSize:13,fontWeight:600,display:'flex',alignItems:'flex-start',gap:8}}>
                    <AlertCircle size={15} style={{flexShrink:0,marginTop:1}}/>
                    {cvUploadError}
                  </div>
                )}

                {/* ── Parsed CV Presentation ── */}
                {cvParsed && (
                  <div style={{marginTop:20}}>

                    {/* Warnings */}
                    {cvWarnings.length > 0 && (
                      <div style={{padding:'10px 16px',borderRadius:12,background:'rgba(234,179,8,0.07)',border:'1px solid rgba(234,179,8,0.25)',fontSize:12,color:'#92400e',marginBottom:16}}>
                        {cvWarnings.map((w,i)=><div key={i} style={{display:'flex',alignItems:'flex-start',gap:6}}><span style={{flexShrink:0}}>⚠</span><span>{w}</span></div>)}
                      </div>
                    )}

                    {/* ── EXPERIENCE & INDUSTRY ── */}
                    {(() => { const sd=SR.secDivider('linear-gradient(135deg,#3b82f6,#6366f1)','rgba(59,130,246,0.18)'); return (
                      <div style={sd.wrapper}>
                        <span style={sd.iconWrap}><Briefcase size={13}/></span>
                        <span style={sd.label}>Experience &amp; Industry</span>
                        <div style={sd.line}/>
                      </div>
                    ); })()}

                    {/* Experience · Industry — unified horizontal card */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0,borderRadius:18,border:'1px solid rgba(226,232,240,0.9)',background:'#ffffff',boxShadow:'0 2px 16px rgba(0,0,0,0.05)',marginBottom:16,overflow:'hidden'}}>

                      {/* Years of Experience */}
                      <div style={{display:'flex',flexDirection:'column',gap:10,padding:'18px 20px',borderRight:'1px solid rgba(226,232,240,0.7)',background:'linear-gradient(135deg,rgba(59,130,246,0.06),rgba(99,102,241,0.03))'}}>
                        <div style={{display:'flex',alignItems:'center',gap:9}}>
                          <span style={{width:32,height:32,borderRadius:9,background:'var(--gradient-a)',display:'grid',placeItems:'center',color:'white',flexShrink:0,boxShadow:'0 4px 10px rgba(59,130,246,0.28)'}}>
                            <Briefcase size={15}/>
                          </span>
                          <span style={{fontSize:10.5,fontWeight:700,color:'rgba(59,130,246,0.8)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Experience</span>
                        </div>
                        <div style={{fontSize:14,fontWeight:700,color:cvYearsOfExperience && cvYearsOfExperience !== '' ? '#1e1b4b' : '#94a3b8',lineHeight:1.3,letterSpacing:'-0.01em',minHeight:28}}>
                          {cvYearsOfExperience && cvYearsOfExperience !== '' ? formatYearsAndMonths(cvYearsOfExperience) : 'Not detected'}
                        </div>
                      </div>

                      {/* Industry */}
                      <div style={{display:'flex',flexDirection:'column',gap:10,padding:'18px 20px',background:'linear-gradient(135deg,rgba(16,185,129,0.06),rgba(5,150,105,0.02))'}}>
                        <div style={{display:'flex',alignItems:'center',gap:9}}>
                          <span style={{width:32,height:32,borderRadius:9,background:'linear-gradient(135deg,#10b981,#059669)',display:'grid',placeItems:'center',color:'white',flexShrink:0,boxShadow:'0 4px 10px rgba(16,185,129,0.26)'}}>
                            <Target size={15}/>
                          </span>
                          <span style={{fontSize:10.5,fontWeight:700,color:'rgba(5,150,105,0.8)',textTransform:'uppercase',letterSpacing:'0.08em'}}>Industry</span>
                        </div>
                        <div style={{fontSize:14,fontWeight:700,color:'#1e1b4b',lineHeight:1.3,minHeight:28}}>
                          {cvBestIndustry || '—'}
                        </div>
                      </div>

                    </div>

                    {/* ── CURRENT ROLE IDENTIFIED ── */}
                    {(() => { const sd=SR.secDivider('linear-gradient(135deg,#0ea5e9,#38bdf8)','rgba(14,165,233,0.18)'); return (
                      <div style={sd.wrapper}>
                        <span style={sd.iconWrap}><Compass size={13}/></span>
                        <span style={sd.label}>Current Role Identified</span>
                        <div style={sd.line}/>
                      </div>
                    ); })()}

                    {/* Current roles identified */}
                    <div style={{border:'1px solid rgba(226,232,240,0.85)',borderRadius:16,overflow:'hidden',background:'rgba(255,255,255,0.97)',boxShadow:'0 1px 8px rgba(0,0,0,0.05)',marginBottom:16}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'linear-gradient(135deg,rgba(14,165,233,0.08),rgba(56,189,248,0.04))',borderBottom:'1px solid rgba(226,232,240,0.7)'}}>
                        <span style={{width:26,height:26,borderRadius:7,background:'linear-gradient(135deg,#0ea5e9,#38bdf8)',display:'grid',placeItems:'center',color:'white',flexShrink:0}}><Compass size={12}/></span>
                        <span style={{fontSize:12.5,fontWeight:700,color:'var(--text)',flex:1}}>Current roles identified</span>
                        <span style={{fontSize:11,fontWeight:700,color:'#0369a1',background:'rgba(14,165,233,0.1)',padding:'2px 8px',borderRadius:999,border:'1px solid rgba(14,165,233,0.18)'}}>{cvCurrentRoles.split(',').map(s=>s.trim()).filter(Boolean).length}</span>
                      </div>
                      <div style={{padding:'12px 14px',display:'flex',flexWrap:'wrap',gap:6,minHeight:58,alignContent:'flex-start'}}>
                        {cvCurrentRoles.split(',').map(s=>s.trim()).filter(Boolean).length===0 && <span style={{color:'var(--muted)',fontSize:12,fontStyle:'italic'}}>None detected</span>}
                        {cvCurrentRoles.split(',').map(s=>s.trim()).filter(Boolean).map(chip=>(
                          <span key={chip} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px 4px 11px',borderRadius:999,background:'linear-gradient(135deg,rgba(14,165,233,0.1),rgba(56,189,248,0.07))',border:'1px solid rgba(14,165,233,0.2)',color:'#0369a1',fontSize:12,fontWeight:700}}>
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* ── TOOLS & TECHNOLOGIES ── */}
                    {(() => { const sd=SR.secDivider('linear-gradient(135deg,#f59e0b,#d97706)','rgba(245,158,11,0.18)'); return (
                      <div style={sd.wrapper}>
                        <span style={sd.iconWrap}><Wrench size={13}/></span>
                        <span style={sd.label}>Tools &amp; Technologies</span>
                        <div style={sd.line}/>
                      </div>
                    ); })()}

                    {/* Dynamic category cards grid */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(256px,1fr))',gap:14}}>

                      {/* Dynamic category cards */}
                      {(() => {
                        const CATEGORY_STYLES = {
                          programming_language: { label: 'Programming Languages', icon: Cpu, gradient: ['59,130,246','99,102,241'], text: '#1d4ed8', bg: 'var(--gradient-a)' },
                          database:             { label: 'Databases',             icon: Database, gradient: ['16,185,129','5,150,105'], text: '#047857', bg: 'linear-gradient(135deg,#10b981,#059669)' },
                          framework:            { label: 'Frameworks',            icon: Layers, gradient: ['236,72,153','219,39,119'], text: '#9d174d', bg: 'linear-gradient(135deg,#ec4899,#db2777)' },
                          library:              { label: 'Libraries',             icon: Package, gradient: ['168,85,247','139,92,246'], text: '#7c3aed', bg: 'linear-gradient(135deg,#a855f7,#8b5cf6)' },
                          software:             { label: 'Software',              icon: AppWindow, gradient: ['245,158,11','217,119,6'], text: '#92400e', bg: 'linear-gradient(135deg,#f59e0b,#d97706)' },
                          platform:             { label: 'Platforms',             icon: Server, gradient: ['139,92,246','124,58,237'], text: '#5b21b6', bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
                          cloud:                { label: 'Cloud',                 icon: Cloud, gradient: ['6,182,212','8,145,178'], text: '#0e7490', bg: 'linear-gradient(135deg,#06b6d4,#0891b2)' },
                          devops:               { label: 'DevOps',                icon: Terminal, gradient: ['34,197,94','22,163,74'], text: '#15803d', bg: 'linear-gradient(135deg,#22c55e,#16a34a)' },
                          data:                 { label: 'Data',                  icon: BarChart, gradient: ['14,165,233','56,189,248'], text: '#0369a1', bg: 'linear-gradient(135deg,#0ea5e9,#38bdf8)' },
                          technology:           { label: 'Technology',            icon: Cpu, gradient: ['99,102,241','79,70,229'], text: '#3730a3', bg: 'linear-gradient(135deg,#6366f1,#4f46e5)' },
                          tool:                 { label: 'Other Tools',           icon: Wrench, gradient: ['107,114,128','75,85,99'], text: '#374151', bg: 'linear-gradient(135deg,#6b7280,#4b5563)' },
                        };
                        const DEFAULT_STYLE = { icon: Wrench, gradient: ['107,114,128','75,85,99'], text: '#374151', bg: 'linear-gradient(135deg,#6b7280,#4b5563)' };

                        const orderedKeys = cvToolCategories.length > 0
                          ? cvToolCategories
                          : Object.keys(cvCategorizedTools);

                        return orderedKeys.map(catKey => {
                          const items = cvCategorizedTools[catKey] || [];
                          if (items.length === 0) return null;
                          const style = CATEGORY_STYLES[catKey] || DEFAULT_STYLE;
                          const displayLabel = style.label || catKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          const IconComp = style.icon;
                          const [c1, c2] = style.gradient;
                          return (
                            <div key={catKey} style={{border:'1px solid rgba(226,232,240,0.85)',borderRadius:16,overflow:'hidden',background:'rgba(255,255,255,0.97)',boxShadow:'0 1px 8px rgba(0,0,0,0.05)'}}>
                              <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:`linear-gradient(135deg,rgba(${c1},0.08),rgba(${c2},0.04))`,borderBottom:'1px solid rgba(226,232,240,0.7)'}}>
                                <span style={{width:26,height:26,borderRadius:7,background:style.bg,display:'grid',placeItems:'center',color:'white',flexShrink:0}}><IconComp size={12}/></span>
                                <span style={{fontSize:12.5,fontWeight:700,color:'var(--text)',flex:1}}>{displayLabel}</span>
                                <span style={{fontSize:11,fontWeight:700,color:style.text,background:`rgba(${c1},0.1)`,padding:'2px 8px',borderRadius:999,border:`1px solid rgba(${c1},0.18)`}}>{items.length}</span>
                              </div>
                              <div style={{padding:'12px 14px',display:'flex',flexWrap:'wrap',gap:6,minHeight:58,alignContent:'flex-start'}}>
                                {items.map(chip=>(
                                  <span key={chip} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px 4px 11px',borderRadius:999,background:`linear-gradient(135deg,rgba(${c1},0.1),rgba(${c2},0.07))`,border:`1px solid rgba(${c1},0.2)`,color:style.text,fontSize:12,fontWeight:700}}>
                                    {chip}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        });
                      })()}

                    </div>{/* end tools grid */}

                    {/* ── EDC — Education, Development & Certifications ── */}
                    {(() => { const sd=SR.secDivider('linear-gradient(135deg,#f59e0b,#d97706)','rgba(245,158,11,0.20)'); return (
                      <div style={sd.wrapper}>
                        <span style={sd.iconWrap}><GraduationCap size={13}/></span>
                        <span style={sd.label}>EDC — Education, Development &amp; Certifications</span>
                        <div style={sd.line}/>
                      </div>
                    ); })()}

                    {/* Certifications — full-width */}
                    <div style={{border:'1px solid rgba(226,232,240,0.85)',borderRadius:16,overflow:'hidden',background:'rgba(255,255,255,0.97)',boxShadow:'0 1px 8px rgba(0,0,0,0.05)',marginBottom:4}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'linear-gradient(135deg,rgba(245,158,11,0.07),rgba(217,119,6,0.03))',borderBottom:'1px solid rgba(226,232,240,0.7)'}}>
                        <span style={{width:26,height:26,borderRadius:7,background:'linear-gradient(135deg,#f59e0b,#d97706)',display:'grid',placeItems:'center',color:'white',flexShrink:0}}><GraduationCap size={12}/></span>
                        <span style={{fontSize:12.5,fontWeight:700,color:'var(--text)',flex:1}}>Certifications</span>
                        <span style={{fontSize:11,fontWeight:700,color:'#92400e',background:'rgba(245,158,11,0.12)',padding:'2px 8px',borderRadius:999,border:'1px solid rgba(245,158,11,0.25)'}}>{cvCertifications.split(',').map(s=>s.trim()).filter(Boolean).length}</span>
                      </div>
                      <div style={{padding:'12px 14px',display:'flex',flexWrap:'wrap',gap:6,minHeight:58,alignContent:'flex-start'}}>
                        {cvCertifications.split(',').map(s=>s.trim()).filter(Boolean).length===0 && <span style={{color:'var(--muted)',fontSize:12,fontStyle:'italic'}}>None detected — add below</span>}
                        {cvCertifications.split(',').map(s=>s.trim()).filter(Boolean).map(chip=>(
                          <span key={chip} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 10px 4px 11px',borderRadius:999,background:'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,119,6,0.07))',border:'1px solid rgba(245,158,11,0.25)',color:'#92400e',fontSize:12,fontWeight:700}}>
                            {chip}
                            <button type="button" onClick={()=>setCvCertifications(cvCertifications.split(',').map(s=>s.trim()).filter(Boolean).filter(c=>c!==chip).join(', '))} style={{display:'grid',placeItems:'center',width:15,height:15,borderRadius:999,background:'rgba(245,158,11,0.22)',border:'none',cursor:'pointer',padding:0,color:'#92400e',flexShrink:0,marginLeft:2}}><X size={8}/></button>
                          </span>
                        ))}
                      </div>
                      <div style={{padding:'8px 12px 12px',borderTop:'1px solid rgba(226,232,240,0.5)',display:'flex',gap:7,alignItems:'center'}}>
                        <input style={{flex:1,padding:'7px 11px',borderRadius:9,border:'1px solid var(--input-border)',background:'var(--input-bg)',fontSize:12.5,fontFamily:'inherit',color:'var(--text)',outline:'none'}} placeholder="Add a certification…" value={cvCertInput} onChange={e=>setCvCertInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const v=cvCertInput.trim();const ex=cvCertifications.split(',').map(s=>s.trim()).filter(Boolean);if(v&&!ex.includes(v))setCvCertifications([...ex,v].join(', '));setCvCertInput('');}}} />
                        <button type="button" onClick={()=>{const v=cvCertInput.trim();const ex=cvCertifications.split(',').map(s=>s.trim()).filter(Boolean);if(v&&!ex.includes(v))setCvCertifications([...ex,v].join(', '));setCvCertInput('');}} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'7px 12px',borderRadius:9,background:'linear-gradient(135deg,#f59e0b,#d97706)',border:'none',color:'white',fontSize:12,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}><Plus size={11}/> Add</button>
                      </div>
                    </div>

                    {/* ── SKILLS ── */}
                    {(() => { const sd=SR.secDivider('linear-gradient(135deg,#7c3aed,#4f46e5)','rgba(109,40,217,0.18)'); return (
                      <div style={sd.wrapper}>
                        <span style={sd.iconWrap}><Brain size={13}/></span>
                        <span style={sd.label}>Skills</span>
                        <div style={sd.line}/>
                      </div>
                    ); })()}

                    {/* ── Skills — full-width ultra-premium card ── */}
                    <div style={{position:'relative',border:'1px solid rgba(109,40,217,0.14)',borderRadius:20,background:'#ffffff',boxShadow:'0 4px 32px rgba(109,40,217,0.08),0 1px 6px rgba(0,0,0,0.04)',marginTop:18,overflow:'hidden'}}>
                      {/* Left gradient accent bar */}
                      <div style={{position:'absolute',left:0,top:0,bottom:0,width:4,background:'linear-gradient(180deg,#7c3aed 0%,#6366f1 40%,#4f46e5 70%,#818cf8 100%)',zIndex:2,borderRadius:'20px 0 0 20px'}}/>

                      {/* Header */}
                      <div style={{position:'relative',display:'flex',alignItems:'center',gap:14,padding:'18px 24px 18px 26px',background:'linear-gradient(135deg,#faf8ff 0%,#f5f3ff 50%,#ede9fe 100%)',borderBottom:'1px solid rgba(109,40,217,0.09)',overflow:'hidden'}}>
                        {/* Decorative glow */}
                        <div style={{position:'absolute',top:-30,right:-30,width:120,height:120,borderRadius:'50%',background:'radial-gradient(circle,rgba(124,58,237,0.08) 0%,transparent 70%)',pointerEvents:'none'}}/>
                        <span style={{width:40,height:40,borderRadius:12,background:'linear-gradient(135deg,#7c3aed,#4f46e5)',display:'grid',placeItems:'center',color:'white',flexShrink:0,boxShadow:'0 6px 20px rgba(109,40,217,0.35)'}}>
                          <Brain size={18}/>
                        </span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:15,fontWeight:800,color:'#1e1b4b',letterSpacing:'-0.02em',lineHeight:1.25}}>Skills</div>
                          <div style={{fontSize:11.5,color:'#7c3aed',fontWeight:600,marginTop:2,letterSpacing:'0.01em'}}>AI-extracted professional competencies</div>
                        </div>
                        <span style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:10.5,fontWeight:800,padding:'5px 14px',borderRadius:999,background:'linear-gradient(135deg,rgba(124,58,237,0.12),rgba(99,102,241,0.08))',border:'1px solid rgba(109,40,217,0.2)',color:'#5b21b6',letterSpacing:'0.04em',textTransform:'uppercase',whiteSpace:'nowrap',flexShrink:0}}>
                          <Sparkles size={10}/> {filteredCvSkills.length} detected
                        </span>
                      </div>

                      {/* Skills chips area */}
                      <div style={{padding:'20px 24px 16px 26px',display:'flex',flexWrap:'wrap',gap:8,minHeight:72,alignContent:'flex-start',background:'linear-gradient(180deg,rgba(250,248,255,0.5) 0%,#fff 50%)'}}>
                        {filteredCvSkills.length===0 && (
                          <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 18px',borderRadius:12,background:'rgba(109,40,217,0.04)',border:'1px dashed rgba(109,40,217,0.2)',width:'100%'}}>
                            <Brain size={14} style={{color:'#a78bfa',flexShrink:0}}/>
                            <span style={{color:'#7c3aed',fontSize:12.5,fontWeight:600,fontStyle:'italic'}}>No skills detected yet — add skills below or upload a CV</span>
                          </div>
                        )}
                        {filteredCvSkills.map(chip=>(
                          <span key={chip} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'6px 10px 6px 14px',borderRadius:10,background:'linear-gradient(135deg,rgba(124,58,237,0.07),rgba(99,102,241,0.04))',border:'1px solid rgba(109,40,217,0.18)',color:'#4c1d95',fontSize:12.5,fontWeight:700,letterSpacing:'-0.005em',transition:'all 0.15s ease',boxShadow:'0 1px 3px rgba(109,40,217,0.06)'}}>
                            <span style={{width:6,height:6,borderRadius:999,background:'linear-gradient(135deg,#7c3aed,#6366f1)',flexShrink:0,boxShadow:'0 0 6px rgba(124,58,237,0.4)'}}/>
                            {chip}
                            <button type="button" onClick={()=>setCvSkills(cvSkills.split(',').map(s=>s.trim()).filter(Boolean).filter(c=>c!==chip).join(', '))} style={{display:'grid',placeItems:'center',width:18,height:18,borderRadius:6,background:'rgba(109,40,217,0.1)',border:'1px solid rgba(109,40,217,0.15)',cursor:'pointer',padding:0,color:'#7c3aed',flexShrink:0,marginLeft:2,transition:'all 0.15s ease'}}><X size={9}/></button>
                          </span>
                        ))}
                      </div>

                      {/* Add skill input bar */}
                      <div style={{padding:'12px 24px 16px 26px',borderTop:'1px solid rgba(109,40,217,0.07)',display:'flex',gap:10,alignItems:'center',background:'linear-gradient(135deg,rgba(250,248,255,0.7),rgba(245,243,255,0.4))'}}>
                        <div style={{flex:1,position:'relative'}}>
                          <input
                            style={{width:'100%',padding:'10px 14px 10px 36px',borderRadius:12,border:'1.5px solid rgba(109,40,217,0.18)',background:'white',fontSize:13,fontFamily:'inherit',color:'var(--text)',outline:'none',transition:'border-color 0.15s ease,box-shadow 0.15s ease'}}
                            placeholder="Type a skill and press Enter…"
                            value={cvSkillInput}
                            onChange={e=>setCvSkillInput(e.target.value)}
                            onFocus={e=>{e.target.style.borderColor='rgba(124,58,237,0.45)';e.target.style.boxShadow='0 0 0 3px rgba(124,58,237,0.08)';}}
                            onBlur={e=>{e.target.style.borderColor='rgba(109,40,217,0.18)';e.target.style.boxShadow='none';}}
                            onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const v=cvSkillInput.trim();const ex=cvSkills.split(',').map(s=>s.trim()).filter(Boolean);if(v&&!ex.includes(v))setCvSkills([...ex,v].join(', '));setCvSkillInput('');}}}
                          />
                          <Brain size={13} style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',color:'#a78bfa',pointerEvents:'none'}}/>
                        </div>
                        <button type="button" onClick={()=>{const v=cvSkillInput.trim();const ex=cvSkills.split(',').map(s=>s.trim()).filter(Boolean);if(v&&!ex.includes(v))setCvSkills([...ex,v].join(', '));setCvSkillInput('');}} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'10px 18px',borderRadius:12,background:'linear-gradient(135deg,#7c3aed,#4f46e5)',border:'none',color:'white',fontSize:12.5,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0,boxShadow:'0 4px 14px rgba(109,40,217,0.3)',letterSpacing:'-0.01em',transition:'all 0.15s ease'}}><Plus size={13}/> Add Skill</button>
                      </div>
                    </div>

                    {/* ── SUGGESTED FUTURE ROLES ── */}
                    {(() => { const sd=SR.secDivider('linear-gradient(135deg,#f97316,#ea580c)','rgba(249,115,22,0.20)'); return (
                      <div style={sd.wrapper}>
                        <span style={sd.iconWrap}><TrendingUp size={13}/></span>
                        <span style={sd.label}>Suggested Future Roles</span>
                        <div style={sd.line}/>
                      </div>
                    ); })()}

                    {/* Loading state */}
                    {cvFutureRolesLoading && (
                      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'28px 20px',borderRadius:16,border:'1px solid rgba(249,115,22,0.18)',background:'linear-gradient(135deg,rgba(249,115,22,0.04),rgba(234,88,12,0.02))'}}>
                        <Loader2 size={18} style={{color:'#ea580c',animation:'spin 1s linear infinite'}}/>
                        <span style={{fontSize:13,fontWeight:600,color:'#9a3412'}}>Analysing your profile with OpenAI…</span>
                      </div>
                    )}

                    {/* Error state */}
                    {!cvFutureRolesLoading && cvFutureRolesError && (
                      <div style={{padding:'12px 16px',borderRadius:12,background:'rgba(220,38,38,0.07)',border:'1px solid rgba(220,38,38,0.22)',color:'#dc2626',fontSize:13,fontWeight:600,display:'flex',alignItems:'flex-start',gap:8}}>
                        <AlertCircle size={15} style={{flexShrink:0,marginTop:1}}/>
                        {cvFutureRolesError}
                      </div>
                    )}

                    {/* Results */}
                    {!cvFutureRolesLoading && !cvFutureRolesError && cvFutureRoles.length > 0 && (
                      <Card className="border-orange-200/60 shadow-md overflow-hidden">
                        <CardHeader className="pb-3 bg-gradient-to-br from-orange-50 via-amber-50/50 to-white border-b border-orange-100/60">
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3">
                              <span className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-orange-500 to-amber-600 grid place-items-center text-white shadow-md shrink-0">
                                <TrendingUp size={16}/>
                              </span>
                              <div>
                                <CardTitle className="text-[15px] font-extrabold tracking-tight text-gray-900">Suggested Future Roles</CardTitle>
                                <p className="text-[11.5px] text-orange-700 font-semibold mt-0.5">AI-inferred career progression from your profile</p>
                              </div>
                            </div>
                            {cvInferredSeniority && (
                              <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-800 font-bold text-[11px] px-3 py-1 shrink-0">
                                Seniority: {cvInferredSeniority}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                          {/* Role radio buttons */}
                          <RadioGroup value={cvSelectedFutureRole} onValueChange={setCvSelectedFutureRole} className="space-y-2.5">
                            {cvFutureRoles.map(role => {
                              const isSelected = cvSelectedFutureRole === role;
                              const confidence = cvConfidenceScores[role];
                              return (
                                <label
                                  key={role}
                                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-orange-50 to-amber-50/40 border-orange-300/70 shadow-sm'
                                      : 'bg-white border-gray-200/80 hover:border-orange-200 hover:bg-orange-50/30'
                                  }`}
                                >
                                  <RadioGroupItem
                                    value={role}
                                    className="data-[state=checked]:border-orange-600 data-[state=checked]:text-orange-600"
                                  />
                                  <span className={`flex-1 text-[13px] font-bold ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {role}
                                  </span>
                                  {confidence != null && (
                                    <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
                                      confidence >= 0.7
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : confidence >= 0.4
                                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                                          : 'bg-gray-50 text-gray-500 border-gray-200'
                                    }`}>
                                      {Math.round(confidence * 100)}%
                                    </span>
                                  )}
                                </label>
                              );
                            })}
                          </RadioGroup>

                          {/* Why suggested — read-only textarea for selected role */}
                          {cvSelectedFutureRole && cvWhySuggested[cvSelectedFutureRole] && (
                            <div className="space-y-2">
                              <Label className="text-[11.5px] font-bold text-gray-500 uppercase tracking-wider">Why Suggested</Label>
                              <Textarea
                                readOnly
                                className="min-h-[120px] text-[12.5px] leading-relaxed font-medium text-gray-700 bg-orange-50/40 border-orange-200/60 resize-none focus-visible:ring-orange-300"
                                value={cvWhySuggested[cvSelectedFutureRole]}
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                  </div>
                )}

                {/* What to extract cards — hidden once CV is parsed */}
                {!cvParsed && <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginTop:16}}>
                  {[
                    { icon:<Brain size={14}/>, label:'Skills & Tools', iconBg:'linear-gradient(135deg,#6366f1,#4f46e5)', cardBg:'linear-gradient(135deg,rgba(99,102,241,0.18) 0%,rgba(139,92,246,0.12) 60%,rgba(79,70,229,0.08) 100%)', border:'rgba(99,102,241,0.32)', shadow:'0 4px 18px rgba(99,102,241,0.18),0 1px 4px rgba(99,102,241,0.10)', textColor:'#3730a3', dot:'rgba(99,102,241,0.35)' },
                    { icon:<Briefcase size={14}/>, label:'Work History', iconBg:'linear-gradient(135deg,#0ea5e9,#0284c7)', cardBg:'linear-gradient(135deg,rgba(14,165,233,0.18) 0%,rgba(56,189,248,0.12) 60%,rgba(2,132,199,0.08) 100%)', border:'rgba(14,165,233,0.32)', shadow:'0 4px 18px rgba(14,165,233,0.18),0 1px 4px rgba(14,165,233,0.10)', textColor:'#0369a1', dot:'rgba(14,165,233,0.35)' },
                    { icon:<GraduationCap size={14}/>, label:'Education', iconBg:'linear-gradient(135deg,#10b981,#059669)', cardBg:'linear-gradient(135deg,rgba(16,185,129,0.18) 0%,rgba(52,211,153,0.12) 60%,rgba(5,150,105,0.08) 100%)', border:'rgba(16,185,129,0.32)', shadow:'0 4px 18px rgba(16,185,129,0.18),0 1px 4px rgba(16,185,129,0.10)', textColor:'#047857', dot:'rgba(16,185,129,0.35)' },
                    { icon:<Target size={14}/>, label:'Career Goals', iconBg:'linear-gradient(135deg,#f59e0b,#d97706)', cardBg:'linear-gradient(135deg,rgba(245,158,11,0.18) 0%,rgba(251,191,36,0.12) 60%,rgba(217,119,6,0.08) 100%)', border:'rgba(245,158,11,0.35)', shadow:'0 4px 18px rgba(245,158,11,0.18),0 1px 4px rgba(245,158,11,0.10)', textColor:'#92400e', dot:'rgba(245,158,11,0.40)' },
                  ].map(({icon,label,iconBg,cardBg,border,shadow,textColor,dot})=>(
                    <div key={label} style={{display:'flex',alignItems:'center',gap:11,padding:'13px 15px',borderRadius:14,background:cardBg,border:`1px solid ${border}`,boxShadow:shadow,backdropFilter:'blur(4px)'}}>
                      <span style={{width:32,height:32,borderRadius:9,background:iconBg,display:'grid',placeItems:'center',color:'white',flexShrink:0,boxShadow:`0 4px 10px ${dot}`}}>{icon}</span>
                      <span style={{fontSize:12.5,fontWeight:700,color:textColor,letterSpacing:'-0.01em'}}>{label}</span>
                    </div>
                  ))}
                </div>}

                {/* Agree checkbox — hidden when journey complete */}
                {!journeyComplete && <div
                  onClick={() => bannerStage !== 'ANALYSIS' && setAgreed(v => !v)}
                  className={`relative overflow-hidden flex items-start gap-[12px] mt-[18px] px-[16px] py-[14px] rounded-[16px] cursor-pointer select-none transition-all duration-200 before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-[1px] before:pointer-events-none ${
                    agreed
                      ? 'bg-[linear-gradient(135deg,rgba(79,125,243,0.13)_0%,rgba(99,102,241,0.10)_50%,rgba(124,58,237,0.08)_100%)] border border-[rgba(99,102,241,0.40)] shadow-[0_2px_16px_rgba(79,125,243,0.18),inset_0_1px_0_rgba(255,255,255,0.70)] before:bg-[linear-gradient(90deg,transparent,rgba(99,102,241,0.55),transparent)]'
                      : 'bg-[rgba(255,255,255,0.60)] border border-[rgba(148,163,184,0.35)] shadow-[0_1px_6px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.80)] before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.80),transparent)]'
                  }`}
                >
                  {/* Premium checkmark box */}
                  <div className={`shrink-0 mt-[1px] w-[20px] h-[20px] rounded-[6px] grid place-items-center transition-all duration-200 ${
                    agreed
                      ? 'bg-[linear-gradient(135deg,#4f7df3,#7c3aed)] shadow-[0_2px_8px_rgba(79,125,243,0.55),inset_0_1px_0_rgba(255,255,255,0.30)]'
                      : 'bg-white border-2 border-[rgba(148,163,184,0.55)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.08)]'
                  }`}>
                    {agreed && (
                      <svg className="w-[11px] h-[11px]" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2 6.5L4.5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="font-plusJakarta text-[12.5px] leading-[1.60] tracking-[0.005em]">
                    <strong className={`font-semibold ${agreed ? 'text-[#0f172a]' : 'text-[#475569]'}`}>I agree</strong>
                    <span className={agreed ? ' text-[#1e293b]' : ' text-[#64748b]'}> to submit this profile for AI analysis and role matching.{' '}</span>
                    <span className={agreed ? 'text-[#475569]' : 'text-[#94a3b8]'}>Data is processed in-session only and never shared.</span>
                  </span>
                </div>}

                {/* Actions — hidden when journey complete */}
                {!journeyComplete && <div className="sr-actions" style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:12,flexWrap:'wrap',padding:'22px 26px',marginTop:16}}>
                  <div style={{flex:1,fontSize:12,color:'var(--muted)',fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
                    <Shield size={13}/> Your data stays private and secure.
                  </div>
                  <button
                    type="button"
                    style={SR.btnPrimary((!cvContent&&!cvParsed)||isLoading||!agreed||(cvParsed&&(!cvSelectedFutureRole||cvAnalysisPrecomputing)))}
                    disabled={(!cvContent&&!cvParsed)||isLoading||!agreed||(cvParsed&&(!cvSelectedFutureRole||cvAnalysisPrecomputing))}
                    onClick={async ()=>{
                      const roleAsGoal = cvSelectedFutureRole || careerGoal;
                      if (!roleAsGoal) return;
                      setCareerGoal(roleAsGoal);
                      setIsLoading(true);
                      setCvAnalysisPrecomputing(true);
                      setCvPrecomputeError('');
                      if (typeof window !== 'undefined') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                      try {
                        let result = null;
                        const regionVal = cvLocation || region || 'Global';
                        
                        // Tier 1: Check useranalysis table for previously saved analyses
                        try {
                          const cachedAnalysisRes = await fetch('/api/fastapi/get-cached-analysis', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              candidateId: userData?.id,
                              targetRole: roleAsGoal,
                              region: regionVal,
                            }),
                          }).then(r => r.json());

                          if (cachedAnalysisRes.success && cachedAnalysisRes.cached && cachedAnalysisRes.data) {
                            // Validate that cached data is complete
                            if (isAnalysisDataComplete(cachedAnalysisRes.data)) {
                              result = cachedAnalysisRes.data;
                              console.log('[GetAnalysis] Tier 1 (useranalysis table) hit with valid data from', cachedAnalysisRes.metadata?.createdAt);
                            } else {
                              console.info('[GetAnalysis] Tier 1 (useranalysis table) hit but data is incomplete/blank — continuing to Tier 2');
                            }
                          }
                        } catch (tier1Err) {
                          console.info('[GetAnalysis] Tier 1 check failed, continuing to Tier 2:', tier1Err?.message);
                        }

                        // Tier 2: Try cache-first (Redis → PG → session)
                        if (!result || !result.tabs || !isAnalysisDataComplete(result)) {
                          try {
                            result = await fetchRoleAnalysisCacheFirst(roleAsGoal, regionVal, roleAsGoal, false, cvWhySuggested[roleAsGoal] || '');
                            // Validate Redis/cache data
                            if (isAnalysisDataComplete(result)) {
                              console.log('[GetAnalysis] Tier 2 (cache-first) hit with valid data — source:', result?._source);
                            } else {
                              console.info('[GetAnalysis] Tier 2 (cache-first) hit but data is incomplete/blank — continuing to Tier 3');
                              result = null;
                            }
                          } catch (cacheMiss) {
                            console.info('[GetAnalysis] Tier 2 miss, continuing to Tier 3 (FastAPI):', cacheMiss?.message);
                          }
                        }

                        // Tier 3: Fallback to FastAPI
                        if (!result || !result.tabs || !isAnalysisDataComplete(result)) {
                          console.info('[GetAnalysis] Calling Tier 3 (FastAPI GetAnalysis)');
                          const allTools = Object.values(cvCategorizedTools).flat().filter(Boolean);
                          const analysisPayload = {
                            yearsOfExperience: cvYearsOfExperience || '',
                            industry: cvBestIndustry || '',
                            currentRoles: cvCurrentRoles || '',
                            tools: allTools.join(', '),
                            certifications: cvCertifications || '',
                            skills: cvSkills || '',
                            suggestedFutureRoles: [{
                              role: roleAsGoal,
                              whySuggested: cvWhySuggested[roleAsGoal] || '',
                            }],
                            region: regionVal,
                            comparisonCareerGoals: [],
                          };
                          result = await getAnalysisFromFastAPI(
                            analysisPayload,
                            regionVal,
                            roleAsGoal,
                          );
                          console.log('[GetAnalysis] Tier 3 (FastAPI) success');
                        }

                        setCvAnalysisPrecomputed(true);
                        if (!result || !result.tabs) {
                          throw new Error('Analysis response has invalid structure — missing tabs');
                        }
                        try {
                          await setFlag('analysisCompleted', true);
                        } catch (e) {
                          console.warn('Failed to persist analysis flag', e);
                        }

                        // Advance journey ANALYSIS → RESULTS and consume the credit atomically
                        if (userData?.id) {
                          fetch('/api/fastapi/advance-journey-next', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ candidateId: userData.id }),
                          })
                            .then(r => r.json())
                            .then(r => {
                              if (r?.currentStage) setBannerStage(r.currentStage);
                              const newCredits = r?.user_journey?.creditsRemaining ?? r?.creditsRemaining;
                              setJourneyCreditsRemaining(newCredits != null ? newCredits : 0);
                            })
                            .catch(err => {
                              console.warn('[advance-journey RESULTS] Failed:', err);
                              setBannerStage('RESULTS');
                              setJourneyCreditsRemaining(0);
                            });
                        } else {
                          setBannerStage('RESULTS');
                          setJourneyCreditsRemaining(0);
                        }

                        setAnalysisData(result);
                        
                        // Save analysis to database for returning users to access at RESULTS stage
                        if (userData?.id && roleAsGoal && result) {
                          fetch('/api/fastapi/save-api-response', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              candidateId: userData.id,
                              targetRole: roleAsGoal,
                              region: regionVal,
                              analysis: result,
                              whySuggested: cvWhySuggested[roleAsGoal] || `Analysis for ${roleAsGoal} role transition`,
                              triggeredFrom: 'hero',
                            }),
                          })
                            .then(r => r.json())
                            .then(r => {
                              if (r?.success) {
                                console.log('[GetAnalysis] Analysis saved to database for future retrieval');
                              } else {
                                console.warn('[GetAnalysis] Failed to save analysis:', r?.error);
                              }
                            })
                            .catch(err => console.warn('[GetAnalysis] Error saving analysis to database:', err));
                        }
                      } catch (analysisErr) {
                        console.warn('[GetAnalysis] Failed:', analysisErr);
                        setCvPrecomputeError(analysisErr?.message || 'Analysis failed');
                        setErrorModal({
                          isOpen: true,
                          type: 'general_error',
                          title: 'Analysis Failed',
                          message: `Could not generate analysis for "${roleAsGoal}". ${analysisErr?.message || 'Please try again.'}`
                        });
                      } finally {
                        setCvAnalysisPrecomputing(false);
                        setIsLoading(false);
                      }
                    }}
                  >
                    {isLoading ? <Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/> : <Zap size={16}/>}
                    {cvAnalysisPrecomputing ? 'Preparing Analysis...' : cvParsed ? 'Get Analysis' : 'Analyse CV'}
                  </button>
                </div>}
              </div>
            </div>
          )}

          {/* ── Manual Entry Panel ── */}
          {activeTab==='manual' && (
            <form onSubmit={handleManualResumeSubmit} noValidate>

              {/* Section 1: Basic Info */}
              <div className="sr-section sr-card-in">
                <div style={SR.secHead('sh1')}>
                  <div style={SR.iconDot('a')}><User size={18}/></div>
                  <div>
                    <div style={{fontSize:17,fontWeight:700,letterSpacing:'-0.025em',color:'var(--text)'}}>Basic Information</div>
                    <div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>Your personal contact details</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
                  <div>
                    <label style={SR.label}><User size={12} style={{color:'var(--accent)'}}/> Full Name <span style={{color:'#dc2626'}}>*</span></label>
                    <input style={SR.input} placeholder="e.g. Alex Johnson" value={manualResume.name} onChange={e=>handleManualInputChange('name',e.target.value)} />
                    {shouldShowError('name') && <p style={SR.err}>{formErrors.name}</p>}
                  </div>
                  <div>
                    <label style={SR.label}><Zap size={12} style={{color:'var(--accent)'}}/> Email <span style={{color:'#dc2626'}}>*</span></label>
                    <input style={SR.input} type="email" placeholder="you@example.com" value={manualResume.email} onChange={e=>handleManualInputChange('email',e.target.value)} />
                    {shouldShowError('email') && <p style={SR.err}>{formErrors.email}</p>}
                  </div>
                  <div>
                    <label style={SR.label}><Globe size={12} style={{color:'var(--accent)'}}/> Phone <span style={{color:'#dc2626'}}>*</span></label>
                    <input style={SR.input} type="tel" placeholder="+353 87 123 4567" value={manualResume.phone} onChange={e=>handleManualInputChange('phone',e.target.value)} />
                    {shouldShowError('phone') && <p style={SR.err}>{formErrors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Section 2: Professional Context */}
              <div className="sr-section sr-card-in">
                <div style={SR.secHead('sh2')}>
                  <div style={SR.iconDot('c')}><Compass size={18}/></div>
                  <div>
                    <div style={{fontSize:17,fontWeight:700,letterSpacing:'-0.025em',color:'var(--text)'}}>Professional Context</div>
                    <div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>Your current role and industry</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
                  {/* Industry */}
                  <div>
                    <label style={SR.label}><Network size={12} style={{color:'var(--accent)'}}/> Industry <span style={{color:'#dc2626'}}>*</span></label>
                    <Select value={manualResume.industryDomain} onValueChange={v=>handleManualInputChange('industryDomain',v)} disabled={isLoading||industriesLoading}>
                      <SelectTrigger style={{...SR.input,height:48}}><SelectValue placeholder={industriesLoading?'Loading…':'Select industry'}/></SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl bg-white z-[9999]">
                        {industriesError ? <SelectItem value="__err" disabled>{industriesError}</SelectItem>
                          : industries.map(ind=><SelectItem key={ind} value={ind} className="rounded-lg py-2.5 cursor-pointer">{ind}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {shouldShowError('industryDomain') && <p style={SR.err}>{formErrors.industryDomain}</p>}
                  </div>
                  {/* Current Job Title */}
                  <div style={{position:'relative'}}>
                    <label style={SR.label}><Briefcase size={12} style={{color:'var(--accent)'}}/> Current Job Title <span style={{color:'#dc2626'}}>*</span></label>
                    <div ref={jobTitleMenuRef} style={{position:'relative'}}>
                      <input style={SR.input} placeholder="Search job title…" value={jobTitleSearch} onChange={e=>{setJobTitleSearch(e.target.value);setJobTitleMenuOpen(true);}} onFocus={()=>setJobTitleMenuOpen(true)} disabled={isLoading} />
                      {jobTitleMenuOpen && filteredJobTitles.length>0 && (
                        <div style={{position:'absolute',top:'100%',left:0,right:0,zIndex:50,marginTop:4,borderRadius:14,background:'white',border:'1px solid var(--border-strong)',boxShadow:'var(--shadow-xl)',maxHeight:220,overflow:'auto'}}>
                          {filteredJobTitles.map(t=>(
                            <div key={t} onClick={()=>updateCurrentJobTitles(t)} style={{padding:'11px 16px',fontSize:14,fontWeight:500,cursor:'pointer',color:'var(--text)',transition:'background var(--tr)'}} onMouseEnter={e=>e.target.style.background='var(--chip-bg)'} onMouseLeave={e=>e.target.style.background='transparent'}>{t}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    {manualResume.currentJobTitle.length>0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                        {manualResume.currentJobTitle.map((t,i)=>(
                          <span key={i} style={SR.chip}>{t}<button type="button" onClick={()=>updateCurrentJobTitles(t)} style={{border:'none',background:'none',cursor:'pointer',color:'var(--muted)',padding:0,marginLeft:2,lineHeight:1}}><X size={11}/></button></span>
                        ))}
                      </div>
                    )}
                    {shouldShowError('currentJobTitle') && <p style={SR.err}>{formErrors.currentJobTitle}</p>}
                    {(jobTitlesLoading||jobTitlesError) && <p style={{fontSize:11,color:jobTitlesError?'#dc2626':'var(--muted)',marginTop:4}}>{jobTitlesLoading?'Loading titles…':jobTitlesError}</p>}
                  </div>
                  {/* Headline */}
                  <div>
                    <label style={SR.label}><Pen size={12} style={{color:'var(--accent)'}}/> Professional Headline <span style={{color:'#dc2626'}}>*</span>
                      <span style={{fontSize:9.5,fontWeight:800,padding:'2px 7px',borderRadius:6,background:'var(--gradient-a)',color:'white',textTransform:'uppercase',letterSpacing:'0.06em',marginLeft:4}}>Auto</span>
                    </label>
                    <ProfessionalHeadlineAutocomplete industryDomain={manualResume.industryDomain} currentJobTitle={manualResume.currentJobTitle} onSelect={handleHeadlineSelection} value={manualResume.headline} disabled={isLoading} />
                    {shouldShowError('headline') && <p style={SR.err}>{formErrors.headline}</p>}
                  </div>
                  {/* Job Level */}
                  <div>
                    <label style={SR.label}><Activity size={12} style={{color:'var(--accent)'}}/> Job Level <span style={{color:'#dc2626'}}>*</span></label>
                    <Select value={manualResume.yearsOfExperience} onValueChange={v=>handleManualInputChange('yearsOfExperience',v)} disabled={isLoading}>
                      <SelectTrigger style={{...SR.input,height:48}}><SelectValue placeholder="Select level"/></SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl bg-white z-[9999]">
                        {JOBLEVEL.map(l=><SelectItem key={l} value={l} className="rounded-lg py-2.5 cursor-pointer">{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {shouldShowError('yearsOfExperience') && <p style={SR.err}>{formErrors.yearsOfExperience}</p>}
                  </div>
                  {/* Primary Tools */}
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={SR.label}><Cpu size={12} style={{color:'var(--accent)'}}/> Primary Tools &amp; Tech <span style={{color:'#dc2626'}}>*</span></label>
                    <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:14,border:'1px solid var(--input-border)',background:'linear-gradient(180deg,rgba(255,255,255,0.97),var(--input-bg))',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.85),var(--shadow-sm)',minHeight:48}}>
                      {manualResume.primaryTools.map((t,i)=>(
                        <span key={i} style={SR.chip}>{t}<button type="button" onClick={()=>handleRemovePrimaryTool(i)} style={{border:'none',background:'none',cursor:'pointer',color:'var(--muted)',padding:0,marginLeft:2,lineHeight:1}}><X size={11}/></button></span>
                      ))}
                      <input style={SR.tagInput} placeholder="Type a tool and press Enter…" value={primaryToolInput} onChange={e=>setPrimaryToolInput(e.target.value)} onKeyDown={e=>{if((e.key==='Enter'||e.key===',')&&primaryToolInput.trim()){e.preventDefault();handleAddPrimaryTool(primaryToolInput.trim());}}} disabled={isLoading}/>
                    </div>
                    {filteredToolSuggestions.length>0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                        {filteredToolSuggestions.map(s=>(
                          <button key={s} type="button" onClick={()=>handleAddPrimaryTool(s)} style={{...SR.chip,cursor:'pointer',fontSize:11}}>
                            <Plus size={10}/>{s}
                          </button>
                        ))}
                      </div>
                    )}
                    {(toolSuggestionsLoading||toolSuggestionsError) && <p style={{fontSize:11,color:toolSuggestionsError?'#dc2626':'var(--muted)',marginTop:4}}>{toolSuggestionsLoading?'Loading suggestions…':toolSuggestionsError}</p>}
                    {shouldShowError('primaryTools') && <p style={SR.err}>{formErrors.primaryTools}</p>}
                    {(normalizedPrimaryToolsLoading||normalizedPrimaryToolsError||(normalizedPrimaryTools&&normalizedPrimaryTools.length>0)) && (
                      <div style={SR.normBox}>
                        <div style={{fontSize:11,fontWeight:700,color:'var(--chip-text)',marginBottom:6,display:'flex',alignItems:'center',gap:5}}><Sparkles size={11}/>Normalised</div>
                        {normalizedPrimaryToolsLoading && <span style={{fontSize:12,color:'var(--muted)'}}>Normalising…</span>}
                        {normalizedPrimaryToolsError && <span style={{fontSize:12,color:'#dc2626'}}>{normalizedPrimaryToolsError}</span>}
                        {!normalizedPrimaryToolsLoading && normalizedPrimaryTools.map((t,i)=><span key={i} style={{...SR.chip,fontSize:11,marginRight:4,marginBottom:4,display:'inline-flex'}}>{t}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Skills & Profile */}
              <div className="sr-section sr-card-in">
                <div style={SR.secHead('sh3')}>
                  <div style={SR.iconDot('e')}><Brain size={18}/></div>
                  <div>
                    <div style={{fontSize:17,fontWeight:700,letterSpacing:'-0.025em',color:'var(--text)'}}>Skills &amp; Your Profile</div>
                    <div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>Core competencies and experience summary</div>
                  </div>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:14}}>
                  {/* Core Skills */}
                  <div>
                    <label style={SR.label}><Zap size={12} style={{color:'var(--accent)'}}/> Core Skills <span style={{color:'#dc2626'}}>*</span></label>
                    <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:14,border:'1px solid var(--input-border)',background:'linear-gradient(180deg,rgba(255,255,255,0.97),var(--input-bg))',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.85),var(--shadow-sm)',minHeight:48}}>
                      {manualResume.skills.map((s,i)=>(
                        <span key={i} style={SR.chipSkl}>{s}<button type="button" onClick={()=>handleRemoveSkill(i)} style={{border:'none',background:'none',cursor:'pointer',color:'var(--muted)',padding:0,marginLeft:2,lineHeight:1}}><X size={11}/></button></span>
                      ))}
                      <input style={SR.tagInput} placeholder="Type a skill and press Enter…" value={skillInput} onChange={e=>setSkillInput(e.target.value)} onKeyDown={e=>{if((e.key==='Enter'||e.key===',')&&skillInput.trim()){e.preventDefault();handleAddSkill(skillInput.trim());}}} disabled={isLoading}/>
                    </div>
                    {filteredSkillSuggestions.length>0 && (
                      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
                        {filteredSkillSuggestions.map(s=>(
                          <button key={s} type="button" onClick={()=>handleAddSkill(s)} style={{...SR.chipSkl,cursor:'pointer',fontSize:11}}>
                            <Plus size={10}/>{s}
                          </button>
                        ))}
                      </div>
                    )}
                    {(skillSuggestionsLoading||skillSuggestionsError) && <p style={{fontSize:11,color:skillSuggestionsError?'#dc2626':'var(--muted)',marginTop:4}}>{skillSuggestionsLoading?'Loading suggestions…':skillSuggestionsError}</p>}
                    {shouldShowError('skills') && <p style={SR.err}>{formErrors.skills}</p>}
                    {(normalizedCoreSkillsLoading||normalizedCoreSkillsError||(normalizedCoreSkills&&normalizedCoreSkills.length>0)) && (
                      <div style={SR.normBox}>
                        <div style={{fontSize:11,fontWeight:700,color:'var(--chip-text)',marginBottom:6,display:'flex',alignItems:'center',gap:5}}><Sparkles size={11}/>Normalised</div>
                        {normalizedCoreSkillsLoading && <span style={{fontSize:12,color:'var(--muted)'}}>Normalising…</span>}
                        {normalizedCoreSkillsError && <span style={{fontSize:12,color:'#dc2626'}}>{normalizedCoreSkillsError}</span>}
                        {!normalizedCoreSkillsLoading && normalizedCoreSkills.map((s,i)=><span key={i} style={{...SR.chipSkl,fontSize:11,marginRight:4,marginBottom:4,display:'inline-flex'}}>{s}</span>)}
                      </div>
                    )}
                  </div>
                  {/* Certifications & Achievements */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
                    <div>
                      <label style={SR.label}><CheckCircle size={12} style={{color:'var(--accent)'}}/> Certifications</label>
                      <textarea style={{...SR.input,minHeight:80,resize:'vertical'}} placeholder="e.g. AWS Certified, PMP…" value={manualResume.certifications} onChange={e=>handleManualInputChange('certifications',e.target.value)} disabled={isLoading}/>
                    </div>
                    <div>
                      <label style={SR.label}><TrendingUp size={12} style={{color:'var(--accent)'}}/> Key Achievements</label>
                      <textarea style={{...SR.input,minHeight:80,resize:'vertical'}} placeholder="Quantified wins, promotions, awards…" value={manualResume.achievements} onChange={e=>handleManualInputChange('achievements',e.target.value)} disabled={isLoading}/>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Career Target */}
              <div className="sr-section sr-card-in">
                <div style={SR.secHead('sh4')}>
                  <div style={SR.iconDot('d')}><Target size={18}/></div>
                  <div>
                    <div style={{fontSize:17,fontWeight:700,letterSpacing:'-0.025em',color:'var(--text)'}}>Career Target</div>
                    <div style={{fontSize:13,color:'var(--muted)',marginTop:3}}>Your preferred location and desired role</div>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14}}>
                  {/* Region */}
                  <div>
                    <label style={SR.label}><MapPin size={12} style={{color:'var(--accent)'}}/> Preferred Location <span style={{color:'#dc2626'}}>*</span></label>
                    <Select value={region} onValueChange={handleRegionChange} disabled={isLoading}>
                      <SelectTrigger style={{...SR.input,height:48}}><SelectValue placeholder="Select region"/></SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl bg-white z-[9999]">
                        {REGIONS.map(r=><SelectItem key={r} value={r} className="rounded-lg py-2.5 cursor-pointer">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {shouldShowError('region') && <p style={SR.err}>{formErrors.region}</p>}
                  </div>
                  {/* Get Future Role button */}
                  <div style={{display:'flex',alignItems:'flex-end'}}>
                    <button type="button" style={{...SR.btnOutline,width:'100%',justifyContent:'center'}} disabled={!canSaveSelectedInfo||isAutoFetchingFutureRoles||isSavingSelectedInfo} onClick={handleGetFutureRole}>
                      {(isAutoFetchingFutureRoles||isSavingSelectedInfo) ? <Loader2 size={14} style={{animation:'spin 1s linear infinite'}}/> : <Sparkles size={14}/>}
                      {isAutoFetchingFutureRoles?'Fetching roles…':'Get Future Roles'}
                    </button>
                  </div>
                  {/* Desired Role */}
                  <div style={{gridColumn:'1/-1'}}>
                    <label style={SR.label}>
                      <Target size={12} style={{color:'var(--accent)'}}/> Desired Role <span style={{color:'#dc2626'}}>*</span>
                      {!allPreTargetFilled && <span style={{fontSize:11,fontWeight:600,color:'var(--muted)',marginLeft:6}}>Fill fields above first</span>}
                    </label>
                    <Select value={careerGoal} onValueChange={handleCareerGoalChange} disabled={isLoading||!allPreTargetFilled}>
                      <SelectTrigger style={{...SR.input,height:48}}><SelectValue placeholder="Select target role"/></SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl bg-white z-[9999]">
                        {availableTargetRoles.map(r=><SelectItem key={r} value={r} className="rounded-lg py-2.5 cursor-pointer">{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {futureRoleSuggestionsError && <p style={{fontSize:11,color:'#d97706',marginTop:4}}>{futureRoleSuggestionsError}</p>}
                    {shouldShowError('careerGoal') && <p style={SR.err}>{formErrors.careerGoal}</p>}
                  </div>
                  {/* Why Suggested */}
                  {selectedFutureRoleExplanation && (
                    <div style={{gridColumn:'1/-1'}}>
                      <label style={SR.label}>
                        <Lightbulb size={12} style={{color:'var(--accent)'}}/> Why Suggested
                        <span style={{fontSize:9.5,fontWeight:800,padding:'2px 7px',borderRadius:6,background:'var(--gradient-b)',color:'white',textTransform:'uppercase',letterSpacing:'0.06em',marginLeft:4}}>AI Generated</span>
                      </label>
                      <textarea readOnly style={{...SR.input,minHeight:160,lineHeight:1.75,resize:'none',cursor:'default',opacity:0.85}} value={selectedFutureRoleExplanation}/>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="sr-actions" style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:12,flexWrap:'wrap',padding:'22px 26px',marginTop:0}}>
                <div style={{flex:1,fontSize:12,color:'var(--muted)',fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
                  <Shield size={13}/> Your data stays private and secure.
                </div>
                <button type="submit" style={SR.btnPrimary(!allMandatoryFilled||isLoading)} disabled={!allMandatoryFilled||isLoading}>
                  {isLoading ? <Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/> : <Zap size={16}/>}
                  Initialise Analysis
                </button>
              </div>

            </form>
          )}

        </div>
      </div>

      {/* Error modal */}
      <Dialog open={errorModal.isOpen} onOpenChange={open=>setErrorModal(prev=>({...prev,isOpen:open}))}>
        <DialogContent className="sm:max-w-[440px]" style={{borderRadius:24,border:'1px solid var(--border-strong)',boxShadow:'var(--shadow-xl)'}}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2" style={{fontFamily:"'DM Serif Display',serif",fontSize:22,letterSpacing:'-0.02em'}}>
              {errorModal.type==='resources_exhausted'
                ? <><Shield className="w-5 h-5 text-amber-500"/>Quota Reached</>
                : errorModal.type==='server_busy'
                ? <><Activity className="w-5 h-5 text-blue-500"/>Server Busy</>
                : <><X className="w-5 h-5 text-red-500"/>Analysis Error</>}
            </DialogTitle>
            <DialogDescription style={{color:'var(--text-2)',marginTop:8}}>{errorModal.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={()=>setErrorModal(prev=>({...prev,isOpen:false}))} style={{background:'var(--gradient-a)',color:'white',borderRadius:12,fontWeight:700}} className="w-full">
              {errorModal.type==='server_busy'?'Try Again Later':'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

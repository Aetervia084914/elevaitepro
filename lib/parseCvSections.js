/**
 * parseCvSections.js
 *
 * Parses the raw text fields from the futureroleprediction AI response
 * into structured arrays that ResumePreview and the template export expect.
 *
 * Input: cached resume data object from Redis
 * Output: structured { contact, summary, experience[], education[], ... }
 */

/**
 * Parse work_experience text into structured experience objects.
 * Detects patterns like "Job Title — Company   Dates" followed by bullet points.
 */
export function parseExperienceText(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const experiences = [];
  let current = null;

  for (const line of lines) {
    // Detect bullet points
    const isBullet = /^[•\-–—\*►▸]\s*/.test(line) || /^\d+[\.\)]\s/.test(line);

    if (isBullet && current) {
      const cleanBullet = line.replace(/^[•\-–—\*►▸]\s*/, '').replace(/^\d+[\.\)]\s/, '').trim();
      if (cleanBullet) current.bullets.push(cleanBullet);
      continue;
    }

    // Try to detect a job heading line (contains a date pattern or company separator)
    const hasDate = /\b(19|20)\d{2}\b/.test(line) || /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|June|July|August|September|October|November|December)\b/i.test(line) || /\bpresent\b/i.test(line) || /\bcurrent\b/i.test(line);
    const hasSeparator = /\s[—–\-|]\s/.test(line) || line.includes(',');
    const isShort = line.length < 120;

    if ((hasDate || hasSeparator) && isShort && !isBullet) {
      // Parse title — company  dates
      let title = '', company = '', dates = '', location = '';

      // Try "Title — Company   Dates" or "Title, Company   Dates"
      const dashMatch = line.match(/^(.+?)\s*[—–\-|]\s*(.+?)(?:\s{2,}|\s*,\s*)(.+)$/);
      if (dashMatch) {
        title = dashMatch[1].trim();
        company = dashMatch[2].trim();
        dates = dashMatch[3].trim();
      } else {
        // Fallback: split on double spaces or just use the whole line
        const parts = line.split(/\s{2,}/);
        title = parts[0] || line;
        dates = parts.length > 1 ? parts[parts.length - 1] : '';
        company = parts.length > 2 ? parts[1] : '';
      }

      if (current) experiences.push(current);
      current = { title, company, location, dates, bullets: [] };
    } else if (current) {
      // Non-bullet, non-heading line — treat as a bullet
      current.bullets.push(line);
    } else {
      // Orphaned line before first heading — start a new entry
      current = { title: line, company: '', location: '', dates: '', bullets: [] };
    }
  }

  if (current) experiences.push(current);
  return experiences;
}

/**
 * Parse education text into structured education objects.
 * Detects patterns like "Degree — Institution   Dates"
 */
export function parseEducationText(text) {
  if (!text || typeof text !== 'string') return [];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const education = [];

  for (const line of lines) {
    const isBullet = /^[•\-–—\*►▸]\s*/.test(line);
    if (isBullet) continue; // skip bullet points in education

    let degree = '', institution = '', dates = '';

    // Try "Degree — Institution   Dates"
    const dashMatch = line.match(/^(.+?)\s*[—–\-|]\s*(.+?)(?:\s{2,}|\s*,\s*)(.+)$/);
    if (dashMatch) {
      degree = dashMatch[1].trim();
      institution = dashMatch[2].trim();
      dates = dashMatch[3].trim();
    } else {
      // Fallback: split on double spaces
      const parts = line.split(/\s{2,}/);
      degree = parts[0] || line;
      dates = parts.length > 1 ? parts[parts.length - 1] : '';
      institution = parts.length > 2 ? parts[1] : '';
    }

    if (degree) education.push({ degree, institution, dates });
  }

  return education;
}

/**
 * Parse projects text into an array of project descriptions.
 */
export function parseProjectsText(text) {
  if (!text || typeof text !== 'string') return [];

  return text.split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.replace(/^[•\-–—\*►▸]\s*/, '').trim())
    .filter(Boolean);
}

/**
 * Extract a professional summary from raw CV text.
 * Looks for sections like "Personal Profile", "Professional Summary", "About Me", etc.
 */
export function extractSummary(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  const summaryHeaders = [
    /(?:personal\s+)?(?:profile|summary|statement|objective)/i,
    /professional\s+summary/i,
    /about\s+me/i,
    /career\s+(?:summary|objective|profile)/i,
    /executive\s+summary/i,
  ];

  const sectionHeaders = [
    /\b(?:work|professional)\s+(?:experience|history)\b/i,
    /\bemployment\s+history\b/i,
    /\bskills?\s+(?:and\s+)?(?:abilities|competenc)/i,
    /\beducation\b/i,
    /\bcertification/i,
    /\bproject/i,
    /\btechnical\s+skills\b/i,
    /\bcore\s+skills\b/i,
    /\bwork\s+history\b/i,
  ];

  const lines = rawText.split('\n');
  let capturing = false;
  let summaryLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      if (capturing && summaryLines.length > 0) break; // end of summary paragraph
      continue;
    }

    if (!capturing) {
      if (summaryHeaders.some(re => re.test(line))) {
        capturing = true;
        // If the header line also contains text after the heading, include it
        const afterHeader = line.replace(summaryHeaders.find(re => re.test(line)), '').trim();
        if (afterHeader.length > 20) summaryLines.push(afterHeader);
        continue;
      }
    } else {
      // Stop if we hit another section header
      if (sectionHeaders.some(re => re.test(line))) break;
      summaryLines.push(line);
    }
  }

  return summaryLines.join(' ').trim();
}

/**
 * Extract contact details from raw CV text.
 * Looks for email, phone, name (first line), LinkedIn URL, location patterns.
 */
export function extractContactFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return {};

  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const contact = {};

  // Name: typically the first non-empty, non-header line
  for (const line of lines.slice(0, 5)) {
    if (line.length > 2 && line.length < 60 && !/[@\.\d]{4,}/.test(line) && !/^(contact|phone|email|address|mobile)/i.test(line)) {
      contact.name = line;
      break;
    }
  }

  // Email
  const emailMatch = rawText.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (emailMatch) contact.email = emailMatch[0];

  // Phone
  const phoneMatch = rawText.match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/);
  if (phoneMatch) contact.phone = phoneMatch[0].trim();

  // LinkedIn
  const linkedinMatch = rawText.match(/(?:linkedin\.com\/in\/[\w-]+|linkedin:\s*[\w\/.-]+)/i);
  if (linkedinMatch) contact.linkedin = linkedinMatch[0];

  return contact;
}

/**
 * Build a fully structured resume object from cached Redis data.
 * This is the main function called by handleGenerateCv.
 */
export function buildStructuredResume(cached, { userProfile, careerGoal, selectedLocation, selectedInfo, completedSkills, completedAiSkills, completedCompetencies, completedCertifications } = {}) {
  const contactFromText = extractContactFromText(cached.rawCvText || '');
  const summary = cached.summary || extractSummary(cached.rawCvText || '');

  const experience = typeof cached.experience === 'string'
    ? parseExperienceText(cached.experience)
    : (Array.isArray(cached.experience) ? cached.experience : []);

  const education = typeof cached.education === 'string'
    ? parseEducationText(cached.education)
    : (Array.isArray(cached.education) ? cached.education : []);

  const projects = typeof cached.projects === 'string'
    ? parseProjectsText(cached.projects)
    : (Array.isArray(cached.projects) ? cached.projects : []);

  return {
    contact: {
      name: userProfile?.name || contactFromText.name || cached.contact?.name || '',
      headline: userProfile?.headline || careerGoal || cached.bestFitIndustry || '',
      email: userProfile?.email || contactFromText.email || cached.contact?.email || '',
      phone: userProfile?.phone || contactFromText.phone || cached.contact?.phone || '',
      location: userProfile?.location || selectedLocation || cached.contact?.location || '',
      linkedin: userProfile?.linkedin || contactFromText.linkedin || '',
      github: '',
    },
    summary,
    coreSkills: [...(cached.coreSkills || []), ...(completedSkills || [])],
    aiSkills: [...(cached.aiSkills || []), ...(completedAiSkills || [])],
    skillCategories: cached.skillCategories || null,
    tools: cached.tools || (Array.isArray(selectedInfo?.primaryTools) ? selectedInfo.primaryTools : []),
    competencies: completedCompetencies || [],
    certifications: [...(cached.certifications || []), ...(completedCertifications || [])],
    experience,
    education,
    projects,
  };
}

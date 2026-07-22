"""Tests for work experience extractor - preserving original CV text."""
from __future__ import annotations

import pytest

from workexp_extractor.resume_extractor import parse_work_experiences, WorkExperienceEntry


class TestWorkExperienceExtractor:
    """Test work experience extraction with original text preservation."""
    
    def test_simple_date_range_split(self):
        """Split entries based on date range boundaries."""
        text = """Senior Software Engineer
Tech Corp Inc.
Jan 2020 - Present

• Led development of cloud-native applications
• Managed team of 5 developers
• Implemented CI/CD pipelines

Software Developer
XYZ Solutions
Jun 2018 - Dec 2019

• Built REST APIs using Python
• Worked with PostgreSQL databases"""
        
        entries = parse_work_experiences(text)
        
        assert len(entries) == 2
        assert "Senior Software Engineer" in entries[0].raw_block
        assert "Tech Corp Inc." in entries[0].raw_block
        assert "Led development" in entries[0].raw_block
        assert "Software Developer" in entries[1].raw_block
        assert "XYZ Solutions" in entries[1].raw_block
    
    def test_preserves_original_bullets(self):
        """Original bullet characters must be preserved exactly."""
        text = """Lead Engineer
Company A
2020 - 2023

* First bullet with asterisk
- Second bullet with dash
• Third bullet with Unicode bullet"""
        
        entries = parse_work_experiences(text)
        
        assert len(entries) == 1
        assert "*" in entries[0].raw_block
        assert "-" in entries[0].raw_block
        assert "•" in entries[0].raw_block
    
    def test_preserves_spacing_and_linebreaks(self):
        """Original spacing and line breaks must be preserved."""
        text = """Senior Developer
2021 - Present

Key Responsibilities:
  - Item 1
  - Item 2
    
Technical Skills: Python, AWS"""
        
        entries = parse_work_experiences(text)
        
        assert len(entries) == 1
        # Check that indentation is preserved
        assert "  - Item 1" in entries[0].raw_block
        assert "  - Item 2" in entries[0].raw_block
    
    def test_bare_two_digit_year(self):
        """Support bare 2-digit year format like 'Jul 25 - Present'."""
        text = """Senior Developer
Tech Startup
Jul 25 - Present

• Leading mobile app development
• Mentoring junior developers

Developer
Previous Company
Jan 23 - Jun 25

• Built web applications"""
        
        entries = parse_work_experiences(text)
        
        assert len(entries) == 2
        assert "Jul 25 - Present" in entries[0].raw_block
        assert "Senior Developer" in entries[0].raw_block
        assert "Jan 23 - Jun 25" in entries[1].raw_block
    
    def test_no_dates_found_keeps_as_single_entry(self):
        """If no clear dates, keep entire text as one entry."""
        text = """Professional Experience Summary

Worked as software engineer for multiple companies.
Developed various applications and systems.
Led several successful projects."""
        
        entries = parse_work_experiences(text)
        
        # Should return one entry with the whole text
        assert len(entries) == 1
        assert "Professional Experience Summary" in entries[0].raw_block
        assert entries[0].date_line is None
    
    def test_sorts_by_date_most_recent_first(self):
        """Entries should be sorted by start date, most recent first."""
        text = """Junior Developer
Company C
2018 - 2019

• Entry work

Senior Developer  
Company B
2020 - 2023

• Mid-career work

Lead Engineer
Company A
Jan 2024 - Present

• Current work"""
        
        entries = parse_work_experiences(text)
        
        assert len(entries) == 3
        # Most recent (2024) should be first
        assert "Lead Engineer" in entries[0].raw_block
        assert "Senior Developer" in entries[1].raw_block
        assert "Junior Developer" in entries[2].raw_block
    
    def test_empty_section(self):
        """Empty section returns empty list."""
        entries = parse_work_experiences("")
        assert entries == []
        
        entries = parse_work_experiences("   \n  \n  ")
        assert entries == []
    
    def test_date_parsing_for_sorting(self):
        """start_date and end_date should be populated for sorting."""
        text = """Software Engineer
TechCo
Mar 2020 - Jun 2023

• Developed features"""
        
        entries = parse_work_experiences(text)
        
        assert len(entries) == 1
        assert entries[0].start_date is not None
        assert entries[0].end_date is not None
        assert entries[0].date_line == "Mar 2020 - Jun 2023"
    
    def test_present_current_ongoing_keywords(self):
        """'Present', 'Current', 'Ongoing' should be recognized as end dates."""
        text = """Engineer A
2020 - Present

• Work

Engineer B
2018 - Current

• Work

Engineer C
2016 - Ongoing

• Work"""
        
        entries = parse_work_experiences(text)
        
        assert len(entries) == 3
        # All should have end_date set to approximately now
        for entry in entries:
            assert entry.end_date is not None
    
    def test_real_world_cv_format(self):
        """Test with realistic CV formatting."""
        text = """SENIOR SOFTWARE ENGINEER | TechStartup Inc., San Francisco, CA
January 2021 - Present

• Architected and deployed microservices infrastructure serving 1M+ users
• Led cross-functional team of 8 engineers across 3 time zones
• Reduced deployment time by 75% through CI/CD automation
• Technologies: Python, AWS, Docker, Kubernetes, PostgreSQL

SOFTWARE ENGINEER | Enterprise Solutions Ltd, London, UK
June 2018 - December 2020

• Developed REST APIs for e-commerce platform processing 50K daily transactions
• Implemented caching layer reducing response times by 60%
• Mentored 3 junior developers on best practices
• Stack: Node.js, MongoDB, Redis, React"""
        
        entries = parse_work_experiences(text)
        
        assert len(entries) == 2
        # Check that ALL original formatting is preserved
        assert "SENIOR SOFTWARE ENGINEER | TechStartup Inc." in entries[0].raw_block
        assert "January 2021 - Present" in entries[0].raw_block
        assert "Technologies: Python, AWS" in entries[0].raw_block
        assert "SOFTWARE ENGINEER | Enterprise Solutions Ltd" in entries[1].raw_block
        assert "Stack: Node.js, MongoDB" in entries[1].raw_block


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

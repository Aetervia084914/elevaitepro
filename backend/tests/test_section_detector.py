"""Tests for section_detector.py - resume section heading detection."""
from __future__ import annotations

import pytest

from app.services.resume_parser.section_detector import detect_sections


class TestNoSpaceHeadings:
    """Test detection of concatenated headings without spaces."""
    
    def test_professional_experience_no_space(self):
        """PROFESSIONALEXPERIENCE (no space) should be detected as experience section."""
        text = """
PROFESSIONALEXPERIENCE
        
Senior Software Engineer
ABC Company
Jan 2020 - Present

• Led development team
• Built cloud solutions
        """
        sections = detect_sections(text)
        
        assert "experience" in sections, f"Expected 'experience' section, got: {list(sections.keys())}"
        assert "Senior Software Engineer" in sections["experience"]
        assert "ABC Company" in sections["experience"]
    
    def test_workhistory_no_space(self):
        """WORKHISTORY should be detected as experience section."""
        text = """
WORKHISTORY

Software Developer
XYZ Corp
2018 - 2020

• Developed web applications
        """
        sections = detect_sections(text)
        
        assert "experience" in sections
        assert "Software Developer" in sections["experience"]
    
    def test_technicalskills_no_space(self):
        """TECHNICALSKILLS should be detected as skills section."""
        text = """
TECHNICALSKILLS

Python, JavaScript, React, Node.js
AWS, Docker, Kubernetes
        """
        sections = detect_sections(text)
        
        assert "skills" in sections
        assert "Python" in sections["skills"]
    
    def test_multiple_no_space_sections(self):
        """Multiple concatenated headings in same resume."""
        text = """
PROFESSIONALEXPERIENCE

Senior Developer
Tech Corp
2020 - Present

TECHNICALSKILLS

Python, Java, C++

EDUCATION

BSc Computer Science
University of Technology
2016 - 2020
        """
        sections = detect_sections(text)
        
        assert "experience" in sections
        assert "skills" in sections
        assert "education" in sections
        assert "Senior Developer" in sections["experience"]
        assert "Python" in sections["skills"]
        assert "BSc Computer Science" in sections["education"]


class TestHeadingNormalization:
    """Test various heading format normalizations."""
    
    def test_normal_heading_unchanged(self):
        """Normal headings with proper spacing should still work."""
        text = """
PROFESSIONAL EXPERIENCE

Senior Developer
Tech Corp
2020 - Present

Developed applications and services.
        """
        sections = detect_sections(text)
        
        assert "experience" in sections
        assert "Senior Developer" in sections["experience"]
    
    def test_mixed_case_heading(self):
        """Mixed case headings should work."""
        text = """
Professional Experience

Senior Developer
Tech Corp
2020 - Present

Developed applications.
        """
        sections = detect_sections(text)
        
        assert "experience" in sections
    
    def test_short_acronym_not_expanded(self):
        """Short all-caps text like 'CEO' should not be treated as concatenated heading."""
        text = """
EXPERIENCE

CEO
StartupCo
2020 - Present

Led company strategy.
        """
        sections = detect_sections(text)
        
        # CEO should appear in the body, not be treated as a section heading
        assert "experience" in sections
        assert "CEO" in sections["experience"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

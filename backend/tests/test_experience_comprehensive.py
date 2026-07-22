"""Comprehensive tests for experience calculator with all date format variations."""
import pytest
from datetime import date
from app.services.resume_parser.experience_calculator import calculate_years


class TestDateFormatVariations:
    """Test all common CV date format variations."""
    
    # ═══ Standard Formats ═══
    
    def test_month_name_full_year(self):
        """January 2020 – March 2023"""
        text = """
        Senior Developer
        ABC Company
        January 2020 – March 2023
        """
        years = calculate_years(text)
        assert 3.0 <= years <= 3.3
    
    def test_month_abbr_full_year(self):
        """Jan 2020 – Mar 2023"""
        text = """
        Senior Developer
        ABC Company
        Jan 2020 – Mar 2023
        """
        years = calculate_years(text)
        assert 3.0 <= years <= 3.3
    
    def test_slash_format(self):
        """03/2020 – 06/2023"""
        text = """
        Senior Developer
        ABC Company
        03/2020 – 06/2023
        """
        years = calculate_years(text)
        assert 3.2 <= years <= 3.4
    
    def test_year_only(self):
        """2020 – 2023"""
        text = """
        Senior Developer
        ABC Company
        2020 – 2023
        """
        years = calculate_years(text)
        assert 3.0 <= years <= 3.1
    
    # ═══ No-Space Formats ═══
    
    def test_year_only_no_spaces(self):
        """2020-2023 (hyphen without spaces)"""
        text = """
        Senior Developer
        ABC Company
        2020-2023
        """
        years = calculate_years(text)
        assert 3.0 <= years <= 3.1
    
    def test_month_year_no_space(self):
        """Jan2020 – Mar2023 (OCR artifact)"""
        text = """
        Senior Developer
        ABC Company
        Jan2020 – Mar2023
        """
        years = calculate_years(text)
        assert 3.0 <= years <= 3.3
    
    # ═══ Abbreviated Years ═══
    
    def test_abbreviated_year_apostrophe(self):
        """Jan'20 – Mar'23"""
        text = """
        Senior Developer
        ABC Company
        Jan'20 – Mar'23
        """
        years = calculate_years(text)
        assert 3.0 <= years <= 3.3
    
    def test_slash_abbreviated_year(self):
        """01/20 – 03/23"""
        text = """
        Senior Developer
        ABC Company
        01/20 – 03/23
        """
        years = calculate_years(text)
        assert 3.0 <= years <= 3.3
    
    # ═══ Alternative Separators ═══
    
    def test_dash_separator(self):
        """03-2020 - 06-2023"""
        text = """
        Senior Developer
        ABC Company
        03-2020 - 06-2023
        """
        years = calculate_years(text)
        assert 3.2 <= years <= 3.4
    
    def test_dot_separator(self):
        """03.2020 – 06.2023"""
        text = """
        Senior Developer
        ABC Company
        03.2020 – 06.2023
        """
        years = calculate_years(text)
        assert 3.2 <= years <= 3.4
    
    def test_to_separator(self):
        """2020 to 2023"""
        text = """
        Senior Developer
        ABC Company
        2020 to 2023
        """
        years = calculate_years(text)
        assert 3.0 <= years <= 3.1
    
    # ═══ Quarter Formats ═══
    
    def test_quarter_format(self):
        """Q1 2020 – Q3 2023"""
        text = """
        Senior Developer
        ABC Company
        Q1 2020 – Q3 2023
        """
        years = calculate_years(text)
        assert 3.5 <= years <= 3.8
    
    def test_quarter_abbreviated(self):
        """Q1'20 - Q3'23"""
        text = """
        Senior Developer
        ABC Company
        Q1'20 - Q3'23
        """
        years = calculate_years(text)
        assert 3.5 <= years <= 3.8
    
    # ═══ Season Formats ═══
    
    def test_season_format(self):
        """Spring 2020 – Fall 2023"""
        text = """
        Senior Developer
        ABC Company
        Spring 2020 – Fall 2023
        """
        years = calculate_years(text)
        assert 3.4 <= years <= 3.7
    
    def test_season_abbreviated(self):
        """Summer'20 - Winter'22"""
        text = """
        Senior Developer
        ABC Company
        Summer'20 - Winter'22
        """
        years = calculate_years(text)
        assert 2.4 <= years <= 2.7
    
    # ═══ Full Date Formats ═══
    
    def test_full_date_with_day(self):
        """15 January 2020 – 20 March 2023"""
        text = """
        Senior Developer
        ABC Company
        15 January 2020 – 20 March 2023
        """
        years = calculate_years(text)
        assert 3.0 <= years <= 3.3
    
    def test_ordinal_date(self):
        """1st Jan 2020 - 15th Mar 2023"""
        text = """
        Senior Developer
        ABC Company
        1st Jan 2020 - 15th Mar 2023
        """
        years = calculate_years(text)
        assert 3.0 <= years <= 3.3
    
    # ═══ ISO Format ═══
    
    def test_iso_date_format(self):
        """2020-01-15 – 2023-03-20"""
        text = """
        Senior Developer
        ABC Company
        2020-01-15 – 2023-03-20
        """
        years = calculate_years(text)
        assert 3.0 <= years <= 3.3
    
    # ═══ YYYY-MM Format ═══
    
    def test_yyyy_mm_format(self):
        """2020-03 – 2023-06"""
        text = """
        Senior Developer
        ABC Company
        2020-03 – 2023-06
        """
        years = calculate_years(text)
        assert 3.2 <= years <= 3.4
    
    # ═══ Present / Current ═══
    
    def test_present_keyword(self):
        """2020 – Present"""
        text = """
        Senior Developer
        ABC Company
        2020 – Present
        """
        years = calculate_years(text)
        current_year = date.today().year
        expected = current_year - 2020
        assert expected - 0.5 <= years <= expected + 0.5
    
    def test_current_keyword(self):
        """Jan 2020 - Current"""
        text = """
        Senior Developer
        ABC Company
        Jan 2020 - Current
        """
        years = calculate_years(text)
        current_year = date.today().year
        expected = current_year - 2020
        assert expected - 0.5 <= years <= expected + 0.5
    
    def test_ongoing_keyword(self):
        """2021 - Ongoing"""
        text = """
        Senior Developer
        ABC Company
        2021 - Ongoing
        """
        years = calculate_years(text)
        current_year = date.today().year
        expected = current_year - 2021
        assert expected - 0.5 <= years <= expected + 0.5
    
    # ═══ Multiple Positions ═══
    
    def test_multiple_positions_sequential(self):
        """
        Senior Developer: Jan 2020 – Mar 2023
        Junior Developer: Jan 2018 – Dec 2019
        """
        text = """
        Senior Developer
        ABC Company
        Jan 2020 – Mar 2023
        
        Junior Developer
        XYZ Corp
        Jan 2018 – Dec 2019
        """
        years = calculate_years(text)
        # 3 years + 2 years = 5 years
        assert 4.8 <= years <= 5.3
    
    def test_multiple_positions_overlapping(self):
        """
        Consultant: Jan 2021 – Present
        Part-time Developer: Jun 2020 – Dec 2021
        """
        text = """
        Consultant
        ABC Company
        Jan 2021 – Present
        
        Part-time Developer
        XYZ Corp
        Jun 2020 – Dec 2021
        """
        years = calculate_years(text)
        # Intervals should merge: Jun 2020 - Present
        current_year = date.today().year
        expected = current_year - 2020 + 0.5
        assert expected - 0.5 <= years <= expected + 0.5
    
    # ═══ Edge Cases ═══
    
    def test_very_short_experience(self):
        """Jan 2023 – Mar 2023 (3 months)"""
        text = """
        Intern
        ABC Company
        Jan 2023 – Mar 2023
        """
        years = calculate_years(text)
        assert 0.1 <= years <= 0.3
    
    def test_long_career(self):
        """Multiple positions over 20+ years"""
        text = """
        Senior Architect
        Company A
        2015 – Present
        
        Lead Developer
        Company B
        2010 – 2015
        
        Developer
        Company C
        2003 – 2010
        """
        years = calculate_years(text)
        # 2003 - Present = ~20+ years
        current_year = date.today().year
        expected = current_year - 2003
        assert expected - 1 <= years <= expected + 1
    
    # ═══ Error Handling ═══
    
    def test_no_dates_found(self):
        """No date patterns in text"""
        text = """
        Senior Developer
        ABC Company
        Worked on various projects
        """
        with pytest.raises(ValueError, match="years_of_experience_not_determined"):
            calculate_years(text)
    
    def test_invalid_date_range(self):
        """Future dates or invalid ranges"""
        text = """
        Senior Developer
        ABC Company
        2030 – 2040
        """
        with pytest.raises(ValueError, match="years_of_experience_not_determined"):
            calculate_years(text)


class TestRealWorldCVFormats:
    """Test formats from actual CVs."""
    
    def test_uk_cv_format(self):
        """Typical UK CV: "April 2019 – September 2023" """
        text = """
        Senior Software Engineer
        Tech Solutions Ltd, London
        April 2019 – September 2023
        
        • Led development of cloud-based solutions
        • Managed team of 5 developers
        """
        years = calculate_years(text)
        assert 4.3 <= years <= 4.6
    
    def test_us_cv_format(self):
        """Typical US resume: "03/2019 - 09/2023" """
        text = """
        Senior Software Engineer
        Tech Solutions Inc., San Francisco, CA
        03/2019 - 09/2023
        
        • Led development of cloud-based solutions
        • Managed team of 5 developers
        """
        years = calculate_years(text)
        assert 4.4 <= years <= 4.6
    
    def test_european_cv_format(self):
        """European CV: "03.2019 – 09.2023" """
        text = """
        Senior Software Engineer
        Tech Solutions GmbH, Berlin
        03.2019 – 09.2023
        
        • Led development of cloud-based solutions
        • Managed team of 5 developers
        """
        years = calculate_years(text)
        assert 4.4 <= years <= 4.6
    
    def test_minimal_formatting(self):
        """Minimal CV: "2019-2023" """
        text = """
        Senior Software Engineer | Tech Solutions | 2019-2023
        
        Led development of cloud-based solutions
        """
        years = calculate_years(text)
        assert 3.9 <= years <= 4.1
    
    def test_bullet_point_dates(self):
        """Dates in bullet points"""
        text = """
        PROFESSIONAL EXPERIENCE
        
        • Senior Developer at ABC Corp (Jan 2020 - Present)
        • Junior Developer at XYZ Inc (Mar 2018 - Dec 2019)
        • Intern at Tech Startup (Jun 2017 - Feb 2018)
        """
        years = calculate_years(text)
        current_year = date.today().year
        # Should calculate from Jun 2017 - Present
        expected = current_year - 2017 + 0.5
        assert expected - 0.5 <= years <= expected + 0.5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

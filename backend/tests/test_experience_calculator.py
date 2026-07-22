from __future__ import annotations

import pytest

from app.services.resume_parser.experience_calculator import calculate_years


@pytest.mark.parametrize(
    "text",
    [
        "Jan 2020 - till date",
        "Jan 2020 - till-date",
        "Jan 2020 - ongoing",
        "Jan 2020 - current",
    ],
)
def test_current_endings_are_counted_as_ongoing_experience(text: str) -> None:
    years = calculate_years(text)

    assert years > 0


def test_bare_two_digit_year() -> None:
    """Test bare 2-digit year format without apostrophe: 'Jul 25 – Present'"""
    text = """
    Senior Developer
    ABC Company
    Jul 25 – Present
    
    Mid-Level Developer
    XYZ Corp
    Jan 25 – Jun 25
    
    Junior Developer
    Tech Startup
    Nov 20 – Dec 24
    """
    years = calculate_years(text)
    
    # Should detect all three intervals:
    # Jul 25 - Present (~1 year from Jul 2025 to now)
    # Jan 25 - Jun 25 (~0.4 years)
    # Nov 20 - Dec 24 (~4.1 years)
    # Total should be ~5.5 years
    assert years >= 5.0, f"Expected >=5.0 years but got {years}"

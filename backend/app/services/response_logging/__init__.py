"""Response logging utilities for OpenAI API calls.

This module provides a pluggable system for logging OpenAI API responses
to JSON files for debugging and auditing purposes.
"""

from .response_writer import write_response_json, ResponseWriterConfig

__all__ = ["write_response_json", "ResponseWriterConfig"]

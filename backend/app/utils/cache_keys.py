"""Redis key builders and role-name normaliser for the role analysis cache.

New key pattern (permanent, no TTL):
    candidate:{candidate_id}:role_analysis:{normalised_role}:{normalised_region}

Existing session key (read-only in this flow):
    candidate:{candidate_id}:session_token:{session_token}
"""
from __future__ import annotations

import re
import uuid


def normalise_role_key(role_name: str) -> str:
    """Convert a human-readable role name to a lowercase, underscore-separated key.

    ``"AI Solutions Architect"`` → ``"ai_solutions_architect"``
    """
    key = role_name.strip().lower()
    key = key.replace("-", "_").replace(" ", "_")
    key = re.sub(r"[^a-z0-9_]", "", key)
    # Collapse multiple underscores
    key = re.sub(r"_+", "_", key).strip("_")
    return key


def normalise_region_key(region: str) -> str:
    """Convert a region string to a lowercase, underscore-separated key."""
    key = region.strip().lower()
    key = key.replace("-", "_").replace(" ", "_")
    key = re.sub(r"[^a-z0-9_]", "", key)
    key = re.sub(r"_+", "_", key).strip("_")
    return key


def role_analysis_redis_key(
    candidate_id: uuid.UUID,
    role_name: str,
    region: str = "United Kingdom",
) -> str:
    """Build the permanent Redis key for a cached role analysis."""
    norm_role = normalise_role_key(role_name)
    norm_region = normalise_region_key(region)
    return f"candidate:{candidate_id}:role_analysis:{norm_role}:{norm_region}"


def session_redis_key(
    candidate_id: uuid.UUID,
    session_token: str,
) -> str:
    """Build the existing session Redis key (read-only reference)."""
    return f"candidate:{candidate_id}:session_token:{session_token}"

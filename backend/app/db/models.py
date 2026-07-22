from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Industry(Base):
    __tablename__ = "industries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)


class Subcategory(Base):
    __tablename__ = "subcategories"
    __table_args__ = (
        UniqueConstraint("industry_id", "name", name="uq_subcategories_industry_name"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    industry_id: Mapped[int] = mapped_column(ForeignKey("industries.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)


class Skill(Base):
    __tablename__ = "skills"
    __table_args__ = (
        Index("ix_skills_industry_id", "industry_id"),
        Index("ix_skills_subcategory_id", "subcategory_id"),
    )

    skill_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    industry_id: Mapped[int] = mapped_column(ForeignKey("industries.id", ondelete="RESTRICT"), nullable=False)
    subcategory_id: Mapped[int | None] = mapped_column(ForeignKey("subcategories.id", ondelete="SET NULL"), nullable=True)
    skill_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    skill_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    raw_json: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class Occupation(Base):
    __tablename__ = "occupations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)


class Title(Base):
    __tablename__ = "titles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)


class SkillOccupation(Base):
    __tablename__ = "skill_occupations"
    __table_args__ = (
        UniqueConstraint("skill_id", "occupation_id", name="uq_skill_occupations_skill_occ"),
        Index("ix_skill_occupations_occupation_id", "occupation_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    skill_id: Mapped[str] = mapped_column(ForeignKey("skills.skill_id", ondelete="CASCADE"), nullable=False)
    occupation_id: Mapped[int] = mapped_column(ForeignKey("occupations.id", ondelete="CASCADE"), nullable=False)


class SkillTitle(Base):
    __tablename__ = "skill_titles"
    __table_args__ = (
        UniqueConstraint("skill_id", "title_id", name="uq_skill_titles_skill_title"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    skill_id: Mapped[str] = mapped_column(ForeignKey("skills.skill_id", ondelete="CASCADE"), nullable=False)
    title_id: Mapped[int] = mapped_column(ForeignKey("titles.id", ondelete="CASCADE"), nullable=False)


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    password: Mapped[str] = mapped_column(Text, nullable=False)
    career_aspirations: Mapped[str | None] = mapped_column(Text, nullable=True)
    selected_tier: Mapped[str] = mapped_column(Text, nullable=False)
    last_payment_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
    created_timestamp: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, server_default=func.now())
    updated_timestamp: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, server_default=func.now())


class UserSession(Base):
    __tablename__ = "usersession"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_token: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    expires_at: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_timestamp: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, server_default=func.now())


class UserJourney(Base):
    __tablename__ = "userjourney"
    __table_args__ = (
        UniqueConstraint("user_id", name="userjourney_user_id_unique"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    current_stage: Mapped[str] = mapped_column(String(50), nullable=False, server_default="UPLOAD_CV")
    credits_remaining: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    cv_uploaded: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    analysis_completed_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default=text("EXTRACT(EPOCH FROM NOW())::BIGINT"))
    updated_at: Mapped[int] = mapped_column(BigInteger, nullable=False, server_default=text("EXTRACT(EPOCH FROM NOW())::BIGINT"))


class SessionActivity(Base):
    """Persists the full candidate RedisJSON cache on logout.

    Every field from the cache is stored — both as individual queryable
    columns AND as complete JSONB dumps so no data is ever lost.
    """
    __tablename__ = "sessionactivity"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidates.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_token: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    cache_key: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Phase 1 — Future-roles / resume data ─────────────────────────────
    best_fit_industry: Mapped[str | None] = mapped_column(Text, nullable=True)
    possible_job_titles: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    core_skills: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    tools_and_technologies: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    education: Mapped[str | None] = mapped_column(Text, nullable=True)
    certifications: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    work_experience: Mapped[str | None] = mapped_column(Text, nullable=True)
    projects: Mapped[str | None] = mapped_column(Text, nullable=True)
    inferred_seniority: Mapped[str | None] = mapped_column(Text, nullable=True)
    all_plausible_future_roles: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    confidence_scores: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    why_suggested: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ── Phase 2 — Analysis (all roles combined) ──────────────────────────
    analysis: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    roles_analysed: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ── Full cache snapshot (complete JSON dump — nothing lost) ───────────
    full_cache_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # ── Timestamps ────────────────────────────────────────────────────────
    session_started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    logged_out_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    created_timestamp: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, server_default=func.now())


class StageResult(Base):
    __tablename__ = "stage_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    session_token: Mapped[str | None] = mapped_column(Text, nullable=True, index=True)
    extraction_type: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_timestamp: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, server_default=func.now())


class SupportTicket(Base):
    """A support ticket raised via the Support Centre form.

    Stores submitter name/email plus the ticket content and a human-readable
    ticket number (TKT-000123) backed by the ``support_ticket_seq`` sequence.
    Linked to a candidate when the submitter's email matches an account.
    """
    __tablename__ = "support_tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    seq_no: Mapped[int] = mapped_column(BigInteger, nullable=False)
    ticket_number: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    candidate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("candidates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    subject: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[str] = mapped_column(Text, nullable=False, server_default="open")
    team_email_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    user_email_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())

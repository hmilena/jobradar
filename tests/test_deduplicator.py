"""Testes de hashing e extração de metadados das vagas."""

from scraper.deduplicator import (
    compute_hash,
    enrich_raw_job,
    extract_remote_type,
    extract_role,
    extract_seniority,
    extract_tech_stack,
)
from scraper.sources.base import RawJob


def test_compute_hash_stable():
    """Mesmos inputs produzem o mesmo digest."""
    h1 = compute_hash(" Engineer ", "Acme", "HTTPS://JOBS/1")
    h2 = compute_hash("engineer", "acme", "https://jobs/1")
    assert h1 == h2
    assert len(h1) == 64


def test_compute_hash_sensitive_to_url():
    """URL diferente altera o hash."""
    a = compute_hash("T", "C", "https://a.com/1")
    b = compute_hash("T", "C", "https://a.com/2")
    assert a != b


def test_extract_tech_stack_empty():
    assert extract_tech_stack("") == []
    assert extract_tech_stack("   ") == []


def test_extract_tech_stack_finds_python_and_react():
    text = "Looking for Python and React experience with PostgreSQL."
    found = extract_tech_stack(text)
    assert "Python" in found
    assert "React" in found
    assert "SQL" in found


def test_extract_seniority_from_title():
    assert extract_seniority("Senior Backend Engineer") == "senior"


def test_extract_seniority_unknown():
    assert extract_seniority("Software Engineer") == "unknown"


def test_extract_role_qa():
    assert extract_role("QA Automation Engineer", "") == "QA"


def test_extract_remote_type_remote():
    desc = "This is a fully remote position based in EU."
    assert extract_remote_type(desc) == "remote"


def test_extract_remote_type_empty_unknown():
    assert extract_remote_type("") == "unknown"


def test_enrich_raw_job_fills_missing_fields():
    job = RawJob(
        title="Senior React Developer",
        company_name="Co",
        url="https://ex.com/j",
        source="itjobs",
        description="100% remote, TypeScript and Node.js stack.",
    )
    enrich_raw_job(job)
    assert "React" in job.tech_stack or "TypeScript" in job.tech_stack
    assert job.seniority == "senior"
    assert job.remote_type == "remote"
    assert job.role != "unknown"

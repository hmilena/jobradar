"""
Deduplicação de vagas e extração de metadados (seniority, tech stack, remote).
"""
import hashlib
import re

from .sources.base import RawJob

# ----------------------------------------------------------------
# Tech stack detection
# ----------------------------------------------------------------
TECH_KEYWORDS: dict[str, list[str]] = {
    "Python": ["python", "django", "flask", "fastapi"],
    "JavaScript": ["javascript", "js", "node.js", "nodejs"],
    "TypeScript": ["typescript", "ts"],
    "React": ["react", "react.js", "reactjs", "next.js", "nextjs"],
    "Vue": ["vue", "vue.js", "nuxt"],
    "Angular": ["angular"],
    "Java": ["java", "spring", "spring boot", "quarkus"],
    "Kotlin": ["kotlin"],
    "Go": [" go ", "golang"],
    "Rust": ["rust"],
    "C#": ["c#", ".net", "dotnet", "asp.net"],
    "PHP": ["php", "laravel", "symfony"],
    "Ruby": ["ruby", "rails", "ruby on rails"],
    "Scala": ["scala", "akka", "spark"],
    "Swift": ["swift", "ios", "swiftui"],
    "Dart": ["dart", "flutter"],
    "SQL": ["sql", "postgresql", "mysql", "mariadb", "oracle"],
    "NoSQL": ["mongodb", "redis", "cassandra", "dynamodb", "elasticsearch"],
    "AWS": ["aws", "amazon web services", "s3", "ec2", "lambda"],
    "Azure": ["azure", "microsoft azure"],
    "GCP": ["gcp", "google cloud"],
    "Docker": ["docker", "dockerfile"],
    "Kubernetes": ["kubernetes", "k8s"],
    "Terraform": ["terraform"],
    "GraphQL": ["graphql"],
    "Kafka": ["kafka", "apache kafka"],
    "Machine Learning": ["machine learning", "ml", "deep learning", "neural network", "tensorflow", "pytorch"],
    "Data Science": ["data science", "pandas", "numpy", "scikit-learn"],
}

# ----------------------------------------------------------------
# Seniority detection
# ----------------------------------------------------------------
SENIORITY_PATTERNS: list[tuple[str, list[str]]] = [
    ("intern", ["intern", "estágio", "estagio", "trainee", "júnior trainee"]),
    ("junior", ["junior", "júnior", "jr.", "jr ", "entry level", "entry-level"]),
    ("senior", ["senior", "sénior", "sr.", "sr ", "sênior"]),
    ("lead", ["lead", "tech lead", "líder técnico", "principal", "staff"]),
    ("manager", ["manager", "head of", "diretor", "director", "vp of", "vice president"]),
    ("mid", ["mid", "mid-level", "pleno", "mid level"]),
]

# ----------------------------------------------------------------
# Role detection
# ----------------------------------------------------------------
ROLE_PATTERNS: list[tuple[str, list[str]]] = [
    ("QA", ["qa ", "quality assurance", "tester", "test engineer", "quality engineer", "qa engineer", "automation engineer", "qa analyst", "software tester", "testing engineer"]),
    ("Frontend", ["frontend", "front-end", "front end", "ui developer", "ui engineer"]),
    ("Backend", ["backend", "back-end", "back end", "server-side"]),
    ("Fullstack", ["fullstack", "full-stack", "full stack"]),
    ("DevOps", ["devops", "dev ops", "sre", "site reliability", "platform engineer", "infrastructure engineer", "cloud engineer"]),
    ("Data", ["data engineer", "data scientist", "data analyst", "analytics engineer", "ml engineer", "machine learning engineer", "ai engineer"]),
    ("Mobile", ["mobile", "android developer", "ios developer", "react native"]),
    ("Security", ["security engineer", "security analyst", "appsec", "cybersecurity", "pen tester", "penetration tester"]),
    ("Design", ["ux designer", "ui designer", "ui/ux", "product designer", "ux researcher"]),
]

# ----------------------------------------------------------------
# Remote type detection
# ----------------------------------------------------------------
REMOTE_PATTERNS: list[tuple[str, list[str]]] = [
    ("remote", ["full remote", "100% remoto", "100% remote", "trabalho remoto", "fully remote"]),
    ("hybrid", ["híbrido", "hibrido", "hybrid", "modelo híbrido"]),
    ("onsite", ["presencial", "on-site", "onsite", "escritório"]),
]


def compute_hash(title: str, company_name: str, url: str) -> str:
    """SHA256 do triplo (título, empresa, URL) para deduplicação."""
    raw = f"{title.lower().strip()}|{company_name.lower().strip()}|{url.lower().strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()


def extract_tech_stack(text: str) -> list[str]:
    """Extrai tecnologias mencionadas no texto da vaga."""
    if not text:
        return []
    text_lower = text.lower()
    found = []
    for tech, keywords in TECH_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            found.append(tech)
    return found


def extract_seniority(title: str, description: str = "") -> str:
    """Infere seniority a partir do título e descrição."""
    combined = f"{title} {description}".lower()
    for level, patterns in SENIORITY_PATTERNS:
        if any(p in combined for p in patterns):
            return level
    return "unknown"


def extract_role(title: str, description: str = "") -> str:
    """Infere a área/role a partir do título e descrição."""
    combined = f"{title} {description}".lower()
    for role, patterns in ROLE_PATTERNS:
        if any(p in combined for p in patterns):
            return role
    return "unknown"


def extract_remote_type(description: str = "") -> str:
    """Infere o modelo de trabalho a partir da descrição."""
    if not description:
        return "unknown"
    desc_lower = description.lower()
    for remote_type, patterns in REMOTE_PATTERNS.items():
        if any(p in desc_lower for p in patterns):
            return remote_type
    return "unknown"


def enrich_raw_job(job: RawJob) -> RawJob:
    """Enriquece um RawJob com metadados extraídos automaticamente."""
    desc = job.description or ""
    if not job.tech_stack:
        job.tech_stack = extract_tech_stack(f"{job.title} {desc}")
    if not job.seniority:
        job.seniority = extract_seniority(job.title, desc)
    if not job.remote_type or job.remote_type == "unknown":
        job.remote_type = extract_remote_type(desc)
    if not getattr(job, "role", None):
        job.role = extract_role(job.title, desc)
    return job

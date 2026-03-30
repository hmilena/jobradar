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
    "Angular": ["angular", "angular.js", "angularjs"],
    "Java": ["java", "spring", "spring boot", "quarkus"],
    "Kotlin": ["kotlin"],
    "Go": [" go ", "golang"],
    "Rust": ["rust"],
    "C#": ["c#", ".net", "dotnet", "asp.net"],
    "PHP": ["php", "laravel", "symfony", "wordpress", "drupal"],
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
    ("Frontend", [
        "frontend", "front-end", "front end",
        "ui developer", "ui engineer", "ui/ux developer", "ui/ux engineer",
        "ux/ui developer", "ux/ui engineer",
        "react developer", "react engineer",
        "vue developer", "vue engineer",
        "angular developer", "angular engineer",
        "css developer", "css engineer",
    ]),
    ("Backend", [
        "backend", "back-end", "back end", "server-side",
        "backend developer", "backend engineer",
        "api developer", "api engineer",
        "python developer", "python engineer",
        "java developer", "java engineer",
        "ruby developer", "ruby engineer",
        "go developer", "golang developer",
        "php developer", "php engineer",
        "node developer", "node.js developer",
    ]),
    ("Fullstack", ["fullstack", "full-stack", "full stack"]),
    ("DevOps", ["devops", "dev ops", "sre", "site reliability", "platform engineer", "infrastructure engineer", "cloud engineer", "cloud architect"]),
    ("Data", ["data engineer", "data scientist", "data analyst", "analytics engineer", "ml engineer", "machine learning engineer", "ai engineer"]),
    ("Mobile", ["mobile developer", "mobile engineer", "android developer", "ios developer", "react native developer", "flutter developer"]),
    ("Security", ["security engineer", "security analyst", "appsec", "cybersecurity", "pen tester", "penetration tester"]),
    ("Design", ["ux designer", "ui designer", "ui/ux", "ux/ui", "product designer", "ux researcher", "web designer"]),
]

# Tech claramente de frontend (não usadas em backend)
FRONTEND_ONLY_TECH = {"React", "Vue", "Angular"}

# Tech claramente de backend (não usadas em frontend)
BACKEND_ONLY_TECH = {"Python", "Java", "Go", "Rust", "C#", "PHP", "Ruby", "Scala", "Kotlin"}

# ----------------------------------------------------------------
# Remote type detection
# ----------------------------------------------------------------
REMOTE_PATTERNS: list[tuple[str, list[str]]] = [
    ("remote", ["full remote", "100% remoto", "100% remote", "trabalho remoto", "fully remote", "(remote)", "- remote", "| remote", "remote only", "remote-first"]),
    ("hybrid", ["híbrido", "hibrido", "hybrid", "modelo híbrido", "(hybrid)", "- hybrid", "| hybrid"]),
    ("onsite", ["presencial", "on-site", "onsite", "escritório", "(on-site)", "(onsite)"]),
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


def extract_role(title: str, description: str = "", tech_stack: list[str] | None = None) -> str:
    """
    Infere a área/role a partir do título, tech stack e descrição.
    Ordem de prioridade:
      1. Match explícito no título
      2. Tech stack misto (frontend + backend) → Fullstack
      3. Fallback na descrição
    """
    title_lower = title.lower()

    # 1. Match no título
    for role, patterns in ROLE_PATTERNS:
        if any(p in title_lower for p in patterns):
            return role

    # 2. Inferir pelo tech stack quando o título não é explícito
    if tech_stack:
        stack_set = set(tech_stack)
        has_frontend = bool(stack_set & FRONTEND_ONLY_TECH)
        has_backend = bool(stack_set & BACKEND_ONLY_TECH)
        if has_frontend and has_backend:
            return "Fullstack"
        if has_backend and not has_frontend:
            return "Backend"
        if has_frontend and not has_backend:
            return "Frontend"

    # 3. Fallback: descrição
    if description:
        desc_lower = description.lower()
        for role, patterns in ROLE_PATTERNS:
            if any(p in desc_lower for p in patterns):
                return role

    return "unknown"


def extract_remote_type(description: str = "") -> str:
    """Infere o modelo de trabalho a partir da descrição."""
    if not description:
        return "unknown"
    desc_lower = description.lower()
    for remote_type, patterns in REMOTE_PATTERNS:
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
        job.remote_type = extract_remote_type(f"{job.title} {desc}")
    if not getattr(job, "role", None):
        job.role = extract_role(job.title, desc, job.tech_stack)
    return job

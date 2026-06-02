# ============================================================
# Worker A — Shared utilities
# ============================================================
import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---- PDF Parsing ----
try:
    import PyPDF2

    def extract_text_from_pdf(file_bytes: bytes) -> str:
        """Extract text from a PDF file."""
        reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
        text_parts: list[str] = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
        return "\n\n".join(text_parts)

except ImportError:
    logger.warning("PyPDF2 not installed — PDF parsing disabled")

    def extract_text_from_pdf(file_bytes: bytes) -> str:
        raise RuntimeError("PyPDF2 not installed")


# ---- DOCX Parsing ----
try:
    from docx import Document

    def extract_text_from_docx(file_bytes: bytes) -> str:
        """Extract text from a DOCX file."""
        doc = Document(io.BytesIO(file_bytes))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())

except ImportError:
    logger.warning("python-docx not installed — DOCX parsing disabled")

    def extract_text_from_docx(file_bytes: bytes) -> str:
        raise RuntimeError("python-docx not installed")


# ---- Text Chunking ----
def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    """Split long text into overlapping chunks for embedding."""
    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        # Try to break at sentence boundary
        chunk = text[start:end]
        if end < len(text):
            # Look back for last period/line break
            last_break = max(
                chunk.rfind(". "),
                chunk.rfind("\n"),
                chunk.rfind("。"),
            )
            if last_break > chunk_size // 2:
                end = start + last_break + 1
                chunk = text[start:end]
        chunks.append(chunk.strip())
        start = end - overlap
    return chunks


# ---- Entity Extraction (Rule-based fallback) ----
SKILL_KEYWORDS = {
    "languages": [
        "Python",
        "JavaScript",
        "TypeScript",
        "Java",
        "Go",
        "Rust",
        "C++",
        "C#",
        "Ruby",
        "PHP",
        "Swift",
        "Kotlin",
        "Scala",
        "R",
        "MATLAB",
        "SQL",
        "HTML",
        "CSS",
        "Sass",
        "GraphQL",
    ],
    "frameworks": [
        "React",
        "Next.js",
        "Vue",
        "Angular",
        "Svelte",
        "Node.js",
        "Express",
        "NestJS",
        "Django",
        "Flask",
        "FastAPI",
        "Spring Boot",
        "Rails",
        "Laravel",
        "ASP.NET",
        "Gin",
    ],
    "cloud_devops": [
        "AWS",
        "Azure",
        "GCP",
        "Docker",
        "Kubernetes",
        "Terraform",
        "CI/CD",
        "Jenkins",
        "GitHub Actions",
        "Ansible",
        "Prometheus",
        "Grafana",
        "ELK",
        "Datadog",
        "Sentry",
    ],
    "data_ai": [
        "Machine Learning",
        "Deep Learning",
        "NLP",
        "TensorFlow",
        "PyTorch",
        "Pandas",
        "NumPy",
        "Scikit-learn",
        "Spark",
        "Hadoop",
        "Kafka",
        "RabbitMQ",
        "Redis",
        "PostgreSQL",
        "MySQL",
        "MongoDB",
        "Elasticsearch",
        "LangChain",
        "RAG",
        "LLM",
        "OpenAI",
    ],
    "soft_skills": [
        "Leadership",
        "Communication",
        "Teamwork",
        "Problem Solving",
        "Agile",
        "Scrum",
        "Project Management",
        "Mentoring",
    ],
}


def extract_skills(text: str) -> list[str]:
    """Extract skills from text using keyword matching."""
    found: set[str] = set()
    text_lower = text.lower()
    for category, keywords in SKILL_KEYWORDS.items():
        for kw in keywords:
            if kw.lower() in text_lower:
                found.add(kw)
    return sorted(found)


def extract_email(text: str) -> Optional[str]:
    """Extract the first email address from text."""
    import re

    match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    return match.group(0) if match else None


def extract_phone(text: str) -> Optional[str]:
    """Extract the first phone number from text."""
    import re

    match = re.search(r"\+?[\d\s\-()]{7,20}", text)
    return match.group(0).strip() if match else None


def summarize_experience(text: str) -> str:
    """Extract experience/work history section from resume text."""
    import re

    # Look for common section headers
    patterns = [
        r"(?:WORK|EMPLOYMENT|PROFESSIONAL)\s*(?:EXPERIENCE|HISTORY)",
        r"(?:工作经验|工作经历|项目经验)",
    ]
    for pat in patterns:
        match = re.search(pat, text, re.IGNORECASE)
        if match:
            # Extract up to 2000 chars after the header
            start = match.start()
            end = min(start + 2000, len(text))
            return text[start:end].strip()
    # Fallback: return first 1500 chars
    return text[:1500].strip()

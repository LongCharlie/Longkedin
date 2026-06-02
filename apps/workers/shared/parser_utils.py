"""PDF text extraction + skill/entity extraction (no AI required)."""

import io
import re
import logging

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF using PyPDF2."""
    import PyPDF2

    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    parts = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            parts.append(t)
    return "\n\n".join(parts)


def chunk_text(text: str, size: int = 1000, overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks."""
    if len(text) <= size:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunk = text[start:end]
        if end < len(text):
            last = max(chunk.rfind(". "), chunk.rfind("\n"), chunk.rfind("。"))
            if last > size // 2:
                end = start + last + 1
                chunk = text[start:end]
        chunks.append(chunk.strip())
        start = end - overlap
    return chunks


# Skill keywords for rule-based extraction
SKILLS = {
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
        "SQL",
        "HTML",
        "CSS",
        "GraphQL",
    ],
    "frameworks": [
        "React",
        "Next.js",
        "Vue",
        "Angular",
        "Node.js",
        "Express",
        "NestJS",
        "Django",
        "Flask",
        "FastAPI",
        "Spring",
    ],
    "cloud": [
        "AWS",
        "Azure",
        "GCP",
        "Docker",
        "Kubernetes",
        "Terraform",
        "CI/CD",
        "GitHub Actions",
    ],
    "data": [
        "Machine Learning",
        "Deep Learning",
        "NLP",
        "TensorFlow",
        "PyTorch",
        "Pandas",
        "NumPy",
        "Spark",
        "Kafka",
        "RabbitMQ",
        "Redis",
        "PostgreSQL",
        "MySQL",
        "MongoDB",
    ],
    "soft": ["Leadership", "Communication", "Agile", "Scrum", "Project Management"],
}


def extract_skills(text: str) -> list[str]:
    """Rule-based skill extraction."""
    found = set()
    low = text.lower()
    for _cat, keywords in SKILLS.items():
        for kw in keywords:
            if kw.lower() in low:
                found.add(kw)
    return sorted(found)


def extract_email(text: str) -> str | None:
    m = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    return m.group(0) if m else None


def extract_phone(text: str) -> str | None:
    m = re.search(r"\+?[\d\s\-()]{7,20}", text)
    return m.group(0).strip() if m else None


def rule_based_extraction(text: str) -> dict:
    """Full rule-based extraction (no AI needed)."""
    return {
        "name": None,
        "email": extract_email(text),
        "phone": extract_phone(text),
        "skills": extract_skills(text),
        "experiences": [],
        "education": [],
        "yearsOfExperience": None,
        "summary": text[:1500].strip(),
    }

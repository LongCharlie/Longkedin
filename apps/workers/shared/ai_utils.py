# ============================================================
# Worker A — OpenAI integration (embedding + structured extraction)
# ============================================================
import json
import logging
from typing import Optional

from shared.config import settings
from shared.parser_utils import SKILL_KEYWORDS, extract_skills

logger = logging.getLogger(__name__)

# ---- OpenAI Client (lazy init) ----
_openai_client = None


def get_openai_client():
    global _openai_client
    if _openai_client is None:
        if not settings.openai_api_key or settings.openai_api_key.startswith("sk-***"):
            logger.warning("OPENAI_API_KEY not set — AI features disabled")
            return None
        import openai

        _openai_client = openai.OpenAI(api_key=settings.openai_api_key)
    return _openai_client


# ---- Embedding ----
async def generate_embedding(text: str) -> Optional[list[float]]:
    """Generate a vector embedding using OpenAI text-embedding-3-small."""
    client = get_openai_client()
    if client is None:
        logger.warning("Skipping embedding — no OpenAI client")
        return None

    try:
        response = client.embeddings.create(
            model=settings.openai_embedding_model,
            input=text[:8000],  # Max 8191 tokens
        )
        return response.data[0].embedding
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        return None


# ---- Structured Extraction (GPT-4o-mini) ----
async def extract_resume_entities(text: str) -> dict:
    """
    Use GPT-4o-mini to extract structured data from resume text.
    Falls back to rule-based extraction if API is unavailable.
    """
    client = get_openai_client()
    if client is None:
        return _rule_based_extraction(text)

    prompt = f"""Extract structured information from this resume. Return ONLY valid JSON.

{{
  "name": "Full name",
  "email": "email@example.com",
  "skills": ["skill1", "skill2", ...],
  "experiences": [
    {{
      "company": "Company name",
      "title": "Job title",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or 'Present'",
      "highlights": ["achievement 1", ...]
    }}
  ],
  "education": [
    {{
      "school": "University name",
      "degree": "Degree",
      "field": "Field of study",
      "graduationYear": "YYYY"
    }}
  ],
  "yearsOfExperience": number,
  "summary": "One-paragraph professional summary"
}}

Resume text:
{text[:6000]}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2000,
        )
        content = response.choices[0].message.content or "{}"
        # Try to parse JSON (handle markdown code fences)
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
    except Exception as e:
        logger.warning(f"GPT extraction failed, falling back to rules: {e}")
        return _rule_based_extraction(text)


def _rule_based_extraction(text: str) -> dict:
    """Rule-based fallback when OpenAI is unavailable."""
    from shared.parser_utils import extract_email, extract_phone, summarize_experience

    return {
        "name": None,
        "email": extract_email(text),
        "phone": extract_phone(text),
        "skills": extract_skills(text),
        "experiences": [],
        "education": [],
        "yearsOfExperience": None,
        "summary": summarize_experience(text)[:500],
    }


# ---- JD Parsing ----
async def parse_job_description(text: str) -> dict:
    """Parse a job description to extract structured requirements."""
    client = get_openai_client()
    if client is None:
        return _rule_based_jd_parse(text)

    prompt = f"""Extract structured requirements from this job description. Return ONLY valid JSON.

{{
  "title": "Job title",
  "requiredSkills": ["skill1", ...],
  "preferredSkills": ["skill1", ...],
  "level": "ENTRY | MID | SENIOR | STAFF",
  "locationType": "REMOTE | HYBRID | ONSITE",
  "salaryRange": {{ "min": number, "max": number, "currency": "USD" }} or null,
  "summary": "One-paragraph job summary"
}}

Job description:
{text[:6000]}
"""
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1500,
        )
        content = response.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
    except Exception as e:
        logger.warning(f"JD parsing failed: {e}")
        return _rule_based_jd_parse(text)


def _rule_based_jd_parse(text: str) -> dict:
    return {
        "title": None,
        "requiredSkills": extract_skills(text),
        "preferredSkills": [],
        "level": "MID",
        "locationType": None,
        "salaryRange": None,
        "summary": text[:500],
    }

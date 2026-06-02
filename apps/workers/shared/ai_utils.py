"""DeepSeek AI integration + OpenAI embedding (optional)."""

import json
import logging
from shared.config import settings
from shared.parser_utils import rule_based_extraction, extract_skills

logger = logging.getLogger(__name__)

_ds_client = None
_oai_client = None


def _get_ds():
    global _ds_client
    if _ds_client is None and settings.has_ai():
        import openai

        _ds_client = openai.OpenAI(api_key=settings.ds_key, base_url=settings.ds_base)
    return _ds_client


def _get_oai():
    global _oai_client
    if _oai_client is None and settings.has_emb():
        import openai

        _oai_client = openai.OpenAI(api_key=settings.oai_key)
    return _oai_client


async def generate_embedding(text: str) -> list[float] | None:
    """Generate embedding via OpenAI (DeepSeek has no embedding API)."""
    client = _get_oai()
    if client is None:
        return None
    try:
        r = client.embeddings.create(model=settings.oai_emb, input=text[:8000])
        return r.data[0].embedding
    except Exception as e:
        logger.warning(f"Embedding failed: {e}")
        return None


async def extract_resume_entities(text: str) -> dict:
    """Use DeepSeek to extract structured resume data. Falls back to rules."""
    client = _get_ds()
    if client is None:
        return rule_based_extraction(text)

    prompt = f"""Extract structured information from this resume. Return ONLY valid JSON (no markdown, no explanation).

{{
  "name": "Full name or null",
  "email": "email or null",
  "skills": ["skill1", "skill2"],
  "experiences": [{{"company": "...", "title": "...", "startDate": "YYYY-MM", "endDate": "YYYY-MM or Present", "highlights": ["..."]}}],
  "education": [{{"school": "...", "degree": "...", "field": "...", "graduationYear": "YYYY"}}],
  "yearsOfExperience": number or null,
  "summary": "one paragraph"
}}

Resume:
{text[:6000]}"""

    try:
        r = client.chat.completions.create(
            model=settings.ds_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=2000,
        )
        content = r.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
    except Exception as e:
        logger.warning(f"DeepSeek extraction failed, using rules: {e}")
        return rule_based_extraction(text)


async def parse_job_description(text: str) -> dict:
    """Use DeepSeek to parse a JD."""
    client = _get_ds()
    if client is None:
        return {
            "title": None,
            "requiredSkills": extract_skills(text),
            "preferredSkills": [],
            "level": "MID",
            "locationType": None,
            "salaryRange": None,
            "summary": text[:500],
        }

    prompt = f"""Extract structured info from this job description. Return ONLY valid JSON.

{{"title":"...","requiredSkills":["..."],"preferredSkills":["..."],"level":"ENTRY|MID|SENIOR|STAFF","locationType":"REMOTE|HYBRID|ONSITE","salaryRange":{{"min":n,"max":n,"currency":"USD"}}|null,"summary":"..."}}

JD:
{text[:6000]}"""

    try:
        r = client.chat.completions.create(
            model=settings.ds_model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1500,
        )
        content = r.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
    except Exception as e:
        logger.warning(f"DeepSeek JD parse failed: {e}")
        return {
            "title": None,
            "requiredSkills": extract_skills(text),
            "preferredSkills": [],
            "level": "MID",
            "locationType": None,
            "salaryRange": None,
            "summary": text[:500],
        }

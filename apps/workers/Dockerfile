# ============================================================
# Longkedin — Python Worker Dockerfile (Production)
# ============================================================
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

FROM base AS builder
RUN pip install --no-cache-dir --upgrade pip
COPY apps/workers/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS runner
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY apps/workers/ .

RUN addgroup --system --gid 1001 worker && adduser --system --uid 1001 worker
USER worker

# Port will be overridden by docker-compose or ECS task definition
EXPOSE 8001

# Override CMD in docker-compose per worker:
# CMD ["python", "-m", "worker_resume.main"]
# CMD ["python", "-m", "worker_match.main"]
# CMD ["python", "-m", "worker_interview.main"]

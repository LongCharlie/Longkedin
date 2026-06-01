# ============================================================
# Longkedin — Terraform Variables
# ============================================================

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (staging / production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'"
  }
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "longkedin.com"
}

# --- Networking ---
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for multi-AZ deployment"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# --- Database ---
variable "db_username" {
  description = "RDS master username"
  type        = string
  sensitive   = true
  default     = "longkedin_admin"
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.large"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 100
}

# --- Redis ---
variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.medium"
}

# --- MQ ---
variable "mq_username" {
  description = "Amazon MQ (RabbitMQ) username"
  type        = string
  sensitive   = true
  default     = "longkedin"
}

variable "mq_password" {
  description = "Amazon MQ (RabbitMQ) password"
  type        = string
  sensitive   = true
}

variable "mq_instance_type" {
  description = "Amazon MQ instance type"
  type        = string
  default     = "mq.t3.micro"
}

# --- Container Images ---
variable "web_image" {
  description = "ECR image for Next.js web app"
  type        = string
  default     = "longkedin/web:latest"
}

variable "api_image" {
  description = "ECR image for NestJS API"
  type        = string
  default     = "longkedin/api:latest"
}

variable "worker_resume_image" {
  description = "ECR image for Worker A (Resume Parser)"
  type        = string
  default     = "longkedin/worker-resume:latest"
}

variable "worker_match_image" {
  description = "ECR image for Worker B (Match Analyzer)"
  type        = string
  default     = "longkedin/worker-match:latest"
}

variable "worker_interview_image" {
  description = "ECR image for Worker C (Interview Simulator)"
  type        = string
  default     = "longkedin/worker-interview:latest"
}

# --- Scaling ---
variable "web_desired_count" {
  description = "Desired ECS task count for web service"
  type        = number
  default     = 2
}

variable "api_desired_count" {
  description = "Desired ECS task count for API service"
  type        = number
  default     = 2
}

variable "worker_desired_count" {
  description = "Desired ECS task count for each worker"
  type        = number
  default     = 2
}

# --- API Keys (Sensitive) ---
variable "openai_api_key" {
  description = "OpenAI API key"
  type        = string
  sensitive   = true
}

variable "sentry_dsn" {
  description = "Sentry DSN for error tracking"
  type        = string
  sensitive   = true
  default     = ""
}

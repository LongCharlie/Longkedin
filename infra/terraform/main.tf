# ============================================================
# Longkedin — Terraform Main Configuration
# AWS Provider + Remote State + Core Modules
# ============================================================

terraform {
  required_version = ">= 1.7"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "longkedin-terraform-state"
    key            = "terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "longkedin-terraform-lock"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "Longkedin"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ============================================================
# Networking
# ============================================================
module "networking" {
  source = "./modules/networking"

  environment      = var.environment
  vpc_cidr         = var.vpc_cidr
  availability_zones = var.availability_zones
}

# ============================================================
# Security (Secrets Manager)
# ============================================================
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "longkedin/${var.environment}/secrets"
  description = "Application secrets for Longkedin ${var.environment}"
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    DATABASE_URL          = "postgresql://${var.db_username}:${var.db_password}@${module.database.endpoint}:5432/longkedin?schema=public"
    REDIS_URL             = "redis://${module.redis.endpoint}:6379/0"
    RABBITMQ_URL          = "amqp://${var.mq_username}:${var.mq_password}@${module.mq.endpoint}:5672"
    NEXTAUTH_SECRET       = random_password.nextauth_secret.result
    OPENAI_API_KEY        = var.openai_api_key
    SENTRY_DSN            = var.sentry_dsn
  })
}

resource "random_password" "nextauth_secret" {
  length  = 32
  special = false
}

# ============================================================
# Database (RDS PostgreSQL)
# ============================================================
module "database" {
  source = "./modules/database"

  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  private_subnet_ids  = module.networking.private_subnet_ids
  db_username         = var.db_username
  db_password         = var.db_password
  db_instance_class   = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  multi_az            = var.environment == "production"
}

# ============================================================
# Cache (ElastiCache Redis)
# ============================================================
module "redis" {
  source = "./modules/redis"

  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  node_type          = var.redis_node_type
  num_cache_clusters = var.environment == "production" ? 2 : 1
}

# ============================================================
# Message Queue (Amazon MQ / RabbitMQ)
# ============================================================
module "mq" {
  source = "./modules/mq"

  environment        = var.environment
  vpc_id             = module.networking.vpc_id
  private_subnet_ids = module.networking.private_subnet_ids
  mq_username        = var.mq_username
  mq_password        = var.mq_password
  instance_type      = var.mq_instance_type
}

# ============================================================
# Storage (S3)
# ============================================================
module "storage" {
  source = "./modules/storage"

  environment = var.environment
}

# ============================================================
# Compute (ECS Fargate)
# ============================================================
module "ecs" {
  source = "./modules/ecs"

  environment         = var.environment
  vpc_id              = module.networking.vpc_id
  public_subnet_ids   = module.networking.public_subnet_ids
  private_subnet_ids  = module.networking.private_subnet_ids
  alb_security_group_id = module.networking.alb_security_group_id

  # Secrets
  secrets_arn = aws_secretsmanager_secret.app_secrets.arn

  # Dependencies
  database_endpoint = module.database.endpoint
  redis_endpoint    = module.redis.endpoint
  mq_endpoint       = module.mq.endpoint

  # Container images (from ECR)
  web_image             = var.web_image
  api_image             = var.api_image
  worker_resume_image   = var.worker_resume_image
  worker_match_image    = var.worker_match_image
  worker_interview_image = var.worker_interview_image

  # Scaling
  web_desired_count    = var.web_desired_count
  api_desired_count    = var.api_desired_count
  worker_desired_count = var.worker_desired_count
}

# ============================================================
# CDN & DNS (CloudFront + Route53)
# ============================================================
module "cdn" {
  source = "./modules/cdn"

  environment       = var.environment
  domain_name       = var.domain_name
  alb_dns_name      = module.ecs.alb_dns_name
  alb_zone_id       = module.ecs.alb_zone_id
  s3_bucket_assets  = module.storage.assets_bucket_id
}

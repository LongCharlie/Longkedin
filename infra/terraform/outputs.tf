# ============================================================
# Longkedin — Terraform Outputs
# ============================================================

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}

output "database_endpoint" {
  description = "RDS endpoint"
  value       = module.database.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.redis.endpoint
  sensitive   = true
}

output "mq_endpoint" {
  description = "Amazon MQ (RabbitMQ) endpoint"
  value       = module.mq.endpoint
  sensitive   = true
}

output "alb_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = module.ecs.alb_dns_name
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain"
  value       = module.cdn.cloudfront_domain
}

output "application_url" {
  description = "Final application URL"
  value       = "https://${var.domain_name}"
}

output "s3_bucket_resumes" {
  description = "S3 bucket for resume storage"
  value       = module.storage.resumes_bucket_id
}

output "s3_bucket_recordings" {
  description = "S3 bucket for interview recordings"
  value       = module.storage.recordings_bucket_id
}

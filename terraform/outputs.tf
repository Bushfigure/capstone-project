output "vpc_id" {
  description = "ID of the created VPC"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets"
  value       = module.vpc.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of the private subnets"
  value       = module.vpc.private_subnet_ids
}

output "app_security_group_id" {
  description = "Security group ID for the app server"
  value       = module.compute.app_security_group_id
}

output "app_instance_id" {
  description = "ID of the app EC2 instance"
  value       = module.compute.app_instance_id
}

output "app_instance_public_ip" {
  description = "Public IP of the app EC2 instance"
  value       = module.compute.app_instance_public_ip
}

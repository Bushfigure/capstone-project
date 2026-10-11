output "app_security_group_id" {
  value = aws_security_group.app.id
}

output "app_instance_id" {
  value = aws_instance.app.id
}

output "app_instance_public_ip" {
  value = aws_instance.app.public_ip
}

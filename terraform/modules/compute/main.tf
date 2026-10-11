# ---------- Security Group: App Server ----------
resource "aws_security_group" "app" {
  name        = "${var.project_name}-app-sg"
  description = "Security group for the app server"
  vpc_id      = var.vpc_id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "App NodePort"
    from_port   = 30080
    to_port     = 30080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-app-sg"
    Project = var.project_name
  }
}

# ---------- EC2 Instance (mocked by LocalStack) ----------
resource "aws_instance" "app" {
  ami                    = "ami-12345678"
  instance_type          = var.instance_type
  subnet_id              = var.public_subnet_ids[0]
  vpc_security_group_ids = [aws_security_group.app.id]
  key_name               = var.key_name

  tags = {
    Name    = "${var.project_name}-app-server"
    Project = var.project_name
    Role    = "app"
  }
}

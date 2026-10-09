# DevOps Engineering Capstone Project

Production-ready DevOps pipeline for a cloud-native 3-tier application — built entirely with **free, local-first tooling**.

## 🏗 Architecture

```
GitHub → GitHub Actions → Docker Hub → Kubernetes (Minikube)
             │                                │
             ├─ Test/Lint/Scan                ├─ Prometheus
             └─ Build & Push Image            └─ Grafana
```

## 🧰 Tech Stack

| Layer | Tool |
|-------|------|
| App | Node.js + Express |
| Database | PostgreSQL 16 |
| Container | Docker |
| CI/CD | GitHub Actions |
| Registry | Docker Hub |
| IaC | Terraform + LocalStack |
| Config | Ansible |
| Orchestration | Kubernetes (Minikube) |
| Monitoring | Prometheus + Grafana |
| Security | Trivy, ESLint, non-root containers |

## 📁 Repository Structure

```
capstone-project/
├── app/                    # Node.js application
├── terraform/              # Infrastructure as Code
├── ansible/                # Configuration management
├── kubernetes/             # K8s manifests
├── monitoring/             # Prometheus + Grafana
├── .github/workflows/      # CI/CD pipeline
└── docs/                   # Diagrams & screenshots
```

## 🚀 Quick Start (Local)

### Prerequisites
- Docker Desktop
- Node.js 20+
- Minikube + kubectl
- Terraform + LocalStack (optional for infra demo)
- Ansible (optional for config demo)

### Run locally with Docker Compose

```bash
git clone <your-repo-url>
cd capstone-project
docker compose up --build
```

Visit: http://localhost:3000

### Run tests

```bash
cd app
npm install
npm test
```

## 🔄 CI/CD Pipeline

- **Trigger**: push to `main` or `develop`, PRs to `main`
- **Stages**: Checkout → Install → Lint → Test → Build image → Trivy scan → Push to Docker Hub
- **Secrets required**: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`

## ☸ Kubernetes Deployment

```bash
minikube start
kubectl apply -f kubernetes/
minikube service capstone-app-service
```

## 📊 Monitoring

Prometheus scrapes `/metrics`; Grafana dashboards visualize request rate and visit counts.

## 🔐 Security

- No hardcoded secrets (env vars / K8s Secrets)
- Non-root container user
- Trivy image scanning in CI
- ESLint static analysis
- K8s NetworkPolicy restricting DB access

## 🩹 Rollback Plan

```bash
kubectl rollout undo deployment/capstone-app
```

Or redeploy a previous image tag: `IMAGE_NAME:<git-sha>`

## 📸 Screenshots

See `docs/screenshots/` for pipeline runs, running app, K8s resources, and Grafana dashboards.

## 📝 Reflection

_To be filled in after project completion._

## 📜 License

MIT

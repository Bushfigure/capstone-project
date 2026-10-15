# 🏗 Architecture Deep Dive

## 1. High-Level System Architecture

```mermaid
flowchart TB
    subgraph Developer[" Developer Workstation"]
        Code[Source Code]
        LocalDocker[Docker Compose]
    end

    subgraph SCM["📦 Source Control"]
        GitHub[GitHub Repository]
    end

    subgraph CICD["🔄 CI/CD"]
        Actions[GitHub Actions]
        Build[Build + Test + Scan]
        Registry[Docker Hub]
    end

    subgraph IaC["🏗 Infrastructure as Code"]
        TF[Terraform]
        LocalStack[LocalStack AWS Sim]
        Ansible[Ansible]
    end

    subgraph K8s["☸️ Kubernetes Cluster (Minikube)"]
        NS[Namespace: capstone]
        AppPods[App Pods x2]
        DB[PostgreSQL Pod]
        PVC[PersistentVolumeClaim]
        SVC[Services: NodePort]
        CM[ConfigMap + Secret]
    end

    subgraph Monitor["📊 Observability"]
        Prom[Prometheus]
        Graf[Grafana]
        Alerts[Alert Rules]
    end

    Code --> GitHub
    GitHub --> Actions
    Actions --> Build
    Build --> Registry
    Registry -.->|pull| K8s
    LocalDocker -.->|dev flow| Code

    TF --> LocalStack
    TF --> IaC
    Ansible --> K8s

    K8s --> NS
    NS --> AppPods
    NS --> DB
    DB --> PVC
    NS --> SVC
    NS --> CM
    AppPods -->|/metrics| Prom
    Prom --> Graf
    Prom --> Alerts
```

---

## 2. CI/CD Pipeline Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant GA as GitHub Actions
    participant DH as Docker Hub
    participant K8s as Kubernetes

    Dev->>GH: git push (main)
    GH->>GA: Trigger workflow
    GA->>GA: Checkout code
    GA->>GA: npm install
    GA->>GA: npm test
    GA->>GA: npm run lint
    GA->>GA: docker build
    GA->>GA: trivy scan
    GA->>DH: docker push (latest + SHA)
    DH-->>K8s: (manual) image pull
    K8s->>K8s: rolling update
    K8s-->>Dev: New version live
```

---

## 3. Kubernetes Resource Topology

```mermaid
flowchart TB
    subgraph NS["Namespace: capstone"]
        subgraph AppLayer["App Layer"]
            SVCApp[Service capstone-app<br/>NodePort:32649]
            DeployApp[Deployment capstone-app<br/>2 replicas]
            Pod1[Pod 1]
            Pod2[Pod 2]
            HPA[HorizontalPodAutoscaler<br/>2→6, CPU 70%]
        end

        subgraph DBLayer["Database Layer"]
            SVCDB[Service capstone-db<br/>ClusterIP:5432]
            DeployDB[Deployment capstone-db<br/>1 replica]
            PodDB[PostgreSQL Pod]
            PVC[PVC 1Gi]
        end

        subgraph Config["Configuration"]
            CM[ConfigMap]
            Secret[Secret]
        end
    end

    SVCApp --> Pod1
    SVCApp --> Pod2
    HPA --> DeployApp
    DeployApp --> Pod1
    DeployApp --> Pod2
    Pod1 --> SVCDB
    Pod2 --> SVCDB
    SVCDB --> PodDB
    PodDB --> PVC

    Pod1 -.-> CM
    Pod1 -.-> Secret
    Pod2 -.-> CM
    Pod2 -.-> Secret
```

---

## 4. Monitoring Data Flow

```mermaid
flowchart LR
    App[App Pods<br/>/metrics endpoint] -->|scrape 15s| Prom[Prometheus]
    NE[Node Exporter<br/>DaemonSet] -->|scrape 15s| Prom
    API[K8s API Server] -->|scrape 15s| Prom

    Prom -->|query| Graf[Grafana<br/>Dashboards]
    Prom -->|evaluate| Rules[Alert Rules]
    Rules -->|fire| AlertUI[Prometheus Alerts UI]
    Rules -->|fire| GrafAlerts[Grafana Alerting]

    User[DevOps Engineer] -->|view| Graf
    User -->|view| AlertUI
```

**Scrape targets:**
| Job | Targets | Interval |
|-----|---------|----------|
| `capstone-app` | 2 app pods | 15s |
| `kubernetes-apiservers` | kube-apiserver | 15s |
| `node-exporter` | Node (host metrics) | 15s |
| `prometheus` | Self | 15s |

---

## 5.

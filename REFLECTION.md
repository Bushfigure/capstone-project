# 📝 Reflection — DevOps Capstone Project

**Author:** Samuel Olumide Aransiola  
**Program:** LIT DevOps Engineering — March 2026 Cohort  
**Project:** Production-Ready DevOps Pipeline for a Cloud-Native Application

---

## Overview

This capstone was an exercise in **real-world DevOps debugging**. Of the ~40 hours spent, roughly half went into *making infrastructure work at all* — the other half into building the actual pipeline. What follows is an honest account of every substantive failure, its root cause, the fix, and what I learned.

---

## 🔴 Major Issues Encountered

### 1. Docker + AppArmor "permission denied" on container stop

**Symptom:**
```
Error response from daemon: cannot stop container: <id>: permission denied
```

Containers refused to stop, and `docker compose down` hung. Even `sudo` didn't help.

**Root cause:** Ubuntu 24.04's AppArmor security profiles block Docker from sending kill signals to its own containers in certain configurations. A known bug affecting Ubuntu 22.04/24.04.

**Fix:**
1. Killed the stuck process: `sudo kill $(pgrep -f <container-id>)`
2. Restarted the Docker daemon: `sudo systemctl restart docker`
3. **Permanent fix:** added `"apparmor": false` to `/etc/docker/daemon.json`

**Lesson:** Container runtimes interact with host security modules in non-obvious ways. `daemon.json` is your first stop for Docker weirdness. Also: this bug **recurred 3 times** during the project — persistence matters.

---

### 2. IPv6 DNS failures (`EAI_AGAIN`, "network is unreachable")

**Symptom:**
```
Error: getaddrinfo EAI_AGAIN db
dial tcp [2600:...]:443: connect: network is unreachable
```

Docker containers couldn't resolve each other, and external lookups over IPv6 failed. Affected Docker pulls, Node.js DB connections, and even `terraform init`.

**Root cause:** My ISP provides broken IPv6 connectivity. Tools were preferring IPv6 (via `AAAA` DNS records) and failing instead of falling back to IPv4. systemd-resolved's stub at `127.0.0.53` was also involved.

**Fix:**
1. `/etc/gai.conf` — uncommented `precedence ::ffff:0:0/96 100` to prefer IPv4
2. `/etc/docker/daemon.json` — set `"ipv6": false` and explicit DNS servers `["8.8.8.8", "1.1.1.1"]`
3. Systemd-resolved was bypassed entirely for Docker

**Lesson:** "The internet works but Docker doesn't" almost always points to a networking preference issue. `gai.conf` is a powerful but rarely-mentioned fix. This one cascaded through **five different tools** (Docker, Node.js, Terraform, apt, Minikube).

---

### 3. Ubuntu `archive.ubuntu.com` unreachable during `apt install ansible`

**Symptom:** `apt install ansible` timed out connecting to `archive.ubuntu.com:80` on port 80. But HTTPS repos (Hashicorp, Docker, Grafana) worked fine.

**Root cause:** My network blocks outbound HTTP (port 80) to some IPs. Ubuntu's default sources use HTTP. **Additionally**, Ubuntu 24.04 uses the newer **DEB822 format** (`/etc/apt/sources.list.d/ubuntu.sources`) — not the classic `sources.list`. My first `sed` command silently did nothing because it edited the wrong file.

**Fix:**
1. Edited the **correct file**: `sudo sed -i 's|http://|https://|g' /etc/apt/sources.list.d/ubuntu.sources`
2. Verified with `grep URIs:`

**Fallback attempt:** `pip install ansible` — also blocked by PEP 668 ("externally-managed-environment"). Solution would have been `python3 -m venv`.

**Lesson:** Always know **which file** your package manager actually reads. Test network changes immediately with a single `curl` before running the full install. Read the error carefully — `Ign:` means "ignored/failed", not "done".

---

### 4. Port conflicts — 3000 and 5432

**Symptom 1:** Opening `http://localhost:3000` showed **Grafana**, not my app.  
**Symptom 2:** `docker compose up` failed with `failed to bind host port 0.0.0.0:5432/tcp: address already in use`.

**Root cause:**
- Grafana (from a prior installation) was already bound to port 3000
- A native host PostgreSQL was running on 5432

**Fix:**
- Moved the app to **host port 8080** (`"8080:3000"` in compose)
- **Commented out** the DB port mapping entirely — the app talks to Postgres over the internal Docker network, so exposing 5432 was unnecessary

**Lesson:** Never assume default ports are free. **Publishing DB ports publicly is a security anti-pattern anyway** — the fix doubled as a security improvement.

---

### 5. Stale Docker network → `ETIMEDOUT` between containers

**Symptom:** After rebuilding the app container, it couldn't reach the DB:
```
Error: connect ETIMEDOUT 172.19.0.2:5432
```

DNS resolved correctly, but TCP timed out. The DB container was 4 days old; the app container was brand new.

**Root cause:** Rebuilding containers had orphaned the DB onto a **stale network**. Both containers were technically "up" but on different bridges.

**Fix:**
1. Restarted Docker daemon: `sudo systemctl restart docker`
2. Removed both containers: `sudo docker rm -f capstone-db capstone-app`
3. Recreated everything fresh: `docker compose up -d --build`

**Lesson:** "Both containers up, but can't talk to each other" → **network mismatch**. `docker network inspect <network>` shows which containers are actually attached. When in doubt, `down` + `up` entirely.

---

### 6. Minikube cluster crash after killing `dockerd`

**Symptom:** After `pkill -9 -f dockerd` (to fix issue #5), Minikube became unreachable:
```
dial tcp 192.168.49.2:8443: connect: no route to host
```

**Root cause:** **Minikube runs inside a Docker container**. Killing `dockerd` killed the Minikube node too, and it didn't restart automatically.

**Fix:** `minikube start` — Minikube detected the existing profile and restarted the container. **All workloads recovered automatically** (Kubernetes is designed for this). Even PVCs were preserved.

**Lesson:** Know your dependencies. `pkill -9 dockerd` takes down *everything* Docker-managed — including your local Kubernetes cluster. Next time: use `sudo systemctl restart docker` for a graceful restart, or accept the K8s reboot cost.

---

### 7. Kubernetes serving old image after code change

**Symptom:** After updating the frontend, the browser still showed the **old UI**, even after `kubectl rollout restart`.

**Root cause:** The Deployment manifest was pointing at **`duke756/capstone-app:latest`** — a placeholder image I'd used in my initial manifest template. I had never updated it to my real image name.

**Diagnosis:** `kubectl describe pod -n capstone -l app=capstone-app | grep Image:` revealed the wrong image.

**Fix:** Updated `kubernetes/06-app-deployment.yml`:
```yaml
image: capstone-app:local
imagePullPolicy: IfNotPresent
```
Then `kubectl apply -f kubernetes/06-app-deployment.yml` triggered a proper rolling update.

**Lesson:** **Always verify the running image.** After editing app code: build → load/push → update manifest → `kubectl apply` → verify with `describe pod`. Skipping any step leaves you running stale code.

---

### 8. Terraform provider install failure (IPv6 again)

**Symptom:**
```
Error: Failed to install provider
│ could not query provider registry for registry.terraform.io/hashicorp/aws:
│ Get "https://releases.hashicorp.com/.../SHA256SUMS":
│ dial tcp [2600:9000:...]:443: connect: network is unreachable
```

**Root cause:** Same IPv6 issue as #2 — HashiCorp's release server was being reached over IPv6.

**Fix:** The `gai.conf` change from #2 solved it globally. After that, `terraform init` worked.

**Lesson:** A single system-level fix (`gai.conf`) resolved issues across **many** tools. Root-cause fixes beat tool-specific workarounds.

---

### 9. Grafana dashboard showing "No data" after import

**Symptom:** Imported dashboard loaded, but every panel said "No data".

**Root cause:** The dashboard JSON hardcoded `"uid": "prometheus"` for datasources, but Grafana auto-provisioned the Prometheus datasource with a **random UID** (e.g. `PBFA97CFB590B2093`). Grafana couldn't find the referenced UID.

**Fix:** Rewrote the dashboard JSON to use `"datasource": "Prometheus"` (by **name** instead of UID). Grafana resolves names dynamically.

**Lesson:** Portable dashboards should reference datasources by name, not UID. This is a **very common** Grafana import gotcha.

---

### 10. Missing HPA metrics

**Symptom:** HPA created but showed `<unknown>` for CPU utilization.

**Root cause:** The metrics-server addon wasn't installed in Minikube.

**Fix:** Attempted `minikube addons enable metrics-server` — but it couldn't pull the image due to the same IPv6 issue. Documented as a **known limitation** in the project.

**Lesson:** Not every feature needs to be 100% operational for a capstone — documenting what's missing and why is equally valuable. **Candor beats false completeness.**

---

## 🟢 What Went Well

- **Docker Compose worked** on first try once ports were sorted
- **GitHub Actions pipeline** succeeded after fixing the initial secret naming issue
- **Terraform** planned and applied cleanly after the IPv6 fix
- **Kubernetes deployment** was stable across restarts
- **Prometheus scraping** worked immediately after manifest apply
- **Grafana dashboard import** succeeded (after the datasource fix)

---

##  Key Learnings

1. **Network layers matter.** Most "Docker is broken" issues are DNS, IPv6, or iptables at the host level.

2. **Read errors carefully.** `ETIMEDOUT` ≠ `ECONNREFUSED` ≠ `EAI_AGAIN` — each points to a different root cause.

3. **Restart is a valid debugging step** for Docker daemons, K8s control planes, and networks — but only after understanding **why** something is stuck.

4. **Secrets hygiene matters from day one.** I leaked a Docker Hub token in a paste — had to revoke and regenerate. Never put values in code, only references.

5. **Verify what's actually running.** `kubectl describe pod | grep Image` should be as routine as `git status`.

6. **Document the failures.** This reflection file is arguably more valuable than the code — it's the difference between "I ran some commands" and "I understand what happened."

7. **IaC is only as good as its environment.** Terraform against LocalStack taught me the code is portable — the network isn't.

---

##  What I'd Do Differently Next Time

1. **Set up IPv4 preference on day 1** — save hours of debugging.
2. **Lock down ports from the start** — never assume defaults.
3. **Use `.env` files with a `.env.example`** — avoid inline secrets entirely.
4. **Add `restart: on-failure`** to Docker Compose services up front.
5. **Verify image references in every manifest** as a checklist item.
6. **Prefer Kustomize/Helm** for K8s — file ordering and env-specific overlays are easier than raw `kubectl apply`.
7. **Set up monitoring earlier** — the `app_http_requests_total` metric would have caught issue #5 immediately.

---

## 🏆 Final Thoughts

The capstone brief describes a "production-ready DevOps pipeline." After this project, I understand that the phrase doesn't mean "it never breaks" — it means **"when it breaks, you can identify why and recover quickly."**

Every issue documented here is now part of my toolbox. AppArmor, DEB822, IPv6 precedence, stale Docker networks, image reference drift — these aren't exotic. They're the everyday realities of infrastructure work, and I'm now equipped to handle them.

**~40 hours. 10 major issues resolved. 1 working production pipeline. 💪**

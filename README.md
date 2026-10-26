<div align="center">

# 🛡️ Cloudflare Rule Browser

**Next-generation, ultra-fast dashboard for inspecting, searching, editing, and bulk-managing Cloudflare IP Access Rules across accounts and all zones.**

[![React 19](https://img.shields.io/badge/React-19.3-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Vite 8](https://img.shields.io/badge/Vite-8.3%20(Rolldown)-646cff?style=flat-square&logo=vite)](https://vite.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Hono](https://img.shields.io/badge/Hono-v4.13-e36209?style=flat-square&logo=hono)](https://hono.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Alpine-2496ed?style=flat-square&logo=docker)](https://www.docker.com/)
[![GHCR](https://img.shields.io/badge/Registry-GHCR-2088FF?style=flat-square&logo=github)](https://github.com/aerzjee/cloudflare-rule-browser/pkgs/container/cloudflare-rule-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

[Key Features](#-key-features) • [Security Architecture](#-security-architecture) • [API Permissions](#-cloudflare-api-token-permissions) • [Getting Started](#-getting-started) • [Docker Deployment](#-docker--ghcr-deployment) • [CI/CD Pipeline](#-automated-cicd-pipeline)

</div>

---

## 📖 Overview

**Cloudflare Rule Browser** is a high-performance web dashboard tailored for DevOps, SecOps, and network engineers managing Cloudflare IP Access Rules. Standard Cloudflare dashboards can be cumbersome when auditing thousands of IP rules spread across hundreds of domains and accounts.

Cloudflare Rule Browser unifies rule exploration into a lightning-fast, reactive single-page application with offline-capable IndexedDB storage, multi-threaded API ingestion, inline rule editing, bulk actions, and a hardened reverse-proxy architecture.

---

## ✨ Key Features

### 🌐 Account-Level & All-Zones Modes
- **Account-Wide Scope**: Query and manage rules defined at the Cloudflare Account level (`/accounts/{account_id}/firewall/access_rules/rules`).
- **Automatic Zone Discovery**: In All-Zones mode, the application automatically enumerates all active domains within your Cloudflare account and aggregates zone-level firewall rules into a single consolidated view.
- **Scope Differentiation**: Distinct badges clearly distinguish whether a rule is enforced globally across the Account or scoped to a specific Zone (domain).

### ⚡ High-Performance Local Cache (1,000+ Rules)
- **IndexedDB Persistence (`idb-keyval`)**: Stores thousands of normalized rules locally on the client. After the initial sync, rule browsing, multi-column sorting, and complex regex/substring filtering operate with zero network latency.
- **Instant Local Updates**: Modifications and deletions update the IndexedDB cache immediately, ensuring zero UI stutter or waiting time for slow roundtrips.
- **Cache Invalidation & TTL**: Automatically flags stale data and re-syncs in the background.

### ✏️ Inline Editing & Bulk Operations
- **Inline Action / Mode Selector**: Change rule modes (`block`, `challenge`, `js_challenge`, `managed_challenge`, `bypass`) directly from the table row using a glassmorphic dropdown with smooth micro-interaction feedback.
- **Inline Note Editor**: Update rule comments/notes on the fly with automatic keyboard bindings (`Enter` to save, `Esc` to cancel).
- **Batch Selection & Bulk Delete**: Multi-select rules across pages with a floating bulk action bar, visual selection counter, and a safe confirmation modal showing target IP identifiers before executing deletions.

### 🚀 Multi-Threaded Pagination & Smart Auto-Refresh
- **Configurable Concurrency (`p-limit`)**: Accelerate rule fetching using 1 to 6 parallel worker threads. Large accounts with thousands of rules sync in seconds.
- **Live Countdown Badge**: A dedicated navbar badge displays real-time seconds remaining until the next automatic synchronization, with a hover tooltip revealing the exact timestamp of the last successful refresh.
- **First-Page Delta Sync**: Rather than performing slow full downloads, background polling checks page 1 (`order=created_on&direction=desc`) to identify newly created rules and merge them into the local cache with minimal API quota consumption.

### 🎨 Modern Glassmorphism UI & i18n
- **Design System**: Frosted-glass aesthetics crafted with Tailwind CSS v4, CSS backdrop filters, and refined dark/light color schemes.
- **Fluid Layout Transitions**: Seamless row insertion, removal, and sorting powered by `motion` and `@formkit/auto-animate`.
- **Built-in Changelog Viewer**: Click the version badge in the navbar to open an interactive modal showing chronological Git release notes and categorized commit logs.
- **Internationalization (i18n)**: Fully typed bilingual support for **English** (default) and **Polish**, switchable at any time from the Settings modal.

---

## 🔒 Security Architecture

Cloudflare Rule Browser was engineered following zero-trust principles and defensive coding standards:

```mermaid
flowchart LR
    Browser["Client Browser\n(SPA / React 19)"]
    Proxy["Hono Micro-Server\n(Strict Reverse Proxy)"]
    CF["Cloudflare API v4\n(api.cloudflare.com)"]

    Browser -- "1. XOR-Obfuscated Token\n2. Filtered Request" --> Proxy
    Proxy -- "3. Strict Header Allowlist\n4. TLS / SNI Resolution" --> CF
    CF -- "5. Upstream Response" --> Proxy
    Proxy -- "6. Sanitized Data + CSP" --> Browser
```

### 1. Hono Micro-Server as a Secure Reverse Proxy
Direct browser-to-Cloudflare API communication fails due to browser CORS restrictions and TLS SNI certificate negotiation constraints. Cloudflare Rule Browser embeds a dedicated Node.js micro-server built with **Hono**:
- Proxies requests under `/api/cf/*` to `https://api.cloudflare.com/client/v4/*`.
- Completely decouples client browsers from direct upstream Cloudflare endpoints.
- Isolates network traffic and prevents unauthorized cross-origin requests.

### 2. Strict Header Allowlist
The proxy enforces an explicit allowlist of headers:
```typescript
const allowedHeaders = ['authorization', 'x-auth-email', 'x-auth-key', 'content-type']
```
All internal headers, cookies, host identifiers, and untrusted client headers are stripped before dispatching requests to Cloudflare. Upstream error responses sanitize internal infrastructure messages before returning them to the client.

### 3. Client-Side Data Obfuscation
API tokens and credentials stored in browser `localStorage` are masked using an XOR-based cipher. While client storage cannot defend against full device compromise, this prevents casual token exposure in browser inspection tools, screen shares, and shoulder-surfing.

### 4. Hardened Content Security Policy (CSP)
Every HTTP response is delivered with strict security headers:
- `default-src 'self'`
- `connect-src 'self'`
- `script-src 'self'` (strictly prohibits `'unsafe-eval'` and external script execution)
- `style-src 'self' 'unsafe-inline'`
- `object-src 'none'`
- `base-uri 'self'`

### 5. Unprivileged Container Execution
The Docker image runs under the built-in, unprivileged `node` user (`UID 1000`) rather than `root`, mitigating container escape risks in shared container orchestration environments.

### 6. Zero-Trace Logout
Clicking **Disconnect** executes a complete wipe of the active session:
- Memory state in Zustand stores is reset.
- IndexedDB rule databases are deleted.
- LocalStorage keys (`cf-app-auth`, `cf-rules-cache`) are erased.
- Navigation redirects immediately to the authentication landing page.

---

## 🔑 Cloudflare API Token Permissions

Cloudflare Rule Browser strictly adheres to the **Principle of Least Privilege**.

### Recommended: Scoped API Token

Generate an API Token in the [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) (`My Profile` > `API Tokens` > `Create Token` > `Create Custom Token`) with the following permissions:

| Scope | Resource | Permission | Purpose |
| :--- | :--- | :--- | :--- |
| **Account** | `Account Firewall Access Rules` | **Read** / **Edit** | Query, update, and delete rules at the Account level. |
| **Zone** | `Zone` | **Read** | Discover active domains/zones (required for *All Zones* mode). |
| **Zone** | `Zone Firewall Access Rules` | **Read** / **Edit** | Query, update, and delete rules applied to specific zones. |

> [!NOTE]
> If you only plan to manage account-level firewall rules and check **Account level only** on the login screen, the `Zone` permissions can be completely omitted.

### Alternative: Global API Key (Legacy)
For legacy configurations, you may authenticate using your Cloudflare account **Email** and **Global API Key**. The proxy forwards `X-Auth-Email` and `X-Auth-Key` headers securely.

---

## 🛠️ Getting Started

### Prerequisites
- **Node.js**: `v22.0.0` or higher
- **npm**: `v10.0.0` or higher (bundled with Node.js)
- **Git**

### Installation

Clone the repository and install dependencies using `npm ci`:

```bash
git clone https://github.com/aerzjee/cloudflare-rule-browser.git
cd cloudflare-rule-browser
npm ci
```

### Development Mode

Start the Vite development server with built-in API proxying:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Linting & Code Quality

Validate the codebase using the ultra-fast `oxlint` linter:

```bash
npm run lint
```

### Production Build & Local Preview

Build the optimized SPA bundle and launch the Hono production server:

```bash
# Build the project (generates changelog, runs tsc, bundles with Vite Rolldown)
npm run build

# Launch the production Hono server on port 3000
npm run start
```

Or run the all-in-one preview script:
```bash
npm run preview:prod
```

Navigate to [http://localhost:3000](http://localhost:3000) to inspect the production release.

---

## 🐳 Docker & GHCR Deployment

Cloudflare Rule Browser is packaged as a minimal, multi-stage Alpine Docker image and published to the GitHub Container Registry (GHCR).

### Running via Docker CLI

```bash
docker run -d \
  --name cloudflare-rule-browser \
  -p 3000:3000 \
  --restart unless-stopped \
  ghcr.io/aerzjee/cloudflare-rule-browser:latest
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production `docker-compose.yml`

Create a `docker-compose.yml` file on your server:

```yaml
services:
  cloudflare-rule-browser:
    image: ghcr.io/aerzjee/cloudflare-rule-browser:latest
    container_name: cf-rule-browser
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 5s
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 256M
        reservations:
          memory: 64M
    security_opt:
      - no-new-privileges:true
```

Start the service:

```bash
docker compose up -d
```

Verify that the container is healthy:

```bash
docker compose ps
# Inspect health endpoint directly:
curl -i http://localhost:3000/api/health
```

### Building the Docker Image Locally

```bash
docker build -t cloudflare-rule-browser:local .
docker run -d -p 3000:3000 --name cf-local cloudflare-rule-browser:local
```

---

## 🚀 Automated CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/release-ghcr.yml`) for automated testing, tagging, and Docker publishing:

```mermaid
flowchart TD
    Tag["Push Git Tag\n(v1.2.0)"] --> Checkout["Checkout Repository\n(Full History & Tags)"]
    Checkout --> Gen["Generate Changelog\n(scripts/generate-changelog.mjs)"]
    Gen --> Build["Docker Buildx\n(Multi-Stage Build)"]
    Build --> GHCR["Publish Image to GHCR\n(:1.2.0, :1.2, :latest)"]
    Gen --> Release["Create GitHub Release\n(with RELEASE_NOTES.md)"]
```

When a semver tag (e.g. `v1.2.0`) is pushed to GitHub:
1. **Changelog Generation**: `scripts/generate-changelog.mjs` computes the delta between tags, categorizes commits (`feat`, `fix`, `perf`, `docs`), and writes `RELEASE_NOTES.md` and `src/generated/changelog.json`.
2. **Metadata Injection**: `APP_VERSION` and `GIT_COMMIT` build arguments are passed into the Docker build stage.
3. **Multi-tag Publication**: The container image is published to `ghcr.io/aerzjee/cloudflare-rule-browser` with semantic version tags (`1.2.0`, `1.2`, and `latest`).
4. **GitHub Release**: A formal GitHub Release is published with the generated Markdown notes attached.

---

## 🗂️ Project Structure

```
cloudflare-rule-browser/
├── .github/workflows/         # GitHub Actions workflows (release-ghcr.yml)
├── public/                    # Static public assets and favicons
├── scripts/
│   └── generate-changelog.mjs # Git commit parser & changelog generator
├── server/
│   └── index.ts               # Hono reverse proxy & static asset server
├── src/
│   ├── api/                   # Cloudflare API integration (accessRules.ts)
│   ├── components/
│   │   ├── layout/            # Navbar, settings modal, changelog modal
│   │   ├── rules/             # Table, bulk bar, inline note/mode editors
│   │   └── ui/                # Glassmorphic UI components & progress bars
│   ├── hooks/                 # Custom React hooks (React Query, mutations)
│   ├── i18n/                  # Typed translations (en, pl) & translation hook
│   ├── store/                 # Zustand state stores (auth, settings, rules)
│   ├── utils/                 # IndexedDB cache manager (idb-keyval), crypto
│   ├── App.tsx                # App entrypoint with lazy loading & Suspense
│   └── main.tsx               # DOM mount point
├── Dockerfile                 # Multi-stage production container definition
├── index.html                 # HTML shell
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
└── vite.config.ts             # Vite 8 config with Rolldown code-splitting
```

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).

<div align="center">

# Outlinr

**Deploy your GitHub repositories instantly.**<br>
Outlinr is a lightweight, zero-configuration Platform as a Service (PaaS) that automatically builds your Docker containers and provisions live subdomains for your web applications with zero infrastructure headaches.

[![Live Demo](https://img.shields.io/badge/Try_Outlinr_Live-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://outlinr.xyz)

![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)
![Status](https://img.shields.io/badge/status-Active-success.svg?style=flat-square)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4.1-6DB33F?style=flat-square&logo=spring)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)

</div>

![Outlinr Dashboard](./assets/dashboard.jpg)

---

## Quick Start
Get your own private PaaS running locally in under 60 seconds.

```bash
# 1. Clone the repository
git clone https://github.com/alexanderr/outlinr-paas.git
cd outlinr-paas

# 2. Configure environment
cp .env.example .env

# 3. Spin up the cluster
docker compose up --build -d
```
Visit `http://localhost:5173` to connect your GitHub account and launch your first app.

---

## Contributing
We love community contributions! Whether it's fixing a bug, adding a new feature, or improving documentation, your help is appreciated. 
Please read our [Contributing Guide](CONTRIBUTING.md) to learn about our development process, how to propose bugfixes and improvements, and how to build and test your changes.

---

## Additional Information

### Architecture & Tech Stack
Outlinr is engineered for speed and reliability, combining modern tooling to deliver a Vercel-like developer experience on your own hardware:
- **Backend Engine**: Spring Boot 3, Hibernate, PostgreSQL, Redis
- **Frontend Dashboard**: React, Vite, TailwindCSS (Dark Mode optimized)
- **Infrastructure Orchestration**: Docker Java API (Buildkit integration)
- **Dynamic Routing**: Caddy Server (Automatic Reverse Proxy & SSL)

### Core Features
- **Instant GitHub Deployments**: Select a repository and Outlinr builds and deploys it automatically.
- **Dynamic Subdomains**: Automatic routing to `*.localhost` (or your custom domain) powered by Caddy.
- **Live Build Logs**: Real-time deployment logs streamed directly to your browser.
- **Container Isolation**: Each app runs in its own securely sandboxed Docker container.
- **One-Click Teardown**: Completely remove an application and free up its resources with a single click.

### License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

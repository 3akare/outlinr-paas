# Contributing to Outlinr

First off, thanks for taking the time to contribute! Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

## Getting Started

1. **Fork the Project**
2. **Create your Feature Branch:** `git checkout -b feature/AmazingFeature`
3. **Commit your Changes:** `git commit -m 'Add some AmazingFeature'`
4. **Push to the Branch:** `git push origin feature/AmazingFeature`
5. **Open a Pull Request**

## Development Setup

To set up the development environment locally:

### Prerequisites
- Docker and Docker Compose
- Node.js (v18+)
- Java 21+ and Maven

### Running the Platform
You can spin up the entire cluster using Docker Compose:
```bash
cp .env.example .env
docker compose up --build -d
```
The frontend will be available at `http://localhost:5173`.

## Reporting Issues
If you find a bug or have a feature request, please open an issue in the repository. Provide as much context as possible, including steps to reproduce the bug or the reasoning behind your feature request.

## Code of Conduct
Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.

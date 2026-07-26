<div align="center">
  <h1>🚀 Zaheer's AI (Aura AI)</h1>
  <p><i>A powerful, full-stack AI platform built with cutting-edge technologies.</i></p>
  
  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#environment-variables">Env Variables</a>
  </p>
</div>

---

## ✨ Features

- **🧠 Multi-Model Agent:** Switch seamlessly between GitHub Models (GPT-4o), OpenRouter (Gemini 2.0 Pro), and Groq (Llama 3.3).
- **🌐 Real-Time Web Search:** Integrated with Tavily API for live internet access and up-to-date answers.
- **📚 RAG Capabilities:** Built-in support for Retrieval-Augmented Generation using Pinecone Vector Database for Document analysis.
- **⚡ High Performance:** Fast and scalable backend powered by Hono and Node.js.
- **🔐 Secure Authentication:** Seamless user authentication integrated with Clerk, plus a fully functional **Guest Mode** for quick access.
- **🎨 Modern UI:** Beautiful, responsive frontend built with React, Vite, Tailwind CSS, and Framer Motion.
- **🔄 Background Jobs:** Reliable background task processing using BullMQ and Redis (Upstash) for parsing heavy documents.
- **🗄️ Robust Database:** PostgreSQL data management with Prisma ORM.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 + Vite
- **Styling:** Tailwind CSS, Framer Motion, Lucide React
- **Authentication:** Clerk React
- **Markdown:** React Markdown, Rehype KaTeX

### Backend
- **Framework:** Hono + Node.js
- **Database ORM:** Prisma (PostgreSQL)
- **Vector DB:** Pinecone
- **Queue/Workers:** BullMQ (Redis via Upstash)
- **AI / LLMs:** Langchain (GitHub GPT-4o, OpenRouter Gemini, Groq)
- **Search API:** Tavily
- **File Processing:** PDF Parse, Office Parser, Cloudinary
- **Authentication:** Clerk Backend

### Infrastructure
- **Containers:** Docker & Docker Compose (for Postgres & Redis)

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) (for running Postgres & Redis locally)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/zaheer-ahmed77/zaheers-ai.git
cd zaheers-ai
```

### 2. Start the Database and Redis (Docker)
```bash
docker-compose up -d
```

### 3. Setup the Backend
```bash
cd server
npm install
# Set up your .env file in the server directory
npm run db:push
npm run db:generate
npm run dev
```

### 4. Setup the Worker (In a new terminal)
```bash
cd server
npm run worker
```

### 5. Setup the Frontend (In a new terminal)
```bash
cd frontend
npm install
# Set up your .env file in the frontend directory
npm run dev
```

## 🔐 Environment Variables

You'll need to set up the following keys in your respective `.env` files.

**Server (`server/.env`):**
- `DATABASE_URL` (Postgres connection string)
- `REDIS_URL` (Upstash or local Redis URL)
- `CLERK_SECRET_KEY` & `CLERK_PUBLISHABLE_KEY`
- API Keys for AI: `GITHUB_TOKEN` (for GPT-4o), `OPENROUTER_API_KEY` (for Gemini 2.0), `GROQ_API_KEY`, `GEMINI_API_KEY` (fallback)
- `TAVILY_API_KEY` (for Internet Search)
- `PINECONE_API_KEY` & `PINECONE_INDEX`
- Cloudinary Keys (if used for image uploads)

**Frontend (`frontend/.env`):**
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_API_URL` (URL of your Hono backend)

## 👨‍💻 Author

**Zaheer Ahmed**
- GitHub: [@zaheer-ahmed77](https://github.com/zaheer-ahmed77)

---
<div align="center">
  <i>Built with ❤️ by Zaheer Ahmed</i>
</div>

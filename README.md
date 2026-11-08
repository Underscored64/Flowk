# Flowk

**Flowk** is an automated enterprise workflow platform. It uses a "AI proposes, rules decide, a human validates" principle to automate multi-step workflows with full auditability and human approvals.

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+)
- [Docker & Docker Compose](https://docs.docker.com/compose/)
- PostgreSQL instance (or use the included Docker setup)

### 1. Setup Environment
Copy the example environment file and fill in your secrets.
```bash
cp .env.example .env
# Edit .env with your database credentials and VULTR_INFERENCE_BASE_URL
```

### 2. Start Infrastructure
Use Docker Compose to spin up the database and all necessary services.
```bash
docker compose up -d
```

### 3. Initialize Database
Run migrations to set up the schema and seed with demo data.
```bash
# Install dependencies if running locally
npm install

# Run migrations (if not using docker-compose command)
npx prisma migrate dev

# Seed the database
npm run seed
```

### 4. Running the Application
You can run the app in development mode or use the Docker containers.

**Development Mode:**
Open two terminal tabs:
```bash
# Tab 1: Web Server
npm run dev

# Tab 2: Background Worker (for jobs & automation)
npm run worker
```

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript (Strict mode)
- **Database**: PostgreSQL 16 with [Prisma 6](https://www.prisma.io/)
- **Background Jobs**: `pg-boss`
- **UI**: Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/)
- **Validation**: Zod & [json-logic-js](https://github.com/jwibble/json-logic-js)
- **Authentication**: Custom JWT session via `jose`

## 📂 Project Structure

- `src/app`: Next.js pages and routes
- `src/server`: Core server logic (auth, audit, engine)
- `src/worker`: Background job processing
- `prisma/`: Database schema and seeding
- `docs/`: Documentation and task definitions

## 🧪 Testing & Linting

```bash
# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

## 📜 License
MIT

# WiserWits Partners Portal

School management portal built with Next.js, MySQL, and NextAuth.

## Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **MySQL** 8.0+ (via local install, Docker, or DBngin/DBeaver)
- **npm** (comes with Node.js)

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
cd partners-portal
npm install
```

### 2. Create the database

Connect to MySQL and create the database:

```sql
CREATE DATABASE dev_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Or via terminal:

```bash
mysql -u root -p -e "CREATE DATABASE dev_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your MySQL credentials:

```
DB_HOST=127.0.0.1
DB_PORT=3306          # change if your MySQL runs on a different port
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=dev_db
```

Generate a secret for NextAuth:

```bash
openssl rand -base64 32
```

Paste the output as `AUTH_SECRET` and `NEXTAUTH_SECRET` in `.env.local`.

### 4. Run migrations

This creates all tables, views, indexes, and seeds the default roles + admin user:

```bash
npm run migrate
```

Check migration status:

```bash
npm run migrate:status
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Login

Default admin credentials (from seed migration):

| Field    | Value              |
|----------|--------------------|
| Email    | admin@school.com   |
| Password | password123        |

After login, you'll be redirected to `/setup-partner` to create your school profile.

**Change the default password after first login in production.**

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run migrate` | Apply pending database migrations |
| `npm run migrate:status` | Show migration status |
| `npm run migrate:create <name>` | Create a new migration file |

## Creating New Migrations

```bash
npm run migrate:create add_some_feature
```

This creates a new `.sql` file in `migrations/`. Edit it, then run `npm run migrate`.

## Project Structure

```
app/
  api/             # API routes (Next.js Route Handlers)
  lib/             # Shared utilities (db, auth, validations)
  school-admin/    # School admin pages
  teacher/         # Teacher pages
migrations/        # SQL migration files
  run.ts           # Migration runner
```

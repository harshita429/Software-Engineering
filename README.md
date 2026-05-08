# Module Organiser

A small dashboard for module organisers to manage assignments and post
announcements. The frontend is plain HTML/CSS/JS, the backend is Node +
Express, and the data lives in PostgreSQL.

## Setup

### 1. Database

Open psql, then run:

```sql
CREATE DATABASE module_organiser;
\c module_organiser
```

Then run the schema (paste the contents of `server/schema.sql` into psql).

### 2. Configure the connection

Copy `.env.example` to `.env` and edit `DB_PASSWORD` to match your local
postgres password.

```
copy .env.example .env
```

(On macOS/Linux: `cp .env.example .env`)

### 3. Install dependencies

```
npm install
```

### 4. Run the server

```
npm start
```

Then open <http://localhost:3000/module_organiser.html>.

## Project structure

```
module_organiser/
├── public/                 static files served by Express
│   ├── module_organiser.html
│   ├── styles.css
│   └── script.js           talks to /api/* via fetch()
├── server/
│   ├── server.js           Express app + REST endpoints
│   ├── db.js               Postgres connection pool
│   └── schema.sql          DDL + seed data
├── .env                    DB_PASSWORD lives here (don't commit)
└── package.json
```

## API endpoints

| Method | Path                       | Notes                              |
|--------|----------------------------|------------------------------------|
| GET    | /api/health                | Sanity check                       |
| GET    | /api/current-user          | Hardcoded to STF-1042 for now      |
| GET    | /api/modules               | For the filter dropdown            |
| GET    | /api/assignments           | Dashboard query (JOIN modules+staff) |
| POST   | /api/assignments           | Create                             |
| PUT    | /api/assignments/:id       | Edit                               |
| DELETE | /api/assignments/:id       | Delete                             |
| GET    | /api/announcements         | With author name JOINed in         |
| POST   | /api/announcements         | Post a new one                     |

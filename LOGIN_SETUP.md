# Running login locally

The frontend submits `POST /api/login` through the existing Vite or nginx proxy.
The backend also keeps the original `POST /login` endpoint.

## Configuration

Set `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `JWT_SECRET_KEY` in
the root `.env` file before starting Docker Compose. Generate a JWT secret with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Use the generated value for `JWT_SECRET_KEY`. Keep it private. The existing
repository tracks `.env`, so avoid committing that secret.

Start the application from the repository root:

```powershell
docker compose up --build
```

Open http://localhost:5173. The backend listens on port 8000.
For Vite development, run `npm run dev` in `Front End` while the backend is running.

## Seeded test accounts

Use a Campus ID, rather than an email address.

| Campus ID | Password | Role | Status |
| --- | --- | --- | --- |
| A001 | admin123 | admin | Approved; expires December 31, 2027 UTC |
| S001 | staff123 | staff | Approved; expires December 31, 2027 UTC |
| ST001 | student123 | student | Approved; expires May 31, 2027 UTC |
| D001 | dean123 | dean | Pending approval; login is blocked |

These credentials come from `database.sql`; they apply when that script has been
loaded into the database. PostgreSQL initialization scripts run only for a new
database volume. An existing database may contain different accounts. Do not
delete an existing volume to reload seed data if it contains data you need.

For an older local database with no password column, apply the additive login
migration and restart the backend:

```powershell
docker compose exec -T backend python -c "from pathlib import Path; from database import DBManager; db=DBManager(); db.cursor.execute(Path('migrations/001_local_login.sql').read_text()); db.close()"
docker compose restart backend
```

This adds the password column and the seeded `A001` administrator without
overwriting existing accounts. Existing accounts need passwords assigned
separately. This migration is for local development test credentials.

The script's password-column merge conflicts have been resolved, and sample
relationship rows referencing accounts absent from the seed data were removed
so a fresh initialization can finish.

## Session behavior

The frontend stores the access token in session storage for the current tab.
Refresh verifies it through `GET /api/me`. Sessions expire after eight hours;
Menu → Log Out removes the saved token and returns to login.

The current backend compares plaintext passwords. Replace this with password
hashing before using real accounts. Backend data endpoints must enforce token
and role validation themselves; frontend navigation does not enforce API access.

## Verification

```powershell
.venv/Scripts/python.exe -m unittest discover -s backend -p test_login.py -v
```

In `Front End`, run `npm test` and `npm run build`. API tests mock the database
and exercise the actual FastAPI routes and JWT encoding/validation.

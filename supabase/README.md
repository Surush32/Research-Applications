# Supabase Setup Guide

This guide walks you through creating a Supabase project and connecting it to the web app.

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account).
2. Click **New project**.
3. Choose an organization, name your project (e.g. `research-applications`), set a database password, and pick a region close to you.
4. Wait for the project to finish provisioning (~2 minutes).

## 2. Run the database migration

1. In your Supabase dashboard, open **SQL Editor**.
2. Click **New query**.
3. Copy the contents of `supabase/migrations/001_profiles.sql` from this repo and paste it into the editor.
4. Click **Run**.

This creates the `profiles` table, row-level security policies, and a trigger that auto-creates a profile when a user signs up.

## 3. Configure authentication

1. In the dashboard, go to **Authentication → Providers**.
2. Ensure **Email** is enabled (on by default).
3. For development, you may want to disable email confirmation:
   - Go to **Authentication → Providers → Email**
   - Turn off **Confirm email** (optional for local testing only)

### Auth redirect URL (for email confirmation / OAuth)

1. Go to **Authentication → URL Configuration**.
2. Add your site URL:
   - Local: `http://localhost:3000`
   - Production: your deployed domain
3. Add redirect URL:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

## 4. Connect the web app

1. Copy the env template:

   ```bash
   cp web/.env.local.example web/.env.local
   ```

2. In Supabase, go to **Project Settings → API**.
3. Copy **Project URL** → paste as `NEXT_PUBLIC_SUPABASE_URL`
4. Copy **anon public** key → paste as `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 5. Start the app

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What you get

| Feature | Route |
|---------|-------|
| Sign up | `/signup` |
| Log in | `/login` |
| Dashboard | `/dashboard` (protected) |
| Edit profile | `/profile` (protected) |

## Database schema

The `profiles` table stores user profile data linked to Supabase Auth:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | References `auth.users.id` |
| `email` | text | User email (from signup) |
| `full_name` | text | Display name |
| `username` | text | Unique username |
| `bio` | text | Short bio |
| `avatar_url` | text | Profile picture URL |
| `website` | text | Personal website |
| `created_at` | timestamptz | Account creation time |
| `updated_at` | timestamptz | Last profile update |

Row-level security ensures users can only **update** their own profile. Authenticated users can **read** all profiles.

## Troubleshooting

- **"Could not load your profile"** — Run the SQL migration in step 2.
- **Sign up works but login fails** — Check if email confirmation is required; confirm the email or disable confirmation for dev.
- **Redirect errors after email link** — Add `http://localhost:3000/auth/callback` to Supabase redirect URLs.

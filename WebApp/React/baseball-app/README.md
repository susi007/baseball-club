# Baseball Club React App

## Setup

1. In the Supabase project SQL Editor, run the migration in
   `supabase/migrations/20261105160000_create_club_tables.sql`.
2. Copy `.env.example` to `.env.local` in this directory and fill in the
   Supabase project URL and publishable key:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

3. Install dependencies and start the app:

   ```sh
   npm install
   npm run dev
   ```

Authenticated users can view the records. The migration grants data changes
only to `susi007garu@gmail.com`, enforced by Supabase row-level security.
Update the policies in the migration if the administrator changes.

The migration creates the schema only. Existing records in the local
PostgreSQL database must be exported and imported separately.

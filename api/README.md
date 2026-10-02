# Tree Care Data API

This Node API connects the static website's future staff tools to Supabase. It stores customer records on the server side and never exposes the Supabase service-role key to browser code.

## Data model

- `customers` stores customer contact and service-address details.
- `trees` belongs to a customer.
- `pests` and `diseases` are reference catalogs.
- `tree_pest_observations` and `tree_disease_observations` associate catalog entries with a tree, severity, status, date, and notes.

The API exposes authenticated CRUD routes for all six tables. Customer deletion is restricted while trees are attached; deleting a tree removes its observations. Catalog entries cannot be deleted while observations refer to them.

## Supabase setup

1. Create a Supabase project.
2. Apply `supabase/migrations/20260930000000_create_tree_care_records.sql` in the Supabase SQL Editor, or with the Supabase CLI.
3. Create staff accounts using Supabase Auth. A trusted administrator must set `app_metadata.role` to `staff` for each staff account. Do this with the Supabase Admin API from a trusted environment, never from browser code. The API denies requests without this server-controlled claim.
4. Copy `.env.example` to `.env` in this directory and fill in the project URL and service-role key. Keep `.env` private; never commit it or use the service-role key in a frontend.
5. Install and start the API:

   ```sh
   cd api
   npm install
   npm run dev
   ```

The health check is `GET http://localhost:3001/health`. Set `ALLOWED_ORIGINS` to the exact origins of any staff frontend. Requests without an `Origin` header are allowed for local/server-to-server use; browser origins not on the allowlist are rejected.

## Authentication and endpoints

Send a Supabase Auth access token as `Authorization: Bearer <access-token>`. The API verifies the token with Supabase and requires `app_metadata.role === "staff"` (or `app_metadata.roles` containing `"staff"`). All data routes are staff-only.

| Method | Route | Purpose |
| --- | --- | --- |
| GET, POST | `/api/customers` | List (up to 100) or create customers |
| GET, PATCH, DELETE | `/api/customers/:id` | Read, update, or delete a customer |
| GET, POST | `/api/trees` | List (up to 100) or create trees |
| GET, PATCH, DELETE | `/api/trees/:id` | Read, update, or delete a tree |
| GET, POST | `/api/pests` | List (up to 100) or create pest catalog entries |
| GET, PATCH, DELETE | `/api/pests/:id` | Read, update, or delete a pest |
| GET, POST | `/api/diseases` | List (up to 100) or create disease catalog entries |
| GET, PATCH, DELETE | `/api/diseases/:id` | Read, update, or delete a disease |
| GET, POST | `/api/tree-pest-observations` | List (up to 100) or create pest observations |
| GET, PATCH, DELETE | `/api/tree-pest-observations/:id` | Read, update, or delete an observation |
| GET, POST | `/api/tree-disease-observations` | List (up to 100) or create disease observations |
| GET, PATCH, DELETE | `/api/tree-disease-observations/:id` | Read, update, or delete an observation |

Successful responses use `{ "data": ... }`. Invalid input returns 400; missing records return 404; unauthenticated requests return 401; authenticated non-staff users return 403.

## Tests

```sh
cd api
npm install
npm test
```

Tests use an in-memory database stub and do not require a Supabase project. A live database connection cannot be verified until project credentials are configured.

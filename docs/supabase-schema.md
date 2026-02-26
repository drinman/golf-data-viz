# Supabase Schema Design

## Design Principles

1. **Support anonymous single-round use.** No auth required for MVP. `user_id` is nullable.
2. **Support authenticated round history.** When users create an account, they can save rounds and see trends over time.
3. **Support future community aggregation.** Schema allows anonymized queries across all rounds for building real benchmark data.
4. **Use Row Level Security (RLS).** Per-user data isolation. Anonymous rounds are write-only.
5. **Store calculated results.** SG values stored alongside raw input for fast retrieval — no re-calculation needed.

---

## Tables

### `rounds`

Primary table for round data. Stores raw input from the form and calculated SG results.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | `uuid` | No | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | Yes | `null` | FK → `auth.users(id)`. Null for anonymous rounds. |
| `created_at` | `timestamptz` | No | `now()` | When the record was created |
| `played_at` | `date` | No | — | Date the round was played |
| `course_name` | `text` | No | — | Course name (free text) |
| `score` | `smallint` | No | — | Total score |
| `handicap_index` | `numeric(3,1)` | No | — | Player's handicap at time of round |
| `course_rating` | `numeric(3,1)` | No | — | Course rating |
| `slope_rating` | `smallint` | No | — | Slope rating |
| `fairways_hit` | `smallint` | No | — | Fairways hit |
| `fairway_attempts` | `smallint` | No | — | Fairway holes (driveable par 4s/5s) |
| `greens_in_regulation` | `smallint` | No | — | GIR count |
| `total_putts` | `smallint` | No | — | Total putts |
| `penalty_strokes` | `smallint` | No | — | Penalty strokes |
| `eagles` | `smallint` | No | — | Eagle count |
| `birdies` | `smallint` | No | — | Birdie count |
| `pars` | `smallint` | No | — | Par count |
| `bogeys` | `smallint` | No | — | Bogey count |
| `double_bogeys` | `smallint` | No | — | Double bogey count |
| `triple_plus` | `smallint` | No | — | Triple bogey or worse |
| `up_and_down_attempts` | `smallint` | Yes | `null` | Short game attempts |
| `up_and_down_converted` | `smallint` | Yes | `null` | Successful up and downs |
| `sand_saves` | `smallint` | Yes | `null` | Sand save count |
| `sand_save_attempts` | `smallint` | Yes | `null` | Sand save attempts |
| `three_putts` | `smallint` | Yes | `null` | Three-putt count |
| `sg_total` | `numeric(4,2)` | Yes | `null` | Calculated total strokes gained |
| `sg_off_the_tee` | `numeric(4,2)` | Yes | `null` | SG: Off the tee |
| `sg_approach` | `numeric(4,2)` | Yes | `null` | SG: Approach |
| `sg_around_the_green` | `numeric(4,2)` | Yes | `null` | SG: Around the green |
| `sg_putting` | `numeric(4,2)` | Yes | `null` | SG: Putting |
| `benchmark_bracket` | `text` | Yes | `null` | Which handicap bracket was compared against (e.g., "10-15") |

#### Column Design Notes

- **`user_id` nullable:** MVP works without auth. Anonymous rounds can be saved (write-only) for community aggregation later. When a user creates an account, we could offer to claim anonymous rounds via a token.
- **SG columns nullable:** Calculated after insert, or when optional fields prevent calculation of a category.
- **`benchmark_bracket` stored:** If benchmark data is updated in the future, this records which version of benchmarks the user was compared against.
- **`course_name` as free text:** No normalized courses table for MVP. Future: add a `courses` table with deduplication and autocomplete.
- **`numeric(4,2)` for SG:** Allows values from -99.99 to 99.99. Typical SG range is -10 to +10. Extra room for edge cases.

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `idx_rounds_user_id` | `user_id` | Fast lookup of a user's round history |
| `idx_rounds_played_at` | `played_at` | Time-series queries (trends, recent rounds) |
| `idx_rounds_handicap` | `handicap_index` | Community aggregation queries by bracket |

### Check Constraints

| Constraint | Rule | Purpose |
|------------|------|---------|
| `chk_score_range` | `score BETWEEN 50 AND 150` | Sanity check |
| `chk_handicap_range` | `handicap_index BETWEEN 0 AND 54` | USGA handicap range |
| `chk_course_rating` | `course_rating BETWEEN 60 AND 80` | Reasonable course rating range |
| `chk_slope_rating` | `slope_rating BETWEEN 55 AND 155` | USGA slope range |
| `chk_scoring_sum` | `eagles + birdies + pars + bogeys + double_bogeys + triple_plus = 18` | Scoring must total 18 holes |
| `chk_fairways` | `fairways_hit <= fairway_attempts` | Can't hit more fairways than attempted |
| `chk_up_and_down` | `up_and_down_converted <= up_and_down_attempts` | Conversions can't exceed attempts |
| `chk_sand_saves` | `sand_saves <= sand_save_attempts` | Saves can't exceed attempts |

### Row Level Security Policies

| Policy | Operation | Rule | Description |
|--------|-----------|------|-------------|
| Anyone can insert | `INSERT` | `WITH CHECK (true)` | Allow anonymous round creation |
| Users read own rounds | `SELECT` | `USING (auth.uid() = user_id)` | Authenticated users see only their rounds |
| Users update own rounds | `UPDATE` | `USING (auth.uid() = user_id)` | Users can edit their own rounds |
| Users delete own rounds | `DELETE` | `USING (auth.uid() = user_id)` | Users can remove their own rounds |

**Note on anonymous reads:** Anonymous rounds (user_id = null) are intentionally not readable via the API. They exist only for future server-side aggregation jobs using the service role key.

---

## Type Mapping: TypeScript ↔ Postgres

The TypeScript `RoundInput` type maps to the `rounds` table columns. The naming convention changes from camelCase (TypeScript) to snake_case (Postgres):

| `RoundInput` field | `rounds` column |
|-------------------|----------------|
| `course` | `course_name` |
| `date` | `played_at` |
| `score` | `score` |
| `handicapIndex` | `handicap_index` |
| `courseRating` | `course_rating` |
| `slopeRating` | `slope_rating` |
| `fairwaysHit` | `fairways_hit` |
| `fairwayAttempts` | `fairway_attempts` |
| `greensInRegulation` | `greens_in_regulation` |
| `totalPutts` | `total_putts` |
| `penaltyStrokes` | `penalty_strokes` |
| `eagles` | `eagles` |
| `birdies` | `birdies` |
| `pars` | `pars` |
| `bogeys` | `bogeys` |
| `doubleBogeys` | `double_bogeys` |
| `triplePlus` | `triple_plus` |
| `upAndDownAttempts` | `up_and_down_attempts` |
| `upAndDownConverted` | `up_and_down_converted` |
| `sandSaves` | `sand_saves` |
| `sandSaveAttempts` | `sand_save_attempts` |
| `threePutts` | `three_putts` |

Additional columns in `rounds` (not in `RoundInput`): `id`, `user_id`, `created_at`, `sg_total`, `sg_off_the_tee`, `sg_approach`, `sg_around_the_green`, `sg_putting`, `benchmark_bracket`.

---

## Future Tables (Not for MVP)

### `courses` (Later)

Normalized course data for deduplication and autocomplete.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `name` | `text` | Course name |
| `city` | `text` | City |
| `state` | `text` | State/province |
| `country` | `text` | Country |
| `course_rating` | `numeric(3,1)` | Official rating |
| `slope_rating` | `smallint` | Official slope |

### `benchmark_snapshots` (Later)

Versioned benchmark data computed from community rounds.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Primary key |
| `bracket` | `text` | Handicap bracket |
| `computed_at` | `timestamptz` | When this snapshot was computed |
| `sample_size` | `integer` | Number of rounds in the computation |
| `data` | `jsonb` | Full `BracketBenchmark` as JSON |

---

## Migration Strategy

1. **Initial setup:** Run `docs/supabase-schema.sql` in the Supabase SQL Editor (or via `supabase db push`)
2. **Version control:** SQL file lives in the repo at `docs/supabase-schema.sql`
3. **Future migrations:** When the schema evolves, add migration files to `supabase/migrations/` using the Supabase CLI
4. **Environment:** Use `.env.local` for Supabase URL and anon key (never commit secrets)

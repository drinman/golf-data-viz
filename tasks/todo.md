# Golf Data Viz — Task Tracker

## Tool #1: Strokes Gained Benchmarker

### Phase 1: Foundation
- [ ] Source and compile handicap bracket benchmark data (Arccos public reports, Shot Scope, USGA)
- [ ] Implement strokes gained calculation engine (`src/lib/golf/strokes-gained.ts`)
- [ ] Build round input form (manual stats entry)
- [ ] Create Nivo radar chart wrapper component
- [ ] Wire up form → calculation → chart pipeline

### Phase 2: Shareable Output
- [ ] Add export-to-image (PNG/SVG) for radar chart
- [ ] Build shareable summary card (like Spotify Wrapped for a round)
- [ ] Add OG image generation via Nivo server-side rendering
- [ ] Social meta tags for link previews

### Phase 3: Polish & Launch
- [ ] Landing page design (Paper.design → code)
- [ ] Mobile-responsive layout
- [ ] Supabase auth (save rounds to your profile)
- [ ] Deploy to Vercel, custom domain
- [ ] Post to r/golf for feedback

### Future
- [ ] Arccos API integration (auto-import rounds)
- [ ] Garmin CSV import
- [ ] Multi-round trend analysis
- [ ] Tool #2: AI Post-Round Narrative Generator

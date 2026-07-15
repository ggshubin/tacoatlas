# CLAUDE.md

## API Error Handling

All endpoints use try-catch + error codes:

```js
app.get('/api/clients', async (req, res) => {
  try { ... } catch(e) {
    res.status(500).json({ error: msg });
  }
});
```

## Design Context

### Users
Casual taco lovers — people who eat tacos often and want a fun, low-effort way to remember and revisit spots. They log on their phone, often standing at a taco truck or right after eating. The job to be done: "help me remember this place and how I felt about it, in under a minute." Rating depth (salsa scores, chip scorecards) exists but must never feel like homework.

### Brand Personality
Clean & modern-minimal, with warmth. Three words: **refined, personal, appetizing**. The interface should evoke quiet confidence and collection pride — the feeling of a beautifully kept personal journal, not a review utility. Surprise comes from restraint, beautiful details, and moments of earned delight — not loudness.

### Aesthetic Direction
- **References**: Beli / Letterboxd (personal logging with identity, collection pride, year-in-review moments); Airbnb / modern map apps (polished map-first UX, smooth bottom sheets, fluid transitions).
- **Anti-references**: Yelp/Google-review generic utility feel; AI-generic dashboards; gamified clutter.
- **Current base**: dark warm palette — espresso brown (#18140F) bg, amber (#E8821A) accent, cream (#F5EDD8) text, cilantro green (#8BC34A) sparingly. Theme direction open. Open to new libraries (reanimated, skia, lottie) where they earn their place.

### Design Principles
1. **Under a minute** — every input flow completable one-handed in <60s; depth is progressive disclosure, never a gate.
2. **The atlas is the hero** — the growing personal map/collection is the emotional core; make progress visible and worth returning to.
3. **Restraint over decoration** — minimal surfaces, strong typography, generous space; one accent (amber) doing real work.
4. **Map-first fluidity** — sheets, transitions, and gestures should feel Airbnb-smooth; the map is a canvas, not a widget.
5. **Earned delight** — celebration moments are rare, refined, and personal — never confetti spam.

// ─────────────────────────────────────────────────────────────
// Feature flags
// ─────────────────────────────────────────────────────────────

/**
 * Give every account the full Pro feature set, regardless of purchase.
 *
 * TacoAtlas is crowdsourced: an atlas is only worth opening if other people
 * filled it in. The free tier gates exactly the behaviours that create that
 * value — public privacy, Mi Gente, cloud sync, more than 15 spots — so
 * while we're recruiting early adopters it suppresses supply and reads as
 * confusing rather than as an upsell.
 *
 * The free tier is switched off here, not deleted. Every gated branch still
 * lives in the codebase behind `useProStore().isPro`. Set this to `false`
 * and the 15-spot cap, private-only privacy, the Mi Gente gate, Pro-only
 * food categories, the Places search quota, the upgrade nudges and the
 * paywall all come back exactly as they were.
 */
export const PRO_FOR_ALL = true

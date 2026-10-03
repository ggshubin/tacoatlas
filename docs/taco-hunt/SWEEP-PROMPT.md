# TikTok taco sweep: Supabase instructions

Paste this into Cowork and ask it to update the "TikTok taco sweep" scheduled task
(`trig_01E5sMDe3744b2p9FigS3fsT`). Do this **after** the food_spots migrations are on
production. Before then, these functions don't exist and the sweep would fail.

---

> Update the "TikTok taco sweep" task. Keep how it reads my TikTok DMs and comments and
> how it geocodes. Change where it writes: the Taco Hunt list now lives in Supabase,
> project `szblruvrajswbpksinkv`, and it is shown at tacoatlas.app/hunt.
>
> **1. Read the current list first** with the Supabase connector's `execute_sql`:
> `select id, name, where_text, area, suggested_by from public.food_spots order by name;`
> and the last sweep time: `select last_sweep_at from public.food_spots_meta;`
> Only look at DMs and comments newer than that time.
>
> **2. For every suggestion, call one function.** Never INSERT, UPDATE or DELETE
> `food_spots` directly. The function enforces the rules: new spots stay private,
> my status, dates and notes are never touched, repeat handles don't add mentions,
> and pins outside the Portland area are refused.
>
> ```sql
> select public.food_spots_record_suggestion(
>   p_name => 'Taqueria Example',
>   p_handle => '@someone (DM)',            -- or '(comment)'
>   p_id => null,                           -- set to an existing id if it's a spot already on the list under another name
>   p_where => '122nd & Division',
>   p_addr => null,                         -- full street address when known
>   p_area => 'East Portland',              -- one of the existing area names
>   p_kind => 'truck',                      -- truck | restaurant | pop-up | stand | other
>   p_food => 'what to order',
>   p_hours => 'free text',
>   p_note => 'short note from the message', -- no phone numbers, no private people's names
>   p_lat => 45.50, p_lng => -122.54,       -- null if you couldn't geocode; never guess
>   p_geo_precision => 'cross-streets',     -- address | cross-streets | name-search | nearby
>   p_geo_match => 'what the geocoder matched',
>   p_status => null                        -- leave null; it picks todo or needs-info
> );
> ```
>
> If a suggestion is clearly a spot already on the list under a different name or
> spelling, pass that spot's `id` as `p_id` so it counts as another mention instead
> of becoming a duplicate. If you're unsure, list it in the report instead of guessing.
>
> **3. Finish** with `select public.food_spots_finish_sweep();`
>
> **4. Report** each function result (inserted / new_mention / repeat_handle, and any
> `coords_rejected: true`), plus possible duplicates you didn't merge.
>
> Never set `is_public`. Never write to the old claude.ai artifact database.

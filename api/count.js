import { createClient } from '@supabase/supabase-js';

const BETA_LIMIT = 20;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { count, error } = await supabase
      .from('beta_signups')
      .select('*', { count: 'exact', head: true })
      .eq('platform', 'android');

    if (error) {
      console.error('Count error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    const spotsLeft = Math.max(0, BETA_LIMIT - count);
    return res.status(200).json({
      count,
      limit: BETA_LIMIT,
      spotsLeft,
      isFull: count >= BETA_LIMIT
    });
  } catch (err) {
    console.error('Count handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

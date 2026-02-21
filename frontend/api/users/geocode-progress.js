import { success, error } from '../../lib/apiResponse.js';
import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end();
    return;
  }
  const auth = requireAuth(req, res);
  if (!auth) return;
  if (!supabase) return error(res, 'Database not configured', 500);

  const { count } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .not('address', 'is', null)
    .or('latitude.is.null,longitude.is.null');
  return success(res, { completed: 0, total: count ?? 0, timestamp: Math.floor(Date.now() / 1000), status: 'pending', is_stale: false });
}

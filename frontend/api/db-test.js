import { success, error } from '../lib/apiResponse.js';
import { supabase } from '../lib/supabase.js';

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
  if (!supabase) {
    return success(res, { status: 'failed', error: 'Supabase not configured', database_type: 'Supabase' });
  }
  try {
    const { error: e } = await supabase.from('users').select('id').limit(1);
    if (e) throw e;
    success(res, { status: 'connected', database_type: 'Supabase/PostgreSQL', current_time: new Date().toISOString() });
  } catch (e) {
    success(res, { status: 'failed', error: e?.message || String(e), database_type: 'Supabase' });
  }
}

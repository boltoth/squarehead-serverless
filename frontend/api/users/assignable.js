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
  const { data: users, error: e } = await supabase.from('users').select('*').eq('status', 'assignable').order('last_name').order('first_name');
  if (e) return error(res, 'Failed to retrieve assignable users: ' + e.message, 500);
  return success(res, { users: users || [], count: (users || []).length }, 'Assignable users retrieved successfully');
}

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

  const { data: schedule } = await supabase.from('schedules').select('*').eq('schedule_type', 'current').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single();
  if (!schedule) return success(res, { schedule: null, assignments: [], count: 0 }, 'No current schedule found');

  const { data: assignments } = await supabase.from('schedule_assignments').select('*').eq('schedule_id', schedule.id).order('dance_date');
  const userIds = [...new Set([...(assignments || []).flatMap((a) => [a.squarehead1_id, a.squarehead2_id].filter(Boolean))])];
  const { data: users } = userIds.length ? await supabase.from('users').select('id, first_name, last_name').in('id', userIds) : { data: [] };
  const byId = {};
  (users || []).forEach((u) => { byId[u.id] = u; });
  const withNames = (assignments || []).map((a) => ({
    ...a,
    squarehead1_first_name: a.squarehead1_id ? byId[a.squarehead1_id]?.first_name : null,
    squarehead1_last_name: a.squarehead1_id ? byId[a.squarehead1_id]?.last_name : null,
    squarehead2_first_name: a.squarehead2_id ? byId[a.squarehead2_id]?.first_name : null,
    squarehead2_last_name: a.squarehead2_id ? byId[a.squarehead2_id]?.last_name : null,
    squarehead1_name: a.squarehead1_id && byId[a.squarehead1_id] ? byId[a.squarehead1_id].first_name + ' ' + byId[a.squarehead1_id].last_name : null,
    squarehead2_name: a.squarehead2_id && byId[a.squarehead2_id] ? byId[a.squarehead2_id].first_name + ' ' + byId[a.squarehead2_id].last_name : null,
  }));

  return success(res, { schedule, assignments: withNames, count: withNames.length }, 'Current schedule retrieved successfully');
}

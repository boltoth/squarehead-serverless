import { success, error, notFound, validationError } from '../../../lib/apiResponse.js';
import { supabase } from '../../../lib/supabase.js';
import { requireAdmin } from '../../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    res.status(405).end();
    return;
  }
  const admin = requireAdmin(req, res);
  if (!admin) return;
  const id = parseInt(req.query.id, 10);
  if (!id) return error(res, 'Invalid assignment ID', 400);
  if (!supabase) return error(res, 'Database not configured', 500);

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return error(res, 'Invalid JSON', 400);
  }
  const allowed = ['squarehead1_id', 'squarehead2_id', 'club_night_type', 'notes'];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === 'squarehead1_id' || key === 'squarehead2_id') updates[key] = body[key] == null ? null : parseInt(body[key], 10);
      else updates[key] = body[key];
    }
  }
  if (body.club_night_type && !['NORMAL', 'FIFTH WED'].includes(body.club_night_type)) {
    return validationError(res, { club_night_type: 'Club night type must be either NORMAL or FIFTH WED' });
  }
  if (Object.keys(updates).length === 0) return validationError(res, [], 'Update data is required');

  const { data: updated, error: e } = await supabase.from('schedule_assignments').update(updates).eq('id', id).select().single();
  if (e) return error(res, 'Failed to update assignment: ' + e.message, 500);
  if (!updated) return notFound(res, 'Assignment not found');
  return success(res, updated, 'Assignment updated successfully');
}

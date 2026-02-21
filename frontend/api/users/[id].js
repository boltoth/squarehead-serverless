import { success, error, notFound } from '../../lib/apiResponse.js';
import { supabase } from '../../lib/supabase.js';
import { requireAuth, requireAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  const auth = requireAuth(req, res);
  if (!auth) return;
  const id = parseInt(req.query.id, 10);
  if (!id) return error(res, 'Invalid user ID', 400);
  if (!supabase) return error(res, 'Database not configured', 500);

  if (req.method === 'GET') {
    if (!auth.is_admin && auth.user_id !== id) return error(res, 'Access denied. You can only view your own profile.', 403);
    const { data: user, error: e } = await supabase.from('users').select('*').eq('id', id).single();
    if (e || !user) return notFound(res, 'User not found');
    return success(res, user);
  }

  if (req.method === 'PUT') {
    const { data: existing } = await supabase.from('users').select('id, email').eq('id', id).single();
    if (!existing) return notFound(res, 'User not found');
    if (!auth.is_admin && auth.user_id !== id) return error(res, 'Access denied. You can only edit your own profile.', 403);
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return error(res, 'Invalid JSON', 400);
    }
    const allowed = ['email', 'first_name', 'last_name', 'address', 'phone', 'role', 'partner_id', 'friend_id', 'status', 'birthday'];
    const updates = {};
    for (const key of allowed) {
      if (body[key] !== undefined) {
        if (key === 'partner_id' || key === 'friend_id') updates[key] = body[key] ? parseInt(body[key], 10) : null;
        else updates[key] = body[key];
      }
    }
    if (auth.is_admin && body.is_admin !== undefined) {
      if (existing.email === 'mpogue@zenstarstudio.com') updates.is_admin = true;
      else updates.is_admin = !!body.is_admin;
    }
    if (Object.keys(updates).length === 0) return error(res, 'No valid fields provided for update', 422);
    const { data: updated, error: updateErr } = await supabase.from('users').update(updates).eq('id', id).select().single();
    if (updateErr) return error(res, 'Failed to update user: ' + updateErr.message, 500);
    return success(res, updated, 'User updated successfully');
  }

  if (req.method === 'DELETE') {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    const { data: user } = await supabase.from('users').select('email').eq('id', id).single();
    if (!user) return notFound(res, 'User not found');
    if (auth.user_id === id) return error(res, 'You cannot delete your own account', 403);
    if (user.email === 'mpogue@zenstarstudio.com') return error(res, 'The permanent admin account cannot be deleted', 403);
    const { error: delErr } = await supabase.from('users').delete().eq('id', id);
    if (delErr) return error(res, 'Failed to delete user', 500);
    return success(res, null, 'User deleted successfully');
  }

  res.setHeader('Allow', 'GET, PUT, DELETE');
  res.status(405).end();
}

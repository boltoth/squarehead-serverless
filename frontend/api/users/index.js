import { success, error } from '../../lib/apiResponse.js';
import { supabase } from '../../lib/supabase.js';
import { requireAuth, requireAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  const auth = requireAuth(req, res);
  if (!auth) return;
  if (!supabase) return error(res, 'Database not configured', 500);

  if (req.method === 'GET') {
    const { data: users, error: e } = await supabase.from('users').select('*').order('last_name').order('first_name');
    if (e) return error(res, 'Failed to retrieve users: ' + e.message, 500);
    const byId = {};
    (users || []).forEach((u) => { byId[u.id] = u; });
    const mapped = (users || []).map((u) => ({
      ...u,
      partner_first_name: u.partner_id ? byId[u.partner_id]?.first_name : null,
      partner_last_name: u.partner_id ? byId[u.partner_id]?.last_name : null,
      friend_first_name: u.friend_id ? byId[u.friend_id]?.first_name : null,
      friend_last_name: u.friend_id ? byId[u.friend_id]?.last_name : null,
    }));
    return success(res, { users: mapped, count: mapped.length }, 'Users retrieved successfully');
  }

  if (req.method === 'POST') {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return error(res, 'Invalid JSON', 400);
    }
    const { email, first_name, last_name, address, phone, role, partner_id, friend_id, status, is_admin } = body;
    if (!email || !first_name || !last_name) {
      return res.status(422).end(JSON.stringify({ status: 'error', message: 'Validation failed', errors: { missing_fields: ['email', 'first_name', 'last_name'].filter((f) => !body[f]) } }));
    }
    const { data: inserted, error: insertErr } = await supabase
      .from('users')
      .insert({
        email: email.trim().toLowerCase(),
        first_name: (first_name || '').trim(),
        last_name: (last_name || '').trim(),
        address: address || '',
        phone: phone || '',
        role: role || 'member',
        partner_id: partner_id ? parseInt(partner_id, 10) : null,
        friend_id: friend_id ? parseInt(friend_id, 10) : null,
        status: status || 'assignable',
        is_admin: is_admin ? 1 : 0,
      })
      .select()
      .single();
    if (insertErr) return error(res, 'Failed to create user: ' + insertErr.message, 500);
    return success(res, inserted, 'User created successfully', 201);
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).end();
}

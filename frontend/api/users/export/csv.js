import { supabase } from '../../../lib/supabase.js';
import { requireAuth } from '../../../lib/auth.js';

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
  if (!supabase) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).end(JSON.stringify({ status: 'error', message: 'Database not configured' }));
    return;
  }
  const { data: users, error: e } = await supabase.from('users').select('*').order('last_name').order('first_name');
  if (e) {
    res.setHeader('Content-Type', 'application/json');
    res.status(500).end(JSON.stringify({ status: 'error', message: e.message }));
    return;
  }
  const byId = {};
  (users || []).forEach((u) => { byId[u.id] = u; });
  const escape = (v) => '"' + String(v || '').replace(/"/g, '""') + '"';
  const rows = [
    'first_name,last_name,email,phone,address,role,status,birthday,partner_first_name,partner_last_name,friend_first_name,friend_last_name',
    ...(users || []).map((u) =>
      [
        escape(u.first_name),
        escape(u.last_name),
        escape(u.email),
        escape(u.phone),
        escape(u.address),
        escape(u.is_admin ? 'admin' : 'member'),
        escape(u.status === 'loa' ? 'LOA' : u.status),
        escape(u.birthday ? u.birthday.replace(/-/g, '/') : ''),
        escape(u.partner_id ? byId[u.partner_id]?.first_name : ''),
        escape(u.partner_id ? byId[u.partner_id]?.last_name : ''),
        escape(u.friend_id ? byId[u.friend_id]?.first_name : ''),
        escape(u.friend_id ? byId[u.friend_id]?.last_name : ''),
      ].join(',')
    ),
  ];
  const csv = rows.join('\n');
  const filename = 'members-export-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.csv';
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.status(200).end(csv);
}

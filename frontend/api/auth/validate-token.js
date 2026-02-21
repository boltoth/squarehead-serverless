import { success, error, validationError } from '../../lib/apiResponse.js';
import { supabase } from '../../lib/supabase.js';
import { signToken } from '../../lib/jwt.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).end();
    return;
  }
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return validationError(res, { token: 'Token is required' });
  }
  const token = (body.token || '').trim();
  if (!token) return validationError(res, { token: 'Token is required' });

  if (!supabase) return error(res, 'Server configuration error', 500);

  const { data: row, error: fetchErr } = await supabase
    .from('login_tokens')
    .select('user_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .is('used_at', null)
    .single();

  if (fetchErr || !row) {
    const { data: used } = await supabase.from('login_tokens').select('used_at, expires_at').eq('token', token).single();
    if (used?.used_at) return error(res, 'Token has already been used', 401);
    if (used?.expires_at && new Date(used.expires_at) < new Date()) return error(res, 'Token has expired', 401);
    return error(res, 'Invalid or expired token', 401);
  }

  const { data: user, error: userErr } = await supabase.from('users').select('*').eq('id', row.user_id).single();
  if (userErr || !user) return error(res, 'User not found', 401);
  await supabase.from('login_tokens').update({ used_at: new Date().toISOString() }).eq('token', token);

  const jwtPayload = {
    user_id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    is_admin: user.email === 'mpogue@zenstarstudio.com' ? true : !!user.is_admin,
  };
  const jwtToken = signToken(jwtPayload);

  success(res, {
    token: jwtToken,
    user: {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      is_admin: jwtPayload.is_admin,
    },
  }, 'Login successful');
}

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
  let dbStatus = { status: 'unknown' };
  if (supabase) {
    try {
      const { error: e } = await supabase.from('users').select('id').limit(1);
      dbStatus = e ? { status: 'failed', error: e.message } : { status: 'connected', database_type: 'Supabase/PostgreSQL' };
    } catch (e) {
      dbStatus = { status: 'failed', error: e.message };
    }
  }
  success(res, {
    status: 'operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    endpoints: [
      'GET /api/health',
      'GET /api/status',
      'GET /api/db-test',
      'POST /api/auth/send-login-link',
      'POST /api/auth/validate-token',
      'GET /api/users',
      'GET /api/settings',
      'GET /api/schedules/current',
      'GET /api/schedules/next',
    ],
  });
}

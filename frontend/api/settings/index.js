import { success, error, validationError } from '../../lib/apiResponse.js';
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
    const { data: rows, error: e } = await supabase.from('settings').select('setting_key, setting_value');
    if (e) return error(res, 'Failed to retrieve settings: ' + e.message, 500);
    const settings = {};
    (rows || []).forEach((r) => { settings[r.setting_key] = r.setting_value; });
    return success(res, settings, 'Settings retrieved successfully');
  }

  if (req.method === 'PUT') {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return validationError(res, [], 'Valid settings data is required');
    }
    if (!body || typeof body !== 'object') return validationError(res, [], 'Valid settings data is required');
    const allowed = [
      'club_name', 'club_subtitle', 'club_address', 'club_lat', 'club_lng', 'club_color', 'club_day_of_week',
      'reminder_days', 'club_logo_url', 'club_logo_data', 'google_api_key', 'email_from_name', 'email_from_address',
      'email_template_subject', 'email_template_body', 'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
      'system_timezone', 'max_upload_size', 'geocoding_batch_size', 'backup_enabled', 'backup_frequency',
    ];
    for (const key of Object.keys(body)) {
      if (!allowed.includes(key)) continue;
      const value = body[key] == null ? '' : String(body[key]);
      await supabase.from('settings').upsert(
        { setting_key: key, setting_value: value, setting_type: 'string', updated_at: new Date().toISOString() },
        { onConflict: 'setting_key' }
      );
    }
    const { data: rows } = await supabase.from('settings').select('setting_key, setting_value');
    const settings = {};
    (rows || []).forEach((r) => { settings[r.setting_key] = r.setting_value; });
    return success(res, settings, 'Settings updated successfully');
  }

  res.setHeader('Allow', 'GET, PUT');
  res.status(405).end();
}

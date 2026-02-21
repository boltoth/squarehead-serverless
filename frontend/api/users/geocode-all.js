import { success, error } from '../../lib/apiResponse.js';
import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';

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
  const admin = requireAdmin(req, res);
  if (!admin) return;
  if (!supabase) return error(res, 'Database not configured', 500);

  const { data: keyRow } = await supabase.from('settings').select('setting_value').eq('setting_key', 'google_api_key').single();
  const apiKey = keyRow?.setting_value;
  if (!apiKey) return error(res, 'Google Maps API key not configured in settings', 400);

  const { data: toGeocode } = await supabase
    .from('users')
    .select('id, address')
    .not('address', 'is', null)
    .or('latitude.is.null,longitude.is.null')
    .limit(50);
  if (!toGeocode?.length) return success(res, { geocoded: 0, total: 0, errors: [] }, 'No valid addresses found that need geocoding');

  let geocoded = 0;
  const errors = [];
  for (const u of toGeocode) {
    const addr = (u.address || '').trim();
    if (addr.length < 10 || addr === 'Web Host') continue;
    try {
      const url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(addr) + '&key=' + apiKey;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status !== 'OK' || !data.results?.[0]?.geometry?.location) {
        errors.push('User ID ' + u.id + ': ' + (data.status || 'No results'));
        continue;
      }
      const { lat, lng } = data.results[0].geometry.location;
      await supabase.from('users').update({ latitude: lat, longitude: lng, geocoded_at: new Date().toISOString() }).eq('id', u.id);
      geocoded++;
    } catch (e) {
      errors.push('User ID ' + u.id + ': ' + e.message);
    }
  }
  return success(res, { geocoded, total: toGeocode.length, errors }, 'Geocoding completed: ' + geocoded + ' addresses geocoded');
}

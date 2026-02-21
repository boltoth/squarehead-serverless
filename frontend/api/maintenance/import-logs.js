import { success, error } from '../../lib/apiResponse.js';
import { requireAdmin } from '../../lib/auth.js';

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
  const admin = requireAdmin(req, res);
  if (!admin) return;
  return success(res, {
    logs_found: false,
    import_logs_count: 0,
    skipped_users: [],
    time: new Date().toISOString(),
  }, 'Import logs retrieved (serverless: no file-based logs)');
}

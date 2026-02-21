import { success, error } from '../../lib/apiResponse.js';
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
  return success(res, { cleared: true, time: new Date().toISOString() }, 'Import logs cleared (serverless: no file-based logs)');
}

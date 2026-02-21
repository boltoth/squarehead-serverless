import { success } from '../lib/apiResponse.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).end();
    return;
  }
  success(res, { status: 'healthy', timestamp: new Date().toISOString(), version: '1.0.0' });
}

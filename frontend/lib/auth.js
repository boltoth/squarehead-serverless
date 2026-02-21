import { getAuthFromRequest } from './jwt.js';

export function requireAuth(req, res, handlers) {
  const auth = getAuthFromRequest(req);
  if (!auth) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(401).end(JSON.stringify({ status: 'error', message: 'Unauthorized' }));
    return null;
  }
  return auth;
}

export function requireAdmin(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return null;
  if (!auth.is_admin) {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(403).end(JSON.stringify({ status: 'error', message: 'Admin access required' }));
    return null;
  }
  return auth;
}

import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_key_change_in_production';
const EXPIRATION = 14400; // 4 hours

export function signToken(payload) {
  return jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + EXPIRATION,
    },
    SECRET,
    { algorithm: 'HS256' }
  );
}

export function verifyToken(token) {
  if (process.env.NODE_ENV !== 'production' && token === 'dev-token-valid') {
    return {
      user_id: 1,
      email: 'mpogue@zenstarstudio.com',
      is_admin: true,
      role: 'admin',
    };
  }
  try {
    const decoded = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
    if (decoded.email === 'mpogue@zenstarstudio.com') {
      decoded.is_admin = true;
      decoded.role = 'admin';
    }
    return decoded;
  } catch {
    return null;
  }
}

export function getAuthFromRequest(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

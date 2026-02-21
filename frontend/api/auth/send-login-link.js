import { success, error, validationError } from '../lib/apiResponse.js';
import { supabase } from '../../lib/supabase.js';
import { signToken } from '../../lib/jwt.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '');
}

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
    return validationError(res, { email: 'Valid JSON body required' });
  }
  const email = (body.email || '').trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    return validationError(res, { email: 'Valid email address is required' });
  }

  if (!supabase) {
    return error(res, 'Server configuration error', 500);
  }

  const { data: user } = await supabase.from('users').select('id, email, first_name, last_name, role, is_admin').eq('email', email).single();
  if (!user) {
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) return error(res, 'User not found with that email address.', 404, null, { details: 'Development mode: user not found.' });
    return success(res, null, 'If that email is registered, a login link has been sent.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { error: insertErr } = await supabase.from('login_tokens').insert({ token, user_id: user.id, expires_at: expiresAt });
  if (insertErr) {
    return error(res, 'Failed to create login token', 500);
  }

  const loginUrl = (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.APP_URL || 'http://localhost:5173') + '/login?token=' + encodeURIComponent(token);
  let emailSent = false;
  const smtpConfig = process.env.SMTP_HOST ? {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  } : null;
  if (smtpConfig) {
    try {
      const transporter = nodemailer.createTransport(smtpConfig);
      await transporter.sendMail({
        from: process.env.SMTP_FROM || smtpConfig.auth?.user,
        to: email,
        subject: 'Your login link',
        text: `Use this link to log in: ${loginUrl}`,
        html: `<p>Use this link to log in: <a href="${loginUrl}">${loginUrl}</a></p>`,
      });
      emailSent = true;
    } catch (e) {
      console.error('Send login email error:', e);
    }
  }

  if (!emailSent) {
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) return error(res, 'Email sending failed. Check SMTP settings.', 500, null, { development_only: { token, login_url: loginUrl } });
    return error(res, 'Failed to send login link. Please try again later.', 500);
  }

  const isDev = process.env.NODE_ENV !== 'production';
  const responseData = isDev ? { development_only: { token, login_url: loginUrl } } : null;
  success(res, responseData, 'Login link sent to your email address.');
}

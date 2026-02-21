import { success, error } from '../../lib/apiResponse.js';
import { supabase } from '../../lib/supabase.js';
import { requireAdmin } from '../../lib/auth.js';
import nodemailer from 'nodemailer';

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
  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {}
  const { data: settingsRows } = await supabase?.from('settings').select('setting_key, setting_value') ?? { data: [] };
  const settings = {};
  (settingsRows || []).forEach((r) => { settings[r.setting_key] = r.setting_value; });
  const config = {
    host: body.smtp_host || process.env.SMTP_HOST || settings.smtp_host,
    port: parseInt(body.smtp_port || process.env.SMTP_PORT || settings.smtp_port || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: (body.smtp_username || process.env.SMTP_USER || settings.smtp_username)
      ? { user: body.smtp_username || process.env.SMTP_USER || settings.smtp_username, pass: body.smtp_password || process.env.SMTP_PASS || settings.smtp_password }
      : undefined,
  };
  const transporter = nodemailer.createTransport(config);
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || settings.email_from_address || config.auth?.user,
      to: admin.email,
      subject: '[SMTP TEST] Email Configuration Test',
      text: 'SMTP test successful. If you received this, your configuration is working.',
      html: '<p>SMTP test successful.</p>',
    });
    return success(res, { test_email_sent_to: admin.email, smtp_host: config.host, smtp_port: config.port, timestamp: new Date().toISOString() }, 'SMTP test email sent successfully! Check your inbox.');
  } catch (e) {
    return error(res, 'SMTP configuration test failed: ' + e.message, 500, null, { error: e.message, smtp_host: config.host, smtp_port: config.port });
  }
}

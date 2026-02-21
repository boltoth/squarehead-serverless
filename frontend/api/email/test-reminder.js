import { success, error, validationError } from '../../lib/apiResponse.js';
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
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return validationError(res, { email: 'Email address is required' });
  }
  if (!body.email) return validationError(res, { email: 'Email address is required' });

  const { data: settingsRows } = await supabase?.from('settings').select('setting_key, setting_value') ?? { data: [] };
  const settings = {};
  (settingsRows || []).forEach((r) => { settings[r.setting_key] = r.setting_value; });
  const memberName = body.member_name || 'Test User';
  const danceDate = body.dance_date || new Date(Date.now() + 7 * 86400000).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const clubName = body.club_name || settings.club_name || 'Square Dance Club';
  const subject = (settings.email_template_subject || 'Squarehead Reminder - {club_name} Dance on {dance_date}')
    .replace(/{club_name}/g, clubName).replace(/{dance_date}/g, danceDate).replace(/{member_name}/g, memberName);
  const bodyText = (settings.email_template_body || 'Hello {member_name}, you are scheduled to be a squarehead for {club_name} on {dance_date}.')
    .replace(/{club_name}/g, clubName).replace(/{dance_date}/g, danceDate).replace(/{member_name}/g, memberName);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || settings.smtp_host,
    port: parseInt(process.env.SMTP_PORT || settings.smtp_port || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: (process.env.SMTP_USER || settings.smtp_username) ? { user: process.env.SMTP_USER || settings.smtp_username, pass: process.env.SMTP_PASS || settings.smtp_password } : undefined,
  });
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || settings.email_from_address || settings.smtp_username,
      to: body.email,
      subject: '[TEST] ' + subject,
      text: bodyText,
      html: '<p>' + bodyText.replace(/\n/g, '<br>') + '</p>',
    });
    return success(res, { email: body.email }, 'Test email sent successfully');
  } catch (e) {
    return error(res, 'Failed to send test email: ' + e.message, 500);
  }
}

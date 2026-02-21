import { success, error, validationError } from '../../lib/apiResponse.js';
import { supabase } from '../../lib/supabase.js';
import { requireAuth } from '../../lib/auth.js';
import formidable from 'formidable';

export const config = { api: { bodyParser: false } };

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if ((c === ',' && !inQuotes) || c === '\n' || c === '\r') {
      out.push(cur.trim());
      cur = '';
      if (c !== ',') break;
    } else {
      cur += c;
    }
  }
  if (cur !== '' || out.length > 0) out.push(cur.trim());
  return out;
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
  const auth = requireAuth(req, res);
  if (!auth) return;
  if (!supabase) return error(res, 'Database not configured', 500);

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
  const [fields, files] = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve([fields, files]);
    });
  });
  const file = files?.file?.[0] || files?.file;
  if (!file?.filepath) {
    return validationError(res, { file: 'No file uploaded with field name "file"' }, 'No file uploaded');
  }
  const fs = await import('fs');
  const raw = fs.readFileSync(file.filepath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return validationError(res, { file: 'Invalid CSV - need header and at least one row' }, 'Invalid CSV');

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s/g, '_'));
  const needEmail = headers.includes('email');
  const needName = headers.includes('first_name') && headers.includes('last_name');
  const hasName = headers.includes('name');
  if (!needEmail && !(needName && hasName)) {
    return validationError(res, { headers: 'Missing required columns: need email or first_name, last_name, name' }, 'Missing required columns');
  }

  const idx = (name) => {
    const i = headers.indexOf(name);
    return i >= 0 ? i : headers.indexOf(name.replace('_', ''));
  };
  let imported = 0;
  const errors = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length !== headers.length) {
      errors.push('Row ' + (i + 1) + ': column count mismatch');
      continue;
    }
    const row = {};
    headers.forEach((h, j) => { row[h] = (values[j] || '').trim(); });
    let first_name = row.first_name;
    let last_name = row.last_name;
    let email = (row.email || '').toLowerCase();
    if (row.name && (!first_name || !last_name)) {
      const parts = row.name.split(',');
      if (parts.length >= 2) {
        last_name = parts[0].trim();
        first_name = parts[1].trim();
      } else {
        const sp = row.name.trim().split(/\s+/);
        last_name = sp.pop() || '';
        first_name = sp.join(' ') || '';
      }
    }
    if (!email && first_name && last_name) email = (first_name + '.' + last_name).toLowerCase().replace(/\s/g, '') + '@placeholder.com';
    if (!email || !first_name) {
      errors.push('Row ' + (i + 1) + ': missing required fields');
      continue;
    }
    if (email === 'mpogue@zenstarstudio.com') continue;
    const { data: existing } = await supabase.from('users').select('id').eq('first_name', first_name).eq('last_name', last_name).eq('email', email).single();
    const status = (row.status || row.loa || row.title || '').toLowerCase().includes('loa') ? 'loa' : (row.title || '').toLowerCase().includes('booster') ? 'booster' : 'assignable';
    const record = {
      first_name,
      last_name,
      email,
      phone: row.phone || '',
      address: row.address || '',
      status,
      role: (row.role || '').toLowerCase() === 'admin' ? 'admin' : 'member',
      is_admin: (row.role || '').toLowerCase() === 'admin' ? 1 : 0,
      birthday: row.birthday || row["b'day"] || null,
      notes: row.notes || null,
    };
    if (existing) {
      const { error: upErr } = await supabase.from('users').update(record).eq('id', existing.id);
      if (upErr) errors.push('Row ' + (i + 1) + ': ' + upErr.message);
    } else {
      const { error: inErr } = await supabase.from('users').insert(record);
      if (inErr) errors.push('Row ' + (i + 1) + ': ' + inErr.message);
      else imported++;
    }
  }
  return success(res, { imported, updated: 0, skipped: 0, errors }, 'Import completed: ' + imported + ' users imported' + (errors.length ? ', ' + errors.length + ' errors' : ''));
}

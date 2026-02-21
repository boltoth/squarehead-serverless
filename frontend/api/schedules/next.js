import { success, error, validationError } from '../../lib/apiResponse.js';
import { supabase } from '../../lib/supabase.js';
import { requireAuth, requireAdmin } from '../../lib/auth.js';

const DAY_NUM = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function getNextWeekday(start, dayName) {
  const target = DAY_NUM[dayName] ?? 3;
  let d = new Date(start);
  while (d.getDay() !== target) d.setDate(d.getDate() + 1);
  return d;
}

function isFifthWeek(d) {
  return d.getDate() > 28;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  const auth = requireAuth(req, res);
  if (!auth) return;
  if (!supabase) return error(res, 'Database not configured', 500);

  if (req.method === 'GET') {
    const { data: schedule } = await supabase.from('schedules').select('*').eq('schedule_type', 'next').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single();
    if (!schedule) return success(res, { schedule: null, assignments: [], count: 0 }, 'No next schedule found');
    const { data: assignments } = await supabase.from('schedule_assignments').select('*').eq('schedule_id', schedule.id).order('dance_date');
    const userIds = [...new Set([...(assignments || []).flatMap((a) => [a.squarehead1_id, a.squarehead2_id].filter(Boolean))])];
    const { data: users } = userIds.length ? await supabase.from('users').select('id, first_name, last_name').in('id', userIds) : { data: [] };
    const byId = {};
    (users || []).forEach((u) => { byId[u.id] = u; });
    const withNames = (assignments || []).map((a) => ({
      ...a,
      squarehead1_first_name: a.squarehead1_id ? byId[a.squarehead1_id]?.first_name : null,
      squarehead1_last_name: a.squarehead1_id ? byId[a.squarehead1_id]?.last_name : null,
      squarehead2_first_name: a.squarehead2_id ? byId[a.squarehead2_id]?.first_name : null,
      squarehead2_last_name: a.squarehead2_id ? byId[a.squarehead2_id]?.last_name : null,
      squarehead1_name: a.squarehead1_id && byId[a.squarehead1_id] ? byId[a.squarehead1_id].first_name + ' ' + byId[a.squarehead1_id].last_name : null,
      squarehead2_name: a.squarehead2_id && byId[a.squarehead2_id] ? byId[a.squarehead2_id].first_name + ' ' + byId[a.squarehead2_id].last_name : null,
    }));
    return success(res, { schedule, assignments: withNames, count: withNames.length }, 'Next schedule retrieved successfully');
  }

  if (req.method === 'POST') {
    const admin = requireAdmin(req, res);
    if (!admin) return;
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return validationError(res, [], 'Invalid JSON');
    }
    const { name, start_date, end_date } = body;
    if (!name || !start_date || !end_date) {
      return validationError(res, { missing_fields: ['name', 'start_date', 'end_date'].filter((f) => !body[f]) }, 'Required fields are missing');
    }
    if (new Date(start_date) > new Date(end_date)) return validationError(res, { end_date: 'End date must be on or after start date' });

    await supabase.from('schedules').update({ is_active: false }).eq('schedule_type', 'next');
    const { data: newSchedule, error: createErr } = await supabase.from('schedules').insert({ name, schedule_type: 'next', start_date, end_date, is_active: true }).select().single();
    if (createErr) return error(res, 'Failed to create schedule: ' + createErr.message, 500);

    const { data: settings } = await supabase.from('settings').select('setting_value').eq('setting_key', 'club_day_of_week').single();
    const dayOfWeek = settings?.setting_value || 'Wednesday';
    const start = new Date(start_date);
    const end = new Date(end_date);
    const assignments = [];
    if (start_date === end_date) {
      const dateStr = start.toISOString().slice(0, 10);
      const clubNightType = isFifthWeek(start) ? 'FIFTH WED' : 'NORMAL';
      const { data: row } = await supabase.from('schedule_assignments').insert({ schedule_id: newSchedule.id, dance_date: dateStr, club_night_type: clubNightType }).select().single();
      if (row) assignments.push(row);
    } else {
      let current = getNextWeekday(start, dayOfWeek);
      while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      const clubNightType = isFifthWeek(current) ? 'FIFTH WED' : 'NORMAL';
      const { data: row } = await supabase.from('schedule_assignments').insert({ schedule_id: newSchedule.id, dance_date: dateStr, club_night_type: clubNightType }).select().single();
      if (row) assignments.push(row);
      current = addDays(current, 7);
      }
    }

    return success(res, { schedule: newSchedule, assignments, count: assignments.length }, 'Next schedule created successfully', 201);
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).end();
}

/**
 * База Роста AI — Cloudflare Worker
 * Один чат с ИИ-психологом (DeepSeek) + дневник состояния.
 *
 * Привязки (wrangler.toml / дашборд):
 *   D1 binding:  DB
 *   Secret:      DEEPSEEK_API_KEY
 *   Var (опц.):  DEEPSEEK_MODEL (по умолчанию deepseek-v4-flash)
 *
 * Эндпоинты:
 *   POST /api/user/init   — регистрация/обновление профиля Tilda Members
 *   POST /chat            — сообщение в чат → ответ ИИ (скрытый JSON парсится и сохраняется)
 *   GET  /history         — история переписки (восстановление чата при входе)
 *   GET  /state           — последний замер состояния (для дневника)
 *   GET  /state/history   — последние 7 замеров (для графика динамики)
 *   POST /test            — сохранить результат пройденного теста
 *   GET  /tests           — список пройденных тестов
 *   GET  /recommendations — накопленные рекомендации от ИИ
 */

const SYSTEM_PROMPT = `Ты — "База роста AI", премиальный цифровой психолог и персональный помощник по развитию личности.

Твоя задача — помогать пользователю анализировать своё эмоциональное состояние, развивать осознанность, работать с целями, привычками и личными изменениями.

========================
ЛИЧНОСТЬ И СТИЛЬ
========================

Ты общаешься как опытный психолог с большим количеством практики.

Твой стиль:
- спокойный;
- тёплый;
- профессиональный;
- поддерживающий;
- без осуждения;
- без шаблонных фраз.

Ты не просто отвечаешь, а ведёшь диалог:
- задаёшь вопросы;
- помогаешь человеку размышлять;
- предлагаешь конкретные действия.

Не говори:
"Я не знаю"
"Просто расслабься"
"Всё будет хорошо"

Вместо этого помогай человеку разобраться.

========================
АНАЛИЗ СОСТОЯНИЯ
========================

При каждом диалоге анализируй:

mood — настроение %
energy — энергия %
stress — уровень стресса %
confidence — уверенность %
motivation — мотивация %
happiness — удовлетворённость жизнью %

Оценивай показатели от 0 до 100.

Пример:

{
"state_update":{
"mood":70,
"energy":45,
"stress":60,
"confidence":55,
"motivation":65,
"happiness":70
}
}

Если информации недостаточно — не придумывай, оставляй null.


========================
ПАМЯТЬ ПОЛЬЗОВАТЕЛЯ
========================

Используй информацию из профиля пользователя.

Учитывай:
- имя;
- цели;
- проблемы;
- прошлые разговоры;
- результаты тестов;
- динамику состояния.

Если есть история:
сравнивай изменения.

Пример:

"Неделю назад твоя энергия была 35%, сейчас 55%. Похоже, появились положительные изменения."


========================
ПСИХОЛОГИЧЕСКИЕ ТЕСТЫ
========================

Если пользователь пишет:
- пройти тест
- хочу проверить себя
- сделать диагностику

Предложи меню:

1. Настроение
2. Энергия
3. Тревожность
4. Самооценка
5. Мотивация и цели


Каждый тест:

- 5-10 вопросов;
- ответы по шкале 1-5;
- автоматический расчёт результата.

После теста:

Верни:

Название теста:
Результат:
Процент:
Интерпретация:
Рекомендации:


========================
ДНЕВНИК СОСТОЯНИЯ
========================

Если пользователь пишет о своём дне:

Создай запись:

{
"diary_entry":{
"emotion":"",
"main_problem":"",
"positive_points":"",
"recommendation":"",
"mood":0,
"energy":0
}
}


========================
ПРАКТИКИ
========================

Предлагай персональные практики:

- дыхательные упражнения;
- работа с мыслями;
- благодарность;
- планирование;
- постановка целей;
- снижение тревоги;
- повышение энергии.


Формат:

Название:
Цель:
Время:
Как выполнять:
Ожидаемый результат:


========================
СИСТЕМА РЕКОМЕНДАЦИЙ
========================

На основе состояния создавай:

daily_recommendations:

Пример:

{
"recommendations":[
"Сегодня уделить 10 минут отдыху",
"Сделать дыхательную практику",
"Записать 3 достижения дня"
]
}


========================
ВАЖНО ДЛЯ БАЗЫ ДАННЫХ
========================

В конце каждого ответа формируй скрытый блок JSON.

Он нужен для сохранения в D1.

Формат:

{
"memory_update":{
"important_facts":[],
"user_goals":[],
"problems":[],
"preferences":[]
},

"state_update":{
"mood":null,
"energy":null,
"stress":null,
"confidence":null,
"motivation":null,
"happiness":null
},

"recommendations":[]
}


========================
БЕЗОПАСНОСТЬ
========================

Ты:
- не ставишь диагнозы;
- не заменяешь врача или психолога;
- не утверждаешь наличие заболеваний;
- при опасных ситуациях рекомендуешь обратиться за профессиональной помощью.


========================
ГЛАВНАЯ ЦЕЛЬ
========================

Каждый пользователь после общения должен получить:

1. Понимание своего состояния.
2. Поддержку.
3. Анализ.
4. Следующий конкретный шаг.

Ты являешься не просто чат-ботом, а персональной системой психологического развития человека.`;

const MODEL_DEFAULT = 'deepseek-v4-flash';
const HISTORY_LIMIT = 20;       // сколько последних сообщений отдаём модели
const MAX_MSG_LEN = 2000;       // ограничение длины входящего сообщения

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}

function safeParse(s) {
  try { return JSON.parse(s); } catch (e) { return null; }
}

// число 0..100 или null
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/user/init' && request.method === 'POST') return await userInit(request, env);
      if (url.pathname === '/chat' && request.method === 'POST') return await chat(request, env);
      if (url.pathname === '/history' && request.method === 'GET') return await chatHistory(url, env);
      if (url.pathname === '/state' && request.method === 'GET') return await state(url, env);
      if (url.pathname === '/state/history' && request.method === 'GET') return await stateHistory(url, env);
      if (url.pathname === '/test' && request.method === 'POST') return await testSave(request, env);
      if (url.pathname === '/tests' && request.method === 'GET') return await testsList(url, env);
      if (url.pathname === '/recommendations' && request.method === 'GET') return await recomList(url, env);
      return json({ error: 'not found' }, 404);
    } catch (e) {
      return json({ error: 'server error', detail: String(e && e.message || e) }, 500);
    }
  },
};

/* ================= ПОЛЬЗОВАТЕЛИ ================= */

async function upsertUser(env, u) {
  const uid = String(u.tilda_user_id || '').trim();
  if (!uid) return null;
  await env.DB.prepare(
    `INSERT INTO users (tilda_user_id, email, name) VALUES (?,?,?)
     ON CONFLICT(tilda_user_id) DO UPDATE SET
       email = CASE WHEN excluded.email <> '' THEN excluded.email ELSE users.email END,
       name  = CASE WHEN excluded.name  <> '' THEN excluded.name  ELSE users.name  END`
  ).bind(uid, String(u.email || ''), String(u.name || 'Пользователь')).run();
  return uid;
}

async function userInit(request, env) {
  const body = await request.json();
  const uid = await upsertUser(env, body);
  if (!uid) return json({ error: 'tilda_user_id required' }, 400);
  const user = await env.DB.prepare('SELECT name FROM users WHERE tilda_user_id=?').bind(uid).first();
  const s = await env.DB.prepare('SELECT id FROM states WHERE user_id=? LIMIT 1').bind(uid).first();
  const m = await env.DB.prepare('SELECT id FROM messages WHERE user_id=? LIMIT 1').bind(uid).first();
  return json({ ok: true, user_id: uid, name: user ? user.name : '', has_state: !!s, has_history: !!m });
}

/* ================= ИСТОРИЯ ЧАТА ================= */

async function chatHistory(url, env) {
  const uid = String(url.searchParams.get('tilda_user_id') || '').trim();
  if (!uid) return json({ error: 'tilda_user_id required' }, 400);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
  const res = await env.DB.prepare(
    'SELECT role, content, created_at FROM messages WHERE user_id=? ORDER BY id DESC LIMIT ?'
  ).bind(uid, limit).all();
  return json({ history: (res.results || []).reverse() });
}

/* ================= ЧАТ ================= */

async function chat(request, env) {
  const body = await request.json();
  const uid = await upsertUser(env, body);
  const text = String(body.message || '').trim().slice(0, MAX_MSG_LEN);
  if (!uid || !text) return json({ error: 'tilda_user_id and message required' }, 400);

  const user = await env.DB.prepare('SELECT * FROM users WHERE tilda_user_id=?').bind(uid).first();
  const lastState = await env.DB.prepare('SELECT * FROM states WHERE user_id=? ORDER BY id DESC LIMIT 1').bind(uid).first();
  const histRes = await env.DB.prepare(
    'SELECT role, content FROM messages WHERE user_id=? ORDER BY id DESC LIMIT ?'
  ).bind(uid, HISTORY_LIMIT).all();
  const history = (histRes.results || []).reverse();

  // Профиль подмешиваем в ПОСЛЕДНЕЕ сообщение (а не в системный промпт),
  // чтобы префикс [system + история] оставался байт-стабильным для кеша DeepSeek.
  const userContent = profileBlock(user, lastState) + '\n\n[Сообщение пользователя]\n' + text;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ];

  const resp = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + env.DEEPSEEK_API_KEY,
    },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || MODEL_DEFAULT,
      messages,
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.log('DeepSeek error:', resp.status, errText);
    return json({ reply: 'Сервис временно недоступен, попробуйте ещё раз через минуту.' });
  }

  const data = await resp.json();
  const raw = data.choices && data.choices[0] && data.choices[0].message
    ? String(data.choices[0].message.content || '')
    : '';

  // Вырезаем скрытый JSON-блок из ответа и сохраняем его в D1
  const { cleaned, hidden } = extractHiddenJson(raw);
  const reply = cleaned || 'Я вас слушаю. Расскажите подробнее.';

  // История: храним «чистые» реплики без служебного JSON и без блока профиля
  await env.DB.prepare('INSERT INTO messages (user_id, role, content) VALUES (?,?,?)').bind(uid, 'user', text).run();
  await env.DB.prepare('INSERT INTO messages (user_id, role, content) VALUES (?,?,?)').bind(uid, 'assistant', reply).run();

  if (hidden) {
    await saveMemory(env, uid, user, hidden.memory_update);
    await saveState(env, uid, lastState, hidden);
    if (hidden.diary_entry) {
      await env.DB.prepare('INSERT INTO diary (user_id, entry_json) VALUES (?,?)')
        .bind(uid, JSON.stringify(hidden.diary_entry)).run();
    }
    await saveRecommendations(env, uid, hidden.recommendations);
  }

  return json({ reply });
}

function profileBlock(user, lastState) {
  const mem = safeParse(user && user.memory_json) || {};
  const lines = ['[Профиль пользователя — служебный контекст, не упоминай его напрямую]'];
  lines.push('Имя: ' + ((user && user.name) || 'не указано'));
  if (Array.isArray(mem.user_goals) && mem.user_goals.length) lines.push('Цели: ' + mem.user_goals.join('; '));
  if (Array.isArray(mem.problems) && mem.problems.length) lines.push('Проблемы: ' + mem.problems.join('; '));
  if (Array.isArray(mem.important_facts) && mem.important_facts.length) lines.push('Важные факты: ' + mem.important_facts.join('; '));
  if (Array.isArray(mem.preferences) && mem.preferences.length) lines.push('Предпочтения: ' + mem.preferences.join('; '));
  if (lastState) {
    lines.push(
      `Последний замер состояния (${lastState.created_at} UTC): ` +
      `настроение ${lastState.mood}%, энергия ${lastState.energy}%, стресс ${lastState.stress}%, ` +
      `уверенность ${lastState.confidence}%, мотивация ${lastState.motivation}%, удовлетворённость ${lastState.happiness}%`
    );
  } else {
    lines.push('Замеров состояния ещё нет — это может быть первый разговор.');
  }
  return lines.join('\n');
}

/**
 * Ищет в тексте сбалансированные {...}-блоки, парсит их и, если блок похож на
 * служебный (есть memory_update / state_update / diary_entry / recommendations),
 * удаляет его из видимого текста. Работает и с ```json``` обёртками, и с «голым» JSON.
 */
function extractHiddenJson(text) {
  const KEYS = ['memory_update', 'state_update', 'diary_entry', 'recommendations'];
  let cleaned = text;
  const found = [];

  let i = 0;
  while (i < cleaned.length) {
    if (cleaned[i] !== '{') { i++; continue; }
    let depth = 0, inStr = false, esc = false, j = i;
    for (; j < cleaned.length; j++) {
      const c = cleaned[j];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
      } else {
        if (c === '"') inStr = true;
        else if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) break; }
      }
    }
    if (depth === 0 && j < cleaned.length) {
      const candidate = cleaned.slice(i, j + 1);
      const parsed = safeParse(candidate);
      if (parsed && typeof parsed === 'object' && KEYS.some(k => k in parsed)) {
        found.push(parsed);
        cleaned = cleaned.slice(0, i) + cleaned.slice(j + 1);
        continue; // строка укоротилась — i не сдвигаем
      }
    }
    i++;
  }

  cleaned = cleaned
    .replace(/```(?:json)?\s*```/g, '')   // пустые code-fence, оставшиеся после вырезания
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!found.length) return { cleaned, hidden: null };
  const hidden = {};
  for (const f of found) Object.assign(hidden, f);
  return { cleaned, hidden };
}

async function saveMemory(env, uid, user, upd) {
  if (!upd || typeof upd !== 'object') return;
  const mem = safeParse(user && user.memory_json) || {};
  let changed = false;
  for (const k of ['important_facts', 'user_goals', 'problems', 'preferences']) {
    const add = (Array.isArray(upd[k]) ? upd[k] : [])
      .filter(x => typeof x === 'string' && x.trim())
      .map(x => x.trim());
    if (!add.length) continue;
    const merged = [...new Set([...(mem[k] || []), ...add])].slice(-30);
    mem[k] = merged;
    changed = true;
  }
  if (changed) {
    await env.DB.prepare('UPDATE users SET memory_json=? WHERE tilda_user_id=?')
      .bind(JSON.stringify(mem), uid).run();
  }
}

async function saveState(env, uid, lastState, hidden) {
  const su = hidden.state_update || {};
  const FIELDS = ['mood', 'energy', 'stress', 'confidence', 'motivation', 'happiness'];
  const fresh = {};
  let hasNew = false;
  for (const f of FIELDS) {
    const v = num(su[f]);
    if (v !== null) { fresh[f] = v; hasNew = true; }
    else fresh[f] = lastState ? lastState[f] : null;  // null от модели → берём прошлое значение
  }
  if (!hasNew) return; // модель ничего не оценила — замер не создаём

  const de = hidden.diary_entry || {};
  const note =
    (Array.isArray(hidden.recommendations) && hidden.recommendations[0]) ||
    (typeof de.recommendation === 'string' && de.recommendation) || null;

  await env.DB.prepare(
    `INSERT INTO states (user_id, mood, energy, stress, confidence, motivation, happiness, note)
     VALUES (?,?,?,?,?,?,?,?)`
  ).bind(uid, fresh.mood, fresh.energy, fresh.stress, fresh.confidence,
         fresh.motivation, fresh.happiness, note).run();
}

/* ================= ДНЕВНИК ================= */

async function state(url, env) {
  const uid = String(url.searchParams.get('tilda_user_id') || '').trim();
  if (!uid) return json({ error: 'tilda_user_id required' }, 400);
  const s = await env.DB.prepare('SELECT * FROM states WHERE user_id=? ORDER BY id DESC LIMIT 1').bind(uid).first();
  if (!s) return json({ message: 'no data' });
  return json({
    mood: s.mood, energy: s.energy, stress: s.stress,
    confidence: s.confidence, motivation: s.motivation, happiness: s.happiness,
    note: s.note, updated_at: s.created_at,
  });
}

async function stateHistory(url, env) {
  const uid = String(url.searchParams.get('tilda_user_id') || '').trim();
  if (!uid) return json({ error: 'tilda_user_id required' }, 400);
  const res = await env.DB.prepare(
    `SELECT mood, energy, stress, confidence, motivation, happiness, created_at
     FROM states WHERE user_id=? ORDER BY id DESC LIMIT 7`
  ).bind(uid).all();
  return json({ history: (res.results || []).reverse() });
}

/* ================= ТЕСТЫ ================= */

async function testSave(request, env) {
  const body = await request.json();
  const uid = await upsertUser(env, body);
  const name = String(body.test_name || '').trim().slice(0, 200);
  if (!uid || !name) return json({ error: 'tilda_user_id and test_name required' }, 400);
  const score = Number.isFinite(Number(body.score)) ? Math.round(Number(body.score)) : null;
  await env.DB.prepare(
    'INSERT INTO tests (user_id, test_name, score, interpretation) VALUES (?,?,?,?)'
  ).bind(uid, name, score, String(body.interpretation || '').slice(0, 500)).run();
  return json({ ok: true });
}

async function testsList(url, env) {
  const uid = String(url.searchParams.get('tilda_user_id') || '').trim();
  if (!uid) return json({ error: 'tilda_user_id required' }, 400);
  const res = await env.DB.prepare(
    'SELECT test_name, score, interpretation, created_at FROM tests WHERE user_id=? ORDER BY id DESC LIMIT 50'
  ).bind(uid).all();
  return json({ tests: res.results || [] });
}

/* ================= РЕКОМЕНДАЦИИ ================= */

async function saveRecommendations(env, uid, recs) {
  const list = (Array.isArray(recs) ? recs : [])
    .filter(x => typeof x === 'string' && x.trim())
    .map(x => x.trim().slice(0, 500));
  if (!list.length) return;
  // не плодим дубли: пропускаем тексты, уже сохранённые этому пользователю
  const existing = await env.DB.prepare(
    'SELECT text FROM recommendations WHERE user_id=? ORDER BY id DESC LIMIT 100'
  ).bind(uid).all();
  const seen = new Set((existing.results || []).map(r => r.text));
  for (const text of list) {
    if (seen.has(text)) continue;
    await env.DB.prepare(
      'INSERT INTO recommendations (user_id, category, text) VALUES (?,?,?)'
    ).bind(uid, 'Совет от Елизаветы', text).run();
  }
}

async function recomList(url, env) {
  const uid = String(url.searchParams.get('tilda_user_id') || '').trim();
  if (!uid) return json({ error: 'tilda_user_id required' }, 400);
  const res = await env.DB.prepare(
    'SELECT category, text, created_at FROM recommendations WHERE user_id=? ORDER BY id DESC LIMIT 30'
  ).bind(uid).all();
  return json({ recommendations: res.results || [] });
}

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
 *   POST /practice        — чат «Практика»: сдача заданий → разбор от ИИ-куратора
 *   GET  /practice/history — история чата практики
 */

const SYSTEM_PROMPT = `Ты — «База роста AI», премиальный цифровой психолог и персональный помощник по развитию личности.

Твоя задача — помогать пользователю лучше понимать себя, анализировать своё эмоциональное состояние, работать с мыслями, привычками, целями и постепенно улучшать качество жизни.

========================
ЛИЧНОСТЬ
========================

Ты общаешься как опытный психолог с многолетней практикой.

Твой стиль общения:
- спокойный;
- тёплый;
- профессиональный;
- уважительный;
- человечный;
- естественный.

Главная цель — чтобы пользователь чувствовал, что разговаривает с живым человеком.

Не используй шаблонные фразы.

Не говори:
«Я не знаю.»
«Всё будет хорошо.»
«Просто расслабься.»
«Попробуйте мыслить позитивно.»

Не читай лекции. Не перегружай длинными ответами.

Если пользователь пишет коротко — отвечай коротко.
Если человек хочет глубокий разговор — отвечай подробнее.

Используй простой разговорный язык.

Иногда используй небольшие фразы:
«Понимаю.»
«Спасибо, что рассказал.»
«Интересная мысль.»
«Расскажи немного подробнее.»

Не повторяй одинаковые выражения. Каждый ответ должен ощущаться естественным.

Не напоминай, что ты искусственный интеллект, если пользователь об этом не спрашивает.

========================
ОСНОВНАЯ ЗАДАЧА
========================

После каждого общения пользователь должен получить:
- лучшее понимание своего состояния;
- поддержку;
- психологический анализ;
- один конкретный следующий шаг.

========================
АНАЛИЗ СОСТОЯНИЯ
========================

Во время каждого общения анализируй:
- настроение;
- уровень энергии;
- уровень стресса;
- уверенность в себе.

Если информации недостаточно — не делай необоснованных выводов. Лучше уточни вопросами.

========================
АНАЛИЗ ЭМОЦИЙ
========================

Если пользователь рассказывает о своих переживаниях, не спеши давать советы.

Сначала помоги человеку лучше понять свои чувства.

Используй вопросы вроде:
- Что сейчас для тебя самое сложное?
- Когда ты впервые это заметил?
- Что сильнее всего повлияло на твоё состояние?
- Какие чувства возникают чаще всего?

Только после этого предлагай идеи и практики.

========================
ПАМЯТЬ
========================

Используй информацию, которую уже знаешь о пользователе.

Учитывай: имя; цели; важные события; интересы; результаты тестов; записи дневника; выполненные практики; прошлые разговоры; изменения состояния.

Если есть история общения — сравнивай изменения.

Например: «Неделю назад ты говорил, что энергии почти не оставалось. Сейчас кажется, что её стало больше.»

Не повторяй одинаковые рекомендации без причины.

========================
ПСИХОЛОГИЧЕСКИЕ ТЕСТЫ
========================

Если пользователь пишет: пройти тест; хочу проверить себя; диагностика; тест.

Предложи выбрать:
1. Настроение.
2. Энергия.
3. Тревожность.
4. Самооценка.

Каждый тест должен содержать 5–10 вопросов с ответами по шкале от 1 до 5.

После прохождения объясни результат простым и понятным языком, расскажи, что он означает, и предложи рекомендации.

========================
ДНЕВНИК СОСТОЯНИЯ
========================

Если пользователь рассказывает о своём дне или переживаниях, воспринимай это как запись в дневник.

Во время следующих разговоров используй эти записи, чтобы замечать изменения, повторяющиеся темы и положительную динамику.

========================
ПРАКТИКИ
========================

Подбирай упражнения индивидуально.

Используй: дыхательные техники; работу с мыслями; дневник эмоций; практику благодарности; упражнения на самооценку; техники снижения тревоги; упражнения для восстановления энергии; планирование; работу с привычками.

Каждая практика должна содержать: название; цель; примерное время выполнения; понятную инструкцию; ожидаемый результат.

========================
РЕКОМЕНДАЦИИ
========================

Формируй рекомендации на основе: текущего состояния пользователя; предыдущих разговоров; результатов тестов; записей дневника; выполненных практик.

Не повторяй одни и те же советы.

Если какая-то практика уже помогала человеку раньше — можешь предложить её снова.

========================
АНАЛИЗ ПРОГРЕССА
========================

Во время общения постоянно отслеживай изменения.

Обращай внимание на: настроение; уровень энергии; уровень стресса; уверенность в себе; регулярность выполнения практик; выполнение рекомендаций.

Если замечаешь положительные изменения — обязательно отмечай их.

Если прогресс остановился — помогай человеку понять возможные причины и найти следующий небольшой шаг.

========================
БЕЗОПАСНОСТЬ
========================

Не ставь диагнозы. Не утверждай наличие психических заболеваний. Не заменяй врача или очного психолога.

Если замечаешь признаки серьёзного эмоционального кризиса или возможной угрозы жизни — спокойно рекомендуй обратиться за профессиональной помощью или в экстренные службы.

========================
СЛУЖЕБНЫЙ БЛОК ДЛЯ БАЗЫ ДАННЫХ (ОБЯЗАТЕЛЬНО)
========================

В самом конце каждого ответа добавляй скрытый служебный JSON-блок. Пользователь его не увидит — система вырежет его автоматически и сохранит в базу.

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

Правила:
- Метрики state_update оценивай от 0 до 100. Если пользователь ПРЯМО говорит о своём состоянии («классное настроение», «устал», «нервничаю», «нет сил») — обязательно оцени соответствующие метрики (настроение упомянул → mood; усталость → energy; тревога/напряжение → stress и т.д.), даже если сообщение короткое. Метрики, о которых информации не было, оставляй null. Не ставь нули «на всякий случай» и не выдумывай значения на пустом месте (приветствие без содержания → все null).
- В recommendations клади 1-3 коротких персональных совета, когда они уместны.
- В memory_update добавляй только новые устойчивые факты о человеке.
- Если пользователь описал свой день, добавь также "diary_entry":{"emotion":"","main_problem":"","positive_points":"","recommendation":"","mood":0,"energy":0}.

========================
КАК ОБЩАТЬСЯ (ГЛАВНОЕ)
========================

Твоя задача — не просто отвечать, а создавать ощущение настоящего разговора. После нескольких сообщений человек должен забыть, что общается с ИИ.

Перед каждым ответом мысленно: пойми, что человек хочет сказать на самом деле → найди главную проблему → замечай самую важную деталь → подумай, почему он рассказал именно это → только потом отвечай. Никогда не отвечай по шаблону.

Не делай психологических выводов после одного сообщения. Сначала изучи ситуацию (что произошло, почему, что было до, кто участвовал, что изменилось), потом уточняй детали, потом переходи к чувствам, и только затем предлагай решение.

Отвечай как живой человек, обычным разговорным языком. Не используй книжный язык, язык учебников, психологических статей и терапевтические штампы. Можно: «Мне кажется…», «Я думаю…», «Есть ощущение…», «Похоже…», «Я обратил внимание…», «Меня зацепила одна деталь…».

НИКОГДА регулярно не используй фразы вроде: «Спасибо, что поделился», «Спасибо, что доверился», «Слышу, что тебе тяжело», «Это естественная реакция», «Твои чувства нормальны», «Я понимаю твои чувства», «Давай побудем с этим», «Многие сталкиваются с этим», «Всё обязательно наладится», «Важно прожить эти эмоции». Они снижают доверие.

Каждый ответ должен содержать наблюдение именно про сообщение пользователя, а не общие слова. Например: «Мне кажется, всё началось после разговора с начальником» или «Ты несколько раз упомянул усталость — возможно, проблема глубже».

Не читай лекции и не рассказывай теорию без запроса. Не задавай 3-4 вопроса подряд — лучше один хороший вопрос, который поможет раскрыть историю глубже. Если человеку сейчас нужен ответ, а не вопрос — не задавай вопрос вообще.

Иногда человеку нужен взгляд со стороны, а не вопрос: «Мне кажется, ты берёшь слишком много ответственности на себя», «Я бы обратил внимание на этот момент». Но никогда не выдавай предположение за факт и не навязывай своё мнение.

Длина ответов: по умолчанию коротко, 2-6 предложений. Длиннее — только если человек просит объяснить подробно.

После каждого ответа у человека должно возникать ощущение: «меня действительно поняли», «ответ написан именно для меня, а не по шаблону», «со мной разговаривает живой человек». Это важнее любых терминов и красивых фраз.

========================
ГЛАВНЫЙ ПРИНЦИП
========================

Ты не обычный чат-бот.

Ты долгосрочный ИИ-консультант, который помнит историю пользователя, замечает изменения, помогает анализировать мысли, эмоции, дневник и выполненные практики, отслеживает прогресс и поддерживает человека небольшими, понятными шагами.

Каждый ответ должен ощущаться как разговор с внимательным, опытным и искренне заинтересованным психологом, который знает пользователя и помогает ему становиться лучше постепенно, без давления и осуждения.`;

const PRACTICE_PROMPT = `Ты — «База роста AI», куратор практических заданий в личном кабинете психологического сервиса. Это отдельный чат «Практика»: сюда пользователь присылает выполненные упражнения, домашние задания, дневники мыслей, списки благодарностей и вопросы по практикам.

Твой стиль — как у основного консультанта: спокойный, тёплый, профессиональный, человечный, без шаблонных фраз и лекций. Отвечай на «ты», обращайся по имени, если оно известно. Не напоминай, что ты ИИ.

Когда пользователь присылает выполненную практику, внимательно проанализируй её и определи:
- эмоциональное состояние;
- прогресс;
- сильные стороны;
- повторяющиеся мысли;
- ограничивающие убеждения;
- эмоциональные триггеры;
- что получилось особенно хорошо;
- что можно улучшить.

Не просто оценивай — разбирай работу как опытный психолог: что получилось хорошо; что изменилось по сравнению с прошлыми работами; какие мысли повторяются; какие убеждения начинают меняться; где человек стал увереннее; где остаются сложности; какие эмоции проявляются между строк; какие сильные стороны появились; что попробовать дальше.

Если практика выполнена не полностью — не критикуй, помоги её закончить. Если видишь прогресс — обязательно скажи об этом. Если практики выполняются регулярно — сравнивай их между собой и замечай даже небольшие изменения.

Общайся как живой человек, коротко (2-6 предложений по умолчанию), без книжного языка и терапевтических штампов. Можно «Мне кажется…», «Я обратил внимание…», «Меня зацепила деталь…». Замечай конкретную деталь именно этой работы, а не отвечай общими словами. Не задавай много вопросов подряд — один точный вопрос лучше. Не навязывай мнение и не выдавай предположение за факт.

Структура хорошего разбора: короткая живая похвала за конкретное → 2-3 наблюдения по сути работы → один следующий шаг.

Если практика выполнена частично — помоги спокойно её завершить, без давления.
Если человек выполняет упражнения регулярно — обязательно отмечай его прогресс и динамику по сравнению с прошлыми разами.
Если пользователь задаёт вопрос по практике — объясни просто и предложи, как встроить упражнение в его день.
Если сообщение не похоже на практику — мягко уточни, что человек хотел сдать или спросить.

Не ставь диагнозы, не заменяй врача. При признаках серьёзного кризиса спокойно рекомендуй обратиться за профессиональной помощью.

В самом конце каждого ответа добавляй скрытый служебный JSON-блок (система вырежет его автоматически):

{
"state_update":{"mood":null,"energy":null,"stress":null,"confidence":null,"motivation":null,"happiness":null},
"recommendations":[]
}

Метрики оценивай от 0 до 100 только когда в присланной практике реально видно состояние человека; иначе оставляй null. Не ставь нули «на всякий случай».`;

const MODEL_DEFAULT = 'deepseek-v4-flash';
const HISTORY_LIMIT = 20;       // сколько последних сообщений отдаём модели
const MAX_MSG_LEN = 2000;       // ограничение длины входящего сообщения

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
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
      if (url.pathname === '/test/history' && request.method === 'GET') return await testsList(url, env); // алиас для фронта
      if (url.pathname === '/recommendations' && request.method === 'GET') return await recomList(url, env);
      if (url.pathname === '/practice' && request.method === 'POST') return await practiceChat(request, env);
      if (url.pathname === '/practice/history' && request.method === 'GET') return await practiceHistory(url, env);
      if (url.pathname === '/admin/knowledge' && request.method === 'GET') return await knowledgeList(request, url, env);
      if (url.pathname === '/admin/knowledge' && request.method === 'POST') return await knowledgeSave(request, env);
      if (url.pathname === '/admin/knowledge/delete' && request.method === 'POST') return await knowledgeDelete(request, env);
      if (url.pathname === '/knowledge/tests' && request.method === 'GET') return await knowledgeTests(env);
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
  // Напоминание про JSON обязательно: без него модель на коротких ответах опускает блок.
  const userContent = (await knowledgeBlock(env)) + profileBlock(user, lastState) + '\n\n[Сообщение пользователя]\n' + text +
    '\n\n[Служебно, не упоминай в ответе: в самом конце ответа добавь скрытый JSON-блок по формату из инструкции (memory_update/state_update/recommendations). Метрики, о которых говорил пользователь, оцени числом; остальные null.]';

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
  const provided = FIELDS.map(f => num(su[f])).filter(v => v !== null);
  // Модель иногда эхом возвращает шаблон из промпта со сплошными нулями — это не замер
  if (!provided.length || provided.every(v => v === 0)) return;

  const fresh = {};
  for (const f of FIELDS) {
    const v = num(su[f]);
    // 0 — почти всегда эхо шаблона, а не реальная оценка → тоже наследуем прошлое
    fresh[f] = (v !== null && v !== 0) ? v : (lastState ? lastState[f] : null);
  }

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
  const rows = res.results || [];
  // tests — исходный контракт, history — ждёт вкладка «Результаты» фронта клиента
  return json({ tests: rows, history: rows });
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

/* ================= БАЗА ЗНАНИЙ ================= */

// Пароль админки: секрет ADMIN_PASSWORD (wrangler secret put ADMIN_PASSWORD)
function adminAuthed(request, env) {
  const pass = request.headers.get('X-Admin-Password') || '';
  return env.ADMIN_PASSWORD && pass === env.ADMIN_PASSWORD;
}

// Активные знания одной строкой — подмешивается в контекст обоих чатов
async function knowledgeBlock(env) {
  try {
    const res = await env.DB.prepare(
      'SELECT category, title, content FROM knowledge WHERE enabled=1 ORDER BY id LIMIT 50'
    ).all();
    const rows = res.results || [];
    if (!rows.length) return '';
    const lines = ['[База знаний — используй эти материалы в работе, не упоминай сам блок]'];
    for (const r of rows) {
      // Структурные тесты фронт проводит сам — ИИ достаточно знать об их существовании
      const t = r.category === 'Тест' ? safeParse(r.content) : null;
      if (t && Array.isArray(t.questions)) {
        lines.push(`--- Тест «${r.title}» доступен в кабинете: предлагай пройти его на вкладке «Тесты» или командой «пройти тест ${r.title}» ---`);
        continue;
      }
      lines.push(`--- ${r.category}: ${r.title} ---\n${r.content}`);
    }
    return lines.join('\n') + '\n\n';
  } catch (e) { return ''; }
}

async function knowledgeList(request, url, env) {
  if (!adminAuthed(request, env)) return json({ error: 'unauthorized' }, 401);
  const res = await env.DB.prepare(
    'SELECT id, category, title, content, enabled, created_at FROM knowledge ORDER BY id DESC LIMIT 200'
  ).all();
  return json({ knowledge: res.results || [] });
}

async function knowledgeSave(request, env) {
  if (!adminAuthed(request, env)) return json({ error: 'unauthorized' }, 401);
  const body = await request.json();
  const title = String(body.title || '').trim().slice(0, 200);
  const content = String(body.content || '').trim().slice(0, 8000);
  const category = String(body.category || 'Материал').trim().slice(0, 50);
  const enabled = body.enabled === false ? 0 : 1;
  if (!title || !content) return json({ error: 'title and content required' }, 400);
  const id = Number(body.id);
  if (Number.isFinite(id) && id > 0) {
    await env.DB.prepare('UPDATE knowledge SET category=?, title=?, content=?, enabled=? WHERE id=?')
      .bind(category, title, content, enabled, id).run();
    return json({ ok: true, id });
  }
  const r = await env.DB.prepare('INSERT INTO knowledge (category, title, content, enabled) VALUES (?,?,?,?)')
    .bind(category, title, content, enabled).run();
  return json({ ok: true, id: r.meta && r.meta.last_row_id });
}

async function knowledgeDelete(request, env) {
  if (!adminAuthed(request, env)) return json({ error: 'unauthorized' }, 401);
  const body = await request.json();
  const id = Number(body.id);
  if (!Number.isFinite(id) || id <= 0) return json({ error: 'id required' }, 400);
  await env.DB.prepare('DELETE FROM knowledge WHERE id=?').bind(id).run();
  return json({ ok: true });
}

// Публично: тесты из базы знаний в формате массива tests фронта.
// content записи категории «Тест» — JSON: {ico, info, questions:[{q, opts:[], correct}], results:{low,mid,high}}
async function knowledgeTests(env) {
  const res = await env.DB.prepare(
    "SELECT title, content FROM knowledge WHERE enabled=1 AND category='Тест' ORDER BY id LIMIT 30"
  ).all();
  const out = [];
  for (const r of (res.results || [])) {
    const t = safeParse(r.content);
    if (!t || !Array.isArray(t.questions) || !t.questions.length) continue;
    out.push({
      name: r.title,
      ico: t.ico || '📋',
      info: t.info || (t.questions.length + ' вопросов'),
      questions: t.questions,
      type: 'simple',
      results: t.results || {
        low:  { ico: '✅', title: 'Хороший результат', desc: 'Показатели в норме.' },
        mid:  { ico: '⚡', title: 'Средний результат', desc: 'Есть на что обратить внимание.' },
        high: { ico: '🔴', title: 'Требует внимания', desc: 'Рекомендуем обсудить с Елизаветой.' },
      },
    });
  }
  return json({ tests: out });
}

/* ================= ЧАТ «ПРАКТИКА» ================= */

async function practiceHistory(url, env) {
  const uid = String(url.searchParams.get('tilda_user_id') || '').trim();
  if (!uid) return json({ error: 'tilda_user_id required' }, 400);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
  const res = await env.DB.prepare(
    'SELECT role, content, created_at FROM practice_messages WHERE user_id=? ORDER BY id DESC LIMIT ?'
  ).bind(uid, limit).all();
  return json({ history: (res.results || []).reverse() });
}

async function practiceChat(request, env) {
  const body = await request.json();
  const uid = await upsertUser(env, body);
  const text = String(body.message || '').trim().slice(0, MAX_MSG_LEN);
  if (!uid || !text) return json({ error: 'tilda_user_id and message required' }, 400);

  const user = await env.DB.prepare('SELECT * FROM users WHERE tilda_user_id=?').bind(uid).first();
  const lastState = await env.DB.prepare('SELECT * FROM states WHERE user_id=? ORDER BY id DESC LIMIT 1').bind(uid).first();
  const histRes = await env.DB.prepare(
    'SELECT role, content FROM practice_messages WHERE user_id=? ORDER BY id DESC LIMIT ?'
  ).bind(uid, HISTORY_LIMIT).all();
  const history = (histRes.results || []).reverse();

  // Тот же принцип, что в основном чате: профиль в последнем сообщении ради префикс-кеша
  const userContent = (await knowledgeBlock(env)) + profileBlock(user, lastState) + '\n\n[Сообщение пользователя]\n' + text +
    '\n\n[Служебно, не упоминай в ответе: в самом конце ответа добавь скрытый JSON-блок по формату из инструкции (state_update/recommendations). Метрики, видные из практики, оцени числом; остальные null.]';

  const messages = [
    { role: 'system', content: PRACTICE_PROMPT },
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
    console.log('DeepSeek practice error:', resp.status, errText);
    return json({ reply: 'Сервис временно недоступен, попробуйте ещё раз через минуту.' });
  }

  const data = await resp.json();
  const raw = data.choices && data.choices[0] && data.choices[0].message
    ? String(data.choices[0].message.content || '')
    : '';

  const { cleaned, hidden } = extractHiddenJson(raw);
  const reply = cleaned || 'Расскажите подробнее о выполненной практике.';

  await env.DB.prepare('INSERT INTO practice_messages (user_id, role, content) VALUES (?,?,?)').bind(uid, 'user', text).run();
  await env.DB.prepare('INSERT INTO practice_messages (user_id, role, content) VALUES (?,?,?)').bind(uid, 'assistant', reply).run();

  // Практика тоже влияет на дневник состояния и рекомендации
  if (hidden) {
    await saveState(env, uid, lastState, hidden);
    await saveRecommendations(env, uid, hidden.recommendations);
  }

  return json({ reply });
}

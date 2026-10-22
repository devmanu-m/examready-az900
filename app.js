const app = document.getElementById("app");

const DOMAIN_NAMES = {
  1: "Cloud concepts",
  2: "Azure architecture and services",
  3: "Azure management and governance"
};

// How much each exam area counts toward readiness.
// Check these against the current AZ-900 skills outline on Microsoft Learn.
const WEIGHTS = { 1: 0.28, 2: 0.37, 3: 0.35 };

const SEEN_KEY = "examready_seen";
const HISTORY_KEY = "examready_history";
let quiz = null;

// ---------- helpers ----------

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- browser memory ----------

function loadSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function markSeen(id) {
  const seen = loadSeen();
  seen[id] = Date.now();
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch (e) {}
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveAttempt(pct) {
  const history = loadHistory();
  history.push({ pct: pct, time: Date.now() });
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-20)));
  } catch (e) {}
}

function resetProgress() {
  try {
    localStorage.removeItem(SEEN_KEY);
    localStorage.removeItem(HISTORY_KEY);
  } catch (e) {}
  showHome();
}

// ---------- smart picking ----------

function freshFirst(pool) {
  const seen = loadSeen();
  const unseen = shuffle(pool.filter(q => !(q.id in seen)));
  const seenOldestFirst = pool
    .filter(q => q.id in seen)
    .sort((a, b) => seen[a.id] - seen[b.id]);
  return [...unseen, ...seenOldestFirst];
}

function pickMixed() {
  const chosen = [1, 2, 3].flatMap(d =>
    freshFirst(QUESTIONS.filter(q => q.domain === d)).slice(0, 4)
  );
  return shuffle(chosen);
}

function pickRetry(weakTopics, size = 12) {
  const seen = loadSeen();
  const weakDomains = [...new Set(
    QUESTIONS.filter(q => weakTopics.includes(q.topic)).map(q => q.domain)
  )];

  const inTopics = q => weakTopics.includes(q.topic);
  const inDomains = q => weakDomains.includes(q.domain);
  const isUnseen = q => !(q.id in seen);
  const oldestFirst = (a, b) => seen[a.id] - seen[b.id];

  const tiers = [
    shuffle(QUESTIONS.filter(q => inTopics(q) && isUnseen(q))),
    shuffle(QUESTIONS.filter(q => inDomains(q) && isUnseen(q))),
    QUESTIONS.filter(q => inTopics(q) && !isUnseen(q)).sort(oldestFirst),
    QUESTIONS.filter(q => inDomains(q) && !isUnseen(q)).sort(oldestFirst)
  ];

  const picked = [];
  const used = new Set();
  for (const tier of tiers) {
    for (const q of tier) {
      if (picked.length >= size) break;
      if (!used.has(q.id)) {
        used.add(q.id);
        picked.push(q);
      }
    }
  }
  return shuffle(picked);
}

function getWeakTopics() {
  const weak = quiz.items
    .filter(it => it.picked !== it.q.answer)
    .map(it => it.q.topic);
  return [...new Set(weak)];
}

// ---------- scoring ----------

function getVerdict(pct) {
  if (pct >= 80) {
    return { label: "Ready to book", text: "Your answers suggest you are in good shape. Keep practicing to stay sharp." };
  }
  if (pct >= 65) {
    return { label: "Getting close", text: "You are near the line. Fix your weak spots, then retake." };
  }
  return { label: "Not yet", text: "Not ready yet, and that is useful to know. Your weak topics show where to start." };
}

// Works out everything the report needs, once per quiz.
function calcResult() {
  const byDomain = {};
  const byTopic = {};

  quiz.items.forEach(it => {
    const q = it.q;
    const ok = it.picked === q.answer;

    byDomain[q.domain] = byDomain[q.domain] || { correct: 0, total: 0 };
    byDomain[q.domain].total++;
    if (ok) byDomain[q.domain].correct++;

    byTopic[q.topic] = byTopic[q.topic] || { domain: q.domain, correct: 0, total: 0, traps: [] };
    byTopic[q.topic].total++;
    if (ok) byTopic[q.topic].correct++;
    else byTopic[q.topic].traps.push(q.trap);
  });

  // Weighted score: each exam area counts by its weight,
  // so a strong small area can't hide a weak big one.
  let weighted = 0;
  let weightSum = 0;
  for (const d in byDomain) {
    weighted += WEIGHTS[d] * (byDomain[d].correct / byDomain[d].total);
    weightSum += WEIGHTS[d];
  }
  const pct = Math.round((weighted / weightSum) * 100);

  const history = loadHistory();
  const previous = history.length ? history[history.length - 1].pct : null;
  saveAttempt(pct);

  const topics = Object.keys(byTopic);
  return {
    pct: pct,
    previous: previous,
    verdict: getVerdict(pct),
    byTopic: byTopic,
    strong: topics.filter(t => byTopic[t].correct === byTopic[t].total),
    weak: topics.filter(t => byTopic[t].correct < byTopic[t].total)
  };
}

// ---------- screens ----------

function showHome() {
  app.innerHTML = `
    <h1>ExamReady</h1>
    <p class="lead">Practice AZ-900, then see exactly what to fix before you book.</p>
    <div class="card">
      <p>12 randomized questions across the three exam areas. You get a readiness estimate, then a short game plan with links to what to re-read.</p>
      <button class="primary" onclick="startQuiz(pickMixed())">Start the quiz</button>
    </div>
    <p class="muted">Your progress saves in this browser.
      <button onclick="resetProgress()">Reset my progress</button></p>
  `;
}

function startQuiz(questions) {
  quiz = {
    items: questions.map(q => ({
      q: q,
      order: shuffle([0, 1, 2, 3]),
      picked: null
    })),
    index: 0,
    result: null
  };
  showQuestion();
}

function showQuestion() {
  const item = quiz.items[quiz.index];
  const q = item.q;
  const total = quiz.items.length;

  const optionButtons = item.order.map(k =>
    `<button class="option" data-k="${k}" onclick="pickAnswer(${k})">${q.options[k]}</button>`
  ).join("");

  app.innerHTML = `
    <p class="muted">Question ${quiz.index + 1} of ${total}: ${DOMAIN_NAMES[q.domain]}</p>
    <div class="bar"><span class="bar-fill" style="width:${(quiz.index / total) * 100}%"></span></div>
    <div class="card">
      <h2>${q.question}</h2>
      ${optionButtons}
      <div id="feedback" aria-live="polite"></div>
    </div>
  `;
}

function pickAnswer(k) {
  const item = quiz.items[quiz.index];
  const q = item.q;
  if (item.picked !== null) return;
  item.picked = k;
  markSeen(q.id);

  document.querySelectorAll(".option").forEach(btn => {
    const j = Number(btn.dataset.k);
    btn.disabled = true;
    if (j === q.answer) btn.classList.add("correct");
    else if (j === k) btn.classList.add("wrong");
  });

  const isLast = quiz.index === quiz.items.length - 1;
  const correct = k === q.answer;

  document.getElementById("feedback").innerHTML = `
    <p><b>${correct ? "Correct." : "Not quite."}</b> ${q.why}</p>
    ${correct ? "" : `<p class="trap"><b>The trap:</b> ${q.trap}</p>`}
    <button class="primary" onclick="nextQuestion()">${isLast ? "See my readiness report" : "Next question"}</button>
  `;
}

function nextQuestion() {
  if (quiz.index < quiz.items.length - 1) {
    quiz.index++;
    showQuestion();
  } else {
    showReport();
  }
}

// Calculates the result once, then draws it.
function showReport() {
  quiz.result = calcResult();
  renderReport();
}

// Draws the report from the saved result (safe to call again later).
function renderReport() {
  const r = quiz.result;

  let comparison = "";
  if (r.previous !== null) {
    const diff = r.pct - r.previous;
    comparison = `<p>${diff >= 0 ? "Up" : "Down"} ${Math.abs(diff)} points from your last attempt (${r.previous}%).</p>`;
  }

  const review = quiz.items.map((it, i) => {
    const q = it.q;
    const ok = it.picked === q.answer;
    return `
      <details>
        <summary>${i + 1}. ${q.question}</summary>
        <p>Your answer: <b>${q.options[it.picked]}</b> ${ok ? "(correct)" : ""}</p>
        ${ok ? "" : `<p>Correct answer: <b>${q.options[q.answer]}</b></p><p class="trap">${q.trap}</p>`}
        <p>${q.why}</p>
      </details>`;
  }).join("");

  app.innerHTML = `
    <div class="card">
      <p class="muted">Your readiness estimate</p>
      <div class="big">${r.pct}%</div>
      <div class="bar" style="margin: 18px 0">
        <span class="bar-fill" id="report-bar" style="width:0"></span>
        <span class="pass-line" title="Estimated pass level"></span>
      </div>
      <p><span class="tag">${r.verdict.label}</span></p>
      <p>${r.verdict.text}</p>
      ${comparison}
      <p class="muted">Weighted by exam area. The gold line marks an estimated pass level of 70%. One short quiz can’t predict your real scaled score.</p>
    </div>

    <div class="card">
      <h3>Review your answers</h3>
      ${review}
    </div>

    <div class="row">
      <button onclick="startQuiz(pickRetry(getWeakTopics()))" ${r.weak.length ? "" : "disabled"}>Retry my weak spots</button>
      <button class="primary" onclick="startQuiz(pickMixed())">New quiz</button>
      <button onclick="showHome()">Home</button>
    </div>
  `;

  // let the page draw first, so the bar animates from 0
  setTimeout(() => {
    const bar = document.getElementById("report-bar");
    if (bar) bar.style.width = r.pct + "%";
  }, 60);
}

showHome();
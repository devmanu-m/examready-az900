const app = document.getElementById("app");

const DOMAIN_NAMES = {
  1: "Cloud concepts",
  2: "Azure architecture and services",
  3: "Azure management and governance"
};

const SEEN_KEY = "examready_seen";
let quiz = null;

// ---------- helpers ----------

// Fisher-Yates shuffle: returns a new shuffled copy of a list
function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- memory of seen questions (saved in this browser) ----------
// Stored as { "cb-01": 1730000000000, ... } = question id -> time it was answered

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
  } catch (e) {
    // storage blocked: the app still works, it just can't remember
  }
}

function resetSeen() {
  try {
    localStorage.removeItem(SEEN_KEY);
  } catch (e) {}
  showHome();
}

// ---------- smart picking ----------

// Unseen questions first (random order), then seen ones, oldest first.
function freshFirst(pool) {
  const seen = loadSeen();
  const unseen = shuffle(pool.filter(q => !(q.id in seen)));
  const seenOldestFirst = pool
    .filter(q => q.id in seen)
    .sort((a, b) => seen[a.id] - seen[b.id]);
  return [...unseen, ...seenOldestFirst];
}

// New quiz: 4 questions per exam area, preferring ones not seen before
function pickMixed() {
  const chosen = [1, 2, 3].flatMap(d =>
    freshFirst(QUESTIONS.filter(q => q.domain === d)).slice(0, 4)
  );
  return shuffle(chosen);
}

// Retry: aim at the weak topics, using questions not seen before.
// Falls back step by step if there aren't enough.
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
    shuffle(QUESTIONS.filter(q => inTopics(q) && isUnseen(q))),                // 1. unseen, weak topics
    shuffle(QUESTIONS.filter(q => inDomains(q) && isUnseen(q))),               // 2. unseen, same exam areas
    QUESTIONS.filter(q => inTopics(q) && !isUnseen(q)).sort(oldestFirst),      // 3. seen long ago, weak topics
    QUESTIONS.filter(q => inDomains(q) && !isUnseen(q)).sort(oldestFirst)      // 4. seen long ago, same areas
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

// Topics where the learner got at least one question wrong in this quiz
function getWeakTopics() {
  const weak = quiz.items
    .filter(it => it.picked !== it.q.answer)
    .map(it => it.q.topic);
  return [...new Set(weak)];
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
      <button onclick="resetSeen()">Reset seen questions</button></p>
  `;
}

function startQuiz(questions) {
  quiz = {
    items: questions.map(q => ({
      q: q,
      order: shuffle([0, 1, 2, 3]), // shuffled display order of the options
      picked: null                   // which option the learner chose
    })),
    index: 0
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
  if (item.picked !== null) return; // already answered
  item.picked = k;
  markSeen(q.id); // remember this question was seen

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
    <button class="primary" onclick="nextQuestion()">${isLast ? "See my results" : "Next question"}</button>
  `;
}

function nextQuestion() {
  if (quiz.index < quiz.items.length - 1) {
    quiz.index++;
    showQuestion();
  } else {
    showTempResult();
  }
}

// Temporary results screen. We replace it with the real report in Step 6.
function showTempResult() {
  const correct = quiz.items.filter(it => it.picked === it.q.answer).length;
  const weak = getWeakTopics();
  app.innerHTML = `
    <h1>Quiz done</h1>
    <div class="card">
      <p class="lead">You got ${correct} of ${quiz.items.length} right.</p>
      <p>${weak.length ? "Weak topics: " + weak.join(", ") : "No weak topics. Nice."}</p>
      <div class="row">
        <button class="primary" onclick="startQuiz(pickMixed())">New quiz</button>
        <button onclick="startQuiz(pickRetry(getWeakTopics()))" ${weak.length ? "" : "disabled"}>Retry my weak spots</button>
        <button onclick="showHome()">Home</button>
      </div>
    </div>
  `;
}

showHome();
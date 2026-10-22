const app = document.getElementById("app");

const DOMAIN_NAMES = {
  1: "Cloud concepts",
  2: "Azure architecture and services",
  3: "Azure management and governance"
};

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

// 4 random questions from each of the 3 exam areas, then mixed together
function pickMixed() {
  const chosen = [1, 2, 3].flatMap(d =>
    shuffle(QUESTIONS.filter(q => q.domain === d)).slice(0, 4)
  );
  return shuffle(chosen);
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

  // lock the buttons and colour them
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
  app.innerHTML = `
    <h1>Quiz done</h1>
    <div class="card">
      <p class="lead">You got ${correct} of ${quiz.items.length} right.</p>
      <button class="primary" onclick="startQuiz(pickMixed())">New quiz</button>
      <button onclick="showHome()">Home</button>
    </div>
  `;
}

showHome();
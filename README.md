# ExamReady: Unofficial AZ-900 Quiz and Readiness Tracker

**Live demo:** https://examready-az900.vercel.app/

> Unofficial practice tool. Not affiliated with or endorsed by Microsoft. All questions are original and based on the public AZ-900 skills outline. The readiness score is an estimate, not a prediction of your exam result.

Built for the **Vibe Coding Hackathon: AZ-900 Exam Prep Edition** (#1MillionDevs).
Challenges addressed: **Smart Quiz Builder** and **Readiness Tracker**.

## The problem

Learners practise with questions but often don't understand *why* an answer is right or wrong, and they rarely know whether they are actually ready to book the exam. A raw score doesn't answer either question.

## What ExamReady does

1. **Quiz:** 12 randomized questions, 4 from each of the three exam areas.
2. **Instant feedback:** every answer explains why the right option is right. A wrong answer also shows **the trap**, the specific misunderstanding that option was designed to catch (for example, mixing up a region pair with an availability zone).
3. **Readiness report:** an estimated readiness percentage, a bar with a "Ready to book" line at 80%, and a verdict (*Not yet*, *Getting close* or *Ready to book*). It also compares with the learner's previous attempt.
4. **Game plan:** a short slide-style debrief covering what the learner nailed, the traps they fell for, a next-steps plan, and links to re-read the exam area behind each weak topic.
5. **Answer review:** every question, the learner's pick, the correct answer and the reason.
6. **Fresh questions every time:** the app remembers which questions a learner has seen and serves unseen ones first. **Retry my weak spots** builds a new quiz from the topics they missed, using questions they haven't seen yet where possible.

## How the readiness score works

- Accuracy is calculated **inside each exam area**, then combined using weights of **28% / 37% / 35%**. These sit inside the official ranges (25-30%, 35-40% and 30-35%) in the AZ-900 study guide, skills measured as of 20 July 2026.
- Weighting stops a strong score in one area from hiding a weak score in a bigger one.
- Verdict bands: **80% or more** is *Ready to book*, **65-79%** is *Getting close*, and below that is *Not yet*.
- The real exam uses a scaled score with a pass mark of 700, which is not a simple percentage. The app therefore labels the result as an **estimate** and does not claim to predict the exam.

## How the questions were made

- The question bank (43 questions across the three exam areas) was drafted with **Claude** from the public AZ-900 skills outline on Microsoft Learn.
- Each question follows one structure: the question, four options, the correct answer, **a one-line misconception ("the trap")** and a short explanation. Every question is tagged with a topic and an exam area.
- Drafting approach (prompt pattern): *"From this skills-outline bullet, write one original scenario question with four options and exactly one correct answer. Name the single misconception that makes the most tempting wrong option attractive. Do not reuse real exam wording."*
- Review step: *"Act as a skeptical Azure expert. Find any factual error, ambiguity or second defensible answer in this question."*
- **I checked each question and answer against Microsoft Learn before publishing.** 

## Tech

- Plain **HTML, CSS and JavaScript**. No framework, no backend, no API keys, no cost.
- Progress (seen questions and score history) is stored in the browser with `localStorage`.
- Deployed free on **Vercel** from this repository.
- Built with AI-assisted tools: **Claude** for drafting and code guidance.

## Run it locally

```bash
git clone https://github.com/devmanu-m/examready-az900.git
cd examready-az900
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Project structure

```
index.html      page shell and the unofficial notice
style.css       all styling, with light and dark mode
questions.js    the question bank
app.js          quiz flow, smart picking, scoring, report and slides
```

## Limitations

- A fixed question bank eventually repeats. The app serves unseen questions first and the oldest-seen next, but more questions are always better.
- Progress lives in one browser. Clearing site data resets it.
- The "Re-read" links point to each exam area's Microsoft Learn learning path, not to individual modules.

## What's next

- Expand the bank to cover every skills-outline bullet in depth.
- Optional sign-in (Supabase) so progress follows a learner across devices.
- Study planner from the learner's exam date and weak topics.
- Swap in another certification's question bank (AZ-104, AI-900) with no code changes beyond `questions.js`.

## Author

Emmanuel Mwaniki, #1MillionDevs learner, Nairobi, Kenya.
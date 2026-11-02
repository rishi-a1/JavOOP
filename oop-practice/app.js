// app.js
// Simple OOP practice UI – vanilla JS + Monaco Editor

let currentLang = "java"; // default
let editor; // monaco editor instance
let questions = [];

// ---------- Utility ----------
function $(id) { return document.getElementById(id); }

// ---------- Language toggle ----------
function setLanguage(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-toggle button').forEach(b => b.classList.remove('active'));
  $(`${lang}Btn`).classList.add('active');
  loadQuestions(lang);
  // reset UI
  $('title').textContent = "Select a question";
  $('desc').innerHTML = "";
  if (editor) editor.setValue("");
  $('output').textContent = "";
}

// ---------- Load questions ----------
async function loadQuestions(lang) {
  try {
    const resp = await fetch(`questions/${lang}.json`);
    if (!resp.ok) throw new Error(`Failed to load ${lang} questions`);
    questions = await resp.json();
    renderList();
  } catch (e) {
    console.error(e);
    $('question-list').innerHTML = `<p style="color:red;">${e.message}</p>`;
  }
}

function renderList() {
  const container = $('question-list');
  container.innerHTML = "";
  questions.forEach(q => {
    const btn = document.createElement('button');
    btn.textContent = `${q.id}. ${q.title}`;
    btn.onclick = () => loadQuestion(q);
    container.appendChild(btn);
  });
}

function loadQuestion(q) {
  $('title').textContent = q.title;
  $('desc').innerHTML = `<p>${q.description}</p>`;
  editor.setValue(q.starterCode);
  // store the hidden test cases for later verification (optional)
  editor._currentQuestion = q;
}

// ---------- Run code ----------
async function runCode() {
  const src = editor.getValue();
  const langMap = { java: "java", cpp: "cpp14" }; // JDoodle language identifiers
  const payload = {
    clientId: "YOUR_JDOODLE_CLIENT_ID",
    clientSecret: "YOUR_JDOODLE_CLIENT_SECRET",
    script: src,
    language: langMap[currentLang] || "java",
    versionIndex: "0",
    stdin: $('customInput').value || ""
  };
  $('output').textContent = "Running...";
  try {
    const resp = await fetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await resp.json();
    const out = [];
    if (result.error) out.push(`Compile error:\n${result.error}`);
    if (result.output) out.push(`Output:\n${result.output}`);
    if (result.memory) out.push(`Memory: ${result.memory}`);
    if (result.cpuTime) out.push(`CPU Time: ${result.cpuTime}`);
    $('output').textContent = out.join('\n\n');
  } catch (e) {
    $('output').textContent = `Failed to run: ${e}`;
  }
}

// ---------- Init ----------
function initMonaco() {
  require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('editor'), {
      value: "",
      language: currentLang,
      theme: "vs-light",
      automaticLayout: true,
    });
  });
}

// Event listeners
window.addEventListener('DOMContentLoaded', () => {
  $('javaBtn').onclick = () => setLanguage('java');
  $('cppBtn').onclick = () => setLanguage('cpp');
  $('runBtn').onclick = runCode;
  initMonaco();
  loadQuestions('java');
});

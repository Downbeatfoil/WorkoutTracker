const STORAGE_KEY = "mobile-workout-tracker-v3";
const DEFAULT_REST = 210;
const BENCH_REST = 300;
const CUPPING_REST = 60;
const DRAFT_COMMIT_DELAY_MS = 120000;

const workoutPlan = [
  {
    id: "tuesday",
    name: "Tuesday Workout",
    shortName: "Tuesday",
    exercises: [
      exercise("Bench Warm Up", "5", "50%", ""),
      exercise("Bench Press - 2", "4", "100", "(4-6)"),
      exercise("Reverse Curls", "", "", "(6-10)"),
      exercise("Cable Lat Raise", "5", "13", "(5-12) Partials after last set"),
      exercise("Cable Crunches", "7", "66", "(8-10) Legs Back", video("Cable Crunches", "https://www.youtube.com/shorts/0BNhpx_nxDM")),
      exercise("Machine Preacher", "7", "45", "(5-10) Only bottom half. One in the front right"),
      exercise("Incline DB", "5", "35", "(5-8)"),
      exercise("Dead Hangs", "1", "time", "Match or longer")
    ]
  },
  {
    id: "thursday",
    name: "Thursday Workout",
    shortName: "Thursday",
    exercises: [
      exercise("Bench Warm Up", "5", "50%", ""),
      exercise("Bench Press", "4", "100", "(4-6)"),
      exercise("Cable Lat Raise", "5", "13", "(5-12) Partials after last set"),
      exercise("Katana - 2", "12", "10", "(10-18) Go forward, Press up"),
      exercise("Cable Press Around", "8", "70", "(5-10) Use Hammer Machine"),
      exercise("Rear Delt Flys", "18", "20", "(12-18) Use pec deck machine"),
      exercise("Pushdowns", "?", "?", "One set + Dropset"),
      exercise("Cardio", "?", "?", "?")
    ]
  },
  {
    id: "friday",
    name: "Friday Workout",
    shortName: "Friday",
    exercises: [
      exercise("Neutral Pull Ups", "?", "?", "?"),
      exercise("EZ bar curls", "?", "?", ""),
      exercise("Eugene Curls", "12", "22", "(15-20) - Legs Forward", video("Eugene Curls", "https://www.youtube.com/shorts/OG131ahIxEs")),
      exercise("Wide Rows", "5", "35", "(5-10) Seat on 5"),
      exercise("Hammer Preacher Curls", "?", "?", ""),
      exercise("1 arm Lat Pulldown - 2", "8", "38.5", "Tuck arms in, chest proud"),
      exercise("Cupping - 2", "13", "16.5", "1 min rest", video("Cupping", "https://www.youtube.com/watch?v=zcHmmxGbPMs"))
    ]
  },
  {
    id: "sunday",
    name: "Sunday Workout",
    shortName: "Sunday",
    exercises: [
      exercise("Cable Lat Raise", "5", "100", "6-10"),
      exercise("1 arm Lat Pulldown - 2", "8", "38.5", "Tuck arms in, chest proud"),
      exercise("Pullover Machine - 2", "8", "80", "(6-10)", video("Pullover", "https://www.youtube.com/watch?v=S6rqpxVGKZ4")),
      exercise("Wide Rows", "5", "35", "(5-10) Seat on 5"),
      exercise("Overhead Press", "?", "?", "?"),
      exercise("Katana (10-18)", "12", "10", "(10-18) Go forward, Press up"),
      exercise("Rear Delt", "12", "7.5", "3/6 10:20", video("Rear Delt", "https://www.youtube.com/watch?v=DyOtTMCKTPg"))
    ]
  }
];

let state = loadState();
let selectedDayId = state.selectedDayId || workoutPlan[0].id;
let currentView = "home";
let activeTimers = [];
let deferredInstallPrompt = null;
const draftCommitTimers = {};

const appHeader = document.querySelector("#appHeader");
const homeView = document.querySelector("#homeView");
const workoutView = document.querySelector("#workoutView");
const progressView = document.querySelector("#progressView");
const dayButtons = document.querySelector("#dayButtons");
const backButton = document.querySelector("#backButton");
const progressBackButton = document.querySelector("#progressBackButton");
const workoutTitle = document.querySelector("#workoutTitle");
const exerciseList = document.querySelector("#exerciseList");
const progressList = document.querySelector("#progressList");
const exerciseTemplate = document.querySelector("#exerciseTemplate");
const activeTimersElement = document.querySelector("#activeTimers");
const installButton = document.querySelector("#installButton");

function video(label, url) {
  return { label, url };
}

function exercise(name, reps, weight, notes, noteLink = null) {
  const sets = /\s-\s*2\b/.test(name) ? 2 : 3;
  return {
    id: normalizeExerciseName(name),
    name,
    sets,
    reps,
    weight,
    notes,
    noteLink,
    rest: getRestSeconds(name)
  };
}

function getRestSeconds(name) {
  const key = normalizeExerciseName(name);
  if (key.includes("bench press")) return BENCH_REST;
  if (key.includes("cupping")) return CUPPING_REST;
  return DEFAULT_REST;
}

function normalizeExerciseName(name) {
  return name
    .toLowerCase()
    .replace(/\s-\s*2\b/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { selectedDayId: workoutPlan[0].id, entries: {} };
  }

  try {
    const parsed = JSON.parse(saved);
    const entries = parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {};
    Object.keys(entries).forEach((entryId) => migrateEntry(entries[entryId]));
    return {
      selectedDayId: parsed.selectedDayId || workoutPlan[0].id,
      entries
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return { selectedDayId: workoutPlan[0].id, entries: {} };
  }
}

function migrateEntry(entry) {
  entry.history = Array.isArray(entry.history) ? entry.history : [];
  entry.history.forEach((item) => {
    if (item.day === "Start") item.day = "";
    if (item.date === "Start") item.date = "";
  });
  entry.lastWeight = entry.lastWeight || entry.weight || "";
  entry.lastReps = entry.lastReps || entry.reps || "";
  entry.lastOneRepMax = entry.lastOneRepMax || calculateOneRepMax(entry.lastWeight, entry.lastReps) || "";
  entry.lastDay = entry.lastDay || entry.updatedDay || "";
  if (entry.lastDay === "Start") entry.lastDay = "";
  entry.lastDate = entry.lastDate || "";
  if (entry.lastDate === "Start") entry.lastDate = "";
  entry.draftWeight = entry.draftWeight || "";
  entry.draftReps = entry.draftReps || "";
  entry.draftDay = entry.draftDay || "";
  entry.draftUpdatedAt = entry.draftUpdatedAt || "";
  delete entry.weight;
  delete entry.reps;
  delete entry.updatedDay;
  delete entry.updatedAt;
}

function saveState() {
  state.selectedDayId = selectedDayId;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function selectedWorkout() {
  return workoutPlan.find((workout) => workout.id === selectedDayId) || workoutPlan[0];
}

function allExercises() {
  const seen = new Set();
  const items = [];
  workoutPlan.forEach((workout) => {
    workout.exercises.forEach((exerciseItem) => {
      if (seen.has(exerciseItem.id)) return;
      seen.add(exerciseItem.id);
      items.push(exerciseItem);
    });
  });
  return items;
}

function seedRecordFor(exerciseItem) {
  const estimate = calculateOneRepMax(exerciseItem.weight, exerciseItem.reps);
  if (!estimate) return null;

  return {
    date: "",
    day: "",
    weight: Number(exerciseItem.weight),
    reps: Number(exerciseItem.reps),
    oneRepMax: Math.round(estimate * 10) / 10
  };
}

function entryFor(exerciseItem) {
  if (!state.entries[exerciseItem.id]) {
    const seedRecord = seedRecordFor(exerciseItem);
    state.entries[exerciseItem.id] = {
      lastWeight: exerciseItem.weight || "",
      lastReps: exerciseItem.reps || "",
      lastOneRepMax: seedRecord ? seedRecord.oneRepMax : "",
      lastDay: "",
      lastDate: "",
      draftWeight: "",
      draftReps: "",
      draftDay: "",
      draftUpdatedAt: "",
      history: seedRecord ? [seedRecord] : []
    };
  }
  migrateEntry(state.entries[exerciseItem.id]);
  if (!state.entries[exerciseItem.id].lastWeight && exerciseItem.weight) {
    state.entries[exerciseItem.id].lastWeight = exerciseItem.weight;
  }
  if (!state.entries[exerciseItem.id].lastReps && exerciseItem.reps) {
    state.entries[exerciseItem.id].lastReps = exerciseItem.reps;
  }
  const seedRecord = seedRecordFor(exerciseItem);
  if (seedRecord && state.entries[exerciseItem.id].history.length === 0) {
    state.entries[exerciseItem.id].history = [seedRecord];
    state.entries[exerciseItem.id].lastOneRepMax = seedRecord.oneRepMax;
  }
  return state.entries[exerciseItem.id];
}

function calculateOneRepMax(weight, reps) {
  const weightNumber = Number(weight);
  const repsNumber = Number(reps);
  if (!weightNumber || !repsNumber) return null;
  return weightNumber * (1 + repsNumber / 30);
}

function formatMax(value) {
  if (!value) return "--";
  return `${Math.round(Number(value) * 10) / 10} lb`;
}

function formatValue(value, suffix = "") {
  if (value === "" || value === null || value === undefined) return "--";
  return `${value}${suffix}`;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function renderDayButtons() {
  dayButtons.innerHTML = "";
  workoutPlan.forEach((workout) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = workout.shortName;
    button.className = "day-button";
    button.addEventListener("click", () => {
      selectedDayId = workout.id;
      currentView = "workout";
      saveState();
      render();
    });
    dayButtons.append(button);
  });

  const progressButton = document.createElement("button");
  progressButton.type = "button";
  progressButton.textContent = "Progress";
  progressButton.className = "day-button progress-home-button";
  progressButton.addEventListener("click", () => {
    currentView = "progress";
    render();
  });
  dayButtons.append(progressButton);
}

function startRestTimer(label, seconds) {
  const timer = {
    id: crypto.randomUUID(),
    label,
    total: Number(seconds),
    remaining: Number(seconds),
    intervalId: null
  };

  timer.intervalId = window.setInterval(() => {
    timer.remaining -= 1;
    if (timer.remaining <= 0) {
      window.clearInterval(timer.intervalId);
      timer.intervalId = null;
      timer.remaining = 0;
      if ("vibrate" in navigator) navigator.vibrate([160, 80, 160]);
    }
    renderTimers();
  }, 1000);

  activeTimers.unshift(timer);
  renderTimers();
}

function removeTimer(timerId) {
  const timer = activeTimers.find((item) => item.id === timerId);
  if (timer?.intervalId) window.clearInterval(timer.intervalId);
  activeTimers = activeTimers.filter((item) => item.id !== timerId);
  renderTimers();
}

function renderTimers() {
  activeTimersElement.innerHTML = "";
  activeTimersElement.hidden = activeTimers.length === 0;

  activeTimers.forEach((timer) => {
    const card = document.createElement("article");
    card.className = timer.remaining === 0 ? "timer-card done" : "timer-card";

    const text = document.createElement("div");
    const label = document.createElement("p");
    label.className = "timer-label";
    label.textContent = timer.label;
    const time = document.createElement("strong");
    time.textContent = timer.remaining === 0 ? "Done" : formatTime(timer.remaining);
    text.append(label, time);

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "x";
    close.title = "Remove timer";
    close.addEventListener("click", () => removeTimer(timer.id));

    card.append(text, close);
    activeTimersElement.append(card);
  });
}

function hasCompleteDraft(entry) {
  return Boolean(Number(entry.draftWeight) && Number(entry.draftReps));
}

function scheduleDraftCommit(exerciseId, dayName) {
  window.clearTimeout(draftCommitTimers[exerciseId]);
  const entry = state.entries[exerciseId];
  if (!hasCompleteDraft(entry)) return;

  draftCommitTimers[exerciseId] = window.setTimeout(() => {
    const latestEntry = state.entries[exerciseId];
    const elapsed = Date.now() - Number(latestEntry.draftUpdatedAt || 0);
    if (hasCompleteDraft(latestEntry) && elapsed >= DRAFT_COMMIT_DELAY_MS - 500) {
      commitDraft(exerciseId, dayName || latestEntry.draftDay, true);
      render();
    }
  }, DRAFT_COMMIT_DELAY_MS);
}

function commitDraft(exerciseId, dayName, clearDraft) {
  const entry = state.entries[exerciseId];
  const estimate = calculateOneRepMax(entry.draftWeight, entry.draftReps);
  if (!estimate) return;

  const today = new Date().toLocaleDateString();
  const savedDay = dayName || entry.draftDay || "Today";
  const record = {
    date: today,
    day: savedDay,
    weight: Number(entry.draftWeight),
    reps: Number(entry.draftReps),
    oneRepMax: Math.round(estimate * 10) / 10
  };
  const existing = entry.history.find((item) => item.date === today && item.day === savedDay);

  if (existing) {
    Object.assign(existing, record);
  } else {
    entry.history.unshift(record);
  }

  entry.history = entry.history.slice(0, 30);
  entry.lastWeight = record.weight;
  entry.lastReps = record.reps;
  entry.lastOneRepMax = record.oneRepMax;
  entry.lastDay = savedDay;
  entry.lastDate = today;

  if (clearDraft) {
    entry.draftWeight = "";
    entry.draftReps = "";
    entry.draftDay = "";
    entry.draftUpdatedAt = "";
  }

  saveState();
}

function updateExerciseDisplay(entry, elements) {
  const draftMax = calculateOneRepMax(entry.draftWeight, entry.draftReps);
  elements.lastReps.textContent = formatValue(entry.lastReps);
  elements.lastWeight.textContent = formatValue(entry.lastWeight, entry.lastWeight ? " lb" : "");
  elements.lastOneRepMax.textContent = formatMax(entry.lastOneRepMax);
  elements.draftOneRepMax.textContent = formatMax(draftMax);

  if (hasCompleteDraft(entry)) {
    elements.draftStatus.textContent = "Saved for today. It will move to Last after 2 quiet minutes.";
  } else {
    elements.draftStatus.textContent = entry.lastWeight && entry.lastReps ? "Last set loaded." : "No completed set saved yet.";
  }

  const best = entry.history.reduce((highest, item) => Math.max(highest, item.oneRepMax), 0);
  elements.bestMax.textContent = `Best 1RM: ${formatMax(best)}`;
}

function renderExercises(workout) {
  exerciseList.innerHTML = "";

  workout.exercises.forEach((exerciseItem) => {
    const card = exerciseTemplate.content.firstElementChild.cloneNode(true);
    const entry = entryFor(exerciseItem);
    const elements = {
      lastReps: card.querySelector(".last-reps"),
      lastWeight: card.querySelector(".last-weight"),
      lastOneRepMax: card.querySelector(".last-one-rep-max"),
      draftOneRepMax: card.querySelector(".draft-one-rep-max"),
      draftStatus: card.querySelector(".draft-status"),
      bestMax: card.querySelector(".best-max")
    };
    const name = card.querySelector(".exercise-name");
    const meta = card.querySelector(".exercise-meta");
    const draftWeight = card.querySelector(".draft-weight");
    const draftReps = card.querySelector(".draft-reps");
    const notes = card.querySelector(".notes");
    const restButton = card.querySelector(".rest-pill");

    name.textContent = exerciseItem.name;
    meta.textContent = `${exerciseItem.sets} sets`;
    draftWeight.value = entry.draftWeight;
    draftReps.value = entry.draftReps;
    renderNotes(notes, exerciseItem);
    restButton.textContent = formatTime(exerciseItem.rest);
    updateExerciseDisplay(entry, elements);

    draftWeight.addEventListener("input", () => {
      entry.draftWeight = draftWeight.value;
      entry.draftDay = workout.shortName;
      entry.draftUpdatedAt = Date.now();
      updateExerciseDisplay(entry, elements);
      saveState();
      scheduleDraftCommit(exerciseItem.id, workout.shortName);
    });

    draftReps.addEventListener("input", () => {
      entry.draftReps = draftReps.value;
      entry.draftDay = workout.shortName;
      entry.draftUpdatedAt = Date.now();
      updateExerciseDisplay(entry, elements);
      saveState();
      scheduleDraftCommit(exerciseItem.id, workout.shortName);
    });

    draftWeight.addEventListener("blur", () => scheduleDraftCommit(exerciseItem.id, workout.shortName));
    draftReps.addEventListener("blur", () => scheduleDraftCommit(exerciseItem.id, workout.shortName));

    restButton.addEventListener("click", () => {
      startRestTimer(exerciseItem.name, exerciseItem.rest);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    exerciseList.append(card);
  });
}

function renderNotes(notesElement, exerciseItem) {
  notesElement.innerHTML = "";
  if (exerciseItem.notes) {
    const text = document.createElement("p");
    text.textContent = exerciseItem.notes;
    notesElement.append(text);
  }

  if (exerciseItem.noteLink) {
    const link = document.createElement("a");
    link.href = exerciseItem.noteLink.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = exerciseItem.noteLink.label;
    notesElement.append(link);
  }
}

function restoreDraftCommits() {
  Object.keys(state.entries).forEach((exerciseId) => {
    const entry = state.entries[exerciseId];
    if (!hasCompleteDraft(entry)) return;
    const elapsed = Date.now() - Number(entry.draftUpdatedAt || 0);
    if (elapsed >= DRAFT_COMMIT_DELAY_MS) {
      commitDraft(exerciseId, entry.draftDay, true);
    } else {
      window.clearTimeout(draftCommitTimers[exerciseId]);
      draftCommitTimers[exerciseId] = window.setTimeout(() => {
        commitDraft(exerciseId, entry.draftDay, true);
        render();
      }, DRAFT_COMMIT_DELAY_MS - elapsed);
    }
  });
}

function sparklinePoints(history) {
  const values = history.slice().reverse().map((item) => Number(item.oneRepMax)).filter(Boolean);
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;
  return values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
    const y = 34 - ((value - min) / spread) * 28;
    return `${x},${y}`;
  }).join(" ");
}

function renderProgress() {
  progressList.innerHTML = "";
  let rendered = 0;

  allExercises().forEach((exerciseItem) => {
    const entry = entryFor(exerciseItem);
    const validHistory = entry.history.filter((item) => Number(item.oneRepMax));
    if (validHistory.length === 0) return;
    rendered += 1;

    const card = document.createElement("article");
    card.className = "progress-card";
    const title = document.createElement("div");
    title.className = "progress-title";
    const heading = document.createElement("h3");
    heading.textContent = exerciseItem.name;
    const bestLabel = document.createElement("p");
    const bestValue = Math.max(...validHistory.map((item) => Number(item.oneRepMax)));
    bestLabel.textContent = `Best ${formatMax(bestValue)}`;
    title.append(heading, bestLabel);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 40");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", `${exerciseItem.name} one rep max progress`);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    line.setAttribute("points", sparklinePoints(validHistory));
    line.setAttribute("fill", "none");
    line.setAttribute("stroke", "currentColor");
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("stroke-linejoin", "round");
    svg.append(line);

    const latest = validHistory[0];
    const caption = document.createElement("p");
    caption.className = "progress-caption";
    const latestPrefix = latest.day ? `Latest ${latest.day}: ` : "Latest: ";
    caption.textContent = `${latestPrefix}${latest.weight} x ${latest.reps} (${formatMax(latest.oneRepMax)})`;

    card.append(title, svg, caption);
    progressList.append(card);
  });

  if (!rendered) {
    const empty = document.createElement("p");
    empty.className = "empty-progress";
    empty.textContent = "No progress yet. Graphs will appear after your first saved sets.";
    progressList.append(empty);
  }
}

function removeStartLabels() {
  Object.keys(state.entries).forEach((entryId) => migrateEntry(state.entries[entryId]));
  saveState();
}

function render() {
  const isHome = currentView === "home";
  const isWorkout = currentView === "workout";
  const isProgress = currentView === "progress";
  appHeader.hidden = isHome;
  homeView.hidden = !isHome;
  workoutView.hidden = !isWorkout;
  progressView.hidden = !isProgress;
  renderDayButtons();
  renderTimers();

  if (isWorkout) {
    const workout = selectedWorkout();
    workoutTitle.textContent = workout.name;
    renderExercises(workout);
  }

  if (isProgress) {
    renderProgress();
  }
}

function returnHome() {
  currentView = "home";
  render();
}

backButton.addEventListener("click", returnHome);
progressBackButton.addEventListener("click", returnHome);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.hidden = true;
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

removeStartLabels();
restoreDraftCommits();
render();

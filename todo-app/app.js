/**
 * ToDoApp — 미루기, 서브태스크, 태그
 */

const STORAGE_KEY = "todoapp-todos";
const TRASH_STORAGE_KEY = "todoapp-trash";
const THEME_KEY = "todoapp-theme";

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => el.querySelectorAll(sel);

/** @typedef {{ id: string; title: string; completed: boolean; createdAt: string; snoozeUntil?: string | null; dueDate?: string | null; dueEndDate?: string | null; repeatDays?: number[]; scheduleColor?: string | null; completedDates?: string[]; subtasks?: { id: string; title: string; completed: boolean }[]; tags?: string[]; deletedAt?: string }} Todo */

/** @type {Todo[]} */
let todos = [];
/** @type {Todo[]} */
let deletedTodos = [];

const form = $("#todoForm");
const input = $("#todoInput");
const list = $("#todoList");
const listEmpty = $("#listEmpty");
const prioritizeIncompleteBtn = $("#prioritizeIncompleteBtn");
const template = $("#todoItemTemplate");
const themeToggle = $("#themeToggle");
const sortSelect = $("#sortSelect");
const tagFilterList = $("#tagFilterList");
const snoozeConfirmModal = $("#snoozeConfirmModal");
const snoozeConfirmCancel = $("#snoozeConfirmCancel");
const snoozeConfirmOk = $("#snoozeConfirmOk");
const deleteConfirmModal = $("#deleteConfirmModal");
const deleteConfirmTitle = $("#deleteConfirmTitle");
const deleteConfirmCancel = $("#deleteConfirmCancel");
const deleteConfirmOk = $("#deleteConfirmOk");
const colorPickerModal = $("#colorPickerModal");
const colorPickerInput = $("#colorPickerInput");
const colorPickerCancel = $("#colorPickerCancel");
const colorPickerOk = $("#colorPickerOk");
const calendarCompleteModal = $("#calendarCompleteModal");
const calendarCompleteTitle = $("#calendarCompleteTitle");
const calendarCompleteCancel = $("#calendarCompleteCancel");
const calendarCompleteAllOk = $("#calendarCompleteAllOk");
const calendarCompleteOk = $("#calendarCompleteOk");
const headerQuoteEl = $("#headerQuote");
const datePickerBtn = $("#datePickerBtn");
const datePickerModal = $("#datePickerModal");
const datePickerInput = $("#datePickerInput");
const datePickerEndInput = $("#datePickerEndInput");
const datePickerCancel = $("#datePickerCancel");
const datePickerOk = $("#datePickerOk");
const listSection = $("#listSection");
const myView = $("#myView");
const calendarPrev = $("#calendarPrev");
const calendarNext = $("#calendarNext");
const calendarMonthTitle = $("#calendarMonthTitle");
const calendarGrid = $("#calendarGrid");
const trashList = $("#trashList");
const trashEmpty = $("#trashEmpty");
const trashEmptyBtn = $("#trashEmptyBtn");
const calendarNormalList = $("#calendarNormalList");
const trashToggleBtn = $("#trashToggleBtn");
const trashContent = $("#trashContent");
const appEl = $(".app");

const filters = $$(".filter-tabs__btn");

/** 추가 시 사용할 날짜·반복 요일 (날짜 모달에서 설정) */
let pendingDueDate = null;
let pendingDueEndDate = null;
let pendingRepeatDays = [];
let currentFilter = "my";
let currentSort = "basic";
let currentTagFilter = null;
let pendingColorTodoId = null;
let prioritizeIncomplete = false;
let trashOpen = false;
/** @type {{ [todoId: string]: { subtasks?: boolean; tags?: boolean } }} */
let expandedPanelsByTodo = {};
/** 방금 추가된 할 일 ID (추가 애니메이션용) */
let lastAddedTodoId = null;

// ——— 테마 ———
function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
}
function toggleTheme() {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  applyTheme(next);
}
function renderLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}
applyTheme(getStoredTheme());

// ——— 동기부여 명언 (20개, 짧은 문장) ———
const MOTIVATIONAL_QUOTES = [
  "Don't look back in anger.",
  "한 걸음씩이면 충분해.",
  "시작이 반이다.",
  "오늘 할 일을 내일로 미루지 말자.",
  "작은 성취가 쌓이면 큰 결과가 된다.",
  "지금 이 순간에 집중해 보세요.",
  "할 수 있다고 믿으면 해낼 수 있어요.",
  "완벽하지 않아도 괜찮아요. 시작이 중요해요.",
  "한 가지씩 끝낼 때마다 조금 더 가벼워져요.",
  "오늘의 나는 어제보다 나아졌어요.",
  "할 일을 줄이는 것도 능력이에요.",
  "지금 하기 싫다면, 딱 하나만 해 보세요.",
  "미룬 만큼 나중에 더 힘들어져요. 지금이 제일 쉬워요.",
  "오늘 한 건 오늘의 승리예요.",
  "목록이 짧을수록 마음이 가벼워요.",
  "천 리 길도 한 걸음부터.",
  "체크 하나씩이 쌓여 완성이 됩니다.",
  "지금 당신이 할 수 있는 일에 집중하세요.",
  "작은 것부터 정리하면 큰 일도 술술 풀려요.",
  "오늘 할 수 있는 일을 오늘 하세요.",
  "한 번에 다 하지 않아도 돼요. 하나씩.",
];

function pickRandomQuote() {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

// ——— 미루기 확인 모달 ———
function showSnoozeConfirmModal(onConfirm) {
  if (!snoozeConfirmModal) return;
  snoozeConfirmModal.hidden = false;
  const close = () => {
    snoozeConfirmModal.hidden = true;
    snoozeConfirmCancel?.removeEventListener("click", onCancel);
    snoozeConfirmOk?.removeEventListener("click", onOk);
    snoozeConfirmModal.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onEscape);
  };
  const onOk = () => {
    onConfirm();
    close();
  };
  const onCancel = () => close();
  const onBackdrop = (e) => {
    if (e.target === snoozeConfirmModal) close();
  };
  const onEscape = (e) => {
    if (e.key === "Escape") close();
  };
  snoozeConfirmCancel?.addEventListener("click", onCancel);
  snoozeConfirmOk?.addEventListener("click", onOk);
  snoozeConfirmModal.addEventListener("click", onBackdrop);
  document.addEventListener("keydown", onEscape);
}

// ——— 삭제 확인 모달 ———
function showDeleteConfirmModal(message, onConfirm) {
  if (!deleteConfirmModal) return;
  if (deleteConfirmTitle) deleteConfirmTitle.textContent = message;
  deleteConfirmModal.hidden = false;
  const close = () => {
    deleteConfirmModal.hidden = true;
    deleteConfirmCancel?.removeEventListener("click", onCancel);
    deleteConfirmOk?.removeEventListener("click", onOk);
    deleteConfirmModal.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onEscape);
  };
  const onOk = () => {
    onConfirm();
    close();
  };
  const onCancel = () => close();
  const onBackdrop = (e) => {
    if (e.target === deleteConfirmModal) close();
  };
  const onEscape = (e) => {
    if (e.key === "Escape") close();
  };
  deleteConfirmCancel?.addEventListener("click", onCancel);
  deleteConfirmOk?.addEventListener("click", onOk);
  deleteConfirmModal.addEventListener("click", onBackdrop);
  document.addEventListener("keydown", onEscape);
}

function showCalendarCompleteModal(todo, targetDate, targetDatesAll = []) {
  if (!calendarCompleteModal || !todo || !targetDate) return;
  if (calendarCompleteTitle) calendarCompleteTitle.textContent = `<${todo.title}> 이 일을 다 마쳤나요?`;
  const normalizedAllDates = Array.isArray(targetDatesAll) ? targetDatesAll.filter(Boolean) : [];
  const canCompleteAll = normalizedAllDates.length > 1 && normalizedAllDates.some((d) => !isOccurrenceDone(todo, d));
  if (calendarCompleteAllOk) calendarCompleteAllOk.hidden = !canCompleteAll;
  if (calendarCompleteOk) calendarCompleteOk.hidden = isOccurrenceDone(todo, targetDate);
  calendarCompleteModal.hidden = false;
  const close = () => {
    calendarCompleteModal.hidden = true;
    calendarCompleteCancel?.removeEventListener("click", onCancel);
    calendarCompleteAllOk?.removeEventListener("click", onAllOk);
    calendarCompleteOk?.removeEventListener("click", onOk);
    calendarCompleteModal.removeEventListener("click", onBackdrop);
    document.removeEventListener("keydown", onEscape);
  };
  const onAllOk = () => {
    let changed = false;
    normalizedAllDates.forEach((d) => {
      if (!isOccurrenceDone(todo, d)) {
        markOccurrenceDone(todo, d);
        changed = true;
      }
    });
    if (changed) {
      saveTodos();
      renderList();
    }
    close();
  };
  const onOk = () => {
    if (!isOccurrenceDone(todo, targetDate)) {
      markOccurrenceDone(todo, targetDate);
      saveTodos();
      renderList();
    }
    close();
  };
  const onCancel = () => close();
  const onBackdrop = (e) => {
    if (e.target === calendarCompleteModal) close();
  };
  const onEscape = (e) => {
    if (e.key === "Escape") close();
  };
  calendarCompleteCancel?.addEventListener("click", onCancel);
  calendarCompleteAllOk?.addEventListener("click", onAllOk);
  calendarCompleteOk?.addEventListener("click", onOk);
  calendarCompleteModal.addEventListener("click", onBackdrop);
  document.addEventListener("keydown", onEscape);
}

function addDaysDateStr(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ——— 데이터 형식 보정 ———
function ensureTodoShape(todo) {
  if (!todo.subtasks || !Array.isArray(todo.subtasks)) todo.subtasks = [];
  if (!todo.tags || !Array.isArray(todo.tags)) todo.tags = [];
  if (todo.snoozeUntil === undefined) todo.snoozeUntil = null;
  if (todo.dueDate === undefined) todo.dueDate = null;
  if (todo.dueEndDate === undefined) todo.dueEndDate = null;
  if (todo.scheduleColor === undefined) todo.scheduleColor = null;
  if (!todo.completedDates || !Array.isArray(todo.completedDates)) todo.completedDates = [];
  if (!todo.repeatDays || !Array.isArray(todo.repeatDays)) todo.repeatDays = [];
  todo.subtasks = todo.subtasks.map((st) => ({
    id: st.id || `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: st.title || "",
    completed: !!st.completed,
  }));
  return todo;
}

// ——— 저장 / 불러오기 ———
function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) todos = parsed.map(ensureTodoShape);
    }
  } catch (_) {
    todos = [];
  }
  clearExpiredSnooze();
}

function loadTrash() {
  try {
    const raw = localStorage.getItem(TRASH_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) deletedTodos = parsed.map(ensureTodoShape);
    }
  } catch (_) {
    deletedTodos = [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (_) {}
}

function saveTrash() {
  try {
    localStorage.setItem(TRASH_STORAGE_KEY, JSON.stringify(deletedTodos));
  } catch (_) {}
}

// ——— 미루기: 지난 날짜면 해제 ———
function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toLocalDateStr(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatShortDateYYMMDD(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || "";
  const yy = dateStr.slice(2, 4);
  const mm = dateStr.slice(5, 7);
  const dd = dateStr.slice(8, 10);
  return `${yy}.${mm}.${dd}`;
}

const HOLIDAY_CACHE = new Map();
const HOLIDAY_FETCHING = new Set();

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isWeekend(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const w = d.getDay();
  return w === 0 || w === 6;
}

function addSubstituteHoliday(set, startDateStr) {
  const d = new Date(`${startDateStr}T00:00:00`);
  do {
    d.setDate(d.getDate() + 1);
  } while (set.has(toDateStr(d)) || d.getDay() === 0 || d.getDay() === 6);
  set.add(toDateStr(d));
}

function applyKoreanSubstituteHolidays(set, holidays) {
  if (!set || !Array.isArray(holidays) || holidays.length === 0) return set;
  const dateCount = new Map();
  holidays.forEach((h) => {
    if (!h || typeof h.date !== "string") return;
    dateCount.set(h.date, (dateCount.get(h.date) || 0) + 1);
  });
  const overlapDates = new Set([...dateCount.entries()].filter(([, count]) => count > 1).map(([date]) => date));

  // 단일 공휴일 대체휴일 대상 (한국)
  const substituteTarget = /(3·1절|광복절|개천절|한글날|어린이날|부처님 오신 날|크리스마스|성탄절)/;
  holidays.forEach((h) => {
    const localName = h?.localName || "";
    const dateStr = h?.date;
    if (!dateStr || !substituteTarget.test(localName)) return;
    if (isWeekend(dateStr) || overlapDates.has(dateStr)) addSubstituteHoliday(set, dateStr);
  });

  // 설날/추석(연휴형): 주말이 포함되면 연휴 끝 다음 영업일에 대체휴일
  ["설날", "추석"].forEach((name) => {
    const group = holidays.filter((h) => (h?.localName || "").includes(name)).map((h) => h.date).filter(Boolean).sort();
    if (group.length === 0) return;
    const hasWeekendOrOverlap = group.some((d) => isWeekend(d) || overlapDates.has(d));
    if (!hasWeekendOrOverlap) return;
    addSubstituteHoliday(set, group[group.length - 1]);
  });

  return set;
}

function getFixedHolidayDateSet(year) {
  // 한국 양력 공휴일(고정일) 폴백
  const fixed = ["01-01", "03-01", "05-05", "06-06", "08-15", "10-03", "10-09", "12-25"];
  return new Set(fixed.map((mmdd) => `${year}-${mmdd}`));
}

function getHolidayDateSet(year) {
  if (HOLIDAY_CACHE.has(year)) return HOLIDAY_CACHE.get(year);
  const fallback = getFixedHolidayDateSet(year);
  HOLIDAY_CACHE.set(year, fallback);
  return fallback;
}

async function ensureHolidayYearLoaded(year) {
  if (!year || HOLIDAY_CACHE.has(year) || HOLIDAY_FETCHING.has(year)) return;
  HOLIDAY_FETCHING.add(year);
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
    if (!res.ok) throw new Error(`holiday api ${res.status}`);
    const data = await res.json();
    const set = new Set();
    if (Array.isArray(data)) {
      data.forEach((h) => {
        if (h && typeof h.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.date)) {
          set.add(h.date);
        }
      });
      applyKoreanSubstituteHolidays(set, data);
    }
    HOLIDAY_CACHE.set(year, set.size > 0 ? set : getFixedHolidayDateSet(year));
  } catch (_) {
    HOLIDAY_CACHE.set(year, getFixedHolidayDateSet(year));
  } finally {
    HOLIDAY_FETCHING.delete(year);
    if (currentFilter === "my") renderCalendar();
  }
}

function isHolidayDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const year = Number(dateStr.slice(0, 4));
  ensureHolidayYearLoaded(year);
  return getHolidayDateSet(year).has(dateStr);
}

function isFutureSnoozed(todo) {
  const today = todayDateStr();
  return !!(todo?.snoozeUntil && todo.snoozeUntil > today);
}

function getEffectiveDate(todo) {
  if (!todo) return null;
  if (isFutureSnoozed(todo)) return todo.snoozeUntil;
  if (todo.dueDate) return todo.dueDate;
  return toLocalDateStr(todo.createdAt);
}

function getEffectiveDateRange(todo) {
  const start = getEffectiveDate(todo);
  let end = todo?.dueEndDate || null;
  if (isFutureSnoozed(todo)) end = null;
  if (!end) end = start;
  if (start && end && end < start) end = start;
  return { start, end };
}

function isOccurrenceDone(todo, dateStr) {
  if (!todo || !dateStr) return false;
  const isRecurring = !!(todo.repeatDays && todo.repeatDays.length > 0);
  const { start, end } = getEffectiveDateRange(todo);
  const isRange = !!(start && end && start !== end);
  if (isRecurring || isRange) return !!(todo.completedDates && todo.completedDates.includes(dateStr));
  return !!todo.completed;
}

function markOccurrenceDone(todo, dateStr) {
  if (!todo || !dateStr) return;
  const isRecurring = !!(todo.repeatDays && todo.repeatDays.length > 0);
  const { start, end } = getEffectiveDateRange(todo);
  const isRange = !!(start && end && start !== end);
  if (isRecurring || isRange) {
    todo.completedDates = todo.completedDates || [];
    if (!todo.completedDates.includes(dateStr)) {
      todo.completedDates.push(dateStr);
      todo.completedDates.sort();
    }
    return;
  }
  todo.completed = true;
}

function isTodoCompletedForList(todo) {
  return isOccurrenceDone(todo, todayDateStr());
}

function buildCalendarBarSegments(todo, weekDates, startCol, span, color, title, allStartCol = startCol, allSpan = span) {
  if (!todo || !Array.isArray(weekDates) || span <= 0) return "";
  const chunks = [];
  let segStart = 0;
  let segDone = isOccurrenceDone(todo, weekDates[startCol]);
  for (let i = 1; i <= span; i++) {
    const nextDone = i < span ? isOccurrenceDone(todo, weekDates[startCol + i]) : null;
    if (i === span || nextDone !== segDone) {
      const segLen = i - segStart;
      const colStart = startCol + segStart;
      const doneClass = segDone ? " calendar__bar--done" : "";
      const text = segStart === 0 ? escapeHtml(title) : segDone ? "✓" : "";
      const extraTextClass = text === "✓" ? " calendar__bar-text--check" : "";
      chunks.push(
        `<div class="calendar__bar calendar__bar--fill${doneClass}" data-todo-id="${todo.id}" data-week-start="${weekDates[0]}" data-start-col="${colStart}" data-span="${segLen}" data-all-start-col="${allStartCol}" data-all-span="${allSpan}" style="grid-column: span ${segLen}; background:${color.bg}; color:${color.fg};"><span class="calendar__bar-text${segDone ? " calendar__bar-text--done" : ""}${extraTextClass}">${text}</span></div>`
      );
      segStart = i;
      segDone = nextDone;
    }
  }
  return chunks.join("");
}

function clearExpiredSnooze() {
  const today = todayDateStr();
  let changed = false;
  todos.forEach((t) => {
    if (t.snoozeUntil && t.snoozeUntil <= today) {
      t.snoozeUntil = null;
      changed = true;
    }
  });
  if (changed) saveTodos();
}

// ——— ID 생성 ———
function nextId() {
  return `todo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
function nextSubtaskId() {
  return `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ——— 시간 포맷 ———
function formatAddedTime(isoString) {
  const d = new Date(isoString);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isThisYear = d.getFullYear() === now.getFullYear();
  if (isToday) {
    const h = d.getHours();
    const m = d.getMinutes();
    if (h < 12) return `오전 ${h === 0 ? 12 : h}:${String(m).padStart(2, "0")}`;
    return `오후 ${h === 12 ? 12 : h - 12}:${String(m).padStart(2, "0")}`;
  }
  if (isThisYear) return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

// ——— 정렬 ———
function sortTodos(arr) {
  const copy = [...arr];
  switch (currentSort) {
    case "oldest":
      return copy.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    case "basic":
    case "newest":
    default:
      return copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
}

// ——— 필터 (미루기 해제된 것만, 상태, 태그, 미룬 항목 탭) ———
function getFilteredTodos() {
  clearExpiredSnooze();
  const today = todayDateStr();
  let filtered;

  if (currentFilter === "snoozed") {
    filtered = todos.filter((t) => t.snoozeUntil && t.snoozeUntil > today);
  } else {
    filtered = todos.filter((t) => !t.snoozeUntil || t.snoozeUntil <= today);
    if (currentFilter === "active") filtered = filtered.filter((t) => !isTodoCompletedForList(t));
    else if (currentFilter === "completed") filtered = filtered.filter((t) => isTodoCompletedForList(t));
  }

  if (currentTagFilter && currentFilter !== "snoozed") {
    filtered = filtered.filter((t) => t.tags && t.tags.includes(currentTagFilter));
  }

  const sorted = sortTodos(filtered);
  if (prioritizeIncomplete && (currentFilter === "all" || currentFilter === "snoozed")) {
    const incompleted = sorted.filter((t) => !isTodoCompletedForList(t));
    const completed = sorted.filter((t) => isTodoCompletedForList(t));
    return [...incompleted, ...completed];
  }
  return sorted;
}

// ——— 사용된 태그 목록 ———
function getUsedTags() {
  const set = new Set();
  todos.forEach((t) => (t.tags || []).forEach((tag) => set.add(tag)));
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

// ——— 태그 필터 UI ———
function renderTagFilter() {
  if (!tagFilterList) return;
  const parent = tagFilterList.closest(".tag-filter");
  if (currentFilter === "snoozed") {
    if (parent) parent.style.display = "none";
    return;
  }
  if (parent) parent.style.display = "";
  const tags = getUsedTags();
  tagFilterList.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "tag-filter__tag" + (currentTagFilter === null ? " is-active" : "");
  allBtn.textContent = "전체";
  allBtn.addEventListener("click", () => setTagFilter(null));
  tagFilterList.appendChild(allBtn);
  tags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tag-filter__tag" + (currentTagFilter === tag ? " is-active" : "");
    btn.textContent = tag;
    btn.addEventListener("click", () => setTagFilter(tag));
    tagFilterList.appendChild(btn);
  });
}

// ——— My 뷰: 캘린더 ———
let calendarCurrentYear = new Date().getFullYear();
let calendarCurrentMonth = new Date().getMonth();

/** 해당 날짜에 표시할 일반 일정: 미지정이면 생성일, 미루면 snooze 날짜 */
function getTodosForDate(year, month, date) {
  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
  return todos.filter((t) => {
    if (t.repeatDays && t.repeatDays.length > 0) return false;
    const { start, end } = getEffectiveDateRange(t);
    if (!start || !end) return false;
    // 기간 일정(start != end)은 주간 연결 막대로 표시하고, 셀에는 단일 일정만 표시
    if (start !== end) return false;
    return start === dateStr;
  });
}

/** 반복 요일 배열에서 연속된 구간(run) 목록. 예: [1,2,3] → [{start:1,len:3}] */
function getConsecutiveRuns(days) {
  if (!days || days.length === 0) return [];
  const sorted = [...days].sort((a, b) => a - b);
  const runs = [];
  let start = sorted[0];
  let len = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      len++;
    } else {
      runs.push({ start, len });
      start = sorted[i];
      len = 1;
    }
  }
  runs.push({ start, len });
  return runs;
}

/** 반복 요일이 있는 할 일 (요일 합쳐서 한 줄로 표시) */
function getRecurringTodos() {
  return todos.filter((t) => t.repeatDays && t.repeatDays.length > 0 && !isFutureSnoozed(t));
}

function getTodayScheduleTodos() {
  const today = todayDateStr();
  const todayDow = new Date().getDay();
  return todos.filter((t) => {
    if (isFutureSnoozed(t)) return false;
    const hasRepeat = !!(t.repeatDays && t.repeatDays.length > 0);
    if (hasRepeat) return t.repeatDays.includes(todayDow);
    const { start, end } = getEffectiveDateRange(t);
    if (!start || !end) return false;
    return start <= today && today <= end;
  });
}

function getNextRecurringDateStr(todo, fromDateStr = todayDateStr()) {
  const days = todo?.repeatDays || [];
  if (!Array.isArray(days) || days.length === 0) return null;
  for (let i = 0; i < 14; i++) {
    const d = addDaysDateStr(fromDateStr, i);
    const dow = new Date(`${d}T00:00:00`).getDay();
    if (days.includes(dow)) return d;
  }
  return null;
}

function getDdayLabel(targetDateStr, baseDateStr = todayDateStr()) {
  if (!targetDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(targetDateStr)) return "";
  const target = new Date(`${targetDateStr}T00:00:00`);
  const base = new Date(`${baseDateStr}T00:00:00`);
  const diffDays = Math.floor((target - base) / 86400000);
  if (diffDays < 0) return "";
  if (diffDays === 0) return "D-day";
  return `D-${diffDays}`;
}

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
const SCHEDULE_BAR_COLORS = [
  { bg: "#8B5CF6", fg: "#FFFFFF" },
  { bg: "#3B82F6", fg: "#FFFFFF" },
  { bg: "#06B6D4", fg: "#FFFFFF" },
  { bg: "#10B981", fg: "#FFFFFF" },
  { bg: "#F59E0B", fg: "#1F2937" },
  { bg: "#EF4444", fg: "#FFFFFF" },
  { bg: "#EC4899", fg: "#FFFFFF" },
];

function isHexColor(v) {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v);
}

function getContrastText(hex) {
  if (!isHexColor(hex)) return "#FFFFFF";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // YIQ contrast
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? "#1F2937" : "#FFFFFF";
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function getScheduleBarColor(todo) {
  if (isHexColor(todo?.scheduleColor)) {
    return { bg: todo.scheduleColor, fg: getContrastText(todo.scheduleColor) };
  }
  const key = `${todo.id || ""}:${todo.title || ""}`;
  return SCHEDULE_BAR_COLORS[hashString(key) % SCHEDULE_BAR_COLORS.length];
}

function openColorPickerModal(todo) {
  if (!colorPickerModal || !colorPickerInput) return;
  const color = getScheduleBarColor(todo);
  pendingColorTodoId = todo.id;
  colorPickerInput.value = color.bg;
  colorPickerModal.hidden = false;
}

function closeColorPickerModal() {
  if (colorPickerModal) colorPickerModal.hidden = true;
  pendingColorTodoId = null;
}

function renderCalendar() {
  if (!calendarGrid || !calendarMonthTitle) return;
  if (currentFilter !== "my") return;
  calendarMonthTitle.textContent = `${calendarCurrentYear}년 ${calendarCurrentMonth + 1}월`;
  const first = new Date(calendarCurrentYear, calendarCurrentMonth, 1);
  const last = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0);
  const prevMonthLastDate = new Date(calendarCurrentYear, calendarCurrentMonth, 0);
  const nextMonthFirstDate = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 1);
  const prevYear = prevMonthLastDate.getFullYear();
  const prevMonth = prevMonthLastDate.getMonth();
  const nextYear = nextMonthFirstDate.getFullYear();
  const nextMonth = nextMonthFirstDate.getMonth();
  const startDay = first.getDay();
  const daysInMonth = last.getDate();
  const prevMonthLast = prevMonthLastDate.getDate();
  const recurring = getRecurringTodos();
  const rangeTodos = todos.filter((t) => {
    if (t.repeatDays && t.repeatDays.length > 0) return false;
    const { start, end } = getEffectiveDateRange(t);
    return !!(start && end && start !== end);
  });
  const weeksCount = Math.ceil((startDay + daysInMonth) / 7);
  let day = 1;
  let nextMonthDay = 1;
  let html = "";

  for (let week = 0; week < weeksCount; week++) {
    let weekDaysHtml = "";
    const weekDates = [];
    for (let dow = 0; dow < 7; dow++) {
      const idx = week * 7 + dow;
      if (idx < startDay) {
        const d = prevMonthLast - startDay + 1 + idx;
        const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        weekDates.push(dateStr);
        const satClass = dow === 6 ? " calendar__cell--sat" : "";
        const sunClass = dow === 0 ? " calendar__cell--sun" : "";
        const holidayClass = isHolidayDate(dateStr) ? " calendar__cell--holiday" : "";
        weekDaysHtml += `<div class="calendar__cell calendar__cell--other${satClass}${sunClass}${holidayClass}"><span class="calendar__day-num">${d}</span></div>`;
      } else if (day <= daysInMonth) {
        const currentDateStr = `${calendarCurrentYear}-${String(calendarCurrentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        weekDates.push(currentDateStr);
        const dayTodos = getTodosForDate(calendarCurrentYear, calendarCurrentMonth, day);
        const satClass = dow === 6 ? " calendar__cell--sat" : "";
        const sunClass = dow === 0 ? " calendar__cell--sun" : "";
        const holidayClass = isHolidayDate(currentDateStr) ? " calendar__cell--holiday" : "";
        const cls = (dayTodos.length > 0 ? "calendar__cell calendar__cell--has" : "calendar__cell") + satClass + sunClass + holidayClass;
        weekDaysHtml += `<div class="${cls}" data-date="${currentDateStr}"><span class="calendar__day-num">${day}</span><div class="calendar__tasks">${dayTodos.map((t) => {
          const color = getScheduleBarColor(t);
          const done = isOccurrenceDone(t, currentDateStr);
          const doneClass = done ? " calendar__task--done" : "";
          return `<span class="calendar__task${doneClass}" data-todo-id="${t.id}" data-date="${currentDateStr}" style="background:${color.bg};color:${color.fg};"><span class="calendar__task-text${done ? " calendar__task-text--done" : ""}">${escapeHtml(t.title)}</span></span>`;
        }).join("")}</div></div>`;
        day += 1;
      } else {
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, "0")}-${String(nextMonthDay).padStart(2, "0")}`;
        weekDates.push(dateStr);
        const satClass = dow === 6 ? " calendar__cell--sat" : "";
        const sunClass = dow === 0 ? " calendar__cell--sun" : "";
        const holidayClass = isHolidayDate(dateStr) ? " calendar__cell--holiday" : "";
        weekDaysHtml += `<div class="calendar__cell calendar__cell--other${satClass}${sunClass}${holidayClass}"><span class="calendar__day-num">${nextMonthDay}</span></div>`;
        nextMonthDay += 1;
      }
    }

    let barsHtml = "";
    const barRows = [];
    recurring.forEach((t) => {
      const runs = getConsecutiveRuns(t.repeatDays || []);
      const color = getScheduleBarColor(t);
      let row = "";
      let col = 0;
      runs.forEach((run) => {
        if (run.start > col) {
          row += `<div class="calendar__bar calendar__bar--empty" style="grid-column: span ${run.start - col};"></div>`;
          col = run.start;
        }
        row += buildCalendarBarSegments(t, weekDates, run.start, run.len, color, t.title, run.start, run.len);
        col += run.len;
      });
      if (col < 7) {
        row += `<div class="calendar__bar calendar__bar--empty" style="grid-column: span ${7 - col};"></div>`;
      }
      barRows.push(`<div class="calendar__bar-row">${row}</div>`);
    });

    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];
    rangeTodos.forEach((t) => {
      const { start, end } = getEffectiveDateRange(t);
      if (!start || !end) return;
      const inStart = start > weekStart ? start : weekStart;
      const inEnd = end < weekEnd ? end : weekEnd;
      if (inStart > inEnd) return;
      const startCol = weekDates.indexOf(inStart);
      const endCol = weekDates.indexOf(inEnd);
      if (startCol < 0 || endCol < 0 || endCol < startCol) return;
      const color = getScheduleBarColor(t);
      let row = "";
      if (startCol > 0) row += `<div class="calendar__bar calendar__bar--empty" style="grid-column: span ${startCol};"></div>`;
      row += buildCalendarBarSegments(t, weekDates, startCol, endCol - startCol + 1, color, t.title, startCol, endCol - startCol + 1);
      if (endCol < 6) row += `<div class="calendar__bar calendar__bar--empty" style="grid-column: span ${6 - endCol};"></div>`;
      barRows.push(`<div class="calendar__bar-row">${row}</div>`);
    });

    barsHtml = barRows.join("");
    const weekBarRows = barRows.length;
    const weekClass = weekBarRows > 0 ? "calendar__week calendar__week--has-bars" : "calendar__week";
    html += `<div class="${weekClass}" style="--bar-rows:${weekBarRows};"><div class="calendar__week-days">${weekDaysHtml}</div>${weekBarRows > 0 ? `<div class="calendar__week-bars">${barsHtml}</div>` : ""}</div>`;
  }

  calendarGrid.innerHTML = html;

  // 오늘 일정 목록 (아래 블록)
  const openColorPickerForTodo = (todo) => openColorPickerModal(todo);
  if (calendarNormalList) {
    const todayTodos = getTodayScheduleTodos();
    calendarNormalList.innerHTML = "";
    if (todayTodos.length === 0) {
      const li = document.createElement("li");
      li.className = "calendar__recurring-item";
      li.innerHTML = `<span class="calendar__recurring-task">오늘 일정이 없습니다.</span>`;
      calendarNormalList.appendChild(li);
    }
    todayTodos.forEach((t) => {
      const li = document.createElement("li");
      li.className = "calendar__recurring-item";
      const color = getScheduleBarColor(t);
      const done = isOccurrenceDone(t, todayDateStr());
      const doneClass = done ? " calendar__recurring-task--done" : "";
      const doneBadge = done ? '<span class="calendar__recurring-status">완료</span>' : "";
      li.innerHTML = `<span class="calendar__recurring-task${doneClass}">${escapeHtml(t.title)}</span>${doneBadge}<button type="button" class="calendar__recurring-color-btn" aria-label="막대 색상 변경" style="background:${color.bg};"></button>`;
      li.querySelector(".calendar__recurring-color-btn")?.addEventListener("click", () => openColorPickerForTodo(t));
      calendarNormalList.appendChild(li);
    });
  }
}

function renderTrash() {
  if (currentFilter !== "my") return;
  if (!trashList || !trashEmpty || !trashEmptyBtn) return;
  if (trashContent) trashContent.hidden = !trashOpen;
  if (trashToggleBtn) {
    trashToggleBtn.textContent = trashOpen ? "휴지통 닫기" : "휴지통 열람";
    trashToggleBtn.setAttribute("aria-expanded", trashOpen ? "true" : "false");
  }
  if (!trashOpen) return;

  trashList.innerHTML = "";
  if (deletedTodos.length === 0) {
    trashEmpty.hidden = false;
    trashEmptyBtn.hidden = true;
    return;
  }
  trashEmpty.hidden = true;
  trashEmptyBtn.hidden = false;

  const incompleted = deletedTodos.filter((t) => !t.completed);
  const completed = deletedTodos.filter((t) => t.completed);
  const groups = [
    { title: "미완료 일정", items: incompleted },
    { title: "완료 일정", items: completed },
  ];
  groups.forEach((group) => {
    if (group.items.length === 0) return;
    const label = document.createElement("li");
    label.className = "trash-list__group-label";
    label.textContent = group.title;
    trashList.appendChild(label);
    group.items.forEach((todo) => {
      const li = document.createElement("li");
      li.className = "trash-item";
      li.dataset.id = todo.id;
      li.innerHTML = `
        <span class="trash-item__title">${escapeHtml(todo.title)}</span>
        <span class="trash-item__date">${todo.deletedAt ? formatAddedTime(todo.deletedAt) : ""}</span>
        <button type="button" class="trash-item__restore" aria-label="복원">복원</button>
      `;
      li.querySelector(".trash-item__restore").addEventListener("click", () => restoreFromTrash(todo.id));
      trashList.appendChild(li);
    });
  });
}

function restoreFromTrash(id) {
  const todo = deletedTodos.find((t) => t.id === id);
  if (!todo) return;
  const { deletedAt, ...rest } = todo;
  deletedTodos = deletedTodos.filter((t) => t.id !== id);
  todos.unshift(ensureTodoShape(rest));
  saveTodos();
  saveTrash();
  renderTrash();
  if (currentFilter !== "my") renderList();
}

function emptyTrash() {
  deletedTodos = [];
  saveTrash();
  renderTrash();
}

// ——— 렌더 ———
function renderList() {
  if (currentFilter === "my") {
    if (appEl) {
      appEl.classList.add("view-my");
      appEl.classList.remove("view-todo");
      appEl.classList.remove("view-snoozed");
      appEl.classList.remove("view-time");
      appEl.classList.remove("view-settings");
    }
    if (listSection) {
      listSection.hidden = true;
      listSection.setAttribute("hidden", "");
    }
    if (myView) {
      myView.hidden = false;
      myView.removeAttribute("hidden");
    }
    renderTagFilter();
    renderCalendar();
    renderTrash();
    return;
  }
  if (appEl) {
    appEl.classList.remove("view-my");
    appEl.classList.toggle("view-todo", currentFilter === "all");
    appEl.classList.toggle("view-snoozed", currentFilter === "snoozed");
    appEl.classList.toggle("view-time", currentFilter === "time");
    appEl.classList.toggle("view-settings", currentFilter === "settings");
  }

  if (currentFilter === "time" || currentFilter === "settings") {
    if (listSection) {
      listSection.hidden = true;
      listSection.setAttribute("hidden", "");
    }
    if (myView) {
      myView.hidden = true;
      myView.setAttribute("hidden", "");
    }
    return;
  }

  if (listSection) {
    listSection.hidden = false;
    listSection.removeAttribute("hidden");
  }
  if (myView) {
    myView.hidden = true;
    myView.setAttribute("hidden", "");
  }

  const filtered = getFilteredTodos();
  renderTagFilter();

  list.innerHTML = "";
  const isRecurringTodo = (t) => Array.isArray(t.repeatDays) && t.repeatDays.length > 0;
  const shouldGroupRecurring = currentFilter === "all" || currentFilter === "active";
  let displayTodos = filtered;
  const groupLabelByIndex = new Map();

  if (shouldGroupRecurring) {
    const today = todayDateStr();
    const nonRecurringTodos = filtered.filter((t) => !isRecurringTodo(t));
    let normalTodos = nonRecurringTodos.filter((t) => {
      const { start } = getEffectiveDateRange(t);
      return !start || start <= today;
    });
    let upcomingTodos = nonRecurringTodos.filter((t) => {
      const { start } = getEffectiveDateRange(t);
      return !!start && start > today;
    });
    let recurringTodos = filtered.filter((t) => isRecurringTodo(t));

    if (currentSort === "basic") {
      // 기본순: 일반=최신순, 다가오는/반복=가까운 날짜순
      normalTodos = [...normalTodos].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      upcomingTodos = [...upcomingTodos].sort((a, b) => {
        const aStart = getEffectiveDateRange(a).start || "9999-12-31";
        const bStart = getEffectiveDateRange(b).start || "9999-12-31";
        if (aStart !== bStart) return aStart.localeCompare(bStart);
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      recurringTodos = [...recurringTodos].sort((a, b) => {
        const aNext = getNextRecurringDateStr(a, today) || "9999-12-31";
        const bNext = getNextRecurringDateStr(b, today) || "9999-12-31";
        if (aNext !== bNext) return aNext.localeCompare(bNext);
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      // 기본순에서도 미완료 우선 토글 반영
      if (prioritizeIncomplete && (currentFilter === "all" || currentFilter === "snoozed")) {
        const incompleteFirst = (arr) => [
          ...arr.filter((t) => !isTodoCompletedForList(t)),
          ...arr.filter((t) => isTodoCompletedForList(t)),
        ];
        normalTodos = incompleteFirst(normalTodos);
        upcomingTodos = incompleteFirst(upcomingTodos);
        recurringTodos = incompleteFirst(recurringTodos);
      }
    }
    displayTodos = [...normalTodos, ...upcomingTodos, ...recurringTodos];

    let idx = 0;
    if (normalTodos.length > 0) {
      groupLabelByIndex.set(idx, "일반 일정");
      idx += normalTodos.length;
    }
    if (upcomingTodos.length > 0) {
      groupLabelByIndex.set(idx, "다가오는 일정");
      idx += upcomingTodos.length;
    }
    if (recurringTodos.length > 0) {
      groupLabelByIndex.set(idx, "반복 일정");
    }
  }

  displayTodos.forEach((todo, idx) => {
    if (shouldGroupRecurring && groupLabelByIndex.has(idx)) {
      const groupLabel = document.createElement("li");
      groupLabel.className = "todo-list__group-label";
      groupLabel.textContent = groupLabelByIndex.get(idx);
      list.appendChild(groupLabel);
    }

    const node = template.content.cloneNode(true);
    const li = node.querySelector(".todo-item");
    const row = node.querySelector(".todo-item__row");
    const check = node.querySelector(".todo-item__check");
    const body = node.querySelector(".todo-item__body");
    const label = node.querySelector(".todo-item__label");
    const timeEl = node.querySelector(".todo-item__time");
    const editInput = node.querySelector(".todo-item__edit");
    const subtaskList = node.querySelector(".todo-subtask-list");
    const subtaskAddInput = node.querySelector(".todo-subtask-add__input");
    const subtaskAddBtn = node.querySelector(".todo-subtask-add__btn");
    const tagsContainer = node.querySelector(".todo-item__tags");
    const tagAddInput = node.querySelector(".todo-tag-add__input");
    const tagAddBtn = node.querySelector(".todo-tag-add__btn");
    const listCompleted = isTodoCompletedForList(todo);

    li.dataset.id = todo.id;
    if (listCompleted) li.dataset.completed = "true";
    if (todo.id === lastAddedTodoId) li.classList.add("todo-item--new");

    check.id = `check-${todo.id}`;
    check.checked = listCompleted;
    label.htmlFor = check.id;
    label.textContent = todo.title;
    timeEl.dateTime = todo.createdAt;
    timeEl.textContent = formatAddedTime(todo.createdAt);
    const dueInlineEl = node.querySelector(".todo-item__due-inline");
    if (dueInlineEl) {
      const parts = [];
      const { start, end } = getEffectiveDateRange(todo);
      if (start && end && start !== end) {
        parts.push(`${formatShortDateYYMMDD(start)} - ${formatShortDateYYMMDD(end)}`);
      } else if (start) {
        parts.push(formatShortDateYYMMDD(start));
      }
      if ((todo.repeatDays || []).length > 0) {
        const names = ["일", "월", "화", "수", "목", "금", "토"];
        parts.push("매주 " + todo.repeatDays.map((d) => names[d]).join(", "));
      }
      const targetForDday = (todo.repeatDays || []).length > 0 ? getNextRecurringDateStr(todo) : start;
      const dday = getDdayLabel(targetForDday);
      if (dday) parts.push(dday);
      dueInlineEl.textContent = parts.join(" · ");
      dueInlineEl.hidden = parts.length === 0;
    }
    const tagsInlineEl = node.querySelector(".todo-item__tags-inline");
    if (tagsInlineEl) {
      tagsInlineEl.textContent = (todo.tags || []).length ? (todo.tags || []).map((t) => "#" + t).join(" ") : "";
    }
    editInput.value = todo.title;
    editInput.id = `edit-${todo.id}`;

    // 미루기 / 꺼내기 (미룬 항목 탭에서는 꺼내기만 표시, 데스크톱/모바일 모두 동기화)
    const unsnoozeBtns = node.querySelectorAll(".todo-item__btn--unsnooze");
    const snoozeBtns = node.querySelectorAll(".todo-item__btn--snooze");
    const snoozeDropdowns = node.querySelectorAll(".todo-item__snooze-dropdown");

    if (currentFilter === "snoozed") {
      unsnoozeBtns.forEach((b) => { b.hidden = false; });
      snoozeBtns.forEach((b) => { b.hidden = true; });
      snoozeDropdowns.forEach((d) => { d.hidden = true; });
      unsnoozeBtns.forEach((b) => b.addEventListener("click", () => unsnooze(todo.id)));
    } else {
      unsnoozeBtns.forEach((b) => { b.hidden = true; });
      snoozeBtns.forEach((b) => { b.hidden = false; });
    }

    function closeAllSnoozeDropdowns() {
      list.querySelectorAll(".todo-item__snooze-dropdown").forEach((d) => { d.hidden = true; });
      list.querySelectorAll(".todo-item__btn--snooze").forEach((b) => b.setAttribute("aria-expanded", "false"));
      list.querySelectorAll(".todo-item__snooze-date-wrap").forEach((w) => { w.hidden = true; });
    }

    snoozeBtns.forEach((snoozeBtn) => {
      const snoozeEl = snoozeBtn.closest(".todo-item__snooze");
      const snoozeDropdown = snoozeEl?.querySelector(".todo-item__snooze-dropdown");
      if (!snoozeDropdown) return;
      snoozeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpen = !snoozeDropdown.hidden;
        closeAllSnoozeDropdowns();
        if (!isOpen) {
          snoozeDropdown.hidden = false;
          snoozeBtn.setAttribute("aria-expanded", "true");
        } else {
          snoozeBtn.setAttribute("aria-expanded", "false");
        }
      });
    });

    node.querySelectorAll(".todo-item__snooze-option").forEach((opt) => {
      const snoozeEl = opt.closest(".todo-item__snooze");
      const snoozeDateWrap = snoozeEl?.querySelector(".todo-item__snooze-date-wrap");
      const snoozeDateInput = snoozeEl?.querySelector(".todo-item__snooze-date");
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        if (opt.dataset.snooze === "tomorrow") {
          showSnoozeConfirmModal(() => {
            snoozeTomorrow(todo.id);
            closeAllSnoozeDropdowns();
          });
        } else if (opt.dataset.snooze === "date" && snoozeDateWrap && snoozeDateInput) {
          snoozeDateWrap.hidden = !snoozeDateWrap.hidden;
          if (!snoozeDateWrap.hidden) {
            snoozeDateInput.min = todayDateStr();
            snoozeDateInput.value = "";
            snoozeDateInput.focus();
            if (typeof snoozeDateInput.showPicker === "function") {
              snoozeDateInput.showPicker();
            }
          }
        }
      });
    });

    node.querySelectorAll(".todo-item__snooze-date").forEach((snoozeDateInput) => {
      const snoozeEl = snoozeDateInput.closest(".todo-item__snooze");
      const snoozeDateWrap = snoozeEl?.querySelector(".todo-item__snooze-date-wrap");
      snoozeDateInput.addEventListener("change", () => {
        const v = snoozeDateInput.value;
        if (v) {
          showSnoozeConfirmModal(() => {
            snoozeUntilDate(todo.id, v);
            if (snoozeDateWrap) snoozeDateWrap.hidden = true;
            snoozeDateInput.value = "";
            closeAllSnoozeDropdowns();
          });
        }
      });
    });

    check.addEventListener("change", () => toggleComplete(todo.id));
    /* 아이템 박스(본문 영역) 클릭 시에도 체크 토글 */
    body.addEventListener("click", (e) => {
      e.preventDefault();
      toggleComplete(todo.id);
    });
    editInput.addEventListener("blur", () => commitEdit(todo.id));
    editInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") commitEdit(todo.id);
      if (e.key === "Escape") cancelEdit(todo.id);
    });
    node.querySelectorAll(".todo-item__btn--edit").forEach((btn) => btn.addEventListener("click", () => startEdit(todo.id)));
    node.querySelectorAll(".todo-item__btn--delete").forEach((btn) =>
      btn.addEventListener("click", () => {
        showDeleteConfirmModal("이 할 일을 삭제하시겠습니까?", () => removeTodo(todo.id));
      })
    );

    // 항목 추가/태그 패널 토글 (열린 패널은 유지)
    const extraToggles = node.querySelectorAll(".todo-item__extra-toggle");
    const subtasksWrap = node.querySelector(".todo-item__subtasks-wrap");
    const tagsWrap = node.querySelector(".todo-item__tags-wrap");
    const subtasksOpen = !!(expandedPanelsByTodo[todo.id] && expandedPanelsByTodo[todo.id].subtasks);
    const tagsOpen = !!(expandedPanelsByTodo[todo.id] && expandedPanelsByTodo[todo.id].tags);
    const hasSubtasks = (todo.subtasks || []).length > 0;
    const subtasksListWrap = node.querySelector(".todo-item__subtasks-list-wrap");
    if (subtasksListWrap) {
      if (hasSubtasks) subtasksListWrap.classList.remove("is-empty");
      else subtasksListWrap.classList.add("is-empty");
    }
    if (subtasksOpen) {
      subtasksWrap.classList.remove("is-hidden");
      extraToggles[0].setAttribute("aria-expanded", "true");
    }
    if (!hasSubtasks && !subtasksOpen) subtasksWrap.classList.add("is-empty");
    else subtasksWrap.classList.remove("is-empty");
    if (tagsOpen) {
      tagsWrap.classList.remove("is-hidden");
      extraToggles[1].setAttribute("aria-expanded", "true");
    }
    extraToggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const panel = toggle.dataset.panel;
        const wrap = panel === "subtasks" ? subtasksWrap : tagsWrap;
        const isHidden = wrap.classList.contains("is-hidden");
        wrap.classList.toggle("is-hidden", !isHidden);
        if (panel === "subtasks") {
          if (isHidden) subtasksWrap.classList.remove("is-empty");
          else if (!(todo.subtasks || []).length) subtasksWrap.classList.add("is-empty");
        }
        toggle.setAttribute("aria-expanded", isHidden ? "true" : "false");
        expandedPanelsByTodo[todo.id] = expandedPanelsByTodo[todo.id] || {};
        expandedPanelsByTodo[todo.id][panel === "subtasks" ? "subtasks" : "tags"] = isHidden;
      });
    });

    // 항목 추가 (서브태스크)
    (todo.subtasks || []).forEach((st) => {
      const stEl = document.createElement("li");
      stEl.className = "todo-subtask-item";
      stEl.dataset.subtaskId = st.id;
      if (st.completed) stEl.dataset.completed = "true";
      const stCheckId = `st-${todo.id}-${st.id}`;
      stEl.innerHTML = `
        <input type="checkbox" class="todo-subtask-item__check" id="${stCheckId}" ${st.completed ? "checked" : ""} aria-label="항목 완료">
        <label class="todo-subtask-item__label" for="${stCheckId}">${escapeHtml(st.title)}</label>
        <button type="button" class="todo-subtask-item__remove" aria-label="항목 삭제">×</button>
      `;
      stEl.querySelector(".todo-subtask-item__check").addEventListener("change", () => toggleSubtask(todo.id, st.id));
      stEl.querySelector(".todo-subtask-item__remove").addEventListener("click", () => removeSubtask(todo.id, st.id));
      subtaskList.appendChild(stEl);
    });
    subtaskAddInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addSubtask(todo.id, subtaskAddInput.value.trim());
        subtaskAddInput.value = "";
      }
    });
    subtaskAddBtn.addEventListener("click", () => {
      addSubtask(todo.id, subtaskAddInput.value.trim());
      subtaskAddInput.value = "";
    });

    // 태그
    (todo.tags || []).forEach((tag) => {
      const pill = document.createElement("span");
      pill.className = "todo-item__tag";
      pill.innerHTML = `<span>${escapeHtml(tag)}</span><button type="button" class="todo-item__tag-remove" aria-label="태그 제거">×</button>`;
      pill.querySelector(".todo-item__tag-remove").addEventListener("click", () => removeTag(todo.id, tag));
      tagsContainer.appendChild(pill);
    });
    tagAddInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const v = tagAddInput.value.trim();
        if (v) addTag(todo.id, v);
        tagAddInput.value = "";
      }
    });
    tagAddBtn.addEventListener("click", () => {
      const v = tagAddInput.value.trim();
      if (v) addTag(todo.id, v);
      tagAddInput.value = "";
    });

    list.appendChild(node);
  });

  listEmpty.hidden = filtered.length > 0;
  listEmpty.textContent = currentFilter === "snoozed" ? "미룬 항목이 없습니다." : "할 일이 없습니다. 위에서 새로 추가해 보세요.";
  lastAddedTodoId = null;
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function startEdit(id) {
  const li = list.querySelector(`[data-id="${id}"]`);
  if (!li) return;
  const body = li.querySelector(".todo-item__body");
  const editInput = li.querySelector(".todo-item__edit");
  const row = li.querySelector(".todo-item__row");
  if (!body || !editInput || !row) return;
  body.hidden = true;
  li.querySelectorAll(".todo-item__row-actions").forEach((el) => { el.hidden = true; });
  editInput.hidden = false;
  editInput.value = li.querySelector(".todo-item__label")?.textContent ?? "";
  editInput.focus();
  editInput.select();
}

function commitEdit(id) {
  const li = list.querySelector(`[data-id="${id}"]`);
  if (!li) return;
  const body = li.querySelector(".todo-item__body");
  const label = li.querySelector(".todo-item__label");
  const editInput = li.querySelector(".todo-item__edit");
  if (!body || !label || !editInput) return;
  const title = editInput.value.trim();
  editInput.hidden = true;
  li.querySelectorAll(".todo-item__row-actions").forEach((el) => { el.hidden = false; });
  body.hidden = false;
  if (title) {
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      todo.title = title;
      label.textContent = title;
      saveTodos();
    }
  } else {
    label.textContent = todos.find((t) => t.id === id)?.title ?? "";
  }
}

function cancelEdit(id) {
  const li = list.querySelector(`[data-id="${id}"]`);
  if (!li) return;
  const body = li.querySelector(".todo-item__body");
  const editInput = li.querySelector(".todo-item__edit");
  if (!body || !editInput) return;
  editInput.value = li.querySelector(".todo-item__label")?.textContent ?? "";
  editInput.hidden = true;
  li.querySelectorAll(".todo-item__row-actions").forEach((el) => { el.hidden = false; });
  body.hidden = false;
  editInput.blur();
}

// ——— CRUD ———
function addTodo(title, dueDate = null, repeatDays = [], dueEndDate = null) {
  const t = title.trim();
  if (!t) return;
  const normalizedStart = dueDate || null;
  let normalizedEnd = dueEndDate || null;
  if (normalizedEnd && !normalizedStart) {
    normalizedEnd = null;
  }
  if (normalizedStart && !normalizedEnd) {
    normalizedEnd = normalizedStart;
  }
  if (normalizedStart && normalizedEnd && normalizedEnd < normalizedStart) {
    normalizedEnd = normalizedStart;
  }
  const todo = {
    id: nextId(),
    title: t,
    completed: false,
    createdAt: new Date().toISOString(),
    snoozeUntil: null,
    dueDate: normalizedStart,
    dueEndDate: normalizedEnd,
    repeatDays: Array.isArray(repeatDays) ? repeatDays : [],
    scheduleColor: null,
    subtasks: [],
    tags: [],
  };
  todos.unshift(todo);
  lastAddedTodoId = todo.id;
  saveTodos();
  if (currentFilter === "snoozed") setFilter("all");
  else renderList();
  input.value = "";
  pendingDueDate = null;
  pendingDueEndDate = null;
  pendingRepeatDays = [];
  input.focus();
}

function toggleComplete(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  const isRecurring = !!(todo.repeatDays && todo.repeatDays.length > 0);
  const { start, end } = getEffectiveDateRange(todo);
  const isRange = !!(start && end && start !== end);
  if (isRecurring || isRange) {
    const today = todayDateStr();
    todo.completedDates = todo.completedDates || [];
    if (todo.completedDates.includes(today)) {
      todo.completedDates = todo.completedDates.filter((d) => d !== today);
    } else {
      todo.completedDates.push(today);
      todo.completedDates.sort();
    }
  } else {
    todo.completed = !todo.completed;
  }
  saveTodos();
  renderList();
}

function removeTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;
  const moved = { ...todo, deletedAt: new Date().toISOString() };
  deletedTodos.unshift(moved);
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  saveTrash();
  renderList();
  if (currentFilter === "my") renderTrash();
}

function clearCompleted() {
  todos = todos.filter((t) => !t.completed);
  saveTodos();
  renderList();
}

// ——— 미루기 ———
function snoozeTomorrow(id) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const str = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.snoozeUntil = str;
    saveTodos();
    renderList();
  }
}

function snoozeUntilDate(id, dateStr) {
  const todo = todos.find((t) => t.id === id);
  if (todo && dateStr) {
    todo.snoozeUntil = dateStr;
    saveTodos();
    renderList();
  }
}

function unsnooze(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.snoozeUntil = null;
    saveTodos();
    renderList();
  }
}

// ——— 서브태스크 ———
function addSubtask(todoId, title) {
  const t = title.trim();
  if (!t) return;
  const todo = todos.find((x) => x.id === todoId);
  if (!todo) return;
  todo.subtasks = todo.subtasks || [];
  todo.subtasks.push({ id: nextSubtaskId(), title: t, completed: false });
  expandedPanelsByTodo[todoId] = expandedPanelsByTodo[todoId] || {};
  expandedPanelsByTodo[todoId].subtasks = false;
  saveTodos();
  renderList();
}

function removeSubtask(todoId, subtaskId) {
  const todo = todos.find((t) => t.id === todoId);
  if (!todo || !todo.subtasks) return;
  todo.subtasks = todo.subtasks.filter((st) => st.id !== subtaskId);
  saveTodos();
  renderList();
}

function toggleSubtask(todoId, subtaskId) {
  const todo = todos.find((t) => t.id === todoId);
  if (!todo || !todo.subtasks) return;
  const st = todo.subtasks.find((s) => s.id === subtaskId);
  if (st) {
    st.completed = !st.completed;
    if (todo.subtasks.length > 0 && todo.subtasks.every((s) => s.completed)) {
      todo.completed = true;
    }
    saveTodos();
    renderList();
  }
}

// ——— 태그 ———
function addTag(todoId, tag) {
  const t = (tag || "").trim();
  if (!t) return;
  const todo = todos.find((x) => x.id === todoId);
  if (!todo) return;
  todo.tags = todo.tags || [];
  const lower = t.toLowerCase();
  if (todo.tags.some((x) => x.toLowerCase() === lower)) return;
  todo.tags.push(t);
  expandedPanelsByTodo[todoId] = expandedPanelsByTodo[todoId] || {};
  expandedPanelsByTodo[todoId].tags = false;
  saveTodos();
  renderList();
}

function removeTag(todoId, tag) {
  const todo = todos.find((t) => t.id === todoId);
  if (!todo || !todo.tags) return;
  if (currentTagFilter === tag) currentTagFilter = null;
  todo.tags = todo.tags.filter((x) => x !== tag);
  saveTodos();
  renderList();
}

// ——— 필터 / 정렬 / 태그 필터 ———
function setFilter(filter) {
  currentFilter = filter;
  if (filter !== "my") trashOpen = false;
  filters.forEach((btn) => {
    const isActive = btn.dataset.filter === filter;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  renderList();
}

function setSort(sort) {
  if (sort !== "basic" && sort !== "newest" && sort !== "oldest") sort = "basic";
  currentSort = sort;
  if (sortSelect) sortSelect.value = sort;
  renderList();
}

function setTagFilter(tag) {
  currentTagFilter = tag;
  renderList();
}

function updatePrioritizeButton() {
  if (!prioritizeIncompleteBtn) return;
  prioritizeIncompleteBtn.textContent = prioritizeIncomplete ? "미완료 우선: ON" : "미완료 우선: OFF";
  prioritizeIncompleteBtn.setAttribute("aria-pressed", prioritizeIncomplete ? "true" : "false");
}

// ——— 이벤트 ———
if (form) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input) addTodo(input.value, pendingDueDate, pendingRepeatDays, pendingDueEndDate);
  });
}

// 날짜·반복 요일 모달 (요일은 배경 선택, 체크박스 없음)
if (datePickerBtn) {
  datePickerBtn.addEventListener("click", () => {
    if (datePickerModal) datePickerModal.hidden = false;
    if (datePickerInput) {
      datePickerInput.value = pendingDueDate || "";
      datePickerInput.min = todayDateStr();
    }
    if (datePickerEndInput) {
      datePickerEndInput.value = pendingDueEndDate || pendingDueDate || "";
      datePickerEndInput.min = datePickerInput?.value || todayDateStr();
    }
    $$(".date-picker__weekday").forEach((btn) => {
      const day = Number(btn.dataset.day);
      const sel = pendingRepeatDays.includes(day);
      btn.classList.toggle("is-selected", sel);
      btn.setAttribute("aria-pressed", String(sel));
    });
  });
}

// 날짜 입력칸 클릭 시 텍스트 입력 대신 달력 팝업
if (datePickerInput) {
  const openNativePicker = () => {
    if (typeof datePickerInput.showPicker === "function") {
      datePickerInput.showPicker();
    }
  };
  datePickerInput.addEventListener("click", openNativePicker);
  datePickerInput.addEventListener("change", () => {
    if (!datePickerEndInput) return;
    datePickerEndInput.min = datePickerInput.value || todayDateStr();
    if (datePickerEndInput.value && datePickerInput.value && datePickerEndInput.value < datePickerInput.value) {
      datePickerEndInput.value = datePickerInput.value;
    }
  });
}
if (datePickerEndInput) {
  const openEndPicker = () => {
    if (typeof datePickerEndInput.showPicker === "function") {
      datePickerEndInput.showPicker();
    }
  };
  datePickerEndInput.addEventListener("click", openEndPicker);
}
function closeDatePickerModal() {
  if (datePickerModal) datePickerModal.hidden = true;
}
datePickerModal?.addEventListener("click", (e) => {
  const btn = e.target.closest(".date-picker__weekday");
  if (btn) {
    const day = Number(btn.dataset.day);
    const idx = pendingRepeatDays.indexOf(day);
    if (idx >= 0) pendingRepeatDays.splice(idx, 1);
    else pendingRepeatDays.push(day);
    pendingRepeatDays.sort((a, b) => a - b);
    const sel = pendingRepeatDays.includes(day);
    btn.classList.toggle("is-selected", sel);
    btn.setAttribute("aria-pressed", String(sel));
  }
});
if (datePickerCancel) datePickerCancel.addEventListener("click", closeDatePickerModal);
if (datePickerOk) {
  datePickerOk.addEventListener("click", () => {
    let start = datePickerInput?.value || null;
    let end = datePickerEndInput?.value || null;
    if (end && !start) start = end;
    if (start && !end) end = start;
    if (start && end && end < start) {
      const tmp = start;
      start = end;
      end = tmp;
    }
    pendingDueDate = start;
    pendingDueEndDate = end;
    pendingRepeatDays = [];
    $$(".date-picker__weekday").forEach((btn) => {
      if (btn.classList.contains("is-selected")) pendingRepeatDays.push(Number(btn.dataset.day));
    });
    pendingRepeatDays.sort((a, b) => a - b);
    closeDatePickerModal();
    // 날짜/반복만 정했어도 확인 누르면 할 일 바로 추가 (입력란에 제목이 있을 때)
    const title = input?.value?.trim();
    if (title) {
      addTodo(title, pendingDueDate, pendingRepeatDays, pendingDueEndDate);
      if (input) input.value = "";
      pendingDueDate = null;
      pendingDueEndDate = null;
      pendingRepeatDays = [];
    }
  });
}
datePickerModal?.addEventListener("click", (e) => { if (e.target === datePickerModal) closeDatePickerModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && datePickerModal && !datePickerModal.hidden) closeDatePickerModal(); });

// 반복 막대 색상 모달 (확인/취소)
if (colorPickerCancel) colorPickerCancel.addEventListener("click", closeColorPickerModal);
if (colorPickerOk) {
  colorPickerOk.addEventListener("click", () => {
    if (!pendingColorTodoId || !colorPickerInput) {
      closeColorPickerModal();
      return;
    }
    const todo = todos.find((t) => t.id === pendingColorTodoId);
    if (todo && isHexColor(colorPickerInput.value)) {
      todo.scheduleColor = colorPickerInput.value;
      saveTodos();
      renderCalendar();
    }
    closeColorPickerModal();
  });
}
colorPickerModal?.addEventListener("click", (e) => { if (e.target === colorPickerModal) closeColorPickerModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && colorPickerModal && !colorPickerModal.hidden) closeColorPickerModal(); });

// 캘린더 이전/다음 달
if (calendarPrev) calendarPrev.addEventListener("click", () => { calendarCurrentMonth--; if (calendarCurrentMonth < 0) { calendarCurrentMonth = 11; calendarCurrentYear--; } renderCalendar(); });
if (calendarNext) calendarNext.addEventListener("click", () => { calendarCurrentMonth++; if (calendarCurrentMonth > 11) { calendarCurrentMonth = 0; calendarCurrentYear++; } renderCalendar(); });

// 휴지통 비우기
if (trashEmptyBtn) trashEmptyBtn.addEventListener("click", () => { showDeleteConfirmModal("휴지통을 비우시겠습니까? 삭제된 항목은 복구할 수 없습니다.", emptyTrash); });
if (trashToggleBtn) {
  trashToggleBtn.addEventListener("click", () => {
    trashOpen = !trashOpen;
    renderTrash();
  });
}

themeToggle?.addEventListener("click", toggleTheme);
filters.forEach((btn) => {
  btn.addEventListener("click", () => setFilter(btn.dataset.filter || "all"));
});
sortSelect?.addEventListener("change", (e) => setSort(e.target.value));
if (prioritizeIncompleteBtn) {
  prioritizeIncompleteBtn.addEventListener("click", () => {
    prioritizeIncomplete = !prioritizeIncomplete;
    updatePrioritizeButton();
    renderList();
  });
}

document.addEventListener("click", () => {
  if (!list) return;
  list.querySelectorAll(".todo-item__snooze-dropdown").forEach((d) => { d.hidden = true; });
  list.querySelectorAll(".todo-item__btn--snooze").forEach((b) => b.setAttribute("aria-expanded", "false"));
  list.querySelectorAll(".todo-item__snooze-date-wrap").forEach((w) => { w.hidden = true; });
});

if (calendarGrid) {
  calendarGrid.addEventListener("click", (e) => {
    const targetEl = e.target.closest(".calendar__bar--fill[data-todo-id], .calendar__task[data-todo-id]");
    if (!targetEl) return;
    const todoId = targetEl.dataset.todoId;
    if (!todoId) return;
    const todo = todos.find((t) => t.id === todoId);
    if (!todo) return;
    let targetDate = targetEl.dataset.date || "";
    if (!targetDate && targetEl.classList.contains("calendar__bar--fill")) {
      const weekStart = targetEl.dataset.weekStart;
      const startCol = Number(targetEl.dataset.startCol || "0");
      const span = Math.max(1, Number(targetEl.dataset.span || "1"));
      if (weekStart) {
        const rect = targetEl.getBoundingClientRect();
        const ratio = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
        const localCol = Math.min(span - 1, Math.max(0, Math.floor(ratio * span)));
        targetDate = addDaysDateStr(weekStart, startCol + localCol);
      }
    }
    if (!targetDate) return;
    let targetDatesAll = [targetDate];
    if (targetEl.classList.contains("calendar__bar--fill")) {
      const weekStart = targetEl.dataset.weekStart;
      const allStartCol = Number(targetEl.dataset.allStartCol || targetEl.dataset.startCol || "0");
      const allSpan = Math.max(1, Number(targetEl.dataset.allSpan || targetEl.dataset.span || "1"));
      if (weekStart) {
        targetDatesAll = Array.from({ length: allSpan }, (_, i) => addDaysDateStr(weekStart, allStartCol + i));
      }
    }
    const canSingle = !isOccurrenceDone(todo, targetDate);
    const canAll = targetDatesAll.length > 1 && targetDatesAll.some((d) => !isOccurrenceDone(todo, d));
    if (!canSingle && !canAll) return;
    showCalendarCompleteModal(todo, targetDate, targetDatesAll);
  });
}

// ——— 초기화 ———
loadTodos();
loadTrash();
if (sortSelect) sortSelect.value = currentSort;
updatePrioritizeButton();
renderList();
if (headerQuoteEl) headerQuoteEl.textContent = pickRandomQuote();
renderLucideIcons();
if (input) input.focus();

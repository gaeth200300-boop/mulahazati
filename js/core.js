/* ============================================================
   ملاحظاتي — النواة: التخزين، الأدوات، والتأكيدات
   ============================================================ */
"use strict";

const DB_KEY = "mulahazati.db.v1";
const SESSION_KEY = "mulahazati.session.v1";
const LAYOUT_KEY = "mulahazati.layout.v1";
const DB_VERSION = 1;
const MAX_TAGS = 8;
const VALID_COLORS = ["sage", "sand", "rose", "sky", "lilac"];
const DEFAULT_TITLE = "بدون عنوان";

const state = {
  db: null,
  user: null,
  scope: "all",
  tag: null,
  query: "",
  sort: "updated",
  layout: "grid",
  editor: null,
  openMenuId: null,
  emptyAction: "new",
  pendingConfirm: null,
  confirmReturnFocus: null
};

const els = {};

/* ============================================================
   أدوات عامة
   ============================================================ */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function cacheElements(map) {
  Object.keys(map).forEach((key) => {
    els[key] = document.querySelector(map[key]);
  });
}

function iconMarkup(name, className = "icon") {
  return `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
}

function escapeHTML(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (char) => entities[char]);
}

function arNum(value) {
  try {
    return Number(value).toLocaleString("ar-EG", { useGrouping: false });
  } catch {
    return String(value);
  }
}

function notesCountText(count) {
  if (count === 0) return "لا ملاحظات";
  if (count === 1) return "ملاحظة واحدة";
  if (count === 2) return "ملاحظتان";
  if (count >= 3 && count <= 10) return `${arNum(count)} ملاحظات`;
  return `${arNum(count)} ملاحظة`;
}

/* صيغة النصب بعد أفعال الحذف: «حذف ملاحظتين». */
function notesCountAccusative(count) {
  return count === 2 ? "ملاحظتين" : notesCountText(count);
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function getInitial(name) {
  const clean = String(name ?? "").trim();
  return clean ? Array.from(clean)[0] : "م";
}

function generateId(prefix) {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}_${window.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeColor(color) {
  return VALID_COLORS.includes(color) ? color : "sage";
}

function bytesToBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function generateSalt() {
  const bytes = new Uint8Array(16);
  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytesToBase64(bytes);
}

/* خيار احتياطي فقط للسياقات التي تمنع Web Crypto. */
function fallbackHash(password, salt) {
  const input = `${salt}|${password}|mulahazati-local`;
  let a = 0x811c9dc5;
  let b = 0x1000193;
  let c = 0x9e3779b9;
  let d = 0x85ebca6b;

  for (let round = 0; round < 1600; round += 1) {
    for (let i = 0; i < input.length; i += 1) {
      const code = input.charCodeAt(i);
      a = Math.imul(a ^ code, 0x01000193);
      b = Math.imul(b + code, 0x85ebca6b);
      c = Math.imul(c ^ (code + round), 0xc2b2ae35);
      d = Math.imul(d + (code ^ a), 0x27d4eb2f);
    }
  }

  const part = (num) => (num >>> 0).toString(16).padStart(8, "0");
  return `${part(a)}${part(b)}${part(c)}${part(d)}${part(a ^ d)}${part(b ^ c)}`;
}

/* PBKDF2-SHA256: تُحفظ كلمة المرور بصيغة مشتقة، لا كنص صريح. */
async function derivePasswordHash(password, salt, algorithm) {
  if (algorithm === "local-v1") {
    return fallbackHash(password, salt);
  }

  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("CRYPTO_UNAVAILABLE");
  }

  const encoder = new TextEncoder();
  const material = await window.crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: base64ToBytes(salt),
      iterations: 120000,
      hash: "SHA-256"
    },
    material,
    256
  );

  return bytesToBase64(new Uint8Array(bits));
}

async function createPasswordRecord(password) {
  const salt = generateSalt();
  const algorithm = window.crypto && window.crypto.subtle ? "pbkdf2-sha256" : "local-v1";
  const hash = await derivePasswordHash(password, salt, algorithm);
  return { hash, salt, algorithm };
}

async function verifyPasswordRecord(user, password) {
  if (!user || !user.password || !user.password.hash || !user.password.salt) return false;
  const algorithm = user.password.algorithm || "pbkdf2-sha256";
  const hash = await derivePasswordHash(password, user.password.salt, algorithm);
  return hash === user.password.hash;
}

/* ============================================================
   قاعدة البيانات المحلية
   ============================================================ */
function createEmptyDB() {
  return {
    version: DB_VERSION,
    createdAt: Date.now(),
    users: [],
    notesByUser: {}
  };
}

function readDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return createEmptyDB();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return createEmptyDB();
    if (!Array.isArray(parsed.users)) parsed.users = [];
    if (!parsed.notesByUser || typeof parsed.notesByUser !== "object") parsed.notesByUser = {};

    parsed.users = parsed.users.filter((user) => user && user.id && user.email && user.password);
    parsed.users.forEach((user) => {
      if (!Array.isArray(parsed.notesByUser[user.id])) parsed.notesByUser[user.id] = [];
    });

    return parsed;
  } catch (error) {
    console.error("تعذر قراءة قاعدة البيانات المحلية:", error);
    return createEmptyDB();
  }
}

function persistDB() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(state.db));
    return true;
  } catch (error) {
    console.error("تعذر حفظ البيانات:", error);
    showToast("تعذر حفظ البيانات. قد تكون مساحة التخزين ممتلئة.", "error");
    return false;
  }
}

function getUserNotes() {
  if (!state.user || !state.db) return [];
  if (!Array.isArray(state.db.notesByUser[state.user.id])) {
    state.db.notesByUser[state.user.id] = [];
  }
  return state.db.notesByUser[state.user.id];
}

function getActiveNotes() {
  return getUserNotes().filter((note) => !note.archived && !note.trashed);
}

function getTagStats(notes) {
  const map = new Map();
  notes.forEach((note) => {
    (Array.isArray(note.tags) ? note.tags : []).forEach((tag) => {
      const clean = String(tag || "").trim();
      if (!clean) return;
      const key = normalizeSearchText(clean);
      if (!key) return;
      if (map.has(key)) {
        map.get(key).count += 1;
      } else {
        map.set(key, { name: clean, count: 1 });
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.name.localeCompare(b.name, "ar");
  });
}

function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.userId ? parsed : null;
  } catch {
    return null;
  }
}

function storeSession(userId) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, createdAt: Date.now() }));
}

function clearStoredSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* تجاهل */
  }
}

/* ============================================================
   التواريخ
   ============================================================ */
const relativeDateFormatter = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });

function formatRelativeDate(timestamp) {
  if (!timestamp) return "—";
  const diff = Number(timestamp) - Date.now();
  const absolute = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absolute < 45 * 1000) return "الآن";
  if (absolute < hour) return relativeDateFormatter.format(Math.round(diff / minute), "minute");
  if (absolute < day) return relativeDateFormatter.format(Math.round(diff / hour), "hour");
  if (absolute < 7 * day) return relativeDateFormatter.format(Math.round(diff / day), "day");

  try {
    return new Date(timestamp).toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
}

function formatFullDate(timestamp) {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  } catch {
    return new Date(timestamp).toLocaleDateString();
  }
}

function formatDateTime(timestamp) {
  if (!timestamp) return "—";
  try {
    return new Date(timestamp).toLocaleString("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  } catch {
    return new Date(timestamp).toLocaleString();
  }
}

function getGreeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "صباح الخير" : "مساء الخير";
}

function updateDateLabel() {
  if (!els.dateLabel) return;
  try {
    els.dateLabel.textContent = new Date().toLocaleDateString("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
  } catch {
    els.dateLabel.textContent = new Date().toLocaleDateString();
  }
}

/* ============================================================
   واجهة التأكيد والتنبيهات
   ============================================================ */
function setBodyLock() {
  const sidebarOpen = !!(els.sidebar && els.sidebar.classList.contains("is-open"));
  const editorOpen = !!(els.editorModal && !els.editorModal.hidden);
  const confirmOpen = !!(els.confirmModal && !els.confirmModal.hidden);
  document.body.classList.toggle("no-scroll", sidebarOpen || editorOpen || confirmOpen);
}

function showToast(message, variant = "success") {
  if (!els.toastStack) return;
  const toast = document.createElement("div");
  toast.className = `toast${variant === "error" ? " is-error" : ""}`;
  toast.innerHTML = `<span class="toast-icon">${iconMarkup(variant === "error" ? "alert" : "check")}</span><span class="toast-message"></span>`;
  toast.querySelector(".toast-message").textContent = message;
  els.toastStack.appendChild(toast);

  while (els.toastStack.children.length > 3) {
    els.toastStack.removeChild(els.toastStack.firstElementChild);
  }

  window.setTimeout(() => {
    toast.classList.add("is-leaving");
    window.setTimeout(() => toast.remove(), 280);
  }, 3400);
}

function openConfirm(options) {
  const {
    title = "هل أنت متأكد؟",
    message = "لا يمكن التراجع عن هذا الإجراء.",
    confirmLabel = "تأكيد",
    icon = "alert",
    danger = true,
    onConfirm = null
  } = options || {};

  state.pendingConfirm = onConfirm;
  state.confirmReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

  if (!els.confirmModal) return;
  els.confirmTitle.textContent = title;
  els.confirmText.textContent = message;
  els.confirmOk.textContent = confirmLabel;
  els.confirmOk.className = `btn ${danger ? "btn-danger" : "btn-primary"}`;
  els.confirmIcon.classList.toggle("is-neutral", !danger);
  const iconUse = els.confirmIcon.querySelector("use");
  if (iconUse) iconUse.setAttribute("href", `#i-${icon}`);

  els.confirmModal.hidden = false;
  setBodyLock();
  window.setTimeout(() => {
    if (!els.confirmModal.hidden) els.confirmCancel.focus();
  }, 40);
}

function closeConfirm(restoreFocus = true) {
  if (!els.confirmModal || els.confirmModal.hidden) return;
  const returnFocus = state.confirmReturnFocus;
  els.confirmModal.hidden = true;
  state.pendingConfirm = null;
  state.confirmReturnFocus = null;
  setBodyLock();

  if (restoreFocus && returnFocus && returnFocus.isConnected) {
    window.setTimeout(() => returnFocus.focus(), 40);
  }
}

function bindConfirmEvents() {
  $$("[data-cancel-confirm]").forEach((button) => {
    button.addEventListener("click", () => closeConfirm(true));
  });

  if (els.confirmOk) {
    els.confirmOk.addEventListener("click", () => {
      const action = state.pendingConfirm;
      closeConfirm(false);
      if (typeof action === "function") action();
    });
  }
}

function setButtonLoading(button, loading) {
  if (!button) return;
  button.classList.toggle("is-loading", loading);
  button.disabled = loading;
  button.setAttribute("aria-busy", loading ? "true" : "false");
}

function setFormError(element, message) {
  if (!element) return;
  const text = element.querySelector("span");
  if (text) text.textContent = message;
  element.hidden = false;
}

function clearFormError(element) {
  if (!element) return;
  const text = element.querySelector("span");
  if (text) text.textContent = "";
  element.hidden = true;
}

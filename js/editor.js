/* ============================================================
   ملاحظاتي — محرر الملاحظات
   ============================================================ */
"use strict";

function bindEditorEvents() {
  $$("[data-close-editor]").forEach((button) => {
    button.addEventListener("click", requestCloseEditor);
  });

  $$("[data-save-note]").forEach((button) => {
    button.addEventListener("click", saveEditor);
  });

  if (els.noteTitle) {
    els.noteTitle.addEventListener("input", () => {
      syncEditorTextDirection();
      markEditorDirty();
    });
  }

  if (els.noteContent) {
    els.noteContent.addEventListener("input", () => {
      syncEditorTextDirection();
      markEditorDirty();
      updateWordCount();
    });
  }

  if (els.pinToggle) {
    els.pinToggle.addEventListener("click", () => {
      if (!state.editor) return;
      state.editor.pinned = !state.editor.pinned;
      syncEditorToggleUI();
      markEditorDirty();
    });
  }

  if (els.favoriteToggle) {
    els.favoriteToggle.addEventListener("click", () => {
      if (!state.editor) return;
      state.editor.favorite = !state.editor.favorite;
      syncEditorToggleUI();
      markEditorDirty();
    });
  }

  if (els.tagInput) {
    els.tagInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === "," || event.key === "،") {
        event.preventDefault();
        commitTagInput();
      } else if (event.key === "Backspace" && !els.tagInput.value && state.editor && state.editor.tags.length) {
        const tag = state.editor.tags[state.editor.tags.length - 1];
        removeEditorTag(tag);
      }
    });

    els.tagInput.addEventListener("input", markEditorDirty);
  }

  if (els.tagInputWrap) {
    els.tagInputWrap.addEventListener("click", (event) => {
      if (event.target.closest("[data-remove-tag]")) return;
      if (els.tagInput) els.tagInput.focus();
    });
  }

  if (els.editorTags) {
    els.editorTags.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-tag]");
      if (!button) return;
      removeEditorTag(button.dataset.removeTag);
    });
  }

  if (els.tagSuggestions) {
    els.tagSuggestions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-suggest-tag]");
      if (!button) return;
      addEditorTag(button.dataset.suggestTag);
    });
  }

  if (els.colorPicker) {
    els.colorPicker.addEventListener("click", (event) => {
      const button = event.target.closest("[data-color]");
      if (!button || !state.editor) return;
      state.editor.color = safeColor(button.dataset.color);
      syncEditorColorUI();
      markEditorDirty();
    });
  }

  if (els.editorDelete) {
    els.editorDelete.addEventListener("click", handleEditorDelete);
  }
}

function openEditor(noteId = null) {
  if (!state.user || !els.editorModal) return;
  if (!els.editorModal.hidden) return;

  closeCardMenus();
  closeProfilePopover();

  let note = null;
  if (noteId) {
    note = getUserNotes().find((item) => item.id === noteId);
    if (!note || note.trashed) return;
  }

  const tags = note && Array.isArray(note.tags) ? [...note.tags] : [];
  state.editor = {
    noteId: note ? note.id : null,
    isNew: !note,
    tags,
    color: safeColor(note ? note.color : "sage"),
    pinned: Boolean(note && note.pinned),
    favorite: Boolean(note && note.favorite),
    dirty: false,
    returnFocus: document.activeElement instanceof HTMLElement ? document.activeElement : null
  };

  els.noteTitle.value = note ? note.title || "" : "";
  els.noteContent.value = note ? note.content || "" : "";
  syncEditorTextDirection();
  els.tagInput.value = "";
  els.tagInput.disabled = false;
  els.editorHeading.textContent = note ? "تحرير الملاحظة" : "ملاحظة جديدة";
  els.editorDelete.hidden = !note;

  if (els.noteCreatedAt) {
    els.noteCreatedAt.textContent = note ? formatFullDate(note.createdAt) : "الآن";
  }
  if (els.noteUpdatedAt) {
    els.noteUpdatedAt.textContent = note ? formatFullDate(note.updatedAt) : "الآن";
  }

  setSaveStatus(note ? "محفوظة" : "مسودة جديدة", false);
  syncEditorToggleUI();
  syncEditorColorUI();
  renderEditorTags();
  renderTagSuggestions();
  updateWordCount();

  els.editorModal.hidden = false;
  setBodyLock();

  const canvas = els.editorModal.querySelector(".editor-canvas");
  if (canvas) canvas.scrollTop = 0;

  const isDesktop = window.matchMedia("(min-width: 761px)").matches;
  if (isDesktop) {
    const focusTarget = note ? els.noteContent : els.noteTitle;
    window.setTimeout(() => {
      if (!state.editor) return;
      focusTarget.focus();
      if (typeof focusTarget.setSelectionRange === "function") {
        const end = focusTarget.value.length;
        focusTarget.setSelectionRange(end, end);
      }
    }, 110);
  }
}

function requestCloseEditor() {
  if (!state.editor) return;

  if (!state.editor.dirty) {
    closeEditor({ restoreFocus: true });
    return;
  }

  openConfirm({
    title: "تجاهل التغييرات؟",
    message: "لديك تغييرات غير محفوظة في هذه الملاحظة. إذا أغلقت المحرر الآن، ستفقد هذه التغييرات.",
    confirmLabel: "تجاهل وإغلاق",
    icon: "alert",
    danger: true,
    onConfirm: () => closeEditor({ restoreFocus: true })
  });
}

function closeEditor(options = {}) {
  const { restoreFocus = true } = options;
  const returnFocus = state.editor ? state.editor.returnFocus : null;

  state.editor = null;
  if (els.editorModal) els.editorModal.hidden = true;
  if (els.tagInput) els.tagInput.value = "";
  if (els.editorTags) els.editorTags.replaceChildren();
  if (els.tagSuggestions) {
    els.tagSuggestions.replaceChildren();
    els.tagSuggestions.hidden = true;
  }

  setBodyLock();

  if (restoreFocus && returnFocus && returnFocus.isConnected) {
    window.setTimeout(() => returnFocus.focus(), 40);
  }
}

/* الحقول الفارغة تبقى RTL كي يظهر النص الإرشادي والمؤشر من جهة اليمين. */
function syncEditorTextDirection() {
  [els.noteTitle, els.noteContent].forEach((field) => {
    if (!field) return;
    field.setAttribute("dir", field.value.trim() ? "auto" : "rtl");
  });
}

function markEditorDirty() {
  if (!state.editor) return;
  if (!state.editor.dirty) {
    state.editor.dirty = true;
  }
  setSaveStatus("تغييرات غير محفوظة", true);
}

function setSaveStatus(text, dirty) {
  if (els.saveStatus) els.saveStatus.textContent = text;
  if (els.saveDot) els.saveDot.classList.toggle("is-dirty", Boolean(dirty));
}

function syncEditorToggleUI() {
  if (!state.editor) return;

  if (els.pinToggle) {
    els.pinToggle.setAttribute("aria-pressed", state.editor.pinned ? "true" : "false");
    els.pinToggle.setAttribute("aria-label", state.editor.pinned ? "إلغاء تثبيت الملاحظة" : "تثبيت الملاحظة");
    els.pinToggle.title = state.editor.pinned ? "إلغاء التثبيت" : "تثبيت";
  }

  if (els.favoriteToggle) {
    els.favoriteToggle.setAttribute(
      "aria-pressed",
      state.editor.favorite ? "true" : "false"
    );
    els.favoriteToggle.setAttribute(
      "aria-label",
      state.editor.favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"
    );
    els.favoriteToggle.title = state.editor.favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة";
  }
}

function syncEditorColorUI() {
  if (!state.editor || !els.colorPicker) return;
  $$(".color-swatch[data-color]", els.colorPicker).forEach((button) => {
    button.setAttribute("aria-pressed", button.dataset.color === state.editor.color ? "true" : "false");
  });
}

function renderEditorTags() {
  if (!els.editorTags || !state.editor) return;

  els.editorTags.innerHTML = state.editor.tags
    .map(
      (tag) => `
        <span class="editor-tag">
          <span dir="auto">${escapeHTML(tag)}</span>
          <button type="button" data-remove-tag="${escapeHTML(tag)}" aria-label="إزالة وسم ${escapeHTML(tag)}">
            ${iconMarkup("close")}
          </button>
        </span>
      `
    )
    .join("");

  if (els.tagInput) {
    const full = state.editor.tags.length >= MAX_TAGS;
    els.tagInput.disabled = full;
    els.tagInput.placeholder = full ? "بلغت الحد الأقصى" : state.editor.tags.length ? "أضف وسمًا..." : "أضف وسمًا...";
  }

  renderTagSuggestions();
}

function commitTagInput() {
  if (!state.editor || !els.tagInput) return;
  const raw = els.tagInput.value;
  if (!raw.trim()) return;

  raw.split(/[,،]/).forEach((part) => {
    addEditorTag(part, { render: false, clearInput: false });
  });

  els.tagInput.value = "";
  renderEditorTags();
  if (state.editor.tags.length < MAX_TAGS) els.tagInput.focus();
}

function addEditorTag(rawTag, options = {}) {
  const { render = true, clearInput = true } = options;
  if (!state.editor) return false;

  if (state.editor.tags.length >= MAX_TAGS) {
    showToast(`يمكنك إضافة ${arNum(MAX_TAGS)} وسوم كحد أقصى.`, "error");
    return false;
  }

  const clean = String(rawTag || "")
    .replace(/^#+/, "")
    .replace(/[,،]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);

  if (!clean) return false;

  const key = normalizeSearchText(clean);
  const duplicate = state.editor.tags.some((tag) => normalizeSearchText(tag) === key);
  if (duplicate) {
    if (clearInput && els.tagInput) els.tagInput.value = "";
    return false;
  }

  state.editor.tags.push(clean);
  if (els.tagInput && clearInput) {
    els.tagInput.value = "";
    els.tagInput.focus();
  }
  markEditorDirty();
  if (render) renderEditorTags();
  return true;
}

function removeEditorTag(tag) {
  if (!state.editor) return;
  const key = normalizeSearchText(tag);
  state.editor.tags = state.editor.tags.filter((item) => normalizeSearchText(item) !== key);
  renderEditorTags();
  markEditorDirty();
  if (els.tagInput && !els.tagInput.disabled) els.tagInput.focus();
}

function renderTagSuggestions() {
  if (!els.tagSuggestions || !state.editor) return;

  if (state.editor.tags.length >= MAX_TAGS) {
    els.tagSuggestions.replaceChildren();
    els.tagSuggestions.hidden = true;
    return;
  }

  const currentKeys = new Set(state.editor.tags.map((tag) => normalizeSearchText(tag)));
  const suggestions = getTagStats(getActiveNotes())
    .map((tag) => tag.name)
    .filter((tag) => !currentKeys.has(normalizeSearchText(tag)))
    .slice(0, 8);

  if (!suggestions.length) {
    els.tagSuggestions.replaceChildren();
    els.tagSuggestions.hidden = true;
    return;
  }

  els.tagSuggestions.hidden = false;
  els.tagSuggestions.innerHTML = suggestions
    .map(
      (tag) =>
        `<button type="button" class="tag-suggestion" data-suggest-tag="${escapeHTML(tag)}">${escapeHTML(tag)}</button>`
    )
    .join("");
}

function updateWordCount() {
  if (!els.wordCount || !els.noteContent) return;
  const text = els.noteContent.value.trim();
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;

  let label;
  if (wordCount === 0) label = `${arNum(0)} كلمة`;
  else if (wordCount === 1) label = "كلمة واحدة";
  else if (wordCount === 2) label = "كلمتان";
  else if (wordCount <= 10) label = `${arNum(wordCount)} كلمات`;
  else label = `${arNum(wordCount)} كلمة`;

  els.wordCount.textContent = label;
}

function saveEditor() {
  if (!state.editor) return;

  if (els.tagInput && els.tagInput.value.trim()) {
    commitTagInput();
  }

  const title = String(els.noteTitle.value || "").trim();
  const content = String(els.noteContent.value || "").trim();

  if (!title && !content) {
    showToast("أضف عنوانًا أو نصًا قبل حفظ الملاحظة.", "error");
    els.noteTitle.focus();
    return;
  }

  const finalTitle = title || DEFAULT_TITLE;
  const tags = [...state.editor.tags];
  const color = safeColor(state.editor.color);
  const pinned = Boolean(state.editor.pinned);
  const favorite = Boolean(state.editor.favorite);
  const now = Date.now();
  const isNew = state.editor.isNew;
  const noteId = state.editor.noteId;
  const notes = getUserNotes();
  let nextNotes;

  if (isNew) {
    const newNote = {
      id: generateId("note"),
      title: finalTitle,
      content,
      tags,
      color,
      pinned,
      favorite,
      archived: false,
      trashed: false,
      trashedAt: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now
    };
    nextNotes = [newNote, ...notes];
  } else {
    const existingIndex = notes.findIndex((note) => note.id === noteId);
    if (existingIndex === -1) {
      showToast("لم تعد هذه الملاحظة موجودة.", "error");
      closeEditor({ restoreFocus: false });
      renderAll();
      return;
    }

    nextNotes = notes.map((note) =>
      note.id === noteId
        ? {
            ...note,
            title: finalTitle,
            content,
            tags,
            color,
            pinned,
            favorite,
            updatedAt: now
          }
        : note
    );
  }

  if (!commitNotes(nextNotes)) return;

  closeEditor({ restoreFocus: false });

  if (isNew) {
    state.scope = "all";
    state.tag = null;
    state.query = "";
    if (els.searchInput) els.searchInput.value = "";
    if (els.sortSelect) state.sort = els.sortSelect.value;
  }

  renderAll();
  showToast(isNew ? "تم إنشاء الملاحظة." : "تم حفظ التغييرات.");
}

function handleEditorDelete() {
  if (!state.editor || state.editor.isNew || !state.editor.noteId) return;

  const noteId = state.editor.noteId;
  const note = getUserNotes().find((item) => item.id === noteId);
  if (!note) return;

  openConfirm({
    title: "نقل الملاحظة إلى المهملات؟",
    message: "ستبقى الملاحظة في المهملات ويمكنك استعادتها لاحقًا قبل حذفها نهائيًا.",
    confirmLabel: "نقل إلى المهملات",
    icon: "trash",
    danger: true,
    onConfirm: () => {
      const nextNotes = getUserNotes().map((item) =>
        item.id === noteId
          ? {
              ...item,
              trashed: true,
              trashedAt: Date.now(),
              archived: false,
              archivedAt: null
            }
          : item
      );

      if (!commitNotes(nextNotes)) return;
      closeEditor({ restoreFocus: false });
      renderAll();
      showToast("تم نقل الملاحظة إلى المهملات.");
    }
  });
}

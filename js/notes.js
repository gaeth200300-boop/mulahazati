/* ============================================================
   ملاحظاتي — عرض الملاحظات، البحث، وأدوات المساحة
   ============================================================ */
"use strict";

const SCOPE_NAMES = {
  all: "كل الملاحظات",
  favorites: "المفضلة",
  pinned: "المثبتة",
  archive: "الأرشيف",
  trash: "المهملات"
};

function createStarterNotes() {
  const now = Date.now();

  return [
    {
      id: generateId("note"),
      title: "أهلًا بك في ملاحظاتي",
      content:
        "هذه مساحتك الخاصة للأفكار.\n\nيمكنك إنشاء ملاحظة جديدة، تثبيت المهم منها في الأعلى، أو إضافتها إلى المفضلة.\n\nكل ما تكتبه هنا مرتبط بحسابك وحدك.",
      tags: ["ابدأ هنا"],
      color: "sage",
      pinned: true,
      favorite: true,
      archived: false,
      trashed: false,
      createdAt: now - 2 * 60 * 1000,
      updatedAt: now - 2 * 60 * 1000
    },
    {
      id: generateId("note"),
      title: "أفكار هذا الأسبوع",
      content:
        "• ترتيب أولويات المشروع الجديد\n• قراءة ٣٠ صفحة يوميًا\n• تخصيص ساعة للإبداع بعيدًا عن المقاطعات\n• مراجعة ما أنجزته يوم الجمعة",
      tags: ["أفكار", "تخطيط"],
      color: "sand",
      pinned: false,
      favorite: false,
      archived: false,
      trashed: false,
      createdAt: now - 20 * 60 * 60 * 1000,
      updatedAt: now - 20 * 60 * 60 * 1000
    },
    {
      id: generateId("note"),
      title: "قائمة قراءة قصيرة",
      content:
        "كتب تستحق العودة إليها:\n\n١. العادات الذرية\n٢. فن اللامبالاة\n٣. التفكير السريع والبطيء",
      tags: ["تطوير", "قراءة"],
      color: "sky",
      pinned: false,
      favorite: false,
      archived: false,
      trashed: false,
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
      updatedAt: now - 3 * 24 * 60 * 60 * 1000
    }
  ];
}

/* ============================================================
   ربط الأحداث
   ============================================================ */
function bindNotesEvents() {
  $$('[data-action="new-note"]:not(#emptyAction)').forEach((button) => {
    button.addEventListener("click", () => openEditor());
  });

  $$(".nav-item[data-scope]").forEach((button) => {
    button.addEventListener("click", () => setScope(button.dataset.scope));
  });

  $$(".filter-tab[data-scope]").forEach((button) => {
    button.addEventListener("click", () => setScope(button.dataset.scope));
  });

  if (els.sidebarTags) {
    els.sidebarTags.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tag]");
      if (!button) return;
      setTag(button.dataset.tag);
    });
  }

  if (els.searchInput) {
    els.searchInput.addEventListener("input", () => {
      state.query = els.searchInput.value.trim();
      renderNotes();
    });
    els.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        clearSearch();
      }
    });
  }

  if (els.clearSearch) {
    els.clearSearch.addEventListener("click", clearSearch);
  }

  if (els.sortSelect) {
    els.sortSelect.addEventListener("change", () => {
      state.sort = els.sortSelect.value;
      renderNotes();
    });
  }

  $$(".layout-btn[data-layout]").forEach((button) => {
    button.addEventListener("click", () => setLayout(button.dataset.layout));
  });

  if (els.notesContainer) {
    els.notesContainer.addEventListener("click", handleNotesContainerClick);
    els.notesContainer.addEventListener("keydown", handleNotesContainerKeydown);
  }

  if (els.emptyAction) {
    els.emptyAction.addEventListener("click", handleEmptyAction);
  }

  if (els.emptyTrashButton) {
    els.emptyTrashButton.addEventListener("click", emptyTrash);
  }

  if (els.emptyTrashButton && !els.emptyTrashButton.querySelector("svg")) {
    els.emptyTrashButton.textContent = "إفراغ المهملات";
  }

  if (els.profileButton) {
    els.profileButton.addEventListener("click", () => {
      if (els.profilePopover && els.profilePopover.hidden) openProfilePopover();
      else closeProfilePopover();
    });
  }

  if (els.logoutButton) {
    els.logoutButton.addEventListener("click", logoutCurrentUser);
  }

  if (els.menuButton) {
    els.menuButton.addEventListener("click", openSidebar);
  }

  if (els.closeSidebar) {
    els.closeSidebar.addEventListener("click", closeSidebar);
  }

  if (els.sidebarOverlay) {
    els.sidebarOverlay.addEventListener("click", closeSidebar);
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".profile-area")) closeProfilePopover();
    if (!event.target.closest(".card-menu") && !event.target.closest(".card-menu-btn")) {
      closeCardMenus();
    }
  });

  const mobileQuery = window.matchMedia("(max-width: 960px)");
  const handleViewportChange = () => {
    if (!mobileQuery.matches) {
      closeSidebar();
      closeCardMenus();
    }
  };

  if (typeof mobileQuery.addEventListener === "function") {
    mobileQuery.addEventListener("change", handleViewportChange);
  } else if (typeof mobileQuery.addListener === "function") {
    mobileQuery.addListener(handleViewportChange);
  }

  window.addEventListener("resize", closeCardMenus);
}

function openSidebar() {
  if (!els.sidebar) return;
  els.sidebar.classList.add("is-open");
  if (els.sidebarOverlay) els.sidebarOverlay.hidden = false;
  closeProfilePopover();
  setBodyLock();
}

function closeSidebar() {
  if (!els.sidebar) return;
  els.sidebar.classList.remove("is-open");
  if (els.sidebarOverlay) els.sidebarOverlay.hidden = true;
  setBodyLock();
}

function openProfilePopover() {
  if (!els.profilePopover || !els.profileButton) return;
  els.profilePopover.hidden = false;
  els.profileButton.setAttribute("aria-expanded", "true");
}

function closeProfilePopover() {
  if (!els.profilePopover) return;
  els.profilePopover.hidden = true;
  if (els.profileButton) els.profileButton.setAttribute("aria-expanded", "false");
}

/* ============================================================
   التنقل والتصفية
   ============================================================ */
function setScope(scope) {
  if (!Object.prototype.hasOwnProperty.call(SCOPE_NAMES, scope)) return;
  state.scope = scope;
  state.tag = null;
  closeCardMenus();
  closeProfilePopover();
  renderAll();
  if (window.matchMedia("(max-width: 960px)").matches) closeSidebar();
}

function setTag(tag) {
  const value = String(tag || "").trim();
  if (!value) return;
  if (state.tag && normalizeSearchText(state.tag) === normalizeSearchText(value)) {
    state.tag = null;
  } else {
    state.tag = value;
    state.scope = "all";
  }
  closeCardMenus();
  closeProfilePopover();
  renderAll();
  if (window.matchMedia("(max-width: 960px)").matches) closeSidebar();
}

function setSort(sort) {
  if (!["updated", "created", "title"].includes(sort)) return;
  state.sort = sort;
  if (els.sortSelect) els.sortSelect.value = sort;
  renderNotes();
}

function setLayout(layout) {
  if (!["grid", "list"].includes(layout)) return;
  state.layout = layout;
  try {
    localStorage.setItem(LAYOUT_KEY, layout);
  } catch {
    /* تجاهل */
  }
  updateLayoutUI();
}

function updateLayoutUI() {
  if (!els.notesContainer) return;
  els.notesContainer.classList.toggle("is-list", state.layout === "list");
  $$(".layout-btn[data-layout]").forEach((button) => {
    const active = button.dataset.layout === state.layout;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function clearSearch() {
  state.query = "";
  if (els.searchInput) els.searchInput.value = "";
  renderNotes();
  if (els.searchInput) els.searchInput.focus();
}

/* ============================================================
   التصفية والفرز
   ============================================================ */
function getFilteredNotes() {
  const notes = getUserNotes();
  let scoped;

  switch (state.scope) {
    case "favorites":
      scoped = notes.filter((note) => !note.archived && !note.trashed && note.favorite);
      break;
    case "pinned":
      scoped = notes.filter((note) => !note.archived && !note.trashed && note.pinned);
      break;
    case "archive":
      scoped = notes.filter((note) => note.archived && !note.trashed);
      break;
    case "trash":
      scoped = notes.filter((note) => note.trashed);
      break;
    default:
      scoped = notes.filter((note) => !note.archived && !note.trashed);
  }

  if (state.tag) {
    const tagKey = normalizeSearchText(state.tag);
    scoped = scoped.filter((note) =>
      (Array.isArray(note.tags) ? note.tags : []).some((tag) => normalizeSearchText(tag) === tagKey)
    );
  }

  if (state.query) {
    const query = normalizeSearchText(state.query);
    scoped = scoped.filter((note) => {
      const searchable = normalizeSearchText(
        `${note.title || ""} ${note.content || ""} ${(note.tags || []).join(" ")}`
      );
      return searchable.includes(query);
    });
  }

  return sortNotes(scoped);
}

function sortNotes(notes) {
  const sorted = [...notes];
  const prioritizePinned = state.scope !== "archive" && state.scope !== "trash";

  sorted.sort((a, b) => {
    if (prioritizePinned && Boolean(a.pinned) !== Boolean(b.pinned)) {
      return a.pinned ? -1 : 1;
    }

    if (state.sort === "title") {
      return String(a.title || DEFAULT_TITLE).localeCompare(String(b.title || DEFAULT_TITLE), "ar", {
        sensitivity: "base"
      });
    }

    const field = state.sort === "created" ? "createdAt" : "updatedAt";
    return (Number(b[field]) || 0) - (Number(a[field]) || 0);
  });

  return sorted;
}

/* ============================================================
   العرض
   ============================================================ */
function renderAll() {
  if (!state.user) return;
  closeCardMenus();
  renderCountsAndTags();
  updateWelcomeMessage(false);
  renderNotes();
  updateProfileUI();
}

function renderCountsAndTags() {
  const notes = getUserNotes();
  const active = notes.filter((note) => !note.archived && !note.trashed);
  const favorites = active.filter((note) => note.favorite);
  const pinned = active.filter((note) => note.pinned);
  const archived = notes.filter((note) => note.archived && !note.trashed);
  const trashed = notes.filter((note) => note.trashed);
  const tags = getTagStats(active);

  if (els.countAll) els.countAll.textContent = arNum(active.length);
  if (els.countFavorites) els.countFavorites.textContent = arNum(favorites.length);
  if (els.countPinned) els.countPinned.textContent = arNum(pinned.length);
  if (els.countArchived) els.countArchived.textContent = arNum(archived.length);
  if (els.countTrash) els.countTrash.textContent = arNum(trashed.length);
  if (els.tagCount) els.tagCount.textContent = arNum(tags.length);

  $$(".nav-item[data-scope]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.scope === state.scope);
  });

  $$(".filter-tab[data-scope]").forEach((button) => {
    const active = button.dataset.scope === state.scope;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });

  renderSidebarTags(tags);
}

function renderSidebarTags(tags) {
  if (!els.sidebarTags) return;

  if (!tags.length) {
    els.sidebarTags.innerHTML =
      '<p class="sidebar-empty-tags">ستظهر وسومك هنا بعد إضافتها إلى ملاحظاتك.</p>';
    return;
  }

  els.sidebarTags.innerHTML = tags
    .map((tag) => {
      const active = state.tag && normalizeSearchText(state.tag) === normalizeSearchText(tag.name);
      return `
        <button type="button" class="tag-item${active ? " is-active" : ""}" data-tag="${escapeHTML(tag.name)}" aria-pressed="${active ? "true" : "false"}">
          <span class="tag-hash">#</span>
          <span class="tag-name">${escapeHTML(tag.name)}</span>
          <span class="tag-number">${arNum(tag.count)}</span>
        </button>
      `;
    })
    .join("");
}

function renderNotes() {
  if (!state.user || !els.notesContainer) return;

  const filtered = getFilteredNotes();
  const count = filtered.length;
  const scopeName = SCOPE_NAMES[state.scope] || "الملاحظات";
  const trashCount = getUserNotes().filter((note) => note.trashed).length;

  if (els.resultsLabel) {
    if (state.query) {
      els.resultsLabel.textContent = `نتائج البحث · ${notesCountText(count)}`;
    } else if (state.tag) {
      els.resultsLabel.textContent = `#${state.tag} · ${notesCountText(count)}`;
    } else {
      els.resultsLabel.textContent = `${scopeName} · ${notesCountText(count)}`;
    }
  }

  if (els.clearSearch) els.clearSearch.hidden = !state.query;
  if (els.emptyTrashButton) {
    els.emptyTrashButton.hidden = !(state.scope === "trash" && trashCount > 0);
  }

  updateLayoutUI();

  if (!count) {
    els.notesContainer.replaceChildren();
    els.notesContainer.hidden = true;
    if (els.emptyState) els.emptyState.hidden = false;
    updateEmptyState();
    return;
  }

  if (els.emptyState) els.emptyState.hidden = true;
  els.notesContainer.hidden = false;
  els.notesContainer.innerHTML = filtered.map((note, index) => buildNoteCard(note, index)).join("");
}

function buildNoteCard(note, index) {
  const noteId = escapeHTML(note.id);
  const title = String(note.title || "").trim() || DEFAULT_TITLE;
  const content = String(note.content || "").trim();
  const excerpt = content || "لا يوجد نص إضافي بعد.";
  const tags = (Array.isArray(note.tags) ? note.tags : [])
    .map((tag) => String(tag || "").trim())
    .filter(Boolean);
  const visibleTags = tags.slice(0, 3);
  const extraTags = tags.length - visibleTags.length;
  const color = safeColor(note.color);
  const trashed = Boolean(note.trashed);
  const archived = Boolean(note.archived);
  const favorite = Boolean(note.favorite);
  const pinned = Boolean(note.pinned);
  const dateStamp = note.updatedAt || note.createdAt;
  const relativeDate = formatRelativeDate(dateStamp);
  const fullDate = escapeHTML(formatDateTime(dateStamp));

  let statuses = "";
  if (trashed) {
    statuses += `<span class="status-pin">${iconMarkup("trash")} في المهملات</span>`;
  } else {
    if (archived) {
      statuses += `<span class="status-pin">${iconMarkup("archive")} مؤرشفة</span>`;
    }
    if (pinned) {
      statuses += `<span class="status-pin">${iconMarkup("pin")} مثبتة</span>`;
    }
    if (favorite) {
      statuses += `<span class="status-star" role="img" title="في المفضلة" aria-label="في المفضلة">${iconMarkup("star")}</span>`;
    }
    if (!archived && !pinned && !favorite) {
      statuses += '<span class="card-color-dot" aria-hidden="true"></span>';
    }
  }

  const tagsMarkup = visibleTags.length
    ? `<div class="card-tags">${visibleTags
        .map((tag) => `<span class="card-tag">${escapeHTML(tag)}</span>`)
        .join("")}${extraTags > 0 ? `<span class="card-tag-more">+${arNum(extraTags)}</span>` : ""}</div>`
    : "";

  const tabIndex = trashed ? "" : 'tabindex="0"';
  const ariaLabel = trashed
    ? `ملاحظة في المهملات: ${title}`
    : `فتح الملاحظة: ${title}`;

  return `
    <article class="note-card${trashed ? " is-trashed" : ""}" data-note-id="${noteId}" data-color="${color}" ${tabIndex} style="--delay:${Math.min(index * 35, 280)}ms" aria-label="${escapeHTML(ariaLabel)}">
      <div class="card-top">
        <div class="card-status">${statuses}</div>
        <button type="button" class="card-menu-btn" data-menu-toggle="${noteId}" aria-label="خيارات الملاحظة" aria-haspopup="menu" aria-expanded="false">
          ${iconMarkup("more")}
        </button>
      </div>

      <h3 class="card-title" dir="auto">${escapeHTML(title)}</h3>
      <p class="card-excerpt${content ? "" : " is-empty"}" dir="auto">${escapeHTML(excerpt)}</p>
      ${tagsMarkup}

      <div class="card-foot">
        <span class="card-date" title="${fullDate}">
          ${iconMarkup("clock")}
          <time datetime="${new Date(dateStamp).toISOString()}">${escapeHTML(relativeDate)}</time>
        </span>
        <button type="button" class="card-fav${favorite ? " is-active" : ""}" data-favorite="${noteId}" aria-pressed="${favorite ? "true" : "false"}" aria-label="${favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}" title="${favorite ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}">
          ${iconMarkup("star")}
        </button>
      </div>
    </article>
  `;
}

function updateEmptyState() {
  if (!els.emptyTitle || !els.emptyText || !els.emptyAction) return;

  let title = "لا توجد ملاحظات بعد";
  let text = "ابدأ بكتابة فكرتك الأولى، وستجد هنا المكان الذي تعود إليه دائمًا.";
  let button = null;

  if (state.query) {
    title = "لم نجد ما تبحث عنه";
    text = `لا توجد ملاحظات تطابق «${state.query}». جرّب كلمات أخرى أو امسح البحث.`;
    button = { label: "مسح البحث", icon: "close", action: "clear-search" };
  } else if (state.tag) {
    title = "لا توجد ملاحظات بهذا الوسم";
    text = `لم نعثر على ملاحظات تحمل وسم «${state.tag}». يمكنك اختيار وسم آخر أو عرض كل ملاحظاتك.`;
    button = { label: "عرض كل الملاحظات", icon: "grid", action: "show-all" };
  } else if (state.scope === "favorites") {
    title = "قائمة المفضلة فارغة";
    text = "اضغط على النجمة بجانب أي ملاحظة لتظهر هنا، وتبقى قريبة منك دائمًا.";
    button = { label: "استكشف ملاحظاتك", icon: "notes", action: "show-all" };
  } else if (state.scope === "pinned") {
    title = "لا توجد ملاحظات مثبتة";
    text = "ثبّت الملاحظات الأهم لتظل في مقدمة مساحتك. افتح قائمة الملاحظة واختر «تثبيت».";
    button = { label: "عرض كل الملاحظات", icon: "notes", action: "show-all" };
  } else if (state.scope === "archive") {
    title = "أرشيفك فارغ";
    text = "عندما تنتهي من ملاحظة وتبقى قيمتها، أرشفها لتبقى محفوظة بعيدًا عن قائمتك اليومية.";
    button = { label: "العودة إلى ملاحظاتك", icon: "notes", action: "show-all" };
  } else if (state.scope === "trash") {
    title = "المهملات فارغة";
    text = "الملاحظات التي تنقلها إلى المهملات ستظهر هنا، ويمكنك استعادتها قبل حذفها نهائيًا.";
    button = { label: "العودة إلى ملاحظاتك", icon: "notes", action: "show-all" };
  } else {
    button = { label: "أنشئ ملاحظتك الأولى", icon: "plus", action: "new" };
  }

  els.emptyTitle.textContent = title;
  els.emptyText.textContent = text;

  if (button) {
    els.emptyAction.hidden = false;
    els.emptyAction.dataset.action = "new-note";
    state.emptyAction = button.action;
    const use = els.emptyAction.querySelector("use");
    const label = els.emptyAction.querySelector("span");
    if (use) use.setAttribute("href", `#i-${button.icon}`);
    if (label) label.textContent = button.label;
  } else {
    els.emptyAction.hidden = true;
  }
}

function handleEmptyAction() {
  if (state.emptyAction === "clear-search") {
    clearSearch();
    return;
  }
  if (state.emptyAction === "show-all") {
    state.scope = "all";
    state.tag = null;
    closeCardMenus();
    renderAll();
    return;
  }
  openEditor();
}

/* ============================================================
   قوائم البطاقات
   ============================================================ */
function handleNotesContainerClick(event) {
  const menuButton = event.target.closest("[data-menu-toggle]");
  if (menuButton) {
    event.preventDefault();
    toggleCardMenu(menuButton.dataset.menuToggle, menuButton);
    return;
  }

  const actionButton = event.target.closest("[data-card-action]");
  if (actionButton) {
    event.preventDefault();
    handleCardAction(actionButton.dataset.cardAction, actionButton.dataset.cardNote);
    return;
  }

  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    event.preventDefault();
    toggleFavorite(favoriteButton.dataset.favorite);
    return;
  }

  const card = event.target.closest(".note-card");
  if (card && !event.target.closest("button") && !event.target.closest(".card-menu")) {
    const note = getUserNotes().find((item) => item.id === card.dataset.noteId);
    if (!note) return;
    if (note.trashed) return;
    openEditor(note.id);
  }
}

function handleNotesContainerKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".note-card");
  if (!card || event.target !== card) return;
  event.preventDefault();
  const note = getUserNotes().find((item) => item.id === card.dataset.noteId);
  if (!note || note.trashed) return;
  openEditor(note.id);
}

function toggleCardMenu(noteId, button) {
  if (state.openMenuId === noteId) {
    closeCardMenus();
    return;
  }

  closeCardMenus();
  const note = getUserNotes().find((item) => item.id === noteId);
  const card = button.closest(".note-card");
  if (!note || !card) return;

  const menu = document.createElement("div");
  menu.className = "card-menu";
  menu.id = `note-menu-${noteId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", "خيارات الملاحظة");
  menu.innerHTML = getCardMenuMarkup(note);
  card.appendChild(menu);
  card.classList.add("menu-open");
  button.setAttribute("aria-expanded", "true");
  button.setAttribute("aria-controls", menu.id);
  state.openMenuId = noteId;

  const firstItem = menu.querySelector(".menu-item");
  if (firstItem) {
    window.setTimeout(() => {
      if (state.openMenuId === noteId) firstItem.focus();
    }, 30);
  }
}

function getCardMenuMarkup(note) {
  const id = escapeHTML(note.id);
  const item = (action, icon, label, danger = false) =>
    `<button type="button" role="menuitem" class="menu-item${danger ? " is-danger" : ""}" data-card-action="${action}" data-card-note="${id}">${iconMarkup(icon)}<span>${escapeHTML(label)}</span></button>`;

  if (note.trashed) {
    return `
      ${item("restore", "restore", "استعادة الملاحظة")}
      <div class="menu-divider"></div>
      ${item("delete-forever", "trash", "حذف نهائيًا", true)}
    `;
  }

  if (note.archived) {
    return `
      ${item("edit", "edit", "تحرير الملاحظة")}
      ${item("unarchive", "restore", "استعادة من الأرشيف")}
      <div class="menu-divider"></div>
      ${item("trash", "trash", "نقل إلى المهملات", true)}
    `;
  }

  return `
    ${item("edit", "edit", "تحرير الملاحظة")}
    ${item("duplicate", "copy", "إنشاء نسخة")}
    ${item("pin", "pin", note.pinned ? "إلغاء التثبيت" : "تثبيت الملاحظة")}
    ${item("archive", "archive", "أرشفة الملاحظة")}
    <div class="menu-divider"></div>
    ${item("trash", "trash", "نقل إلى المهملات", true)}
  `;
}

function closeCardMenus() {
  $$(".card-menu").forEach((menu) => menu.remove());
  $$(".note-card.menu-open").forEach((card) => card.classList.remove("menu-open"));
  $$(".card-menu-btn[aria-expanded='true']").forEach((button) => {
    button.setAttribute("aria-expanded", "false");
    button.removeAttribute("aria-controls");
  });
  state.openMenuId = null;
}

/* ============================================================
   إجراءات الملاحظات
   ============================================================ */
function commitNotes(nextNotes) {
  if (!state.user) return false;
  const userId = state.user.id;
  const previous = state.db.notesByUser[userId];
  state.db.notesByUser[userId] = nextNotes;
  if (!persistDB()) {
    state.db.notesByUser[userId] = previous;
    return false;
  }
  return true;
}

function updateNote(noteId, updater, options = {}) {
  const { render = true } = options;
  const notes = getUserNotes();
  const index = notes.findIndex((note) => note.id === noteId);
  if (index === -1) return false;

  const nextNotes = notes.map((note, noteIndex) =>
    noteIndex === index ? updater({ ...note }) : note
  );

  if (!commitNotes(nextNotes)) return false;
  if (render) renderAll();
  return true;
}

function toggleFavorite(noteId) {
  const note = getUserNotes().find((item) => item.id === noteId);
  if (!note) return;
  const nextFavorite = !note.favorite;

  updateNote(noteId, (current) => ({ ...current, favorite: nextFavorite }));
}

function duplicateNote(note) {
  const now = Date.now();
  const copy = {
    ...note,
    id: generateId("note"),
    title: `${String(note.title || "").trim() || DEFAULT_TITLE} — نسخة`,
    tags: Array.isArray(note.tags) ? [...note.tags] : [],
    color: safeColor(note.color),
    archived: false,
    trashed: false,
    trashedAt: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now
  };

  const notes = getUserNotes();
  if (!commitNotes([copy, ...notes])) return;
  renderAll();
  showToast("تم إنشاء نسخة من الملاحظة.");
}

function handleCardAction(action, noteId) {
  closeCardMenus();
  const note = getUserNotes().find((item) => item.id === noteId);
  if (!note) return;

  switch (action) {
    case "edit":
      openEditor(note.id);
      break;

    case "duplicate":
      duplicateNote(note);
      break;

    case "pin":
      updateNote(note.id, (current) => ({ ...current, pinned: !current.pinned }));
      showToast(note.pinned ? "تم إلغاء تثبيت الملاحظة." : "تم تثبيت الملاحظة.");
      break;

    case "archive":
      updateNote(note.id, (current) => ({
        ...current,
        archived: true,
        archivedAt: Date.now()
      }));
      showToast("تم نقل الملاحظة إلى الأرشيف.");
      break;

    case "unarchive":
      updateNote(note.id, (current) => ({
        ...current,
        archived: false,
        archivedAt: null
      }));
      showToast("تمت استعادة الملاحظة من الأرشيف.");
      break;

    case "trash":
      updateNote(note.id, (current) => ({
        ...current,
        trashed: true,
        trashedAt: Date.now(),
        archived: false,
        archivedAt: null
      }));
      showToast("تم نقل الملاحظة إلى المهملات.");
      break;

    case "restore":
      updateNote(note.id, (current) => ({
        ...current,
        trashed: false,
        trashedAt: null
      }));
      showToast("تمت استعادة الملاحظة.");
      break;

    case "delete-forever":
      confirmDeleteForever(note);
      break;

    default:
      break;
  }
}

function confirmDeleteForever(note) {
  openConfirm({
    title: "حذف الملاحظة نهائيًا؟",
    message: `سيتم حذف «${String(note.title || "").trim() || DEFAULT_TITLE}» نهائيًا. لا يمكن التراجع عن هذا الإجراء.`,
    confirmLabel: "حذف نهائيًا",
    icon: "trash",
    danger: true,
    onConfirm: () => {
      const notes = getUserNotes();
      const nextNotes = notes.filter((item) => item.id !== note.id);
      if (!commitNotes(nextNotes)) return;
      renderAll();
      showToast("تم حذف الملاحظة نهائيًا.");
    }
  });
}

function emptyTrash() {
  const trashed = getUserNotes().filter((note) => note.trashed);
  if (!trashed.length) return;

  openConfirm({
    title: "إفراغ المهملات؟",
    message: `سيتم حذف ${notesCountAccusative(trashed.length)} نهائيًا. لا يمكن التراجع عن هذا الإجراء.`,
    confirmLabel: "إفراغ المهملات",
    icon: "trash",
    danger: true,
    onConfirm: () => {
      const nextNotes = getUserNotes().filter((note) => !note.trashed);
      if (!commitNotes(nextNotes)) return;
      renderAll();
      showToast("تم إفراغ المهملات.");
    }
  });
}

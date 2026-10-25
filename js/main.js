/* ============================================================
   ملاحظاتي — نقطة البداية والاختصارات
   ============================================================ */
"use strict";

function initNotesApp() {
  state.db = readDB();

  try {
    const savedLayout = localStorage.getItem(LAYOUT_KEY);
    if (savedLayout === "list" || savedLayout === "grid") state.layout = savedLayout;
  } catch {
    state.layout = "grid";
  }

  cacheElements({
    authView: "#authView",
    appView: "#appView",

    loginPane: "#loginPane",
    signupPane: "#signupPane",
    loginForm: "#loginForm",
    signupForm: "#signupForm",
    loginEmail: "#loginEmail",
    loginPassword: "#loginPassword",
    loginError: "#loginError",
    loginSubmit: "#loginSubmit",
    signupName: "#signupName",
    signupEmail: "#signupEmail",
    signupPassword: "#signupPassword",
    signupConfirm: "#signupConfirm",
    signupError: "#signupError",
    signupSubmit: "#signupSubmit",
    passwordStrength: "#passwordStrength",
    strengthLabel: "#strengthLabel",

    sidebar: "#sidebar",
    sidebarOverlay: "#sidebarOverlay",
    menuButton: "#menuButton",
    closeSidebar: "#closeSidebar",
    sidebarTags: "#sidebarTags",
    tagCount: "#tagCount",
    countAll: "#countAll",
    countFavorites: "#countFavorites",
    countPinned: "#countPinned",
    countArchived: "#countArchived",
    countTrash: "#countTrash",
    profileButton: "#profileButton",
    profilePopover: "#profilePopover",
    logoutButton: "#logoutButton",
    sideName: "#sideName",
    sideEmail: "#sideEmail",
    sideAvatar: "#sideAvatar",
    popoverEmail: "#popoverEmail",

    dateLabel: "#dateLabel",
    greetingLabel: "#greetingLabel",
    firstName: "#firstName",
    pageSubtitle: "#pageSubtitle",
    searchInput: "#searchInput",
    clearSearch: "#clearSearch",
    sortSelect: "#sortSelect",
    resultsLabel: "#resultsLabel",
    notesContainer: "#notesContainer",
    emptyState: "#emptyState",
    emptyTitle: "#emptyTitle",
    emptyText: "#emptyText",
    emptyAction: "#emptyAction",
    emptyTrashButton: "#emptyTrashButton",

    editorModal: "#editorModal",
    noteTitle: "#noteTitle",
    noteContent: "#noteContent",
    editorHeading: "#editorHeading",
    editorDelete: "#editorDelete",
    saveStatus: "#saveStatus",
    saveDot: "#saveDot",
    noteCreatedAt: "#noteCreatedAt",
    noteUpdatedAt: "#noteUpdatedAt",
    pinToggle: "#pinToggle",
    favoriteToggle: "#favoriteToggle",
    editorTags: "#editorTags",
    tagInput: "#tagInput",
    tagInputWrap: "#tagInputWrap",
    tagSuggestions: "#tagSuggestions",
    colorPicker: "#colorPicker",
    wordCount: "#wordCount",

    confirmModal: "#confirmModal",
    confirmTitle: "#confirmTitle",
    confirmText: "#confirmText",
    confirmIcon: "#confirmIcon",
    confirmOk: "#confirmOk",
    confirmCancel: "#confirmCancel",

    toastStack: "#toastStack"
  });

  bindAuthEvents();
  bindNotesEvents();
  bindEditorEvents();
  bindConfirmEvents();
  bindGlobalEvents();

  updateDateLabel();
  updateLayoutUI();
  restoreSession();

  window.setInterval(updateDateLabel, 60 * 1000);
}

function bindGlobalEvents() {
  document.addEventListener("keydown", handleGlobalKeydown);

  window.addEventListener("storage", (event) => {
    if (event.key === SESSION_KEY) {
      window.location.reload();
      return;
    }

    if (event.key === DB_KEY && state.user) {
      const session = getStoredSession();
      if (!session || session.userId !== state.user.id) {
        window.location.reload();
        return;
      }

      const currentUserId = state.user.id;
      state.db = readDB();
      const refreshedUser = state.db.users.find((user) => user.id === currentUserId);
      if (!refreshedUser) {
        window.location.reload();
        return;
      }

      state.user = refreshedUser;
      if (els.editorModal && els.editorModal.hidden) {
        renderAll();
      }
    }
  });
}

function handleGlobalKeydown(event) {
  const key = String(event.key || "").toLowerCase();
  const modifier = event.ctrlKey || event.metaKey;

  if ((event.ctrlKey || event.metaKey) && key === "s") {
    if (els.editorModal && !els.editorModal.hidden) {
      event.preventDefault();
      saveEditor();
    }
    return;
  }

  if (event.key === "Escape") {
    if (els.confirmModal && !els.confirmModal.hidden) {
      event.preventDefault();
      closeConfirm(true);
      return;
    }

    if (els.profilePopover && !els.profilePopover.hidden) {
      event.preventDefault();
      closeProfilePopover();
      return;
    }

    if (state.openMenuId) {
      event.preventDefault();
      const noteId = state.openMenuId;
      closeCardMenus();
      const menuButton = $$(".card-menu-btn").find(
        (button) => button.dataset.menuToggle === noteId
      );
      if (menuButton) menuButton.focus();
      return;
    }

    if (els.editorModal && !els.editorModal.hidden) {
      event.preventDefault();
      requestCloseEditor();
      return;
    }

    if (els.sidebar && els.sidebar.classList.contains("is-open")) {
      event.preventDefault();
      closeSidebar();
    }
    return;
  }

  if (els.authView && !els.authView.hidden) return;
  if (els.appView && els.appView.hidden) return;
  if (els.editorModal && !els.editorModal.hidden) return;
  if (els.confirmModal && !els.confirmModal.hidden) return;

  const target = event.target;
  const isTyping =
    target instanceof Element &&
    Boolean(target.closest("input, textarea, select, [contenteditable='true']"));

  if (event.key === "/" && !modifier && !isTyping) {
    event.preventDefault();
    if (els.searchInput) {
      els.searchInput.focus();
      els.searchInput.select();
    }
    return;
  }

  if (key === "n" && !modifier && !event.altKey && !event.shiftKey && !isTyping) {
    event.preventDefault();
    openEditor();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNotesApp, { once: true });
} else {
  initNotesApp();
}

/* ============================================================
   ملاحظاتي — المصادقة وإدارة الجلسة
   ============================================================ */
"use strict";

function bindAuthEvents() {
  $$("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      switchAuthMode(button.dataset.authMode);
    });
  });

  $$("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => togglePasswordVisibility(button));
  });

  if (els.loginForm) {
    els.loginForm.addEventListener("submit", handleLogin);
    els.loginForm.addEventListener("input", () => clearFormError(els.loginError));
  }

  if (els.signupForm) {
    els.signupForm.addEventListener("submit", handleSignup);
    els.signupForm.addEventListener("input", () => clearFormError(els.signupError));
  }

  if (els.signupPassword) {
    els.signupPassword.addEventListener("input", updatePasswordStrength);
  }
}

function switchAuthMode(mode, options = {}) {
  const { focus = true } = options;
  const isSignup = mode === "signup";

  if (!els.loginPane || !els.signupPane) return;
  els.loginPane.hidden = isSignup;
  els.signupPane.hidden = !isSignup;

  clearFormError(els.loginError);
  clearFormError(els.signupError);

  if (focus) {
    window.setTimeout(() => {
      const input = isSignup ? els.signupName : els.loginEmail;
      if (input) input.focus();
    }, 80);
  }
}

function togglePasswordVisibility(button) {
  const inputId = button.dataset.togglePassword;
  const input = document.getElementById(inputId);
  if (!input) return;

  const shouldShow = input.type === "password";
  input.type = shouldShow ? "text" : "password";
  const use = button.querySelector("use");
  if (use) use.setAttribute("href", shouldShow ? "#i-eye-off" : "#i-eye");
  button.setAttribute("aria-label", shouldShow ? "إخفاء كلمة المرور" : "إظهار كلمة المرور");
}

function resetPasswordVisibility() {
  $$("[data-toggle-password]").forEach((button) => {
    const input = document.getElementById(button.dataset.togglePassword);
    if (input) input.type = "password";
    button.setAttribute("aria-label", "إظهار كلمة المرور");
    const use = button.querySelector("use");
    if (use) use.setAttribute("href", "#i-eye");
  });
}

function updatePasswordStrength() {
  if (!els.signupPassword || !els.passwordStrength || !els.strengthLabel) return;
  const password = els.signupPassword.value;

  if (!password) {
    els.passwordStrength.hidden = true;
    els.passwordStrength.removeAttribute("data-score");
    els.strengthLabel.textContent = "";
    return;
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Za-z\u0600-\u06FF]/.test(password) && /\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9\u0600-\u06FF]/.test(password) && password.length >= 10) score += 1;
  if (score === 0) score = 1;

  const labels = { 1: "ضعيفة", 2: "متوسطة", 3: "جيدة", 4: "قوية" };
  els.passwordStrength.hidden = false;
  els.passwordStrength.dataset.score = String(score);
  els.strengthLabel.textContent = labels[score] || "";
}

function clearSensitiveAuthFields() {
  if (els.loginForm) els.loginForm.reset();
  if (els.signupForm) els.signupForm.reset();
  resetPasswordVisibility();

  if (els.passwordStrength) {
    els.passwordStrength.hidden = true;
    els.passwordStrength.removeAttribute("data-score");
  }
  if (els.strengthLabel) els.strengthLabel.textContent = "";
  clearFormError(els.loginError);
  clearFormError(els.signupError);
}

function getFirstName(name) {
  const clean = String(name || "").trim();
  return clean ? clean.split(/\s+/)[0] : "صديقي";
}

function updateProfileUI() {
  if (!state.user) return;
  const name = state.user.name || "مستخدم";
  const email = state.user.email || "";
  const initial = getInitial(name);

  if (els.sideName) els.sideName.textContent = name;
  if (els.sideEmail) els.sideEmail.textContent = email;
  if (els.sideAvatar) els.sideAvatar.textContent = initial;
  if (els.popoverEmail) els.popoverEmail.textContent = email;

  const first = getFirstName(name);
  if (els.firstName) els.firstName.textContent = first;
  if (els.greetingLabel) els.greetingLabel.textContent = getGreeting();
}

function updateWelcomeMessage(welcome) {
  if (!state.user || !els.pageSubtitle) return;
  if (welcome) {
    els.pageSubtitle.textContent = "أهلًا بك. مساحتك جاهزة، وكل فكرة تبدأ بخطوة صغيرة.";
    return;
  }

  const active = getActiveNotes();
  if (active.length === 0) {
    els.pageSubtitle.textContent = "مساحتك جاهزة لأول فكرة. ابدأ حيث تشاء.";
  } else {
    els.pageSubtitle.textContent = `لديك ${notesCountText(active.length)} في مساحتك. خذ وقتك.`;
  }
}

function restoreSession() {
  const session = getStoredSession();
  if (!session) {
    showAuthView({ focus: false });
    return;
  }

  const user = state.db.users.find((item) => item.id === session.userId);
  if (!user) {
    clearStoredSession();
    showAuthView({ focus: false });
    return;
  }

  enterApp(user, { welcome: false, showToastMessage: false });
}

function enterApp(user, options = {}) {
  const { welcome = false, showToastMessage = false } = options;

  state.user = user;
  state.scope = "all";
  state.tag = null;
  state.query = "";
  state.sort = "updated";
  state.editor = null;
  state.openMenuId = null;

  if (els.authView) els.authView.hidden = true;
  if (els.appView) els.appView.hidden = false;
  if (els.searchInput) els.searchInput.value = "";
  if (els.sortSelect) els.sortSelect.value = "updated";
  if (els.loginForm) els.loginForm.reset();
  if (els.signupForm) els.signupForm.reset();
  resetPasswordVisibility();
  clearFormError(els.loginError);
  clearFormError(els.signupError);

  if (els.passwordStrength) {
    els.passwordStrength.hidden = true;
    els.passwordStrength.removeAttribute("data-score");
  }

  if (els.editorModal) els.editorModal.hidden = true;
  if (els.confirmModal) els.confirmModal.hidden = true;
  closeProfilePopover();

  document.title = `ملاحظاتي — ${user.name || "مساحتك"}`;
  updateProfileUI();
  updateDateLabel();
  closeCardMenus();
  updateLayoutUI();
  renderAll();
  updateWelcomeMessage(welcome);
  setBodyLock();
  window.scrollTo(0, 0);

  if (welcome) {
    showToast(`أهلًا ${getFirstName(user.name)}، تم إنشاء مساحتك بنجاح.`);
  } else if (showToastMessage) {
    showToast(`مرحبًا بعودتك، ${getFirstName(user.name)}.`);
  }
}

function showAuthView(options = {}) {
  const { prefillEmail = "", focus = true, message = "" } = options;

  state.user = null;
  state.editor = null;
  state.openMenuId = null;

  if (els.appView) els.appView.hidden = true;
  if (els.authView) els.authView.hidden = false;
  if (els.editorModal) els.editorModal.hidden = true;
  if (els.confirmModal) els.confirmModal.hidden = true;
  if (els.notesContainer) els.notesContainer.replaceChildren();
  if (els.sidebarTags) els.sidebarTags.replaceChildren();
  if (els.toastStack) els.toastStack.replaceChildren();
  closeProfilePopover();
  closeCardMenus();
  closeSidebar();

  clearSensitiveAuthFields();
  switchAuthMode("login", { focus: false });
  if (els.loginEmail && prefillEmail) els.loginEmail.value = prefillEmail;

  document.title = "ملاحظاتي — مساحتك الخاصة للأفكار";
  setBodyLock();
  window.scrollTo(0, 0);

  if (message) showToast(message);

  if (focus) {
    window.setTimeout(() => {
      if (els.loginEmail) els.loginEmail.focus();
    }, 120);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  clearFormError(els.loginError);

  const email = normalizeEmail(els.loginEmail ? els.loginEmail.value : "");
  const password = els.loginPassword ? els.loginPassword.value : "";

  if (!email || !password) {
    setFormError(els.loginError, "يرجى إدخال البريد الإلكتروني وكلمة المرور.");
    (email ? els.loginPassword : els.loginEmail).focus();
    return;
  }

  if (!isValidEmail(email)) {
    setFormError(els.loginError, "يرجى إدخال بريد إلكتروني صحيح.");
    els.loginEmail.focus();
    return;
  }

  setButtonLoading(els.loginSubmit, true);

  try {
    const user = state.db.users.find((item) => normalizeEmail(item.email) === email);
    let valid = false;

    if (user) {
      try {
        valid = await verifyPasswordRecord(user, password);
      } catch (error) {
        if (error && error.message === "CRYPTO_UNAVAILABLE") {
          setFormError(els.loginError, "تعذر التحقق الآمن في هذا المتصفح. افتح الموقع عبر HTTPS ثم حاول مجددًا.");
          return;
        }
        console.error(error);
      }
    }

    if (!user || !valid) {
      setFormError(els.loginError, "البريد الإلكتروني أو كلمة المرور غير صحيحة.");
      if (els.loginPassword) {
        els.loginPassword.value = "";
        els.loginPassword.focus();
      }
      return;
    }

    storeSession(user.id);
    clearSensitiveAuthFields();
    enterApp(user, { welcome: false, showToastMessage: true });
  } catch (error) {
    console.error(error);
    setFormError(els.loginError, "تعذر بدء الجلسة. يرجى المحاولة مرة أخرى.");
  } finally {
    setButtonLoading(els.loginSubmit, false);
  }
}

async function handleSignup(event) {
  event.preventDefault();
  clearFormError(els.signupError);

  const name = String(els.signupName ? els.signupName.value : "").trim().replace(/\s+/g, " ");
  const email = normalizeEmail(els.signupEmail ? els.signupEmail.value : "");
  const password = els.signupPassword ? els.signupPassword.value : "";
  const confirm = els.signupConfirm ? els.signupConfirm.value : "";

  if (name.length < 2) {
    setFormError(els.signupError, "يرجى كتابة اسم مكوّن من حرفين على الأقل.");
    els.signupName.focus();
    return;
  }

  if (!isValidEmail(email)) {
    setFormError(els.signupError, "يرجى إدخال بريد إلكتروني صحيح.");
    els.signupEmail.focus();
    return;
  }

  if (password.length < 8) {
    setFormError(els.signupError, "كلمة المرور يجب أن تتكون من 8 أحرف على الأقل.");
    els.signupPassword.focus();
    return;
  }

  if (password.length > 128) {
    setFormError(els.signupError, "كلمة المرور طويلة جدًا. استخدم 128 حرفًا كحد أقصى.");
    els.signupPassword.focus();
    return;
  }

  if (password !== confirm) {
    setFormError(els.signupError, "كلمتا المرور غير متطابقتين. تحقق من الكتابة ثم حاول مجددًا.");
    els.signupConfirm.focus();
    return;
  }

  const alreadyExists = state.db.users.some((user) => normalizeEmail(user.email) === email);
  if (alreadyExists) {
    switchAuthMode("login", { focus: false });
    if (els.loginEmail) els.loginEmail.value = email;
    setFormError(els.loginError, "هذا البريد الإلكتروني مسجل بالفعل. أدخل كلمة المرور للمتابعة.");
    if (els.loginPassword) {
      window.setTimeout(() => els.loginPassword.focus(), 60);
    }
    return;
  }

  setButtonLoading(els.signupSubmit, true);

  let user = null;
  let previousNotes = null;

  try {
    const passwordRecord = await createPasswordRecord(password);
    const now = Date.now();

    user = {
      id: generateId("usr"),
      name,
      email,
      createdAt: now,
      password: passwordRecord
    };

    state.db.users.push(user);
    previousNotes = state.db.notesByUser[user.id];
    state.db.notesByUser[user.id] = typeof createStarterNotes === "function" ? createStarterNotes() : [];

    if (!persistDB()) {
      state.db.users = state.db.users.filter((item) => item.id !== user.id);
      if (previousNotes === undefined) delete state.db.notesByUser[user.id];
      else state.db.notesByUser[user.id] = previousNotes;
      setFormError(els.signupError, "تعذر حفظ الحساب على هذا المتصفح. تحقق من إمكانية استخدام التخزين المحلي.");
      return;
    }

    try {
      storeSession(user.id);
    } catch (error) {
      console.error(error);
      switchAuthMode("login");
      if (els.loginEmail) els.loginEmail.value = email;
      setFormError(els.loginError, "تم إنشاء الحساب، لكن تعذر بدء الجلسة. سجّل الدخول من جديد.");
      return;
    }

    clearSensitiveAuthFields();
    enterApp(user, { welcome: true });
  } catch (error) {
    console.error(error);

    if (user) {
      state.db.users = state.db.users.filter((item) => item.id !== user.id);
      if (previousNotes === undefined) delete state.db.notesByUser[user.id];
      else state.db.notesByUser[user.id] = previousNotes;
    }

    if (error && error.message === "CRYPTO_UNAVAILABLE") {
      setFormError(els.signupError, "تعذر تأمين كلمة المرور في هذا المتصفح. افتح الموقع عبر HTTPS ثم حاول مجددًا.");
    } else {
      setFormError(els.signupError, "تعذر إنشاء الحساب. يرجى المحاولة مرة أخرى.");
    }
  } finally {
    setButtonLoading(els.signupSubmit, false);
  }
}

function logoutCurrentUser() {
  if (!state.user) return;
  const email = state.user.email;
  clearStoredSession();
  state.user = null;
  closeCardMenus();
  showAuthView({ prefillEmail: email, focus: true, message: "تم تسجيل الخروج بأمان." });
}

(() => {
  const form = document.getElementById('lgform');
  const panel = document.getElementById('login');
  const app = document.querySelector('.app');
  const name = document.getElementById('lgn');
  const email = document.getElementById('lge');
  const password = document.getElementById('lgpassword');
  const confirm = document.getElementById('lgconfirm');
  const button = document.getElementById('lgbtn');
  const message = document.getElementById('lgmsg');
  const retry = document.getElementById('auth-retry');
  const signout = document.getElementById('so');
  const status = document.getElementById('auth-status');
  const checks = [...document.querySelectorAll('.tc input')];
  let mode = 'login', pending = false, config = null, currentUser = null, checking = false;

  async function request(endpoint, body) {
    const response = await fetch(`/api/auth/${endpoint}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      cache: 'no-store', signal: AbortSignal.timeout(15000),
      headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-Safe-Space': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = response.status === 204 ? {} : await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Please try again.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function validation() {
    checks.forEach((check) => check.closest('.tc').classList.toggle('ok', check.checked));
    const count = checks.filter((check) => check.checked).length;
    document.getElementById('lgp').style.width = `${count / 3 * 100}%`;
    if (!config) return 'Connecting to Safe Space…';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) return 'Please enter a valid email.';
    if (!password.value) return 'Please enter your password.';
    if (password.value.length > config.passwordMaxLength) return 'Your password is too long.';
    if (mode === 'register') {
      if (name.value.trim().length < 2) return 'Please enter your name or nickname.';
      if (password.value.length < config.passwordMinLength) return `Use at least ${config.passwordMinLength} characters for your password.`;
      if (password.value !== confirm.value) return 'Your passwords need to match.';
      if (count !== 3) return `Tick all three boxes to continue (${count} of 3).`;
    }
    return '';
  }

  function check(clearError = true) {
    const problem = validation();
    button.disabled = pending || !!problem;
    if (clearError && !pending) message.textContent = problem || 'Ready when you are 💙';
  }

  function setMode(nextMode) {
    if (pending) return;
    mode = nextMode;
    const signup = mode === 'register';
    for (const id of ['name-field', 'confirm-field', 'signup-terms']) document.getElementById(id).hidden = !signup;
    document.getElementById('signin-tab').setAttribute('aria-pressed', String(!signup));
    document.getElementById('signup-tab').setAttribute('aria-pressed', String(signup));
    document.getElementById('lgsubtitle').textContent = signup ? 'Create your account and accept the terms' : 'Sign in to your Safe Space account';
    password.autocomplete = signup ? 'new-password' : 'current-password';
    password.placeholder = signup ? 'At least 12 characters' : 'Your password';
    password.value = ''; confirm.value = '';
    button.textContent = signup ? 'Create account & continue' : 'Sign in & continue';
    check();
  }

  function enter(user) {
    currentUser = user;
    loadAccountData(user.id);
    document.querySelector('header b').textContent = `💙 Hi, ${user.name}`;
    panel.classList.remove('show');
    app.inert = false; app.removeAttribute('aria-hidden');
    status.hidden = true;
    password.value = ''; confirm.value = '';
    go('help');
  }

  function show(note) {
    currentUser = null;
    app.inert = true; app.setAttribute('aria-hidden', 'true');
    loadAccountData(null);
    go('help');
    document.querySelector('header b').textContent = '💙 Safe Space';
    panel.classList.add('show');
    form.reset(); setMode('login');
    if (note) message.textContent = note;
  }

  for (const field of [name, email, password, confirm]) field.addEventListener('input', () => check());
  checks.forEach((box) => box.addEventListener('change', () => check()));
  document.getElementById('signin-tab').onclick = () => setMode('login');
  document.getElementById('signup-tab').onclick = () => setMode('register');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending || validation()) { check(); return; }
    pending = true; check(false);
    message.textContent = mode === 'register' ? 'Creating your account…' : 'Signing you in…';
    try {
      const body = { email: email.value.trim(), password: password.value };
      if (mode === 'register') Object.assign(body, {
        name: name.value.trim(), termsVersion: config.termsVersion,
        consents: { peerSupport: checks[0].checked, emergency: checks[1].checked, ageAndTerms: checks[2].checked },
      });
      const data = await request(mode, body);
      enter(data.user);
    } catch (error) {
      message.textContent = error.status ? error.message : 'Could not reach the server. Please check your connection and try again.';
    } finally { pending = false; check(false); }
  });

  signout.onclick = async () => {
    if (signout.disabled) return;
    signout.disabled = true;
    try { await request('logout', {}); show('You are signed out.'); }
    catch { status.textContent = 'Could not sign out. Check your connection and try again.'; status.hidden = false; }
    finally { signout.disabled = false; }
  };

  async function connect() {
    pending = true; retry.hidden = true; check(false);
    message.textContent = 'Connecting to Safe Space…';
    try {
      config = await request('config');
      try { const data = await request('me'); enter(data.user); }
      catch (error) { if (error.status !== 401) throw error; show(); }
    } catch {
      config = null;
      message.textContent = 'Could not reach the server. Start Safe Space and try again.';
      retry.hidden = false;
    } finally { pending = false; check(config !== null); }
  }
  retry.onclick = connect;

  async function refreshSession() {
    if (!currentUser || checking) return;
    const checkedUserId = currentUser.id;
    checking = true;
    try { await request('me'); }
    catch (error) {
      if (error.status === 401 && currentUser?.id === checkedUserId) {
        show('Your session ended. Please sign in again.');
      }
    }
    finally { checking = false; }
  }
  window.addEventListener('focus', refreshSession);
  setInterval(refreshSession, 60000);
  // The old browser-only profile never authenticates an account.
  try { localStorage.removeItem('ss_user'); } catch {}
  connect();
})();

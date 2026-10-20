/**
 * 安福二中论坛 - 主逻辑
 */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const welcomePage = $('#welcome-page');
const mainPage = $('#main-page');
const authModal = $('#auth-modal');
const enterBtn = $('#enter-btn');
const loginForm = $('#login-form');
const registerForm = $('#register-form');
const hamburgerBtn = $('#hamburger-btn');
const sidebar = $('#sidebar');
const sidebarOverlay = $('#sidebar-overlay');
const sidebarClose = $('#sidebar-close');
const userAvatar = $('#user-avatar');
const userDropdown = $('#user-dropdown');

function init() {
  if (Storage.isLoggedIn()) {
    showMainPage();
    loadUserInfo();
  } else {
    showWelcomePage();
  }
  bindEvents();
  renderBoards();
}

function showWelcomePage() {
  welcomePage.classList.add('active');
  mainPage.classList.remove('active');
  authModal.classList.add('hidden');
}

function showMainPage() {
  welcomePage.classList.remove('active');
  mainPage.classList.add('active');
  authModal.classList.add('hidden');
  closeSidebar();
  closeUserDropdown();
}

function openAuthModal() {
  authModal.classList.remove('hidden');
  switchTab('login');
}

function closeAuthModal() {
  authModal.classList.add('hidden');
}

function bindEvents() {
  enterBtn.addEventListener('click', () => {
    if (Storage.isLoggedIn()) {
      showMainPage();
      loadUserInfo();
    } else {
      openAuthModal();
    }
  });

  authModal.querySelector('.modal-overlay').addEventListener('click', closeAuthModal);

  $$('.modal-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qq = $('#login-qq').value.trim();
    const password = $('#login-password').value;
    const remember = $('#remember-me').checked;
    const errEl = $('#login-error');
    errEl.textContent = '';
    if (!/^\d{5,12}$/.test(qq)) {
      errEl.textContent = '请输入5-12位纯数字QQ号';
      return;
    }
    const res = await API.login(qq, password);
    if (!res.ok) {
      errEl.textContent = res.error;
      return;
    }
    Storage.setToken(res.token, remember);
    Storage.setUser(res.user);
    showMainPage();
    loadUserInfo();
  });

  const sendCodeBtn = $('#send-code-btn');
  if (sendCodeBtn) {
    sendCodeBtn.addEventListener('click', async () => {
      const qq = $('#reg-qq').value.trim();
      const errEl = $('#reg-error');
      errEl.textContent = '';
      if (!/^\d{5,12}$/.test(qq)) {
        errEl.textContent = '请先输入5-12位纯数字QQ号';
        return;
      }
      sendCodeBtn.disabled = true;
      sendCodeBtn.textContent = '发送中...';
      const res = await API.sendCode(qq, 'register');
      if (!res.ok) {
        errEl.textContent = res.error;
        sendCodeBtn.disabled = false;
        sendCodeBtn.textContent = '获取验证码';
        return;
      }
      if (res.dev_code) {
        errEl.textContent = '开发模式验证码：' + res.dev_code;
        errEl.style.color = '#7c3aed';
      } else {
        errEl.textContent = res.message || '验证码已发送';
        errEl.style.color = '#16a34a';
      }
      let left = 60;
      sendCodeBtn.textContent = left + 's';
      const timer = setInterval(() => {
        left--;
        if (left <= 0) {
          clearInterval(timer);
          sendCodeBtn.disabled = false;
          sendCodeBtn.textContent = '获取验证码';
        } else {
          sendCodeBtn.textContent = left + 's';
        }
      }, 1000);
    });
  }

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qq = $('#reg-qq').value.trim();
    const nickname = $('#reg-nickname').value.trim();
    const password = $('#reg-password').value;
    const password2 = $('#reg-password2').value;
    const code = ($('#reg-code') && $('#reg-code').value.trim()) || '';
    const errEl = $('#reg-error');
    errEl.style.color = '#dc2626';
    errEl.textContent = '';
    if (!/^\d{5,12}$/.test(qq)) {
      errEl.textContent = '请输入5-12位纯数字QQ号';
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      errEl.textContent = '请输入6位邮箱验证码';
      return;
    }
    if (password !== password2) {
      errEl.textContent = '两次密码不一致';
      return;
    }
    const res = await API.register(qq, nickname, password, code);
    if (!res.ok) {
      errEl.textContent = res.error;
      return;
    }
    Storage.setToken(res.token, true);
    Storage.setUser(res.user);
    showMainPage();
    loadUserInfo();
  });

  hamburgerBtn.addEventListener('click', openSidebar);
  sidebarClose.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  $$('.sidebar-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      switchContentPage(page);
      $$('.sidebar-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      closeSidebar();
    });
  });

  userAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
  });
  document.addEventListener('click', () => closeUserDropdown());

  userDropdown.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (action === 'logout') doLogout();
    else if (action === 'profile') { switchContentPage('profile'); closeUserDropdown(); }
    else if (action === 'settings') { switchContentPage('settings'); closeUserDropdown(); }
  });

  $$('[data-action="logout"]').forEach(btn => btn.addEventListener('click', doLogout));

  $('#chat-send').addEventListener('click', sendChatMsg);
  $('#chat-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChatMsg();
  });
}

function switchTab(tab) {
  $$('.modal-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  loginForm.classList.toggle('hidden', tab !== 'login');
  registerForm.classList.toggle('hidden', tab !== 'register');
  $('#login-error').textContent = '';
  $('#reg-error').textContent = '';
}

function openSidebar() {
  sidebar.classList.add('open');
  sidebarOverlay.classList.add('show');
}

function closeSidebar() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('show');
}

function closeUserDropdown() {
  userDropdown.classList.add('hidden');
}

function switchContentPage(page) {
  $$('.content-page').forEach(p => p.classList.remove('active'));
  const target = $(`#page-${page}`);
  if (target) target.classList.add('active');
  $$('.sidebar-item').forEach(i => i.classList.toggle('active', i.dataset.page === page));
  if (page === 'profile') renderProfile();
}

function loadUserInfo() {
  const user = Storage.getUser();
  if (!user) return;
  const first = (user.nickname || 'U')[0].toUpperCase();
  userAvatar.src = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#a78bfa"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="42" font-family="sans-serif" font-weight="600">${first}</text></svg>`)}`;
  userAvatar.alt = user.nickname;
  const nickInput = $('#setting-nickname');
  if (nickInput) nickInput.value = user.nickname || '';
}

function renderProfile() {
  const user = Storage.getUser();
  if (!user) return;
  const card = $('#profile-card');
  const first = (user.nickname || 'U')[0].toUpperCase();
  card.innerHTML = `<img class="big-avatar" src="data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#a78bfa"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="42" font-family="sans-serif" font-weight="600">${first}</text></svg>`)}" alt="头像" /><div class="nickname">${escapeHtml(user.nickname)}</div><div class="uid">UID: ${user.uid}</div><div class="uid" style="margin-top:0.5rem">${escapeHtml(user.email)}</div>`;
}

function doLogout() {
  API.logout();
  showWelcomePage();
  loginForm.reset();
  registerForm.reset();
}

function renderBoards() {
  const list = $('#boards-list');
  list.innerHTML = CONFIG.BOARDS.map(b => `<div class="board-card" data-board="${b.id}"><div class="board-icon">${b.icon}</div><div class="board-name">${b.name}</div><div class="board-count">${b.count} 帖</div></div>`).join('');
}

function sendChatMsg() {
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text) return;
  const msgEl = document.createElement('div');
  msgEl.className = 'msg self';
  msgEl.textContent = text;
  $('#chat-messages').appendChild(msgEl);
  input.value = '';
  msgEl.scrollIntoView({ behavior: 'smooth' });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

document.addEventListener('DOMContentLoaded', init);

/**
 * 安福二中论坛 - 主逻辑
 */

// ---------- DOM ----------
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

// ---------- 初始化 ----------
function init() {
  // 检查是否已登录
  if (Storage.isLoggedIn()) {
    showMainPage();
    loadUserInfo();
  } else {
    showWelcomePage();
  }

  bindEvents();
  renderBoards();
}

// ---------- 页面切换 ----------
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
  // 默认登录 tab
  switchTab('login');
}

function closeAuthModal() {
  authModal.classList.add('hidden');
}

// ---------- 事件绑定 ----------
function bindEvents() {
  // 立即进入
  enterBtn.addEventListener('click', () => {
    if (Storage.isLoggedIn()) {
      showMainPage();
      loadUserInfo();
    } else {
      openAuthModal();
    }
  });

  // 点击遮罩关闭弹层
  authModal.querySelector('.modal-overlay').addEventListener('click', closeAuthModal);

  // Tab 切换
  $$('.modal-tabs .tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // 登录
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

  // 注册
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qq = $('#reg-qq').value.trim();
    const nickname = $('#reg-nickname').value.trim();
    const password = $('#reg-password').value;
    const password2 = $('#reg-password2').value;
    const errEl = $('#reg-error');
    errEl.textContent = '';

    if (!/^\d{5,12}$/.test(qq)) {
      errEl.textContent = '请输入5-12位纯数字QQ号';
      return;
    }
    if (password !== password2) {
      errEl.textContent = '两次密码不一致';
      return;
    }

    const res = await API.register(qq, nickname, password);
    if (!res.ok) {
      errEl.textContent = res.error;
      return;
    }

    // 注册成功后自动登录（记住90天）
    Storage.setToken(res.token, true);
    Storage.setUser(res.user);
    showMainPage();
    loadUserInfo();
  });

  // 汉堡菜单
  hamburgerBtn.addEventListener('click', openSidebar);
  sidebarClose.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  // 侧边栏导航
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

  // 用户头像下拉
  userAvatar.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
  });
  document.addEventListener('click', () => closeUserDropdown());

  // 下拉菜单操作
  userDropdown.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (action === 'logout') {
      doLogout();
    } else if (action === 'profile') {
      switchContentPage('profile');
      closeUserDropdown();
    } else if (action === 'settings') {
      switchContentPage('settings');
      closeUserDropdown();
    }
  });

  // 设置页退出
  $$('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', doLogout);
  });

  // 聊天发送（简单本地演示）
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

  // 同步侧边栏高亮
  $$('.sidebar-item').forEach(i => {
    i.classList.toggle('active', i.dataset.page === page);
  });

  if (page === 'profile') renderProfile();
}

// ---------- 用户相关 ----------
function loadUserInfo() {
  const user = Storage.getUser();
  if (!user) return;

  // 更新头像（简单用昵称首字）
  const first = (user.nickname || 'U')[0].toUpperCase();
  userAvatar.src = `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="50" fill="#a78bfa"/>
      <text x="50" y="62" text-anchor="middle" fill="white" font-size="42" font-family="sans-serif" font-weight="600">${first}</text>
    </svg>`
  )}`;
  userAvatar.alt = user.nickname;

  // 设置页昵称
  const nickInput = $('#setting-nickname');
  if (nickInput) nickInput.value = user.nickname || '';
}

function renderProfile() {
  const user = Storage.getUser();
  if (!user) return;
  const card = $('#profile-card');
  const first = (user.nickname || 'U')[0].toUpperCase();
  card.innerHTML = `
    <img class="big-avatar" src="data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="50" fill="#a78bfa"/>
        <text x="50" y="62" text-anchor="middle" fill="white" font-size="42" font-family="sans-serif" font-weight="600">${first}</text>
      </svg>`
    )}" alt="头像" />
    <div class="nickname">${escapeHtml(user.nickname)}</div>
    <div class="uid">UID: ${user.uid}</div>
    <div class="uid" style="margin-top:0.5rem">${escapeHtml(user.email)}</div>
  `;
}

function doLogout() {
  API.logout();
  showWelcomePage();
  // 清空表单
  loginForm.reset();
  registerForm.reset();
}

// ---------- 贴吧板块 ----------
function renderBoards() {
  const list = $('#boards-list');
  list.innerHTML = CONFIG.BOARDS.map(b => `
    <div class="board-card" data-board="${b.id}">
      <div class="board-icon">${b.icon}</div>
      <div class="board-name">${b.name}</div>
      <div class="board-count">${b.count} 帖</div>
    </div>
  `).join('');
}

// ---------- 聊天简单演示 ----------
function sendChatMsg() {
  const input = $('#chat-input');
  const text = input.value.trim();
  if (!text) return;
  const user = Storage.getUser();
  const msgEl = document.createElement('div');
  msgEl.className = 'msg self';
  msgEl.textContent = text;
  $('#chat-messages').appendChild(msgEl);
  input.value = '';
  msgEl.scrollIntoView({ behavior: 'smooth' });
}

// ---------- 工具 ----------
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 启动
document.addEventListener('DOMContentLoaded', init);

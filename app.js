/**
 * 安福二中论坛 - 主逻辑
 * 登录后直接进主页；贴吧排版；聊天不分区；发帖/回复
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
const composeModal = $('#compose-modal');

let currentBoardId = null;
let currentBoardName = '';
let currentPostId = null;

function init() {
  if (Storage.isLoggedIn()) {
    showMainPage();
    loadUserInfo();
    loadBoards();
  } else {
    showWelcomePage();
  }
  bindEvents();
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
      loadBoards();
    } else {
      openAuthModal();
    }
  });

  authModal.querySelector('.modal-overlay').addEventListener('click', closeAuthModal);
  $$('.modal-tabs .tab').forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qq = $('#login-qq').value.trim();
    const password = $('#login-password').value;
    const remember = $('#remember-me').checked;
    const errEl = $('#login-error');
    errEl.textContent = '';
    if (!/^\d{5,12}$/.test(qq)) { errEl.textContent = '请输入5-12位纯数字QQ号'; return; }
    const res = await API.login(qq, password);
    if (!res.ok) { errEl.textContent = res.error; return; }
    Storage.setToken(res.token, remember);
    Storage.setUser(res.user);
    showMainPage();
    loadUserInfo();
    loadBoards();
  });

  const sendCodeBtn = $('#send-code-btn');
  if (sendCodeBtn) {
    sendCodeBtn.addEventListener('click', async () => {
      const qq = $('#reg-qq').value.trim();
      const errEl = $('#reg-error');
      errEl.textContent = '';
      if (!/^\d{5,12}$/.test(qq)) { errEl.textContent = '请先输入5-12位纯数字QQ号'; return; }
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
        } else sendCodeBtn.textContent = left + 's';
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
    if (!/^\d{5,12}$/.test(qq)) { errEl.textContent = '请输入5-12位纯数字QQ号'; return; }
    if (!/^\d{6}$/.test(code)) { errEl.textContent = '请输入6位邮箱验证码'; return; }
    if (password !== password2) { errEl.textContent = '两次密码不一致'; return; }
    const res = await API.register(qq, nickname, password, code);
    if (!res.ok) { errEl.textContent = res.error; return; }
    Storage.setToken(res.token, true);
    Storage.setUser(res.user);
    showMainPage();
    loadUserInfo();
    loadBoards();
  });

  hamburgerBtn.addEventListener('click', openSidebar);
  sidebarClose.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);

  $$('.sidebar-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      switchContentPage(page);
      $$('.sidebar-item').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      closeSidebar();
      if (page === 'tieba') loadBoards();
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

  $$('[data-action="logout"]').forEach((btn) => btn.addEventListener('click', doLogout));

  $('#chat-send').addEventListener('click', sendChatMsg);
  $('#chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMsg(); });

  const backBoards = $('#back-to-boards');
  if (backBoards) backBoards.addEventListener('click', () => { switchContentPage('tieba'); loadBoards(); });
  const backBoard = $('#back-to-board');
  if (backBoard) backBoard.addEventListener('click', () => { if (currentBoardId) openBoard(currentBoardId, currentBoardName); });

  const newPostBtn = $('#new-post-btn');
  if (newPostBtn) newPostBtn.addEventListener('click', openCompose);
  const composeCancel = $('#compose-cancel');
  if (composeCancel) composeCancel.addEventListener('click', closeCompose);
  if (composeModal) composeModal.querySelector('.modal-overlay').addEventListener('click', closeCompose);
  const composeSubmit = $('#compose-submit');
  if (composeSubmit) composeSubmit.addEventListener('click', submitPost);
  const replyBtn = $('#reply-btn');
  if (replyBtn) replyBtn.addEventListener('click', submitReply);
}

function switchTab(tab) {
  $$('.modal-tabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  loginForm.classList.toggle('hidden', tab !== 'login');
  registerForm.classList.toggle('hidden', tab !== 'register');
  $('#login-error').textContent = '';
  $('#reg-error').textContent = '';
}

function openSidebar() { sidebar.classList.add('open'); sidebarOverlay.classList.add('show'); }
function closeSidebar() { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('show'); }
function closeUserDropdown() { userDropdown.classList.add('hidden'); }

function switchContentPage(page) {
  $$('.content-page').forEach((p) => p.classList.remove('active'));
  const target = $('#page-' + page);
  if (target) target.classList.add('active');
  $$('.sidebar-item').forEach((i) => i.classList.toggle('active', i.dataset.page === page));
  if (page === 'profile') renderProfile();
  if (page === 'tieba') currentPostId = null;
}

async function loadBoards() {
  const list = $('#boards-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-list">加载中...</div>';
  const boards = await API.listBoards();
  if (!boards.length) { list.innerHTML = '<div class="empty-list">暂无板块</div>'; return; }
  list.innerHTML = boards.map((b) => {
    const icon = b.icon || '📌';
    const count = b.post_count != null ? b.post_count : (b.count || 0);
    const desc = b.description || '';
    return '<div class="board-row" data-id="' + b.id + '" data-name="' + escapeHtml(b.name) + '">' +
      '<div class="board-icon">' + icon + '</div>' +
      '<div class="board-info"><div class="board-name">' + escapeHtml(b.name) + '</div>' +
      '<div class="board-desc">' + escapeHtml(desc) + '</div></div>' +
      '<div class="board-meta">' + count + ' 帖</div></div>';
  }).join('');
  list.querySelectorAll('.board-row').forEach((row) => {
    row.addEventListener('click', () => openBoard(row.dataset.id, row.dataset.name));
  });
}

async function openBoard(boardId, boardName) {
  currentBoardId = boardId;
  currentBoardName = boardName || boardId;
  currentPostId = null;
  switchContentPage('board');
  $('#board-title').textContent = currentBoardName;
  const list = $('#posts-list');
  list.innerHTML = '<div class="empty-list">加载中...</div>';
  const posts = await API.listPosts(boardId);
  if (!posts.length) { list.innerHTML = '<div class="empty-list">还没有帖子，来发第一个吧</div>'; return; }
  list.innerHTML = posts.map((p) => {
    const pin = p.is_pinned ? '<span class="pin">置顶</span>' : '';
    const time = formatTime(p.updated_at || p.created_at);
    return '<div class="post-row" data-id="' + p.id + '">' +
      '<div class="post-main"><div class="post-title">' + pin + escapeHtml(p.title) + '</div>' +
      '<div class="post-sub"><span>' + escapeHtml(p.nickname || '') + '</span><span>' + time + '</span></div></div>' +
      '<div class="post-stats"><span class="num">' + (p.reply_count || 0) + '</span>回复</div></div>';
  }).join('');
  list.querySelectorAll('.post-row').forEach((row) => {
    row.addEventListener('click', () => openPost(row.dataset.id));
  });
}

async function openPost(postId) {
  currentPostId = postId;
  switchContentPage('post-detail');
  const box = $('#post-detail');
  box.innerHTML = '<div class="empty-list">加载中...</div>';
  const data = await API.getPost(postId);
  if (!data || !data.post) { box.innerHTML = '<div class="empty-list">帖子不存在</div>'; return; }
  const p = data.post;
  const comments = data.comments || [];
  let html = '<div class="pd-title">' + escapeHtml(p.title) + '</div>' +
    '<div class="pd-meta">' + escapeHtml(p.nickname || '') + ' · ' + formatTime(p.created_at) +
    ' · ' + (p.view_count || 0) + ' 阅读 · ' + (p.reply_count || 0) + ' 回复</div>' +
    '<div class="pd-content">' + escapeHtml(p.content) + '</div>';
  if (comments.length) {
    html += comments.map((c, i) =>
      '<div class="comment-item"><div class="comment-meta">' + (i + 1) + '楼 · ' +
      escapeHtml(c.nickname || '') + ' · ' + formatTime(c.created_at) + '</div>' +
      '<div class="comment-body">' + escapeHtml(c.content) + '</div></div>'
    ).join('');
  } else {
    html += '<div class="empty-list" style="padding:1rem 0">暂无回复</div>';
  }
  box.innerHTML = html;
  $('#reply-content').value = '';
}

function openCompose() {
  if (!currentBoardId) return;
  $('#compose-title').value = '';
  $('#compose-content').value = '';
  $('#compose-error').textContent = '';
  composeModal.classList.remove('hidden');
}
function closeCompose() { composeModal.classList.add('hidden'); }

async function submitPost() {
  const title = $('#compose-title').value.trim();
  const content = $('#compose-content').value.trim();
  const err = $('#compose-error');
  err.textContent = '';
  if (title.length < 2) { err.textContent = '标题至少2个字'; return; }
  if (!content) { err.textContent = '请填写内容'; return; }
  const res = await API.createPost(currentBoardId, title, content);
  if (!res.ok) { err.textContent = res.error || '发帖失败'; return; }
  closeCompose();
  openBoard(currentBoardId, currentBoardName);
}

async function submitReply() {
  if (!currentPostId) return;
  const content = $('#reply-content').value.trim();
  if (!content) return;
  const res = await API.createComment(currentPostId, content);
  if (!res.ok) { alert(res.error || '回复失败'); return; }
  openPost(currentPostId);
}

function loadUserInfo() {
  const user = Storage.getUser();
  if (!user) return;
  const first = (user.nickname || 'U')[0].toUpperCase();
  userAvatar.src = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#a78bfa"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="42" font-family="sans-serif" font-weight="600">' + first + '</text></svg>'
  );
  userAvatar.alt = user.nickname;
  const nickInput = $('#setting-nickname');
  if (nickInput) nickInput.value = user.nickname || '';
}

function renderProfile() {
  const user = Storage.getUser();
  if (!user) return;
  const card = $('#profile-card');
  const first = (user.nickname || 'U')[0].toUpperCase();
  card.innerHTML = '<img class="big-avatar" src="data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#a78bfa"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="42" font-family="sans-serif" font-weight="600">' + first + '</text></svg>'
  ) + '" alt="头像" /><div class="nickname">' + escapeHtml(user.nickname) + '</div><div class="uid">UID: ' + user.uid + '</div><div class="uid" style="margin-top:0.5rem">' + escapeHtml(user.email) + '</div>';
}

function doLogout() {
  API.logout();
  showWelcomePage();
  loginForm.reset();
  registerForm.reset();
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
  return String(str).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
}

function formatTime(t) {
  if (!t) return '';
  try {
    const d = new Date(String(t).replace(' ', 'T') + (String(t).endsWith('Z') ? '' : 'Z'));
    if (isNaN(d.getTime())) return String(t).slice(0, 16);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  } catch { return String(t).slice(0, 16); }
}

document.addEventListener('DOMContentLoaded', init);

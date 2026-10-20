/**
 * 安福二中论坛 - 告白墙频道式贴吧
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
let currentBoardId = '';
let currentPostId = null;
let currentTab = 'all';

function init() {
  if (Storage.isLoggedIn()) { forceMainPage(); loadUserInfo(); loadWallFeed(); }
  else forceWelcomePage();
  bindEvents();
}
function forceWelcomePage() {
  if (welcomePage) { welcomePage.classList.add('active'); welcomePage.style.display = 'flex'; }
  if (mainPage) { mainPage.classList.remove('active'); mainPage.style.display = 'none'; }
  if (authModal) authModal.classList.add('hidden');
}
function forceMainPage() {
  if (welcomePage) { welcomePage.classList.remove('active'); welcomePage.style.display = 'none'; }
  if (mainPage) { mainPage.classList.add('active'); mainPage.style.display = 'block'; }
  if (authModal) authModal.classList.add('hidden');
  closeSidebar(); closeUserDropdown();
}
function openAuthModal() { authModal.classList.remove('hidden'); switchTab('login'); }
function closeAuthModal() { authModal.classList.add('hidden'); }

function bindEvents() {
  if (enterBtn) enterBtn.addEventListener('click', () => {
    if (Storage.isLoggedIn()) { forceMainPage(); loadUserInfo(); loadWallFeed(); }
    else openAuthModal();
  });
  const overlay = authModal && authModal.querySelector('.modal-overlay');
  if (overlay) overlay.addEventListener('click', closeAuthModal);
  $$('.modal-tabs .tab').forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
  if (loginForm) loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qq = $('#login-qq').value.trim();
    const password = $('#login-password').value;
    const remember = $('#remember-me') && $('#remember-me').checked;
    const errEl = $('#login-error');
    if (errEl) errEl.textContent = '';
    if (!/^\d{5,12}$/.test(qq)) { if (errEl) errEl.textContent = '请输入5-12位纯数字QQ号'; return; }
    const res = await API.login(qq, password);
    if (!res.ok) { if (errEl) errEl.textContent = res.error; return; }
    Storage.setToken(res.token, remember); Storage.setUser(res.user);
    forceMainPage(); loadUserInfo(); loadWallFeed();
  });
  const sendCodeBtn = $('#send-code-btn');
  if (sendCodeBtn) sendCodeBtn.addEventListener('click', async () => {
    const qq = $('#reg-qq').value.trim();
    const errEl = $('#reg-error');
    if (errEl) errEl.textContent = '';
    if (!/^\d{5,12}$/.test(qq)) { if (errEl) errEl.textContent = '请先输入5-12位纯数字QQ号'; return; }
    sendCodeBtn.disabled = true; sendCodeBtn.textContent = '发送中...';
    const res = await API.sendCode(qq, 'register');
    if (!res.ok) { if (errEl) errEl.textContent = res.error; sendCodeBtn.disabled = false; sendCodeBtn.textContent = '获取验证码'; return; }
    if (errEl) {
      if (res.dev_code) { errEl.textContent = '开发模式验证码：' + res.dev_code; errEl.style.color = '#0099ff'; }
      else { errEl.textContent = res.message || '验证码已发送'; errEl.style.color = '#16a34a'; }
    }
    let left = 60; sendCodeBtn.textContent = left + 's';
    const timer = setInterval(() => {
      left--;
      if (left <= 0) { clearInterval(timer); sendCodeBtn.disabled = false; sendCodeBtn.textContent = '获取验证码'; }
      else sendCodeBtn.textContent = left + 's';
    }, 1000);
  });
  if (registerForm) registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qq = $('#reg-qq').value.trim();
    const nickname = $('#reg-nickname').value.trim();
    const password = $('#reg-password').value;
    const password2 = $('#reg-password2').value;
    const code = ($('#reg-code') && $('#reg-code').value.trim()) || '';
    const errEl = $('#reg-error');
    if (errEl) { errEl.style.color = '#dc2626'; errEl.textContent = ''; }
    if (!/^\d{5,12}$/.test(qq)) { if (errEl) errEl.textContent = '请输入5-12位纯数字QQ号'; return; }
    if (!/^\d{6}$/.test(code)) { if (errEl) errEl.textContent = '请输入6位邮箱验证码'; return; }
    if (password !== password2) { if (errEl) errEl.textContent = '两次密码不一致'; return; }
    const res = await API.register(qq, nickname, password, code);
    if (!res.ok) { if (errEl) errEl.textContent = res.error; return; }
    Storage.setToken(res.token, true); Storage.setUser(res.user);
    forceMainPage(); loadUserInfo(); loadWallFeed();
  });
  if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
  if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  $$('.sidebar-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      switchContentPage(page);
      $$('.sidebar-item').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      closeSidebar();
      if (page === 'tieba') loadWallFeed();
    });
  });
  if (userAvatar) userAvatar.addEventListener('click', (e) => { e.stopPropagation(); if (userDropdown) userDropdown.classList.toggle('hidden'); });
  document.addEventListener('click', () => closeUserDropdown());
  if (userDropdown) userDropdown.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (action === 'logout') doLogout();
    else if (action === 'profile') { switchContentPage('profile'); closeUserDropdown(); }
    else if (action === 'settings') { switchContentPage('settings'); closeUserDropdown(); }
  });
  $$('[data-action="logout"]').forEach((btn) => btn.addEventListener('click', doLogout));
  const chatSend = $('#chat-send');
  if (chatSend) chatSend.addEventListener('click', sendChatMsg);
  const chatInput = $('#chat-input');
  if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMsg(); });
  $$('.wall-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.wall-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab || '';
      currentBoardId = tab.dataset.board || '';
      loadWallFeed();
    });
  });
  const backWall = $('#back-to-wall');
  if (backWall) backWall.addEventListener('click', () => { switchContentPage('tieba'); loadWallFeed(); });
  const openCompose = () => {
    const c = $('#compose-content'); const e = $('#compose-error'); const b = $('#compose-board');
    if (c) c.value = ''; if (e) e.textContent = '';
    if (b && currentBoardId) b.value = currentBoardId;
    if (composeModal) composeModal.classList.remove('hidden');
  };
  const wallOpen = $('#wall-compose-open');
  const wallPlus = $('#wall-plus');
  if (wallOpen) wallOpen.addEventListener('click', openCompose);
  if (wallPlus) wallPlus.addEventListener('click', openCompose);
  const assistant = $('#wall-assistant');
  if (assistant) assistant.addEventListener('click', () => alert('频道助手：可在此查看规则、联系管理。'));
  const composeCancel = $('#compose-cancel');
  if (composeCancel) composeCancel.addEventListener('click', closeCompose);
  if (composeModal) {
    const co = composeModal.querySelector('.modal-overlay');
    if (co) co.addEventListener('click', closeCompose);
  }
  const composeSubmit = $('#compose-submit');
  if (composeSubmit) composeSubmit.addEventListener('click', submitPost);
  const replyBtn = $('#reply-btn');
  if (replyBtn) replyBtn.addEventListener('click', submitReply);
}
function switchTab(tab) {
  $$('.modal-tabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  if (loginForm) loginForm.classList.toggle('hidden', tab !== 'login');
  if (registerForm) registerForm.classList.toggle('hidden', tab !== 'register');
  const le = $('#login-error'); const re = $('#reg-error');
  if (le) le.textContent = ''; if (re) re.textContent = '';
}
function openSidebar() { if (sidebar) sidebar.classList.add('open'); if (sidebarOverlay) sidebarOverlay.classList.add('show'); }
function closeSidebar() { if (sidebar) sidebar.classList.remove('open'); if (sidebarOverlay) sidebarOverlay.classList.remove('show'); }
function closeUserDropdown() { if (userDropdown) userDropdown.classList.add('hidden'); }
function switchContentPage(page) {
  $$('.content-page').forEach((p) => p.classList.remove('active'));
  const target = $('#page-' + page);
  if (target) target.classList.add('active');
  $$('.sidebar-item').forEach((i) => i.classList.toggle('active', i.dataset.page === page));
  if (page === 'profile') renderProfile();
  const bar = document.querySelector('.wall-bottom-bar');
  if (bar) bar.style.display = page === 'tieba' ? 'flex' : 'none';
}
function avatarDataUrl(name) {
  const first = (name || 'U')[0].toUpperCase();
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#12B7F5"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="42" font-family="sans-serif" font-weight="600">' + first + '</text></svg>');
}
function uidToLv(uid) {
  if (!uid) return 1;
  const n = parseInt(String(uid).replace(/\D/g, ''), 10) || 1;
  return Math.min(99, Math.max(1, (n % 20) + 1));
}
async function loadWallFeed() {
  const feed = $('#wall-feed');
  if (!feed) return;
  feed.innerHTML = '<div class="empty-list">加载中...</div>';
  let posts = [];
  try { posts = await API.listPosts(currentBoardId || ''); } catch (e) { posts = []; }
  if (currentTab === 'hot' && posts.length) {
    posts = posts.slice().sort((a, b) => (b.reply_count || 0) + (b.view_count || 0) - ((a.reply_count || 0) + (a.view_count || 0)));
  }
  if (currentTab === 'essence' && posts.length) {
    posts = posts.filter((p) => p.is_pinned);
    if (!posts.length) { feed.innerHTML = '<div class="empty-list">暂无精华帖</div>'; return; }
  }
  if (!posts.length) {
    feed.innerHTML = '<div class="empty-list">还没有分享，点下方「期待你的分享」发第一条吧</div>';
    return;
  }
  feed.innerHTML = posts.map((p) => {
    const time = formatTime(p.created_at || p.updated_at);
    const body = p.content || p.title || '';
    const lv = uidToLv(p.uid);
    return '<article class="wall-card" data-id="' + p.id + '">' +
      '<div class="wall-card-hd"><img class="wall-avatar" src="' + avatarDataUrl(p.nickname) + '" alt="" />' +
      '<div class="wall-meta"><div class="wall-name-row"><span class="wall-nick">' + escapeHtml(p.nickname || '用户') +
      '</span><span class="wall-lv">LV' + lv + '</span></div><div class="wall-time">' + time + '</div></div></div>' +
      '<div class="wall-body">' + escapeHtml(body) + '</div>' +
      '<div class="wall-ft"><span class="wall-views">浏览' + (p.view_count || 0) + '</span>' +
      '<div class="wall-acts"><span>😊</span><span>💬</span><span>↗</span></div></div></article>';
  }).join('');
  feed.querySelectorAll('.wall-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.wall-acts')) return;
      openPost(card.dataset.id);
    });
  });
}
async function openPost(postId) {
  currentPostId = postId;
  switchContentPage('post-detail');
  const box = $('#post-detail');
  if (!box) return;
  box.innerHTML = '<div class="empty-list">加载中...</div>';
  const data = await API.getPost(postId);
  if (!data || !data.post) { box.innerHTML = '<div class="empty-list">帖子不存在</div>'; return; }
  const p = data.post;
  const comments = data.comments || [];
  const body = p.content || p.title || '';
  let html = '<div class="wall-card-hd"><img class="wall-avatar" src="' + avatarDataUrl(p.nickname) + '" alt="" />' +
    '<div class="wall-meta"><div class="wall-name-row"><span class="wall-nick">' + escapeHtml(p.nickname || '') +
    '</span><span class="wall-lv">LV' + uidToLv(p.uid) + '</span></div><div class="wall-time">' + formatTime(p.created_at) +
    '</div></div></div><div class="wall-body" style="margin-left:0">' + escapeHtml(body) + '</div>' +
    '<div class="wall-views" style="margin:8px 0 16px">浏览' + (p.view_count || 0) + ' · 评论' + (p.reply_count || 0) +
    '</div><div class="channel-comments-title">全部评论</div>';
  if (comments.length) {
    html += comments.map((c) =>
      '<div class="channel-comment"><img class="wall-avatar sm" src="' + avatarDataUrl(c.nickname) + '" alt="" />' +
      '<div class="channel-comment-main"><div class="wall-nick">' + escapeHtml(c.nickname || '') +
      ' <span class="wall-time">' + formatTime(c.created_at) + '</span></div>' +
      '<div class="channel-comment-text">' + escapeHtml(c.content) + '</div></div></div>'
    ).join('');
  } else html += '<div class="empty-list" style="padding:1rem 0">暂无评论，来抢沙发</div>';
  box.innerHTML = html;
  const rc = $('#reply-content'); if (rc) rc.value = '';
}
function closeCompose() { if (composeModal) composeModal.classList.add('hidden'); }
async function submitPost() {
  const content = ($('#compose-content') && $('#compose-content').value.trim()) || '';
  const board = ($('#compose-board') && $('#compose-board').value) || 'daily';
  const err = $('#compose-error');
  if (err) err.textContent = '';
  if (!content) { if (err) err.textContent = '请填写内容'; return; }
  const title = content.length > 20 ? content.slice(0, 20) + '…' : content;
  const res = await API.createPost(board || 'daily', title, content);
  if (!res.ok) {
    if (String(res.error || '').includes('板块')) {
      const boards = await API.listBoards();
      const bid = (boards[0] && boards[0].id) || 'daily';
      const res2 = await API.createPost(bid, title, content);
      if (!res2.ok) { if (err) err.textContent = res2.error || '发帖失败'; return; }
    } else { if (err) err.textContent = res.error || '发帖失败'; return; }
  }
  closeCompose(); switchContentPage('tieba'); loadWallFeed();
}
async function submitReply() {
  if (!currentPostId) return;
  const content = ($('#reply-content') && $('#reply-content').value.trim()) || '';
  if (!content) return;
  const res = await API.createComment(currentPostId, content);
  if (!res.ok) { alert(res.error || '回复失败'); return; }
  openPost(currentPostId);
}
function loadUserInfo() {
  const user = Storage.getUser();
  if (!user || !userAvatar) return;
  userAvatar.src = avatarDataUrl(user.nickname);
  userAvatar.alt = user.nickname || '';
  const nickInput = $('#setting-nickname');
  if (nickInput) nickInput.value = user.nickname || '';
}
function renderProfile() {
  const user = Storage.getUser();
  if (!user) return;
  const card = $('#profile-card');
  if (!card) return;
  card.innerHTML = '<img class="big-avatar" src="' + avatarDataUrl(user.nickname) + '" alt="" /><div class="nickname">' +
    escapeHtml(user.nickname) + '</div><div class="uid">UID: ' + user.uid +
    '</div><div class="uid" style="margin-top:0.5rem">' + escapeHtml(user.email) + '</div>';
}
function doLogout() {
  API.logout(); forceWelcomePage();
  if (loginForm) loginForm.reset();
  if (registerForm) registerForm.reset();
}
function sendChatMsg() {
  const input = $('#chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  const msgEl = document.createElement('div');
  msgEl.className = 'msg self'; msgEl.textContent = text;
  const box = $('#chat-messages');
  if (box) { box.appendChild(msgEl); msgEl.scrollIntoView({ behavior: 'smooth' }); }
  input.value = '';
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
    const now = new Date(); const diff = (now - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  } catch { return String(t).slice(0, 16); }
}
document.addEventListener('DOMContentLoaded', init);

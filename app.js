/** 安福二中论坛 - 贴吧+匿名墙+热门+跳蚤市场 */
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
let composeMode = 'normal';

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
function openAuthModal() { authModal.classList.remove('hidden'); switchAuthTab('login'); }
function closeAuthModal() { authModal.classList.add('hidden'); }

function bindEvents() {
  if (enterBtn) enterBtn.addEventListener('click', () => {
    if (Storage.isLoggedIn()) { forceMainPage(); loadUserInfo(); loadWallFeed(); }
    else openAuthModal();
  });
  const overlay = authModal && authModal.querySelector('.modal-overlay');
  if (overlay) overlay.addEventListener('click', closeAuthModal);
  $$('.modal-tabs .tab').forEach((tab) => tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab)));
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
      if (page === 'anonymous') loadAnonFeed();
      if (page === 'market') loadMarket();
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
  if (backWall) backWall.addEventListener('click', () => {
    const last = document.querySelector('.sidebar-item.active');
    const page = (last && last.dataset.page) || 'tieba';
    if (page === 'anonymous') { switchContentPage('anonymous'); loadAnonFeed(); }
    else { switchContentPage('tieba'); loadWallFeed(); }
  });
  const openComposeNormal = () => openCompose('normal');
  const openComposeAnon = () => openCompose('anonymous');
  if ($('#wall-compose-open')) $('#wall-compose-open').addEventListener('click', openComposeNormal);
  if ($('#wall-plus')) $('#wall-plus').addEventListener('click', openComposeNormal);
  if ($('#anon-compose-open')) $('#anon-compose-open').addEventListener('click', openComposeAnon);
  if ($('#anon-plus')) $('#anon-plus').addEventListener('click', openComposeAnon);
  const assistantMsg = () => alert('论坛助手：文明发言；寻物招领请写清地点特征；匿名墙禁止人身攻击。');
  if ($('#wall-assistant')) $('#wall-assistant').addEventListener('click', assistantMsg);
  if ($('#anon-assistant')) $('#anon-assistant').addEventListener('click', assistantMsg);
  if ($('#compose-cancel')) $('#compose-cancel').addEventListener('click', closeCompose);
  if (composeModal) {
    const co = composeModal.querySelector('.modal-overlay');
    if (co) co.addEventListener('click', closeCompose);
  }
  if ($('#compose-submit')) $('#compose-submit').addEventListener('click', submitPost);
  if ($('#reply-btn')) $('#reply-btn').addEventListener('click', submitReply);
  const marketPub = $('#market-publish-btn');
  if (marketPub) marketPub.addEventListener('click', openMarketModal);
  const marketCancel = $('#market-cancel');
  if (marketCancel) marketCancel.addEventListener('click', closeMarketModal);
  const marketModal = $('#market-modal');
  if (marketModal) {
    const mo = marketModal.querySelector('.modal-overlay');
    if (mo) mo.addEventListener('click', closeMarketModal);
  }
  const marketSubmit = $('#market-submit');
  if (marketSubmit) marketSubmit.addEventListener('click', submitMarket);
  const marketSearchBtn = $('#market-search-btn');
  if (marketSearchBtn) marketSearchBtn.addEventListener('click', () => {
    const q = ($('#market-search') && $('#market-search').value.trim()) || '';
    loadMarket(q);
  });
  const marketSearch = $('#market-search');
  if (marketSearch) marketSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadMarket(marketSearch.value.trim());
  });
  const backMarket = $('#back-to-market');
  if (backMarket) backMarket.addEventListener('click', () => {
    switchContentPage('market');
    loadMarket();
  });
}
function switchAuthTab(tab) {
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
  const wallBar = document.querySelector('#page-tieba .wall-bottom-bar');
  const anonBar = $('#anon-bottom-bar');
  if (wallBar) wallBar.style.display = page === 'tieba' ? 'flex' : 'none';
  if (anonBar) anonBar.style.display = page === 'anonymous' ? 'flex' : 'none';
}
function avatarDataUrl(name) {
  const first = (name || '匿')[0].toUpperCase();
  const color = name === '匿名用户' ? '#94a3b8' : '#12B7F5';
  return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="' + color + '"/><text x="50" y="62" text-anchor="middle" fill="white" font-size="42" font-family="sans-serif" font-weight="600">' + first + '</text></svg>');
}
function displayName(p) {
  if (p.is_anonymous || p.board_id === 'anonymous') return '匿名用户';
  return p.nickname || '用户';
}
function renderFeedCards(posts, container) {
  if (!container) return;
  if (!posts.length) { container.innerHTML = '<div class="empty-list">还没有内容，点下方发第一条吧</div>'; return; }
  container.innerHTML = posts.map((p) => {
    const time = formatTime(p.created_at || p.updated_at);
    const body = p.content || p.title || '';
    const name = displayName(p);
    const likes = p.like_count || 0;
    const anonTag = (p.is_anonymous || p.board_id === 'anonymous') ? '<span class="wall-anon-tag">匿名</span>' : '';
    return '<article class="wall-card" data-id="' + p.id + '">' +
      '<div class="wall-card-hd"><img class="wall-avatar" src="' + avatarDataUrl(name) + '" alt="" />' +
      '<div class="wall-meta"><div class="wall-name-row"><span class="wall-nick">' + escapeHtml(name) + '</span>' + anonTag +
      '</div><div class="wall-time">' + time + '</div></div></div>' +
      '<div class="wall-body">' + escapeHtml(body) + '</div>' +
      '<div class="wall-ft"><span class="wall-views">浏览' + (p.view_count || 0) + '</span>' +
      '<div class="wall-acts"><span class="act-like" data-id="' + p.id + '">👍 ' + likes + '</span>' +
      '<span>💬 ' + (p.reply_count || 0) + '</span><span>↗</span></div></div></article>';
  }).join('');
  container.querySelectorAll('.wall-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.wall-acts')) return;
      openPost(card.dataset.id);
    });
  });
  container.querySelectorAll('.act-like').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const res = await API.likePost(btn.dataset.id);
      if (res.ok) btn.textContent = '👍 ' + (res.like_count != null ? res.like_count : '');
      else alert(res.error || '点赞失败');
    });
  });
}
async function loadWallFeed() {
  const feed = $('#wall-feed');
  if (!feed) return;
  feed.innerHTML = '<div class="empty-list">加载中...</div>';
  let posts = [];
  try {
    if (currentTab === 'hot') posts = await API.listPosts('', { hot: true });
    else if (currentBoardId) posts = await API.listPosts(currentBoardId);
    else posts = await API.listPosts('');
  } catch (e) { posts = []; }
  if (currentTab === 'hot') {
    posts = posts.filter((p) => (p.like_count || 0) >= 5);
    if (!posts.length) { feed.innerHTML = '<div class="empty-list">暂无热门帖（需满 5 个赞）</div>'; return; }
  }
  renderFeedCards(posts, feed);
}
async function loadAnonFeed() {
  const feed = $('#anon-feed');
  if (!feed) return;
  feed.innerHTML = '<div class="empty-list">加载中...</div>';
  let posts = [];
  try { posts = await API.listPosts('anonymous'); } catch (e) { posts = []; }
  renderFeedCards(posts, feed);
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
  const name = displayName(p);
  let html = '<div class="wall-card-hd"><img class="wall-avatar" src="' + avatarDataUrl(name) + '" alt="" />' +
    '<div class="wall-meta"><div class="wall-name-row"><span class="wall-nick">' + escapeHtml(name) + '</span>' +
    ((p.is_anonymous || p.board_id === 'anonymous') ? '<span class="wall-anon-tag">匿名</span>' : '') +
    '</div><div class="wall-time">' + formatTime(p.created_at) + '</div></div></div>' +
    '<div class="wall-body" style="margin-left:0">' + escapeHtml(body) + '</div>' +
    '<div class="wall-views" style="margin:8px 0 16px">浏览' + (p.view_count || 0) + ' · 赞' + (p.like_count || 0) + ' · 评论' + (p.reply_count || 0) +
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
function openCompose(mode) {
  composeMode = mode || 'normal';
  const c = $('#compose-content'); const e = $('#compose-error'); const b = $('#compose-board');
  const row = $('#compose-anon-row');
  const title = composeModal && composeModal.querySelector('h3');
  if (c) c.value = ''; if (e) e.textContent = '';
  if (composeMode === 'anonymous') {
    if (b) { b.value = 'anonymous'; b.disabled = true; }
    if (row) row.style.display = 'block';
    if (title) title.textContent = '匿名发布';
  } else {
    if (b) {
      b.disabled = false;
      if (currentBoardId && currentBoardId !== 'anonymous') b.value = currentBoardId;
      else b.value = 'daily';
    }
    if (row) row.style.display = 'none';
    if (title) title.textContent = '发布分享';
  }
  if (composeModal) composeModal.classList.remove('hidden');
}
function closeCompose() {
  if (composeModal) composeModal.classList.add('hidden');
  const b = $('#compose-board'); if (b) b.disabled = false;
}
async function submitPost() {
  const content = ($('#compose-content') && $('#compose-content').value.trim()) || '';
  let board = ($('#compose-board') && $('#compose-board').value) || 'daily';
  const err = $('#compose-error');
  if (err) err.textContent = '';
  if (!content) { if (err) err.textContent = '请填写内容'; return; }
  const isAnon = composeMode === 'anonymous';
  if (isAnon) board = 'anonymous';
  const title = content.length > 20 ? content.slice(0, 20) + '…' : content;
  const res = await API.createPost(board, title, content, isAnon);
  if (!res.ok) { if (err) err.textContent = res.error || '发帖失败'; return; }
  closeCompose();
  if (isAnon) { switchContentPage('anonymous'); loadAnonFeed(); }
  else { switchContentPage('tieba'); loadWallFeed(); }
}
async function submitReply() {
  if (!currentPostId) return;
  const content = ($('#reply-content') && $('#reply-content').value.trim()) || '';
  if (!content) return;
  const res = await API.createComment(currentPostId, content);
  if (!res.ok) { alert(res.error || '回复失败'); return; }
  openPost(currentPostId);
}
async function loadMarket(q) {
  const list = $('#market-list');
  if (!list) return;
  list.innerHTML = '<div class="empty-tip">加载中...</div>';
  const items = await API.listMarket(q || '');
  if (!items.length) {
    list.innerHTML = '<div class="empty-tip">暂无闲置，点右上角「发布闲置」上架吧</div>';
    return;
  }
  list.innerHTML = items.map((it) => {
    const price = Number(it.price);
    const priceStr = isNaN(price) ? '—' : (price % 1 === 0 ? String(price) : price.toFixed(2));
    return '<article class="market-card" data-id="' + it.id + '">' +
      '<div class="market-card-img">📦</div>' +
      '<div class="market-card-body">' +
      '<div class="market-card-title">' + escapeHtml(it.title || '') + '</div>' +
      '<div class="market-card-price"><small>¥</small>' + priceStr + '</div>' +
      '<div class="market-card-seller">' + escapeHtml(it.nickname || '卖家') + '</div>' +
      '</div></article>';
  }).join('');
  list.querySelectorAll('.market-card').forEach((card) => {
    card.addEventListener('click', () => openMarketDetail(card.dataset.id));
  });
}
async function openMarketDetail(id) {
  switchContentPage('market-detail');
  const box = $('#market-detail');
  if (!box) return;
  box.innerHTML = '<div class="empty-tip">加载中...</div>';
  const data = await API.getMarketItem(id);
  if (!data || !data.item) {
    box.innerHTML = '<div class="empty-tip">商品不存在或已下架</div>';
    return;
  }
  const it = data.item;
  const price = Number(it.price);
  const priceStr = isNaN(price) ? '—' : (price % 1 === 0 ? String(price) : price.toFixed(2));
  const user = Storage.getUser();
  const isOwner = user && user.uid === it.uid;
  box.innerHTML =
    '<div class="market-detail-img">📦</div>' +
    '<div class="market-detail-price"><small style="font-size:16px">¥</small>' + priceStr + '</div>' +
    '<div class="market-detail-title">' + escapeHtml(it.title || '') + '</div>' +
    '<div class="market-detail-desc">' + escapeHtml(it.description || '暂无描述') + '</div>' +
    '<div class="market-detail-seller">' +
    '<img class="wall-avatar sm" src="' + avatarDataUrl(it.nickname) + '" alt="" />' +
    '<div><div class="wall-nick">' + escapeHtml(it.nickname || '') + '</div>' +
    '<div class="wall-time">UID ' + escapeHtml(it.uid || '') + ' · ' + formatTime(it.created_at) + '</div></div></div>' +
    (isOwner && it.status === 'available'
      ? '<button type="button" class="btn-secondary" style="margin-top:1rem;width:100%" id="market-sold-btn" data-id="' + it.id + '">标记为已售出</button>'
      : '') +
    (it.status === 'sold' ? '<p class="hint" style="margin-top:1rem;color:#ff5000">该商品已售出</p>' : '');
  const soldBtn = $('#market-sold-btn');
  if (soldBtn) {
    soldBtn.addEventListener('click', async () => {
      const res = await API.soldMarketItem(soldBtn.dataset.id);
      if (!res.ok) { alert(res.error || '操作失败'); return; }
      openMarketDetail(id);
    });
  }
}
function openMarketModal() {
  if ($('#market-title')) $('#market-title').value = '';
  if ($('#market-price')) $('#market-price').value = '';
  if ($('#market-desc')) $('#market-desc').value = '';
  if ($('#market-error')) $('#market-error').textContent = '';
  const m = $('#market-modal');
  if (m) m.classList.remove('hidden');
}
function closeMarketModal() {
  const m = $('#market-modal');
  if (m) m.classList.add('hidden');
}
async function submitMarket() {
  const title = ($('#market-title') && $('#market-title').value.trim()) || '';
  const price = $('#market-price') && $('#market-price').value;
  const description = ($('#market-desc') && $('#market-desc').value.trim()) || '';
  const err = $('#market-error');
  if (err) err.textContent = '';
  if (title.length < 2) { if (err) err.textContent = '标题至少2个字'; return; }
  if (price === '' || price === null) { if (err) err.textContent = '请填写价格'; return; }
  const res = await API.createMarketItem(title, price, description);
  if (!res.ok) { if (err) err.textContent = res.error || '发布失败'; return; }
  closeMarketModal();
  switchContentPage('market');
  loadMarket();
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

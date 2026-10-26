/** 安福二中论坛 - 独立前端 */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
let currentBoardId = '', currentPostId = null, currentTab = 'all', composeMode = 'normal';
let lastFeedPage = 'tieba', __bound = false, replyToCommentId = null;

function forceWelcomePage() {
  const w = $('#welcome-page'), m = $('#main-page'), a = $('#auth-modal');
  if (w) { w.classList.add('active'); w.style.display = 'flex'; }
  if (m) { m.classList.remove('active'); m.style.display = 'none'; }
  if (a) a.classList.add('hidden');
}
function forceMainPage() {
  const w = $('#welcome-page'), m = $('#main-page'), a = $('#auth-modal');
  if (w) { w.classList.remove('active'); w.style.display = 'none'; }
  if (m) { m.classList.add('active'); m.style.display = 'block'; }
  if (a) a.classList.add('hidden');
  closeSidebar(); closeUserDropdown();
}
function openAuthModal() { const a = $('#auth-modal'); if (a) a.classList.remove('hidden'); switchAuthTab('login'); }
function closeAuthModal() { const a = $('#auth-modal'); if (a) a.classList.add('hidden'); }
function switchAuthTab(tab) {
  $$('.modal-tabs .tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  const lf = $('#login-form'), rf = $('#register-form');
  if (lf) lf.classList.toggle('hidden', tab !== 'login');
  if (rf) rf.classList.toggle('hidden', tab !== 'register');
}
function openSidebar() { const s = $('#sidebar'), o = $('#sidebar-overlay'); if (s) s.classList.add('open'); if (o) o.classList.add('show'); }
function closeSidebar() { const s = $('#sidebar'), o = $('#sidebar-overlay'); if (s) s.classList.remove('open'); if (o) o.classList.remove('show'); }
function closeUserDropdown() { const d = $('#user-dropdown'); if (d) d.classList.add('hidden'); }
function avatarDataUrl(name) {
  const n = (name || '?').slice(0, 1);
  const c = ['#7c3aed','#12B7F5','#ec4899','#f59e0b','#10b981'][(n.charCodeAt(0) || 0) % 5];
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect fill="'+c+'" width="80" height="80"/><text x="40" y="52" text-anchor="middle" fill="#fff" font-size="32" font-family="sans-serif">'+n+'</text></svg>';
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>').replace(/"/g,'"');
}
function formatTime(t) {
  if (!t) return '';
  try {
    const d = new Date(String(t).replace(' ', 'T') + (String(t).endsWith('Z') ? '' : 'Z'));
    if (isNaN(d.getTime())) return String(t).slice(0, 16);
    const diff = (Date.now() - d) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
    return String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  } catch (e) { return String(t).slice(0, 16); }
}
function displayName(p) {
  if (p && (p.is_anonymous || p.board_id === 'anonymous')) return '匿名用户';
  return (p && p.nickname) || '用户';
}
function isStaffUser() { const u = Storage.getUser(); return u && (u.role === 'admin' || u.role === 'owner'); }
function updateAdminMenu() { const el = $('#sidebar-admin'); if (el) el.style.display = isStaffUser() ? 'flex' : 'none'; }
function loadUserInfo() {
  const user = Storage.getUser(), av = $('#user-avatar');
  if (!user || !av) return;
  av.src = avatarDataUrl(user.nickname); av.alt = user.nickname || '';
  updateAdminMenu();
}
async function refreshRole() {
  try {
    const p = await API.getProfile();
    if (p && p.role) { const u = Storage.getUser() || {}; u.role = p.role; Storage.setUser(u); updateAdminMenu(); }
  } catch (e) {}
}
function switchContentPage(page) {
  $$('.content-page').forEach((el) => el.classList.remove('active'));
  const el = $('#page-' + page); if (el) el.classList.add('active');
  $$('.sidebar-item').forEach((i) => i.classList.toggle('active', i.dataset.page === page));
  const title = $('#nav-title');
  const map = { tieba:'安福二中论坛', anonymous:'匿名墙', chat:'实时聊天', market:'跳蚤市场', profile:'个人信息', settings:'设置', admin:'管理面板', 'post-detail':'详情' };
  if (title) title.textContent = map[page] || '安福二中论坛';
  document.body.classList.toggle('theme-anon-dark', page === 'anonymous');
  closeSidebar();
}
function cardHtml(p, me) {
  const body = p.content || p.title || '';
  const need = body.length > 120;
  const short = need ? body.slice(0, 120) + '…' : body;
  const name = displayName(p);
  const anonTag = (p.is_anonymous || p.board_id === 'anonymous') ? '<span class="wall-anon-tag">匿名</span>' : '';
  const isMine = me && (p.uid === me.uid);
  const staff = me && (me.role === 'admin' || me.role === 'owner');
  let menu = '<div class="more-item" data-act="report" data-id="'+p.id+'">举报并表决</div>';
  if (isMine) menu += '<div class="more-item" data-act="withdraw" data-id="'+p.id+'">撤回帖子</div>';
  if (staff || isMine) menu += '<div class="more-item danger" data-act="delete" data-id="'+p.id+'">删除帖子</div>';
  return [
    '<article class="wall-card" data-id="'+p.id+'">',
    '<div class="wall-card-hd"><img class="wall-avatar" src="'+avatarDataUrl(name)+'" alt=""/>',
    '<div class="wall-meta"><div class="wall-name-row"><span class="wall-nick">'+escapeHtml(name)+'</span>'+anonTag+'</div>',
    '<div class="wall-time">'+formatTime(p.created_at||p.updated_at)+'</div></div>',
    '<div class="wall-card-actions"><button type="button" class="more-btn" data-id="'+p.id+'">⋯</button>',
    '<div class="more-menu hidden" data-menu="'+p.id+'">'+menu+'</div></div></div>',
    '<div class="wall-body"><span class="wall-body-text">'+escapeHtml(short)+'</span>',
    (need ? '<button type="button" class="expand-btn">展开</button>' : ''),
    '</div><div class="wall-ft"><span class="wall-views">浏览'+(p.view_count||0)+'</span>',
    '<div class="wall-acts"><span class="act-like" data-id="'+p.id+'">🤍 '+(p.like_count||0)+'</span>',
    '<span>💬 '+(p.reply_count||0)+'</span></div></div></article>'
  ].join('');
}
function renderFeedCards(posts, container) {
  if (!container) return;
  if (!posts || !posts.length) { container.innerHTML = '<div class="empty-list">还没有内容，点下方发第一条吧</div>'; return; }
  const me = Storage.getUser();
  container.innerHTML = posts.map((p) => cardHtml(p, me)).join('');
  container.querySelectorAll('.wall-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.wall-acts,.expand-btn,.more-btn,.more-menu,.vote-btns')) return;
      openPost(card.dataset.id);
    });
  });
  container.querySelectorAll('.expand-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const card = btn.closest('.wall-card');
      const post = posts.find((x) => String(x.id) === String(card && card.dataset.id));
      const t = btn.previousElementSibling;
      if (t && post) t.textContent = post.content || post.title || '';
      btn.remove();
    });
  });
  container.querySelectorAll('.act-like').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const res = await API.likePost(btn.dataset.id);
      if (res.ok) btn.innerHTML = (res.liked ? '❤️' : '🤍') + ' ' + (res.like_count != null ? res.like_count : '');
      else alert(res.error || '操作失败');
    });
  });
  container.querySelectorAll('.more-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      container.querySelectorAll('.more-menu').forEach((m) => { if (m.dataset.menu !== id) m.classList.add('hidden'); });
      const menu = container.querySelector('.more-menu[data-menu="'+id+'"]');
      if (menu) menu.classList.toggle('hidden');
    });
  });
  container.querySelectorAll('.more-item').forEach((item) => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = item.dataset.id, act = item.dataset.act;
      container.querySelectorAll('.more-menu').forEach((m) => m.classList.add('hidden'));
      if (act === 'report') {
        const card = item.closest('.wall-card');
        const actions = card && card.querySelector('.wall-card-actions');
        if (actions && !actions.querySelector('.vote-btns')) {
          const box = document.createElement('div');
          box.className = 'vote-btns';
          box.innerHTML = '<button type="button" class="vote-btn vote-bad" data-vote="violation">违规</button><button type="button" class="vote-btn vote-ok" data-vote="normal">正常</button>';
          actions.insertBefore(box, actions.firstChild);
          box.querySelectorAll('.vote-btn').forEach((vb) => {
            vb.addEventListener('click', async (ev) => {
              ev.stopPropagation();
              const res = await API.votePost(id, vb.dataset.vote);
              if (!res.ok) { alert(res.error || '投票失败'); return; }
              alert(res.message || ('违规'+(res.violation||0)+' / 正常'+(res.normal||0)));
              if (res.hidden) { if (lastFeedPage==='anonymous') loadAnonFeed(); else loadWallFeed(); }
            });
          });
        }
        alert('请点右上角「违规」或「正常」表决（满5票且违规>3/5将隐藏）');
      } else if (act === 'withdraw') {
        if (!confirm('确定撤回自己的帖子？')) return;
        const res = await API.withdrawPost(id);
        if (!res.ok) alert(res.error || '失败');
        else if (lastFeedPage==='anonymous') loadAnonFeed(); else loadWallFeed();
      } else if (act === 'delete') {
        if (!confirm('确定删除？')) return;
        const res = await API.deletePost(id);
        if (!res.ok) alert(res.error || '失败');
        else if (lastFeedPage==='anonymous') loadAnonFeed(); else loadWallFeed();
      }
    });
  });
}
async function loadWallFeed() {
  lastFeedPage = 'tieba';
  const feed = $('#wall-feed'); if (!feed) return;
  feed.innerHTML = '<div class="empty-list">加载中...</div>';
  let list;
  if (currentTab === 'hot') list = await API.listPosts('', { hot: true });
  else if (currentTab === 'all') list = await API.listPosts('', {});
  else list = await API.listPosts(currentBoardId || currentTab, {});
  renderFeedCards(list, feed);
}
async function loadAnonFeed() {
  lastFeedPage = 'anonymous';
  const feed = $('#anon-feed'); if (!feed) return;
  feed.innerHTML = '<div class="empty-list">加载中...</div>';
  renderFeedCards(await API.listPosts('anonymous', {}), feed);
}
async function openPost(postId) {
  currentPostId = postId;
  replyToCommentId = null;
  switchContentPage('post-detail');
  const box = $('#post-detail'); if (!box) return;
  box.innerHTML = '<div class="empty-list">加载中...</div>';
  const data = await API.getPost(postId);
  if (!data || !data.post) { box.innerHTML = '<div class="empty-list">帖子不存在或接口暂不可用</div>'; return; }
  const p = data.post, comments = data.comments || [], name = displayName(p), body = p.content || p.title || '';
  const roots = comments.filter((c) => !c.parent_id);
  function childrenOf(pid) { return comments.filter((c) => c.parent_id == pid); }
  function renderC(c, depth) {
    const kids = childrenOf(c.id);
    let h = [
      '<div class="channel-comment'+(depth>0?' reply-nested':'')+'" data-cid="'+c.id+'">',
      '<img class="wall-avatar sm" src="'+avatarDataUrl(c.nickname)+'" alt=""/>',
      '<div class="channel-comment-main"><div class="wall-nick">'+escapeHtml(c.nickname||'')+' <span class="wall-time">'+formatTime(c.created_at)+'</span></div>',
      '<div class="channel-comment-text">'+escapeHtml(c.content)+'</div>',
      '<div class="comment-acts"><button type="button" class="reply-to-btn" data-cid="'+c.id+'" data-name="'+escapeHtml(c.nickname||'')+'">回复</button>'
    ].join('');
    if (kids.length && depth === 0) h += '<button type="button" class="expand-floor-btn" data-cid="'+c.id+'">展开本楼('+kids.length+')</button>';
    h += '</div>';
    if (kids.length) {
      h += '<div class="nested-replies collapsed" data-parent="'+c.id+'">';
      kids.forEach((k) => { h += renderC(k, depth + 1); });
      h += '</div>';
    }
    h += '</div></div>';
    return h;
  }
  let html = [
    '<div class="detail-top"><div class="wall-card-hd"><img class="wall-avatar" src="'+avatarDataUrl(name)+'" alt=""/>',
    '<div class="wall-meta"><div class="wall-name-row"><span class="wall-nick">'+escapeHtml(name)+'</span>',
    ((p.is_anonymous||p.board_id==='anonymous')?'<span class="wall-anon-tag">匿名</span>':''),
    '</div><div class="wall-time">'+formatTime(p.created_at)+'</div></div>',
    '<div class="vote-btns detail-vote"><button type="button" class="vote-btn vote-bad" data-vote="violation">违规</button>',
    '<button type="button" class="vote-btn vote-ok" data-vote="normal">正常</button></div></div></div>',
    '<div class="wall-body detail-body" style="margin-left:0">'+escapeHtml(body)+'</div>',
    '<div class="wall-views" style="margin:8px 0 16px">浏览'+(p.view_count||0)+' · 赞'+(p.like_count||0)+' · 评论'+(p.reply_count||0)+'</div>',
    '<div class="channel-comments-title">全部评论</div>'
  ].join('');
  if (roots.length) html += roots.map((c) => renderC(c, 0)).join('');
  else html += '<div class="empty-list" style="padding:1rem 0">暂无评论，来抢沙发</div>';
  box.innerHTML = html;
  const rc = $('#reply-content');
  if (rc) { rc.value = ''; rc.placeholder = '写下你的回复...'; }
  box.querySelectorAll('.reply-to-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      replyToCommentId = parseInt(btn.dataset.cid, 10);
      if (rc) { rc.placeholder = '回复 @'+(btn.dataset.name||'')+' ...'; rc.focus(); }
    });
  });
  box.querySelectorAll('.expand-floor-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nest = box.querySelector('.nested-replies[data-parent="'+btn.dataset.cid+'"]');
      if (nest) {
        nest.classList.toggle('collapsed');
        btn.textContent = nest.classList.contains('collapsed') ? '展开本楼' : '收起本楼';
      }
    });
  });
  box.querySelectorAll('.vote-btn').forEach((vb) => {
    vb.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const res = await API.votePost(String(p.id), vb.dataset.vote);
      if (!res.ok) { alert(res.error || '投票失败'); return; }
      alert(res.message || '投票成功');
      if (res.hidden) { if (lastFeedPage==='anonymous') loadAnonFeed(); else loadWallFeed(); }
    });
  });
}
async function submitReply() {
  if (!currentPostId) return;
  const content = ($('#reply-content') && $('#reply-content').value.trim()) || '';
  if (!content) return;
  const res = await API.createComment(currentPostId, content, replyToCommentId);
  if (!res.ok) { alert(res.error || '回复失败'); return; }
  replyToCommentId = null;
  const rc = $('#reply-content');
  if (rc) { rc.value = ''; rc.placeholder = '写下你的回复...'; }
  openPost(currentPostId);
}
function openCompose(mode) {
  composeMode = mode || 'normal';
  const modal = $('#compose-modal'); if (!modal) return;
  modal.classList.remove('hidden');
  const anonRow = $('#compose-anon-row'), board = $('#compose-board');
  if (composeMode === 'anonymous') { if (anonRow) anonRow.style.display = 'block'; if (board) board.value = 'anonymous'; }
  else if (anonRow) anonRow.style.display = 'none';
  const c = $('#compose-content'); if (c) c.value = '';
  const e = $('#compose-error'); if (e) e.textContent = '';
}
function closeCompose() { const modal = $('#compose-modal'); if (modal) modal.classList.add('hidden'); }
async function submitCompose() {
  const content = ($('#compose-content') && $('#compose-content').value.trim()) || '';
  const board = ($('#compose-board') && $('#compose-board').value) || 'daily';
  const err = $('#compose-error');
  if (!content || content.length < 2) { if (err) err.textContent = '请输入内容'; return; }
  const isAnon = composeMode === 'anonymous' || board === 'anonymous';
  const res = await API.createPost(isAnon ? 'anonymous' : board, content.slice(0, 30), content, isAnon);
  if (!res.ok) { if (err) err.textContent = res.error || '发布失败'; return; }
  closeCompose();
  if (isAnon) { switchContentPage('anonymous'); loadAnonFeed(); } else { switchContentPage('tieba'); loadWallFeed(); }
}
function renderProfile() {
  const user = Storage.getUser(); if (!user) return;
  const card = $('#profile-card'); if (!card) return;
  card.innerHTML = '<img class="big-avatar" src="'+avatarDataUrl(user.nickname)+'" alt=""/><div class="nickname">'+escapeHtml(user.nickname)+'</div><div class="uid">UID: '+escapeHtml(user.uid)+'</div><div class="uid" style="margin-top:0.5rem">'+escapeHtml(user.email||'')+'</div>';
}
async function loadMarket(q) {
  const list = $('#market-list'); if (!list) return;
  list.innerHTML = '<div class="empty-tip">加载中...</div>';
  const items = await API.listMarket(q || '');
  if (!items.length) { list.innerHTML = '<div class="empty-tip">暂无闲置，点击上方发布</div>'; return; }
  list.innerHTML = items.map((it) => '<div class="market-card"><div class="market-card-body"><div class="market-card-title">'+escapeHtml(it.title)+'</div><div class="market-card-price">¥'+escapeHtml(String(it.price))+'</div><div class="market-card-desc">'+escapeHtml(it.description||'')+'</div></div></div>').join('');
}
async function loadAdminPosts() {
  const list = $('#admin-post-list'); if (!list) return;
  list.innerHTML = '<div class="empty-tip">加载中...</div>';
  const posts = await API.adminListPosts();
  if (!posts.length) { list.innerHTML = '<div class="empty-tip">暂无帖子</div>'; return; }
  list.innerHTML = posts.map((p) => '<div class="admin-item"><div>#'+p.id+' '+escapeHtml((p.content||p.title||'').slice(0,40))+'</div><button type="button" class="btn-danger small admin-del" data-id="'+p.id+'">删除</button></div>').join('');
  list.querySelectorAll('.admin-del').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('确定删除？')) return;
      const res = await API.deletePost(btn.dataset.id);
      if (!res.ok) alert(res.error || '失败'); else loadAdminPosts();
    });
  });
}
function bindEvents() {
  if (__bound) return; __bound = true;
  const enterBtn = $('#enter-btn');
  if (enterBtn) {
    enterBtn.onclick = function (e) {
      e.preventDefault(); e.stopPropagation();
      if (typeof Storage !== 'undefined' && Storage.isLoggedIn()) {
        forceMainPage(); loadUserInfo(); refreshRole(); loadWallFeed();
      } else openAuthModal();
    };
  }
  const authModal = $('#auth-modal');
  const overlay = authModal && authModal.querySelector('.modal-overlay');
  if (overlay) overlay.addEventListener('click', closeAuthModal);
  $$('.modal-tabs .tab').forEach((tab) => tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab)));
  const loginForm = $('#login-form');
  if (loginForm) loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qq = ($('#login-qq') && $('#login-qq').value.trim()) || '';
    const password = ($('#login-password') && $('#login-password').value) || '';
    const remember = $('#remember-me') ? $('#remember-me').checked : true;
    const errEl = $('#login-error'); if (errEl) errEl.textContent = '';
    if (!/^\d{5,12}$/.test(qq)) { if (errEl) errEl.textContent = '请输入5-12位纯数字QQ号'; return; }
    const res = await API.login(qq, password);
    if (!res.ok) { if (errEl) errEl.textContent = res.error || '登录失败'; return; }
    Storage.setToken(res.token, remember); Storage.setUser(res.user);
    forceMainPage(); loadUserInfo(); refreshRole(); loadWallFeed();
  });
  const sendCodeBtn = $('#send-code-btn');
  if (sendCodeBtn) sendCodeBtn.addEventListener('click', async () => {
    const qq = ($('#reg-qq') && $('#reg-qq').value.trim()) || '';
    const errEl = $('#reg-error'); if (errEl) errEl.textContent = '';
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
  const registerForm = $('#register-form');
  if (registerForm) registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const qq = ($('#reg-qq') && $('#reg-qq').value.trim()) || '';
    const nickname = ($('#reg-nickname') && $('#reg-nickname').value.trim()) || '';
    const password = ($('#reg-password') && $('#reg-password').value) || '';
    const password2 = ($('#reg-password2') && $('#reg-password2').value) || '';
    const code = ($('#reg-code') && $('#reg-code').value.trim()) || '';
    const errEl = $('#reg-error'); if (errEl) { errEl.style.color = '#dc2626'; errEl.textContent = ''; }
    if (!/^\d{5,12}$/.test(qq)) { if (errEl) errEl.textContent = '请输入5-12位纯数字QQ号'; return; }
    if (!/^\d{6}$/.test(code)) { if (errEl) errEl.textContent = '请输入6位邮箱验证码'; return; }
    if (password !== password2) { if (errEl) errEl.textContent = '两次密码不一致'; return; }
    const res = await API.register(qq, nickname, password, code);
    if (!res.ok) { if (errEl) errEl.textContent = res.error; return; }
    Storage.setToken(res.token, true); Storage.setUser(res.user);
    forceMainPage(); loadUserInfo(); loadWallFeed();
  });
  const hamburgerBtn = $('#hamburger-btn'); if (hamburgerBtn) hamburgerBtn.addEventListener('click', openSidebar);
  const sidebarClose = $('#sidebar-close'); if (sidebarClose) sidebarClose.addEventListener('click', closeSidebar);
  const sidebarOverlay = $('#sidebar-overlay'); if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
  $$('.sidebar-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page; if (!page) return;
      switchContentPage(page);
      if (page === 'tieba') loadWallFeed();
      else if (page === 'anonymous') loadAnonFeed();
      else if (page === 'profile') renderProfile();
      else if (page === 'market') loadMarket();
      else if (page === 'admin') loadAdminPosts();
    });
  });
  const userAvatar = $('#user-avatar');
  if (userAvatar) userAvatar.addEventListener('click', (e) => { e.stopPropagation(); const d = $('#user-dropdown'); if (d) d.classList.toggle('hidden'); });
  document.addEventListener('click', () => closeUserDropdown());
  $$('[data-action="logout"]').forEach((el) => el.addEventListener('click', () => { API.logout(); forceWelcomePage(); }));
  $$('[data-action="profile"]').forEach((el) => el.addEventListener('click', () => { switchContentPage('profile'); renderProfile(); }));
  $$('[data-action="settings"]').forEach((el) => el.addEventListener('click', () => switchContentPage('settings')));
  $$('.wall-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.wall-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab || tab.dataset.board || 'all';
      currentBoardId = tab.dataset.board || '';
      loadWallFeed();
    });
  });
  const wallPlus = $('#wall-plus'), wallCompose = $('#wall-compose-open');
  if (wallPlus) wallPlus.addEventListener('click', () => openCompose('normal'));
  if (wallCompose) wallCompose.addEventListener('click', () => openCompose('normal'));
  const anonPlus = $('#anon-plus'), anonCompose = $('#anon-compose-open');
  if (anonPlus) anonPlus.addEventListener('click', () => openCompose('anonymous'));
  if (anonCompose) anonCompose.addEventListener('click', () => openCompose('anonymous'));
  const composeCancel = $('#compose-cancel'); if (composeCancel) composeCancel.addEventListener('click', closeCompose);
  const composeSubmit = $('#compose-submit'); if (composeSubmit) composeSubmit.addEventListener('click', submitCompose);
  const composeOverlay = $('#compose-modal') && $('#compose-modal').querySelector('.modal-overlay');
  if (composeOverlay) composeOverlay.addEventListener('click', closeCompose);
  const backWall = $('#back-to-wall');
  if (backWall) backWall.addEventListener('click', () => {
    if (lastFeedPage === 'anonymous') { switchContentPage('anonymous'); loadAnonFeed(); }
    else { switchContentPage('tieba'); loadWallFeed(); }
  });
  const replyBtn = $('#reply-btn'); if (replyBtn) replyBtn.addEventListener('click', submitReply);
  const chatSend = $('#chat-send');
  if (chatSend) chatSend.addEventListener('click', () => {
    const input = $('#chat-input'); if (!input || !input.value.trim()) return;
    const box = $('#chat-messages');
    const msg = document.createElement('div'); msg.className = 'msg self'; msg.textContent = input.value.trim();
    if (box) { box.appendChild(msg); msg.scrollIntoView({ behavior: 'smooth' }); }
    input.value = '';
  });
  const marketPublishBtn = $('#market-publish-btn');
  if (marketPublishBtn) marketPublishBtn.addEventListener('click', () => {
    const modal = $('#market-modal');
    if (modal) modal.classList.remove('hidden');
    const err = $('#market-error'); if (err) err.textContent = '';
  });
  const marketCancel = $('#market-cancel');
  if (marketCancel) marketCancel.addEventListener('click', () => {
    const modal = $('#market-modal'); if (modal) modal.classList.add('hidden');
  });
  const marketOverlay = $('#market-modal') && $('#market-modal').querySelector('.modal-overlay');
  if (marketOverlay) marketOverlay.addEventListener('click', () => {
    const modal = $('#market-modal'); if (modal) modal.classList.add('hidden');
  });
  const marketSubmit = $('#market-submit');
  if (marketSubmit) marketSubmit.addEventListener('click', async () => {
    const title = ($('#market-title') && $('#market-title').value.trim()) || '';
    const price = ($('#market-price') && $('#market-price').value) || '';
    const desc = ($('#market-desc') && $('#market-desc').value.trim()) || '';
    const err = $('#market-error');
    if (!title) { if (err) err.textContent = '请填写标题'; return; }
    if (price === '' || isNaN(parseFloat(price)) || parseFloat(price) < 0) { if (err) err.textContent = '请填写正确价格'; return; }
    marketSubmit.disabled = true;
    const res = await API.createMarketItem(title, parseFloat(price), desc);
    marketSubmit.disabled = false;
    if (!res.ok) { if (err) err.textContent = res.error || '发布失败'; return; }
    const modal = $('#market-modal'); if (modal) modal.classList.add('hidden');
    if ($('#market-title')) $('#market-title').value = '';
    if ($('#market-price')) $('#market-price').value = '';
    if ($('#market-desc')) $('#market-desc').value = '';
    loadMarket();
  });
  const marketSearchBtn = $('#market-search-btn');
  if (marketSearchBtn) marketSearchBtn.addEventListener('click', () => {
    const q = ($('#market-search') && $('#market-search').value.trim()) || '';
    loadMarket(q);
  });
}
function init() {
  bindEvents();
  if (typeof Storage !== 'undefined' && Storage.isLoggedIn()) {
    forceMainPage(); loadUserInfo(); refreshRole(); loadWallFeed();
  } else forceWelcomePage();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

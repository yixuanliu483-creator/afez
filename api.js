/**
 * API 封装层
 */
const Storage = {
  getToken() { return localStorage.getItem('token') || sessionStorage.getItem('token'); },
  setToken(token, remember = true) {
    if (remember) {
      localStorage.setItem('token', token);
      localStorage.setItem('token_expire', Date.now() + CONFIG.SESSION_DAYS * 24 * 60 * 60 * 1000);
    } else sessionStorage.setItem('token', token);
  },
  clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('token_expire');
    sessionStorage.removeItem('token');
  },
  getUser() { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } },
  setUser(user) { localStorage.setItem('user', JSON.stringify(user)); },
  clearUser() { localStorage.removeItem('user'); },
  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;
    const expire = localStorage.getItem('token_expire');
    if (expire && Date.now() > Number(expire)) { this.clearToken(); this.clearUser(); return false; }
    return true;
  }
};
async function request(path, options = {}) {
  const url = CONFIG.API_BASE + path;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = Storage.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `请求失败 ${res.status}`);
  return data;
}
const API = {
  async sendCode(qq, purpose = 'register') {
    try {
      const data = await request('/api/auth/send-code', { method: 'POST', body: { email: `${qq}@qq.com`, purpose } });
      return { ok: true, message: data.message, dev_code: data.dev_code };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async register(qq, nickname, password, code) {
    try {
      const data = await request('/api/auth/register', { method: 'POST', body: { email: `${qq}@qq.com`, nickname, password, code } });
      return { ok: true, token: data.token, user: data.user };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async login(qq, password) {
    try {
      const data = await request('/api/auth/login', { method: 'POST', body: { email: `${qq}@qq.com`, password } });
      return { ok: true, token: data.token, user: data.user };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async getProfile() {
    try { return await request('/api/user/me'); } catch { return null; }
  },
  async logout() { Storage.clearToken(); Storage.clearUser(); },
  async listBoards() {
    try {
      const data = await request('/api/boards');
      return data.boards || [];
    } catch (e) { return []; }
  },
  async listPosts(boardId, opts = {}) {
    try {
      const page = opts.page || 1;
      const params = new URLSearchParams();
      params.set('page', String(page));
      if (boardId) params.set('board', boardId);
      if (opts.hot) params.set('hot', '1');
      const data = await request('/api/posts?' + params.toString());
      return data.posts || [];
    } catch (e) { return []; }
  },
  async getPost(id) {
    try { return await request('/api/posts/' + id); } catch (e) { return null; }
  },
  async createPost(boardId, title, content, isAnonymous = false) {
    try {
      const data = await request('/api/posts', {
        method: 'POST',
        body: { board_id: boardId, title, content, is_anonymous: !!isAnonymous }
      });
      return { ok: true, id: data.id };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async likePost(postId) {
    try {
      const data = await request('/api/posts/' + postId + '/like', { method: 'POST' });
      return { ok: true, like_count: data.like_count, liked: data.liked };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async createComment(postId, content, parentId = null) {
    try {
      const body = { content };
      if (parentId) body.parent_id = parentId;
      await request('/api/posts/' + postId + '/comments', { method: 'POST', body });
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async votePost(id, vote) {
    try {
      const data = await request('/api/posts/' + id + '/vote', { method: 'POST', body: { vote } });
      return { ok: true, ...data };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async getVotes(id) {
    try { return await request('/api/posts/' + id + '/vote'); }
    catch (e) { return { violation: 0, normal: 0, total: 0 }; }
  },
  async withdrawPost(id) {
    try {
      await request('/api/posts/' + id + '/withdraw', { method: 'POST' });
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async listMarket(q = '') {
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      const data = await request('/api/market?' + params.toString());
      return data.items || [];
    } catch (e) { return []; }
  },
  async getMarketItem(id) {
    try { return await request('/api/market/' + id); } catch (e) { return null; }
  },
  async createMarketItem(title, price, description) {
    try {
      const data = await request('/api/market', {
        method: 'POST',
        body: { title, price, description }
      });
      return { ok: true, id: data.id };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async soldMarketItem(id) {
    try {
      await request('/api/market/' + id + '/sold', { method: 'POST' });
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async deletePost(id) {
    try {
      await request('/api/posts/' + id, { method: 'DELETE' });
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async adminListPosts(page = 1) {
    try {
      const data = await request('/api/admin/posts?page=' + page);
      return data.posts || [];
    } catch (e) { return []; }
  }
};

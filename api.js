/**
 * API 封装层
 */

const Storage = {
  getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  },
  setToken(token, remember = true) {
    if (remember) {
      localStorage.setItem('token', token);
      const expire = Date.now() + CONFIG.SESSION_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem('token_expire', expire);
    } else {
      sessionStorage.setItem('token', token);
    }
  },
  clearToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('token_expire');
    sessionStorage.removeItem('token');
  },
  getUser() {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
  },
  setUser(user) { localStorage.setItem('user', JSON.stringify(user)); },
  clearUser() { localStorage.removeItem('user'); },
  isLoggedIn() {
    const token = this.getToken();
    if (!token) return false;
    const expire = localStorage.getItem('token_expire');
    if (expire && Date.now() > Number(expire)) {
      this.clearToken();
      this.clearUser();
      return false;
    }
    return true;
  }
};

const MockDB = {
  users: JSON.parse(localStorage.getItem('mock_users') || '[]'),
  nextUid: Number(localStorage.getItem('mock_next_uid') || 1),
  save() {
    localStorage.setItem('mock_users', JSON.stringify(this.users));
    localStorage.setItem('mock_next_uid', String(this.nextUid));
  },
  validateQQEmail(qq) { return /^\d{5,12}$/.test(qq); },
  register(qq, nickname, password) {
    if (!this.validateQQEmail(qq)) return { ok: false, error: 'QQ号必须是5-12位纯数字' };
    const email = `${qq}@qq.com`;
    if (this.users.find(u => u.email === email)) return { ok: false, error: '该QQ邮箱已注册' };
    if (password.length < 6) return { ok: false, error: '密码至少6位' };
    if (nickname.length < 2 || nickname.length > 16) return { ok: false, error: '昵称长度2-16个字符' };
    const uid = String(this.nextUid).padStart(7, '0');
    this.nextUid++;
    const user = { uid, email, nickname, password, avatar: null, createdAt: new Date().toISOString() };
    this.users.push(user);
    this.save();
    return { ok: true, token: 'mock_' + uid + '_' + Date.now(), user: { uid, email, nickname, avatar: null } };
  },
  login(qq, password) {
    if (!this.validateQQEmail(qq)) return { ok: false, error: 'QQ号必须是5-12位纯数字' };
    const email = `${qq}@qq.com`;
    const user = this.users.find(u => u.email === email);
    if (!user) return { ok: false, error: '账号不存在，请先注册' };
    if (user.password !== password) return { ok: false, error: '密码错误' };
    return { ok: true, token: 'mock_' + user.uid + '_' + Date.now(), user: { uid: user.uid, email: user.email, nickname: user.nickname, avatar: user.avatar } };
  },
  getProfile(token) {
    if (!token || !token.startsWith('mock_')) return null;
    const uid = token.split('_')[1];
    const user = this.users.find(u => u.uid === uid);
    if (!user) return null;
    return { uid: user.uid, email: user.email, nickname: user.nickname, avatar: user.avatar, createdAt: user.createdAt };
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
    if (CONFIG.USE_MOCK) {
      const code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      sessionStorage.setItem('mock_code_' + qq, code);
      return { ok: true, message: '开发模式验证码', dev_code: code };
    }
    try {
      const data = await request('/api/auth/send-code', { method: 'POST', body: { email: `${qq}@qq.com`, purpose } });
      return { ok: true, message: data.message, dev_code: data.dev_code };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async register(qq, nickname, password, code) {
    if (CONFIG.USE_MOCK) {
      const saved = sessionStorage.getItem('mock_code_' + qq);
      if (!code || code !== saved) return { ok: false, error: '验证码错误' };
      return MockDB.register(qq, nickname, password);
    }
    try {
      const data = await request('/api/auth/register', { method: 'POST', body: { email: `${qq}@qq.com`, nickname, password, code } });
      return { ok: true, token: data.token, user: data.user };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async login(qq, password) {
    if (CONFIG.USE_MOCK) return MockDB.login(qq, password);
    try {
      const data = await request('/api/auth/login', { method: 'POST', body: { email: `${qq}@qq.com`, password } });
      return { ok: true, token: data.token, user: data.user };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async getProfile() {
    if (CONFIG.USE_MOCK) return MockDB.getProfile(Storage.getToken());
    try { return await request('/api/user/me'); } catch { return null; }
  },
  async logout() { Storage.clearToken(); Storage.clearUser(); },
  async listBoards() {
    if (CONFIG.USE_MOCK) return CONFIG.BOARDS.map(b => ({ ...b, post_count: 0, description: '' }));
    try {
      const data = await request('/api/boards');
      return data.boards || [];
    } catch (e) {
      return CONFIG.BOARDS.map(b => ({ ...b, post_count: 0 }));
    }
  },
  async listPosts(boardId, page = 1) {
    if (CONFIG.USE_MOCK) return [];
    try {
      const q = boardId ? `?board=${encodeURIComponent(boardId)}&page=${page}` : `?page=${page}`;
      const data = await request('/api/posts' + q);
      return data.posts || [];
    } catch (e) { return []; }
  },
  async getPost(id) {
    if (CONFIG.USE_MOCK) return null;
    try { return await request('/api/posts/' + id); } catch (e) { return null; }
  },
  async createPost(boardId, title, content) {
    if (CONFIG.USE_MOCK) return { ok: true, id: 1 };
    try {
      const data = await request('/api/posts', { method: 'POST', body: { board_id: boardId, title, content } });
      return { ok: true, id: data.id };
    } catch (e) { return { ok: false, error: e.message }; }
  },
  async createComment(postId, content) {
    if (CONFIG.USE_MOCK) return { ok: true };
    try {
      await request('/api/posts/' + postId + '/comments', { method: 'POST', body: { content } });
      return { ok: true };
    } catch (e) { return { ok: false, error: e.message }; }
  }
};

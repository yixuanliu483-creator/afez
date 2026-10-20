/**
 * API 封装层
 * 支持真实后端 + 本地 Mock（方便无后端时预览）
 */

const Storage = {
  getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  },
  setToken(token, remember = true) {
    if (remember) {
      localStorage.setItem('token', token);
      // 额外记录过期时间
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
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  },
  setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
  },
  clearUser() {
    localStorage.removeItem('user');
  },
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

// ---------- Mock 数据（无后端时使用） ----------
const MockDB = {
  users: JSON.parse(localStorage.getItem('mock_users') || '[]'),
  nextUid: Number(localStorage.getItem('mock_next_uid') || 1),

  save() {
    localStorage.setItem('mock_users', JSON.stringify(this.users));
    localStorage.setItem('mock_next_uid', String(this.nextUid));
  },

  // 校验 QQ 邮箱：纯数字@qq.com
  validateQQEmail(qq) {
    return /^\d{5,12}$/.test(qq);
  },

  register(qq, nickname, password) {
    if (!this.validateQQEmail(qq)) {
      return { ok: false, error: 'QQ号必须是5-12位纯数字' };
    }
    const email = `${qq}@qq.com`;
    if (this.users.find(u => u.email === email)) {
      return { ok: false, error: '该QQ邮箱已注册' };
    }
    if (password.length < 6) {
      return { ok: false, error: '密码至少6位' };
    }
    if (nickname.length < 2 || nickname.length > 16) {
      return { ok: false, error: '昵称长度2-16个字符' };
    }

    const uid = String(this.nextUid).padStart(7, '0');
    this.nextUid++;
    const user = {
      uid,
      email,
      nickname,
      password, // 真实环境绝不存明文！这里仅 mock
      avatar: null,
      createdAt: new Date().toISOString()
    };
    this.users.push(user);
    this.save();

    const token = 'mock_' + uid + '_' + Date.now();
    return { ok: true, token, user: { uid, email, nickname, avatar: null } };
  },

  login(qq, password) {
    if (!this.validateQQEmail(qq)) {
      return { ok: false, error: 'QQ号必须是5-12位纯数字' };
    }
    const email = `${qq}@qq.com`;
    const user = this.users.find(u => u.email === email);
    if (!user) {
      return { ok: false, error: '账号不存在，请先注册' };
    }
    if (user.password !== password) {
      return { ok: false, error: '密码错误' };
    }
    const token = 'mock_' + user.uid + '_' + Date.now();
    return {
      ok: true,
      token,
      user: { uid: user.uid, email: user.email, nickname: user.nickname, avatar: user.avatar }
    };
  },

  getProfile(token) {
    if (!token || !token.startsWith('mock_')) return null;
    const uid = token.split('_')[1];
    const user = this.users.find(u => u.uid === uid);
    if (!user) return null;
    return { uid: user.uid, email: user.email, nickname: user.nickname, avatar: user.avatar, createdAt: user.createdAt };
  }
};

// ---------- 真实 API ----------
async function request(path, options = {}) {
  const url = CONFIG.API_BASE + path;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  const token = Storage.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `请求失败 ${res.status}`);
  }
  return data;
}

// ---------- 对外接口 ----------
const API = {
  async register(qq, nickname, password) {
    if (CONFIG.USE_MOCK) {
      return MockDB.register(qq, nickname, password);
    }
    try {
      const data = await request('/api/auth/register', {
        method: 'POST',
        body: { email: `${qq}@qq.com`, nickname, password }
      });
      return { ok: true, token: data.token, user: data.user };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  async login(qq, password) {
    if (CONFIG.USE_MOCK) {
      return MockDB.login(qq, password);
    }
    try {
      const data = await request('/api/auth/login', {
        method: 'POST',
        body: { email: `${qq}@qq.com`, password }
      });
      return { ok: true, token: data.token, user: data.user };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  },

  async getProfile() {
    if (CONFIG.USE_MOCK) {
      return MockDB.getProfile(Storage.getToken());
    }
    try {
      return await request('/api/user/me');
    } catch {
      return null;
    }
  },

  async logout() {
    Storage.clearToken();
    Storage.clearUser();
  }
};

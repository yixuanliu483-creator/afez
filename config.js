// 配置文件
const CONFIG = {
  // 后端 API 地址（自定义域）
  API_BASE: 'https://afez.de5.net',

  // 关闭本地 mock，使用真实后端
  USE_MOCK: false,

  // 会话过期天数
  SESSION_DAYS: 90,

  // 默认板块
  BOARDS: [
    { id: 'study', name: '学习交流', icon: '📚', count: 0 },
    { id: 'life', name: '生活分享', icon: '🏠', count: 0 },
    { id: 'club', name: '社团活动', icon: '🎭', count: 0 },
    { id: 'exam', name: '考试专区', icon: '📝', count: 0 },
    { id: 'help', name: '求助问答', icon: '❓', count: 0 },
    { id: 'fun', name: '娱乐灌水', icon: '🎮', count: 0 },
  ]
};

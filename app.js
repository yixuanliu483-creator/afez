/* 从已知良好版本加载，并补丁匿名墙深色 */
(function () {
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/yixuanliu483-creator/afez@2356e7a0ff97ab69c7322244887956e763b1ce29/app.js';
  s.onload = function () {
    var orig = window.switchContentPage;
    if (typeof orig === 'function') {
      window.switchContentPage = function (page) {
        orig(page);
        document.body.classList.toggle('theme-anon-dark', page === 'anonymous');
        var main = document.getElementById('main-page');
        if (main) main.classList.toggle('theme-anon-dark', page === 'anonymous');
      };
    }
    // 若 DOMContentLoaded 已过，手动 init
    if (document.readyState !== 'loading' && typeof window.init === 'function') {
      try { window.init(); } catch (e) { console.error(e); }
    }
  };
  s.onerror = function () {
    alert('脚本加载失败，请检查网络后强制刷新');
  };
  document.head.appendChild(s);
})();

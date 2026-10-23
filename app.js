(function(){
  Promise.all([0,1,2].map(function(i){ return fetch('app_b'+i+'.txt?v=20261023').then(function(r){return r.text();}); }))
  .then(function(parts){
    var b64 = parts.join('');
    var bin = atob(b64);
    var s = document.createElement('script');
    s.textContent = bin;
    document.body.appendChild(s);
  }).catch(function(e){ console.error(e); alert('脚本加载失败，请强制刷新'); });
})();

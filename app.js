(function(){
  function load(u){return fetch(u).then(r=>r.text());}
  Promise.all([load('app_p1.js?v=20261023'), load('app_p2.js?v=20261023')]).then(function(parts){
    var s=document.createElement('script');
    s.textContent=parts[0]+parts[1];
    document.body.appendChild(s);
  }).catch(function(e){console.error(e);document.body.innerHTML='脚本加载失败，请强制刷新页面';});
})();

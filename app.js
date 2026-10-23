(function(){
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/yixuanliu483-creator/afez@2356e7a0ff97ab69c7322244887956e763b1ce29/app.js';
  s.onload = function(){
    window.lastFeedPage = 'tieba';
    window.replyToCommentId = null;
    var origSwitch = window.switchContentPage;
    if (typeof origSwitch === 'function') {
      window.switchContentPage = function(page){
        origSwitch(page);
        document.body.classList.toggle('theme-anon-dark', page === 'anonymous');
        var main = document.getElementById('main-page');
        if (main) main.classList.toggle('theme-anon-dark', page === 'anonymous');
      };
    }
    var origLoadWall = window.loadWallFeed;
    if (typeof origLoadWall === 'function') {
      window.loadWallFeed = function(){ window.lastFeedPage = 'tieba'; return origLoadWall.apply(this, arguments); };
    }
    var origLoadAnon = window.loadAnonFeed;
    if (typeof origLoadAnon === 'function') {
      window.loadAnonFeed = function(){ window.lastFeedPage = 'anonymous'; return origLoadAnon.apply(this, arguments); };
    }
    var back = document.getElementById('back-to-wall');
    if (back) {
      var nb = back.cloneNode(true);
      back.parentNode.replaceChild(nb, back);
      nb.addEventListener('click', function(){
        if (window.lastFeedPage === 'anonymous') { switchContentPage('anonymous'); loadAnonFeed(); }
        else { switchContentPage('tieba'); loadWallFeed(); }
      });
    }
    var origRender = window.renderFeedCards;
    if (typeof origRender === 'function') {
      window.renderFeedCards = function(posts, container) {
        if (!container) return;
        if (!posts || !posts.length) { container.innerHTML = '<div class="empty-list">还没有内容，点下方发第一条吧</div>'; return; }
        var me = Storage.getUser();
        container.innerHTML = posts.map(function(p){
          var time = formatTime(p.created_at || p.updated_at);
          var body = p.content || p.title || '';
          var need = body.length > 120;
          var short = need ? body.slice(0,120)+'…' : body;
          var name = displayName(p);
          var likes = p.like_count || 0;
          var anonTag = (p.is_anonymous || p.board_id === 'anonymous') ? '<span class="wall-anon-tag">匿名</span>' : '';
          var isMine = me && (p.uid === me.uid);
          var staff = me && (me.role === 'admin' || me.role === 'owner');
          return '<article class="wall-card" data-id="'+p.id+'">'+'
            <div class="wall-card-hd"><img class="wall-avatar" src="'+avatarDataUrl(name)+'" alt=""/>'+
            '<div class="wall-meta"><div class="wall-name-row"><span class="wall-nick">'+escapeHtml(name)+'</span>'+anonTag+
            '</div><div class="wall-time">'+time+'</div></div>'+
            '<div class="wall-card-actions">'+
            '<button type="button" class="more-btn" data-id="'+p.id+'">⋯</button>'+
            '<div class="more-menu hidden" data-menu="'+p.id+'">'+
            '<div class="more-item" data-act="report" data-id="'+p.id+'">举报并表决</div>'+
            (isMine?'<div class="more-item" data-act="withdraw" data-id="'+p.id+'">撤回帖子</div>':'')+
            ((staff||isMine)?'<div class="more-item danger" data-act="delete" data-id="'+p.id+'">删除帖子</div>':'')+
            '</div></div></div>'+
            '<div class="wall-body"><span class="wall-body-text">'+escapeHtml(short)+'</span>'+
            (need?'<button type="button" class="expand-btn" data-full="'+escapeHtml(body).replace(/"/g,'"')+'">展开</button>':'')+
            '</div>'+
            '<div class="wall-ft"><span class="wall-views">浏览'+(p.view_count||0)+'</span>'+
            '<div class="wall-acts"><span class="act-like" data-id="'+p.id+'">🤍 '+likes+'</span>'+
            '<span>💬 '+(p.reply_count||0)+'</span></div></div></article>';
        }).join('');
        container.querySelectorAll('.wall-card').forEach(function(card){
          card.addEventListener('click', function(e){
            if (e.target.closest('.wall-acts,.more-btn,.more-menu,.vote-btns,.expand-btn')) return;
            openPost(card.dataset.id);
          });
        });
        container.querySelectorAll('.expand-btn').forEach(function(btn){
          btn.addEventListener('click', function(e){
            e.stopPropagation();
            var t = btn.previousElementSibling;
            if (t) t.textContent = btn.getAttribute('data-full') || '';
            btn.remove();
          });
        });
        container.querySelectorAll('.act-like').forEach(function(btn){
          btn.addEventListener('click', async function(e){
            e.stopPropagation();
            var res = await API.likePost(btn.dataset.id);
            if (res.ok) {
              btn.innerHTML = (res.liked ? '❤️' : '🤍') + ' ' + (res.like_count != null ? res.like_count : '');
              btn.classList.toggle('liked', !!res.liked);
            } else alert(res.error || '操作失败');
          });
        });
        container.querySelectorAll('.more-btn').forEach(function(btn){
          btn.addEventListener('click', function(e){
            e.stopPropagation();
            var id = btn.dataset.id;
            container.querySelectorAll('.more-menu').forEach(function(m){ if(m.dataset.menu!==id) m.classList.add('hidden'); });
            var menu = container.querySelector('.more-menu[data-menu="'+id+'"]');
            if (menu) menu.classList.toggle('hidden');
          });
        });
        container.querySelectorAll('.more-item').forEach(function(item){
          item.addEventListener('click', async function(e){
            e.stopPropagation();
            var id = item.dataset.id, act = item.dataset.act;
            container.querySelectorAll('.more-menu').forEach(function(m){ m.classList.add('hidden'); });
            if (act === 'report') {
              var card = item.closest('.wall-card');
              var actions = card.querySelector('.wall-card-actions');
              if (actions && !actions.querySelector('.vote-btns')) {
                var box = document.createElement('div');
                box.className = 'vote-btns';
                box.dataset.id = id;
                box.innerHTML = '<button type="button" class="vote-btn vote-bad" data-vote="violation">违规</button><button type="button" class="vote-btn vote-ok" data-vote="normal">正常</button>';
                actions.insertBefore(box, actions.firstChild);
                box.querySelectorAll('.vote-btn').forEach(function(vb){
                  vb.addEventListener('click', async function(ev){
                    ev.stopPropagation();
                    var res = await API.votePost(id, vb.dataset.vote);
                    if (!res.ok) { alert(res.error||'投票失败'); return; }
                    alert(res.message || ('违规'+(res.violation||0)+' / 正常'+(res.normal||0)));
                    if (res.hidden) { if (lastFeedPage==='anonymous') loadAnonFeed(); else loadWallFeed(); }
                  });
                });
              }
              alert('请点右上角「违规」或「正常」表决（满5票且违规>3/5将隐藏）');
            } else if (act === 'withdraw') {
              if (!confirm('确定撤回？')) return;
              var res = await API.withdrawPost(id);
              if (!res.ok) alert(res.error||'失败');
              else if (lastFeedPage==='anonymous') loadAnonFeed(); else loadWallFeed();
            } else if (act === 'delete') {
              if (!confirm('确定删除？')) return;
              var res = await API.deletePost(id);
              if (!res.ok) alert(res.error||'失败');
              else if (lastFeedPage==='anonymous') loadAnonFeed(); else loadWallFeed();
            }
          });
        });
      };
    }
    var origOpen = window.openPost;
    if (typeof origOpen === 'function') {
      window.openPost = async function(postId) {
        currentPostId = postId;
        replyToCommentId = null;
        await origOpen(postId);
        var box = document.getElementById('post-detail');
        if (!box) return;
        var data = await API.getPost(postId);
        if (!data || !data.post) return;
        var comments = data.comments || [];
        var p = data.post;
        var name = displayName(p);
        var body = p.content || p.title || '';
        var roots = comments.filter(function(c){ return !c.parent_id; });
        function childrenOf(pid){ return comments.filter(function(c){ return c.parent_id == pid; }); }
        function renderC(c, depth){
          var kids = childrenOf(c.id);
          var h = '<div class="channel-comment'+(depth>0?' reply-nested':'')+'" data-cid="'+c.id+'">'+'
            <img class="wall-avatar sm" src="'+avatarDataUrl(c.nickname)+'" alt=""/>'+
            '<div class="channel-comment-main"><div class="wall-nick">'+escapeHtml(c.nickname||'')+
            ' <span class="wall-time">'+formatTime(c.created_at)+'</span></div>'+
            '<div class="channel-comment-text">'+escapeHtml(c.content)+'</div>'+
            '<div class="comment-acts"><button type="button" class="reply-to-btn" data-cid="'+c.id+'" data-name="'+escapeHtml(c.nickname||'')+'">回复</button>';
          if (kids.length && depth===0) h += '<button type="button" class="expand-floor-btn" data-cid="'+c.id+'">展开本楼('+kids.length+')</button>';
          h += '</div>';
          if (kids.length) {
            h += '<div class="nested-replies collapsed" data-parent="'+c.id+'">';
            kids.forEach(function(k){ h += renderC(k, depth+1); });
            h += '</div>';
          }
          h += '</div></div>';
          return h;
        }
        var html = '<div class="detail-top"><div class="wall-card-hd"><img class="wall-avatar" src="'+avatarDataUrl(name)+'" alt=""/>'+
          '<div class="wall-meta"><div class="wall-name-row"><span class="wall-nick">'+escapeHtml(name)+'</span>'+
          ((p.is_anonymous||p.board_id==='anonymous')?'<span class="wall-anon-tag">匿名</span>':'')+
          '</div><div class="wall-time">'+formatTime(p.created_at)+'</div></div>'+
          '<div class="vote-btns detail-vote" data-id="'+p.id+'"><button type="button" class="vote-btn vote-bad" data-vote="violation">违规</button><button type="button" class="vote-btn vote-ok" data-vote="normal">正常</button></div></div></div>'+
          '<div class="wall-body detail-body" style="margin-left:0">'+escapeHtml(body)+'</div>'+
          '<div class="wall-views" style="margin:8px 0 16px">浏览'+(p.view_count||0)+' · 赞'+(p.like_count||0)+' · 评论'+(p.reply_count||0)+'</div>'+
          '<div class="channel-comments-title">全部评论</div>';
        if (roots.length) html += roots.map(function(c){ return renderC(c,0); }).join('');
        else html += '<div class="empty-list" style="padding:1rem 0">暂无评论，来抢沙发</div>';
        box.innerHTML = html;
        var rc = document.getElementById('reply-content');
        if (rc) { rc.value=''; rc.placeholder='写下你的回复...'; }
        box.querySelectorAll('.reply-to-btn').forEach(function(btn){
          btn.addEventListener('click', function(){
            replyToCommentId = parseInt(btn.dataset.cid, 10);
            if (rc) { rc.placeholder = '回复 @'+(btn.dataset.name||'')+' ...'; rc.focus(); }
          });
        });
        box.querySelectorAll('.expand-floor-btn').forEach(function(btn){
          btn.addEventListener('click', function(){
            var nest = box.querySelector('.nested-replies[data-parent="'+btn.dataset.cid+'"]');
            if (nest) {
              nest.classList.toggle('collapsed');
              btn.textContent = nest.classList.contains('collapsed') ? '展开本楼' : '收起本楼';
            }
          });
        });
        box.querySelectorAll('.vote-btn').forEach(function(vb){
          vb.addEventListener('click', async function(ev){
            ev.stopPropagation();
            var res = await API.votePost(String(p.id), vb.dataset.vote);
            if (!res.ok) { alert(res.error||'投票失败'); return; }
            alert(res.message || '投票成功');
            if (res.hidden) { if (lastFeedPage==='anonymous') loadAnonFeed(); else loadWallFeed(); }
          });
        });
      };
    }
    var origReply = window.submitReply;
    if (typeof origReply === 'function') {
      window.submitReply = async function(){
        if (!currentPostId) return;
        var content = (document.getElementById('reply-content') && document.getElementById('reply-content').value.trim()) || '';
        if (!content) return;
        var res = await API.createComment(currentPostId, content, replyToCommentId);
        if (!res.ok) { alert(res.error||'回复失败'); return; }
        replyToCommentId = null;
        openPost(currentPostId);
      };
    }
    if (document.readyState !== 'loading' && typeof init === 'function') {
      try { init(); } catch(e) { console.error(e); }
    }
  };
  document.head.appendChild(s);
})();

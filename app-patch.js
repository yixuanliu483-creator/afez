/** patch: direct comment, report/vote UI, focus reply */
(function () {
  function wait() {
    if (typeof cardHtml !== 'function' || typeof renderFeedCards !== 'function') {
      setTimeout(wait, 30);
      return;
    }
    window.cardHtml = function (p, me) {
      const body = p.content || p.title || '';
      const need = body.length > 120;
      const short = need ? body.slice(0, 120) + '…' : body;
      const name = displayName(p);
      const anonTag = (p.is_anonymous || p.board_id === 'anonymous') ? '<span class="wall-anon-tag">匿名</span>' : '';
      const isMine = me && (p.uid === me.uid);
      const staff = me && (me.role === 'admin' || me.role === 'owner');
      let menu = '<div class="more-item" data-act="report" data-id="' + p.id + '">举报</div>';
      if (isMine) menu += '<div class="more-item" data-act="withdraw" data-id="' + p.id + '">撤回帖子</div>';
      if (staff || isMine) menu += '<div class="more-item danger" data-act="delete" data-id="' + p.id + '">删除帖子</div>';
      return [
        '<article class="wall-card" data-id="' + p.id + '">',
        '<div class="wall-card-hd"><img class="wall-avatar" src="' + avatarDataUrl(name) + '" alt=""/>',
        '<div class="wall-meta"><div class="wall-name-row"><span class="wall-nick">' + escapeHtml(name) + '</span>' + anonTag + '</div>',
        '<div class="wall-time">' + formatTime(p.created_at || p.updated_at) + '</div></div>',
        '<div class="wall-card-actions"><button type="button" class="more-btn" data-id="' + p.id + '">⋯</button>',
        '<div class="more-menu hidden" data-menu="' + p.id + '">' + menu + '</div></div></div>',
        '<div class="wall-body"><span class="wall-body-text">' + escapeHtml(short) + '</span>',
        (need ? '<button type="button" class="expand-btn">展开</button>' : ''),
        '</div><div class="wall-ft"><span class="wall-views">浏览' + (p.view_count || 0) + '</span>',
        '<div class="wall-acts"><span class="act-like" data-id="' + p.id + '">🤍 ' + (p.like_count || 0) + '</span>',
        '<span class="act-comment" data-id="' + p.id + '">💬 ' + (p.reply_count || 0) + '</span></div></div>',
        (p.is_reported ? '<div class="report-badge">已举报 · 社区表决中</div>' : ''),
        '</article>'
      ].join('');
    };

    const _render = renderFeedCards;
    window.renderFeedCards = function (posts, container) {
      _render(posts, container);
      if (!container) return;
      container.querySelectorAll('.act-comment').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          openPost(btn.dataset.id, true);
        });
      });
    };

    document.addEventListener('click', async function (e) {
      const item = e.target.closest && e.target.closest('.more-item[data-act="report"]');
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      const id = item.dataset.id;
      if (!confirm('确认举报该帖？将自动投「违规」票并开启社区表决。')) return;
      const res = await API.reportPost(id);
      if (!res.ok) { alert(res.error || '举报失败'); return; }
      alert(res.message || ('已举报。票数 违规' + (res.violation || 0) + ' / 正常' + (res.normal || 0)));
      if (typeof lastFeedPage !== 'undefined' && lastFeedPage === 'anonymous') loadAnonFeed();
      else loadWallFeed();
    }, true);

    const _open = openPost;
    window.openPost = async function (postId, focusReply) {
      await _open(postId);
      try {
        const data = await API.getPost(postId);
        if (!data || !data.post) return;
        const votes = data.votes || {};
        const isReported = !!(data.post.is_reported || votes.is_reported);
        const box = document.getElementById('post-detail');
        if (box) {
          box.querySelectorAll('.vote-btns.detail-vote').forEach(function (el) {
            if (!isReported) el.remove();
          });
        }
        if (box && isReported && !box.querySelector('.vote-panel')) {
          const panel = document.createElement('div');
          panel.className = 'vote-panel';
          let html = '<div class="vote-counts">违规 <b>' + (votes.violation || 0) + '</b> · 正常 <b>' + (votes.normal || 0) + '</b>';
          if (votes.my_vote) html += ' · 你已投' + (votes.my_vote === 'violation' ? '违规' : '正常');
          html += '</div>';
          if (!votes.my_vote) {
            html += '<div class="vote-btns"><button type="button" class="vote-btn vote-bad" data-vote="violation">投违规</button><button type="button" class="vote-btn vote-ok" data-vote="normal">投正常</button></div>';
          }
          panel.innerHTML = html;
          const body = box.querySelector('.detail-body') || box.firstChild;
          if (body && body.parentNode) body.parentNode.insertBefore(panel, body.nextSibling);
          panel.querySelectorAll('.vote-btn').forEach(function (vb) {
            vb.addEventListener('click', async function () {
              const res = await API.votePost(String(postId), vb.dataset.vote);
              if (!res.ok) { alert(res.error || '投票失败'); return; }
              alert(res.message || '投票成功');
              openPost(postId, focusReply);
            });
          });
        }
      } catch (err) {}
      if (focusReply) {
        const rc = document.getElementById('reply-content');
        if (rc) setTimeout(function () { rc.focus(); rc.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120);
      }
    };
  }
  wait();
})();

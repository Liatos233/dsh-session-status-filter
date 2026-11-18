window.__ModuleLoader__.load({
  id: 'dsh-session-status-filter',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const useSyncExternalStore = React.useSyncExternalStore;

    const PLUGIN_ID = 'dsh-session-status-filter';
    const CSS_ID = PLUGIN_ID + '/base.css';

    const CSS = `
/* 筛选条：插在官方工具栏之后，侧边栏文档流内 */
#sfb-bar-root{flex:none;display:flex;gap:6px;padding:0 12px 8px;flex-wrap:wrap;box-sizing:border-box;width:100%}
.sfb-chip{border:1px solid transparent;cursor:pointer;font-size:12px;line-height:1;padding:5px 10px;border-radius:999px;
  background:var(--dsw-alias-interactive-bg-default,var(--dsw-alias-fill-secondary,#eef1f5));
  color:var(--dsw-alias-label-secondary,#5b6472);display:inline-flex;align-items:center;gap:5px;
  transition:background .12s ease,color .12s ease}
.sfb-chip:hover{background:var(--dsw-alias-interactive-bg-hover,#e3e8ee)}
.sfb-chip[data-active="1"]{background:var(--dsw-alias-accent-bg,#247bbf);color:var(--dsw-alias-label-on-accent,#fff)}
.sfb-count{font-variant-numeric:tabular-nums;font-size:11px;opacity:.85}
.sfb-dot{width:7px;height:7px;border-radius:50%;display:inline-block;flex:none;background:transparent}
.sfb-dot[data-k="running"]{background:#3aa76d}
.sfb-dot[data-k="pending"]{background:#e6a23c}
.sfb-dot[data-k="unread"]{background:#4f7cf0}
.sfb-badge{width:8px;height:8px;border-radius:50%;flex:none;margin-left:2px}
.sfb-badge[data-k="running"]{background:#3aa76d}
.sfb-badge[data-k="pending"]{background:#e6a23c}
.sfb-badge[data-k="unread"]{background:#4f7cf0}
.sfb-badge[data-k="multi"]{background:linear-gradient(90deg,#3aa76d 0 50%,#e6a23c 50% 100%)}
/* 筛选结果面板（自绘，贴近官方行样式） */
#sfb-results{display:none;flex-direction:column;gap:1px;max-height:46vh;overflow-y:auto;overflow-x:hidden;
  padding:0 6px 8px;box-sizing:border-box;flex:none}
#sfb-results.sfb-open{display:flex}
#sfb-results .sfb-empty{padding:12px 8px;font-size:12px;color:var(--dsw-alias-label-secondary,#8a93a1);text-align:center}
.sfb-result{display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:6px;cursor:pointer;
  color:var(--dsw-alias-label-primary,#1c2128);font-size:12.5px;line-height:1.3;min-height:30px;box-sizing:border-box}
.sfb-result:hover{background:var(--dsw-alias-interactive-bg-hover,#eef1f5)}
.sfb-result .sfb-r-ws{font-size:10.5px;color:var(--dsw-alias-label-secondary,#8a93a1);flex:none;
  max-width:88px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sfb-result .sfb-r-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sfb-result .sfb-r-time{font-size:10.5px;color:var(--dsw-alias-label-secondary,#8a93a1);flex:none;
  font-variant-numeric:tabular-nums}
/* 筛选激活时隐藏官方列表，避免同一屏两套列表 */
[data-sidebar-list-area].sfb-hide-list{display:none!important}
`;

    function ensureCss() {
      if (typeof document === 'undefined') return;
      if (document.querySelector('style[data-plugin-css="' + CSS_ID + '"]')) return;
      const tag = document.createElement('style');
      tag.dataset.plugin = PLUGIN_ID;
      tag.dataset.pluginCss = CSS_ID;
      tag.textContent = CSS;
      document.head.appendChild(tag);
    }

    // 数据订阅：原生监听，供纯 DOM 的筛选条重绘
    function makeStore() {
      const listeners = new Set();
      return {
        subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        emit() { for (const fn of [...listeners]) { try { fn(); } catch (e) { console.error(e); } } },
      };
    }

    function statusOf(status, row) {
      const questionsActive = !!(row && row.questionsActive);
      if (status) {
        return {
          running: !!status.running || (!!row && row.running === true),
          // 只信 UI 注册的挂起交互（回答后立刻清除）
          pending: !!status.pending,
          unread: !!status.unread,
        };
      }
      return { running: !!row && row.running === true, pending: questionsActive, unread: false };
    }

    function timeAgo(ts, now = Date.now()) {
      if (!ts) return '';
      const d = Math.max(0, now - ts);
      const m = Math.floor(d / 60000);
      if (m < 1) return '刚刚';
      if (m < 60) return m + ' 分钟';
      const hr = Math.floor(m / 60);
      if (hr < 24) return hr + ' 小时';
      const day = Math.floor(hr / 24);
      if (day < 30) return day + ' 天';
      return Math.floor(day / 30) + ' 月';
    }

    function baseName(p) {
      if (!p) return '';
      const parts = String(p).split(/[\\/]/).filter(Boolean);
      return parts.length ? parts[parts.length - 1] : '';
    }

    // 行尾徽标：官方行插槽
    function RowBadge({ sessionId, uiSession }) {
      const st = useSyncExternalStore(
        React.useCallback((cb) => uiSession.sessionStatus.subscribe(() => cb()), [uiSession]),
        React.useCallback(() => {
          const v = uiSession.sessionStatus.getSnapshot().get(sessionId);
          if (!v) return null;
          return {
            key: `${!!v.running}|${!!v.pendingInteraction}|${!!v.completionUnread}`,
            running: !!v.running,
            pending: !!v.pendingInteraction,
            unread: !!v.completionUnread,
          };
        }, [uiSession, sessionId]),
      );
      if (!st) return null;
      const badges = [];
      if (st.pending) badges.push('pending');
      else if (st.running) badges.push('running');
      if (st.unread) badges.push('unread');
      if (badges.length === 0) return null;
      return h('span', {
        className: 'sfb-badge',
        'data-k': badges.length > 1 ? 'multi' : badges[0],
        title: badges.map((b) => ({ running: '运行中', pending: '待确认', unread: '未读' }[b])).join(' / '),
      });
    }

    // ── 筛选条 + 结果面板：纯 DOM，不使用 React root ──────────
    function mountBar(ctx, store) {
      const host = document.querySelector('[data-sidebar-workspace-header]');
      if (!host) return null;
      // 热重载可能残留旧实例的节点：一律先移除，保证新代码生效
      const staleBar = document.getElementById('sfb-bar-root');
      if (staleBar) staleBar.remove();
      const staleResults = document.getElementById('sfb-results');
      if (staleResults) staleResults.remove();

      let filter = 'all'; // all | running | pending | unread
      const emptyState = { list: [], status: new Map() };
      const snap = () => store.state || emptyState;

      const root = document.createElement('div');
      root.id = 'sfb-bar-root';
      host.insertAdjacentElement('afterend', root);

      const results = document.createElement('div');
      results.id = 'sfb-results';
      root.insertAdjacentElement('afterend', results);

      const chips = [
        { kind: 'all', label: '全部', dot: null },
        { kind: 'running', label: '运行中', dot: 'running' },
        { kind: 'pending', label: '待确认', dot: 'pending' },
        { kind: 'unread', label: '未读', dot: 'unread' },
      ];
      const els = {};
      for (const c of chips) {
        const b = document.createElement('button');
        b.className = 'sfb-chip';
        b.dataset.active = '0';
        b.title = c.label;
        if (c.dot) {
          const d = document.createElement('span');
          d.className = 'sfb-dot';
          d.dataset.k = c.dot;
          b.appendChild(d);
        }
        b.appendChild(document.createTextNode(c.label));
        const count = document.createElement('span');
        count.className = 'sfb-count';
        count.textContent = '0';
        b.appendChild(count);
        b.addEventListener('click', () => {
          filter = (filter === c.kind) ? 'all' : c.kind;
          render();
        });
        root.appendChild(b);
        els[c.kind] = { btn: b, count };
      }

      function statusOfId(id) {
        const state = snap();
        const row = state.list.find((r) => r.id === id);
        return statusOf(state.status.get(id), row);
      }

      function computeCounts() {
        const state = snap();
        let running = 0, pending = 0, unread = 0;
        for (const row of state.list) {
          const st = statusOf(state.status.get(row.id), row);
          if (st.pending) pending++;
          else if (st.running) running++;
          if (st.unread) unread++;
        }
        return { running, pending, unread };
      }

      function computeMatchedRows() {
        const state = snap();
        const out = [];
        for (const row of state.list) {
          const st = statusOf(state.status.get(row.id), row);
          let ok;
          if (filter === 'running') ok = st.running && !st.pending;
          else if (filter === 'pending') ok = st.pending;
          else if (filter === 'unread') ok = st.unread;
          else ok = true;
          if (ok) out.push({ row, st });
        }
        out.sort((a, b) => (b.row.updatedAt || 0) - (a.row.updatedAt || 0));
        return out;
      }

      function renderResults(items) {
        results.textContent = '';
        if (!items.length) {
          const empty = document.createElement('div');
          empty.className = 'sfb-empty';
          empty.textContent = '没有符合条件的会话';
          results.appendChild(empty);
          return;
        }
        const now = Date.now();
        for (const { row, st } of items) {
          const item = document.createElement('div');
          item.className = 'sfb-result';
          item.title = row.displayTitle || '';

          const dot = document.createElement('span');
          dot.className = 'sfb-dot';
          dot.dataset.k = st.pending ? 'pending' : st.running ? 'running' : st.unread ? 'unread' : 'idle';
          item.appendChild(dot);

          const ws = baseName(row.cwd);
          if (ws) {
            const wsEl = document.createElement('span');
            wsEl.className = 'sfb-r-ws';
            wsEl.textContent = ws;
            wsEl.title = row.cwd;
            item.appendChild(wsEl);
          }

          const title = document.createElement('span');
          title.className = 'sfb-r-title';
          title.textContent = row.displayTitle || row.id;
          item.appendChild(title);

          const t = document.createElement('span');
          t.className = 'sfb-r-time';
          t.textContent = timeAgo(row.updatedAt, now);
          item.appendChild(t);

          item.addEventListener('click', () => {
            try {
              ctx.uiWorkspace.openSession(row.id);
            } catch (e) {
              console.error('[session-filter] openSession failed', e);
            }
          });
          results.appendChild(item);
        }
      }

      function render() {
        const state = snap();
        const counts = computeCounts();
        for (const c of chips) {
          els[c.kind].btn.dataset.active = filter === c.kind ? '1' : '0';
          els[c.kind].count.textContent = String(c.kind === 'all' ? state.list.length : counts[c.kind]);
        }
        els.all.btn.title = `全部 ${state.list.length} 个会话`;
        els.running.btn.title = `运行中 ${counts.running}`;
        els.pending.btn.title = `待确认 ${counts.pending}`;
        els.unread.btn.title = `未读 ${counts.unread}`;

        const open = filter !== 'all';
        results.classList.toggle('sfb-open', open);
        const listArea = document.querySelector('[data-sidebar-list-area]');
        if (listArea) listArea.classList.toggle('sfb-hide-list', open);
        if (!open) {
          results.textContent = '';
          return;
        }
        renderResults(computeMatchedRows());
      }

      render();
      const dispose = store.subscribe(render);

      window.__sfbDebug = () => {
        const state = snap();
        return {
          filter,
          listCount: state.list.length,
          counts: computeCounts(),
          matched: computeMatchedRows().map(({ row }) => ({ id: row.id, title: row.displayTitle, cwd: row.cwd })),
          rows: state.list.map((r) => ({ id: r.id, running: r.running, status: state.status.get(r.id) || null })),
          resultsRendered: document.querySelectorAll('#sfb-results .sfb-result').length,
        };
      };

      return () => {
        dispose();
        delete window.__sfbDebug;
        root.remove();
        results.remove();
        const listArea = document.querySelector('[data-sidebar-list-area]');
        if (listArea) listArea.classList.remove('sfb-hide-list');
      };
    }

    return {
      inject: ['slots', 'sessions', 'uiSession', 'uiWorkspace', 'workspaces'],
      apply(ctx) {
        ensureCss();
        const store = makeStore();

        // 订阅官方数据 → 推给筛选条重绘
        const push = () => {
          const s = ctx.sessions.list.getSnapshot();
          const list = [];
          for (const id of s.ids) {
            const r = s.byId[id];
            if (!r || r.blank) continue;
            // 官方 sessionVisible() 会过滤 subagent 会话，它们永远不渲染，这里也排除
            if (r.origin === 'subagent') continue;
            const q = r.projectionValues && r.projectionValues.userQuestions;
            const questionsActive = !!(q && Array.isArray(q.active) && q.active.length > 0);
            list.push({
              id,
              displayTitle: r.displayTitle || r.title || id,
              running: !!r.running,
              questionsActive,
              cwd: r.cwd || '',
              updatedAt: Number(r.updatedAt) || 0,
            });
          }
          const status = new Map();
          const statusSnap = ctx.uiSession?.sessionStatus?.getSnapshot?.() || new Map();
          for (const [id, v] of statusSnap) {
            status.set(id, {
              running: !!v.running,
              pending: !!v.pendingInteraction,
              unread: !!v.completionUnread,
            });
          }
          store.state = { list, status };
          store.emit();
        };

        const un1 = ctx.sessions.list.subscribe(push);
        const un2 = ctx.uiSession?.sessionStatus?.subscribe?.(push) || (() => {});
        push();

        // 等侧边栏渲染出工具栏后再挂载（最多重试 60 秒）
        let disposeDom = null;
        let tries = 0;
        const timer = window.setInterval(() => {
          if (disposeDom || tries++ > 120) { clearInterval(timer); return; }
          if (document.querySelector('[data-sidebar-workspace-header]')) {
            disposeDom = mountBar(ctx, store);
            if (disposeDom) clearInterval(timer);
          }
        }, 500);

        ctx.slots.inject('sidebar.session.row.trailing', () => ctx.slots.register({
          name: 'sidebar.session.row.trailing',
          id: 'session-filter-row-badge',
          order: 20,
        }, (props) => h(RowBadge, { sessionId: props.sessionId, uiSession: ctx.uiSession })));

        ctx.on('dispose', () => {
          clearInterval(timer);
          un1(); un2();
          if (disposeDom) disposeDom();
        });
      },
    };
  },
});

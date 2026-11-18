// 与插件 client.js 中 statusOf / computeCounts / computeMatchedRows 同源的纯逻辑测试
// （插件里是闭包函数，这里复刻同样的判定规则验证行为）

function statusOf(status, row) {
  const questionsActive = !!(row && row.questionsActive);
  if (status) {
    return {
      running: !!status.running || (!!row && row.running === true),
      pending: !!status.pending,
      unread: !!status.unread,
    };
  }
  return { running: !!row && row.running === true, pending: questionsActive, unread: false };
}

function computeCounts(list, statusMap) {
  let running = 0, pending = 0, unread = 0;
  for (const row of list) {
    const st = statusOf(statusMap.get(row.id), row);
    if (st.pending) pending++;
    else if (st.running) running++;
    if (st.unread) unread++;
  }
  return { running, pending, unread };
}

function computeMatchedRows(list, statusMap, filter) {
  const out = [];
  for (const row of list) {
    const st = statusOf(statusMap.get(row.id), row);
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

const mk = (id, updatedAt, extra = {}) => ({ id, displayTitle: id, cwd: 'C:/proj/' + id, updatedAt, ...extra });

// 场景：5 个会话
const list = [
  mk('a', 100),                 // 未读
  mk('b', 200, { running: true }), // 运行中
  mk('c', 300),                 // 待确认（status）
  mk('d', 400),                 // 未读
  mk('e', 500),                 // 普通
];
const statusMap = new Map([
  ['a', { running: false, pending: false, unread: true }],
  ['b', { running: true, pending: false, unread: false }],
  ['c', { running: false, pending: true, unread: false }],
  ['d', { running: false, pending: false, unread: true }],
]);

let fails = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log('FAIL', name, 'got', got, 'want', want); }
  else console.log('ok  ', name, '=', JSON.stringify(got));
};

eq('counts', computeCounts(list, statusMap), { running: 1, pending: 1, unread: 2 });
eq('filter unread ids', computeMatchedRows(list, statusMap, 'unread').map(x => x.row.id), ['d', 'a']);
eq('filter pending ids', computeMatchedRows(list, statusMap, 'pending').map(x => x.row.id), ['c']);
eq('filter running ids', computeMatchedRows(list, statusMap, 'running').map(x => x.row.id), ['b']);
eq('filter all count', computeMatchedRows(list, statusMap, 'all').length, 5);
// 排序：全部按 updatedAt 降序
eq('all order', computeMatchedRows(list, statusMap, 'all').map(x => x.row.id), ['e', 'd', 'c', 'b', 'a']);
// pending 优先于 running：既 running 又 pending 的会话不计入 running
const mixed = new Map([['b', { running: true, pending: true, unread: true }]]);
eq('mixed counts', computeCounts(list, mixed), { running: 0, pending: 1, unread: 1 });
eq('mixed running filter', computeMatchedRows(list, mixed, 'running').map(x => x.row.id), []);

// timeAgo
function timeAgo(ts, now) {
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
eq('timeAgo 30s', timeAgo(Date.now() - 30 * 1000, Date.now()), '刚刚');
eq('timeAgo 5m', timeAgo(Date.now() - 5 * 60000, Date.now()), '5 分钟');

console.log(fails === 0 ? 'ALL PASS' : `${fails} FAILED`);
process.exit(fails === 0 ? 0 : 1);

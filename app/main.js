// A make.fun frontend on hash routes: #/ (board), #/bounty/<slug>,
// #/bounty/<slug>/leaderboard, #/user/<handle>.
// window.__shotReady is false while a page loads, true once its data is on
// screen. Bounty, leaderboard and profile views load on demand (import()),
// so the first load carries only the board.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, boardList } from './views-board.js';
import { esc, timeLeft } from './format.js';

const app = document.getElementById('app');
const boardState = { q: '', filter: 'all', sort: 'pot', showEnded: false };
let lbCache = null; // { slug, b, data } — paging never asks the API again
let ticker = 0;

function loading() {
  app.innerHTML =
    '<div class="loading"><p>Loading…</p><span class="skel" style="width:60%"></span><span class="skel" style="width:90%"></span><span class="skel" style="width:40%"></span></div>';
}

function failed(err, retry) {
  app.innerHTML = `<div class="error" role="alert"><p><b>Couldn’t load this page.</b></p><p>${esc(err.message)}</p><button id="retry">Try again</button></div>`;
  document.getElementById('retry').addEventListener('click', retry);
  window.__shotReady = true; // an error page is still a settled page
}

/** Countdowns tick in place every 30 s; nothing re-renders. */
function tick() {
  document.querySelectorAll('[data-deadline]').forEach((el) => {
    el.textContent = timeLeft(el.dataset.deadline);
  });
}

function startTicker() {
  clearInterval(ticker);
  ticker = setInterval(tick, 30000);
  tick();
}

function stopTicker() {
  clearInterval(ticker);
}

function setTitle(text) {
  document.title = text ? `${text} | make.fun bounties` : 'make.fun bounties';
}

function markBoardCurrent(on) {
  const link = document.querySelector('.top nav a[href="#/"]');
  if (link) link.setAttribute('aria-current', on ? 'page' : 'false');
}

async function renderBoard() {
  window.__shotReady = false;
  setTitle('');
  markBoardCurrent(true);
  Object.assign(boardState, { q: '', filter: 'all', sort: 'pot', showEnded: false });
  loading();
  let data;
  try {
    data = await getBounties();
  } catch (err) {
    failed(err, render);
    return;
  }
  app.innerHTML = board(data);
  boardList(data, boardState);
  const search = document.getElementById('board-search');
  const sort = document.getElementById('board-sort');
  search.addEventListener('input', () => {
    boardState.q = search.value;
    boardList(data, boardState);
  });
  sort.addEventListener('change', () => {
    boardState.sort = sort.value;
    boardList(data, boardState);
  });
  document.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      boardState.filter = btn.dataset.filter;
      document.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      boardList(data, boardState);
    });
  });
  const ended = document.getElementById('board-ended');
  ended.addEventListener('click', () => {
    boardState.showEnded = !boardState.showEnded;
    ended.setAttribute('aria-pressed', String(boardState.showEnded));
    ended.textContent = boardState.showEnded ? 'Hide ended' : 'Show ended';
    boardList(data, boardState);
  });
  startTicker();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

async function renderBounty(slug) {
  window.__shotReady = false;
  markBoardCurrent(false);
  loading();
  let b;
  try {
    b = await getBounty(slug);
  } catch (err) {
    failed(err, render);
    return;
  }
  const { bounty } = await import('./views-bounty.js');
  setTitle(b.title);
  app.innerHTML = bounty(b);
  startTicker();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

async function renderLeaderboard(slug, page) {
  window.__shotReady = false;
  markBoardCurrent(false);
  if (!lbCache || lbCache.slug !== slug) {
    loading();
    try {
      const [b, data] = await Promise.all([getBounty(slug), getLeaderboard(slug)]);
      lbCache = { slug, b, data };
    } catch (err) {
      failed(err, render);
      return;
    }
  }
  const { leaderboard } = await import('./views-leaderboard.js');
  const { b, data } = lbCache;
  setTitle(`Leaderboard — ${b.title}`);
  app.innerHTML = leaderboard(b, data, page);
  document.getElementById('lb-prev')?.addEventListener('click', () => renderLeaderboard(slug, page - 1));
  document.getElementById('lb-next')?.addEventListener('click', () => renderLeaderboard(slug, page + 1));
  stopTicker();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

async function renderProfile(handle) {
  window.__shotReady = false;
  markBoardCurrent(false);
  loading();
  let p;
  try {
    p = await getProfile(handle);
  } catch (err) {
    failed(err, render);
    return;
  }
  const { profile } = await import('./views-profile.js');
  setTitle(p.display_name ?? p.handle);
  app.innerHTML = profile(p);
  stopTicker();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

function render() {
  const hash = location.hash || '#/';
  const lb = hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/);
  const bp = hash.match(/^#\/bounty\/([^/]+)$/);
  const up = hash.match(/^#\/user\/([^/]+)$/);
  if (lb) return renderLeaderboard(decodeURIComponent(lb[1]), 1);
  if (bp) return renderBounty(decodeURIComponent(bp[1]));
  if (up) return renderProfile(decodeURIComponent(up[1]));
  if (hash !== '#/' && hash !== '#' && hash !== '') history.replaceState(null, '', '#/');
  return renderBoard();
}

window.addEventListener('hashchange', render);
render();

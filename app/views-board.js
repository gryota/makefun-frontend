// The board: every open bounty, with its live pot, entry fee, time left and
// entries — searchable, filterable and sortable, without another request.
// main.js owns the controls' state and re-renders only the list, so typing
// in the search box never loses focus.

import { dateShort, esc, money, num, timeLeft } from './format.js';

const CLOSING_SOON_MS = 48 * 3600000;

export function isOpen(b) {
  return new Date(b.deadline).getTime() > Date.now();
}

export function isClosingSoon(b) {
  const ms = new Date(b.deadline).getTime() - Date.now();
  return ms > 0 && ms <= CLOSING_SOON_MS;
}

const pot = (b) => Number(b.potUsd ?? b.rewardAmount ?? 0);
const fee = (b) => Number(b.entryFeeUsd ?? 0);
const entries = (b) => Number(b.submissionCount ?? 0);

function matches(b, q) {
  if (!q) return true;
  const hay = [b.title, b.category, b.sponsor?.name, ...(b.skills ?? [])].join(' ').toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((w) => hay.includes(w));
}

const FILTERS = {
  all: () => true,
  soon: isClosingSoon,
  free: (b) => fee(b) === 0,
  paid: (b) => fee(b) > 0,
  big: (b) => pot(b) >= 500,
};

const SORTS = {
  pot: (a, b) => pot(b) - pot(a),
  deadline: (a, b) => new Date(a.deadline) - new Date(b.deadline),
  entries: (a, b) => entries(b) - entries(a),
  title: (a, b) => String(a.title).localeCompare(String(b.title)),
};

function card(b) {
  const soon = isClosingSoon(b);
  const ended = !isOpen(b);
  const skills = (b.skills ?? [])
    .slice(0, 3)
    .map((s) => `<span class="chip">${esc(s)}</span>`)
    .join('');
  return `
  <article class="card">
    <div class="chiprow">
      <span class="chip">${esc(b.category ?? 'Bounty')}</span>
      ${ended ? '<span class="chip badge-ended">Ended</span>' : soon ? '<span class="chip badge-soon">Closing soon</span>' : '<span class="chip badge-open">Open</span>'}
      ${fee(b) ? `<span class="chip badge-fee">${money(fee(b))} entry fee</span>` : '<span class="chip">Free entry</span>'}
    </div>
    <h3><a href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a></h3>
    <div class="pot">${money(pot(b))} <small>live pot</small></div>
    <div class="meta">
      <span><b>${num(entries(b))}</b> ${entries(b) === 1 ? 'entry' : 'entries'}</span>
      <span>base prize ${money(b.rewardAmount)}</span>
      ${b.sponsor?.name ? `<span>by ${esc(b.sponsor.name)}</span>` : ''}
    </div>
    <div class="foot-row">
      <span class="timeleft${soon ? ' soon' : ''}${ended ? ' ended' : ''}" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span>
      <span>Ends ${dateShort(b.deadline)}</span>
    </div>
    ${skills ? `<div class="chiprow">${skills}</div>` : ''}
  </article>`;
}

/** The board shell: stats, controls and an empty list main.js fills in. */
export function board(data) {
  const items = data.items ?? [];
  const open = items.filter(isOpen);
  const totalPot = open.reduce((s, b) => s + pot(b), 0);
  const totalEntries = open.reduce((s, b) => s + entries(b), 0);
  const soon = open.filter(isClosingSoon).length;
  return `
  <h1>Open bounties</h1>
  <p class="lede">Every live make.fun bounty — its pot as it stands now, its entry fee, how long is left, and how many entries it has. Pots grow as entry fees come in.</p>
  <div class="stats" role="group" aria-label="Board totals">
    <div class="stat"><b>${num(open.length)}</b><span>open bounties</span></div>
    <div class="stat"><b>${money(totalPot)}</b><span>total live pot</span></div>
    <div class="stat"><b>${num(totalEntries)}</b><span>entries</span><span class="sub">across all open bounties</span></div>
    <div class="stat"><b>${num(soon)}</b><span>closing within 48 h</span></div>
  </div>
  <div class="controls">
    <input type="search" id="board-search" placeholder="Search title, category or skill…" aria-label="Search bounties">
    <select id="board-sort" aria-label="Sort bounties">
      <option value="pot">Biggest pot first</option>
      <option value="deadline">Closing soonest first</option>
      <option value="entries">Most entries first</option>
      <option value="title">Title A–Z</option>
    </select>
    <span class="count" id="board-count"></span>
  </div>
  <div class="chiprow" role="group" aria-label="Filter bounties">
    <button class="chip" data-filter="all" aria-pressed="true">All</button>
    <button class="chip" data-filter="soon" aria-pressed="false">Closing soon</button>
    <button class="chip" data-filter="free" aria-pressed="false">Free entry</button>
    <button class="chip" data-filter="paid" aria-pressed="false">Paid entry</button>
    <button class="chip" data-filter="big" aria-pressed="false">Pot $500+</button>
    <button class="linklike" id="board-ended" aria-pressed="false">Show ended</button>
  </div>
  <div class="board" id="board-list"></div>
  <p class="lede" style="margin-top:20px">Live from the make.fun public API. Ended bounties stay listed by the API after their deadline — this board hides them unless you ask.</p>`;
}

/** The cards for the current search, filter and sort — and the count line. */
export function boardList(data, state) {
  const items = data.items ?? [];
  const pool = state.showEnded ? items : items.filter(isOpen);
  const filter = FILTERS[state.filter] ?? FILTERS.all;
  const shown = pool
    .filter((b) => filter(b))
    .filter((b) => matches(b, state.q))
    .sort(SORTS[state.sort]);
  const list = document.getElementById('board-list');
  const count = document.getElementById('board-count');
  if (count) count.textContent = `${num(shown.length)} of ${num(pool.length)} shown`;
  if (!list) return;
  list.innerHTML = shown.length
    ? shown.map(card).join('')
    : '<p class="empty">No bounties match that search. Try a different word, or clear a filter.</p>';
}

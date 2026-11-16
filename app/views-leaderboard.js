// A bounty's leaderboard: every entry's judge win rate, its interval, its
// win–loss record, validity and size — paged 25 at a time on the client, so
// paging never asks the API again.

import { bytes, date, esc, num, pct } from './format.js';

export const PAGE_SIZE = 25;

function avatar(e) {
  if (!e.image) return '';
  return `<img class="avatar" src="https://make.fun${esc(e.image)}" alt="" loading="lazy" crossorigin="anonymous">`;
}

function row(e) {
  const v = e.values ?? {};
  const j = e.judge ?? {};
  const record = j.matches ? `${num(j.wins ?? 0)}–${num(j.losses ?? 0)}` : '—';
  return `<tr>
    <td class="num"><b>${num(e.rank)}</b></td>
    <td>${avatar(e)}<b>${esc(e.title ?? 'Untitled entry')}</b><br><a href="#/user/${encodeURIComponent(e.handle)}">@${esc(e.handle)}</a>${j.provisional ? ' <span class="chip">provisional</span>' : ''}</td>
    <td class="num"><b>${pct(v.judge)}</b></td>
    <td class="num">${pct(v.judge_low)} – ${pct(v.judge_high)}</td>
    <td class="num">${record}</td>
    <td class="num">${Number(v.valid) ? 'Yes' : 'No'}</td>
    <td class="num">${bytes(v.bytes)}</td>
  </tr>`;
}

export function leaderboard(b, data, page) {
  const entries = data.entries ?? [];
  const pages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const current = Math.min(Math.max(page, 1), pages);
  const slice = entries.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const phase = data.phase ?? {};
  const tie = b?.leaderboard?.tieBreak;
  return `
  <p><a class="back" href="#/bounty/${encodeURIComponent(b.slug)}">← ${esc(b.title)}</a></p>
  <h1>Leaderboard</h1>
  <p class="lede">${esc(phase.title ?? 'Results')} — scores ${phase.scores ?? 'live'}${phase.scores_visible === false ? ', hidden until the phase ends' : ''}. Rates are provisional: each entry is judged against the house frontends as it arrives, and the final heat re-judges every entry afresh.${tie ? ` Ties break on ${esc(tie.title.toLowerCase())} (smaller wins).` : ''}</p>
  <p class="count">${num(entries.length)} entries</p>
  <div class="tablewrap"><table>
    <thead><tr><th class="num">#</th><th>Entry</th><th class="num">Judge win rate</th><th class="num">Interval</th><th class="num">W–L</th><th class="num">Valid</th><th class="num">Size</th></tr></thead>
    <tbody>${slice.map(row).join('') || '<tr><td colspan="7">No entries yet.</td></tr>'}</tbody>
  </table></div>
  <div class="pager">
    <button id="lb-prev" ${current <= 1 ? 'disabled' : ''}>← Previous</button>
    <button id="lb-next" ${current >= pages ? 'disabled' : ''}>Next →</button>
    <span class="pages">Page ${num(current)} of ${num(pages)}</span>
  </div>`;
}

// One bounty: its live pot and fee split, its rewards table, its dates, and
// its description and rules — rendered from the API's markdown with a small
// renderer of our own (no dependency, nothing fetched).

import { date, esc, money, num, timeLeft } from './format.js';
import { isClosingSoon, isOpen } from './views-board.js';

/** Inline markdown: bold, italic, code, links. Input is already escaped. */
function inline(text) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}

/** Block markdown: headings, lists, code fences, rules, paragraphs. */
export function md(text) {
  const lines = String(text ?? '').split('\n');
  let html = '';
  let list = null; // 'ul' | 'ol' | null
  let fence = false;
  const closeList = () => {
    if (list) {
      html += `</${list}>`;
      list = null;
    }
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('```')) {
      if (fence) {
        html += '</code></pre>';
        fence = false;
      } else {
        closeList();
        html += '<pre><code>';
        fence = true;
      }
      continue;
    }
    if (fence) {
      html += `${esc(line)}\n`;
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      html += `<h${level}>${inline(esc(heading[2]))}</h${level}>`;
      continue;
    }
    if (/^---+$/.test(line)) {
      closeList();
      html += '<hr>';
      continue;
    }
    const bullet = line.match(/^[-*]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const want = bullet ? 'ul' : 'ol';
      if (list !== want) {
        closeList();
        html += `<${want}>`;
        list = want;
      }
      html += `<li>${inline(esc(bullet ? bullet[1] : numbered[1]))}</li>`;
      continue;
    }
    if (line.trim() === '') {
      closeList();
      continue;
    }
    closeList();
    html += `<p>${inline(esc(line))}</p>`;
  }
  closeList();
  if (fence) html += '</code></pre>';
  return html;
}

/** The rewards table: live per-place amounts (base prize + entry-fee share). */
function rewardsTable(b) {
  const now = b.rewardsNow;
  if (Array.isArray(now) && now.length) {
    const rows = now
      .map(
        (r) => `<tr>
          <td>${esc(r.place)}</td>
          <td class="num">${money(r.baseUsd)}</td>
          <td class="num">${money(r.feeShareUsd)}</td>
          <td class="num"><b>${money(r.amountUsd)}</b></td>
        </tr>`,
      )
      .join('');
    return `
    <div class="tablewrap"><table>
      <thead><tr><th>Place</th><th class="num">Base prize</th><th class="num">Entry-fee share</th><th class="num">Total now</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="lede" style="font-size:14px">Totals grow as entry fees come in; the split is set by the bounty.</p>`;
  }
  const rewards = b.rewards ?? {};
  // Place keys are usually plain numbers, but a range like "4-10" parses to
  // NaN — sort by the leading number so ranges still land in order.
  const places = Object.keys(rewards).sort((a, c) => (parseInt(a, 10) || 0) - (parseInt(c, 10) || 0));
  if (!places.length) return '<p class="empty">No rewards table published for this bounty yet.</p>';
  const rows = places
    .map((p) => `<tr><td>${esc(p)}</td><td class="num"><b>${money(rewards[p])}</b></td></tr>`)
    .join('');
  return `
  <div class="tablewrap"><table>
    <thead><tr><th>Place</th><th class="num">Prize</th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

export function bounty(b) {
  const open = isOpen(b);
  const soon = isClosingSoon(b);
  const fee = Number(b.entryFeeUsd ?? 0);
  const pot = Number(b.potUsd ?? b.rewardAmount ?? 0);
  const feeTotal = Number(b.entryFeesUsd ?? 0);
  const phase = (b.phases ?? []).find((p) => p.key === 'dev') ?? (b.phases ?? [])[0];
  return `
  <p><a class="back" href="#/">← All bounties</a></p>
  <h1>${esc(b.title)}</h1>
  <div class="chiprow">
    <span class="chip">${esc(b.category ?? 'Bounty')}</span>
    ${open ? (soon ? '<span class="chip badge-soon">Closing soon</span>' : '<span class="chip badge-open">Open</span>') : '<span class="chip badge-ended">Ended</span>'}
    ${b.sponsor?.name ? `<span class="chip">by ${esc(b.sponsor.name)}</span>` : ''}
    ${phase ? `<span class="chip">${esc(phase.title)} · scores ${phase.scoresVisible ? 'live' : 'hidden'}</span>` : ''}
  </div>
  <p class="lede">${esc(b.summary ?? '')}</p>
  <div class="stats" role="group" aria-label="Bounty facts">
    <div class="stat"><b>${money(pot)}</b><span>live pot</span><span class="sub">${feeTotal ? `${money(feeTotal)} from entry fees` : 'base prize only so far'}</span></div>
    <div class="stat"><b>${fee ? money(fee) : 'Free'}</b><span>entry fee</span><span class="sub">${fee ? `${num(b.entryFeePayers ?? 0)} payers` : 'no fee to enter'}</span></div>
    <div class="stat"><b class="timeleft${soon ? ' soon' : ''}${open ? '' : ' ended'}" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</b><span>until deadline</span><span class="sub">${date(b.deadline)}</span></div>
    <div class="stat"><b>${num(b.submissionCount)}</b><span>${Number(b.submissionCount) === 1 ? 'entry' : 'entries'}</span><span class="sub">${b.acceptingSubmissions ? 'still accepting' : 'closed to new entries'}</span></div>
  </div>
  <h2>Rewards</h2>
  ${rewardsTable(b)}
  <p><a href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard"><b>View the leaderboard →</b></a></p>
  <h2>About this bounty</h2>
  <div class="prose">${md(b.description)}</div>
  ${
    b.rules
      ? `<details class="rules"><summary>Full rules (${num(b.rules.length)} characters)</summary><div class="prose">${md(b.rules)}</div></details>`
      : ''
  }
  <h2>Dates</h2>
  <div class="tablewrap"><table>
    <tbody>
      <tr><td>Opens</td><td>${date(b.opensAt)}</td></tr>
      <tr><td>Deadline</td><td>${date(b.deadline)}</td></tr>
      ${b.publishedAt ? `<tr><td>Published</td><td>${date(b.publishedAt)}</td></tr>` : ''}
      ${b.resolvedAt ? `<tr><td>Resolved</td><td>${date(b.resolvedAt)}</td></tr>` : ''}
    </tbody>
  </table></div>`;
}

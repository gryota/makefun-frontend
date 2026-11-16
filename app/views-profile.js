// A public profile: who the account is, what it has done, and what it has
// won — its record, its entries across bounties, and its payouts.

import { date, esc, money, num, pct, shortAddr } from './format.js';

function scoreCell(s) {
  if (!s) return '—';
  const key = s.column?.key;
  if (key === 'judge') return pct(s.value);
  return esc(s.display ?? s.value ?? '—');
}

function solutionRow(s) {
  const c = s.competition ?? {};
  return `<tr>
    <td><a href="#/bounty/${encodeURIComponent(c.slug ?? '')}">${esc(c.title ?? c.slug ?? '—')}</a></td>
    <td>${esc(s.title ?? '—')}</td>
    <td>${date(s.entered_at)}</td>
    <td class="num">${s.placement ? num(s.placement) : '—'}</td>
    <td class="num">${s.prize_usd ? money(s.prize_usd) : '—'}</td>
    <td class="num">${scoreCell(s.score)}</td>
  </tr>`;
}

export function profile(p) {
  const r = p.record ?? {};
  const solutions = p.solutions ?? [];
  const payouts = p.payouts ?? [];
  const wallet = p.wallet ?? {};
  const x = p.x ?? {};
  const avatarSrc = p.image ? (/^https?:\/\//.test(p.image) ? p.image : `https://make.fun${p.image}`) : '';
  const walletLink = wallet.address
    ? wallet.explorer_url
      ? `<a href="${esc(wallet.explorer_url)}">Wallet: ${esc(shortAddr(wallet.address))}</a>`
      : `<span>Wallet: ${esc(shortAddr(wallet.address))}</span>`
    : '';
  return `
  <p><a class="back" href="#/">← All bounties</a></p>
  <div class="profile-head">
    ${avatarSrc ? `<img class="avatar-lg" src="${esc(avatarSrc)}" alt="" crossorigin="anonymous">` : ''}
    <div>
      <h1>${esc(p.display_name ?? p.handle)}</h1>
      <div class="handle">@${esc(p.handle)}</div>
      ${p.joined_at ? `<div class="handle">Joined ${date(p.joined_at)}</div>` : ''}
    </div>
  </div>
  ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
  <div class="linklist">
    ${p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub: ${esc(p.github_login)}</a>` : ''}
    ${x.username ? `<a href="${esc(x.url ?? `https://x.com/${x.username}`)}">X: @${esc(x.username)}</a>` : ''}
    ${walletLink}
    ${p.discord ? `<span>Discord: ${esc(p.discord)}</span>` : ''}
  </div>
  <div class="stats" role="group" aria-label="Record">
    <div class="stat"><b>${num(r.competitions_entered)}</b><span>bounties entered</span></div>
    <div class="stat"><b>${num(r.competitions_placed)}</b><span>placements</span><span class="sub">${num(r.podium_finishes ?? 0)} podiums · ${num(r.competitions_won ?? 0)} wins</span></div>
    <div class="stat"><b>${r.best_placement ? num(r.best_placement) : '—'}</b><span>best placement</span></div>
    <div class="stat"><b>${money(r.prize_usd ?? 0)}</b><span>prize money won</span></div>
  </div>
  <h2>Entries</h2>
  ${
    solutions.length
      ? `<div class="tablewrap"><table>
        <thead><tr><th>Bounty</th><th>Entry</th><th>Entered</th><th class="num">Place</th><th class="num">Prize</th><th class="num">Score</th></tr></thead>
        <tbody>${solutions.map(solutionRow).join('')}</tbody>
      </table></div>`
      : '<p class="empty">No entries yet.</p>'
  }
  <h2>Payouts</h2>
  ${
    payouts.length
      ? `<div class="tablewrap"><table>
        <thead><tr><th>Paid</th><th>Bounty</th><th class="num">Place</th><th class="num">Amount</th><th>Receipt</th></tr></thead>
        <tbody>${payouts
          .map(
            (x) => `<tr>
              <td>${date(x.paid_at)}</td>
              <td><a href="#/bounty/${encodeURIComponent(x.competition?.slug ?? '')}">${esc(x.competition?.title ?? '—')}</a></td>
              <td class="num">${num(x.place)}</td>
              <td class="num"><b>${money(x.amount_usd)}</b></td>
              <td>${x.explorer_url ? `<a href="${esc(x.explorer_url)}">Solana ↗</a>` : '—'}</td>
            </tr>`,
          )
          .join('')}</tbody>
      </table></div>`
      : '<p class="empty">No payouts yet.</p>'
  }`;
}

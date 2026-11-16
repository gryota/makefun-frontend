# A fast, lean, open-source make.fun frontend: live bounty board, bounty pages, leaderboards and profiles — static files, no build step, no framework. Built by an AI agent for make.fun's "Build the best make.fun frontend" bounty, $500 in USDC plus entry fees.

[![make.fun](https://make.fun/badge/makefun-frontend-01.svg)](https://make.fun/?ref=7mqjt4kw)
[![Rank](https://make.fun/badge/makefun-frontend-01/gryota/makefun-frontend/rank.svg)](https://make.fun/bounty/makefun-frontend-01)
[![Reward](https://make.fun/badge/makefun-frontend-01/gryota/makefun-frontend/reward.svg)](https://make.fun/bounty/makefun-frontend-01)

A fast, lean, open-source make.fun frontend: live bounty board, bounty pages, leaderboards and profiles — static files, no build step, no framework.

- What it is: a complete make.fun client in static files — a live bounty board with search, filters and sorting; a page per bounty with live pot, rewards table, dates, description and rules; a paginated leaderboard per bounty; and public profiles with record, entries and payouts.
- How to run it: `node serve.ts`, then open http://localhost:8080 — no build step, no dependencies, no sign-in.
- How it works: it reads make.fun's public API (`https://make.fun/api`, GET only, CORS-open) and caches answers with ETag revalidation; the board, bounty, leaderboard and profile views are hash routes (`#/`, `#/bounty/<slug>`, `#/bounty/<slug>/leaderboard`, `#/user/<handle>`).
- What it costs: nothing beyond the public API, which is free — the frontend runs from static files, no wallet, no sign-in.

## Why it is fast

First load is six small files — `index.html`, `style.css`, `main.js`, `api.js`, `format.js` and `views-board.js`. The bounty, leaderboard and profile views load on demand (`import()`), so a visit to the board never pays for them. No framework, no fonts, no images beyond the API's own avatars; the API answers are cached in memory and session storage and revalidated with ETags, so moving between pages usually costs no request at all, and countdowns tick in place without a re-render.

Entered on [make.fun](https://make.fun/?ref=7mqjt4kw&utm_source=github&utm_medium=readme&utm_campaign=bounty&utm_content=makefun-frontend-01) for the ["Build the best make.fun frontend"](https://make.fun/bounty/makefun-frontend-01) bounty.

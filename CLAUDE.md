# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Goalix — a fan-token sports dApp on the **X Layer testnet** (live chainId `1952`, native token OKB, RPC `https://testrpc.xlayer.tech`, explorer OKLink). Football (soccer) players are tokenized as individual ERC20 contracts whose price tracks on-chain performance stats sourced from API-Football. Holders trade player tokens, play head-to-head games, buy match tickets, and claim a share of the token's payment pool at season end. **Content scope: a single league — the World Cup (API-Football league 1, season 2022) — with one national team, Argentina.**

> Migrated from Chiliz Spicy (88882) to X Layer testnet. NOTE: some network lists show X Layer testnet as chainId 195, but the live RPC reports **1952** — that is the correct value. Wallet is **Privy** (`@privy-io/react-auth` + `@privy-io/wagmi`), replacing the old RainbowKit/Socios setup.

Monorepo with two independent packages (no root package.json):
- `contracts/` — Hardhat + Solidity 0.8.20 smart contracts, deploy scripts, and the stats oracle.
- `web/` — Next.js 15 (App Router, React 19) frontend using wagmi/viem/RainbowKit, Tailwind v4, shadcn/ui.

## Commands

### web/ (run from `web/`)
- `npm run dev` — Next dev server (localhost:3000)
- `npm run build` / `npm run start`
- `npm run lint` — `next lint`
- No test suite. Multiple lockfiles exist (`package-lock.json`, `bun.lock`, `yarn.lock`) — prefer `npm`/`package-lock.json` for consistency.

### contracts/ (run from `contracts/`)
- `npm run compile` — `hardhat compile` (regenerates `typechain-types/`, `artifacts/`)
- `npx hardhat test` — runs `test/Lock.ts` (only the sample test exists; core contracts are untested)
- `npx hardhat test test/Lock.ts` — single test file
- `npm run deploy` / `deploy-all` / `deploy-team-tokens` / `mint-team-tokens` / `deploy-ticketing` — each is `hardhat run scripts/<x>.ts --network xlayer`
- `npm run update-stats` — one-off on-chain stats refresh via hardhat script
- `deploy-all` accepts `TEAM_ID=<apiFootballTeamId>` to deploy only one team (e.g. `TEAM_ID=26` = Argentina) and `TEAM_LIMIT=<n>` to cap team count — both help stay within the free API-Football plan (100 calls/day).

All `--network xlayer` commands require `PRIVATE_KEY` in env (`contracts/.env`) — the `xlayer` network is only registered in `hardhat.config.ts` when `PRIVATE_KEY` is set (otherwise only `localhost`/31337 exists). `RPC_URL` overrides the default X Layer RPC.

### Required env vars
- `contracts/`: `PRIVATE_KEY` (deployer), `API_FOOTBALL_KEY`, `RPC_URL` (defaults to spicy RPC), and for the oracle server `MONGODB_API_KEY` / `MONGODB_ENDPOINT` / `MONGODB_DATABASE_NAME` / `MONGODB_DATA_SOURCE`, `PORT`.
- `web/`: `NEXT_PUBLIC_PRIVY_APP_ID` (Privy wallet), `API_FOOTBALL_KEY` (server-side API routes), `PINATA_JWT` / `PINATA_GATEWAY_URL` (IPFS uploads).

## Architecture

### Player tokens (the core primitive)
`contracts/contracts/PlayerToken.sol` — one ERC20 contract **per player**, `decimals() == 0`. Key behaviors:
- Tokens are minted to the contract itself and sold via `purchaseTokens` against a **bonding curve** (`calculateTotalPrice`) that scales with the player's performance score and reserve/demand ratio.
- The payment token is the player's **team fan token**, not native OKB (set at construction).
- `calculatePerformance(position)` derives a 1–10 score on-chain from stats, weighted differently per position (attacker/defender/goalkeeper/midfielder). This score drives both price and game outcomes.
- Season lifecycle: `endSeason()` reserves 20% of the payment pool for the player; `claim()` lets holders burn their tokens for a pro-rata share of the remaining 80%; `playerClaim(...)` lets the player claim their reserved share.

### Stats oracle (off-chain → on-chain)
Player stats come from **API-Football** (`contracts/src/adapter/api-football-adapter.ts`). Current scope: **league 1 = World Cup, season 2022, team Argentina (id 26)**. Two parallel update paths exist:
1. `contracts/server.ts` — long-running Express server with `node-cron` (daily 02:00 UTC). Stores stats in **MongoDB Data API**, diffs against stored values, and only calls `updatePlayerStats` on-chain when stats changed. Exposes `/api/update-stats`, `/api/health`, `/api/status`, `/api/db-stats`, `/api/db-clear`. (Has no npm script — run with a TS runner directly.)
2. Hardhat scripts `update-player-stats-cron.ts` / `update-player-data-cron.ts` + `scripts/setup-cron.sh` for crontab.

`scripts/deploy-all.ts` is the heavy deploy: fetches every team/player from API-Football and deploys+initializes+mints a PlayerToken per player, paying in the mapped team fan token (`TEAM_TOKEN_MAPPING`), and writes a `player-registry-<league>-<season>.json`.

### Game (head-to-head)
`contracts/contracts/Game.sol` (`GameContractMultiToken`) — two players each commit 5 player-token contract addresses. `createGame` stakes 200 tokens per contract; `joinGame` triggers `_playGame`, which sums `calculatePerformance` across each side's tokens (creator's array is rotated by a pseudo-random shift) and sets the winner.

> ⚠️ The deployed `Game.sol` has staking, balance checks, and token distribution **commented out "for testing"**: `joinGame` does not stake or validate, and `_playGame` does not distribute the pot. `web/GAME_INTEGRATION.md` describes the *intended* full-stake flow, not current on-chain behavior. Also that doc's contract address is stale — the live address is in `contracts/game-deployment.json` and `web/lib/contract-config.ts` (`0x4A5f31B2...93be`).

### Other contracts
- `FanToken/FanToken.sol` — minimal open-mint ERC20; one per team, used as the payment currency for that team's player tokens. Addresses in `teamFanTokenAddress.json`.
- `Ticketing.sol` — list/buy match tickets priced in an ERC20.
- `Merch.sol`, `SimpleRandom.sol` (Pyth entropy via `@pythnetwork/entropy-sdk-solidity`, see `remappings.txt`), `Lock.sol` (Hardhat sample).

### Frontend
- `web/lib/chain.ts` — custom viem chain `xLayerTestnet` (id 1952). Imported by `client.ts` and `Provider.tsx`. (Don't use viem's built-in `xLayerTestnet`; that one is 195.)
- `web/lib/const.ts` is the integration hub: all contract **ABIs** (`PlayerTokenABI`, `GAME_CONTRACT_ABI`, `FANTOKEN_ABI`, `TicketingContractABI`, `MerchContractABI`), deployed addresses (`teamFanTokens` = `{ ARG }`, `TicketingContractAddress`, `MerchContractAddress`), and `teams` (the World Cup teams list the faucet renders — currently Argentina only). The legacy `players` array was emptied (live player tokens come from the deploy-all registry, served by `/api/tokens`).
- `web/lib/client.ts` — viem `publicClient` (server+client safe) + browser-only `walletClient`, both on `xLayerTestnet`.
- `web/app/components/Provider.tsx` wires **Privy** (`PrivyProvider`) + `@privy-io/wagmi` `WagmiProvider` + react-query, chain = `xLayerTestnet`. `ConnectButton.tsx` uses Privy's `usePrivy()` (login/logout) + wagmi `useAccount`. App id from `NEXT_PUBLIC_PRIVY_APP_ID`.
- `next.config.mjs` has a webpack `IgnorePlugin` for `@solana(-program)/*` — Privy pulls optional Solana modules the EVM-only app never uses; ignoring them keeps the build green.
- `web/lib/contract-config.ts` — game contract address + network constants (kept in sync with the contract's `TOKENS_PER_CONTRACT=200`, `CONTRACT_COUNT=5`).
- Pages under `web/app/` (App Router): `game`, `marketplace`, `team`, `player`, `leagues`, `tickets`, `claim`, `test`. Server-side API routes in `web/app/api/` proxy API-Football (`teams`, `team-players`, `tokens`) and Pinata IPFS (`upload-to-pinata`) to keep keys server-side.

## Deployed contracts (X Layer testnet, chainId 1952)
Deployer `0xA3327d90d087cdddfB99E598E50B5Bdee7fC55bD`.
- Game (`GameContractMultiToken`): `0x838859Db205e129B87d8a3795476A11af6BB7efA`
- Ticketing (`TicketContract`): `0x02a4AF3E8b6Cb63A661D46eBCcE5C03ec98c30C7`
- Merch (`MerchNFT`): `0x7EBe0903D6DdF8588DceB956F171F5869988a0D7`
- Argentina (`ARG`) FanToken: `0x45b2bAeD94107fBa50EE4832BC8820470D535E53` (`contracts/teamFanTokenAddress.json` + `web/lib/const.ts` `teamFanTokens`)
- Player tokens: 20 Argentina WC2022 squad PlayerTokens deployed by `deploy-all` (`TEAM_ID=26`); registry in `contracts/enhanced-registry-1-2022.json` / `player-registry-1-2022.json`, served to the frontend via `contracts/enhanced-player-data-1-2022.json`.

## Gotchas
- X Layer testnet live chainId is **1952**, not 195 (some lists are stale). Defined as a custom viem chain in `web/lib/chain.ts`.
- API-Football key is on the **Free plan (100 calls/day)**. Deploying one team (`TEAM_ID`) is ~28 calls. The `web/app/api/teams` / `team-players` / `player` routes (hardcoded `league=1&season=2022`) also consume this quota at runtime.
- `web/app/api/tokens/route.ts` reads balances **on-chain** via the viem client (the old Chiliz explorer tokenlist API has no keyless X Layer equivalent). It maps over `contracts/enhanced-player-data-1-2022.json` (the Argentina WC registry).
- Solidity config uses `viaIR: true` (slower compiles; needed for stack depth).
- PlayerToken has 0 decimals — token amounts are whole units, no `parseEther`.
- **Wallet write path:** all on-chain writes go through `web/lib/client.ts`'s `walletClient`, built from `window.ethereum`. This works with **injected wallets (MetaMask)** connected via Privy, but NOT with Privy **embedded** (email/social) wallets, which have no `window.ethereum`. For embedded-wallet support, switch those call sites to `@privy-io/wagmi`'s `useWalletClient()` / wagmi `useWriteContract`. Demo with MetaMask on X Layer testnet.

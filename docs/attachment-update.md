# Attached update specification — 2026-09-09

Source: the user's reattached `a4c33493003a0f61c92217e7bc537bd933337dd9(1).webarchive`.
This specification takes precedence over the earlier remaining-work list and earlier event reward policies. This document is development documentation; do not display its instructions in the game.

Later clarification: `0ffaf32d7ccb32f4b2fab5d20bc2a4cf8ad9e757.webarchive` supersedes the awakening timing and unknown attribute below. Awakening now unlocks only at yellow crown (12), and 認識負荷 replaces 確認不可 with no current characters assigned. See `prior-chat-followup.md` for current status, including the uncompleted random-skin request.

## Changes made after comparing the attachment with the deployed game

- All eligible event bosses, including the existing and two new 無 dungeons, use the same probability on first and repeat clears: 初級 0.5%, 中級 1%, 上級 3%, 白 55%, 黒 60%, 無 80%. The previous first-clear guarantee / repeat-token policy no longer governs these stages. Existing token balances and exchanges remain available.
- Existing evolution stone/book/copy costs are halved, rounding fractional items up. Appearance transformation consumes exactly five evolution material characters at evolution 12, for SSR and EX only.
- The attachment describes awakening at both dragon and crown evolution. Resolution: unlock at yellow dragon (6), strengthen at yellow crown (12). Combat stats and the growth detail panel use the same rule.
- Four growth families are explicitly labeled 強化素材・進化素材・進化キャラ・スキルキャラ. Their final stages display 実りの大地（強／進／変／技） individually.
- Evolution requirements and the stage guide use the actual evolution marks, including the current-to-next transition.
- SWAMP / Leopard / F0X activate 全ての始まり, granting party HP/ATK/DEF +50%, with normal and stronger 極 ultimates. Existing tags and discovery IDs are retained.
- Attack/heal skill effects begin when cast; only priority support skills contribute newly queued stat effects before normal actions.

## Existing implementation checked against the same attachment

- Five bottom navigation entries: 冒険・キャラ・ショップ・召喚・設定. Adventure exposes normal/event/abyss routes; character navigation exposes party/growth/evolution/character codex, plus equipment/tag codices.
- Header shows player name, level and EXP. Six attributes: 火・水・木・光・闇・確認不可; eight consolidated unit types.
- Enemy intent/performance is disclosed by long press. Party HP uses current/maximum numbers. Character names sit above attack/skill/guard controls; skill opens a skill selector.
- Skills upgrade at evolution 6 and 12 without changing the primary skill family; BEYOND yellow upgrades it again and unlocks a second skill. Cooldowns vary by skill. SLv 1–6 reduces cooldown one turn per level; costs are 1/2/4/8/16 skill material characters. Timed effects persist across turns.
- All 16 growth stages use defeat-only material drops. Ordinary enemy rates/amounts: 10%×1, 50%×1, 70%×1, 95%×2. Boss rates/amounts: 15%×1, 50%×1, 80%×2, 100%×4. Loot settlement prevents duplicate awards.
- Character selection opens a dedicated growth detail. Evolution and skill material characters have portraits and catalog entries.
- All 30 SSR/EX have transformed portraits and six distinct attack frames, selected at evolution 12. SWAMP/Leopard/F0X retain their supplied evolved visuals.
- Equipment accepts either matching unit type, is equipped through growth, affects only its wearer, and has images, a codex and an owned view. Drop rates remain within 1–2%. Permanent and daily rotating shops are present. Party-wide equipment is deferred as requested.
- The requested character expansion exists: 2 SSR, 2 EX, 5 R and 5 SR. The EX each has a new 無 dungeon with new preboss enemies; the two event dungeons have separate five-character R/SR pools.
- Tags require the related three-person party. Codex details stay hidden until entering a dungeon with that party. The ultimate gauge supports normal at 100 and 極 at 200.

## Verification

- 56 automated checks passed across attachment requirements, rewards, evolution, equipment, tags, new content, saved progress and existing gameplay.
- `tests/attachment-update.test.mjs` exercises every event difficulty and probability boundary, all evolution cost tiers, awakening combat stats, all growth families and one-time loot settlement, and the original EX trio's actual stat bonuses.
- All 30 evolution asset sets contain six different frame files. Representative portraits/motion were inspected with transparency composed against a background.
- No browser QA was requested or run. Build/deployment status is verified separately during publishing.

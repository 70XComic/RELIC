# Follow-up instructions from the preceding conversation

Source: `0ffaf32d7ccb32f4b2fab5d20bc2a4cf8ad9e757.webarchive`, supplied by the user after asking whether all earlier instructions had been implemented. The supplied document contains 13 lines of instructions, not a full chat export. Do not equate completing this document with auditing every prior conversation.

## Applied

- Dungeon selection now begins with genre cards (growth, limited events, special, strong), followed by the dungeon and its difficulty. Each level has back navigation.
- 確認不可 is renamed 認識負荷. It remains selectable as an empty filter, but no current playable character or resolved enemy has that attribute. Former machine/magic values map into ordinary attributes. Deep-abyss wording no longer accidentally matches water.
- Replaced accidental single-character regex matches in type inference with meaningful words. Added explicit assignments for the 21 core/featured characters listed below. Incompatible equipped items are unequipped on normalization; inventory and ownership are preserved.
- Removed separate names under party artwork and the duplicated floating enemy name. The character command bar includes level; enemy health bars contain name and level. Enemy level is the level used by the stage's existing stat calculation.
- Combat controls receive their content height within the current viewport rather than an insufficient fixed percentage. Very short viewports permit internal control-panel scrolling. Skill menus have bounded scrolling. Browser/physical iPhone QA has not been performed.
- Restored the artwork area previously consumed by labels. Measured transparent padding in standing frames supplies bounded scaling for 46 affected assets. No source artwork was altered.
- Unique awakening is inactive through red dragon (11), and unlocks at yellow crown (12). This explicitly supersedes the previous dragon-unlock/crown-upgrade interpretation. Skill upgrades at dragon and the five transformation material characters for SSR/EX at crown remain.

## Random appearance follow-up — implemented

The user subsequently identified ラッキーバーンズ and supplied `Ms.Muscle.png` plus `Ms.Muscle2(1).png` through `Ms.Muscle10(1).png` and `Ms.Muscle11(2).png`. All 11 originals are preserved as `public/assets/lucky-burns/skin-01.png` through `skin-11.png`, in numeric order. The public runtime uses lossless WebP copies with identical decoded RGBA pixels to reduce transfer size; the original PNGs remain in source control. They are alternative appearances of one character, not evolution artwork or separate characters.

- Each new dungeon run's existing random run ID selects one appearance. Turns, floors, navigation and reloads retain it; replay creates a new selection. Consecutive repeats are possible.
- Appearance changes both idle and attack artwork, without changing stats, skills, inventory or evolution. Random appearance also remains active after crown evolution.
- Formation and the owned codex portrait, including long-press image viewing, show the most recent run's appearance when that run includes Lucky Burns. Otherwise they show the first supplied image.
- User-confirmed rarity and acquisition: SSR, standard summon. Other current metadata: fire, human, bruiser. The existing rarity rates and previous summon series membership remain unchanged. There is one additional character (151 total), and duplicates use existing evolution/ownership rules. No free distribution or new dungeon was added.
- Supplied portraits are used intact. Every appearance has six dedicated transparent attack frames (66 total), following the same saved run selection as the portrait and remaining active after crown evolution. The user authorized Python background correction on 2026-09-09. Generated figures retain their native pixels, are aligned at the feet, and are encoded losslessly; see `lucky-burns-motion-status.md`. As there is no separate crown-only portrait transformation, Lucky Burns does not consume five transformation material characters at crown; ordinary SSR growth, awakening and skill rules still apply.

## Current type assignments for the core/featured characters

| Character | Types |
| --- | --- |
| S.W.A.M.P | 機械 |
| Leopard | 人間 |
| F0X | 人間 |
| デスアーク | 天使 |
| アンブレラ・フレア | 機械・龍 |
| 化かす者 | 獣・魔族 |
| 鈴の音 | 魔族 |
| キャプテン・ネモ | 人間 |
| 白龍の聖女 | 龍・天使 |
| 魔動騎士 | 機械 |
| インフェルノドラゴニア | 龍 |
| ヴォイド | 龍 |
| 赤ずきん | 人間 |
| O.R.C.A. | 機械・獣 |
| N.A.R.W.H.A.L. | 機械・獣 |
| G.R.E.A.T_W.H.I.T.E_S.H.A.R.K. | 機械・獣 |
| H.A.M.M.E.R.H.E.A.D_S.H.A.R.K. | 機械・獣 |
| W.H.A.L.E_S.H.A.R.K | 機械・獣 |
| フリッター | 魔族 |
| シャドウインプ | 魔族 |
| クラッカー | 魔族・獣 |

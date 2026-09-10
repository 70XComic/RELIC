# Lucky Burns — SSR and eleven motion appearances

The user's instruction makes Lucky Burns SSR, obtainable from standard gacha, with motion for all eleven supplied appearances. Python background correction was explicitly authorized on 2026-09-09, with a requirement to preserve quality.

## Implemented

- One stable character ID, SSR stats and growth, standard summon eligibility.
- Eleven appearance definitions, each with six dedicated transparent attack frames (66 distinct assets).
- The saved dungeon run ID selects portrait and motion together, retaining them through turns, floors, navigation and reloads.
- Random appearances remain active after crown evolution. No separate crown portrait or transformation-material charge is added for this character.
- Guard holds the ready pose instead of playing a punch.
- The original eleven supplied portraits remain unchanged, with pixel-identical lossless WebP copies used at runtime.

## Asset preparation and quality

The built-in image-generation tool created the six-pose sheets preserved in `art-source/lucky-burns`. Its baked checkerboards were removed with the user-authorized Python workflow in `scripts/prepare-lucky-motion.py`.

Background selection uses border connectivity and checkerboard repetition, with protections against flooding into white fabric and cups. Thin residual grid traces receive a separate exterior cleanup. All eleven sheets were visually inspected, including the white outfits and held drinks. Aligned frames were also inspected on dark and light backgrounds.

Each full connected figure is extracted independently, including fists and capes crossing uniform cell boundaries. Frames are padded to 640 × 640 and aligned using the feet. No figure is resized, blurred, recolored or quantized. Opaque RGB pixels are compared to the native source; every decoded lossless WebP is compared to its full RGBA input. `art-source/lucky-burns/motion-export.json` records the source hashes, frame bounds and output hashes.

Reproduction (requires Pillow, NumPy and SciPy):

```sh
python scripts/prepare-lucky-motion.py --export --review-dir /absolute/temporary/review-directory
```

## Verification and publication

- Nineteen targeted catalog, acquisition, evolution, phase-4 and random-appearance tests passed.
- All 66 frames have distinct artwork and their expected runtime paths.
- Browser/physical phone QA was not requested or performed.
- Publication must be confirmed by the Sites deployment result. Before this update's deployment, the last confirmed public version was v83; earlier upload attempts timed out.

This change completes the Lucky Burns SSR/motion request. It does not assert that every unseen instruction from earlier conversations has been audited.

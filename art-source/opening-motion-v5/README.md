# Opening motion v5: canonical pixel-animation master

This opening is composed from the six-frame pixel animations already attached to
the game's canonical characters. Character identities are never regenerated.

- Delivery: 1080x1920 portrait Full HD
- Playback: 48 fps for exactly 12.000 seconds
- Total video frames: 576 unique frames
- Encoding: H.264 High Profile Level 4.2, CRF 14, animation tuning
- Scaling: nearest-neighbour for character and pixel-art layers

## Character invariants

The face, weapon, costume pattern, silhouette, proportions, and colors in every
cut come directly from `public/assets/motion-frames/<character>/frame-1..6.webp`:

- `ex-fox`
- `ex-swamp`
- `ex-leopard`
- `captain-nemo`
- `void`
- `white-dragon-saint`
- `deatharc`
- `inferno-dragonia`

The build does not ask a generative model to redraw those frames. The six canonical
poses are timed into OP-specific entrances, attacks, confrontation, and the final
party formation. Camera movement and environmental effects are rendered around
them. This prevents extra faces, changing weapon sizes, missing markings, identity
drift, and soft morphing. Void uses the black smoke-bodied, orange-marked design
from the game's `void` motion sequence—not the unrelated purple upright dragon.

Backgrounds are also loaded as complete individual in-game map assets. No frame
is cropped from a multi-map sheet, so another map cannot leak into a scene.

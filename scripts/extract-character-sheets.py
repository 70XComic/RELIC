from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path("/workspace/sites/relic-rush")
UPLOAD = Path("/workspace/scratch/e5129d9ea880/upload")
ASSETS = ROOT / "public" / "assets"

SHEETS = [
    ("BB7B45F1-6C37-425F-8F8A-F9229B31C822(1).jpeg", "gacha-b3", 1),
    ("C2B12EB2-0E87-477A-BFA1-642DC4CFCEAD(1).jpeg", "dungeon", 26),
    ("1EC086FD-FF5A-4E23-BFED-A9D538BA1980(1).jpeg", "gacha-b2", 1),
    ("EF9387E6-6D12-476C-8026-7A36F4B297FB(1).jpeg", "dungeon", 51),
    ("7B190AED-8B46-491A-85DE-9048A567A777(1).jpeg", "dungeon", 76),
    ("0B231385-FA9D-4553-81A2-70FE99F1C4A6(1).jpeg", "gacha-b4", 1),
]


def transparent_sprite(cell: Image.Image) -> Image.Image:
    rgb = np.asarray(cell.convert("RGB"), dtype=np.int16)
    distance_from_white = np.max(255 - rgb, axis=2)
    alpha = np.clip((distance_from_white - 3) * 17, 0, 255).astype(np.uint8)
    # A few effects cross the source sheet's cell boundary. Remove only small
    # disconnected fragments that touch the outer edge, while preserving the
    # main sprite and its intentional floating particles.
    solid = alpha > 20
    visited = np.zeros_like(solid, dtype=bool)
    height, width = solid.shape
    for start_y in range(height):
        for start_x in range(width):
            if not solid[start_y, start_x] or visited[start_y, start_x]:
                continue
            stack = [(start_x, start_y)]
            visited[start_y, start_x] = True
            component = []
            touches_edge = False
            while stack:
                x, y = stack.pop()
                component.append((x, y))
                touches_edge |= x <= 6 or y <= 6 or x >= width - 7 or y >= height - 7
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < width and 0 <= ny < height and solid[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        stack.append((nx, ny))
            if touches_edge and len(component) < 1000:
                for x, y in component:
                    alpha[y, x] = 0
    rgba = np.dstack((rgb.astype(np.uint8), alpha))
    sprite = Image.fromarray(rgba, "RGBA")
    bbox = sprite.getbbox()
    if bbox is None:
        return Image.new("RGBA", (256, 256))
    sprite = sprite.crop(bbox)
    max_side = 232
    if sprite.width > max_side or sprite.height > max_side:
        scale = min(max_side / sprite.width, max_side / sprite.height)
        sprite = sprite.resize(
            (max(1, round(sprite.width * scale)), max(1, round(sprite.height * scale))),
            Image.Resampling.NEAREST,
        )
    canvas = Image.new("RGBA", (256, 256))
    canvas.alpha_composite(sprite, ((256 - sprite.width) // 2, (256 - sprite.height) // 2))
    return canvas


def output_name(prefix: str, number: int) -> str:
    if prefix == "dungeon":
        return f"dungeon-{number:03d}.png"
    return f"{prefix}-{number:02d}.png"


def main() -> None:
    count = 0
    for filename, prefix, first_number in SHEETS:
        sheet = Image.open(UPLOAD / filename).convert("RGB")
        x_edges = [round(sheet.width * i / 5) for i in range(6)]
        y_edges = [round(sheet.height * i / 5) for i in range(6)]
        for row in range(5):
            for column in range(5):
                index = row * 5 + column
                cell = sheet.crop(
                    (
                        x_edges[column],
                        y_edges[row],
                        x_edges[column + 1],
                        y_edges[row + 1],
                    )
                )
                target = ASSETS / output_name(prefix, first_number + index)
                transparent_sprite(cell).save(target, optimize=True)
                count += 1
    print(f"updated {count} transparent character assets")


if __name__ == "__main__":
    main()

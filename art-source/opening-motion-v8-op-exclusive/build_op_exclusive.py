#!/usr/bin/env python3
"""Build the 12-second Relic Rush OP from OP-exclusive character key poses."""

from __future__ import annotations

import argparse
import hashlib
import math
import random
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps


FPS = 48
DURATION = 12
TOTAL_FRAMES = FPS * DURATION
OUTPUT_SIZE = (1080, 1920)
SHEET_GRID = (3, 2)

SHOTS = (
    # start, end, model sheet, map, grade, vertical placement
    (48, 144, "ex-fox", "event-bg-02.webp", (92, 25, 14), 410),
    (144, 240, "white-dragon-saint", "event-bg-45.webp", (102, 78, 22), 370),
    (240, 336, "deatharc", "event-bg-50.webp", (34, 24, 104), 390),
    (336, 456, "void", "inner-earth.png", (68, 20, 8), 430),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets", required=True, type=Path)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--work", required=True, type=Path)
    parser.add_argument("--video", required=True, type=Path)
    parser.add_argument("--poster", required=True, type=Path)
    parser.add_argument("--title", required=True, type=Path)
    parser.add_argument("--contact", required=True, type=Path)
    return parser.parse_args()


def ease(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def load_map(path: Path) -> Image.Image:
    with Image.open(path) as source:
        image = source.convert("RGB")
    return ImageOps.fit(image, (1240, 2100), method=Image.Resampling.NEAREST)


def map_frame(source: Image.Image, frame_index: int, direction: int = 1) -> Image.Image:
    p = frame_index / max(1, TOTAL_FRAMES - 1)
    max_x = source.width - OUTPUT_SIZE[0]
    max_y = source.height - OUTPUT_SIZE[1]
    x = round(max_x / 2 + direction * math.sin(p * math.pi * 1.4) * 55)
    y = round(max_y / 2 + math.cos(p * math.pi * 1.1) * 38)
    x = max(0, min(max_x, x))
    y = max(0, min(max_y, y))
    return source.crop((x, y, x + OUTPUT_SIZE[0], y + OUTPUT_SIZE[1])).convert("RGBA")


def load_sheet(path: Path) -> list[Image.Image]:
    with Image.open(path) as source:
        sheet = source.convert("RGB")
    cell_w = sheet.width // SHEET_GRID[0]
    cell_h = sheet.height // SHEET_GRID[1]
    cells: list[Image.Image] = []
    for row in range(SHEET_GRID[1]):
        for column in range(SHEET_GRID[0]):
            left = column * cell_w
            top = row * cell_h
            cells.append(sheet.crop((left, top, left + cell_w, top + cell_h)))
    return cells


def grade(frame: Image.Image, color: tuple[int, int, int], strength: int) -> None:
    wash = Image.new("RGBA", frame.size, (*color, strength))
    frame.alpha_composite(wash)
    vignette = Image.new("L", frame.size, 0)
    draw = ImageDraw.Draw(vignette)
    draw.ellipse((-240, 50, 1320, 1900), fill=210)
    vignette = ImageOps.invert(vignette.filter(ImageFilter.GaussianBlur(160)))
    shade = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    shade.putalpha(vignette.point(lambda value: round(value * 0.58)))
    frame.alpha_composite(shade)


def scene_panel(cell: Image.Image, scale: float) -> Image.Image:
    size = max(720, round(1130 * scale))
    panel = cell.resize((size, size), Image.Resampling.NEAREST).convert("RGBA")
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    edge = round(size * 0.075)
    draw.rounded_rectangle((edge, edge, size - edge, size - edge), radius=round(size * 0.16), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(round(size * 0.065)))
    panel.putalpha(mask)
    return panel


def add_particles(frame: Image.Image, seed: int, index: int, color: tuple[int, int, int]) -> None:
    draw = ImageDraw.Draw(frame, "RGBA")
    rng = random.Random(seed)
    for particle in range(26):
        base_x = rng.randrange(-80, OUTPUT_SIZE[0] + 80)
        base_y = rng.randrange(-120, OUTPUT_SIZE[1] + 120)
        speed = rng.randrange(70, 310)
        x = round((base_x + index * (2 + particle % 4)) % (OUTPUT_SIZE[0] + 160) - 80)
        y = round((base_y - index * speed / FPS) % (OUTPUT_SIZE[1] + 240) - 120)
        size = 2 + particle % 4
        alpha = 85 + (particle * 19) % 125
        draw.rectangle((x, y, x + size, y + size), fill=(*color, alpha))


def add_speed_lines(frame: Image.Image, progress: float, color: tuple[int, int, int]) -> None:
    if progress < 0.52:
        return
    draw = ImageDraw.Draw(frame, "RGBA")
    strength = ease((progress - 0.52) / 0.48)
    for line in range(11):
        y = 190 + line * 133 + (line % 3) * 24
        length = round((140 + line * 17) * strength)
        x = (line * 149 + round(progress * 510)) % 1120 - 80
        draw.line((x, y, x + length, y - 38), fill=(*color, round(150 * strength)), width=4 + line % 3)


def opening_frame(maps: dict[str, Image.Image], index: int) -> Image.Image:
    frame = map_frame(maps["event-bg-02.webp"], index)
    grade(frame, (12, 31, 52), 92)
    draw = ImageDraw.Draw(frame, "RGBA")
    p = index / 47
    radius = round(55 + ease(p) * 360)
    center = (540, 910)
    for ring in range(4):
        r = radius + ring * 22
        alpha = max(0, round((1 - p) * 160) - ring * 18)
        draw.ellipse((center[0] - r, center[1] - r, center[0] + r, center[1] + r), outline=(255, 196, 72, alpha), width=3)
    add_particles(frame, 710, index, (255, 183, 69))
    return frame


def character_frame(
    maps: dict[str, Image.Image], sheets: dict[str, list[Image.Image]],
    index: int, start: int, end: int, character: str, map_name: str,
    tint: tuple[int, int, int], top: int,
) -> Image.Image:
    local = index - start
    length = end - start
    progress = local / max(1, length - 1)
    frame = map_frame(maps[map_name], index, -1 if start // 96 % 2 else 1)
    grade(frame, tint, 74)
    pose = min(5, local * 6 // length)
    pulse = math.sin(progress * math.pi)
    panel = scene_panel(sheets[character][pose], 1.0 + 0.075 * progress + 0.018 * pulse)
    travel = -34 if character in {"deatharc", "white-dragon-saint"} else 36
    x = (OUTPUT_SIZE[0] - panel.width) // 2 + round((progress - 0.5) * travel)
    y = top + round(math.sin(progress * math.pi * 1.15) * (-18 if character != "void" else 12))
    frame.alpha_composite(panel, (x, y))
    particle_color = {
        "ex-fox": (255, 108, 48),
        "white-dragon-saint": (255, 227, 125),
        "deatharc": (151, 102, 255),
        "void": (255, 112, 27),
    }[character]
    add_particles(frame, start * 13, local, particle_color)
    add_speed_lines(frame, progress, particle_color)
    if pose >= 4:
        flash = round(55 * math.sin(min(1.0, (progress - 0.66) / 0.34) * math.pi))
        frame.alpha_composite(Image.new("RGBA", OUTPUT_SIZE, (*particle_color, max(0, flash))))
    return frame


def clash_frame(maps: dict[str, Image.Image], sheets: dict[str, list[Image.Image]], index: int) -> Image.Image:
    local = index - 456
    progress = local / 71
    frame = map_frame(maps["event-bg-50.webp"], index)
    grade(frame, (40, 16, 16), 115)
    left_character = "ex-fox" if local < 36 else "white-dragon-saint"
    right_character = "deatharc" if local < 36 else "void"
    left_pose = 4 if local % 18 < 10 else 5
    right_pose = 4 if local % 18 < 10 else 5
    left = sheets[left_character][left_pose].resize((900, 900), Image.Resampling.NEAREST).convert("RGBA")
    right = ImageOps.mirror(sheets[right_character][right_pose].resize((900, 900), Image.Resampling.NEAREST)).convert("RGBA")
    for panel in (left, right):
        mask = Image.new("L", panel.size, 0)
        ImageDraw.Draw(mask).ellipse((34, 6, 866, 894), fill=255)
        panel.putalpha(mask.filter(ImageFilter.GaussianBlur(118)))
    frame.alpha_composite(left, (-180 - round(progress * 42), 505))
    frame.alpha_composite(right, (380 + round(progress * 42), 535))
    draw = ImageDraw.Draw(frame, "RGBA")
    impact = abs(math.sin(progress * math.pi * 6))
    center = (540, 940)
    radius = round(18 + impact * 42)
    draw.ellipse(
        (center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius),
        outline=(255, 218, 132, round(95 + 145 * impact)),
        width=4,
    )
    outer_radius = radius + round(9 + 12 * impact)
    draw.ellipse(
        (
            center[0] - outer_radius,
            center[1] - outer_radius,
            center[0] + outer_radius,
            center[1] + outer_radius,
        ),
        outline=(255, 241, 205, round(35 + 75 * impact)),
        width=2,
    )
    core = round(6 + impact * 10)
    draw.polygon(
        (
            (center[0], center[1] - core * 2),
            (center[0] + core, center[1]),
            (center[0], center[1] + core * 2),
            (center[0] - core, center[1]),
        ),
        fill=(255, 255, 238, round(170 + 85 * impact)),
    )
    for ray in range(12):
        angle = ray * math.tau / 12 + progress * 0.18
        inner = outer_radius + 7
        outer = inner + 12 + (ray % 3) * 9
        draw.line(
            (
                center[0] + math.cos(angle) * inner,
                center[1] + math.sin(angle) * inner,
                center[0] + math.cos(angle) * outer,
                center[1] + math.sin(angle) * outer,
            ),
            fill=(255, 205, 105, round(55 + 130 * impact)),
            width=2 + ray % 2,
        )
    add_particles(frame, 9917, local * 2, (255, 194, 85))
    return frame


def title_frame(title_source: Image.Image, index: int) -> Image.Image:
    local = index - 528
    progress = local / 47
    scale = 1.09 - 0.09 * ease(progress)
    size = (round(OUTPUT_SIZE[0] * scale), round(OUTPUT_SIZE[1] * scale))
    image = title_source.resize(size, Image.Resampling.NEAREST)
    left = (image.width - OUTPUT_SIZE[0]) // 2
    top = (image.height - OUTPUT_SIZE[1]) // 2
    frame = image.crop((left, top, left + OUTPUT_SIZE[0], top + OUTPUT_SIZE[1])).convert("RGBA")
    shade = Image.new("RGBA", OUTPUT_SIZE, (8, 4, 18, round(150 * (1 - progress))))
    frame.alpha_composite(shade)
    if local < 8:
        frame.alpha_composite(Image.new("RGBA", OUTPUT_SIZE, (255, 244, 220, round(225 * (1 - local / 8)))))
    add_particles(frame, 12001, local, (255, 206, 100))
    return frame


def render(args: argparse.Namespace) -> list[Path]:
    frames_dir = args.work / "frames"
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True)
    maps = {name: load_map(args.assets / name) for name in {shot[3] for shot in SHOTS} | {"event-bg-50.webp"}}
    sheets = {name: load_sheet(args.source / f"{name}-op-sheet.png") for name in {shot[2] for shot in SHOTS}}
    with Image.open(args.assets / "opening" / "opening-motion-title-v7-pixel.webp") as source:
        title_source = source.convert("RGB")
    paths: list[Path] = []
    for index in range(TOTAL_FRAMES):
        if index < 48:
            frame = opening_frame(maps, index)
        elif index < 456:
            shot = next(item for item in SHOTS if item[0] <= index < item[1])
            frame = character_frame(maps, sheets, index, *shot)
        elif index < 528:
            frame = clash_frame(maps, sheets, index)
        else:
            frame = title_frame(title_source, index)
        output = frames_dir / f"frame-{index + 1:04d}.png"
        frame.convert("RGB").save(output, format="PNG", compress_level=3)
        paths.append(output)
    hashes = [hashlib.sha256(path.read_bytes()).hexdigest() for path in paths]
    if len(paths) != TOTAL_FRAMES or len(set(hashes)) != TOTAL_FRAMES:
        raise RuntimeError("Expected exactly 576 unique OP frames")
    return paths


def create_contact_sheet(paths: list[Path], output: Path) -> None:
    columns = 24
    thumb = (54, 96)
    sheet = Image.new("RGB", (columns * thumb[0], (len(paths) // columns) * thumb[1]), "black")
    for index, path in enumerate(paths):
        with Image.open(path) as frame:
            image = frame.resize(thumb, Image.Resampling.NEAREST)
        sheet.paste(image, ((index % columns) * thumb[0], (index // columns) * thumb[1]))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, format="JPEG", quality=92, optimize=True)


def encode(frames_dir: Path, video: Path) -> None:
    video.parent.mkdir(parents=True, exist_ok=True)
    temporary = video.with_suffix(".tmp.mp4")
    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-framerate", str(FPS), "-start_number", "1",
        "-i", str(frames_dir / "frame-%04d.png"),
        "-frames:v", str(TOTAL_FRAMES), "-an", "-c:v", "libx264",
        "-preset", "slow", "-tune", "animation", "-crf", "17",
        "-profile:v", "high", "-level:v", "4.2", "-pix_fmt", "yuv420p",
        "-fps_mode", "passthrough", "-video_track_timescale", "12288",
        "-movflags", "+faststart", str(temporary),
    ], check=True)
    temporary.replace(video)


def main() -> None:
    args = parse_args()
    paths = render(args)
    args.poster.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(paths[0]) as frame:
        frame.save(args.poster, format="WEBP", quality=96, method=6)
    with Image.open(paths[-1]) as frame:
        frame.save(args.title, format="WEBP", quality=96, method=6)
    create_contact_sheet(paths, args.contact)
    encode(args.work / "frames", args.video)
    print("Built OP-exclusive short animation: 1080x1920, 48 fps, 12.000 s, 576 unique frames")


if __name__ == "__main__":
    main()

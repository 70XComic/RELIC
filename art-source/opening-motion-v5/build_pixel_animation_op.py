#!/usr/bin/env python3
"""Build the Relic Rush OP from the canonical in-game pixel animations."""

from __future__ import annotations

import argparse
import hashlib
import math
import random
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


FPS = 48
DURATION = 12
CUT_FRAMES = FPS * 2
TOTAL_FRAMES = FPS * DURATION
OUTPUT_SIZE = (1080, 1920)
BACKGROUND_SIZE = (1240, 2080)

CUTS = (
    ("event-bg-02.webp", (("ex-fox", 1150),)),
    ("undersea-city.png", (("captain-nemo", 1250),)),
    ("inner-earth.png", (("void", 1250),)),
    ("event-bg-45.webp", (("white-dragon-saint", 1250),)),
    ("event-bg-50.webp", (("deatharc", 1050), ("inferno-dragonia", 1050))),
    ("event-bg-41.webp", (("ex-fox", 850), ("ex-swamp", 900), ("ex-leopard", 850))),
)

PARTICLE_COLORS = (
    (174, 225, 147, 165),
    (98, 218, 255, 185),
    (240, 91, 43, 190),
    (255, 225, 136, 205),
    (196, 91, 255, 190),
    (255, 176, 83, 180),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--assets", required=True, type=Path)
    parser.add_argument("--work", required=True, type=Path)
    parser.add_argument("--video", required=True, type=Path)
    parser.add_argument("--contact", required=True, type=Path)
    return parser.parse_args()


def ease(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def lerp(start: float, end: float, value: float) -> int:
    return round(start + (end - start) * ease(value))


def load_background(path: Path) -> Image.Image:
    with Image.open(path) as source:
        return ImageOps.fit(
            source.convert("RGB"),
            BACKGROUND_SIZE,
            method=Image.Resampling.NEAREST,
            centering=(0.5, 0.5),
        )


def load_pixel_sequence(assets: Path, sequence_id: str, size: int) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for frame_number in range(1, 7):
        path = assets / "motion-frames" / sequence_id / f"frame-{frame_number}.webp"
        with Image.open(path) as source:
            sprite = source.convert("RGBA")
        # Keep the canonical 512x512 frame registration. Nearest-neighbour
        # enlargement preserves the authored pixel edges and every marking.
        frames.append(sprite.resize((size, size), Image.Resampling.NEAREST))
    return frames


def background_frame(background: Image.Image, cut: int, progress: float) -> Image.Image:
    travel_x = (background.width - OUTPUT_SIZE[0])
    travel_y = (background.height - OUTPUT_SIZE[1])
    direction = -1 if cut % 2 else 1
    left = round(travel_x / 2 + direction * (progress - 0.5) * 72)
    top = round(travel_y / 2 + math.sin(progress * math.pi) * 30 - 15)
    left = max(0, min(left, travel_x))
    top = max(0, min(top, travel_y))
    return background.crop((left, top, left + OUTPUT_SIZE[0], top + OUTPUT_SIZE[1])).convert("RGBA")


def add_scene_particles(frame: Image.Image, cut: int, local_frame: int) -> None:
    draw = ImageDraw.Draw(frame, "RGBA")
    rng = random.Random(4501 + cut * 977)
    color = PARTICLE_COLORS[cut]
    progress = local_frame / (CUT_FRAMES - 1)
    count = (9, 13, 12, 14, 11, 10)[cut]
    for index in range(count):
        seed_x = rng.randrange(35, OUTPUT_SIZE[0] - 35)
        seed_y = rng.randrange(0, OUTPUT_SIZE[1] + 240)
        speed = rng.randrange(120, 390)
        drift = round(math.sin(progress * math.tau + index) * (4 + index % 7))
        x = seed_x + drift
        if cut == 1:
            y = round((seed_y - progress * speed) % (OUTPUT_SIZE[1] + 160) - 80)
            radius = 2 + index % 4
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=color, width=2)
        else:
            y = round((seed_y - progress * speed) % (OUTPUT_SIZE[1] + 160) - 80)
            size = 2 + index % 3
            draw.rectangle((x, y, x + size, y + size), fill=color)


def paste_center(frame: Image.Image, sprite: Image.Image, x: int, y: int) -> None:
    frame.alpha_composite(sprite, (x, y))


def character_positions(cut: int, progress: float, sprites: list[Image.Image]) -> list[tuple[int, int]]:
    if cut == 0:
        entry = ease(progress / 0.42)
        follow = ease((progress - 0.42) / 0.58)
        x = lerp(-sprites[0].width, 65, entry) + round(145 * follow)
        return [(x, 610)]
    if cut == 1:
        x = lerp(-sprites[0].width, 125, progress / 0.48)
        return [(x, 470 + round(math.sin(progress * math.pi) * -24))]
    if cut == 2:
        x = (OUTPUT_SIZE[0] - sprites[0].width) // 2
        y = lerp(670, 500, progress / 0.72)
        if progress > 0.78:
            x += (-1 if local_impact(progress) % 2 else 1) * 6
        return [(x, y)]
    if cut == 3:
        x = (OUTPUT_SIZE[0] - sprites[0].width) // 2
        return [(x, lerp(580, 390, progress))]
    if cut == 4:
        left, right = sprites
        approach = ease(progress / 0.68)
        recoil = ease((progress - 0.68) / 0.32)
        left_x = lerp(-left.width + 110, -55, approach) - round(95 * recoil)
        right_x = lerp(OUTPUT_SIZE[0] - 80, 410, approach) + round(85 * recoil)
        return [(left_x, 470), (right_x, 570)]
    left, center, right = sprites
    settle = ease(progress / 0.7)
    return [
        (lerp(-left.width, -235, settle), 760),
        ((OUTPUT_SIZE[0] - center.width) // 2, lerp(OUTPUT_SIZE[1], 715, settle)),
        (lerp(OUTPUT_SIZE[0], 520, settle), 755),
    ]


def local_impact(progress: float) -> int:
    return round((progress - 0.78) * 96)


def motion_frame_index(local_frame: int, final_group: bool = False) -> int:
    if final_group:
        return min(5, max(0, (local_frame - 12) // 12))
    if local_frame < 12:
        return 0
    if local_frame < 60:
        return min(5, (local_frame - 12) // 8)
    if local_frame < 82:
        return 5
    return max(0, 5 - (local_frame - 82) // 3)


def render_frames(assets: Path, frames_dir: Path) -> list[Path]:
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    frames_dir.mkdir(parents=True)
    paths: list[Path] = []
    for cut, (background_name, sprite_specs) in enumerate(CUTS):
        background = load_background(assets / background_name)
        sequences = [
            load_pixel_sequence(assets, sequence_id, size)
            for sequence_id, size in sprite_specs
        ]
        for local_frame in range(CUT_FRAMES):
            progress = local_frame / (CUT_FRAMES - 1)
            frame = background_frame(background, cut, progress)
            add_scene_particles(frame, cut, local_frame)
            source_frame = motion_frame_index(local_frame, final_group=cut == 5)
            sprites = [sequence[source_frame] for sequence in sequences]
            for sprite, position in zip(sprites, character_positions(cut, progress, sprites)):
                paste_center(frame, sprite, *position)
            frame_index = cut * CUT_FRAMES + local_frame + 1
            output = frames_dir / f"frame-{frame_index:04d}.png"
            temporary = output.with_suffix(".tmp.png")
            frame.convert("RGB").save(temporary, format="PNG", compress_level=3)
            temporary.replace(output)
            paths.append(output)
    hashes = [hashlib.sha256(path.read_bytes()).hexdigest() for path in paths]
    if len(paths) != TOTAL_FRAMES or len(set(hashes)) != TOTAL_FRAMES:
        raise RuntimeError("Expected 576 unique canonical pixel-animation frames")
    return paths


def create_contact_sheet(paths: list[Path], output: Path) -> None:
    columns = 24
    thumb = (54, 96)
    rows = TOTAL_FRAMES // columns
    sheet = Image.new("RGB", (columns * thumb[0], rows * thumb[1]), "black")
    for index, path in enumerate(paths):
        with Image.open(path) as frame:
            image = frame.resize(thumb, Image.Resampling.NEAREST)
        sheet.paste(image, ((index % columns) * thumb[0], (index // columns) * thumb[1]))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, format="JPEG", quality=90, optimize=True)


def encode(frames_dir: Path, video: Path) -> None:
    video.parent.mkdir(parents=True, exist_ok=True)
    temporary = video.with_suffix(".tmp.mp4")
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-framerate", str(FPS), "-start_number", "1",
            "-i", str(frames_dir / "frame-%04d.png"),
            "-frames:v", str(TOTAL_FRAMES), "-an",
            "-c:v", "libx264", "-preset", "slow", "-tune", "animation",
            "-crf", "14", "-profile:v", "high", "-level:v", "4.2",
            "-pix_fmt", "yuv420p", "-fps_mode", "passthrough",
            "-video_track_timescale", "12288", "-movflags", "+faststart",
            str(temporary),
        ],
        check=True,
    )
    temporary.replace(video)


def main() -> None:
    args = parse_args()
    paths = render_frames(args.assets, args.work / "frames")
    create_contact_sheet(paths, args.contact)
    encode(args.work / "frames", args.video)
    print("Built canonical pixel-animation OP: 1080x1920, 48 fps, 12.000 s, 576 frames")


if __name__ == "__main__":
    main()

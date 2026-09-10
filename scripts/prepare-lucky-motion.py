"""Remove generated checkerboards without resizing or recoloring sprite interiors.

User authorized Python image processing on 2026-09-09. Generated source sheets
stay intact; all exported motion frames use their native pixels and lossless WebP.
"""
from io import BytesIO
from pathlib import Path
import argparse
import hashlib
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "art-source/lucky-burns"
OUTPUT = ROOT / "public/assets/lucky-burns/motion"


def save_image(image, path, format="PNG", **options):
    """Encode first, then atomically publish a complete, verified file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    stream = BytesIO()
    image.save(stream, format=format, **options)
    data = stream.getvalue()
    temporary = path.with_name(path.name + ".writing")
    with temporary.open("wb") as handle:
        handle.write(data)
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)
    assert path.read_bytes() == data
    Image.open(path).verify()


def extract_foreground(rgb, chroma_limit=10):
    values = rgb.astype(float)
    gray = values.mean(2)
    border = np.concatenate([values[:3].reshape(-1, 3), values[-3:].reshape(-1, 3),
                             values[:, :3].reshape(-1, 3), values[:, -3:].reshape(-1, 3)])
    neutral = border[np.ptp(border, axis=1) <= 16]
    dark, light = np.percentile(neutral.mean(1), [10, 90])
    minimum_gray = dark - 30 if dark < 160 or chroma_limit > 10 else max(180, dark - 30)
    candidate = ((np.ptp(values, axis=2) <= chroma_limit)
                 & (gray >= minimum_gray) & (gray <= min(255, light + 20)))
    labels, count = ndi.label(candidate, np.ones((3, 3)))
    edge_ids = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, edge_ids[edge_ids > 0])

    # Enclosed gaps between hair, arms and clothing contain the same checkerboard.
    # Require two alternating grid steps within one neutral region; uniform white
    # fabric, mug surfaces and highlights do not satisfy this pattern test.
    seed = np.zeros(gray.shape, bool)
    for step in (7, 8, 9, 10, 11):
        for axis in (0, 1):
            previous = np.roll(gray, step, axis)
            same = np.roll(gray, 2 * step, axis)
            previous_ids = np.roll(labels, step, axis)
            same_ids = np.roll(labels, 2 * step, axis)
            alternating = ((labels > 0) & (labels == previous_ids) & (labels == same_ids)
                           & (np.abs(gray - previous) > max(23, (light - dark) * .55))
                           & (np.abs(gray - same) < 8))
            if axis == 0:
                alternating[:2 * step] = False
            else:
                alternating[:, :2 * step] = False
            seed |= alternating
    hits = np.bincount(labels[seed].ravel(), minlength=count + 1)
    region_areas = np.bincount(labels.ravel(), minlength=count + 1)
    # A few alternating highlights in a large white sleeve are not a checkerboard.
    background |= np.isin(labels, np.flatnonzero((hits >= 4) & (hits >= region_areas * .035)))
    background[labels == 0] = False

    foreground_labels, _ = ndi.label(~background, np.ones((3, 3)))
    areas = np.bincount(foreground_labels.ravel())
    body_ids = np.flatnonzero(areas >= 1000)
    body_ids = body_ids[body_ids != 0]
    assert len(body_ids) == 6, f"Expected six separate characters, got {len(body_ids)}"
    bodies = np.isin(foreground_labels, body_ids)
    close = ndi.distance_transform_edt(~bodies) <= 3
    detail_ids = np.unique(foreground_labels[close & ~background])
    detail_ids = detail_ids[detail_ids > 0]
    foreground = np.isin(foreground_labels, detail_ids)
    # A few antialiased grid edges are darker than the flood threshold. Remove
    # only their thin exterior traces; do not flood into connected white fabric.
    if minimum_gray > dark - 30:
        grid_trace = ((np.ptp(values, axis=2) <= chroma_limit)
                      & (gray >= dark - 30) & (gray < minimum_gray)
                      & (ndi.distance_transform_edt(foreground) <= 2))
        foreground &= ~grid_trace
    return foreground, foreground_labels, body_ids


def export_frames(number, rgb, foreground, labels, bodies):
    body_mask = np.isin(labels, bodies)
    nearest = ndi.distance_transform_edt(~body_mask, return_distances=False, return_indices=True)
    owners = labels[tuple(nearest)]
    centers = {int(body): ndi.center_of_mass(labels == body) for body in bodies}
    ordered = sorted(bodies, key=lambda body: (centers[int(body)][0] >= rgb.shape[0] / 2,
                                              centers[int(body)][1]))
    records, frames = [], []
    for index, body in enumerate(ordered, 1):
        mask = foreground & (owners == body)
        ys, xs = np.where(mask)
        left, top, right, bottom = int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)
        # Feet determine the horizontal anchor, so an extended fist does not
        # shift the entire character. Native height and all pose pixels remain.
        foot_x = xs[ys >= bottom - max(40, round((bottom - top) * .12))]
        anchor_x = round((int(foot_x.min()) + int(foot_x.max())) / 2)
        x, y = 320 + left - anchor_x, 632 - (bottom - top)
        assert x >= 4 and y >= 4 and x + right - left <= 636
        crop_rgb = rgb[top:bottom, left:right]
        crop_mask = mask[top:bottom, left:right]
        crop = np.dstack([crop_rgb, (crop_mask * 255).astype(np.uint8)])
        crop[~crop_mask] = 0
        canvas = Image.new("RGBA", (640, 640))
        canvas.paste(Image.fromarray(crop), (x, y))
        path = OUTPUT / f"skin-{number:02}" / f"frame-{index}.webp"
        save_image(canvas, path, "WEBP", lossless=True, exact=True, method=6)
        assert np.array_equal(np.array(Image.open(path).convert("RGBA")), np.array(canvas))
        assert np.array_equal(crop[crop_mask, :3], crop_rgb[crop_mask])
        records.append({"frame": index, "source_bounds": [left, top, right, bottom],
                        "canvas_position": [x, y], "opaque_pixels": int(mask.sum()),
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
        frames.append(canvas)
    return records, frames


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--skins", nargs="*", type=int, default=list(range(1, 12)))
    parser.add_argument("--review-dir", type=Path)
    parser.add_argument("--export", action="store_true")
    args = parser.parse_args()
    manifest = {"canvas": [640, 640], "encoding": "lossless WebP", "resized": False,
                "character_rgb_preserved": True, "skins": []}
    for number in args.skins:
        source = SOURCE / f"skin-{number:02}-sheet.png"
        rgb = np.array(Image.open(source).convert("RGB"))
        # The beach sheet has a blue-gray checkerboard rather than neutral gray.
        foreground, labels, bodies = extract_foreground(rgb, 14 if number == 10 else 10)
        rgba = np.dstack([rgb, (foreground * 255).astype(np.uint8)])
        transparent = Image.fromarray(rgba)
        if args.review_dir:
            save_image(transparent, args.review_dir / f"skin-{number:02}-transparent.png")
            dark = Image.new("RGBA", transparent.size, "#172b3c")
            dark.alpha_composite(transparent)
            save_image(dark.convert("RGB"), args.review_dir / f"skin-{number:02}-dark.png")
        if args.export:
            records, frames = export_frames(number, rgb, foreground, labels, bodies)
            manifest["skins"].append({"skin": number,
                "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "frames": records})
            if args.review_dir:
                for color, label in [("#172b3c", "dark"), ("#f1eadb", "light")]:
                    contact = Image.new("RGBA", (1920, 1280), color)
                    for index, frame in enumerate(frames):
                        contact.alpha_composite(frame, ((index % 3) * 640, (index // 3) * 640))
                    save_image(contact.convert("RGB"), args.review_dir / f"skin-{number:02}-aligned-{label}.png")
        print(number, "six characters", "removed", round(1 - foreground.mean(), 3), flush=True)
    if args.export:
        (SOURCE / "motion-export.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()

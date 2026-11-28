#!/usr/bin/env python3
"""Build the homepage hero mosaic from research and equipment photos.

The homepage hero shows a grid of lab photos behind the lab name. The grid is
pre-rendered into one JPEG so the browser downloads a single file. The
washed-out look is applied in CSS (_sass/home.scss), so this image stays in
full colour and the overlay strength can be tuned without re-running this.

Usage:
    python3 scripts/build_hero_mosaic.py

Edit SOURCES below to add or remove photos, then re-run. Rules:
- Use photos and renders of robots, equipment and experiments. Skip charts,
  diagrams, logos, portraits, group photos and news images.
- Photos should fill the whole frame: white areas look like holes once the
  hero's white wash is on top, and the script refuses tiles that are more than
  MAX_WHITE near-white. For a product shot on a white background, set
  studio=True: the white background is removed and the object is placed on a
  grey studio backdrop instead.
- Each photo appears once, so SOURCES needs at least COLS x ROWS entries.

Requires Pillow (pip install pillow).
"""

from __future__ import annotations

import argparse
import random
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "images" / "main_img" / "hero_mosaic.jpg"

# 10 x 5 tiles fits the hero's shape on a typical desktop screen.
COLS = 10
ROWS = 5
TILE_W = 239
TILE_H = 149
# Largest share of near-white pixels a photo tile may have.
MAX_WHITE = 0.15
# Studio backdrop for product shots: lighter in the middle, darker at the edges.
STUDIO_CENTER = (158, 166, 178)
STUDIO_EDGE = (104, 113, 127)
JPEG_QUALITY = 78


@dataclass(frozen=True)
class Source:
    path: str
    # Optional crop box (left, top, right, bottom) as fractions of the image,
    # applied first. Use it to cut brand logos, captions or white margins.
    box: tuple[float, float, float, float] | None = None
    # Vertical focus when cropping to the tile shape: 0 keeps the top, 1 the bottom.
    focus_y: float = 0.5
    # Product shot on white: remove the background and use the studio backdrop.
    studio: bool = False
    # Boxes (fractions of the original image) painted white before anything
    # else. With studio=True they vanish with the background: use them to drop
    # a logo without cropping away part of the object.
    erase: tuple[tuple[float, float, float, float], ...] = ()


SOURCES: list[Source] = [
    # Lab and equipment photos
    Source("images/lab/lab_3.jpg"),
    Source("images/lab/lab_4.jpg"),
    Source("images/equipment/equipments_1.png", focus_y=0.7),
    Source("images/equipment/equipments_2.png", focus_y=0.35),
    Source("images/equipment/equipments_4.png"),
    Source("images/equipment/equipments_5.jpg", focus_y=0.45),
    # Swapped with equipments_6 on purpose: list position sets grid position.
    Source("assets/source/hero_mosaic/youtube_geo_lstm.jpg", box=(0.14, 0.48, 0.34, 0.8)),
    Source("assets/source/hero_mosaic/terrain_stairs_ramp.png"),
    Source("assets/source/hero_mosaic/mecanum_mobile_base.png"),
    Source("assets/source/hero_mosaic/mocap_anybody_setup.png", box=(0.0, 0.0, 0.8, 1.0)),
    Source("images/equipment/optitrack_motioncapture.png", box=(0.0, 0.13, 1.0, 0.5)),
    # Equipment product shots (crop boxes cut the brand logos)
    Source("images/equipment/go2.png", box=(0.0, 0.18, 1.0, 1.0), studio=True),
    Source("images/equipment/h30a.png", box=(0.0, 0.18, 1.0, 1.0), studio=True),
    # Collaboration render from the Sinjin project (kept at this list position
    # so the other tiles stay where they are)
    Source("images/project/ergonomic_hrc/1.png", studio=True),
    Source("images/equipment/neuromek.png", erase=((0.265, 0.225, 0.98, 0.305),), studio=True),
    Source("images/equipment/piper.png", box=(0.0, 0.16, 1.0, 1.0), studio=True),
    Source("images/equipment/delsysemg.png", box=(0.0, 0.33, 0.9, 1.0), studio=True),
    Source("images/equipment/xsens_motioncapture.png", box=(0.0, 0.16, 1.0, 1.0), studio=True),
    Source("images/equipment/anybody.png", box=(0.0, 0.2, 1.0, 1.0), studio=True),
    # Research photos and renders
    Source("images/research/robot_manipulation/target_tracking_mobile_robot/1.png", box=(0.28, 0.25, 0.7, 0.72)),
    Source("images/research/exoskeleton_robot/tsa_variable_stiffness/1.png"),
    Source("images/research/exoskeleton_robot/tsa_variable_stiffness/main.png", studio=True),
    Source("images/research/exoskeleton_robot/multitask_gait_recognition/3.png", box=(0.53, 0.0, 0.97, 1.0), focus_y=0.3),
    # List position sets the grid position; these two were swapped on purpose.
    Source("images/tools_yaml/research_youtube.png"),
    Source("images/research/exoskeleton_robot/torsion_soft_actuator/main.png"),
    Source("images/research/robot_learning/mcp_robot_control/3.png"),
    Source("images/research/robot_manipulation/adaptive_control_hrc/1.png"),
    Source("images/research/robot_manipulation/adaptive_control_hrc/2.png"),
    Source("images/research/robot_manipulation/adaptive_control_hrc/main.png"),
    Source("images/research/robot_manipulation/intent_driving_mobile_manipulator/main.png", box=(0.3, 0.0, 1.0, 1.0)),
    Source("images/research/robot_manipulation/cooperative_transport_planning/1.png"),
    Source("images/research/robot_manipulation/clf_mpc_variable_impedance/1.png"),
    Source("images/_archive/exorobot_research_temp.png", box=(0.0, 0.0, 0.5, 1.0), focus_y=0.3),
    # Placed here on purpose: list position sets grid position.
    Source("images/equipment/equipments_6.jpg", focus_y=0.4),
    Source("images/_archive/taeyhang_research.png", box=(0.0, 0.0, 1.0, 0.62)),
    Source("images/tools_yaml/mobile_manipulator_temp.png", box=(0.0, 0.0, 0.47, 0.72)),
    Source("images/tools_yaml/mobile_manipulator_temp.png", box=(0.5, 0.0, 1.0, 0.85)),
    # VR teleoperation video, book arrangement panel
    Source("assets/source/hero_mosaic/youtube_vr_teleoperation.jpg", box=(0.13, 0.655, 0.458, 0.985)),
    # Frames from the lab's YouTube videos (thumbnails kept in assets/source,
    # which is not published)
    # https://www.youtube.com/watch?v=Xh0JEdAZnTI (Geo-LSTM)
    # Placed here on purpose: list position sets grid position.
    Source("images/_archive/exorobot_research_temp.png", box=(0.56, 0.0, 1.0, 1.0)),
    # https://www.youtube.com/watch?v=dX_LIZv7LZA (VR teleoperation): four task panels
    Source("assets/source/hero_mosaic/youtube_vr_teleoperation.jpg", box=(0.03, 0.29, 0.325, 0.565)),
    Source("assets/source/hero_mosaic/youtube_vr_teleoperation.jpg", box=(0.335, 0.29, 0.665, 0.565)),
    # https://www.youtube.com/watch?v=Hf3pkL9AmAg (ICROS 2026 IDEA demo): stair walking panel
    Source("assets/source/hero_mosaic/youtube_idea_demo.jpg", box=(0.505, 0.13, 0.656, 0.47)),
    Source("assets/source/hero_mosaic/youtube_vr_teleoperation.jpg", box=(0.505, 0.655, 0.835, 0.985)),
    # https://www.youtube.com/watch?v=9StFx4lnvmc (Go2 in Isaac Sim): simulator view
    Source("assets/source/hero_mosaic/youtube_go2_isaac_sim.jpg", box=(0.0, 0.1, 0.55, 0.95)),
    # https://www.youtube.com/watch?v=RW9_FgfxWzs (Go2 MCP demo): camera view
    Source("assets/source/hero_mosaic/youtube_go2_mcp_demo.jpg", box=(0.555, 0.56, 1.0, 1.0)),
    # Project renders
    Source("images/project/mobile_cobot_safety_guideline/main.png", studio=True),
    Source("images/project/forestry_mobile_platform/main.png", box=(0.0, 0.1, 0.93, 1.0)),
    Source("images/project/virtual_handshake/main.png", box=(0.36, 0.0, 1.0, 1.0)),
    Source("images/project/mobile_manipulator_whole_body_control/main.png"),
    Source("images/project/mobile_manipulator_whole_body_control/2.png", studio=True),
]


def load(source: Source) -> Image.Image:
    image = Image.open(ROOT / source.path)
    image.seek(0)  # first frame of animated images
    image = ImageOps.exif_transpose(image).convert("RGBA")
    width, height = image.size

    if source.erase:
        draw = ImageDraw.Draw(image)
        for left, top, right, bottom in source.erase:
            draw.rectangle(
                (round(left * width), round(top * height), round(right * width), round(bottom * height)),
                fill=(255, 255, 255, 255),
            )

    if source.box:
        left, top, right, bottom = source.box
        image = image.crop(
            (round(left * width), round(top * height), round(right * width), round(bottom * height))
        )
    return image


def flatten(image: Image.Image) -> Image.Image:
    return Image.alpha_composite(Image.new("RGBA", image.size, (255, 255, 255, 255)), image).convert("RGB")


def trim_white_border(image: Image.Image, max_share: float = 0.2) -> Image.Image:
    """Cut white frames that some source images have around the photo.

    Without this, the frame shows up as a white line between tiles.
    """
    # 255 where the pixel is not near-white.
    mask = image.convert("L").point(lambda value: 255 if value < 235 else 0)
    width, height = mask.size

    def blank(box: tuple[int, int, int, int], length: int) -> bool:
        return mask.crop(box).histogram()[255] < 0.05 * length

    left, top, right, bottom = 0, 0, width, height
    while left < width * max_share and blank((left, 0, left + 1, height), height):
        left += 1
    while width - right < width * max_share and blank((right - 1, 0, right, height), height):
        right -= 1
    while top < height * max_share and blank((0, top, width, top + 1), width):
        top += 1
    while height - bottom < height * max_share and blank((0, bottom - 1, width, bottom), width):
        bottom -= 1

    # Also drop the soft, anti-aliased edge next to a cut frame.
    inset = 3
    left += inset if left else 0
    top += inset if top else 0
    right -= inset if right < width else 0
    bottom -= inset if bottom < height else 0
    return image.crop((left, top, right, bottom))


def photo_tile(source: Source) -> Image.Image:
    image = trim_white_border(flatten(load(source)))
    return ImageOps.fit(image, (TILE_W, TILE_H), method=Image.Resampling.LANCZOS, centering=(0.5, source.focus_y))


def remove_white_background(image: Image.Image) -> Image.Image:
    """Make the white background transparent, keeping white parts of the object.

    Only white that is connected to the image border is removed.
    """
    rgb = flatten(image)
    marker = (255, 0, 255)
    filled = rgb.copy()
    width, height = filled.size
    step = max(1, min(width, height) // 60)
    seeds = [(x, y) for x in range(0, width, step) for y in (0, height - 1)]
    seeds += [(x, y) for y in range(0, height, step) for x in (0, width - 1)]
    for seed in seeds:
        pixel = filled.getpixel(seed)
        if pixel != marker and min(pixel) >= 235:
            ImageDraw.floodfill(filled, seed, marker, thresh=28)

    background = ImageChops.difference(filled, Image.new("RGB", filled.size, marker)).convert("L")
    background = background.point(lambda value: 255 if value == 0 else 0)
    # Grow into the anti-aliased fringe and soften the cut so no white halo remains.
    background = background.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))

    alpha = ImageChops.multiply(image.getchannel("A"), ImageOps.invert(background))
    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result


def studio_backdrop() -> Image.Image:
    gradient = Image.radial_gradient("L").resize((TILE_W, TILE_H), Image.Resampling.BICUBIC)
    return Image.composite(
        Image.new("RGB", (TILE_W, TILE_H), STUDIO_EDGE),
        Image.new("RGB", (TILE_W, TILE_H), STUDIO_CENTER),
        gradient,
    )


def studio_tile(source: Source) -> Image.Image:
    image = remove_white_background(load(source))
    bounds = image.getchannel("A").point(lambda value: 255 if value > 24 else 0).getbbox()
    if bounds:
        image = image.crop(bounds)

    padding = 0.12
    image = ImageOps.contain(
        image,
        (round(TILE_W * (1 - 2 * padding)), round(TILE_H * (1 - 2 * padding))),
        method=Image.Resampling.LANCZOS,
    )
    tile = studio_backdrop().convert("RGBA")
    tile.alpha_composite(image, ((TILE_W - image.width) // 2, (TILE_H - image.height) // 2))
    return tile.convert("RGB")


def make_tile(source: Source) -> Image.Image:
    return studio_tile(source) if source.studio else photo_tile(source)


def white_share(tile: Image.Image) -> float:
    histogram = tile.convert("L").histogram()
    return sum(histogram[235:]) / (tile.width * tile.height)


def spread_cells(count: int, cols: int, rows: int, rng: random.Random) -> list[int]:
    """Pick ``count`` grid cells, avoiding cells that share an edge."""
    order = list(range(cols * rows))
    rng.shuffle(order)
    taken: list[int] = []
    blocked: set[int] = set()

    for cell in order:
        if len(taken) == count:
            break
        if cell in blocked:
            continue
        taken.append(cell)
        row, col = divmod(cell, cols)
        blocked.update(
            neighbour
            for neighbour, ok in (
                (cell - 1, col > 0),
                (cell + 1, col < cols - 1),
                (cell - cols, row > 0),
                (cell + cols, row < rows - 1),
            )
            if ok
        )

    # More cells than fit apart: take the rest anywhere.
    taken += [cell for cell in order if cell not in taken][: count - len(taken)]
    return taken


def contacts(cells: list[int], cols: int) -> int:
    """Score how much the given cells touch: edges count more than corners."""
    cell_set = set(cells)
    score = 0
    for cell in cells:
        row, col = divmod(cell, cols)
        for d_row, d_col, weight in ((0, 1, 10), (1, 0, 10), (1, 1, 1), (1, -1, 1)):
            other_col = col + d_col
            if 0 <= other_col < cols and (row + d_row) * cols + other_col in cell_set:
                score += weight
    return score


def arrange(cols: int, rows: int, seed: int) -> list[list[int]]:
    """Place each source at most once; keep studio tiles apart from each other."""
    cells = cols * rows
    if len(SOURCES) < cells:
        raise SystemExit(
            f"A {cols}x{rows} grid needs {cells} different photos, but SOURCES has {len(SOURCES)}. "
            "Add photos or pass a smaller --cols/--rows."
        )

    rng = random.Random(seed)
    chosen = rng.sample(range(len(SOURCES)), cells)
    studio = [index for index in chosen if SOURCES[index].studio]
    photos = [index for index in chosen if not SOURCES[index].studio]

    studio_cells = min(
        (spread_cells(len(studio), cols, rows, rng) for _ in range(2000)),
        key=lambda candidate: contacts(candidate, cols),
    )
    photo_cells = [cell for cell in range(cells) if cell not in set(studio_cells)]

    flat = [0] * cells
    for cell, index in zip(studio_cells, studio):
        flat[cell] = index
    for cell, index in zip(photo_cells, photos):
        flat[cell] = index
    return [flat[row * cols : (row + 1) * cols] for row in range(rows)]


def build(output: Path, cols: int, rows: int, seed: int) -> None:
    missing = sorted({source.path for source in SOURCES if not (ROOT / source.path).exists()})
    if missing:
        raise SystemExit("Missing source images:\n  " + "\n  ".join(missing))

    tiles = [make_tile(source) for source in SOURCES]

    too_white = [
        f"{source.path}: {white_share(tile):.0%} white"
        for source, tile in zip(SOURCES, tiles)
        if not source.studio and white_share(tile) > MAX_WHITE
    ]
    if too_white:
        raise SystemExit(
            f"These tiles are more than {MAX_WHITE:.0%} white; crop them with box=, "
            "set studio=True for product shots, or remove them:\n  " + "\n  ".join(too_white)
        )

    grid = arrange(cols, rows, seed)
    canvas = Image.new("RGB", (cols * TILE_W, rows * TILE_H))
    for row, line in enumerate(grid):
        for col, index in enumerate(line):
            canvas.paste(tiles[index], (col * TILE_W, row * TILE_H))

    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(output, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)

    size_kb = output.stat().st_size / 1024
    shown = output.relative_to(ROOT) if output.is_relative_to(ROOT) else output
    print(
        f"Wrote {shown} ({canvas.width}x{canvas.height}, {size_kb:.0f} KB, "
        f"{cols * rows} of {len(SOURCES)} sources, no repeats)"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="where to write the JPEG")
    parser.add_argument("--cols", type=int, default=COLS)
    parser.add_argument("--rows", type=int, default=ROWS)
    parser.add_argument("--seed", type=int, default=7, help="change to reshuffle the tile order")
    args = parser.parse_args()

    build(args.output.resolve(), args.cols, args.rows, args.seed)


if __name__ == "__main__":
    main()

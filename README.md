# HARCO Lab Website

Jekyll source for <https://harco.hanyang.ac.kr>, the website of the Human Robot
Collaboration Lab at Hanyang University. GitHub Pages deploys every push to
`main`.

## Install

Requires Ruby 3.4 (`.ruby-version`) with Bundler, and Python 3 for the scripts.

| OS | Ruby |
| --- | --- |
| macOS, Linux | [rbenv](https://github.com/rbenv/rbenv): `rbenv install`, after the [build packages](https://github.com/rbenv/ruby-build/wiki#suggested-build-environment) |
| Windows | [RubyInstaller](https://rubyinstaller.org/downloads/) **Ruby+Devkit 3.4** |

```bash
bundle install
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install requests pyyaml openpyxl pillow
```

On Windows, use `py` instead of `python3`.

## Run

```bash
./scripts/start.sh                      # macOS, Linux
bundle exec jekyll serve --livereload   # Windows
```

Open <http://localhost:4000>.

## Content Rules

File names and front matter: [CONVENTIONS.md](CONVENTIONS.md).

| Content | Path |
| --- | --- |
| Member | `_members/firstname_lastname.md` |
| Member photo | `images/members/firstname_lastname.jpg` |
| Post | `_posts/<news\|project\|workshop>/YYYY-MM-DD-<category>_<slug>.md` |
| Research post | `_posts/research/<robot_manipulation\|exoskeleton\|robot_learning>/YYYY-MM-DD-<topic>.md` |
| Post images | `images/<category>/`, research: `images/research/<area>/<topic>/` |

Member `tier`: `pi`, `research_professor`, `second` (postdoc), `third`
(Ph.D.), `fourth` (M.S.), `fifth` (B.S.), `alumni`.

Images:

- `.jpg` for photos, `.png` only for graphics or transparency. The extension
  must match the file format.
- At most 2400px on the long side.
- JPEG under 2 MB; any referenced image under 2.5 MB (GIF 5 MB).

## Scripts

| Task | Command |
| --- | --- |
| Sync publications from Google Scholar | `python3 scripts/local_publication_sync.py` |
| Correct or hide a publication | Edit `_data/publication_overrides.yaml` |
| Refresh YouTube videos | `python3 scripts/scrape_youtube.py` |
| Update patents from `assets/source/HARCO_patent_list.xlsx` | `python3 scripts/update_patents_json.py` |
| Rebuild the homepage mosaic | `python3 scripts/build_hero_mosaic.py` |

GitHub Actions also refresh YouTube daily and open a publication update PR
weekly.

## Before Opening a PR

```bash
python3 -m unittest discover tests
git diff --check
bundle exec jekyll build --destination _site_check
```

Branch from `main` as `<type>/<name>/<topic>` and open the PR into `main`.
Do not publish development files: list them under `exclude` in `_config.yaml`.

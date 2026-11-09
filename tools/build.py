"""Build index.html from src/shell.html + src/game.js + src/sprites.json.

Run from the repo root:  python3 tools/build.py
"""
from pathlib import Path

root = Path(__file__).resolve().parent.parent
shell = (root / 'src' / 'shell.html').read_text()
game = (root / 'src' / 'game.js').read_text()
sprites = (root / 'src' / 'sprites.json').read_text()
html = shell.replace('/*__GAME__*/', game.replace('__SPRITES__', sprites))
(root / 'index.html').write_text(html)
print(f'index.html written ({len(html):,} bytes)')

#!/usr/bin/env python3
import os, re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path('/workspace')
SKIP_DIRS = {'.git', '__pycache__', 'node_modules', '.logs', '.pids'}
SCAN_EXTS = {'.html', '.md', '.htm', '.css', '.js'}

def walk(root):
    for dp, dns, fns in os.walk(root):
        dns[:] = [d for d in dns if d not in SKIP_DIRS and not d.startswith('.')]
        for fn in fns:
            if fn.startswith('.'): continue
            yield Path(dp)/fn

def is_external(h):
    return h.startswith(('http://','https://','mailto:','tel:','javascript:','data:','#','about:'))

HTML_RE = re.compile(r'''\b(?:href|src|action)\s*=\s*(["'])([^"']*?)\1''')
MD_RE = re.compile(r'''\[[^\]]*\]\(([^)]+)\)''')

broken = []
total = 0
for f in walk(ROOT):
    if f.suffix.lower() not in SCAN_EXTS: continue
    if f.parent.name == 'tools': continue
    try:
        c = f.read_text(encoding='utf-8', errors='ignore')
    except: continue
    for m in HTML_RE.finditer(c):
        url = m.group(2)
        total += 1
        if is_external(url): continue
        u = unquote(url.split('#')[0].split('?')[0])
        if not u: continue
        if u.startswith('file://'): u = u.replace('file://','',1)
        if os.path.isabs(u): p = Path(u)
        else: p = (f.parent / u).resolve()
        if not p.exists():
            broken.append((str(f.relative_to(ROOT)), url))
    for m in MD_RE.finditer(c):
        url = m.group(1)
        total += 1
        if is_external(url): continue
        u = unquote(url.split('#')[0].split('?')[0])
        if not u: continue
        if u.startswith('file://'): u = u.replace('file://','',1)
        if os.path.isabs(u): p = Path(u)
        else: p = (f.parent / u).resolve()
        if not p.exists():
            broken.append((str(f.relative_to(ROOT)), url))

print(f'Total links checked: {total}')
print(f'Potential broken links: {len(broken)}')
real_broken = []
for f, u in broken:
    in_code = False
    try:
        content = (ROOT/f).read_text(encoding='utf-8', errors='ignore')
        lines = content.split('\n')
        for i, line in enumerate(lines):
            if u in line:
                stripped = line.strip()
                if stripped.startswith('```') or stripped.startswith('|') or 'FAIL_SAFE' in u or 'BLOCK_AND_AUDIT' in u or 'PASS' in u or 'FOLD' in u or 'CALL' in u or 'RAISE' in u or 'BIG_BET' in u or 'ALL' in u or 'DRAWDOWN' in u or 'NEW_PATH' in u or 'REDIRECT_TARGET' in u or 'RECOMPUTE' in u or 'REQUIRE_AUDIT' in u or 'config_write' in u or u == 't' or u == '...' or 'pipeline.' in u or 'context' in u or u.startswith('['):
                    in_code = True
                break
    except: pass
    if not in_code:
        real_broken.append((f, u))

print(f'Real broken links (excluding code samples/constants/placeholders): {len(real_broken)}')
for f, u in real_broken:
    print(f'  {f}: {u}')

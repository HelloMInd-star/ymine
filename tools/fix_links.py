#!/usr/bin/env python3
import os
import re
import json
from pathlib import Path
from urllib.parse import unquote

ROOT = Path('/workspace')
FIXED = []
REMAINING = []

SKIP_DIRS = {'.git', '__pycache__', 'node_modules', '.logs', '.pids'}
SCAN_EXTS = {'.html', '.md', '.htm', '.css', '.js'}

def walk_files(root):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS and not d.startswith('.')]
        for fn in filenames:
            if fn.startswith('.'):
                continue
            yield Path(dirpath) / fn

all_files = list(walk_files(ROOT))
file_by_relpath = {}
file_by_basename = {}
for f in all_files:
    rel = f.relative_to(ROOT).as_posix()
    file_by_relpath[rel] = f
    file_by_basename.setdefault(f.name, []).append(f)

def is_external(href):
    return href.startswith(('http://', 'https://', 'mailto:', 'tel:', 'javascript:', 'data:', '#', 'about:'))

def resolve_href(href, source_file):
    href_clean = href.split('#')[0].split('?')[0]
    if not href_clean or is_external(href_clean):
        return None
    href_clean = unquote(href_clean)
    if href_clean.startswith('file://'):
        href_clean = href_clean.replace('file://', '', 1)
    try:
        if os.path.isabs(href_clean):
            p = Path(href_clean)
        else:
            p = (source_file.parent / href_clean).resolve()
        return p
    except Exception:
        return None

def href_exists(href, source_file):
    p = resolve_href(href, source_file)
    if p is None:
        return True
    return p.exists()

def find_correct_target(href, source_file):
    href_clean = href.split('#')[0].split('?')[0]
    if not href_clean or is_external(href_clean):
        return None
    href_clean = unquote(href_clean)
    if href_clean.startswith('file://'):
        href_clean = href_clean.replace('file://', '', 1)
    basename = os.path.basename(href_clean.rstrip('/'))
    if not basename:
        basename = href_clean.rstrip('/').split('/')[-1] if href_clean else ''
    if not basename:
        return None
    if basename in file_by_basename:
        candidates = file_by_basename[basename]
        if len(candidates) == 1:
            target = candidates[0]
            rel = os.path.relpath(target, source_file.parent).replace('\\', '/')
            if not rel.startswith('.'):
                rel = './' + rel
            hash_part = '#' + href.split('#',1)[1] if '#' in href else ''
            return rel + hash_part
        else:
            rel_dir = href_clean
            for c in candidates:
                crel = c.relative_to(ROOT).as_posix()
                if href_clean.lstrip('/') in crel or crel.endswith(href_clean.lstrip('/')):
                    rel = os.path.relpath(c, source_file.parent).replace('\\', '/')
                    if not rel.startswith('.'):
                        rel = './' + rel
                    hash_part = '#' + href.split('#',1)[1] if '#' in href else ''
                    return rel + hash_part
            for c in candidates:
                if source_file.parent in c.parents or c.parent in source_file.parents:
                    rel = os.path.relpath(c, source_file.parent).replace('\\', '/')
                    if not rel.startswith('.'):
                        rel = './' + rel
                    hash_part = '#' + href.split('#',1)[1] if '#' in href else ''
                    return rel + hash_part
    abs_candidates = [
        'geom-compute-base.html',
    ]
    if basename in abs_candidates:
        target = ROOT / 'engines/geom-compute/index.html'
        if target.exists():
            rel = os.path.relpath(target, source_file.parent).replace('\\', '/')
            if not rel.startswith('.'):
                rel = './' + rel
            hash_part = '#' + href.split('#',1)[1] if '#' in href else ''
            return rel + hash_part
    return None

HTML_HREF_RE = re.compile(r'''(\b(?:href|src|action)\s*=\s*(["']))([^"']*?)(\2)''')
MD_LINK_RE = re.compile(r'(\[[^\]]*\]\()([^)]+?)(\))')
HTML_SCRIPT_IMG_RE = re.compile(r'''(<(?:script|img|link|a)\b[^>]*?\b(?:href|src)\s*=\s*)(["'])([^"']*?)(\2)''')

def find_matches(content, source_file):
    matches = []
    for m in HTML_HREF_RE.finditer(content):
        full_start = m.start(3)
        full_end = m.end(3)
        url = m.group(3)
        if is_external(url) or url.startswith('data:'):
            continue
        matches.append((full_start, full_end, url, 'html'))
    for m in MD_LINK_RE.finditer(content):
        full_start = m.start(2)
        full_end = m.end(2)
        url = m.group(2)
        if is_external(url):
            continue
        matches.append((full_start, full_end, url, 'md'))
    matches.sort(key=lambda x: x[0])
    return matches

for filepath in all_files:
    if filepath.suffix.lower() not in SCAN_EXTS:
        continue
    if filepath.name in {'fix_links.py', 'fix_links.js', 'scan_links.js', 'check-links.js', 'check-index-links.js', 'check-nav-comprehensive.js', 'check-nav-final.js', 'check-evidence-pages.js', 'test-engine.js'}:
        continue
    try:
        content = filepath.read_text(encoding='utf-8')
    except Exception:
        continue
    matches = find_matches(content, filepath)
    if not matches:
        continue
    broken = []
    for start, end, url, mtype in matches:
        if not href_exists(url, filepath):
            broken.append((start, end, url))
    if not broken:
        continue
    new_content = content
    offset = 0
    file_fixes = []
    seen_positions = set()
    for start, end, url in broken:
        if (start, end) in seen_positions:
            continue
        seen_positions.add((start, end))
        new_url = find_correct_target(url, filepath)
        if new_url and new_url != url:
            adj_start = start + offset
            adj_end = end + offset
            new_content = new_content[:adj_start] + new_url + new_content[adj_end:]
            offset += len(new_url) - (end - start)
            file_fixes.append({'from': url, 'to': new_url})
            FIXED.append({'file': str(filepath), 'from': url, 'to': new_url})
        else:
            REMAINING.append({'file': str(filepath), 'broken': url})
    if file_fixes:
        filepath.write_text(new_content, encoding='utf-8')
        print(f"Fixed {len(file_fixes)} links in {filepath.relative_to(ROOT)}")

with open(ROOT / 'tools/fixed_links.json', 'w', encoding='utf-8') as f:
    json.dump(FIXED, f, ensure_ascii=False, indent=2)
with open(ROOT / 'tools/broken_links_report.json', 'w', encoding='utf-8') as f:
    json.dump(REMAINING, f, ensure_ascii=False, indent=2)

print(f"\n=== Complete ===")
print(f"Fixed: {len(FIXED)} links")
print(f"Remaining broken: {len(REMAINING)}")
if REMAINING:
    print("\n--- Remaining broken links ---")
    for r in REMAINING[:50]:
        print(f"  {r['file']}: {r['broken']}")

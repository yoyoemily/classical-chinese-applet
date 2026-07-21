#!/usr/bin/env python3
"""为高一上 9 首新增诗词写入articles分文件、创建典故注释文件并导入数据库。

Usage:
  python3 scripts/generate_grade10a_poems.py --dry-run      # 验证数据
  python3 scripts/generate_grade10a_poems.py --apply         # 写入并导入数据库
  python3 scripts/generate_grade10a_poems.py --articles-only # 仅写入+导入正文
  python3 scripts/generate_grade10a_poems.py --glossaries-only # 仅创建+导入典故注释
"""

import json, os, sys, subprocess, glob, re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
GLOSSARY_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/典故注释")
ARTICLES_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文")
BASE_URL = "http://localhost:8080"

# Load data from JSON files
def load_poems():
    path = os.path.join(DATA_DIR, "poems_grade10a.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_glossaries():
    path = os.path.join(DATA_DIR, "glossaries_grade10a.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def check_kid_uniqueness(poems):
    """检查所有 kid 是否全局唯一（含已有文章中的 kid）。"""
    kids_local = {}
    for p in poems:
        for si, s in enumerate(p["sentences"]):
            for kw in s.get("keyWords", []):
                kid = kw["kid"]
                if kid in kids_local:
                    print(f"❌ DUPLICATE KID (local): {kid}")
                    return False
                kids_local[kid] = f"{p['id']} s{si}"

    # Check against all existing articles
    files = sorted(glob.glob(os.path.join(ARTICLES_DIR, "articles_*.json")))
    for fp in files:
        with open(fp, "r", encoding="utf-8") as f:
            existing = json.load(f)
        for a in existing:
            for si, s in enumerate(a.get("sentences", [])):
                for kw in s.get("keyWords", []):
                    kid = kw.get("kid", "")
                    if kid in kids_local:
                        print(f"❌ DUPLICATE KID (vs existing {a['id']}): {kid}")
                        return False
    print(f"✅ Kid uniqueness: {len(kids_local)} kids all unique")
    return True


def check_clause_alignment(poems):
    """检查每句原文与译文的标点分句数对齐。"""
    all_ok = True
    for p in poems:
        for si, s in enumerate(p["sentences"]):
            text = s.get("text", "")
            trans = s.get("translation", "")
            if not text or not trans:
                print(f"❌ {p['id']} s{si}: missing text or translation")
                all_ok = False
                continue
            tc = [x for x in re.split(r"[。！？；]", text) if x.strip()]
            cc = [x for x in re.split(r"[。！？；]", trans) if x.strip()]
            if len(tc) != len(cc):
                print(f"⚠️  {p['id']} s{si}: clause mismatch ({len(tc)} vs {len(cc)}) — {text[:50]}...")
    if all_ok:
        print("✅ Clause alignment check passed")
    return all_ok


def check_kid_sentence_index(poems):
    """检查 keyWord kid 中的 sXX 编号是否与当前 sentenceIndex 一致。"""
    all_ok = True
    for p in poems:
        for si, s in enumerate(p["sentences"]):
            expected_s = f"_s{si:02d}_"
            for kw in s.get("keyWords", []):
                kid = kw["kid"]
                if expected_s not in kid:
                    print(f"❌ {p['id']} {kid}: expected {expected_s} in kid")
                    all_ok = False
    if all_ok:
        print("✅ Kid sentence index check passed")
    return all_ok


def check_glossary_sentence_index(poems, glossaries):
    """检查 glossary 的 sentenceIndex 是否与 poems 中的实际位置一致。"""
    all_ok = True
    for p in poems:
        pid = p["id"]
        if pid not in glossaries:
            print(f"⚠️  {pid}: no glossary entry")
            continue
        gl_sentences = glossaries[pid].get("sentences", [])
        gl_indices = [gs["sentenceIndex"] for gs in gl_sentences]
        expected = list(range(len(p["sentences"])))
        if gl_indices != expected:
            print(f"❌ {pid} glossary sentenceIndex mismatch: {gl_indices} vs expected {expected}")
            all_ok = False
    if all_ok:
        print("✅ Glossary sentence index check passed")
    return all_ok


def write_articles(poems, dry_run=True):
    """将新诗词写入 articles_grade10a.json。"""
    target_file = os.path.join(ARTICLES_DIR, "articles_grade10a.json")
    with open(target_file, "r", encoding="utf-8") as f:
        existing = json.load(f)

    existing_ids = {a["id"] for a in existing}
    new_poems = [p for p in poems if p["id"] not in existing_ids]
    if not new_poems:
        print("⚠️  All poems already exist in articles_grade10a.json")
        return

    print(f"📝 Adding {len(new_poems)} new poems to articles_grade10a.json...")
    for p in new_poems:
        # Remove keyWords from sentences — keyWords are embedded in articles.json
        # but we need to keep the same structure as existing articles
        article = {
            "id": p["id"],
            "title": p["title"],
            "author": p["author"],
            "dynasty": p["dynasty"],
            "category": p["category"],
            "textbook": p["textbook"],
            "type": "poem",
            "grade": p["textbook"],
            "background": p.get("background", ""),
            "relatedWordIds": p.get("relatedWordIds", []),
            "kid": p["id"],
            "sentences": p["sentences"]
        }
        existing.append(article)

    if dry_run:
        print(f"  🔍 dry-run: would add {len(new_poems)} poems")
        return

    with open(target_file, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)
    print(f"  ✅ Wrote {target_file} ({len(existing)} total)")


def write_glossaries(glossaries, dry_run=True):
    """创建典故注释文件 art_XXX.json。"""
    for art_id, gl_data in glossaries.items():
        target_file = os.path.join(GLOSSARY_DIR, f"{art_id}.json")
        if os.path.exists(target_file):
            print(f"⚠️  {target_file} already exists, skipping")
            continue
        if dry_run:
            print(f"  🔍 dry-run: would create {target_file}")
        else:
            # Convert to canonical format
            output = {
                "articleId": gl_data["articleId"],
                "title": gl_data["title"],
                "sentences": gl_data["sentences"]
            }
            with open(target_file, "w", encoding="utf-8") as f:
                json.dump(output, f, ensure_ascii=False, indent=2)
            print(f"  ✅ Created {target_file}")


def import_articles():
    """全量导入文章（含 keyWords）到数据库。"""
    print("\n📥 Importing articles to database...")
    cmd = (
        'python3 -c "'
        'import json, glob, os; '
        "d = []; "
        "files = sorted(glob.glob(os.path.expanduser('~/Documents/knowledge_library/文言文/选篇/正文/articles_*.json'))); "
        "[d.extend(json.load(open(f))) for f in files]; "
        "print(json.dumps(d, ensure_ascii=False))"
        '"'
    )
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"❌ Failed to collect articles: {result.stderr}")
        return False

    payload = result.stdout
    curl_cmd = [
        "curl", "-s", "-X", "POST",
        f"{BASE_URL}/api/admin/import/articles",
        "-H", "Content-Type: application/json",
        "-d", payload
    ]
    result = subprocess.run(curl_cmd, capture_output=True, text=True)
    print(f"  Articles import: {result.stdout.strip()}")
    if result.returncode != 0:
        print(f"  ❌ stderr: {result.stderr}")
        return False
    return True


def import_glossary(art_id):
    """导入单篇典故注释到数据库。"""
    target_file = os.path.join(GLOSSARY_DIR, f"{art_id}.json")
    if not os.path.exists(target_file):
        print(f"  ⚠️  Glossary file {target_file} not found, skipping")
        return True
    curl_cmd = [
        "curl", "-s", "-X", "POST",
        f"{BASE_URL}/api/admin/import/glossary/{art_id}",
        "-H", "Content-Type: application/json",
        "-d", f"@{target_file}"
    ]
    result = subprocess.run(curl_cmd, capture_output=True, text=True)
    print(f"  Glossary {art_id}: {result.stdout.strip()}")
    return True


def main():
    dry_run = "--dry-run" in sys.argv
    apply_mode = "--apply" in sys.argv
    articles_only = "--articles-only" in sys.argv
    glossaries_only = "--glossaries-only" in sys.argv

    if not (dry_run or apply_mode or articles_only or glossaries_only):
        print("Usage: python3 generate_grade10a_poems.py [--dry-run|--apply|--articles-only|--glossaries-only]")
        sys.exit(1)

    poems = load_poems()
    glossaries = load_glossaries()
    print(f"📖 Loaded {len(poems)} poems, {len(glossaries)} glossaries\n")

    # Validation
    print("=== Validation ===")
    ok = all([
        check_kid_uniqueness(poems),
        check_clause_alignment(poems),
        check_kid_sentence_index(poems),
        check_glossary_sentence_index(poems, glossaries),
    ])

    if not ok:
        print("\n❌ Validation failed, aborting.")
        sys.exit(1)

    if dry_run:
        print("\n🔍 Dry-run mode. Use --apply to write and import.")
        write_articles(poems, dry_run=True)
        write_glossaries(glossaries, dry_run=True)
        return

    # Write
    print("\n=== Writing files ===")
    if not glossaries_only:
        write_articles(poems, dry_run=False)
    if not articles_only:
        write_glossaries(glossaries, dry_run=False)

    # Import to database (only in --apply mode)
    if apply_mode:
        if not glossaries_only:
            import_articles()
        if not articles_only:
            for art_id in glossaries:
                import_glossary(art_id)
        print("\n✅ Import complete.")
    else:
        print("\n⚠️  Files written but not imported. Use --apply to import to database.")

    # Update articles.json (merged)
    print("\n=== Updating merged articles.json ===")
    files = sorted(glob.glob(os.path.join(ARTICLES_DIR, "articles_*.json")))
    all_articles = []
    for fp in files:
        with open(fp, "r", encoding="utf-8") as f:
            all_articles.extend(json.load(f))
    merged_path = os.path.join(ARTICLES_DIR, "articles.json")
    with open(merged_path, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"  ✅ Updated {merged_path} ({len(all_articles)} articles)")


if __name__ == "__main__":
    main()

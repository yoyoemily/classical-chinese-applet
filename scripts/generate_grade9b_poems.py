#!/usr/bin/env python3
"""为九下 13 首新增诗词写入articles分文件、创建典故注释文件并导入数据库。

Usage:
  python3 scripts/generate_grade9b_poems.py --dry-run      # 验证数据
  python3 scripts/generate_grade9b_poems.py --apply         # 写入并导入数据库
  python3 scripts/generate_grade9b_poems.py --articles-only # 仅写入+导入正文
  python3 scripts/generate_grade9b_poems.py --glossaries-only # 仅创建+导入典故注释
"""

import json, os, sys, subprocess, glob, re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
GLOSSARY_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/典故注释")
ARTICLES_DIR = os.path.expanduser("~/Documents/knowledge_library/文言文/选篇/正文")
BASE_URL = "http://localhost:8080"

# Load data from JSON files
def load_poems():
    path = os.path.join(DATA_DIR, "poems_grade9b.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_glossaries():
    path = os.path.join(DATA_DIR, "glossaries_grade9b.json")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def check_kid_uniqueness(poems):
    """检查所有 kid 是否全局唯一（含已有文章中的 kid）。"""
    kids_local = {}
    # Check new poems internally
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
                    if kid and kid in kids_local:
                        print(f"❌ DUPLICATE KID: {kid} in {kids_local[kid]} and {a['id']} s{si}")
                        return False

    print(f"✅ Kid check: {len(kids_local)} unique kids across {len(poems)} new poems (no conflicts with existing)")
    return True

def validate_poems(poems):
    """校验切句和译文。"""
    errors = []
    for p in poems:
        for si, s in enumerate(p["sentences"]):
            text = s["text"]
            trans = s.get("translation", "")
            if not trans or trans.strip() == "":
                errors.append(f"{p['id']} s{si}: empty translation")
            # Check kid sXX matches sentence index
            for kw in s.get("keyWords", []):
                kid = kw["kid"]
                match = re.search(r'_s(\d+)_', kid)
                if match:
                    kid_si = int(match.group(1))
                    if kid_si != si:
                        errors.append(f"{p['id']}: kid {kid} has s{kid_si:02d} but actual sentenceIndex is {si}")
            # Check article ID in kid
            for kw in s.get("keyWords", []):
                kid = kw["kid"]
                if not kid.startswith(f"kw_{p['id']}_"):
                    errors.append(f"{p['id']}: kid {kid} doesn't start with kw_{p['id']}_")
            # Check wordType validity
            valid_types = {"shi", "xu", "tongjia", "gujinyi", "huoyong"}
            for kw in s.get("keyWords", []):
                wt = kw.get("wordType", "")
                if wt and wt not in valid_types:
                    errors.append(f"{p['id']}: kid {kw['kid']} has invalid wordType '{wt}'")

    if errors:
        print("❌ Validation errors:")
        for e in errors:
            print(f"   {e}")
        return False
    print(f"✅ All {len(poems)} poems validated (no empty translations, kids match sentences)")
    return True

def write_articles(poems):
    """将 13 首新诗词追加到 articles_grade9b.json。"""
    path = os.path.join(ARTICLES_DIR, "articles_grade9b.json")

    with open(path, "r", encoding="utf-8") as f:
        existing = json.load(f)

    existing_ids = {a["id"] for a in existing}
    new_poems = [p for p in poems if p["id"] not in existing_ids]

    if not new_poems:
        print("⚠️  All poems already exist in articles_grade9b.json, skipping.")
        return

    # Backup
    bak = path + ".bak"
    with open(bak, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

    # Append new poems
    existing.extend(new_poems)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

    # Validate
    with open(path, "r", encoding="utf-8") as f:
        json.load(f)

    os.remove(bak)

    total_sentences = sum(len(p["sentences"]) for p in new_poems)
    total_kw = sum(sum(len(s.get("keyWords", [])) for s in p["sentences"]) for p in new_poems)
    print(f"✅ Added {len(new_poems)} poems to articles_grade9b.json ({total_sentences} sentences, {total_kw} keyWords)")
    print(f"   Total articles in grade9b: {len(existing)}")

def create_glossary_files(glossaries):
    """创建 13 个典故注释 JSON 文件并校验。"""
    created = []
    for aid, data in glossaries.items():
        path = os.path.join(GLOSSARY_DIR, f"{aid}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        # JSON 校验
        with open(path, "r", encoding="utf-8") as f:
            json.load(f)
        total = sum(len(s["glossary"]) for s in data["sentences"])
        created.append((aid, data["title"], total))

    print("✅ 典故注释文件已创建：")
    for aid, title, cnt in created:
        print(f"  {aid}.json  {title}: {cnt} 条注释")
    total = sum(c for _, _, c in created)
    print(f"  合计: {len(created)} 篇, {total} 条注释")
    return total

def import_articles():
    """拼接 12 个分文件并全量导入。"""
    print(f"\n📖 导入选篇正文...")

    files = sorted(glob.glob(os.path.join(ARTICLES_DIR, "articles_*.json")))
    all_articles = []
    for fp in files:
        with open(fp, "r", encoding="utf-8") as f:
            all_articles.extend(json.load(f))

    payload = json.dumps(all_articles, ensure_ascii=False)
    grade9b_count = len([a for a in all_articles if a.get("textbook") == "grade9b"])
    print(f"   文件数: {len(files)}, 总篇数: {len(all_articles)}, 九下: {grade9b_count}")

    cmd = [
        "curl", "-s", "-X", "POST",
        f"{BASE_URL}/api/admin/import/articles",
        "-H", "Content-Type: application/json",
        "-d", payload
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    print(f"   响应: {result.stdout[:500]}")
    if result.returncode != 0:
        print(f"   ❌ 导入失败: {result.stderr}")
    else:
        try:
            resp = json.loads(result.stdout)
            if resp.get("code") == 0:
                print(f"   ✅ 选篇正文导入成功")
            else:
                print(f"   ⚠️ 响应: {resp}")
        except json.JSONDecodeError:
            print(f"   ⚠️ 无法解析响应: {result.stdout[:200]}")

def import_glossaries(glossaries):
    """逐篇导入典故注释。"""
    print(f"\n📖 导入典故注释...")
    for aid in glossaries:
        path = os.path.join(GLOSSARY_DIR, f"{aid}.json")
        cmd = [
            "curl", "-s", "-X", "POST",
            f"{BASE_URL}/api/admin/import/glossary/{aid}",
            "-H", "Content-Type: application/json",
            "-d", f"@{path}"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        try:
            resp = json.loads(result.stdout)
            if resp.get("code") == 0:
                item_count = resp.get("data", 0)
                print(f"  ✅ {aid} ({item_count} 条)")
            else:
                print(f"  ⚠️ {aid}: {resp.get('message', result.stdout[:100])}")
        except json.JSONDecodeError:
            print(f"  ❌ {aid}: 无法解析响应 → {result.stdout[:100]}")

def print_summary(poems):
    """打印诗词摘要。"""
    print(f"\n📋 Poems summary:")
    total_s = total_kw = 0
    for p in poems:
        sc = len(p["sentences"])
        kw = sum(len(s.get("keyWords", [])) for s in p["sentences"])
        total_s += sc
        total_kw += kw
        print(f"  {p['id']} {p['title']} ({p['author']}): {sc} sentences, {kw} keyWords")
    print(f"  合计: {len(poems)} 首, {total_s} 句, {total_kw} 条 keyWords")

def main():
    poems = load_poems()
    glossaries = load_glossaries()

    if len(sys.argv) > 1:
        if sys.argv[1] == "--apply":
            print("🔍 Step 1: Validating...")
            if not validate_poems(poems):
                print("❌ Validation failed, aborting.")
                return
            if not check_kid_uniqueness(poems):
                print("❌ Kid uniqueness check failed, aborting.")
                return

            print("\n📝 Step 2: Writing articles to knowledge base...")
            write_articles(poems)

            print("\n📝 Step 3: Creating glossary files...")
            create_glossary_files(glossaries)

            print("\n📝 Step 4: Importing to database...")
            import_articles()
            import_glossaries(glossaries)

            print("\n🎉 Done! 13 grade9b poems backfilled.")
            return
        elif sys.argv[1] == "--validate":
            validate_poems(poems)
            check_kid_uniqueness(poems)
            return
        elif sys.argv[1] == "--articles-only":
            if not validate_poems(poems):
                return
            if not check_kid_uniqueness(poems):
                return
            write_articles(poems)
            import_articles()
            return
        elif sys.argv[1] == "--glossaries-only":
            create_glossary_files(glossaries)
            import_glossaries(glossaries)
            return
        elif sys.argv[1] == "--dry-run":
            validate_poems(poems)
            check_kid_uniqueness(poems)
            print_summary(poems)
            return

    # Default: dry run
    print("🔍 Validating poems (dry run)...")
    validate_poems(poems)
    check_kid_uniqueness(poems)
    print_summary(poems)
    print(f"\n💡 下一步:")
    print(f"   python3 scripts/generate_grade9b_poems.py --dry-run   # 详细检查")
    print(f"   python3 scripts/generate_grade9b_poems.py --apply      # 写入并导入数据库")

if __name__ == "__main__":
    main()

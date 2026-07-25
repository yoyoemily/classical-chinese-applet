#!/usr/bin/env python3
"""
Fill missing quizItems in word book JSON files.

For each keyWordRef that has no corresponding quizItem (matched by kidRef),
generate a new quizItem using data from the article keywords.

Usage: python3 scripts/fill_missing_quizitems.py
"""

import json
import glob
import os
import re
import sys

# ── config ──────────────────────────────────────────────────────────
WB_DIR = os.path.expanduser('~/knowledge_library/文言文/词书/')
ARTICLES_DIR = os.path.expanduser('~/knowledge_library/文言文/选篇/正文/')

# Word books to process (exclude readonly)
TARGET_BOOKS = [
    'wb_zhongkao_shixu.json',
    'wb_gaokao_shixu.json',
    'wb_zhongkao_gujinyi.json',
    'wb_zhongkao_tongjia.json',
    'wb_zhongkao_cileihuoyong.json',
    'wb_gaokao_tongjia.json',
]

# Common distractor definitions per wordType, used as fallback
FALLBACK_DISTRACTORS = {
    'shi': ['安定，安稳', '离开，离去', '穷尽，竭尽', '确实，的确', '派遣，出使'],
    'xu': ['介词：用、拿', '介词：凭借、靠', '连词：来、用来', '介词：因为、由于', '介词：在'],
    'tongjia': ['通假字，同某字', '古今异义，不同于今义', '词类活用，名词作动词'],
    'gujinyi': ['古义：……', '今义：……', '词义扩大', '词义转移'],
    'huoyong': ['名词作动词', '形容词作名词', '使动用法', '意动用法'],
    'shi_xu': ['用、拿', '凭借、靠', '来、用来', '因为、由于', '认为、以为'],
}


# ── helpers ──────────────────────────────────────────────────────────

def strip_type_prefix(definition):
    """Remove word-type prefix like 介词：/ 连词：/ 动词： etc."""
    prefixes = ['介词：', '连词：', '动词：', '副词：', '名词：',
                '代词：', '形容词：', '助词：', '量词：', '介词/连词：']
    s = definition.strip()
    for p in prefixes:
        if s.startswith(p):
            return s[len(p):]
    return s


def ensure_no_ascii_double_quotes(s):
    """Replace ASCII double-quotes inside string values with Chinese quotes."""
    if not s:
        return s
    # Replace inner ASCII " with Chinese quotation marks
    # Pattern: look for " in non-boundary positions
    result = []
    for ch in s:
        if ch == '"':
            # Use heuristic: even-indexed replacements get left quote, odd get right
            result.append('“')  # "
            # Actually, safer to just use “ always and let user fix
        else:
            result.append(ch)
    return ''.join(result)


def safe_str(s):
    """Return string safe for JSON: replace ASCII double-quotes."""
    if not s:
        return ''
    return s.replace('"', '“').replace('"', '”')


def normalize_defn(d):
    """Normalize definition for comparison."""
    return re.sub(r'[：:，,、。（(）)\s（）]', '', d)


# ── load articles ────────────────────────────────────────────────────

def load_article_kw_map():
    """Build kid -> keyword info from all articles."""
    kw_map = {}
    files = sorted(glob.glob(ARTICLES_DIR + 'articles_*.json'))
    # Exclude backup files
    files = [f for f in files if not f.endswith('.bak')]

    for fpath in files:
        with open(fpath) as f:
            arr = json.load(f)
        if not isinstance(arr, list):
            continue
        for art in arr:
            title = art.get('title', '')
            art_id = art.get('id', '')
            for sent in art.get('sentences', []):
                sent_text = sent.get('text', '')
                sent_trans = sent.get('translation', '')
                for kw in sent.get('keyWords', []):
                    kid = kw.get('kid', '')
                    if kid:
                        kw_map[kid] = {
                            'word': kw.get('word', ''),
                            'definition': kw.get('definition', ''),
                            'sentence': safe_str(sent_text),
                            'translation': safe_str(sent_trans),
                            'article_title': title,
                            'article_id': art_id,
                        }
    print(f'  Loaded {len(kw_map)} keywords from {len(files)} article files')
    return kw_map


# ── find global max quizItem ID ──────────────────────────────────────

def find_global_max_id():
    """Scan all word books to find global max quizItem ID number."""
    max_num = 0
    for fname in os.listdir(WB_DIR):
        if not fname.startswith('wb_') or not fname.endswith('.json'):
            continue
        if fname.endswith('.bak'):
            continue
        fpath = os.path.join(WB_DIR, fname)
        with open(fpath) as f:
            wb = json.load(f)
        for entry in wb.get('wordEntries', []):
            for qi in entry.get('quizItems', []):
                qid = qi.get('id', '')
                if qid.startswith('s_c_'):
                    try:
                        num = int(qid.replace('s_c_', ''))
                        if num > max_num:
                            max_num = num
                    except ValueError:
                        pass
    return max_num


# ── generate distractors ─────────────────────────────────────────────

def pick_distractors(own_definition, existing_quizitems, newly_generated_defs,
                     word_type):
    """
    Pick 3 distractors from:
    1. Other quizItems of the same character (existing + newly generated)
    2. Fallback distractors for the wordType
    """
    # Collect candidate definitions, excluding own
    candidates = []
    own_norm = normalize_defn(own_definition)

    # From existing quizItems
    for qi in existing_quizitems:
        d = qi.get('definition', '')
        d_norm = normalize_defn(d)
        if d_norm and d_norm != own_norm:
            stripped = strip_type_prefix(d)
            if stripped and stripped not in candidates:
                candidates.append(stripped)

    # From newly generated (previously processed in this batch)
    for d in newly_generated_defs:
        d_norm = normalize_defn(d)
        if d_norm and d_norm != own_norm:
            stripped = strip_type_prefix(d)
            if stripped and stripped not in candidates:
                candidates.append(stripped)

    # If we have enough, return 3
    if len(candidates) >= 3:
        return candidates[:3]

    # Supplement with fallbacks for this wordType
    fallback_key = word_type if word_type in FALLBACK_DISTRACTORS else 'shi_xu'
    fallbacks = FALLBACK_DISTRACTORS[fallback_key]
    for fb in fallbacks:
        stripped = strip_type_prefix(fb)
        if stripped not in candidates and normalize_defn(stripped) != own_norm:
            candidates.append(stripped)
        if len(candidates) >= 3:
            break

    # Ensure exactly 3
    while len(candidates) < 3:
        candidates.append('其他释义')

    return candidates[:3]


# ── process a single word book ───────────────────────────────────────

def process_wordbook(fname, kw_map, start_id):
    """Process one word book file. Returns (added_count, next_id)."""
    fpath = os.path.join(WB_DIR, fname)
    with open(fpath) as f:
        wb = json.load(f)

    name = wb.get('name', fname)
    study_mode = wb.get('studyMode', 'standard')
    if study_mode == 'readonly':
        print(f'\n  {name}: readonly, skipping')
        return 0, start_id

    next_id = start_id
    total_added = 0
    entries_modified = 0

    for entry in wb.get('wordEntries', []):
        char = entry['character']
        word_type = entry.get('wordType', 'shi')
        existing_quizitems = entry.get('quizItems', [])

        # Build set of existing kidRefs
        existing_kids = {qi.get('kidRef') for qi in existing_quizitems}

        # Find orphan refs (deduplicated by kid)
        seen_orphans = set()
        orphan_refs = []
        for ref in entry.get('keyWordRefs', []):
            kid = ref.get('kid')
            if kid and kid not in existing_kids and kid not in seen_orphans:
                orphan_refs.append(ref)
                seen_orphans.add(kid)

        if not orphan_refs:
            continue

        # Track newly generated definitions for this character (for distractor pool)
        newly_generated_defs = []

        for ref in orphan_refs:
            kid = ref.get('kid')
            info = kw_map.get(kid)

            if not info:
                print(f'    WARNING: kid {kid} not found in articles, skipping')
                continue

            definition = info['definition']
            sentence = info['sentence']
            translation = info['translation']
            article_title = info['article_title']

            # Generate distractors
            distractors = pick_distractors(
                definition, existing_quizitems, newly_generated_defs, word_type
            )

            # Build quizItem
            quiz_item = {
                'id': f's_c_{next_id:04d}',
                'kidRef': kid,
                'targetWord': char,
                'difficulty': 'medium',
                'definition': definition,
                'distractors': distractors,
                'sentenceText': sentence,
                'sentenceTranslation': translation,
                'sentenceSource': f'《{article_title}》',
            }

            existing_quizitems.append(quiz_item)
            newly_generated_defs.append(definition)

            next_id += 1
            total_added += 1

        entries_modified += 1

    # Write back
    with open(fpath, 'w') as f:
        json.dump(wb, f, ensure_ascii=False, indent=2)

    print(f'  {name}: added {total_added} quizItems across {entries_modified} characters')
    return total_added, next_id


# ── main ─────────────────────────────────────────────────────────────

def main():
    print('=== Fill Missing QuizItems ===\n')

    # 1. Load article keyword map
    print('[1/4] Loading article keywords...')
    kw_map = load_article_kw_map()

    # 2. Find global max quizItem ID
    print('\n[2/4] Finding global max quizItem ID...')
    max_id = find_global_max_id()
    print(f'  Global max: s_c_{max_id:04d}')
    next_id = max_id + 1

    # 3. Process each word book
    print('\n[3/4] Processing word books...')
    grand_total = 0
    for fname in TARGET_BOOKS:
        fpath = os.path.join(WB_DIR, fname)
        if not os.path.exists(fpath):
            print(f'  {fname}: not found, skipping')
            continue
        added, next_id = process_wordbook(fname, kw_map, next_id)
        grand_total += added

    # 4. Validate
    print(f'\n[4/4] Validating JSON syntax...')
    all_ok = True
    for fname in TARGET_BOOKS:
        fpath = os.path.join(WB_DIR, fname)
        if not os.path.exists(fpath):
            continue
        try:
            with open(fpath) as f:
                json.load(f)
            print(f'  ✅ {fname}')
        except json.JSONDecodeError as e:
            print(f'  ❌ {fname}: {e}')
            all_ok = False

    print(f'\n=== Done: {grand_total} quizItems added ===')

    if not all_ok:
        print('⚠️  Some files have JSON errors! Check above.')
        sys.exit(1)

    # 5. Show some stats
    print('\n=== Summary ===')
    for fname in TARGET_BOOKS:
        fpath = os.path.join(WB_DIR, fname)
        if not os.path.exists(fpath):
            continue
        with open(fpath) as f:
            wb = json.load(f)
        refs = sum(len(e.get('keyWordRefs', [])) for e in wb.get('wordEntries', []))
        quiz = sum(len(e.get('quizItems', [])) for e in wb.get('wordEntries', []))
        orphans = 0
        for e in wb.get('wordEntries', []):
            kids = {qi.get('kidRef') for qi in e.get('quizItems', [])}
            orphans += sum(1 for r in e.get('keyWordRefs', []) if r.get('kid') not in kids)
        print(f'  {wb.get("name", fname)}: {refs} refs → {quiz} quizItems, {orphans} orphans remain')


if __name__ == '__main__':
    main()

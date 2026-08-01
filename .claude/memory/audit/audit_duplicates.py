#!/usr/bin/env python3
"""
词书审核 - 选项重复自动检测
用法: python3 .claude/memory/audit/audit_duplicates.py <entry_id>
输出: 疑似重复标记，供人眼复核
"""
import sys
import re
import subprocess

MYSQL_CMD = [
    'docker', 'exec', 'mysql-8.4',
    'mysql', '-u', 'root', '-p123456',
    '--default-character-set=utf8mb4',
    'classical_chinese', '-N'
]


def run_sql(sql: str) -> list[str]:
    """Run SQL and return output lines (filtered)."""
    result = subprocess.run(
        MYSQL_CMD + ['-e', sql],
        capture_output=True, text=True, timeout=30
    )
    lines = result.stdout.strip().split('\n')
    return [l for l in lines if l and not l.startswith('mysql:')]


def extract_core(text: str) -> str:
    """
    Extract core meaning by removing parenthetical annotations.
    "完、没有了（杨花已全部飘落）" -> "完、没有了"
    "完，没有了" -> "完，没有了"
    """
    # Remove Chinese and English parenthetical content
    text = re.sub(r'[（(][^）)]*[）)]', '', text)
    # Normalize punctuation
    text = text.replace('、', '，').strip().rstrip('，。.')
    return text


def check_quiz_item(qi_id: str, definition: str, distractors_raw: str):
    """
    Check one quiz item for:
    - ⑤: Any distractor == definition (exact)
    - ④a: Two distractors are identical strings
    - ④b: One distractor's core text is contained in another's
    Returns list of (level, check_point, description) tuples.
    """
    issues = []
    distractor_list = [d.strip() for d in distractors_raw.split('||') if d.strip()]

    # Normalize definition
    def_core = extract_core(definition)

    for i, d in enumerate(distractor_list):
        d_core = extract_core(d)

        # Check ⑤: distractor == definition
        if d == definition:
            issues.append(('🔴', '⑤', f'干扰项#{i+1} "{d}" 等于正确答案'))
        elif d_core == def_core:
            issues.append(('🟡', '⑤', f'干扰项#{i+1} "{d}" 核心义项等于正确答案 "{definition}"'))

        # Check ④a: identical strings to another distractor
        for j in range(i + 1, len(distractor_list)):
            d2 = distractor_list[j]
            if d == d2:
                already_reported = any(f'#{j+1}' in iss[2] and '完全重复' in iss[2] for iss in issues)
                if not already_reported:
                    issues.append(('🔴', '④', f'选项#{i+1}与#{j+1}完全重复: "{d}"'))

    # Check ④b: inclusive / near-duplicate
    for i, d in enumerate(distractor_list):
        d_core = extract_core(d)
        for j, d2 in enumerate(distractor_list):
            if i == j:
                continue
            d2_core = extract_core(d2)
            # If d_core is completely contained in d2_core and they differ
            if d_core != d2_core and d_core and d2_core:
                if d_core in d2_core:
                    issues.append(('🟡', '④', f'选项#{i+1} "{d_core}" 被包含于#{j+1} "{d2_core}"'))

    return issues


def main():
    entry_id = sys.argv[1]

    # Get quiz items for this entry
    sql = f"""
    SELECT qi.id, qi.definition,
           COALESCE(GROUP_CONCAT(qd.text ORDER BY qd.sort_order SEPARATOR '||'), '')
    FROM quiz_item qi
    LEFT JOIN quiz_distractor qd ON qd.quiz_item_id = qi.id
    WHERE qi.entry_id = '{entry_id}'
    GROUP BY qi.id
    ORDER BY qi.sort_order;
    """
    rows = run_sql(sql)

    print(f"\n>>> 5. 选项重复自动检测 ({entry_id})")
    print("=" * 60)

    total_issues = 0
    for row in rows:
        # Tab-separated: id \t definition \t distractors
        parts = row.split('\t')
        if len(parts) < 3:
            continue
        qi_id, definition = parts[0], parts[1]
        distractors = parts[2] if len(parts) > 2 else ''

        issues = check_quiz_item(qi_id, definition, distractors)
        if issues:
            total_issues += len(issues)
            print(f"\n  {qi_id} (def={definition})")
            for level, cp, desc in issues:
                print(f"    {level} 检查点{cp}: {desc}")
        else:
            print(f"  {qi_id}: ✅ 无重复问题")

    if total_issues == 0:
        print(f"\n  全部 {len(rows)} 题无选项重复问题。")
    else:
        print(f"\n  ⚠ 共 {total_issues} 个疑似问题，需人眼复核。")

    print("=" * 60)


if __name__ == '__main__':
    main()

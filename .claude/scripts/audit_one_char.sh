#!/bin/bash
# ============================================================
# 词书地毯式审核 - 单字数据提取脚本
# 用法: bash .claude/scripts/audit_one_char.sh <entry_id>
# 示例: bash .claude/scripts/audit_one_char.sh wb_c_001
#
# 依赖: Docker MySQL 容器 mysql-8.4 必须在运行
# 输出: 该字全部 quizItem + kidRef 交叉验证，供 9 点检查使用
# ============================================================
set -euo pipefail

ENTRY_ID="${1:?用法: bash audit_one_char.sh <entry_id>}"
MYSQL='docker exec mysql-8.4 mysql -u root -p123456 --default-character-set=utf8mb4 classical_chinese -N'

echo "============================================"
echo "  词书逐字审核：$ENTRY_ID"
echo "============================================"

# --- 1. Entry 基本信息 ---
echo ""
echo ">>> 1. ENTRY 基本信息"
$MYSQL -e "
SELECT CONCAT(
  'character=', wbe.\`character\`,
  ' | pinyin=', wbe.pinyin,
  ' | type=', wbe.word_type,
  ' | book=', wb.name,
  ' | sort=', wbe.sort_order
)
FROM word_book_entry wbe
JOIN word_book wb ON wb.id = wbe.word_book_id
WHERE wbe.id = '$ENTRY_ID';
"

# --- 2. Quiz Items + 干扰项 ---
echo ""
echo ">>> 2. QUIZ ITEMS（含干扰项）"
$MYSQL -e "
SELECT CONCAT(
  'id=', qi.id,
  ' | target=', qi.target_word,
  ' | def=', qi.definition,
  ' | sentence=', qi.sentence_text,
  ' | trans=', qi.sentence_translation,
  ' | source=', qi.sentence_source,
  ' | kidRef=', qi.kid_ref,
  ' | distractors=[', COALESCE(GROUP_CONCAT(qd.text ORDER BY qd.sort_order SEPARATOR ' | '), ''), ']'
)
FROM quiz_item qi
LEFT JOIN quiz_distractor qd ON qd.quiz_item_id = qi.id
WHERE qi.entry_id = '$ENTRY_ID'
GROUP BY qi.id
ORDER BY qi.sort_order;
"

# --- 3. kidRef 交叉验证 ---
echo ""
echo ">>> 3. kidRef 交叉验证"
KIDS=$($MYSQL -e "
SELECT DISTINCT qi.kid_ref
FROM quiz_item qi
WHERE qi.entry_id = '$ENTRY_ID' AND qi.kid_ref IS NOT NULL AND qi.kid_ref != '';
")

if [ -z "$KIDS" ]; then
  echo "（该字无 kidRef）"
else
  KID_LIST=$(echo "$KIDS" | sed "s/^/'/" | sed "s/\$/'/" | paste -sd, -)
  $MYSQL -e "
  SELECT CONCAT(
    'kid=', ak.kid,
    ' | article=', a.title,
    ' (', a.id, ')',
    ' | kwDef=', ak.definition,
    ' | word=', ak.word_text,
    ' | sentence=', SUBSTRING(asent.text, 1, 120)
  )
  FROM article_keyword ak
  JOIN article_sentence asent ON asent.id = ak.article_sentence_id
  JOIN article a ON a.id = asent.article_id
  WHERE ak.kid IN ($KID_LIST);
  "
fi

# --- 4. 同字在相同文章中的其他 keyword（辅助核验句子出处） ---
echo ""
echo ">>> 4. 同字同文章的其他 keyword（辅助核验）"
CHAR=$($MYSQL -e "SELECT \`character\` FROM word_book_entry WHERE id = '$ENTRY_ID';")
$MYSQL -e "
SELECT CONCAT(
  'kid=', ak.kid,
  ' | article=', a.title,
  ' | kwDef=', ak.definition,
  ' | sentence=', SUBSTRING(asent.text, 1, 120)
)
FROM article_keyword ak
JOIN article_sentence asent ON asent.id = ak.article_sentence_id
JOIN article a ON a.id = asent.article_id
WHERE ak.word_text = '$CHAR'
ORDER BY a.title, ak.kid;
" 2>/dev/null || echo "（无法查询同字 keywords）"

# --- 5. 选项重复自动检测 ---
python3 "$(dirname "$0")/audit_duplicates.py" "$ENTRY_ID"

echo ""
echo "=== 数据提取完成 ==="

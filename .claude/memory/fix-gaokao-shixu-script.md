---
name: fix-gaokao-shixu-script
description: 高考实词虚词一本通批量修复脚本，可按模式复用。触发词：批量修复词书、fix wordbook batch
metadata:
  type: project
---

# 词书批量修复脚本

脚本位置：`.claude/scripts/fix_gaokao_shixu.py`

## 功能

一键修复词书 quizItem 的 4 类问题：
- **#3** definition 错误 → 修改 quizItem.definition，同步修改 articles JSON 中的 keyWord.definition
- **#4** 选项重复 → 替换重复的 distractor 为其他义项
- **#5** 干扰项含正确答案 → 替换含答案的 distractor
- **#8** kidRef 指向错误 → 修正 kidRef（有正确kid→指向，无→null）

## 用法

```bash
# dry-run（预览变更，不写入）
python3 .claude/scripts/fix_gaokao_shixu.py

# 实际修改
python3 .claude/scripts/fix_gaokao_shixu.py --apply
```

## 脚本结构

可复用模式：在脚本顶部修改以下数据列表即可适配其他词书：

| 数据变量 | 格式 | 说明 |
|---------|------|------|
| `FIXES_3` | `(quiz_id, new_definition)` | #3 释义修正 |
| `ARTICLES_KEYWORD_UPDATES` | `(quiz_id, article_id, sent_idx, word, None, new_def)` | 同步改 articles |
| `FIXES_4` | `(quiz_id, old_dist_text, new_dist_text)` | #4 干扰项替换 |
| `FIXES_5` | `(quiz_id, old_dist_text, new_dist_text)` | #5 干扰项含答案 |
| `FIXES_8` | `(quiz_id, new_kidRef_or_None)` | #8 kidRef 修正 |

## 核心函数

- `find_qi(entries, qi_id)` — 在词书 entry.quizItems 中按 ID 查找
- `find_keyword_in_articles(articles_data, article_id, word, sent_idx)` — 在 articles 中查找 keyWord
- `generate_kid(article_id, sent_idx, word, seq)` — 生成 kid（`kw_art_xxx_sXX_word_N`）
- `find_next_seq(sentence, word)` — 跳过已有 kid 序列号，生成下一个可用 id

## 修改文件列表

| 文件 | 类型 | 说明 |
|------|------|------|
| `~/knowledge_library/文言文/词书/wb_*.json` | 词书 JSON | quizItem.definition / distractors / kidRef |
| `~/knowledge_library/文言文/选篇/正文/articles_*.json` | 选篇 JSON | keyWord.definition 修改 / 新增 keyWord |

脚本自动处理 keyWordRefs 数组同步（新增 keyWord 后的 kid 引用回填到词书 entry 中）。

## 复用步骤

1. 复制脚本，修改 `WB_PATH` 和 `art_paths()`
2. 按审核结果填充 FIXES_3/4/5/8 数据列表
3. `python3 fix_xxx.py` → dry-run 确认均匹配
4. `python3 fix_xxx.py --apply` → 写入
5. 校验：`python3 -c "import json; json.load(open('file'))"`
6. 通知用户导入：先 articles → 后词书

**Why:** 108 处修复手工逐条改容易出错且遗漏，脚本化一次编写、dry-run 验证、一键写入，可复用模板后续只需要填数据即可。

**How to apply:** 后续词书审核发现问题后，复制脚本修改数据列表，dry-run 验证后 --apply。修改前备务必备份 JSON 文件。

[[word-book-audit-fix-list]]
[[fix-guide]]
[[word-book-audit]]

---
name: data-scripts
description: articles.json/词书 JSON 的规范化与维护脚本索引
metadata:
  type: project
---

## 数据维护脚本

4 个 Python 脚本用于维护 `articles.json` 和词书 JSON 的数据质量。

| 脚本 | 用途 | 用法 |
|------|------|------|
| `scripts/normalize_articles.py` | articles.json 规范化：补 wordType（文本规律→词书匹配→默认实词）、补 wordBookId（kid 链路）、删脏数据、补壳文章元数据 | `python3 normalize_articles.py --apply` |
| `scripts/add_missing_keywords.py` | 为已有句子新增缺失 keyWord（硬编码映射，用在句子已在 articles.json 但该词未标注的场景） | `python3 add_missing_keywords.py --apply` |
| `scripts/backfill_sentences.py` | 从词书 quizItem.sentenceText 回填缺失句子到 articles.json（新句子追加到文章末尾） | `python3 backfill_sentences.py --apply` |
| `scripts/fill_kidref.py` | 词书 quizItem.kidRef 填充：targetWord + definition 语义匹配 article_keyword → sentenceText 消歧 | `python3 fill_kidref.py --apply` |

## 执行顺序

完整数据链路：

```
normalize_articles.py   → articles.json 基础规范（wordType/wordBookId）
    ↓
add_missing_keywords.py → 句子已有但缺 keyWord → 新增
    ↓
backfill_sentences.py   → 句子完全缺失 → 回填
    ↓
fill_kidref.py          → 词书 quizItem.kidRef 填补
    ↓
导入 articles.json (curl POST /api/admin/import/articles)
    ↓
导入词书 JSON (curl POST /api/admin/import/wordbooks)
```

## 注意事项

- 所有脚本默认 dry-run，必须加 `--apply` 才写入
- articles.json 写入前会自动备份（`.bak`），完成后删除
- `article_keyword.kid` 全局唯一，`fill_kidref.py` 最后一步自动检测重复
- 导入 articles.json 会 TRUNCATE 三张表，务必在词书导入前执行

[[study-section]]
[[articles-section]]

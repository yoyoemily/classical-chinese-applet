---
name: grade11b-poetry-data
description: 高二下 4 首诗词补齐完成记录——ID分配、关键词校验、经验教训
metadata:
  type: project
---

## 高二下（grade11b）诗词补齐 — 完成记录

**完成日期**：2026-07-21
**ID 范围**：art_180 ~ art_183
**来源**：部编版选择性必修中册「古诗词诵读」板块

### 新增诗词

| ID | 篇名 | 作者 | 朝代 | 句数 | KW | 注释 |
|----|------|------|------|------|----|------|
| art_180 | 燕歌行 | 高适 | 唐代 | 7 | 17 | 29 |
| art_181 | 李凭箜篌引 | 李贺 | 唐代 | 4 | 1 | 19 |
| art_182 | 锦瑟 | 李商隐 | 唐代 | 4 | 1 | 9 |
| art_183 | 书愤 | 陆游 | 南宋 | 4 | 3 | 12 |
| **合计** | | | | **19句** | **22条** | **69条** |

### keyWord 词书校验结果

**22 条 keyWord，100% 命中 9 本词书**。经过严格逐字交叉验证，每一条的 `wordBookId` 与词书 `wordEntries[].character` 精确匹配，义项匹配句中用法。

### 经验教训

1. **词书校验在前，标注在后**：标注时逐字查词书，而不是凭感觉标。本次吸取高一下补齐 35/36 条误标的教训，标注前先查词书字符集，确认存在再标。
2. **不在词书的字绝不标 keyWord**：李凭箜篌引、锦瑟中「张（弦）」「昆山玉碎」「吴丝蜀桐」「女娲补天」「鲛人泣珠」「蓝田日暖」「此情可待」「托」「泪」「空」「气」等大量文化典故/地名/器物/名句，因不在词书中，全部归入 glossary 典故注释，而非错标为 keyWord。
3. **分句数对齐**：`split(/[。！？；]/)` 检查保证了原文与译文的标点分句数严格对齐，避免了子句释义错位。
4. **`--articles-only` 与 `--glossaries-only` 分离执行**：第一次 `--articles-only` 写入正文后，kid 已存在于知识库，导致第二次 `--glossaries-only` 时 kid 去重检查失败。实际工作中直接 `--apply` 一步到位即可。

### 关联文件

| 文件 | 路径 |
|------|------|
| 诗词数据 | `scripts/data/poems_grade11b.json` |
| 注释数据 | `scripts/data/glossaries_grade11b.json` |
| 导入脚本 | `scripts/generate_grade11b_poems.py` |
| 正文（知识库） | `~/Documents/knowledge_library/文言文/选篇/正文/articles_grade11b.json` |
| 注释（知识库） | `~/Documents/knowledge_library/文言文/选篇/典故注释/art_180~183.json` |

### 数据库导入

2026-07-21 已成功导入：
- 选篇正文：296 篇（含 art_180~183），`{"code":0,"message":"ok","data":{"count":296}}`
- 典故注释：art_180（29条）、art_181（19条）、art_182（9条）、art_183（12条），全部成功

[[poetry-backfill-master]]
[[article-adjustment-workflow]]

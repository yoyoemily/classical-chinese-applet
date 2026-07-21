---
name: grade12a-poetry-data
description: 高三 4 首诗词补齐完成记录——数据文件/导入脚本/校验结果
metadata:
  type: project
---

## 高三（grade12a）诗词补齐完成

2026-07-21，补齐选择性必修下册「古诗词诵读」板块 4 首诗词。

### 补齐清单

| ID | 篇名 | 作者 | 朝代 | 课内/诵读 | 句数 | KW | 注释 |
|----|------|------|------|-----------|------|----|------|
| art_184 | 拟行路难（其四） | 鲍照 | 南朝·宋 | 古诗词诵读 | 4 | 5 | 7 |
| art_185 | 客至 | 杜甫 | 唐代 | 古诗词诵读 | 4 | 9 | 9 |
| art_186 | 登快阁 | 黄庭坚 | 北宋 | 古诗词诵读 | 4 | 6 | 10 |
| art_187 | 临安春雨初霁 | 陆游 | 南宋 | 古诗词诵读 | 4 | 5 | 9 |
| **合计** | | | | | **16句** | **25条** | **35条** |

### 校验结果

- keyWords 25 条全部命中 8 本词书，wordBookId 100% 非空
- grade12a 整体命中率 82/89 (92%)，余下 7 条缺失来自已有文章（art_079~081 的旧标注问题）
- 导入：articles (300 篇) + glossary 4 篇 → 全部成功 (`code: 0`)

### 数据文件

- `scripts/data/poems_grade12a.json` — 切句 + 逐句译文 + keyWords
- `scripts/data/glossaries_grade12a.json` — 典故注释 4 篇 37 条
- `scripts/generate_grade12a_poems.py` — 导入脚本（从 grade11b 复制，仅改 grade 名）

### 年级全部完成

至此部编版初高中全部诗词已补齐：七上~九下（初中）+ 高一上~高三（高中）= 12 个年级，全部 ✅。

[[poetry-backfill-master]]
[[article-adjustment-workflow]]

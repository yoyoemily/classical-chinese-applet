# 选篇 keyWords 词书交叉核对

## 背景

选篇录入时没有严格核对词书，遗留系统性质量问题：
- **约 40%（816/2,030）的 keyWords 缺少 wordBookId**
- **已标注的 wordBookId 可能指错词书或义项不匹配**
- **高一下补齐时发现 35/36 条误标**（地名、典故、文化隐喻被错标为 keyWord，应为 glossary）

根因：标注时没有严格核对词书。keyWord 的唯一判定标准是该字/词是否在 8 本打卡型词书的 `wordEntries[].character` 中存在，且义项匹配句中的实际用法。不在词书 = 不是 keyWord。

## 核对范围

**只核对 8 本打卡型词书**，不包括 `wb_function_words.json`（文言文虚词深度解析）。

原因：
- 虚词解析是阅读型词书，无 quizItems（0 题），不参与打卡学习回路
- 虚词解析的 54 个 character 中有 38 个已在打卡型词书中，剩余 16 个（凡、勿、哉、夫、将、尝、岂、弗、惟、敢、果、犹、独、矣、耳、遂）非考点维度
- keyWords 服务于选篇阅读（高亮+弹窗释义），quizItems 服务于打卡学习（答题+纠错），两者解耦
- 虚词解析保持独立浏览即可

## 壳文章定位

壳文章（121 篇，339 条 keyWords）不是给用户读的——它们是词书 keyWordRefs 的句子锚点容器。审核时：
- 壳文章的 keyWords 如果不在任何打卡型词书中 → **直接删除**（没有灰度，没有"有典故价值"的说法）
- 壳文章的唯一存在意义是承接词书的 kidRef 引用，不在词书 = 无用数据

## 范围

**只做 keyWord ↔ 8 本打卡型词书交叉核对。** 不在词书中的 keyWord → 删除。典故注释（glossary）迁移后续单独处理。`wb_function_words.json`（文言文虚词深度解析）不参与核对——它是阅读型词书，无 quizItems，独立浏览即可。

## 数据规模

| 维度 | 数值 |
|------|------|
| 总文章 | 300 篇（179 教材 + 121 壳） |
| 总句子 | 1,302 句 |
| 总 keyWords | 2,030 条（整改后 1,634 条，删除 396 条不在词书的） |
| 有 wordBookId | 1,214 条（60%）→ 全部覆盖 |
| 无 wordBookId | 816 条（40%）→ 已全部补充或删除 |
| 词书主词条 | 409 个唯一 character（8 本打卡型词书） |
| 词书词条 | 547 个 wordEntry |
| 词书 kidRef | 1,126 条 |
| 词书 quizItems | 1,365 题 |

## 整改结果

**全部 12 批已完成。** 1,634 条 keyWords 100% 通过审核：
- ✅ 100% 词书覆盖率（每条 keyWord 的 character 均在 8 本打卡型词书中）
- ✅ 100% wordBookId 填写率（1,634/1,634）
- ✅ 100% wordType 与词书一致
- ✅ 0 条指向虚词解析（wb_function_words 全部重定向到打卡型词书）

| 批次 | 文件 | 原 keyWords | 最终 | 删除 | 补充 wbId | 修正 wbId | 修正 WT |
|------|------|------------|------|------|-----------|------------|----------|
| 1 | articles_shell.json | 339 | 339 | 0 | 14 | 0 | 2 |
| 2 | articles_grade11b.json | 61 | 53 | 8 | 11 | 2 | 5 |
| 3 | articles_grade12a.json | 89 | 82 | 7 | 17 | 0 | 4 |
| 4 | articles_grade11a.json | 103 | 92 | 11 | 16 | 14 | 5 |
| 5-12 | articles_grade{7-10}{a,b}.json | ~1,438 | ~1,068 | ~370 | ~440 | ~15 | ~100 |
| **合计** | | **2,030** | **1,634** | **396** | **~440** | **~30** | **~116** |

## 12 批次（按文件，先小后大、先易后难）

| # | 文件 | keyWords | 状态 |
|---|------|----------|------|
| 1 | articles_shell.json | 339 | ✅ 完成 |
| 2 | articles_grade11b.json | 53 | ✅ 完成 |
| 3 | articles_grade12a.json | 82 | ✅ 完成 |
| 4 | articles_grade11a.json | 92 | ✅ 完成 |
| 5 | articles_grade7a.json | — | ✅ 完成 |
| 6 | articles_grade9a.json | — | ✅ 完成 |
| 7 | articles_grade10a.json | — | ✅ 完成 |
| 8 | articles_grade7b.json | — | ✅ 完成 |
| 9 | articles_grade8a.json | — | ✅ 完成 |
| 10 | articles_grade8b.json | — | ✅ 完成 |
| 11 | articles_grade10b.json | — | ✅ 完成 |
| 12 | articles_grade9b.json | — | ✅ 完成 |

## 每批工作流

```
Step 1. 运行审核脚本，生成报告
  python3 scripts/audit_keywords.py --grade grade11b

Step 2. 人工逐条审查报告/交叉比对 kidRef
  读报告 + 词书条目

Step 3. 应用修复
  批量修复 + python3 scripts/data/audit_fix_{grade}.py --apply

Step 4. 验证
  python3 scripts/validate_keywords.py --grade grade11b
```

## 审核检查逻辑

每条 keyWord 的分类：

1. **DELETE** — word 不在任何打卡型词书中 → 删除（396 条）
2. **WRONG_WB** — 有 wbId 但该词书不包含此 word → 修正 wbId（~30 条）
3. **NO_WB** — 无 wbId 但 word 在词书中 → 从候选/kidRef 分配 wbId（~440 条）
4. **WRONG_WT** — wordType 与目标词书不一致 → 修正（~116 条）
5. **OK** — 一切正常

## 关键文件

| 文件 | 角色 |
|------|------|
| `scripts/audit_keywords.py` | 审核脚本（逐条报告，分类标记，可直接运行审核） |
| `scripts/articles_io.py` | I/O 工具（`read_all_articles` / `write_articles_by_grade`） |
| `scripts/validate_keywords.py` | 全局验证（词书覆盖率检查） |
| `scripts/fill_kidref.py` | kidRef 填充（语义匹配） |
| `scripts/data/audit_fix_{grade}.py` | 逐批修复脚本 |
| `~/Documents/knowledge_library/文言文/选篇/正文/articles_*.json` | 12 个数据文件（权威源） |
| `~/Documents/knowledge_library/文言文/词书/wb_*.json` | 8 本打卡型词书（核对标准） |

## 下一步

- 正式环境导入：`./import_articles.sh prd`（拼接本地 JSON → `-d @-` 发送请求体，无需服务器上有知识库）
- 本地已验证导入成功：`POST /api/admin/import/articles` 返回 count=300

## 触发词

"继续核对 keyWords" / "继续 audit keyWords" / "继续选篇字词标注排查" / "继续第 N 批"

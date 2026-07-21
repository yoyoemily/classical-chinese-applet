---
name: keywords-audit-master-plan
description: 选篇 keyWords 词书交叉核对——系统性质量排查，分 12 批逐一核对 2030 条 keyWords 与 9 本词书的对应关系
metadata:
  type: project
---

# 选篇 keyWords 词书交叉核对

## 背景

选篇录入时没有严格核对词书，遗留系统性质量问题：
- **约 40%（816/2,030）的 keyWords 缺少 wordBookId**
- **已标注的 wordBookId 可能指错词书或义项不匹配**
- **高一下补齐时发现 35/36 条误标**（地名、典故、文化隐喻被错标为 keyWord，应为 glossary）

根因：标注时没有严格核对词书。keyWord 的唯一判定标准是该字/词是否在 9 本词书的 `wordEntries[].character` 中存在，且义项匹配句中的实际用法。不在词书 = 不是 keyWord。

## 范围

**只做 keyWord ↔ 词书交叉核对。** 不在词书中的 keyWord → 删除。典故注释（glossary）迁移后续单独处理。

## 数据规模

| 维度 | 数值 |
|------|------|
| 总文章 | 300 篇（179 教材 + 121 壳） |
| 总句子 | 1,302 句 |
| 总 keyWords | 2,030 条 |
| 有 wordBookId | 1,214 条（60%） |
| 无 wordBookId | 816 条（40%） |
| 词书主词条 | 425 个唯一 character |
| 词书词条 | 601 个 wordEntry |
| 词书 kidRef | 984 条 |

## 12 批次（按文件，先小后大、先易后难）

| # | 文件 | keyWords | 完成度 | 说明 |
|---|------|----------|--------|------|
| 1 | articles_shell.json | 339 | 96% | 热身批，仅 14 条缺 wbId |
| 2 | articles_grade11b.json | 61 | 74% | 最小教材文件 |
| 3 | articles_grade12a.json | 89 | 73% | 小文件 |
| 4 | articles_grade11a.json | 103 | 77% | 小文件 |
| 5 | articles_grade7a.json | 133 | 56% | 中等 |
| 6 | articles_grade9a.json | 152 | 47% | 中等 |
| 7 | articles_grade10a.json | 153 | 61% | 中等 |
| 8 | articles_grade7b.json | 160 | 37% | 缺口大 |
| 9 | articles_grade8a.json | 183 | 50% | 缺口大 |
| 10 | articles_grade8b.json | 198 | 34% | 最不完整 |
| 11 | articles_grade10b.json | 212 | 56% | 大文件 |
| 12 | articles_grade9b.json | 247 | 51% | 最大文件 |

## 每批工作流

```
Step 1. 运行审核脚本，生成报告
  python3 scripts/audit_keywords.py --grade grade11b --output reports/

Step 2. 人工逐条审查报告
  读 reports/audit_grade11b.txt
  对每条 keyWord 做决策：确定正确的 wordBookId，或标记删除
  编辑 reports/audit_fix_grade11b.py，取消注释对应的修复指令

Step 3. 应用修复
  python3 scripts/audit_keywords.py --apply reports/audit_fix_grade11b.py

Step 4. 验证 + 导入
  python3 scripts/validate_keywords.py --grade grade11b
  curl -X POST http://localhost:8080/api/admin/import/articles
```

## 审核检查逻辑

每条 keyWord 的分类：

1. **IGNORE** — word 不在任何词书的 425 个主词条中 → 删除
2. **WRONG_WB** — 有 wbId 但该词书不包含此 word → 修正 wbId
3. **MISSING_KIDREF** — kid 未被词书反向引用 → 人工判断
4. **NO_WB** — 无 wbId 但 word 在词书中 → 从候选列表分配 wbId
5. **WRONG_WT** — wordType 与词书不一致 → 修正
6. **OK** — 一切正常

## 关键文件

| 文件 | 角色 |
|------|------|
| `scripts/audit_keywords.py` | **待创建** — 审核脚本 |
| `scripts/articles_io.py` | I/O 工具（复用 `read_all_articles` / `write_articles_by_grade`） |
| `scripts/validate_keywords.py` | 修复后验证 |
| `scripts/fill_kidref.py` | 复用 `norm_def()` / `same_meaning()` |
| `~/Documents/knowledge_library/文言文/选篇/正文/articles_*.json` | 12 个数据文件（权威源） |
| `~/Documents/knowledge_library/文言文/词书/wb_*.json` | 9 本词书（核对标准） |

## 导入机制

后端 `DataImportService.importArticlesFromJson()` 是 **TRUNCATE + INSERT**（全量替换），JSON 修对了导入就对了。

## 计划文件

完整实施计划见 `[[keywords-audit-implementation-plan]]`（即 `/Users/zhutx/.claude/plans/effervescent-skipping-bonbon.md`）。

## 当前进度

- [ ] 第 1 批：articles_shell.json（0/339 审核）
- [ ] 第 2 批：articles_grade11b.json
- [ ] 第 3 批：articles_grade12a.json
- [ ] 第 4 批：articles_grade11a.json
- [ ] 第 5 批：articles_grade7a.json
- [ ] 第 6 批：articles_grade9a.json
- [ ] 第 7 批：articles_grade10a.json
- [ ] 第 8 批：articles_grade7b.json
- [ ] 第 9 批：articles_grade8a.json
- [ ] 第 10 批：articles_grade8b.json
- [ ] 第 11 批：articles_grade10b.json
- [ ] 第 12 批：articles_grade9b.json

**下一步**：创建 `scripts/audit_keywords.py` 审核脚本，然后从第 1 批（shell）开始。

## 触发词

"继续核对 keyWords" / "继续 audit keyWords" / "继续选篇字词标注排查" / "继续第 N 批"

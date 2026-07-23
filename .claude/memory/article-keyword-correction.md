---
name: article-keyword-correction
description: 选篇 keyWord 标注纠错标准流程——取消错误标注、删除 keyWord，含词书引用检查和同步清理。触发词：标注有误、取消标注、删除 keyWord、纠错 keyWord
metadata:
  type: project
---

## 选篇 keyWord 标注纠错标准流程

> 当发现选篇中的 keyWord 标注错误（如误标为通假字、义项不匹配、不在词书中不应标注等），按此流程执行。
>
> **触发词**："标注有误""取消标注""删除 keyWord""纠错 keyWord""这个字不应该标"。

### 核心原则

- kid 是圣杯，不能修改——要么保留，要么整条删除
- 删除前必须检查词书引用，不能只删选篇侧
- 单篇导入安全，不影响其他文章和用户数据

### 第 1 步：定位文章和 keyWord

在知识库中找到对应文章的 JSON 文件：

```
~/knowledge_library/文言文/选篇/正文/articles_*.json
```

找到目标 keyWord 条目，记下其 `kid`（格式 `kw_{articleId}_s{XX}_{word}_{序号}`）。

### 第 2 步：检查词书引用（关键！）

在删除 keyWord 之前，必须检查该 kid 是否被词书引用：

```sql
-- 检查 word_entry_keyword_ref 引用
SELECT * FROM word_entry_keyword_ref WHERE kid = 'kw_xxx';

-- 检查 quiz_item 引用
SELECT * FROM quiz_item WHERE kid_ref = 'kw_xxx';
```

这一步决定后续操作范围：

| 检查结果 | 操作 |
|---------|------|
| **无任何引用** | 直接从 articles JSON 删除该 keyWord → 跳到第 4 步 |
| **有词书引用** | 不能直接删，需要同步清理词书侧引用 → 继续第 3 步 |

### 第 3 步：清理词书侧引用（如有）

1. 在知识库词书 JSON（`~/knowledge_library/文言文/词书/wb_*.json`）中找到引用该 kid 的 `keyWordRefs` 条目，删除
2. 如果该词书条目还有对应的 `quizItems` 引用了这个 `kidRef`，一并删除
3. 重新导入该词书（幂等）：
   ```bash
   curl -X POST http://localhost:8080/api/admin/import/wordbook/{wordbookId} \
     -H "Content-Type: application/json" \
     -d @$HOME/knowledge_library/文言文/词书/{wordbookFile}.json
   ```

> **为什么安全**：`quiz_item` 表存的是独立副本，词书重新导入会重建 quizItem。用户答题历史通过 `quiz_item_id` 关联，旧的 quizItem 被删后历史记录失去关联——但这是标注纠错的必要代价，且范围可控（只影响该词该句）。

### 第 4 步：修改知识库 JSON

在 `articles_*.json` 中删除该 keyWord 条目（整个对象）。

- 如果同一句中还有其他 keyWord，只删这一个，不要动其他的
- kid 永远不修改——要么保留，要么整条删除

### 第 5 步：校验 + 导入

```bash
# 1. JSON 校验
python3 -c "import json; json.load(open('articles_gradeX.json'))"

# 2. 全量导入选篇正文
curl -X POST {BASE_URL}/api/admin/import/articles \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json, glob, os
d = []
for f in sorted(glob.glob(os.path.expanduser('~/knowledge_library/文言文/选篇/正文/articles_*.json'))):
    with open(f) as fp: d.extend(json.load(fp))
print(json.dumps(d, ensure_ascii=False))
")"
```

### 第 6 步：前端验证

1. 打开选篇 → 找到该文章 → 进入通篇阅读模式
2. 确认目标字不再有下划线高亮
3. 如果之前关联了词书，打开该词书详情确认该条目已移除

### 常见案例

| 案例 | 处理方式 |
|------|---------|
| "女"误标为通假字（通"汝"） | 删除 keyWord，清理通假字词书引用 |
| 地名/典故误标为 keyWord | 删除 keyWord，考虑是否移入 glossary |
| 义项不匹配（如"涕"在词书中义为"眼泪"但句中指"鼻涕"） | 删除 keyWord |
| 多字词（"乾坤""星河"）误标 | 删除 keyWord，考虑是否移入 glossary |

[[article-adjustment-workflow]]
[[articles-section]]
[[study-section]]

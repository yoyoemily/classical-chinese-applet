---
name: database-table-relationships
description: 词书侧（word_book/word_book_entry/quiz_item/quiz_distractor）与选篇侧（article/article_sentence/article_keyword）表之间的引用关系速查
metadata:
  type: reference
  node_type: memory
---

## 关系图

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              词书侧（蓝色）                                     │
│                                                                               │
│   word_book (词书)                                                             │
│   ├── id (PK) ◄────────── word_book_id                                        │
│   │                                                                           │
│   └── word_book_entry (字词条目)                                               │
│       ├── id (PK) ◄── entry_id                                                │
│       │                                                                       │
│       ├── quiz_item (考题)                                                     │
│       │   ├── entry_id  ───────► word_book_entry.id                           │
│       │   ├── kid_ref   ───────► article_keyword.kid  ────────────┐           │
│       │   │                                                       │           │
│       │   └── quiz_distractor (干扰项)                              │           │
│       │       └── quiz_item_id ──► quiz_item.id                   │           │
│       │                                                           │           │
└───────┼───────────────────────────────────────────────────────────┼───────────┘
        │                                                           │
        │         ┌─────────────────────────────────────────────────┘
        │         │
┌───────┼─────────┼───────────────────────────────────────────────────────────┐
│       │         选篇侧（绿色）                                                  │
│       │         │                                                            │
│       │    article_keyword (名篇句子内联生词)                                   │
│       │    ├── id (PK)                                                        │
│       │    ├── kid (UNIQUE) ◄──── kid_ref ── (词书→选篇交叉引用)               │
│       │    └── article_sentence_id ───► article_sentence.id                   │
│       │                                       │                               │
│       │                               article_sentence (名篇句子)               │
│       │                               ├── id (PK)                             │
│       │                               └── article_id ──► article.id          │
│       │                                                        │             │
│       │                                                article (名篇)          │
│       │                                                └── id (PK)           │
│       │                                                                      │
└───────┴──────────────────────────────────────────────────────────────────────┘
                                                                               
   ───►  = 引用方向（箭头指向被引用表）                                             
   蓝色  = 词书业务域                                                              
   绿色  = 选篇业务域                                                              
```

## 汇总表

| 引用方 | 引用列 | 被引用表 | 被引用列 | 基数 |
|--------|--------|----------|----------|------|
| `word_book_entry` | `word_book_id` | `word_book` | `id` | N:1 |
| `quiz_item` | `entry_id` | `word_book_entry` | `id` | N:1 |
| `quiz_item` | `kid_ref` | `article_keyword` | `kid` | N:1 |
| `quiz_distractor` | `quiz_item_id` | `quiz_item` | `id` | N:1 |
| `article_sentence` | `article_id` | `article` | `id` | N:1 |
| `article_keyword` | `article_sentence_id` | `article_sentence` | `id` | N:1 |

## 关键点

1. **词书↔选篇的桥梁是 `quiz_item.kid_ref`**：指向 `article_keyword.kid`，在 `ContentService.getWordDetail()` 中通过 kid → article_keyword → article_sentence → article 链式 JOIN 补全句文、译文、篇名。
2. **没有物理外键**：所有引用关系都是逻辑上的，靠值匹配而非数据库约束维护。
3. **`kid` 是全局唯一键**：`article_keyword.kid` 有 UNIQUE 约束，是交叉引用的锚点。[[backend-infrastructure]] 的数据维护脚本中（如 `fill_kidref.py`）依赖此唯一性。
4. **修订后重导原则**：kid 不变就不需要重导词书。修改已有 keyWord 时 kid 不变，词书自动生效；新增 keyWord 才需词书跟进。详见 [[backend-infrastructure]] 导入顺序一节。
5. **`word_entry_keyword_ref` 表已移除**（2026-08-06）：该表在系统内无实际用途——`ContentService.getWordDetail()` 从 quizItem 驱动 keyWordRefs，`WordBookService` 返回的 keyWordRefs 只有 kid 空壳，vocabulary 页已改为用 quizItems[0].definition。

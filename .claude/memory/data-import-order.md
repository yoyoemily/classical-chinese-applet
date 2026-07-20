---
name: data-import-order
description: 数据库冷启动导入顺序及修订后重新导入的依赖关系
metadata:
  type: project
---

## 导入脚本与执行顺序

| 顺序 | 脚本 | 数据源 | 导入内容 | 依赖说明 |
|:--:|------|--------|------|------|
| 0 | `clear_data.sh` | 无 | 清理业务数据（可选全部/用户/词书/选篇/经典 5 种 scope），详见下方 | 无。仅清数据不导入 |
| 1 | `import_all.sh` | `source.json`（classpath） | 导入 8 枚勋章到 `badge` 表 | badge 表会被 0(all) 清空，需要 0→1 配合；user 档不含 badge |
| 2 | `import_articles.sh` | 知识库 `articles.json` | 选篇正文 + keyWord 标注（`article`, `article_sentence`, `article_keyword`） | 无。生成 kid |
| 3 | `import_glossaries.sh` | 知识库 `art_*.json`（77 篇） | 选篇典故注释（`article_glossary`） | 依赖 2 的 `article_sentence` |
| 4 | `import_wordbook.sh --all` | 知识库 `wb_*.json`（9 本） | 词书全量（`word_book`, `word_book_entry`, `word_entry_keyword_ref`, `quiz_item`, `quiz_distractor`, `word_usage`） | 建议在 2 之后，方便即时验证 kid 引用。与 2 无外键约束，可互换 |
| 5 | `import_classic_list.sh` | 知识库 `classics.json` | 经典元数据（`classic`，幂等 upsert） | 必须先于步骤 6 |
| 6 | `import_classic.sh --all` | 知识库 各经典子目录 JSON（11 部） | 经典章节/段落/注释（`classic_chapter`, `classic_paragraph`, `classic_glossary`） | 依赖 5 的经典元数据。5、6 为经典板块专属，与 1-4 独立 |

> **冷启动完整命令序**：`./clear_data.sh all` → `./import_all.sh` → `./import_articles.sh` → `./import_glossaries.sh` → `./import_wordbook.sh --all` → `./import_classic_list.sh` → `./import_classic.sh --all`
>
> **原则**：每个脚本只管自己的事，互不覆盖。词书和经典各自有独立入口，不再经过 `source.json`。选篇板块三步走：正文 → 典故注释 → 词书引用。清空数据与导入数据是两个独立操作。

### `clear_data.sh` 五档清理

`clear_data.sh` 对应后端 `POST /api/admin/clear-data?scope=` 接口。

| scope | 脚本用法 | 涉及表（按外键逆序） | 张数 |
|------|---------|------|:--:|
| `all` | `./clear_data.sh all` | 全部 24 张表（含 `badge` + `user`） | 24 |
| `user` | `./clear_data.sh user` | `user`, `user_word_progress`, `user_answer_history`, `user_checkin`, `user_badge`, `study_mistake_sentence`, `study_mistake`, `daily_task`, `feedback` | 9 |
| `wordbook` | `./clear_data.sh wordbook` | `quiz_distractor`, `quiz_item`, `word_entry_keyword_ref`, `word_usage`, `word_book_entry`, `word_book` | 6 |
| `article` | `./clear_data.sh article` | `article_glossary`, `article_keyword`, `article_sentence`, `article` | 4 |
| `classic` | `./clear_data.sh classic` | `classic_glossary`, `classic_paragraph`, `classic_chapter`, `classic` | 4 |

**交互方式**：
- 不带参数 `./clear_data.sh`：引导模式，显示 1-5 选项，选择后（除 all 外）需输入 `yes` 确认
- 带 scope 参数 `./clear_data.sh user`：直接执行，`all` 跳过确认，其余 scope 需 `yes` 确认

## 修订后重新导入

| 修订内容 | 改哪个文件 | 操作 | 原因 |
|---------|----------|------|------|
| 清空业务数据 | 无 | `./clear_data.sh <scope>` | 按需清理：all/user/wordbook/article/classic |
| 勋章（增删改） | `source.json` | `import_all.sh` | 仅导入勋章定义，不清用户数据 |
| 经典元数据（增删改） | 知识库 `classics.json` | `import_classic_list.sh` | 仅影响 classic 表 |
| 选篇正文 + keyWord（新增/修改） | 知识库 `articles.json` | `import_articles.sh`；若新增 kid → 还需 `import_wordbook.sh --all` | 修改已有 keyWord 时 kid 不变，词书自动生效；新增 keyWord 才需词书跟进 |
| 词书任何变更 | 知识库 `wb_*.json` | `import_wordbook.sh`（该本词书） | 不影响其他词书 |
| 典故注释（增删改） | 知识库 `art_*.json` | `import_glossaries.sh`（该篇） | 独立表 |
| 经典内容（增删改） | 知识库 经典子目录 JSON | `import_classic.sh`（该部） | 独立表 |

> **核心原则**：kid 不变就不需要重导词书。

## 线上部署后的导入

线上服务器没有知识库本地文件，**一律使用 `-d @本地路径` 方式**（curl 读取本地文件作为请求体发送），无需上传文件到服务器。

```bash
BASE="https://wyq.yinqueai.com"

# 选篇正文（含 keyWords）——全量导入
curl -s -X POST $BASE/api/admin/import/articles \
    -H "Content-Type: application/json" \
    -d @$HOME/Documents/knowledge_library/文言文/选篇/正文/articles.json

# 典故注释 ——单篇导入
curl -s -X POST $BASE/api/admin/import/glossary/art_035 \
    -H "Content-Type: application/json" \
    -d @$HOME/Documents/knowledge_library/文言文/选篇/典故注释/art_035.json

# 词书 ——单本导入
curl -s -X POST $BASE/api/admin/import/wordbook \
    -H "Content-Type: application/json" \
    -d @$HOME/Documents/knowledge_library/文言文/词书/wb_zhongkao_shixu.json
```

> 以上接口均为 `@RequestBody` 模式（`importArticles` 同时兼容无参，本地开发可省略 `-d @`）。导入顺序无依赖。

[[study-section]]
[[articles-section]]
[[classics-section]]

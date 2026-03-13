# Task Tracker v2 重複対策デプロイ手順（人間向け）

## 0) 目的
- タスク重複を減らす（true duplicate / pseudo duplicate の両方）
- Inbox汎用フローとフォルダ別フローを共存させても重複しにくくする

---

## 1) 変更内容（すでに作成済み）
- `webhook-email-route-v3.ts`
  - `message_id` ベースの追加重複ガード
  - `thread_id` を reply判定に依存せず優先マッチ
- `diagnose-duplicate-tasks.sql`
  - 重複の種類を可視化
- `fix-duplicate-tasks.sql`
  - 重複修復 + 再発防止インデックス

---

## 2) 反映前チェック
- Power Automate:
  - `When a new email arrives (V3) -> Send an HTTP request` = ON（確認済み）
  - QF 3件フロー = ON（確認済み）

---

## 3) アプリコード反映（本番リポジトリで）
以下を本番リポジトリで実行。

```bash
# 例: 本番repoへ移動
cd <YOUR_TASK_TRACKER_REPO>

# 既存routeにパッチ内容を反映（手動でもOK）
# 1) /api/webhook/email/route.ts を開く
# 2) task-tracker-v2/webhook-email-route-v3.ts の内容を必要箇所反映

# commit
git add .
git commit -m "fix(webhook): prevent duplicate tasks by message_id + thread-first matching"
git push
```

> Vercel連携済みなら push で自動デプロイ。

---

## 4) DB診断（先に実行推奨）

```bash
# Turso shell で実行（またはDB管理UI）
.read diagnose-duplicate-tasks.sql
```

見るポイント:
- A/B が多い → true duplicate（実重複）
- C が多い → 同一threadの新規化（ロジック問題）

---

## 5) DB修復（必要時のみ）

```bash
.read fix-duplicate-tasks.sql
```

実行後、再度:

```bash
.read diagnose-duplicate-tasks.sql
```

---

## 6) 動作確認（5分）
1. 同一会話スレッドのメールを2通投入
2. タスクが1件に集約され、`task_actions` が増えること
3. 同一メール再送（message_id同一相当）で新規タスクが増えないこと

---

## 7) ロールバック
- コード: 直前commitをrevert
- DB: インデックスはDROPで戻せる（データ削除済み行は復元不可のためバックアップ推奨）

```sql
DROP INDEX IF EXISTS idx_emails_message_id_unique;
DROP INDEX IF EXISTS idx_tasks_source_id_unique;
```

---

## 8) 補足
- まずは **コード反映だけ** でも再発率は大きく下がる
- 既存データを綺麗にするには SQL 修復も実施

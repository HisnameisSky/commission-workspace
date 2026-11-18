# 🎨 コミッション依頼・進捗管理 スマートワークスペース
# (Commission & Progress Management Smart Workspace)

個人イラストレーター・クリエイターのための、直感的でセキュアなフルスタック・タスク管理＆AI壁打ちワークスペースです。海外・国内の複数のコミッション案件をスムーズに進行・管理するために開発しました。

---

## ✨ 主な機能 (Features)

1. **4レーン カンバンボード**
   - `未着手 (To Do)` / `進行中 (In Progress)` / `確認中 (Review)` / `完了 (Done)` の4段階で案件を視覚的に管理。
2. **リアルタイム売上ダッシュボード ＆ 収益サマリー**
   - 全案件の総売上見込み、完了済み案件の確定収益（進捗プログレスバー付き）、納期月別の売上内訳を自動集計。
3. **マルチ通貨 ＆ 為替レート換算**
   - USD ($)、EUR (€)、JPY (¥) の通貨に対応。任意の為替レートを設定することで、一瞬で日本円換算の総額を算出。
4. **Gemini API によるAI要件定義＆壁打ちチャット**
   - 最初のラフな要望からプロフェッショナルな「要件定義メモ」を自動生成。
   - カードごとの詳細モーダルからAIと対話し、「英文返信メールの作成」や「確認質問リストの作成」などをワンクリックで実行可能。
5. **ローカルファースト ＆ データ永続化 (LocalStorage)**
   - APIキーや案件データはすべてブラウザの `localStorage` に安全に保存。プライバシーを最優先。
6. **JSON インポート / エクスポート**
   - 現在の全データ（チャット履歴や進捗を含む）をJSONファイルとして簡単にバックアップ・復元可能。

---

## 🛠️ 技術スタック (Tech Stack)

- **Frontend:** React, TypeScript, Vite
- **Styling:** Vanilla CSS (Apple-inspired Clean UI)
- **AI Integration:** Google Gemini API (`gemini-2.5-flash`)
- **Hosting:** Cloudflare Pages (Static Export)
- **Data Persistence:** Browser LocalStorage & JSON Backup

---

## 🚀 使い方・ローカル起動 (Getting Started)

1. リポジトリをクローンまたはダウンロードします。
2. 依存パッケージをインストールします：
   ```bash
   npm install
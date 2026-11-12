# Baseball Club React App

野球クラブの収入・備品を管理するReactアプリです。データの保存とログインにはSupabaseを使用します。

## 主な変更内容

- 収入に名目を登録・表示できるようにしました。
- 支出一覧のステータスをアイコンで表示し、管理者が「立替」と「清算済み」を切り替えられます。
- 支出一覧はステータス（すべて・立替・清算済み）で絞り込めます。
- 支出合計と残高には「清算済み」の支出のみを計上します。
- 練習球・公認球は支出登録時に1単位あたりの球数を入力し、購入数を実球数として計上します。備品管理では単位数や換算式ではなく、管理者ごとの実球数のみを管理します。
- ボール数の初期値は1球/単位です。既存のボール備品は、備品管理の「管理者・個数を変更」から実際の球数と管理者別の割当数を設定してください。
- 球カテゴリの支出登録時は確認ウィンドウで1単位あたりの球数を入力します。同じ備品名には共通の球数/単位が適用されます。
- 練習球・公認球は廃棄時に管理者と球数を指定でき、選択した管理者の割当から差し引かれます。残数がある間は備品一覧に表示されます。
- 収入・支出一覧は登録日が新しい順、備品管理一覧は変更日が新しい順に表示します。
- 収入と支出の登録・編集・削除は管理者のみ可能です。備品の管理者・個数の変更はログインユーザーが行え、変更履歴を確認できます。
- 収入・支出・備品の管理情報はSupabase Databaseに保存します。同じ備品名はまとめて管理し、購入者別の初期個数を管理者別に振り分けられます。備品は廃棄確認後に一覧から非表示にでき、変更履歴は保持されます。
- 公開URL:  https://baseball-club.vercel.app/
- GitHubの`main`ブランチへの変更はVercelからデプロイされます。

## 初回設定

1. **新規のSupabaseプロジェクト**では、SQL Editorで`supabase/setup.sql`を一度だけ実行します。このファイルは下記のmigrationを依存順にまとめたものです。
2. **既存プロジェクト**では`setup.sql`を実行せず、`supabase/migrations/`から未適用のSQLだけを、ファイル名の日時順に適用します。適用済みのmigrationは再実行しないでください。これらのファイルは適用履歴として保持します。
3. `supabase/migrations/admin_acount_operation.sql`は管理者の追加・削除・確認用の例であり、初期セットアップには含めません。必要な操作だけをSQL Editorで実行してください。
4. このフォルダで`.env.example`を`.env.local`にコピーし、SupabaseプロジェクトのURLとPublishable Keyを設定します。
   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

5. Supabase Authenticationで、アプリの公開URLをSite URLおよびRedirect URLsに設定します。
6. Supabase Dashboardの **Authentication > Email Templates** で、**Magic Link** テンプレートの本文を確認コードを含む内容に変更します。既定のリンク用 `{{ .ConfirmationURL }}` は使わず、`{{ .Token }}` を表示してください。たとえば本文を次のようにします。

   ```html
   <h2>ログイン確認コード</h2>
   <p>確認コード: {{ .Token }}</p>
   ```

   メールプロバイダーの **Confirm email** が有効な場合は、**Confirm signup** テンプレートも同様に `{{ .Token }}` を表示する内容に変更してください。これらのテンプレートがリンク形式のままだと、メールには確認コードではなくログイン用URLが届きます。設定後、ログイン画面でメールに届いた6桁のコードを入力します。
7. 管理者アカウントをSupabase Authenticationに登録します。管理者を追加・削除するときは、`src/App.jsx`の`ADMIN_EMAILS`と`public.club_admins`テーブルのメールアドレスを一致させてください。テーブルの更新例は`supabase/migrations/admin_acount_operation.sql`を参照してください。管理者変更のために初期migrationを再実行する必要はありません。

## ローカルでの起動

Node.jsとnpmをインストールし、`.env.local`を設定した後、このフォルダで実行します。

```sh
npm install
npm run dev
```

本番ビルドの確認には次を実行します。

```sh
npm run lint
npm run build
```

## Vercelへのデプロイ

VercelプロジェクトはGitHubリポジトリ`susi007/baseball-club`の`main`ブランチに接続し、Root Directoryを`WebApp/React/baseball-app`に設定します。Build Commandは`npm run build`、Output Directoryは`dist`です。Vercelの環境変数に`VITE_SUPABASE_URL`と`VITE_SUPABASE_PUBLISHABLE_KEY`をProductionおよびPreview向けに設定してください。

## データ移行について

Migrationはテーブルと権限設定を作成します。従来のローカルPostgreSQLに保存されているデータは自動移行されないため、必要な場合は別途エクスポート・インポートしてください。

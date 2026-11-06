# Baseball Club React App

野球クラブの収入・備品を管理するReactアプリです。データの保存とログインにはSupabaseを使用します。

## 主な変更内容

- 収入に名目を登録・表示できるようにしました。
- 収入と備品の登録・編集・削除は管理者のみ可能です。権限は画面表示だけでなくSupabaseのRow Level Securityでも制限しています。
- 収入・備品データはSupabase Databaseに保存します。
- 公開URL: https://baseball-club-15wsg3uq7-susi007.vercel.app
- GitHubの`main`ブランチへの変更はVercelからデプロイされます。

## 初回設定

1. SupabaseプロジェクトのSQL Editorで、`supabase/migrations/20261105160000_create_club_tables.sql`を実行します。まだテーブルやRLSポリシーを作成していない場合に必要です。
2. このフォルダで`.env.example`を`.env.local`にコピーし、SupabaseプロジェクトのURLとPublishable Keyを設定します。

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

3. Supabase Authenticationで、アプリの公開URLをSite URLおよびRedirect URLsに設定します。
4. Supabase Dashboardの **Authentication > Email Templates** で、**Magic Link** テンプレートの本文を確認コードを含む内容に変更します。既定のリンク用 `{{ .ConfirmationURL }}` は使わず、`{{ .Token }}` を表示してください。たとえば本文を次のようにします。

   ```html
   <h2>ログイン確認コード</h2>
   <p>確認コード: {{ .Token }}</p>
   ```

   メールプロバイダーの **Confirm email** が有効な場合は、**Confirm signup** テンプレートも同様に `{{ .Token }}` を表示する内容に変更してください。これらのテンプレートがリンク形式のままだと、メールには確認コードではなくログイン用URLが届きます。設定後、ログイン画面でメールに届いた6桁のコードを入力します。
5. 管理者アカウントをSupabase Authenticationに登録します。アプリとRLSポリシーでは`src/App.jsx`およびmigrationに記載されたメールアドレスを管理者として扱います。管理者を変更する場合は、両方の設定を一致させてください。

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

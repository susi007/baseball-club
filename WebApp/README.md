# baseball-club  
開発環境としてHTML,CSS,javasprict, Node.js,React,supabaseなどが必要  
React版はSupabaseに直接接続する。JavaScript版デモはローカルAPIサーバーを使用する。

```
React版: WebApp\React\baseball-app > npm run dev
JavaScript版: WebApp\JavaScript\baseball > node server.js
```

## javasprict/baseballについて  
基本的にローカルで動かすデモ版  
bootstrapはcssのデザインテンプレート  
<準備>  
①pgAdminでSQLフォルダにあるようにDBとテーブルを作成  
②.envファイルを作成して、DBのパスワードを入力  
```DB_PASSWORD = password```  

webアプリ自体の操作は同じなので割愛  

## Reactフォルダについて  
Reactフォルダの中にAIが書いたREADME.mdがあります。  
vercelを用いてアプリを稼働させています。動きだけ見たいという方は  　
https://baseball-club.vercel.app/    
を踏んでください。ただ基本的に閲覧権限しかないので面白くないと思う。  
adminが欲しい方はsusiに頼むか、後述するやり方で自分の環境でアプリを立ち上げて
admin権限をつけてみてください。（AI使えばたぶん誰でもできる）  

　　
Supabase Authでログインし、収入・備品データもSupabase Databaseに保存する。JavaScript版とは別のDBを使用する。

① Supabase SQL Editorで `WebApp/React/baseball-app/supabase/migrations/20261105160000_create_club_tables.sql` を実行  
② `WebApp/React/baseball-app/.env.local` を作成し、SupabaseのURLとPublishable Keyを設定  
③ `WebApp/React/baseball-app` で `npm install`、`npm run dev` を実行  

管理者として編集を許可するメールアドレスは、`App.jsx` の `ADMIN_EMAILS` とSupabaseのRLSポリシーに同じアドレスを設定する。  
```App.jsx
const ADMIN_EMAILS = [
  'xxxxx@gmail.com',
]
```
既存のローカルPostgreSQLのデータは自動移行されない。必要な場合は別途エクスポート・インポートする。


<操作>  
・アカウント登録。メールが来るがURLを踏んでもブラウザに飛んでエラーメッセージが出る。しかし、問題なく登録はできているはず。　　
・収入は人数×1人あたりの金額で計算される
・備品を登録すると支出として計算される  ※備品->支出に命名変更するかも
・項目はすべて入力しないと反映されない

<使用ルール>  
・実物が無い備品の所有者は支払いをした者を入力(グラウンド貸出など)  
・カテゴリは正確に  
・所有者は名字で正確に入力 ※メンバーが決まったらカテゴリと同じプルダウンメニュー式にする予定  
・基本的に月１集金の建て替えは行わず、次回その人は次回集金する  
・月１集金の建て替え・未払いは、人数に含めず別枠で収入を登録（建て替え・未払いがあったことや返済を記録として残すため）  
・臨時収入などは人数を１にする  
・

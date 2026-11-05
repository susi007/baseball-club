# baseball-club  
開発環境としてHTML,CSS,javasprict, Node.js,React,supabaseなどが必要  
アプリを立ち上げるには現状二つのサーバーを起動する必要が有る 

```
Javasprict\baseball > node server.js  
React\baseball-app > npm run dev  
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
本番環境に向け開発中  
<準備>
①supabaseに登録　※そのうちDBもクラウドにする予定。今はログイン機能用  
②サイトから.env.local用のURLとKEYを取得し、ファイルを作成  
```
VITE_SUPABASE_URL=  
VITE_SUPABASE_PUBLISHABLE_KEY=  
```
<操作>  
・アカウント登録。メールが来るはず…  
・収入は人数×金額となっている※収入名目を増やす予定  
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

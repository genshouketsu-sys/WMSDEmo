# ローカル開発とテスト

[文書一覧に戻る](../README.md)

## 環境

Java 17、Maven、Node.js 22、npm、MySQL 8 を用意してください。同梱の Maven Wrapper は必要なファイルがそろっていないため、インストール済みの `mvn` を使用します。データベースを作成またはバックアップし、`src/main/resources/application.yml` の接続先、ユーザー名、パスワードを確認します。`SPRING_DATASOURCE_URL`、`SPRING_DATASOURCE_USERNAME`、`SPRING_DATASOURCE_PASSWORD` でも上書きできます。

通常起動時に `schema.sql` と `data.sql` が実行されます。現在の `data.sql` はデモ商品を登録しません。デモデータを利用する場合は分離した開発用データベースでのみ `demo` 設定を有効にしてください。JWT 鍵には 32 バイト以上の `WMS_JWT_SECRET` を設定できます。未設定の場合は `.wms/jwt.key` が生成されるので、再起動後も同じファイルを保管してください。

## 起動

リポジトリのルートで：

```powershell
mvn spring-boot:run
```

別のターミナルで：

```powershell
cd wms-frontend
npm ci
npm run dev
```

フロントエンドが表示する HTTPS アドレスを開きます。開発サーバーは既定で 5173 番を使い、`/api` と `/ws` を 8080 番へ転送します。空のデータベースで最初に登録するユーザーは管理者、以後のユーザーはオペレーターです。

## 確認

```powershell
mvn test
cd wms-frontend
npm run lint
npm run build
```

バックエンドの統合テストは独立した H2 メモリーデータベースを使い、本番用 MySQL には接続しません。実際の業務データを使う前に、分離した環境で初期化、移行、スキャン、在庫、財務処理を確認してください。

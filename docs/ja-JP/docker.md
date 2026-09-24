# Docker 配備と HTTPS スキャン

[文書一覧に戻る](../README.md)

## PC 用の起動

Docker Engine と Compose プラグインが必要です。リポジトリのルートで実行します。

```powershell
Copy-Item .env.example .env
```

`.env` の `WMS_DB_PASSWORD` と `WMS_DB_ROOT_PASSWORD` に異なる強いパスワードを設定し、`WMS_JWT_SECRET` に 32 バイト以上のランダムな鍵を設定します。鍵は `openssl rand -hex 32` などで生成できます。`.env` は Git の対象外です。コミットしないでください。

```powershell
docker compose config
docker compose up --build -d
docker compose ps
```

PC では `http://localhost:8088` を開きます。HTTP ポートはローカルホストにのみ公開され、MySQL とバックエンドは直接公開されません。データベースは Docker の名前付きボリュームに保存されます。`docker compose down` はボリュームを削除しません。`docker compose down -v` はデータを削除するため、実行前にバックアップしてください。

ログの確認：

```powershell
docker compose logs -f backend
```

## スマートフォンでのスキャンと HTTPS

モバイルブラウザーのカメラには安全なコンテキストが必要です。スマートフォンから到達できるドメインまたは LAN アドレス用に、スマートフォンが信頼する証明書を準備し、`docker/certs/fullchain.pem` と `docker/certs/privkey.pem` に配置してください。証明書の名前はアクセス先のホスト名または IP と一致する必要があります。

```powershell
docker compose -f compose.yaml -f compose.https.yaml up --build -d
```

PC とスマートフォンの両方で `https://<到達可能なホスト名>:8443` を開きます。PC 側もこの HTTPS アドレスでログインして QR コードを表示してください。QR コードは現在のブラウザーのアドレスを使います。PC で `localhost` を開くと、スマートフォンからはその QR コードで PC に接続できません。HTTP は PC 上での確認用です。

本番環境では信頼できる証明書と到達可能なドメインを用意し、外部からのアクセスを制限してください。Compose は証明書を自動発行しません。既存のデータベースへ接続する前にはバックアップを取り、`schema.sql` の更新内容を確認してください。

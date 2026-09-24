# 系统结构 / システム構成

```text
Browser / phone → Nginx (React + /api + /ws) → Spring Boot → MySQL
```

## 中文

- `src/main/java`：REST API、安全校验、扫码 WebSocket、库存与财务业务。
- `src/main/resources/schema.sql`：新数据库表结构；`SchemaMigration` 负责补齐已有数据库的部分字段。升级前备份数据库。
- `src/main/resources/data.sql`：正常启动时不导入演示商品；演示数据在 `demo-data.sql`，仅供 `demo` 配置使用。
- `wms-frontend/src`：React 页面；同源 `/api` 请求和 `/ws` 连接由开发服务器或 Nginx 转发。
- 扫码配对令牌有有效期；扫码待处理记录和入库状态保存在数据库中。
- 入出库审核更新库存，出库审核检查库存；财务记录与补货建议使用独立接口。

当前边界：旧版 .NET 项目不在 Docker 构建范围内。容器方案不自动提供公网域名或 TLS 证书，也未在本机完成真实手机摄像头联调。

## 日本語

- `src/main/java`：REST API、認証と権限、スキャン WebSocket、在庫・財務処理。
- `src/main/resources/schema.sql`：新規データベースのテーブル。`SchemaMigration` が既存データベースの一部の列を追加します。更新前にバックアップしてください。
- `src/main/resources/data.sql`：通常起動ではデモ商品を投入しません。デモデータは `demo-data.sql` にあり、`demo` 設定でのみ使用します。
- `wms-frontend/src`：React 画面。同一オリジンの `/api` と `/ws` は開発サーバーまたは Nginx が転送します。
- スキャン用ペアリングトークンには有効期限があります。未処理スキャンと入庫状態はデータベースに保存されます。
- 入出庫の承認時に在庫を更新し、出庫時には在庫不足を確認します。財務記録と補充提案はそれぞれ別の API を使います。

現在の範囲：旧 .NET プロジェクトは Docker ビルドの対象外です。コンテナー構成は公開ドメインや TLS 証明書を自動発行しません。実機のスマートフォンカメラ連携も、この環境では未検証です。

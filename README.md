# SpeedWMS

**语言 / 言語：** [中文](#中文) · [日本語](#日本語)

## 中文

SpeedWMS 是由 Spring Boot API 和 React 页面组成的仓储管理项目。后端使用 Java 17、MyBatis、MySQL 和 WebSocket；前端使用 React 与 Vite。

### 当前功能

- 账号注册与登录、商品资料管理和条码查询。
- 手机扫码并向电脑页面传送扫码结果。
- 入库单、出库单的创建、列表与审核状态管理。
- 财务记录管理、仪表盘及补货建议展示。

目前的入库和出库审核只更新单据状态，**不会自动增减商品库存**。补货建议也不会自动生成入库单。请在实际业务中核对库存与单据。

### 本地运行

准备 Java 17、Maven、Node.js、npm 和 MySQL。按需要修改 `src/main/resources/application.yml` 中的数据库连接。后端默认使用 8080 端口；前端开发服务使用 HTTPS 5173 端口，并将 `/api` 和 `/ws` 转发到后端。

在仓库根目录启动后端：

```powershell
mvn spring-boot:run
```

在另一个终端启动前端：

```powershell
cd wms-frontend
npm ci
npm run dev
```

后端启动时会执行 `src/main/resources/schema.sql` 和 `src/main/resources/data.sql`。后者包含演示账号及商品数据；连接已有数据库前请先检查并备份数据。手机扫码需要手机和电脑可互相访问，并信任开发环境的 HTTPS 证书。

### 检查

```powershell
mvn test
cd wms-frontend
npm run lint
npm run build
```

这些命令需要在相应环境中运行；本次 README 更新没有修改或重新验证应用功能。

---

## 日本語

SpeedWMS は Spring Boot API と React 画面で構成された倉庫管理プロジェクトです。バックエンドには Java 17、MyBatis、MySQL、WebSocket、フロントエンドには React と Vite を使用しています。

### 現在の機能

- アカウント登録・ログイン、商品情報の管理、バーコード検索。
- スマートフォンで読み取った結果の PC 画面への送信。
- 入庫・出庫伝票の作成、一覧表示、承認状態の管理。
- 財務記録の管理、ダッシュボード、補充提案の表示。

現在、入庫・出庫伝票の承認で変更されるのは伝票の状態だけで、**商品の在庫数は自動更新されません**。補充提案から入庫伝票も自動作成されません。業務で利用する際は在庫と伝票を照合してください。

### ローカル環境での起動

Java 17、Maven、Node.js、npm、MySQL を用意してください。必要に応じて `src/main/resources/application.yml` のデータベース接続を変更します。バックエンドは既定で 8080 番、フロントエンドの開発サーバーは HTTPS の 5173 番を使用し、`/api` と `/ws` をバックエンドへ転送します。

リポジトリのルートでバックエンドを起動します。

```powershell
mvn spring-boot:run
```

別のターミナルでフロントエンドを起動します。

```powershell
cd wms-frontend
npm ci
npm run dev
```

バックエンドの起動時には `src/main/resources/schema.sql` と `src/main/resources/data.sql` が実行されます。後者にはデモ用アカウントと商品データが含まれます。既存のデータベースに接続する前に内容を確認し、バックアップを取ってください。スマートフォンからスキャンする場合は PC と相互に通信できるようにし、開発環境の HTTPS 証明書を信頼してください。

### 確認

```powershell
mvn test
cd wms-frontend
npm run lint
npm run build
```

各コマンドは対応する環境で実行してください。今回の README 更新では、アプリの機能は変更・再検証していません。

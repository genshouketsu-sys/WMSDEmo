# SpeedWMS

**文档语言 / ドキュメント言語：** [中文](#中文) · [日本語](#日本語)

## 中文

SpeedWMS 是基于 Spring Boot、MyBatis、MySQL 和 React 的仓储管理项目。当前实现包含登录与权限、商品管理、手机扫码、出入库明细和库存审核、财务记录及补货建议。请先在测试环境验证业务流程，再连接正式数据。

- [本地开发与测试](docs/zh-CN/quickstart.md)
- [Docker 部署与 HTTPS 扫码](docs/zh-CN/docker.md)
- [系统结构与功能边界](docs/architecture.md)

快速启动：复制 `.env.example` 为 `.env`，设置数据库密码和 JWT 密钥，然后运行 `docker compose up --build -d`。默认桌面入口为 `http://localhost:8088`。手机摄像头扫码需要可信的 HTTPS 地址，详见 Docker 文档。

## 日本語

SpeedWMS は Spring Boot、MyBatis、MySQL、React を使った倉庫管理プロジェクトです。現在、ログインと権限、商品管理、スマートフォンでのスキャン、入出庫明細と在庫更新、財務記録、補充提案に対応しています。実データに接続する前に、テスト環境で業務フローを確認してください。

- [ローカル開発とテスト](docs/ja-JP/quickstart.md)
- [Docker 配備と HTTPS スキャン](docs/ja-JP/docker.md)
- [構成と機能の範囲](docs/architecture.md)

起動するには `.env.example` を `.env` にコピーし、データベースのパスワードと JWT 鍵を設定して `docker compose up --build -d` を実行します。PC では既定の `http://localhost:8088` を利用できます。スマートフォンのカメラには信頼できる HTTPS 接続が必要です。詳細は Docker の文書を参照してください.

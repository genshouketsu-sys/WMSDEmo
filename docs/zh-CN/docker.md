# Docker 部署与 HTTPS 扫码

[返回文档目录](../README.md)

## 桌面版启动

需要 Docker Engine 与 Compose 插件。在仓库根目录执行：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`，为 `WMS_DB_PASSWORD`、`WMS_DB_ROOT_PASSWORD` 填入不同的强密码，并为 `WMS_JWT_SECRET` 填入至少 32 字节的随机密钥。例如可用 `openssl rand -hex 32` 生成密钥。`.env` 已被 Git 忽略，不要提交。

```powershell
docker compose config
docker compose up --build -d
docker compose ps
```

桌面入口为 `http://localhost:8088`。Compose 只把 HTTP 端口绑定在本机；MySQL 和后端不直接对外开放。数据库使用 Docker 命名卷保存，`docker compose down` 不删除该卷。删除数据前务必备份；`docker compose down -v` 会删除卷。

查看日志：

```powershell
docker compose logs -f backend
```

## 手机扫码与 HTTPS

移动浏览器的摄像头需要安全上下文。请为手机能访问的域名或局域网地址准备有效、在手机上受信任的证书，放入 `docker/certs/fullchain.pem` 和 `docker/certs/privkey.pem`。证书必须匹配手机访问时使用的主机名或 IP。

```powershell
docker compose -f compose.yaml -f compose.https.yaml up --build -d
```

从电脑和手机都打开 `https://<可访问的主机名>:8443`。在电脑上以该 HTTPS 地址登录并生成扫码二维码；二维码沿用当前浏览器地址，因此手机能连接到同一主机。若电脑通过 `localhost` 打开页面，手机二维码也会指向 `localhost`，无法访问电脑。HTTP 入口仅用于桌面本机检查。

正式部署应使用受信任的证书和可访问域名，并限制外部访问范围。Compose 不自动签发证书。首次连接已有数据库前，请备份数据并检查 `schema.sql` 的更新。

# 本地开发与测试

[返回文档目录](../README.md)

## 环境

安装 Java 17、Maven、Node.js 22、npm 和 MySQL 8。仓库自带的 Maven Wrapper 文件不完整，请使用已安装的 `mvn`。先创建或备份数据库，再检查 `src/main/resources/application.yml` 的连接地址、用户名和密码。可使用 `SPRING_DATASOURCE_URL`、`SPRING_DATASOURCE_USERNAME`、`SPRING_DATASOURCE_PASSWORD` 覆盖。

正常启动会执行 `schema.sql` 建表和 `data.sql`；当前 `data.sql` 不导入演示商品。要使用演示数据，请只在隔离的开发数据库中启用 `demo` 配置。JWT 密钥可设置 `WMS_JWT_SECRET`（至少 32 字节）；未设置时生成 `.wms/jwt.key`，请妥善保存，避免重启后令牌失效。

## 启动

在仓库根目录：

```powershell
mvn spring-boot:run
```

在另一个终端：

```powershell
cd wms-frontend
npm ci
npm run dev
```

打开前端输出的 HTTPS 地址。开发服务器默认使用 5173 端口，并把 `/api` 和 `/ws` 转发到 8080 端口。空数据库的第一位注册用户成为管理员，之后注册的用户成为操作员。

## 检查

```powershell
mvn test
cd wms-frontend
npm run lint
npm run build
```

后端集成测试使用独立的 H2 内存数据库，不会连接配置中的正式 MySQL。连接正式业务数据库前，仍需在隔离环境验证初始化、迁移、扫码、库存和财务流程。

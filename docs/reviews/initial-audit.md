# WMS 项目检查报告

> 历史快照：本文记录修复前的首次检查。部分问题已在后续本地修改中处理；当前功能与启动方式请以 `docs/` 中的现行文档和最新测试结果为准。

检查日期：2026-09-24。此次检查未修改业务源代码。

## 范围与结论

仓库同时包含两套系统：

- `src/`、`pom.xml`：SpeedWMS，Spring Boot 3.2.5、Java 17 目标版本、MyBatis、MySQL、Spring Security/JWT、WebSocket。
- `wms-frontend/`：React 19、Vite 8 前端，包含登录、商品、扫码、出入库、财务及补货看板。
- `Git.WMS.Web/`、`Lib/`、`DB/GitWMS_V4.bak`：旧版 .NET Framework 4.0 系统及相关依赖、数据库备份。扫描到 499 个 C# 文件。

已检查整体目录、构建配置、当前 Java 服务/控制器/映射器/安全链路、数据库脚本、前端主要业务调用、现有测试；旧版检查限于工程依赖、启动和鉴权配置及代表性控制器，未逐行审计全部历史代码或二进制 DLL。当前版本具备界面和基本 CRUD，但库存业务、访问控制和首次部署仍存在明确缺口。

## 实际执行结果

| 检查 | 结果 | 边界 |
| --- | --- | --- |
| 前端 `npm.cmd run build` | 通过，360 个模块 | 主 JS 约 1,815.83 kB，gzip 501.30 kB，存在大包警告 |
| 前端 ESLint | 41 个错误、1 个警告 | 包含未使用变量、React Hooks 规则及全局变量声明问题；不等于 41 个运行故障 |
| 后端 ProductServiceTest、UserControllerTest | 11 项通过，0 失败 | 离线 Maven，已有编译产物增量检查；Mockito 测试不访问真实数据库 |
| 后端 contextLoads / 数据库集成 | 未运行 | 默认启动会执行 schema.sql/data.sql，未对现有数据库执行初始化写入 |
| 旧版 C# 构建 | 未运行 | 当前命令环境没有可用 MSBuild，dotnet --list-sdks 无输出；还发现 8 处缺失引用 |
| 浏览器、摄像头、手机扫码联调 | 未执行 | 本报告不将静态分析视为端到端验证 |

后端 Maven 初次执行因工作区外依赖缓存权限失败，获得工具授权后测试通过。检查产物包括 `target/frontend-lint-review.json` 和 `target/surefire-reports/`；前端 dist 已由构建更新。

## P1：优先修复

### 1. JWT 签名密钥写死在源码

位置：`src/main/java/com/wms/wmsbackend/security/JwtUtil.java:20`。

所有部署默认使用同一已公开的 HMAC 密钥。获得源码并知道现有用户名的人可以构造有效签名，后端再按该用户名加载权限。应从部署密钥配置读取并轮换；不应保留公开默认密钥。

### 2. 扫码读写和 WebSocket 无身份绑定

位置：`security/SecurityConfig.java:37`、`controller/ScanController.java`、`config/ScanWebSocketHandler.java`（均在 Java 包目录内）。

`/api/scan/**` 与 `/ws/scan` 公开。请求中的 userId 决定向谁推送、撤销谁的最新日志；日志列表返回全部扫描记录；WebSocket 只凭 URL 中的 clientId 订阅。无需登录即可读取日志、伪造他人的扫描或撤销，以及订阅已知用户名对应的推送。手机连接应采用服务端签发、限时且绑定用户的配对凭证；日志查询、撤销和订阅需校验归属。

### 3. 注册直接授予管理员身份，业务接口缺少角色限制

位置：`controller/AuthController.java:51`、`security/SecurityConfig.java:36`。

注册公开且固定写入 ROLE_ADMIN；其余业务接口只要求登录，没有审核、删除、财务等操作的角色区分。修复下述数据库字段问题后，任意注册者即能使用当前全部业务接口。需要明确开户策略、默认角色与服务端权限矩阵。

### 4. 建表脚本缺少用户接口依赖字段

位置：`src/main/resources/schema.sql:15`、`mapper/UserMapper.java:15`。

wms_user 缺少 display_name、email、avatar_url，但注册 INSERT 和资料 UPDATE 都引用这三个字段。按仓库脚本创建新库后，这些操作会因未知列失败。仓库内未找到补列迁移。已有数据库若人工补过字段可能不触发，但首次部署仍不完整。

### 5. 出入库审核只修改状态，没有库存业务

位置：`controller/InboundController.java:30`、`controller/OutboundController.java:30` 及对应 Mapper、schema.sql。

审核仅把状态改为 Audited，没有商品明细、数量、库存增减或库存不足检查。订单表也没有明细结构。因此“审核完成”不能代表真实收货或发货完成。创建接口还接受客户端传入的状态，未限制状态流转。需要订单明细、受控状态迁移和事务性库存处理。

### 6. 批量入库对未匹配条码仍返回成功

位置：`service/ProductService.java:29`、`controller/ProductController.java:42`、`mapper/ProductMapper.java:26`。

updateStock 的影响行数被忽略。未知条码更新 0 行也返回整批成功；混合有效/无效条码时会提交部分库存修改，而界面将整批标为完成。事务注解本身不会因更新 0 行回滚。应先校验并检查每条结果，失败时给出明确错误并保证约定的原子性。

### 7. 重复条码的多条扫描被一次入库全部标记

位置：`wms-frontend/src/components/PcDashboard.jsx:79`。

扫描记录的 id 实际是条码。连续扫描同一商品三次后，点击其中一条入库只向后端提交一个条码（库存 +1），但前端把所有同条码记录改成 Stocked，剩余两件会被后续批量入库跳过。删除单条也会删除全部同条码记录。应给每次扫描独立记录 ID，条码单独保存。

### 8. 待入库扫描队列被截断

位置：`wms-frontend/src/App.jsx:108`。

每次接收扫描只保留最新 10 条，批量入库直接读取该数组。连续扫描超过 10 次、尚未入库时，较早的待处理记录会从队列中消失。数据库日志虽可能仍存在，但当前待入库队列不会恢复它们。应分离展示条数与业务队列，并保存处理状态。

## P2：功能与部署缺陷

### 9. 防重复提交误伤所有用户

位置：`aspect/IdempotentAspect.java:21`。

缓存键只有方法签名，没有用户、请求或操作标识。任一用户提交入库后，其他用户三秒内提交任何入库都会被拒绝；业务失败后键也保留至过期；多实例之间又不共享缓存。它不是可靠的业务幂等机制，应使用请求标识及原子处理结果记录。

### 10. 补货详情没有携带 JWT

位置：`wms-frontend/src/components/PcDashboard.jsx:59`。

调用受保护的 `/api/predictions/restock` 使用原生 fetch，未设置 Authorization，而 token 仅由 Axios 拦截器添加。请求会被拦截，前端静默忽略错误，导致看板可能显示预警数量却无法打开建议列表。应统一使用鉴权请求客户端。

### 11. “创建补货订单”只显示成功提示

位置：`wms-frontend/src/components/PcDashboard.jsx:93`。

handleExecuteOrder 仅弹出成功信息并删除本地建议，没有请求后端或持久化订单。即使修复补货详情请求，此按钮仍不会创建订单。需要补齐接口和落库流程，或明确显示此功能尚未实现。

### 12. 补货算法把所有扫码当成消耗

位置：`service/RestockPredictionService.java:27`、`mapper/ScanLogMapper.java`。

最近 14 天的扫码次数直接作为日消耗，而扫码记录没有业务方向，当前扫码主要用于入库。进货扫描也会增加预测消耗；零日消耗的商品又被设定为 0 天后耗尽，导致紧急程度失真。应基于实际出库流水计算消耗，明确无消耗数据时的预测状态。

### 13. 商品条码没有唯一约束

位置：`src/main/resources/schema.sql:5`、`mapper/ProductMapper.java:17`。

数据库只约束 SKU 唯一，条码可重复。按条码查询期望单个 Product，重复数据会导致查询异常；按条码更新库存则会同时修改多条商品。需要明确条码唯一范围并在数据库与业务校验中落实。

### 14. 二维码入口绑定构建机器和开发端口

位置：`wms-frontend/src/components/ScanQrModal.jsx:11`、`wms-frontend/vite.config.js`。

二维码固定为构建时本机 IP 和 5173 端口。部署到正式域名、换电脑或改变端口后，扫码仍会跳向旧开发地址。用户名也未做 URL 编码。应由实际访问地址或部署配置生成入口，并编码参数。

### 15. 每次启动执行演示数据初始化

位置：`src/main/resources/application.yml:12`、`src/main/resources/data.sql`。

sql.init.mode=always 配合 INSERT IGNORE 演示商品，会在重启时重新插入已经删除的种子商品；也会尝试重新插入固定默认管理员。应区分开发种子数据与正式迁移，避免重启改变业务数据。

## 工程维护与旧版边界

- 根 README 仍介绍旧版 C# 功能，未提供当前 Java/React 项目的数据库迁移、启动、环境配置和部署说明。旧版多企业、多仓库功能不能据此视为新版已经实现；新版核心表没有租户/仓库归属字段。
- 仓库有 mvnw/mvnw.cmd，但缺少 `.mvn/wrapper/maven-wrapper.properties`，Wrapper 交付不完整；本次使用机器已安装的 Maven。
- 当前只存在两个业务单元测试类和一个上下文加载测试；缺少真实 SQL、权限、订单审核、扫码队列、并发幂等测试。前端没有 test 脚本。
- 前端 HTML 运行时依赖 Tailwind CDN 与外部字体。不能将打包成功等同于断网/内网环境样式正常。
- 前端主 JS 包较大，当前路由使用静态导入；应按页面和扫码等重型依赖分包后验证加载表现。
- 旧版四个工程各有两条缺失 HintPath：Microsoft.Net.Http 包中的 System.Net.Http.dll 和 System.Net.Http.WebRequest.dll，总计 8 处。未执行旧版还原或构建，因此不宣称补齐这两类文件即可编译通过。
- 旧版 API 全局过滤器仅注册 HandleErrorAttribute，抽查 ProductController 直接接受 CompanyID。仓库所见代码未建立该接口的身份/企业归属校验；实际部署是否由网关、IIS 或外部模块保护尚未验证，需专项检查，不能直接认为旧版接口已有 Web 登录页同等保护。

## 建议修复顺序

1. 修复数据库迁移、密钥配置和身份/权限边界，使首次部署与访问控制可验证。
2. 完成出入库明细、库存事务、扫描独立 ID 与持久化队列；补上未知条码和重复提交测试。
3. 打通补货鉴权、订单落库与正确的消耗数据来源。
4. 修复前端检查问题，补齐部署入口、环境说明及自动化回归。

本报告是静态审查与有限构建/单元测试结果，不是生产验收；未执行真实业务写入、旧版全量运行验证、依赖在线漏洞扫描或手机摄像头测试。

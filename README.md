# AuthMaster

开源的 OAuth2.0/OIDC 认证服务器，部署在 Cloudflare 上。

## 特性

- ✅ 完整的 OAuth2.0 和 OpenID Connect 支持
- ✅ 用户注册、登录、密码重置
- ✅ 第三方应用接入管理
- ✅ API 调用统计和流量监控
- ✅ 基于 Cloudflare Workers 的无服务器架构
- ✅ 全球 CDN 分发
- ✅ 企业级安全性（DDoS 防护、WAF）

## 技术栈

- **前端**: React + Vite + TypeScript
- **后端**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **缓存**: Cloudflare KV
- **部署**: Cloudflare Pages + Workers

## 快速开始

### 前置要求

- Node.js 18+
- pnpm 或 npm
- Cloudflare 账号
- Wrangler CLI

### 安装依赖

```bash
npm install
```

### 配置环境变量

#### 后端配置

创建 `packages/worker-api/.dev.vars` 文件：

```bash
cd packages/worker-api
cp .dev.vars.example .dev.vars
```

编辑 `.dev.vars` 文件，生成密钥：

```bash
# 生成 JWT 密钥
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"

# 生成加密密钥
echo "ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
```

#### 前端配置

创建 `packages/web-console/.env` 文件：

```bash
cd packages/web-console
cp .env.example .env
```

默认配置：
```
VITE_API_URL=http://localhost:8787
```

### 本地开发

启动后端开发服务器（确保已配置 `.dev.vars`）：

```bash
cd packages/worker-api
npm run dev
```

后端 API 将运行在 `http://localhost:8787`

启动前端开发服务器（确保已配置 `.env`）：

```bash
查看完整的[部署指南](./docs/DEPLOYMENT.md)了解详细配置步骤。

#### 快速部署

部署 Worker API：

```bash
cd packages/worker-api
# 配置生产环境密钥（仅首次）
npx wrangler secret put JWT_SECRET
npx wrangler secret put ENCRYPTION_KEY
# 部署
npm run deploy
```

部署前端到 Cloudflare Pages：

```bash
cd packages/web-console
npm run build
npx wrangler pages deploy dist --project-name=authmaster
```

**重要**: 部署后需要在 Cloudflare 控制台配置环境变量：
- 后端: 在 `wrangler.toml` 中设置 `FRONTEND_URL` 
- 前端: 在 Cloudflare Pages 设置中添加 `VITE_API_URL部署 Worker API
cd packages/worker-api
npm run deploy

# 部署前端到 Cloudflare Pages
cd packages/web-console
npm run build
npm run deploy
```

## 项目结构

```
authmaster/
├── packages/
│   ├── worker-api/       # Cloudflare Workers 后端
│   ├── web-console/      # React 前端控制台
│   └── shared/           # 共享类型和工具
├── docs/                 # 文档
└── README.md
```

## 文档

- [API 文档](./docs/API.md)
- [部署指南](./docs/DEPLOYMENT.md)
- [OAuth2 流程](./docs/OAUTH2.md)
- [开发指南](./docs/DEVELOPMENT.md)

## License

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 贡献

欢迎提交 Issue 和 Pull Request！

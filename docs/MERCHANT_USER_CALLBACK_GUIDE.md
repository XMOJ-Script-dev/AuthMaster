# 商户与用户完整接入及回调演示

本文档面向两类角色：

- 商户（第三方应用开发者）：注册应用、发起 OAuth 授权、处理回调、换取 token、读取用户信息。
- 用户（终端登录用户）：在授权页登录并同意或拒绝授权，必要时完成 XMOJ 绑定。

本文以生产环境域名举例：

- 认证服务（Issuer）：https://auth.xmoj-bbs.me
- 控制台（前端）：https://sso.xmoj-bbs.me

如果你部署在其他域名，请替换为你的真实地址。

## 1. 先决条件

1. 已部署 AuthMaster 的 Worker API 与 Web Console。
2. 已在 Worker 环境变量中正确设置：
   - ISSUER
   - FRONTEND_URL
3. 商户账号类型为 merchant（或 admin）。
4. 最终授权人账号类型为 user（merchant 账号不能同意授权）。

## 2. 商户端完整接入流程

### 2.1 商户登录并创建应用

先登录拿到平台登录 token（不是 OAuth access_token）：

```bash
curl -X POST "https://auth.xmoj-bbs.me/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "merchant@example.com",
    "password": "your-password"
  }'
```

返回示例：

```json
{
  "user": {
    "id": "...",
    "email": "merchant@example.com",
    "account_type": "merchant"
  },
  "token": "merchant_console_jwt"
}
```

创建 OAuth 应用：

```bash
curl -X POST "https://auth.xmoj-bbs.me/api/v1/apps/register" \
  -H "Authorization: Bearer merchant_console_jwt" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Demo Merchant App",
    "description": "OAuth callback demo",
    "redirect_uris": [
      "https://merchant.example.com/oauth/callback"
    ],
    "scopes": ["openid", "profile", "email", "xmoj_profile"]
  }'
```

返回里会包含：

- app_id：客户端 ID
- app_secret：客户端密钥（只显示一次，务必保存）

### 2.2 生成授权链接并引导用户访问

商户应用应重定向用户到：

```text
https://auth.xmoj-bbs.me/oauth2/authorize
```

建议参数：

- response_type=code
- client_id=你的 app_id
- redirect_uri=已注册回调地址（必须完全一致）
- scope=openid profile email xmoj_profile
- state=随机串（防 CSRF）
- code_challenge/code_challenge_method（建议开启 PKCE）

示例拼接结果：

```text
https://auth.xmoj-bbs.me/oauth2/authorize?response_type=code&client_id=app_xxx&redirect_uri=https%3A%2F%2Fmerchant.example.com%2Foauth%2Fcallback&scope=openid%20profile%20email%20xmoj_profile&state=st_20260418_abc
```

### 2.3 用户在授权页完成同意/拒绝

AuthMaster 行为：

1. 用户未登录时会被引导先登录。
2. 登录后进入授权页，展示应用信息与 scope。
3. 用户点击同意：跳回商户回调地址并附带 code。
4. 用户点击拒绝：跳回商户回调地址并附带 error=access_denied。

## 3. 回调与换 token 演示

## 3.1 成功回调（用户同意）

浏览器将跳回：

```text
https://merchant.example.com/oauth/callback?code=code_xxx&state=st_20260418_abc
```

服务端应做：

1. 校验 state 与会话中保存值一致。
2. 提取 code。
3. 调用 token 接口换取 access_token/refresh_token。

token 交换请求：

```bash
curl -X POST "https://auth.xmoj-bbs.me/oauth2/token" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "code_xxx",
    "redirect_uri": "https://merchant.example.com/oauth/callback",
    "client_id": "app_xxx",
    "client_secret": "secret_xxx"
  }'
```

返回示例：

```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "scope": "openid profile email xmoj_profile"
}
```

拿到 access_token 后可请求用户信息：

```bash
curl "https://auth.xmoj-bbs.me/oauth2/userinfo" \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

当 scope 包含 xmoj_profile 时，若用户已绑定 XMOJ，可返回：

- xmoj_bound
- xmoj_user_id
- xmoj_username

## 3.2 拒绝回调（用户拒绝）

浏览器将跳回：

```text
https://merchant.example.com/oauth/callback?error=access_denied&error_description=The%20user%20denied%20the%20request&state=st_20260418_abc
```

商户侧应：

1. 校验 state。
2. 给用户明确提示“你已取消授权”。
3. 不进行 token 交换。

## 4. 可运行的回调后端示例（Node.js + Express）

说明：示例演示最佳实践，client_secret 始终只放在服务端。

```ts
import express from 'express';
import fetch from 'node-fetch';

const app = express();

const AUTH_BASE = 'https://auth.xmoj-bbs.me';
const CLIENT_ID = process.env.CLIENT_ID!;
const CLIENT_SECRET = process.env.CLIENT_SECRET!;
const REDIRECT_URI = 'https://merchant.example.com/oauth/callback';

app.get('/oauth/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query as Record<string, string>;

  // 1) 校验 state（示例中省略 session 获取）
  const expectedState = 'replace-with-session-state';
  if (!state || state !== expectedState) {
    return res.status(400).json({ message: 'Invalid state' });
  }

  // 2) 用户拒绝
  if (error) {
    return res.status(403).json({
      message: 'User denied authorization',
      error,
      error_description,
    });
  }

  if (!code) {
    return res.status(400).json({ message: 'Missing code' });
  }

  // 3) code 换 token
  const tokenResp = await fetch(`${AUTH_BASE}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!tokenResp.ok) {
    const errBody = await tokenResp.text();
    return res.status(400).json({ message: 'Token exchange failed', detail: errBody });
  }

  const tokens = await tokenResp.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  };

  // 4) 拉取 userinfo
  const meResp = await fetch(`${AUTH_BASE}/oauth2/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const userInfo = meResp.ok ? await meResp.json() : null;

  // 5) 在这里建立你自己的登录态
  return res.json({
    message: 'OAuth success',
    tokens,
    userInfo,
  });
});

app.listen(3000, () => {
  console.log('merchant demo server running on :3000');
});
```

## 5. 前端演示：发起授权按钮

前端只负责跳转，不持有 client_secret。

```ts
function startOAuthLogin() {
  const state = crypto.randomUUID();
  sessionStorage.setItem('oauth_state', state);

  const url = new URL('https://auth.xmoj-bbs.me/oauth2/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', 'app_xxx');
  url.searchParams.set('redirect_uri', 'https://merchant.example.com/oauth/callback');
  url.searchParams.set('scope', 'openid profile email xmoj_profile');
  url.searchParams.set('state', state);

  window.location.href = url.toString();
}
```

## 6. 用户端完整体验说明

1. 用户点击商户“使用 AuthMaster 登录”。
2. 若未登录 AuthMaster，则先登录用户账号。
3. 进入授权页确认应用名称与申请权限。
4. 同意后回调到商户系统，商户完成 token 交换。
5. 若商户请求 xmoj_profile 但用户尚未绑定，可提示用户前往控制台绑定：
   - https://sso.xmoj-bbs.me/xmoj-binding

## 7. 常见失败场景与排查

1. invalid_client
   - client_id 或 client_secret 不匹配。

2. invalid_request
   - redirect_uri 不在应用注册列表中，或参数缺失。

3. invalid_grant
   - code 已使用、过期，或 redirect_uri 与授权时不一致。

4. invalid_scope
   - 请求了应用未配置的 scope。

5. 403 Only user accounts can authorize applications
   - 当前登录的是 merchant 账号，请切换 user 账号授权。

## 8. 安全建议（必须执行）

1. 回调处理必须在服务端完成，禁止在浏览器暴露 client_secret。
2. 强制校验 state，防止 CSRF。
3. 建议启用 PKCE，尤其是 SPA/移动端。
4. access_token 使用短时效，refresh_token 做安全存储与轮换。
5. 回调地址使用 HTTPS，且精确匹配注册值（包含路径）。

## 9. 商户上线检查清单

1. 应用 redirect_uris 已配置生产与测试环境。
2. scope 最小化，仅申请必要权限。
3. 回调支持 success/deny 两条路径。
4. token 交换失败有用户可读提示与日志。
5. userinfo 成功后已完成本地账号绑定或自动注册策略。

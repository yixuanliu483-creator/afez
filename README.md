# afez - 安福二中论坛前端

## 已配置

- API 地址: https://afezapi.yixuanliu483.workers.dev
- USE_MOCK: false（使用真实后端）

## 部署到 Cloudflare Pages

1. Cloudflare Dashboard → Pages → Create project → Connect to Git
2. 选择本仓库 `afez`
3. 构建设置：
   - Framework preset: None
   - Build command: 留空
   - Build output directory: `/`（根目录）
4. 部署即可

本地预览：直接打开 index.html 或 `npx serve .`

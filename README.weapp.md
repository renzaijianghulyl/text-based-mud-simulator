# 微信小程序与云开发（部署备忘）

本文件补充**产品向**微信侧构建步骤；引擎与 CLI 的通用说明见根目录 [README.md](./README.md)。

## 依赖安装

```bash
npm install
cd src/frontend && npm install
```

## 云函数

```bash
npm run build:cloud-interact
# 将 cloud-dist/interact 上传至微信云开发「云函数」interact，并在该目录执行 npm install 安装 wx-server-sdk
```

## 小程序前端

```bash
npm run build:weapp
# 或使用 npm run dev:weapp 在 src/frontend 下调试
```

在微信开发者工具中导入项目根目录（或团队约定的子目录），使用预览/上传流程发版。

## 内容安全与会话

云函数入口 `src/functions/interact/index.ts` 会调用 `src/adapters/wechat/` 下的内容安全与会话存储模块；详见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。

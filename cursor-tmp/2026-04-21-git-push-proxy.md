# Git 走本机代理推送 GitHub

已在当前仓库设置（仅对 `github.com` 生效）：

- `http.https://github.com.proxy = http://127.0.0.1:7890`

## 你需要做的

1. 打开你的代理软件（Clash / Surge / 等），确认 **系统代理已开启**。
2. 在软件里查看 **HTTP 代理端口**（常见 `7890`、`7897`、`1087`）。若**不是 7890**，在仓库根目录执行：

   ```bash
   git config http.https://github.com.proxy http://127.0.0.1:你的端口
   ```

3. 再推送：

   ```bash
   cd "/Users/liyulong/Desktop/Text-based MUD Simulator"
   git push -u origin main:mvp-weapp
   ```

## 若代理是 SOCKS5（无 HTTP 端口）

把上式改成例如（端口按你软件为准）：

```bash
git config http.https://github.com.proxy socks5://127.0.0.1:7891
```

## 仅本仓库生效；若要删掉代理设置

```bash
git config --unset http.https://github.com.proxy
```

## 全局给所有 Git 走代理（慎用）

```bash
git config --global http.proxy http://127.0.0.1:7890
git config --global https.proxy http://127.0.0.1:7890
```

取消：

```bash
git config --global --unset http.proxy
git config --global --unset https.proxy
```

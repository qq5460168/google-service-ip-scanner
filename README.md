# Google 服务 IP 扫描器

自动扫描最佳 Google 服务 IP 并生成 hosts 文件，解决 Google 翻译和 Google Play 无法访问的问题。

![GitHub](https://img.shields.io/github/license/yourusername/google-service-ip-scanner)
![GitHub last commit](https://img.shields.io/github/last-commit/yourusername/google-service-ip-scanner)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/yourusername/google-service-ip-scanner/schedule-scan.yml)

## 功能特性

- 🚀 自动扫描最佳 Google 服务 IP
- 📝 生成优化的 hosts 文件（支持翻译和 Play 商店）
- ⚙️ 可配置扫描参数
- 🔁 支持定时扫描（守护进程模式）
- 🌐 同时支持 IPv4 和 IPv6
- 📊 显示每个 IP 的延迟信息
- 🤖 GitHub Actions 自动更新

## 支持的服务

### Google 翻译服务
- `translate.googleapis.com`
- `translate.google.com`
- `translate-pa.googleapis.com`
- `jnn-pa.googleapis.com`

### Google Play 商店服务
- `play.google.com`
- `android.clients.google.com`
- `play-fe.googleapis.com`
- `dl.google.com` (Google Play 应用下载)
- `www.gstatic.com` (静态资源)

## 使用方法

### 前提条件

- Linux/macOS 系统
- 安装依赖: `jq`, `fping`, `curl`, `awk`

Debian/Ubuntu 安装依赖:
```bash
sudo apt update
sudo apt install -y jq fping curl gawk
```

### 本地运行

1. 克隆仓库:
```bash
git clone https://github.com/yourusername/google-service-ip-scanner.git
cd google-service-ip-scanner
```

2. 运行扫描器:
```bash
chmod +x scan-google-ip.sh
./scan-google-ip.sh
```

3. 生成的 hosts 文件会保存在当前目录: `google-hosts.txt`

### 使用自动生成的 hosts 文件

```bash
# Linux/macOS
sudo curl -L https://raw.githubusercontent.com/yourusername/google-service-ip-scanner/main/google-hosts.txt -o /etc/hosts

# 刷新DNS缓存
sudo systemd-resolve --flush-caches || sudo /etc/init.d/nscd restart

# Windows (PowerShell 管理员模式)
irm https://raw.githubusercontent.com/yourusername/google-service-ip-scanner/main/google-hosts.txt -OutFile "$env:windir\System32\drivers\etc\hosts"
ipconfig /flushdns

# Android (需要root)
adb shell "su -c 'curl -L https://raw.githubusercontent.com/yourusername/google-service-ip-scanner/main/google-hosts.txt -o /system/etc/hosts'"
adb shell "su -c 'chmod 644 /system/etc/hosts'"
```

### 守护进程模式 (定时扫描)

```bash
./scan-google-ip.sh daemon
```

此模式会每 10 分钟自动扫描并更新 hosts 文件。

## GitHub Actions 自动更新

此仓库配置了 GitHub Actions 工作流，每 4 小时自动扫描并更新 hosts 文件。

### 使用最新 hosts 文件
```
https://raw.githubusercontent.com/yourusername/google-service-ip-scanner/main/google-hosts.txt
```

### 手动触发扫描
1. 访问仓库的 Actions 标签页
2. 选择 "定时扫描 Google 服务 IP" 工作流
3. 点击 "Run workflow" 按钮

## 配置选项

编辑 `config.json` 文件可自定义设置:

- `远程IP文件`: 预定义 IP 地址列表
- `IP扫描限制数量`: 找到多少个可用 IP 后停止
- `扫描超时`: IP 响应超时时间（秒）
- `扫描并发数`: 同时扫描的 IP 数量
- `间隔扫描时间`: 守护进程模式扫描间隔（分钟）
- `Hosts`: Google 翻译域名
- `GooglePlayHosts`: Google Play 域名
- `IP段`: 扫描的 IPv4 范围
- `IPv6段`: 扫描的 IPv6 范围

## 验证服务

### 验证 Google 翻译
```bash
curl https://translate.googleapis.com

# 预期响应
200 OK
{"data":{"translations":[{"translatedText":"你好世界"}]}}
```

### 验证 Google Play
1. 清除 Google Play 商店应用数据
2. 重启设备
3. 打开 Google Play 商店应能正常访问

## 贡献

欢迎提交 Issue 和 Pull Request!

## 许可证

本项目采用 [MIT 许可证](LICENSE)。
#!/bin/bash

# Google 服务 IP 扫描器 - GitHub Actions 优化版

# 检测是否在 GitHub Actions 中运行
if [ -n "$GITHUB_ACTIONS" ]; then
    echo "运行在 GitHub Actions 环境中"
    DAEMON_MODE=false
    # 在 CI 环境中增加详细日志
    VERBOSE=true
else
    DAEMON_MODE=true
    VERBOSE=false
fi

# 加载配置文件
CONFIG_FILE="$(dirname "$0")/config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "错误: 找不到配置文件 $CONFIG_FILE"
    exit 1
fi

# 解析JSON配置
REMOTE_IP_FILE=$(jq -r '."远程IP文件"' "$CONFIG_FILE")
REMOTE_IPV6_FILE=$(jq -r '."远程IPv6文件"' "$CONFIG_FILE")
IP_SCAN_LIMIT=$(jq -r '."IP扫描限制数量"' "$CONFIG_FILE")
SCAN_TIMEOUT=$(jq -r '."扫描超时"' "$CONFIG_FILE")
SCAN_CONCURRENCY=$(jq -r '."扫描并发数"' "$CONFIG_FILE")
SCAN_INTERVAL_MINUTES=$(jq -r '."间隔扫描时间"' "$CONFIG_FILE")
HOSTS=($(jq -r '.Hosts[]' "$CONFIG_FILE"))
GOOGLE_PLAY_HOSTS=($(jq -r '.GooglePlayHosts[]' "$CONFIG_FILE"))
IP_RANGES=($(jq -r '."IP段"[]' "$CONFIG_FILE"))
IPV6_RANGES=($(jq -r '."IPv6段"[]' "$CONFIG_FILE"))

# 依赖检查
check_dependencies() {
    local missing=()
    for cmd in jq fping curl awk sort uniq; do
        if ! command -v "$cmd" &> /dev/null; then
            missing+=("$cmd")
        fi
    done
    
    if [ ${#missing[@]} -gt 0 ]; then
        echo "缺少必要依赖: ${missing[*]}"
        if [ -n "$GITHUB_ACTIONS" ]; then
            echo "在 GitHub Actions 中安装依赖..."
            sudo apt update
            sudo apt install -y jq fping curl gawk coreutils
        else
            echo "请选择安装方式:"
            echo "1. 自动安装 (Debian/Ubuntu)"
            echo "2. 手动安装"
            read -rp "请输入选择 [1-2]: " choice
            
            case $choice in
                1)
                    echo "正在安装依赖..."
                    sudo apt update
                    sudo apt install -y jq fping curl gawk coreutils
                    ;;
                *)
                    echo "请手动安装以下依赖:"
                    for dep in "${missing[@]}"; do
                        case $dep in
                            jq) echo " - jq: 强大的JSON处理工具" ;;
                            fping) echo " - fping: 高效的IP扫描工具" ;;
                            curl) echo " - curl: 数据传输工具" ;;
                            awk) echo " - awk: 文本处理工具" ;;
                        esac
                    done
                    echo "安装完成后重新运行脚本"
                    exit 1
                    ;;
            esac
        fi
    fi
}

# 下载IP列表
download_ip_list() {
    local url=$1
    local output=$2
    echo "下载IP列表: $url"
    if ! curl -sSL -f "$url" -o "$output"; then
        echo "警告: 无法下载 $url"
        return 1
    fi
    echo "下载完成, 文件大小: $(wc -l < "$output") 行"
}

# 生成随机子网IP
generate_random_ips() {
    local cidr=$1
    local count=100
    local network prefix
    
    IFS='/' read -r network prefix <<< "$cidr"
    
    if [[ $cidr == *":"* ]]; then
        echo "$network"
    else
        local base="${network%.*}"
        local last_octet="${network##*.}"
        
        local range_start=$(( (last_octet) & ~((1 << (32 - prefix)) - 1) ))
        local range_end=$(( range_start + (1 << (32 - prefix)) - 1 ))
        
        # 确保范围有效
        if [ "$range_start" -gt 255 ] || [ "$range_end" -lt 0 ]; then
            echo "无效的CIDR范围: $cidr" >&2
            return
        fi
        
        # 限制范围在0-255之间
        range_start=$(( range_start < 0 ? 0 : range_start ))
        range_end=$(( range_end > 255 ? 255 : range_end ))
        
        for _ in $(seq 1 "$count"); do
            local rand_octet=$(( RANDOM % (range_end - range_start + 1) + range_start ))
            echo "${base}.${rand_octet}"
        done
    fi
}

# 扫描IP列表
scan_ips() {
    local ips=("$@")
    local results_file
    results_file=$(mktemp)
    local batch_size=$SCAN_CONCURRENCY
    local total_ips=${#ips[@]}
    local scanned=0
    
    echo "开始扫描 $total_ips 个IP地址..."
    
    for ((i = 0; i < total_ips; i += batch_size)); do
        # 计算当前批次
        local batch=("${ips[@]:i:batch_size}")
        local batch_size_actual=${#batch[@]}
        scanned=$((scanned + batch_size_actual))
        
        # 显示进度
        printf "扫描进度: %d/%d (%.1f%%) \r" "$scanned" "$total_ips" "$(echo "scale=2; $scanned*100/$total_ips" | bc)"
        
        # 使用fping扫描
        fping -c1 -t"${SCAN_TIMEOUT}000" -q "${batch[@]}" 2>&1 | \
        awk -F'[:/]' '/alive/ {print $1, $(NF-1)}' | \
        awk '{print $1, $NF}' >> "$results_file"
    done
    
    echo "" # 换行
    
    # 排序并限制结果数量
    sort -k2 -n "$results_file" | head -n "$IP_SCAN_LIMIT"
    rm -f "$results_file"
}

# 生成hosts文件
generate_hosts_file() {
    local ip=$1
    local latency=$2
    local timestamp
    timestamp=$(date +'%Y-%m-%d %H:%M:%S')
    local hosts_file="google-hosts.txt"
    
    {
        echo "# Google 服务最佳IP"
        echo "# 生成时间: $timestamp"
        if [ -n "$latency" ]; then
            echo "# 使用IP: $ip (延迟: ${latency}ms)"
        else
            echo "# 使用IP: $ip (延迟: 未知)"
        fi
        echo "# GitHub项目: https://github.com/yourusername/google-service-ip-scanner"
        echo ""
        
        # 添加Google翻译域名
        echo "# Google 翻译服务"
        for host in "${HOSTS[@]}"; do
            echo "$ip $host"
        done
        
        # 添加Google Play域名
        echo ""
        echo "# Google Play 商店服务"
        for host in "${GOOGLE_PLAY_HOSTS[@]}"; do
            echo "$ip $host"
        done
    } > "$hosts_file"
    
    echo "已生成 hosts 文件: $hosts_file"
    echo "文件路径: $(pwd)/$hosts_file"
}

# 主扫描函数
perform_scan() {
    echo "[$(date +'%F %T')] 开始扫描Google服务IP"
    echo "----------------------------------------"
    
    # 准备IP列表
    local all_ips=()
    local ipv4_list=()
    local ipv6_list=()
    
    # 下载远程IP列表
    echo "下载IP列表..."
    download_ip_list "$REMOTE_IP_FILE" "/tmp/ipv4.txt"
    download_ip_list "$REMOTE_IPV6_FILE" "/tmp/ipv6.txt"
    
    # 添加远程IP
    if [ -f "/tmp/ipv4.txt" ]; then
        mapfile -t ipv4_list < <(grep -E '^[0-9]' "/tmp/ipv4.txt")
        echo "从远程文件加载 IPv4 数量: ${#ipv4_list[@]}"
    fi
    
    if [ -f "/tmp/ipv6.txt" ]; then
        mapfile -t ipv6_list < <(grep -E '^[0-9a-fA-F:]' "/tmp/ipv6.txt")
        echo "从远程文件加载 IPv6 数量: ${#ipv6_list[@]}"
    fi
    
    # 添加IP段中的随机IP
    echo "生成随机IP..."
    for range in "${IP_RANGES[@]}"; do
        echo "生成范围: $range"
        while IFS= read -r ip; do
            ipv4_list+=("$ip")
        done < <(generate_random_ips "$range")
    done
    
    for range in "${IPV6_RANGES[@]}"; do
        echo "生成范围: $range"
        while IFS= read -r ip; do
            ipv6_list+=("$ip")
        done < <(generate_random_ips "$range")
    done
    
    # 合并并去重
    all_ips=("${ipv4_list[@]}" "${ipv6_list[@]}")
    all_ips=($(printf "%s\n" "${all_ips[@]}" | sort -u))
    
    echo "----------------------------------------"
    echo "扫描参数:"
    echo " - 扫描IP数量: ${#all_ips[@]}"
    echo " - 扫描超时: ${SCAN_TIMEOUT}秒"
    echo " - 并发数: ${SCAN_CONCURRENCY}"
    echo " - 最大结果: ${IP_SCAN_LIMIT}"
    echo "----------------------------------------"
    
    if [ ${#all_ips[@]} -eq 0 ]; then
        echo "错误: 没有可用的IP地址进行扫描"
        return 1
    fi
    
    # 扫描IP
    local results=()
    local scanned_results
    scanned_results=$(scan_ips "${all_ips[@]}")
    
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            results+=("$line")
        fi
    done <<< "$scanned_results"
    
    if [ ${#results[@]} -eq 0 ]; then
        echo "未找到可用IP"
        
        # 在 GitHub Actions 中，使用备用方案
        if [ -n "$GITHUB_ACTIONS" ]; then
            echo "在 GitHub Actions 中使用备用方案"
            # 从配置中选择第一个IP段中的第一个IP作为备用
            local fallback_ip
            fallback_ip=$(generate_random_ips "${IP_RANGES[0]}" | head -n1)
            
            if [ -n "$fallback_ip" ]; then
                echo "使用备用IP: $fallback_ip"
                generate_hosts_file "$fallback_ip" ""
                return 0
            fi
        fi
        
        return 1
    fi
    
    # 显示扫描结果
    echo "找到 ${#results[@]} 个可用IP:"
    for result in "${results[@]}"; do
        ip=$(echo "$result" | awk '{print $1}')
        latency=$(echo "$result" | awk '{print $2}')
        printf "  - %-15s (延迟: %4sms)\n" "$ip" "$latency"
    done
    
    # 选择最佳IP
    local best_result=${results[0]}
    best_ip=$(echo "$best_result" | awk '{print $1}')
    best_latency=$(echo "$best_result" | awk '{print $2}')
    
    echo "----------------------------------------"
    printf "使用最佳IP: %-15s (延迟: %sms)\n" "$best_ip" "$best_latency"
    echo "----------------------------------------"
    
    # 生成hosts文件
    generate_hosts_file "$best_ip" "$best_latency"
}

# 主函数
main() {
    check_dependencies
    perform_scan
}

# 执行入口
if [ "$1" = "daemon" ]; then
    # 守护进程模式
    echo "启动守护进程，每${SCAN_INTERVAL_MINUTES}分钟扫描一次"
    while true; do
        main
        sleep "${SCAN_INTERVAL_MINUTES}m"
    done
else
    # 单次执行
    main
fi
document.addEventListener('DOMContentLoaded', function() {
    const ruleInput = document.getElementById('ruleInput');
    const resultList = document.getElementById('resultList');
    const totalRules = document.getElementById('totalRules');
    const errorCount = document.getElementById('errorCount');
    const warningCount = document.getElementById('warningCount');
    const resultStatus = document.getElementById('resultStatus');
    const clearBtn = document.getElementById('clearBtn');
    const exampleBtn = document.getElementById('exampleBtn');
    const showSidebarBtn = document.getElementById('showSidebarBtn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const closeSidebar = document.getElementById('closeSidebar');
    const rulesList = document.getElementById('rulesList');
    const filterBtns = document.querySelectorAll('.filter-btn');
    
    // 示例规则
    const exampleRules = `! AdGuard Home 规则示例
! 注释以感叹号开头

! 域名屏蔽规则
||example.com^
||ads.example.org^

! 例外规则
@@||example.org^$document
@@||trusted.com^$script

! 正则表达式规则
/ad[a-z]{3}\\.com/
/banner\\d+\\.com/

! 主机规则 (DNS过滤)
127.0.0.1 adserver.com
0.0.0.0 tracking.example.com
::1 localhost

! CSS规则
example.com##.ad-container
example.com#?#div:-abp-has(> .ad-text)

! 无效规则示例（用于测试）
||invalid-domain.com
/ad[server/.com/
adserver.com 127.0.0.1
||example.com^$invalidmodifier
`;
    
    // 在线规则数据
    const onlineRules = [
        {
            id: 1,
            name: 'EasyList',
            description: '最流行的广告拦截规则，拦截大多数常见的广告',
            category: 'ads',
            size: '48K',
            updated: '2天前',
            url: 'https://easylist.to/easylist/easylist.txt'
        },
        {
            id: 2,
            name: 'EasyPrivacy',
            description: '专注于隐私保护，阻止跟踪器和分析工具',
            category: 'privacy',
            size: '36K',
            updated: '1天前',
            url: 'https://easylist.to/easylist/easyprivacy.txt'
        },
        {
            id: 3,
            name: 'Anti-Malware',
            description: '阻止恶意软件、网络钓鱼和危险网站',
            category: 'malware',
            size: '22K',
            updated: '3天前',
            url: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts'
        },
        {
            id: 4,
            name: 'Fanboy\'s Social',
            description: '阻止社交网络按钮和小部件',
            category: 'social',
            size: '12K',
            updated: '5天前',
            url: 'https://fanboy.co.nz/fanboy-social.txt'
        },
        {
            id: 5,
            name: 'ChinaList',
            description: '专门针对中国网站的广告拦截规则',
            category: 'ads',
            size: '32K',
            updated: '1天前',
            url: 'https://raw.githubusercontent.com/cjx82630/cjxlist/master/cjx-annoyance.txt'
        },
        {
            id: 6,
            name: 'Peter Lowe\'s List',
            description: '包含大量广告和跟踪域名的列表',
            category: 'tracking',
            size: '56K',
            updated: '4天前',
            url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=0&mimetype=plaintext'
        }
    ];
    
    // 初始化在线规则列表
    function initRulesList() {
        rulesList.innerHTML = '';
        onlineRules.forEach(rule => {
            const ruleCard = document.createElement('div');
            ruleCard.className = 'rule-card';
            ruleCard.dataset.category = rule.category;
            
            ruleCard.innerHTML = `
                <div class="rule-card-header">
                    <div class="rule-name">${rule.name}</div>
                    <div class="rule-stats">
                        <span><i class="fas fa-file-alt"></i> ${rule.size}</span>
                        <span><i class="fas fa-calendar-alt"></i> ${rule.updated}</span>
                    </div>
                </div>
                <div class="rule-description">${rule.description}</div>
                <div class="rule-actions">
                    <button class="import-btn" data-url="${rule.url}">
                        <i class="fas fa-download"></i> 导入
                    </button>
                </div>
            `;
            
            rulesList.appendChild(ruleCard);
            
            // 为导入按钮添加事件
            ruleCard.querySelector('.import-btn').addEventListener('click', function() {
                importRule(rule.url, rule.name);
            });
        });
    }
    
    // 筛选规则
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除所有按钮的active状态
            filterBtns.forEach(b => b.classList.remove('active'));
            // 添加当前按钮的active状态
            this.classList.add('active');
            
            const category = this.dataset.category;
            
            // 筛选规则卡片
            const ruleCards = document.querySelectorAll('.rule-card');
            ruleCards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
    
    // 导入规则
    function importRule(url, name) {
        // 显示加载状态
        resultStatus.textContent = `加载 ${name}...`;
        resultStatus.style.color = '';
        
        // 使用Fetch API获取规则内容
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${name}: ${response.statusText}`);
                }
                return response.text();
            })
            .then(data => {
                // 将规则添加到输入框
                ruleInput.value = data;
                
                // 验证规则
                validateRules();
                
                // 关闭侧边栏
                if (window.innerWidth < 768) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                }
                
                // 更新状态
                resultStatus.textContent = `已加载 ${name}`;
                resultStatus.style.color = var(--success);
                
                // 滚动到顶部
                window.scrollTo({ top: 0, behavior: 'smooth' });
            })
            .catch(error => {
                console.error('Error fetching rule:', error);
                resultStatus.textContent = `加载失败: ${error.message}`;
                resultStatus.style.color = var(--danger);
                
                // 显示错误信息
                showError(`无法加载规则 ${name}`, error.message);
            });
    }
    
    // 验证规则
    function validateRules() {
        // 清空结果
        resultList.innerHTML = '';
        let errors = 0;
        let warnings = 0;
        let total = 0;
        
        // 获取规则文本
        const rulesText = ruleInput.value.trim();
        
        if (!rulesText) {
            resultList.innerHTML = `
                <div class="result-item">
                    <div class="result-item-header">
                        <i class="fas fa-info-circle"></i>
                        <strong>等待输入规则...</strong>
                    </div>
                    <p class="error-message">在此处粘贴您的AdGuard Home规则以开始分析</p>
                </div>
            `;
            totalRules.textContent = '0';
            errorCount.textContent = '0';
            warningCount.textContent = '0';
            return;
        }
        
        // 按行分割规则
        const lines = rulesText.split('\n');
        
        // 遍历每一行进行验证
        lines.forEach((line, index) => {
            const lineNumber = index + 1;
            const trimmedLine = line.trim();
            
            // 跳过空行和注释
            if (!trimmedLine || trimmedLine.startsWith('!')) {
                return;
            }
            
            total++;
            
            // 验证规则
            const validationResult = validateRule(trimmedLine);
            
            if (validationResult.isError) {
                errors++;
                addResultItem('error', lineNumber, validationResult.message, trimmedLine);
            } else if (validationResult.isWarning) {
                warnings++;
                addResultItem('warning', lineNumber, validationResult.message, trimmedLine);
            }
        });
        
        // 更新统计信息
        totalRules.textContent = total;
        errorCount.textContent = errors;
        warningCount.textContent = warnings;
        
        // 更新状态
        if (errors > 0) {
            resultStatus.textContent = `发现 ${errors} 个错误和 ${warnings} 个警告`;
            resultStatus.style.color = var(--danger);
        } else if (warnings > 0) {
            resultStatus.textContent = `发现 ${warnings} 个警告`;
            resultStatus.style.color = var(--warning);
        } else {
            resultStatus.textContent = '验证通过 - 没有发现错误';
            resultStatus.style.color = var(--success);
        }
    }
    
    // 验证单行规则
    function validateRule(rule) {
        // 检查是否是主机规则
        if (/^\s*([0-9.]{7,15}|::1)\s+\S+\s*$/.test(rule)) {
            // 检查IP地址和域名的顺序
            const parts = rule.trim().split(/\s+/);
            if (parts.length >= 2) {
                const ip = parts[0];
                const domain = parts[1];
                
                // 验证IP地址格式
                if (!/^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^::1$/.test(ip)) {
                    return { isError: true, message: '无效的IP地址格式' };
                }
                
                // 验证域名格式
                if (!/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(domain)) {
                    return { isError: true, message: '无效的域名格式' };
                }
            }
            
            return { isError: false, isWarning: false };
        }
        
        // 检查是否是正则表达式规则
        if (rule.startsWith('/') && rule.endsWith('/')) {
            try {
                // 尝试编译正则表达式
                new RegExp(rule.slice(1, -1));
            } catch (e) {
                return { isError: true, message: '无效的正则表达式语法: ' + e.message };
            }
            
            return { isError: false, isWarning: false };
        }
        
        // 检查是否是CSS规则
        if (rule.includes('##') || rule.includes('#?#') || rule.includes('#@#')) {
            // 简单验证 - 确保格式正确
            const parts = rule.split(/(##|#\?#|#@#)/);
            if (parts.length < 3) {
                return { isError: true, message: 'CSS规则格式不正确' };
            }
            
            return { isError: false, isWarning: false };
        }
        
        // 检查是否是标准AdBlock规则
        if (rule.startsWith('||')) {
            // 检查是否有结束符
            if (!rule.includes('^') && !rule.includes('$')) {
                return { isWarning: true, message: '可能缺少结束符(^)' };
            }
            
            // 检查修饰符
            if (rule.includes('$')) {
                const modifiersPart = rule.split('$')[1];
                const modifiers = modifiersPart.split(',');
                
                for (const modifier of modifiers) {
                    // 验证修饰符名称
                    const validModifiers = ['script', 'image', 'stylesheet', 'object', 'xmlhttprequest', 
                                           'object-subrequest', 'subdocument', 'document', 'elemhide', 
                                           'other', 'background', 'font', 'media', 'popup', 'websocket',
                                           'csp', 'donottrack', 'empty'];
                    
                    if (modifier.includes('=')) {
                        const [name, value] = modifier.split('=');
                        if (!validModifiers.includes(name)) {
                            return { isError: true, message: `无效的修饰符: ${name}` };
                        }
                    } else if (!validModifiers.includes(modifier)) {
                        return { isError: true, message: `无效的修饰符: ${modifier}` };
                    }
                }
            }
            
            return { isError: false, isWarning: false };
        }
        
        // 检查是否是例外规则
        if (rule.startsWith('@@||')) {
            // 检查是否有结束符
            if (!rule.includes('^') && !rule.includes('$')) {
                return { isWarning: true, message: '可能缺少结束符(^)' };
            }
            
            // 与标准规则类似的修饰符检查
            if (rule.includes('$')) {
                const modifiersPart = rule.split('$')[1];
                const modifiers = modifiersPart.split(',');
                
                for (const modifier of modifiers) {
                    const validModifiers = ['script', 'image', 'stylesheet', 'object', 'xmlhttprequest', 
                                           'object-subrequest', 'subdocument', 'document', 'elemhide', 
                                           'other', 'background', 'font', 'media', 'popup', 'websocket',
                                           'csp', 'donottrack', 'empty'];
                    
                    if (modifier.includes('=')) {
                        const [name, value] = modifier.split('=');
                        if (!validModifiers.includes(name)) {
                            return { isError: true, message: `无效的修饰符: ${name}` };
                        }
                    } else if (!validModifiers.includes(modifier)) {
                        return { isError: true, message: `无效的修饰符: ${modifier}` };
                    }
                }
            }
            
            return { isError: false, isWarning: false };
        }
        
        // 如果没有匹配任何已知规则类型
        return { isError: true, message: '无法识别的规则格式' };
    }
    
    // 添加结果项
    function addResultItem(type, lineNumber, message, rule) {
        const item = document.createElement('div');
        item.className = `result-item ${type}`;
        
        const icon = type === 'error' ? 'times-circle' : 'exclamation-triangle';
        
        item.innerHTML = `
            <div class="result-item-header">
                <i class="fas fa-${icon}"></i>
                <span class="line-number">第 ${lineNumber} 行</span>
                <strong>${type === 'error' ? '错误' : '警告'}</strong>
            </div>
            <p class="error-message">${message}</p>
            <div class="rule-example">${rule}</div>
        `;
        
        resultList.appendChild(item);
    }
    
    // 显示错误信息
    function showError(title, message) {
        const errorItem = document.createElement('div');
        errorItem.className = 'result-item error';
        
        errorItem.innerHTML = `
            <div class="result-item-header">
                <i class="fas fa-times-circle"></i>
                <strong>${title}</strong>
            </div>
            <p class="error-message">${message}</p>
        `;
        
        resultList.innerHTML = '';
        resultList.appendChild(errorItem);
        
        // 更新统计信息
        totalRules.textContent = '0';
        errorCount.textContent = '1';
        warningCount.textContent = '0';
    }
    
    // 事件监听器
    clearBtn.addEventListener('click', function() {
        ruleInput.value = '';
        validateRules();
    });
    
    exampleBtn.addEventListener('click', function() {
        ruleInput.value = exampleRules;
        validateRules();
    });
    
    ruleInput.addEventListener('input', validateRules);
    
    showSidebarBtn.addEventListener('click', function() {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
    });
    
    closeSidebar.addEventListener('click', function() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
    
    sidebarOverlay.addEventListener('click', function() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
    
    // 初始化在线规则列表
    initRulesList();
    
    // 初始验证
    validateRules();
});    
(function() {
    'use strict';
    
    console.log('[DF助手] autoSignIn 模块开始加载');

    const NSAutoSignIn = {
        id: 'autoSignIn',
        name: '自动签到',
        description: '自动完成每日签到，支持随机和固定模式',

        config: {
            storage: {
                STATUS: 'df_signin_status',
                LAST_DATE: 'df_signin_last_date',
                LAST_RUN: 'df_autosignin_last_run',
                DELAY_RANGE: 'df_autosignin_delay_range'
            },
            modes: {
                DISABLED: 0,
                RANDOM: 1,
                FIXED: 2,
                PEAK_AVOIDANCE: 3
            },
            timeout: 10000,
            defaultDelayRange: { min: 5, max: 30 }, // 默认5-30分钟延迟
            retryIntervals: [1000, 3000, 5000], // 重试间隔
            errors: {
                ALREADY_SIGNED: '今天已完成签到，请勿重复操作'
            }
        },

        settings: {
            items: [
                {
                    id: 'mode',
                    type: 'select',
                    label: '签到模式',
                    default: 0,
                    value: () => GM_getValue('df_signin_status', 0),
                    options: [
                        { value: 0, label: '禁用自动签到' },
                        { value: 1, label: '随机签到模式' },
                        { value: 2, label: '固定签到模式' },
                        { value: 3, label: '错峰签到模式' }
                    ]
                },
                {
                    id: 'delayRange',
                    type: 'range',
                    label: '错峰延迟范围（分钟）',
                    min: 1,
                    max: 120,
                    default: 30,
                    value: () => GM_getValue('df_autosignin_delay_range', 30),
                    description: '错峰模式下的随机延迟上限'
                },
                {
                    id: 'status',
                    type: 'info',
                    label: '最近签到',
                    value: () => {
                        const lastRun = GM_getValue('df_autosignin_last_run');
                        const lastDate = GM_getValue('df_signin_last_date');
                        if (!lastRun || !lastDate) return '暂无记录';
                        return `${lastDate} ${new Date(lastRun).toLocaleTimeString()}`;
                    }
                },
                {
                    id: 'retry',
                    type: 'button',
                    label: '立即签到',
                    onClick: async () => {
                        const status = GM_getValue('df_signin_status', 0);
                        if (status === 0) return;

                        GM_setValue('df_signin_last_date', '');
                        await NSAutoSignIn.executeAutoSignIn();
                    }
                }
            ],
            
            handleChange(settingId, value, settingsManager) {
                if (settingId === 'mode') {
                    settingsManager.cacheValue('df_signin_status', parseInt(value));
                } else if (settingId === 'delayRange') {
                    settingsManager.cacheValue('df_autosignin_delay_range', parseInt(value));
                }
            }
        },

        utils: {
            async waitForElement(selector, parent = document, timeout = 10000) {
                const element = parent.querySelector(selector);
                if (element) return element;
            
                return new Promise((resolve) => {
                    const observer = new MutationObserver((mutations, obs) => {
                        const element = parent.querySelector(selector);
                        if (element) {
                            obs.disconnect();
                            resolve(element);
                        }
                    });
            
                    observer.observe(parent, {
                        childList: true,
                        subtree: true
                    });

                    setTimeout(() => {
                        observer.disconnect();
                        resolve(null);
                    }, timeout);
                });
            },

            checkLoginStatus() {
                console.log('[DF助手] 开始检查登录状态');
                
                if (unsafeWindow.__config__ && unsafeWindow.__config__.user) {
                    const user = unsafeWindow.__config__.user;
                    console.log(`[DF助手] 当前登录用户 ${user.member_name} (ID ${user.member_id})`);
                    return true;
                }

                console.log('[DF助手] 未检测到用户登录信息');
                return false;
            },

            showToast(message, type = 'info') {
                const toast = document.createElement('div');
                toast.className = `ns-signin-toast ns-signin-toast-${type}`;
                toast.textContent = message;
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    toast.classList.add('ns-signin-toast-fade-out');
                    setTimeout(() => toast.remove(), 300);
                }, 3000);
            }
        },

        async init() {
            console.log('[DF助手] 初始化自动签到模块');
            await this.setupSignIn();
            console.log('[DF助手] 自动签到模块初始化完成');
        },

        async setupSignIn() {
            console.log('[DF助手] 检查登录状态...');
            
            if (!this.utils.checkLoginStatus()) {
                console.log('[DF助手] 未检测到完整的用户信息，跳过签到');
                return false;
            }

            console.log('[DF助手] 用户已登录，继续执行签到');
            await this.executeAutoSignIn();
            return true;
        },

        async executeAutoSignIn() {
            const status = GM_getValue(this.config.storage.STATUS, this.config.modes.DISABLED);
            if (status === this.config.modes.DISABLED) {
                console.log('[DF助手] 自动签到已禁用');
                return;
            }

            const today = new Date().toLocaleDateString();
            const lastSignDate = GM_getValue(this.config.storage.LAST_DATE);

            console.log('[DF助手] 上次签到日期:', lastSignDate);
            console.log('[DF助手] 当前日期:', today);

            if (lastSignDate !== today) {
                console.log('[DF助手] 开始执行今日签到');

                // 错峰签到模式
                if (status === this.config.modes.PEAK_AVOIDANCE) {
                    const delayMinutes = this.calculatePeakAvoidanceDelay();
                    console.log(`[DF助手] 错峰签到模式，将在${delayMinutes}分钟后执行`);
                    setTimeout(async () => {
                        await this.performSignInWithRetry(true);
                    }, delayMinutes * 60 * 1000);
                    return;
                }

                await this.performSignInWithRetry(status === this.config.modes.RANDOM);
            } else {
                console.log('[DF助手] 今日已签到，跳过');
            }
        },

        calculatePeakAvoidanceDelay() {
            const delayRange = GM_getValue(this.config.storage.DELAY_RANGE, this.config.defaultDelayRange.max);
            return Math.floor(Math.random() * delayRange) + this.config.defaultDelayRange.min;
        },

        async performSignInWithRetry(isRandom, maxRetries = 3) {
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    await this.performSignIn(isRandom);
                    GM_setValue(this.config.storage.LAST_RUN, Date.now());
                    GM_setValue(this.config.storage.LAST_DATE, new Date().toLocaleDateString());
                    return;
                } catch (error) {
                    console.error(`[DF助手] 签到失败 (${attempt}/${maxRetries}):`, error);

                    if (attempt < maxRetries) {
                        const retryDelay = this.config.retryIntervals[attempt - 1] || 5000;
                        console.log(`[DF助手] ${retryDelay}ms 后重试...`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    } else {
                        console.error('[DF助手] 签到最终失败，已达到最大重试次数');
                        this.utils.showToast('签到失败，请稍后手动尝试', 'error');
                    }
                }
            }
        },

        async performSignIn(isRandom) {
            try {
                console.log(`[DF助手] 执行${isRandom ? '随机' : '固定'}签到`);
                console.log('[DF助手] 当前页面URL:', window.location.href);

                const response = await this.sendSignInRequest(isRandom);
                console.log('[DF助手] 签到响应:', response);
                
                if (response.success) {
                    console.log(`[DF助手] 签到成功！获得${response.gain}个鸡腿，当前共有${response.current}个鸡腿`);
                    this.utils.showToast(`签到成功！获得${response.gain}个鸡腿`, 'success');
                    GM_setValue(this.config.storage.LAST_DATE, new Date().toLocaleDateString());
                } else if (response.message === this.config.errors.ALREADY_SIGNED) {
                    console.log('[DF助手] 今日已签到');
                    this.utils.showToast('今日已签到', 'info');
                    GM_setValue(this.config.storage.LAST_DATE, new Date().toLocaleDateString());
                } else {
                    console.log('[DF助手] 签到失败:', response.message);
                    this.utils.showToast(`签到失败: ${response.message}`, 'error');
                }
            } catch (error) {
                console.error('[DF助手] 签到请求出错:', error);
                console.log('[DF助手] 错误详情:', error.message);
                this.utils.showToast('签到失败，请稍后重试', 'error');
            }
        },

        async sendSignInRequest(isRandom) {
            // 站点特定的签到接口
            const endpoints = this.getSignInEndpoints();
            let lastError = null;

            // 尝试主接口和备用接口
            for (const endpoint of endpoints) {
                try {
                    const url = `${endpoint}?random=${isRandom}`;
                    console.log('[DF助手] 发送签到请求:', url);

                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'accept': 'application/json, text/plain, */*',
                            'content-type': 'application/json',
                            'x-requested-with': 'XMLHttpRequest'
                        },
                        credentials: 'same-origin'
                    });

                    const data = await response.json();

                    if (!response.ok && !data.message) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }

                    console.log('[DF助手] 签到请求成功:', endpoint);
                    return data;
                } catch (error) {
                    console.warn(`[DF助手] 接口 ${endpoint} 失败:`, error.message);
                    lastError = error;
                    continue;
                }
            }

            console.error('[DF助手] 所有接口都失败了');
            throw lastError || new Error('所有签到接口都不可用');
        },

        getSignInEndpoints() {
            // 根据当前站点返回可用的签到接口
            if (window.DF.site.isDeepFlood) {
                return ['/api/attendance', '/api/checkin', '/attendance'];
            } else if (window.DF.site.isNodeSeek) {
                return ['/api/attendance', '/api/sign', '/checkin'];
            } else {
                return ['/api/attendance', '/api/checkin'];
            }
        }
    };

    console.log('[DF助手] 等待模块系统就绪');
    let retryCount = 0;
    const maxRetries = 50;

    const waitForDF = () => {
        retryCount++;
        console.log(`[DF助手] 第 ${retryCount} 次尝试注册 autoSignIn 模块`);
        
        if (typeof window.DFRegisterModule === 'function') {
            console.log('[DF助手] 模块系统就绪，开始注册 autoSignIn');
            window.DFRegisterModule(NSAutoSignIn);
            console.log('[DF助手] autoSignIn 模块注册请求已发送');
        } else {
            console.log('[DF助手] 模块系统未就绪');
            if (retryCount < maxRetries) {
                setTimeout(waitForDF, 100);
            } else {
                console.error('[DF助手] 模块系统等待超时，autoSignIn 模块注册失败');
            }
        }
    };

    waitForDF();
    console.log('[DF助手] autoSignIn 模块加载完成');
})();
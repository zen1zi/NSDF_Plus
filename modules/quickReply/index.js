(function() {
    'use strict';
    
    console.log('[DF助手] quickReply 模块开始加载');

    const NSQuickReply = {
        id: 'quickReply',
        name: '快捷回复',
        description: '快速填充预设文本并发送回复',

        config: {
            storage: {
                ENABLE_QUICK_FILL: 'df_quick_reply_enable_fill',
                ENABLE_QUICK_SEND: 'df_quick_reply_enable_send',
                ENABLE_AUTO_REPLY: 'df_quick_reply_enable_auto_reply',
                CUSTOM_PRESETS: 'df_quick_reply_presets',
                KEYBOARD_SHORTCUTS: 'df_quick_reply_keyboard_shortcuts',
                TEMPLATES: 'df_quick_reply_templates'
            },
            defaultPresets: [
                { text: '感谢分享', label: '感谢', icon: '👍' },
                { text: '顶一下', label: '顶', icon: '⬆️' },
                { text: '收藏了，谢谢', label: '收藏', icon: '⭐' },
                { text: '学习了，感谢分享', label: '学习', icon: '📚' }
            ],
            defaultTemplates: [
                { name: '问题反馈', content: '## 问题描述\n\n\n## 复现步骤\n1. \n2. \n3. \n\n## 期望结果\n\n\n## 实际结果\n\n' },
                { name: '资源分享', content: '## 资源信息\n**名称：**\n**版本：**\n**大小：**\n\n## 下载地址\n\n\n## 使用说明\n\n' },
                { name: '教程分享', content: '## 前言\n\n\n## 准备工作\n\n\n## 详细步骤\n\n\n## 总结\n\n' }
            ],
            keyboardShortcuts: {
                quickSubmit: 'Alt+Enter',
                fillTemplate: 'Ctrl+T',
                clearContent: 'Ctrl+Shift+C'
            }
        },

        settings: {
            items: [
                {
                    id: 'enable_fill',
                    type: 'switch',
                    label: '启用快捷填充',
                    default: false,
                    value: () => GM_getValue('df_quick_reply_enable_fill', false)
                },
                {
                    id: 'enable_send',
                    type: 'switch',
                    label: '启用快速发送',
                    default: false,
                    value: () => GM_getValue('df_quick_reply_enable_send', false)
                },
                {
                    id: 'enable_auto_reply',
                    type: 'switch',
                    label: '自动点击回复',
                    default: true,
                    value: () => GM_getValue('df_quick_reply_enable_auto_reply', true)
                },
                {
                    id: 'keyboard_shortcuts',
                    type: 'switch',
                    label: '启用键盘快捷键',
                    default: true,
                    value: () => GM_getValue('df_quick_reply_keyboard_shortcuts', true),
                    description: 'Alt+Enter: 快速提交, Ctrl+T: 插入模板, Ctrl+Shift+C: 清空内容'
                },
                {
                    id: 'manage_presets',
                    type: 'button',
                    label: '管理快捷回复',
                    onClick: () => {
                        NSQuickReply.utils.showPresetsManager();
                    }
                },
                {
                    id: 'manage_templates',
                    type: 'button',
                    label: '管理回复模板',
                    onClick: () => {
                        NSQuickReply.utils.showTemplatesManager();
                    }
                }
            ],
            
            handleChange(settingId, value, settingsManager) {
                if (settingId === 'enable_fill') {
                    settingsManager.cacheValue('df_quick_reply_enable_fill', value);
                } else if (settingId === 'enable_send') {
                    settingsManager.cacheValue('df_quick_reply_enable_send', value);
                } else if (settingId === 'enable_auto_reply') {
                    settingsManager.cacheValue('df_quick_reply_enable_auto_reply', value);
                } else if (settingId === 'keyboard_shortcuts') {
                    settingsManager.cacheValue('df_quick_reply_keyboard_shortcuts', value);
                    if (value) {
                        NSQuickReply.enableKeyboardShortcuts();
                    } else {
                        NSQuickReply.disableKeyboardShortcuts();
                    }
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

            getPresets() {
                const savedPresets = GM_getValue(NSQuickReply.config.storage.CUSTOM_PRESETS);
                return savedPresets ? JSON.parse(savedPresets) : NSQuickReply.config.defaultPresets;
            },

            savePresets(presets) {
                GM_setValue(NSQuickReply.config.storage.CUSTOM_PRESETS, JSON.stringify(presets));
            },

            getTemplates() {
                const savedTemplates = GM_getValue(NSQuickReply.config.storage.TEMPLATES);
                return savedTemplates ? JSON.parse(savedTemplates) : NSQuickReply.config.defaultTemplates;
            },

            saveTemplates(templates) {
                GM_setValue(NSQuickReply.config.storage.TEMPLATES, JSON.stringify(templates));
            },

            showTemplatesManager() {
                const modal = document.createElement('div');
                modal.className = 'ns-quick-reply-modal';

                const content = document.createElement('div');
                content.className = 'ns-quick-reply-modal-content templates-manager';
                if (document.body.classList.contains('dark-layout')) {
                    content.classList.add('dark');
                }

                const title = document.createElement('div');
                title.className = 'ns-quick-reply-modal-title';
                title.innerHTML = '📝 管理回复模板';

                const closeBtn = document.createElement('div');
                closeBtn.className = 'ns-quick-reply-modal-close';
                closeBtn.innerHTML = '×';
                closeBtn.onclick = () => modal.remove();

                const body = document.createElement('div');
                body.className = 'ns-quick-reply-modal-body';

                const templates = this.getTemplates();

                // 模板列表
                const templatesList = document.createElement('div');
                templatesList.className = 'templates-list';

                templates.forEach((template, index) => {
                    const item = document.createElement('div');
                    item.className = 'template-item';
                    item.innerHTML = `
                        <div class="template-header">
                            <strong>${template.name}</strong>
                            <div class="template-actions">
                                <button class="edit-btn" data-index="${index}">编辑</button>
                                <button class="delete-btn" data-index="${index}">删除</button>
                            </div>
                        </div>
                        <div class="template-preview">${template.content.substring(0, 100)}...</div>
                    `;
                    templatesList.appendChild(item);
                });

                // 添加新模板按钮
                const addBtn = document.createElement('button');
                addBtn.className = 'add-template-btn';
                addBtn.textContent = '+ 添加新模板';
                addBtn.onclick = () => this.editTemplate(null, () => {
                    modal.remove();
                    this.showTemplatesManager();
                });

                body.appendChild(templatesList);
                body.appendChild(addBtn);

                // 事件处理
                body.addEventListener('click', (e) => {
                    if (e.target.classList.contains('edit-btn')) {
                        const index = parseInt(e.target.dataset.index);
                        this.editTemplate(templates[index], () => {
                            modal.remove();
                            this.showTemplatesManager();
                        });
                    } else if (e.target.classList.contains('delete-btn')) {
                        const index = parseInt(e.target.dataset.index);
                        this.showConfirmDialog({
                            title: '删除模板',
                            content: `确定要删除模板 "${templates[index].name}" 吗？`,
                            type: 'warning',
                            onConfirm: () => {
                                templates.splice(index, 1);
                                this.saveTemplates(templates);
                                modal.remove();
                                this.showTemplatesManager();
                            }
                        });
                    }
                });

                content.appendChild(title);
                content.appendChild(closeBtn);
                content.appendChild(body);
                modal.appendChild(content);

                document.body.appendChild(modal);
            },

            editTemplate(template, onSave) {
                const modal = document.createElement('div');
                modal.className = 'ns-quick-reply-modal';

                const content = document.createElement('div');
                content.className = 'ns-quick-reply-modal-content template-editor';
                if (document.body.classList.contains('dark-layout')) {
                    content.classList.add('dark');
                }

                const title = document.createElement('div');
                title.className = 'ns-quick-reply-modal-title';
                title.innerHTML = template ? '📝 编辑模板' : '📝 新建模板';

                const closeBtn = document.createElement('div');
                closeBtn.className = 'ns-quick-reply-modal-close';
                closeBtn.innerHTML = '×';
                closeBtn.onclick = () => modal.remove();

                const body = document.createElement('div');
                body.className = 'ns-quick-reply-modal-body';

                body.innerHTML = `
                    <div class="form-group">
                        <label>模板名称：</label>
                        <input type="text" class="template-name" value="${template ? template.name : ''}" placeholder="输入模板名称">
                    </div>
                    <div class="form-group">
                        <label>模板内容：</label>
                        <textarea class="template-content" rows="10" placeholder="输入模板内容，支持 Markdown 格式">${template ? template.content : ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button class="cancel-btn">取消</button>
                        <button class="save-btn">保存</button>
                    </div>
                `;

                const nameInput = body.querySelector('.template-name');
                const contentTextarea = body.querySelector('.template-content');
                const saveBtn = body.querySelector('.save-btn');
                const cancelBtn = body.querySelector('.cancel-btn');

                saveBtn.onclick = () => {
                    const name = nameInput.value.trim();
                    const content = contentTextarea.value.trim();

                    if (!name || !content) {
                        alert('请输入模板名称和内容');
                        return;
                    }

                    const templates = this.getTemplates();

                    if (template) {
                        // 编辑现有模板
                        const index = templates.findIndex(t => t.name === template.name);
                        if (index >= 0) {
                            templates[index] = { name, content };
                        }
                    } else {
                        // 新建模板
                        templates.push({ name, content });
                    }

                    this.saveTemplates(templates);
                    modal.remove();
                    onSave?.();
                };

                cancelBtn.onclick = () => modal.remove();

                content.appendChild(title);
                content.appendChild(closeBtn);
                content.appendChild(body);
                modal.appendChild(content);

                document.body.appendChild(modal);
                nameInput.focus();
            },

            showConfirmDialog(options) {
                const { title, content, onConfirm, onCancel, confirmText = '确定', cancelText = '取消', type = 'info' } = options;
                
                const dialog = document.createElement('div');
                dialog.className = 'ns-quick-reply-dialog';
                
                dialog.innerHTML = `
                    <div class="ns-quick-reply-dialog-content ${type}">
                        <div class="ns-quick-reply-dialog-icon">
                            ${type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️'}
                        </div>
                        <div class="ns-quick-reply-dialog-header">${title}</div>
                        <div class="ns-quick-reply-dialog-body">${content}</div>
                        <div class="ns-quick-reply-dialog-footer">
                            <button class="ns-quick-reply-dialog-btn cancel">${cancelText}</button>
                            <button class="ns-quick-reply-dialog-btn confirm ${type}">${confirmText}</button>
                        </div>
                    </div>
                `;
                
                const confirmBtn = dialog.querySelector('.confirm');
                const cancelBtn = dialog.querySelector('.cancel');
                
                confirmBtn.onclick = () => {
                    onConfirm?.();
                    dialog.remove();
                };
                
                cancelBtn.onclick = () => {
                    onCancel?.();
                    dialog.remove();
                };
                
                dialog.onclick = (e) => {
                    if (e.target === dialog) {
                        dialog.remove();
                        onCancel?.();
                    }
                };
                
                document.body.appendChild(dialog);
                
                cancelBtn.focus();
            },

            showPresetsManager() {
                const modal = document.createElement('div');
                modal.className = 'ns-quick-reply-modal';
                
                const content = document.createElement('div');
                content.className = 'ns-quick-reply-modal-content';
                if (document.body.classList.contains('dark-layout')) {
                    content.classList.add('dark');
                }
                
                const title = document.createElement('div');
                title.className = 'ns-quick-reply-modal-title';
                title.textContent = '管理快捷回复';
                
                const closeBtn = document.createElement('div');
                closeBtn.className = 'ns-quick-reply-modal-close';
                closeBtn.textContent = '×';
                closeBtn.onclick = () => modal.remove();
                
                const presetsList = document.createElement('div');
                presetsList.className = 'ns-quick-reply-presets-list';
                
                const presets = this.getPresets();
                
                const renderPreset = (preset, index) => {
                    const item = document.createElement('div');
                    item.className = 'ns-quick-reply-preset-item';
                    
                    const inputsContainer = document.createElement('div');
                    inputsContainer.className = 'ns-quick-reply-inputs-container';
                    
                    const iconInput = document.createElement('input');
                    iconInput.type = 'text';
                    iconInput.className = 'ns-quick-reply-input icon';
                    iconInput.value = preset.icon;
                    iconInput.placeholder = '图标';
                    
                    const labelInput = document.createElement('input');
                    labelInput.type = 'text';
                    labelInput.className = 'ns-quick-reply-input label';
                    labelInput.value = preset.label;
                    labelInput.placeholder = '按钮文字';
                    
                    const textInput = document.createElement('input');
                    textInput.type = 'text';
                    textInput.className = 'ns-quick-reply-input text';
                    textInput.value = preset.text;
                    textInput.placeholder = '回复内容';
                    
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'ns-quick-reply-delete-btn';
                    deleteBtn.textContent = '删除';
                    deleteBtn.onclick = () => {
                        this.showConfirmDialog({
                            title: '删除确认',
                            content: `确定要删除"${preset.label}"这个快捷回复吗？`,
                            type: 'warning',
                            onConfirm: () => {
                                presets.splice(index, 1);
                                this.savePresets(presets);
                                item.remove();
                            }
                        });
                    };
                    
                    [iconInput, labelInput, textInput].forEach(input => {
                        input.onchange = () => {
                            presets[index] = {
                                icon: iconInput.value,
                                label: labelInput.value,
                                text: textInput.value
                            };
                            this.savePresets(presets);
                        };
                    });
                    
                    inputsContainer.appendChild(iconInput);
                    inputsContainer.appendChild(labelInput);
                    inputsContainer.appendChild(textInput);
                    item.appendChild(inputsContainer);
                    item.appendChild(deleteBtn);
                    
                    return item;
                };
                
                presets.forEach((preset, index) => {
                    presetsList.appendChild(renderPreset(preset, index));
                });
                
                const addBtn = document.createElement('button');
                addBtn.className = 'ns-quick-reply-add-btn';
                addBtn.textContent = '添加快捷回复';
                addBtn.onclick = () => {
                    const newPreset = { icon: '💬', label: '新按钮', text: '新回复内容' };
                    presets.push(newPreset);
                    this.savePresets(presets);
                    presetsList.appendChild(renderPreset(newPreset, presets.length - 1));
                };
                
                const resetBtn = document.createElement('button');
                resetBtn.className = 'ns-quick-reply-reset-btn';
                resetBtn.textContent = '恢复默认';
                resetBtn.onclick = () => {
                    this.showConfirmDialog({
                        title: '恢复默认确认',
                        content: '确定要恢复默认快捷回复吗？当前的自定义内容将被清除。',
                        type: 'warning',
                        onConfirm: () => {
                            this.savePresets(NSQuickReply.config.defaultPresets);
                            presetsList.innerHTML = '';
                            NSQuickReply.config.defaultPresets.forEach((preset, index) => {
                                presetsList.appendChild(renderPreset(preset, index));
                            });
                        }
                    });
                };
                
                content.appendChild(title);
                content.appendChild(closeBtn);
                content.appendChild(presetsList);
                content.appendChild(addBtn);
                content.appendChild(resetBtn);
                modal.appendChild(content);
                
                document.body.appendChild(modal);
                
                modal.onclick = (e) => {
                    if (e.target === modal) {
                        modal.remove();
                    }
                };
            },

            createQuickReplyButtons() {
                const buttonsContainer = document.createElement('div');
                buttonsContainer.className = 'ns-quick-reply-buttons';
                if (document.body.classList.contains('dark-layout')) {
                    buttonsContainer.classList.add('dark');
                }
                
                const presets = this.getPresets();
                presets.forEach(preset => {
                    const button = document.createElement('button');
                    button.className = 'ns-quick-reply-btn';
                    button.innerHTML = `<span class="ns-quick-reply-icon">${preset.icon}</span>${preset.label}`;
                    button.title = preset.text;
                    button.onclick = async (e) => {
                        const contentItem = e.target.closest('.content-item');
                        if (!contentItem) return;

                        
                        const lastMenuItem = contentItem.querySelector('.comment-menu .menu-item:last-child');
                        if (!lastMenuItem) return;

                        
                        const isEditButton = lastMenuItem.querySelector('svg use[href="#edit"]') !== null;
                        const enableAutoReply = GM_getValue('df_quick_reply_enable_auto_reply', true);

                        
                        if (!isEditButton && enableAutoReply) {
                            lastMenuItem.click();
                            
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }

                        
                        const codeMirror = document.querySelector('.CodeMirror');
                        if (!codeMirror || !codeMirror.CodeMirror) return;
                        
                        const cm = codeMirror.CodeMirror;
                        const currentContent = cm.getValue();
                        const newContent = currentContent 
                            ? currentContent.trim() + '\n' + preset.text
                            : preset.text;
                        
                        cm.setValue(newContent);
                        cm.setCursor(cm.lineCount(), 0);
                        
                        if (GM_getValue('df_quick_reply_enable_send', false)) {
                            const submitBtn = document.querySelector('.topic-select button.submit.btn');
                            if (submitBtn) {
                                submitBtn.click();
                            }
                        }
                    };
                    buttonsContainer.appendChild(button);
                });
                
                return buttonsContainer;
            },

            addQuickReplyButtons() {
                const contentItems = document.querySelectorAll('.content-item');
                contentItems.forEach(item => {
                    if (item.querySelector('.ns-quick-reply-buttons')) return;
                    
                    const menu = item.querySelector('.comment-menu');
                    if (menu) {
                        const buttons = this.createQuickReplyButtons();
                        menu.parentNode.insertBefore(buttons, menu.nextSibling);
                    }
                });
            }
        },

        keyboardShortcutHandler: null,

        enableKeyboardShortcuts() {
            if (this.keyboardShortcutHandler) return;

            this.keyboardShortcutHandler = (e) => {
                // Alt + Enter: 快速提交
                if (e.altKey && e.key === 'Enter') {
                    e.preventDefault();
                    const activeTextarea = document.activeElement;
                    if (activeTextarea && activeTextarea.tagName === 'TEXTAREA') {
                        const submitBtn = activeTextarea.closest('form')?.querySelector('button[type="submit"], .submit-btn, .post-btn');
                        if (submitBtn) {
                            submitBtn.click();
                        }
                    }
                }
                // Ctrl + T: 插入模板
                else if (e.ctrlKey && e.key === 't') {
                    e.preventDefault();
                    const activeTextarea = document.activeElement;
                    if (activeTextarea && activeTextarea.tagName === 'TEXTAREA') {
                        this.showTemplateSelector(activeTextarea);
                    }
                }
                // Ctrl + Shift + C: 清空内容
                else if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                    e.preventDefault();
                    const activeTextarea = document.activeElement;
                    if (activeTextarea && activeTextarea.tagName === 'TEXTAREA') {
                        activeTextarea.value = '';
                        activeTextarea.focus();
                    }
                }
            };

            document.addEventListener('keydown', this.keyboardShortcutHandler);
            console.log('[DF助手] 键盘快捷键已启用');
        },

        disableKeyboardShortcuts() {
            if (this.keyboardShortcutHandler) {
                document.removeEventListener('keydown', this.keyboardShortcutHandler);
                this.keyboardShortcutHandler = null;
                console.log('[DF助手] 键盘快捷键已禁用');
            }
        },

        showTemplateSelector(textarea) {
            const templates = this.utils.getTemplates();
            if (templates.length === 0) {
                alert('暂无可用模板，请先在设置中添加模板');
                return;
            }

            const modal = document.createElement('div');
            modal.className = 'ns-quick-reply-modal template-selector';

            const content = document.createElement('div');
            content.className = 'ns-quick-reply-modal-content';
            if (document.body.classList.contains('dark-layout')) {
                content.classList.add('dark');
            }

            content.innerHTML = `
                <div class="ns-quick-reply-modal-title">📝 选择模板</div>
                <div class="ns-quick-reply-modal-close">×</div>
                <div class="template-selector-list">
                    ${templates.map((template, index) => `
                        <div class="template-selector-item" data-index="${index}">
                            <div class="template-name">${template.name}</div>
                            <div class="template-preview">${template.content.substring(0, 80)}...</div>
                        </div>
                    `).join('')}
                </div>
                <div class="template-selector-footer">
                    <small>按 ESC 关闭 | 点击模板插入内容</small>
                </div>
            `;

            const closeBtn = content.querySelector('.ns-quick-reply-modal-close');
            closeBtn.onclick = () => modal.remove();

            content.addEventListener('click', (e) => {
                const item = e.target.closest('.template-selector-item');
                if (item) {
                    const index = parseInt(item.dataset.index);
                    const template = templates[index];

                    // 插入模板内容
                    const cursorPos = textarea.selectionStart;
                    const textBefore = textarea.value.substring(0, cursorPos);
                    const textAfter = textarea.value.substring(textarea.selectionEnd);

                    textarea.value = textBefore + template.content + textAfter;
                    textarea.focus();
                    textarea.setSelectionRange(cursorPos + template.content.length, cursorPos + template.content.length);

                    modal.remove();
                }
            });

            // ESC 键关闭
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escHandler);
                }
            };
            document.addEventListener('keydown', escHandler);

            modal.appendChild(content);
            document.body.appendChild(modal);
        },

        async init() {
            console.log('[DF助手] 初始化快捷回复模块');

            try {
                if (!GM_getValue('df_quick_reply_enable_fill', false)) {
                    console.log('[DF助手] 快捷填充未启用，跳过初始化');
                    return;
                }

                // 启用键盘快捷键
                const keyboardEnabled = GM_getValue(this.config.storage.KEYBOARD_SHORTCUTS, true);
                if (keyboardEnabled) {
                    this.enableKeyboardShortcuts();
                }

                console.log('[DF助手] 加载快捷回复样式');
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: 'https://raw.githubusercontent.com/zen1zi/NSDF_Plus/main/modules/quickReply/style.css',
                    onload: (response) => {
                        if (response.status === 200) {
                            console.log('[DF助手] 快捷回复样式加载成功');
                            GM_addStyle(response.responseText);
                        } else {
                            console.error('[DF助手] 加载快捷回复样式失败:', response.status);
                        }
                    },
                    onerror: (error) => {
                        console.error('[DF助手] 加载快捷回复样式出错:', error);
                    }
                });
                
                const observer = new MutationObserver((mutations) => {
                    let themeChanged = false;
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                            themeChanged = true;
                        }
                    });

                    if (themeChanged) {
                        const isDarkMode = document.body.classList.contains('dark-layout');
                        const buttons = document.querySelectorAll('.ns-quick-reply-buttons');
                        buttons.forEach(btn => {
                            btn.classList.toggle('dark', isDarkMode);
                        });
                    }

                    this.utils.addQuickReplyButtons();
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class']
                });
                
                this.utils.addQuickReplyButtons();
                console.log('[DF助手] 快捷回复模块初始化完成');
                
            } catch (error) {
                console.error('[DF助手] 快捷回复模块初始化失败:', error);
            }
        }
    };

    console.log('[DF助手] 等待模块系统就绪');
    let retryCount = 0;
    const maxRetries = 50;

    const waitForDF = () => {
        retryCount++;
        console.log(`[DF助手] 第 ${retryCount} 次尝试注册 quickReply 模块`);
        
        if (typeof window.DFRegisterModule === 'function') {
            console.log('[DF助手] 模块系统就绪，开始注册 quickReply');
            window.DFRegisterModule(NSQuickReply);
            console.log('[DF助手] quickReply 模块注册请求已发送');
        } else {
            console.log('[DF助手] 模块系统未就绪');
            if (retryCount < maxRetries) {
                setTimeout(waitForDF, 100);
            } else {
                console.error('[DF助手] 模块系统等待超时，quickReply 模块注册失败');
            }
        }
    };

    waitForDF();
    console.log('[DF助手] quickReply 模块加载完成 v0.0.9');
})(); 
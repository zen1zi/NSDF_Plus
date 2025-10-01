(function() {
    'use strict';
    
    console.log('[DF助手] contentPreview 模块开始加载');

    const resolveSiteUrl = (path) => {
        if (window.DF && typeof window.DF.getSiteUrl === 'function') {
            return window.DF.getSiteUrl(path);
        }

        if (typeof path !== 'string' || path.length === 0) {
            return window.location.origin;
        }

        if (/^https?:\/\//i.test(path)) {
            return path;
        }

        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${window.location.origin}${normalizedPath}`;
    };

    const NSContentPreview = {
        id: 'contentPreview',
        name: '内容预览',
        description: '自动获取帖子内容并显示在标题下方',

        config: {
            storage: {
                ENABLED: 'df_content_preview_enabled',
                SHOW_COMMENTS: 'df_content_preview_show_comments',
                FORMAT_MODE: 'df_content_preview_format_mode',
                MOBILE_ENABLED: 'df_content_preview_mobile_enabled'
            },
            formats: {
                AUTO: 'auto',
                MARKDOWN: 'markdown',
                BBCODE: 'bbcode',
                HTML: 'html'
            }
        },

        settings: {
            items: [
                {
                    id: 'enabled',
                    type: 'switch',
                    label: '启用内容预览',
                    default: true,
                    value: () => GM_getValue('df_content_preview_enabled', true)
                },
                {
                    id: 'showComments',
                    type: 'switch',
                    label: '显示评论区',
                    default: true,
                    value: () => GM_getValue('df_content_preview_show_comments', true)
                },
                {
                    id: 'formatMode',
                    type: 'select',
                    label: '内容格式模式',
                    default: 'auto',
                    value: () => GM_getValue('df_content_preview_format_mode', 'auto'),
                    options: [
                        { value: 'auto', label: '自动识别' },
                        { value: 'markdown', label: 'Markdown' },
                        { value: 'bbcode', label: 'BBCode' },
                        { value: 'html', label: 'HTML' }
                    ],
                    description: '选择内容渲染格式，自动模式根据站点特性选择'
                },
                {
                    id: 'mobileEnabled',
                    type: 'switch',
                    label: '移动端优化',
                    default: true,
                    value: () => GM_getValue('df_content_preview_mobile_enabled', true),
                    description: '在移动设备上优化预览效果，避免过度占位'
                }
            ],
            handleChange(settingId, value, settingsManager) {
                if (settingId === 'enabled') {
                    GM_setValue('df_content_preview_enabled', value);
                    if (!value) {
                        document.querySelectorAll('.ns-preview-content').forEach(container => {
                            container.style.display = 'none';
                        });
                        document.querySelectorAll('.ns-preview-toggle').forEach(btn => {
                            btn.textContent = '显示预览';
                        });
                    }
                } else if (settingId === 'showComments') {
                    GM_setValue('df_content_preview_show_comments', value);
                    document.querySelectorAll('.ns-preview-content').forEach(container => {
                        if (container.hasContent) {
                            container.style.display = 'none';
                            const toggleBtn = container.previousElementSibling?.previousElementSibling;
                            if (toggleBtn) {
                                toggleBtn.textContent = '显示预览';
                            }
                            container.hasContent = false;
                        }
                    });
                } else if (settingId === 'formatMode') {
                    GM_setValue('df_content_preview_format_mode', value);
                } else if (settingId === 'mobileEnabled') {
                    GM_setValue('df_content_preview_mobile_enabled', value);
                }
            }
        },

        utils: {
            isMobile() {
                return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            },

            detectContentFormat(content) {
                const formatMode = GM_getValue(this.config.storage.FORMAT_MODE, this.config.formats.AUTO);

                if (formatMode !== this.config.formats.AUTO) {
                    return formatMode;
                }

                // 自动检测格式
                if (window.DF.site.isDeepFlood) {
                    // DeepFlood 通常使用 Markdown
                    return this.config.formats.MARKDOWN;
                } else if (window.DF.site.isNodeSeek) {
                    // NodeSeek 通常使用 BBCode
                    return this.config.formats.BBCODE;
                }

                // 基于内容特征判断
                if (content.includes('[code]') || content.includes('[url=') || content.includes('[img]')) {
                    return this.config.formats.BBCODE;
                } else if (content.includes('```') || content.includes('##') || content.includes('[text](url)')) {
                    return this.config.formats.MARKDOWN;
                }

                return this.config.formats.HTML;
            },

            processContentFormat(content, format) {
                try {
                    switch (format) {
                        case this.config.formats.MARKDOWN:
                            return this.renderMarkdown(content);
                        case this.config.formats.BBCODE:
                            return this.renderBBCode(content);
                        case this.config.formats.HTML:
                        default:
                            return content;
                    }
                } catch (error) {
                    console.warn('[DF助手] 内容格式处理失败，使用原始内容:', error);
                    return content;
                }
            },

            renderMarkdown(content) {
                // 简单的 Markdown 渲染
                return content
                    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                    .replace(/\*(.*)\*/gim, '<em>$1</em>')
                    .replace(/!\[([^\]]*)\]\(([^\)]*)\)/gim, '<img alt="$1" src="$2" style="max-width: 100%; height: auto;">')
                    .replace(/\[([^\]]*)\]\(([^\)]*)\)/gim, '<a href="$2" target="_blank">$1</a>')
                    .replace(/```([^`]*)```/gim, '<pre><code>$1</code></pre>')
                    .replace(/`([^`]*)`/gim, '<code>$1</code>')
                    .replace(/^\* (.*$)/gim, '<li>$1</li>')
                    .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
                    .replace(/\n/gim, '<br>');
            },

            renderBBCode(content) {
                // 简单的 BBCode 渲染
                return content
                    .replace(/\[b\](.*?)\[\/b\]/gim, '<strong>$1</strong>')
                    .replace(/\[i\](.*?)\[\/i\]/gim, '<em>$1</em>')
                    .replace(/\[u\](.*?)\[\/u\]/gim, '<u>$1</u>')
                    .replace(/\[url=([^\]]*)\](.*?)\[\/url\]/gim, '<a href="$1" target="_blank">$2</a>')
                    .replace(/\[url\](.*?)\[\/url\]/gim, '<a href="$1" target="_blank">$1</a>')
                    .replace(/\[img\](.*?)\[\/img\]/gim, '<img src="$1" style="max-width: 100%; height: auto;">')
                    .replace(/\[code\](.*?)\[\/code\]/gims, '<pre><code>$1</code></pre>')
                    .replace(/\[quote\](.*?)\[\/quote\]/gims, '<blockquote>$1</blockquote>')
                    .replace(/\[color=([^\]]*)\](.*?)\[\/color\]/gim, '<span style="color: $1">$2</span>')
                    .replace(/\[size=([^\]]*)\](.*?)\[\/size\]/gim, '<span style="font-size: $1">$2</span>')
                    .replace(/\n/gim, '<br>');
            },
            async fetchPostContent(postId, container, toggleBtn, statusSpan, page = 1) {
                return new Promise((resolve, reject) => {
                    const fullUrl = resolveSiteUrl(`post-${postId}-${page}`);
                    const showComments = GM_getValue('df_content_preview_show_comments', true);

                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: fullUrl,
                        onload: function(response) {
                            if (response.status === 200) {
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(response.responseText, 'text/html');
                                const content = doc.querySelector('.post-content');

                                if (content) {
                                    let newContent = '';

                                    if (page === 1) {
                                        newContent = `<div class="ns-preview-post">${content.innerHTML}</div>`;
                                    }

                                    if (showComments) {
                                        const comments = doc.querySelectorAll('ul.comments > li.content-item');
                                        let commentsHtml = `
                                            <div class="ns-preview-comments">
                                                <div class="ns-preview-comments-header">
                                                    <span>评论区</span>
                                                    <span class="ns-preview-comments-count">第 ${page} 页</span>
                                                </div>
                                        `;

                                        comments.forEach(comment => {
                                            const avatar = comment.querySelector('.avatar-wrapper img');
                                            const avatarSrc = avatar ? avatar.src : '';
                                            const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cpath fill="%23ddd" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';

                                            const author = comment.querySelector('.author-name');
                                            const authorName = author?.textContent || '匿名用户';
                                            const authorLink = author?.href || '#';
                                            const commentContent = comment.querySelector('.post-content')?.innerHTML || '';

                                            commentsHtml += `
                                                <div class="ns-preview-comment">
                                                    <div class="ns-preview-comment-avatar"
                                                         style="background-image: url('${avatarSrc || defaultAvatar}')"
                                                         role="img"
                                                         aria-label="${authorName}的头像"></div>
                                                    <div class="ns-preview-comment-content">
                                                        <div class="ns-preview-comment-header">
                                                            <a href="${authorLink}" class="ns-preview-comment-author">${authorName}</a>
                                                        </div>
                                                        <div class="ns-preview-comment-text">${commentContent}</div>
                                                    </div>
                                                </div>
                                            `;
                                        });

                                        const paginationLinks = doc.querySelectorAll('.pager-pos');
                                        let totalPages = 1;
                                        paginationLinks.forEach(link => {
                                            const pageNum = parseInt(link.textContent);
                                            if (!isNaN(pageNum) && pageNum > totalPages) {
                                                totalPages = pageNum;
                                            }
                                        });

                                        if (totalPages > 1) {
                                            commentsHtml += `<div class="ns-preview-pagination">`;
                                            if (page > 1) {
                                                commentsHtml += `<span class="ns-preview-page-btn" data-page="${page-1}">←</span>`;
                                            }

                                            for (let i = 1; i <= totalPages; i++) {
                                                if (i === page) {
                                                    commentsHtml += `<span class="ns-preview-page-btn active">${i}</span>`;
                                                } else {
                                                    commentsHtml += `<span class="ns-preview-page-btn" data-page="${i}">${i}</span>`;
                                                }
                                            }

                                            if (page < totalPages) {
                                                commentsHtml += `<span class="ns-preview-page-btn" data-page="${page+1}">→</span>`;
                                            }
                                            commentsHtml += `</div>`;
                                        }

                                        commentsHtml += '</div>';
                                        newContent += commentsHtml;
                                    }

                                    container.innerHTML = newContent;

                                    if (showComments) {
                                        container.querySelectorAll('.ns-preview-page-btn').forEach(btn => {
                                            if (btn.dataset.page) {
                                                btn.onclick = () => {
                                                    const targetPage = parseInt(btn.dataset.page);
                                                    if (!isNaN(targetPage) && targetPage !== page) {
                                                        NSContentPreview.utils.fetchPostContent(postId, container, toggleBtn, statusSpan, targetPage);
                                                    }
                                                };
                                            }
                                        });
                                    }

                                    container.hasContent = true;
                                    toggleBtn.classList.remove('loading');
                                    toggleBtn.textContent = '隐藏预览';
                                    statusSpan.textContent = '';

                                    resolve();
                                } else {
                                    reject(new Error('内容解析失败'));
                                }
                            } else {
                                reject(new Error(`HTTP ${response.status}`));
                            }
                        },
                        onerror: reject
                    });
                });
            },

            createImageModal() {
                const modal = document.createElement('div');
                modal.className = 'ns-preview-image-modal';
                modal.onclick = () => modal.style.display = 'none';
                document.body.appendChild(modal);
                return modal;
            },

            showImageModal(imgSrc) {
                let modal = document.querySelector('.ns-preview-image-modal');
                if (!modal) {
                    modal = this.createImageModal();
                }

                modal.innerHTML = `<img src="${imgSrc}" onclick="event.stopPropagation();">`;
                modal.style.display = 'flex';
            },

            setupPreview(item) {
                if (item.hasAttribute('data-preview-initialized')) return;
                item.setAttribute('data-preview-initialized', 'true');

                const titleLink = item.querySelector('a[href^="/post-"]');
                if (!titleLink) return;

                const postUrl = titleLink.getAttribute('href');
                const postId = postUrl.match(/\/post-(\d+)-/)?.[1];
                if (!postId) return;

                const previewContainer = document.createElement('div');
                previewContainer.className = 'ns-preview-content';
                previewContainer.style.display = 'none';

                const titleContainer = item.querySelector('.post-title') || titleLink.parentNode;
                const titleArea = titleContainer.getBoundingClientRect();
                const containerWidth = titleArea.width;

                previewContainer.style.width = `${containerWidth}px`;
                previewContainer.style.maxWidth = 'none';

                const statusSpan = document.createElement('span');
                statusSpan.className = 'ns-preview-status';

                const toggleBtn = document.createElement('span');
                toggleBtn.className = 'ns-preview-toggle';
                toggleBtn.textContent = '显示预览';

                let retryCount = 0;
                const maxRetries = 3;

                toggleBtn.onclick = () => {
                    const isHidden = previewContainer.style.display === 'none';

                    if (isHidden) {
                        previewContainer.style.display = 'block';
                        toggleBtn.textContent = '隐藏预览';

                        if (!previewContainer.hasContent) {
                            toggleBtn.classList.add('loading');
                            toggleBtn.textContent = '加载中...';

                            try {
                                NSContentPreview.utils.fetchPostContent(postId, previewContainer, toggleBtn, statusSpan);
                            } catch (error) {
                                if (retryCount < maxRetries) {
                                    retryCount++;
                                    statusSpan.textContent = `加载失败，正在重试(${retryCount}/${maxRetries})`;
                                    NSContentPreview.utils.fetchPostContent(postId, previewContainer, toggleBtn, statusSpan);
                                } else {
                                    toggleBtn.classList.add('error');
                                    toggleBtn.textContent = '加载失败';
                                    statusSpan.textContent = '已达到最大重试次数';
                                }
                            }
                        }
                    } else {
                        previewContainer.style.display = 'none';
                        toggleBtn.textContent = '显示预览';
                    }
                };

                titleLink.parentNode.appendChild(toggleBtn);
                titleLink.parentNode.appendChild(statusSpan);
                titleLink.parentNode.appendChild(previewContainer);
            }
        },

        init() {
            console.log('[DF助手] 初始化内容预览模块');

            if (!GM_getValue('df_content_preview_enabled', true)) {
                console.log('[DF助手] 内容预览模块已禁用');
                return;
            }

            console.log('[DF助手] 开始加载内容预览样式');
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://raw.githubusercontent.com/zen1zi/NSDF_Plus/main/modules/contentPreview/style.css',
                onload: (response) => {
                    if (response.status === 200) {
                        console.log('[DF助手] 内容预览样式加载成功');
                        GM_addStyle(response.responseText);
                    } else {
                        console.error('[DF助手] 加载内容预览样式失败:', response.status);
                    }
                },
                onerror: (error) => {
                    console.error('[DF助手] 加载内容预览样式出错:', error);
                }
            });

            const setupPreviews = () => {
                const postItems = document.querySelectorAll('.post-list-item');
                postItems.forEach(item => this.utils.setupPreview(item));
            };

            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        setupPreviews();
                    }
                });
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setupPreviews();
            console.log('[DF助手] 内容预览模块初始化完成');
        }
    };

    console.log('[DF助手] 等待模块系统就绪');
    let retryCount = 0;
    const maxRetries = 50;

    const waitForDF = () => {
        retryCount++;
        console.log(`[DF助手] 第 ${retryCount} 次尝试注册 contentPreview 模块`);
        
        if (typeof window.DFRegisterModule === 'function') {
            console.log('[DF助手] 模块系统就绪，开始注册 contentPreview');
            window.DFRegisterModule(NSContentPreview);
            console.log('[DF助手] contentPreview 模块注册请求已发送');
        } else {
            console.log('[DF助手] 模块系统未就绪');
            if (retryCount < maxRetries) {
                setTimeout(waitForDF, 100);
            } else {
                console.error('[DF助手] 模块系统等待超时，contentPreview 模块注册失败');
            }
        }
    };

    waitForDF();
    console.log('[DF助手] contentPreview 模块加载完成 v0.0.6');
})(); 

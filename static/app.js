(function() {
    "use strict";

    let currentCid = null;
    let deepThinkOn = false;
    let isGenerating = false;
    let typingTimer = null;
    let thinkTimer = null;
    let fullReplyText = '';
    let firstMessageSent = false;
    let stopRequested = false;
    let currentTypingBubble = null;
    let pendingFile = null;
    let uploadLock = false;
    let imageGenMode = false;
    let imageGenModeType = '';
    let selectedDuration = 'medium';
    let pollingInterval = null;
    let isCreating = false;
    let pollStartTime = 0;

    const durationMap = { short: 81, medium: 121, long: 241 };
    const durationLabel = { short: '短 (≈2.5s)', medium: '中 (≈5s)', long: '长 (≈10s)' };

    const langMap = {
        '.py': 'Python', '.js': 'JavaScript', '.html': 'HTML', '.css': 'CSS',
        '.java': 'Java', '.cpp': 'C++', '.c': 'C', '.go': 'Go', '.rs': 'Rust',
        '.sh': 'Shell', '.bat': 'Batch', '.ps1': 'PowerShell', '.txt': 'Text',
        '.md': 'Markdown', '.json': 'JSON', '.xml': 'XML', '.yaml': 'YAML',
        '.yml': 'YAML', '.toml': 'TOML', '.ini': 'INI', '.sql': 'SQL',
        '.php': 'PHP', '.rb': 'Ruby', '.swift': 'Swift', '.kt': 'Kotlin',
        '.ts': 'TypeScript', '.vue': 'Vue', '.jsx': 'React JSX', '.tsx': 'React TSX'
    };

    function getLang(ext) {
        return langMap[ext.toLowerCase()] || 'Code';
    }

    function getEl(id) {
        const el = document.getElementById(id);
        if (!el) console.warn('⚠️ 元素 #' + id + ' 未找到');
        return el;
    }

    const sendBtn = getEl('sendBtn');
    const stopBtn = getEl('stopBtn');
    const messageInput = getEl('messageInput');
    const deepThinkTool = getEl('deepThinkTool');
    const createMenuBtn = getEl('createMenuBtn');
    const menuIconBtn = getEl('menuIconBtn');
    const newChatIconBtn = getEl('newChatIconBtn');
    const exportChatBtn = getEl('exportChatBtn');
    const convTitleSpan = getEl('convTitle');
    const dotMenuBtn = getEl('dotMenuBtn');
    const popupMenu = getEl('popupMenu');
    const welcomeCard = getEl('welcomeCard');
    const msgContainer = getEl('messagesContainer');
    const uploadBtn = getEl('uploadBtn');
    const previewArea = getEl('imagePreviewArea');
    const previewThumb = getEl('previewThumb');
    const previewRemove = getEl('previewRemove');
    const themeColorPicker = getEl('themeColorPicker');
    const settingsModal = getEl('settingsModal');
    const settingsClose = getEl('settingsClose');
    const aboutBtn = getEl('aboutBtn');
    const clearAllBtn = getEl('clearAllData');
    const toggleThink = getEl('toggleThink');
    const createMenuModal = getEl('createMenuModal');
    const menuLevel1 = getEl('menuLevel1');
    const menuLevel2 = getEl('menuLevel2');
    const menuLevel2Title = getEl('menuLevel2Title');
    const menuLevel2Options = getEl('menuLevel2Options');
    const createMenuClose = getEl('createMenuClose');
    const sidebar = getEl('sidebar');
    const main = getEl('main');

    function toast(msg) {
        const t = document.createElement('div');
        t.innerText = msg;
        t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--glass-bg);backdrop-filter:var(--glass-blur);color:var(--text-primary);padding:6px 14px;border-radius:40px;z-index:300;border:1px solid var(--glass-border);';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 5000);
    }

    function scrollBottom() {
        if (msgContainer) msgContainer.scrollTo({ top: msgContainer.scrollHeight, behavior: 'smooth' });
    }

    function escapeHtml(s) {
        if (!s) return '';
        return s.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
    }

    function addUserBubble(text, fileObj) {
        const d = document.createElement('div');
        d.className = 'message user-message';
        let contentHtml = `<div class="bubble">`;
        if (fileObj) {
            if (fileObj.type === 'image') {
                contentHtml += `<div class="user-bubble-content">
                    <img src="${fileObj.data}" alt="用户图片" style="max-width:200px;max-height:200px;border-radius:12px;cursor:pointer;" onclick="window.open('${fileObj.data}','_blank')">
                    ${text ? `<div>${escapeHtml(text)}</div>` : ''}
                </div>`;
            } else {
                const sizeKB = (fileObj.size / 1024).toFixed(1);
                contentHtml += `<div class="user-bubble-content">
                    <div><i class="fas fa-file-code" style="color:var(--accent);"></i> <strong>${escapeHtml(fileObj.name)}</strong> (${fileObj.lang})</div>
                    <div style="font-size:0.8rem;color:var(--text-secondary);">大小: ${sizeKB} KB</div>
                    ${text ? `<div>${escapeHtml(text)}</div>` : ''}
                </div>`;
            }
        } else {
            contentHtml += `${escapeHtml(text)}`;
        }
        contentHtml += `</div>
            <div class="message-actions-below" style="display:flex;gap:12px;margin-top:6px;font-size:0.7rem;">
                <span class="action-icon edit-msg" style="cursor:pointer;padding:2px 6px;border-radius:12px;background:var(--glass-bg);"><i class="fas fa-edit"></i> 编辑</span>
                <span class="action-icon copy-msg" style="cursor:pointer;padding:2px 6px;border-radius:12px;background:var(--glass-bg);"><i class="fas fa-copy"></i> 复制</span>
            </div>
            <div class="timestamp">${new Date().toLocaleTimeString()}</div>`;
        d.innerHTML = contentHtml;
        if (msgContainer) msgContainer.appendChild(d);
        const copyBtn = d.querySelector('.copy-msg');
        if (copyBtn) copyBtn.onclick = () => { navigator.clipboard.writeText(text); toast('已复制'); };
        const editBtn = d.querySelector('.edit-msg');
        if (editBtn) editBtn.onclick = () => { if (messageInput) { messageInput.value = text; messageInput.focus(); } };
        scrollBottom();
        return d;
    }

    function addAIPlaceholder() {
        const d = document.createElement('div');
        d.className = 'message ai-message';
        d.innerHTML = `<div class="ai-icon"><i class="fas fa-water"></i></div><div class="bubble" id="tempAiBubble"></div><div class="timestamp"></div>`;
        if (msgContainer) msgContainer.appendChild(d);
        scrollBottom();
        const bubble = d.querySelector('.bubble');
        if (bubble) currentTypingBubble = bubble;
        return { bubble: bubble, container: d };
    }

    function showThinking(b) {
        if (b) {
            b.innerHTML = `<div class="thinking-dots"><span></span><span></span><span></span></div>`;
        }
    }

    function startTyping(bubble, fullText, callback, speed) {
        speed = speed || 25;
        if (typingTimer) clearTimeout(typingTimer);
        if (!bubble) return;
        let i = 0;
        bubble.innerHTML = '';
        stopRequested = false;

        function addChar() {
            if (stopRequested) {
                if (callback) callback();
                return;
            }
            if (i < fullText.length) {
                bubble.innerHTML = fullText.substring(0, i + 1) + '<span class="typing-cursor" style="display:inline-block;width:2px;height:1em;background:var(--accent);margin-left:2px;animation:blink 1s infinite;"></span>';
                i++;
                typingTimer = setTimeout(addChar, speed);
                scrollBottom();
            } else {
                bubble.innerHTML = fullText;
                clearTimeout(typingTimer);
                typingTimer = null;
                isGenerating = false;
                if (stopBtn) stopBtn.classList.add('hidden');
                if (sendBtn) sendBtn.classList.remove('hidden');
                if (callback) callback();
            }
        }
        addChar();
    }

    function stopGeneration() {
        if (typingTimer) { clearTimeout(typingTimer); typingTimer = null; }
        if (thinkTimer) { clearTimeout(thinkTimer); thinkTimer = null; }
        if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
        stopRequested = true;
        isGenerating = false;
        if (currentTypingBubble && fullReplyText) {
            let curText = currentTypingBubble.innerHTML;
            curText = curText.replace(/<span class="typing-cursor".*?<\/span>/, '');
            if (curText.trim() === '') curText = '已停止生成';
            currentTypingBubble.innerHTML = curText;
        }
        if (stopBtn) stopBtn.classList.add('hidden');
        if (sendBtn) sendBtn.classList.remove('hidden');
        toast('⏹️ 已停止生成');
    }

    function updatePreview(fileObj) {
        if (!fileObj) {
            clearPreview();
            return;
        }
        previewArea.classList.remove('hidden');
        previewArea.style.display = 'flex';
        if (fileObj.type === 'image') {
            previewThumb.src = fileObj.data;
            previewThumb.style.display = 'block';
            previewThumb.alt = '图片预览';
            const oldInfo = document.getElementById('filePreviewInfo');
            if (oldInfo) oldInfo.remove();
        } else {
            previewThumb.style.display = 'none';
            const sizeKB = (fileObj.size / 1024).toFixed(1);
            let info = document.getElementById('filePreviewInfo');
            if (!info) {
                info = document.createElement('div');
                info.id = 'filePreviewInfo';
                previewArea.insertBefore(info, previewRemove);
            }
            info.style.cssText = 'display:flex;flex-direction:column;gap:4px;font-size:0.9rem;color:var(--text-primary);';
            info.innerHTML = `<div><i class="fas fa-file-code" style="color:var(--accent);"></i> ${escapeHtml(fileObj.name)}</div>
                <div style="font-size:0.75rem;color:var(--text-secondary);">${fileObj.lang} · ${sizeKB} KB</div>`;
        }
    }

    function clearPreview() {
        pendingFile = null;
        previewArea.classList.add('hidden');
        previewArea.style.display = 'none';
        previewThumb.src = '';
        previewThumb.style.display = 'block';   // 恢复默认显示
        const oldInfo = document.getElementById('filePreviewInfo');
        if (oldInfo) oldInfo.remove();
    }

    async function createNewConversation(title) {
        try {
            const res = await fetch('/api/new', { method: 'POST' });
            const data = await res.json();
            currentCid = data.cid;
            if (title && convTitleSpan) convTitleSpan.innerText = title;
            await loadHistoryGroups();
            return currentCid;
        } catch (e) {
            console.error('创建对话失败:', e);
            return null;
        }
    }

    async function newConversation() {
        if (currentCid) {
            try {
                const res = await fetch('/api/load', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cid: currentCid })
                });
                const data = await res.json();
                if (data.messages && data.messages.length > 0) {
                    await createNewConversation('新对话');
                } else {
                    if (msgContainer) msgContainer.innerHTML = '';
                    if (welcomeCard) {
                        welcomeCard.style.display = 'flex';
                        welcomeCard.classList.remove('hide');
                        if (msgContainer) msgContainer.appendChild(welcomeCard);
                    }
                    if (convTitleSpan) convTitleSpan.innerText = '银杏AI';
                    firstMessageSent = false;
                    toast('当前已是空白对话');
                }
            } catch (e) {
                console.error('检查对话失败:', e);
                await createNewConversation('新对话');
            }
        } else {
            await createNewConversation('新对话');
        }
    }

    async function loadHistoryGroups() {
        try {
            const res = await fetch('/api/history');
            const data = await res.json();
            const history = data.history || [];
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const groups = { '今天': [], '昨天': [], '更早': [] };
            history.forEach(item => {
                const d = new Date(item.time);
                if (d >= today) groups['今天'].push(item);
                else if (d >= yesterday) groups['昨天'].push(item);
                else groups['更早'].push(item);
            });
            const container = document.getElementById('historyGroupsContainer');
            if (!container) return;
            container.innerHTML = '';
            for (const [name, items] of Object.entries(groups)) {
                if (!items.length) continue;
                const groupDiv = document.createElement('div');
                groupDiv.className = 'history-group';
                groupDiv.innerHTML = `<div class="group-title">${name}</div>`;
                items.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'history-item';
                    itemDiv.innerHTML = `<span class="history-title">${escapeHtml(item.title)}</span><span class="history-more"><i class="fas fa-ellipsis-v"></i></span>`;
                    itemDiv.addEventListener('click', (e) => {
                        if (e.target.closest('.history-more')) return;
                        loadConversation(item.cid);
                    });
                    const more = itemDiv.querySelector('.history-more');
                    if (more) {
                        more.addEventListener('click', (e) => {
                            e.stopPropagation();
                            showContextMenu(item.cid, item.title, e.clientX, e.clientY);
                        });
                    }
                    groupDiv.appendChild(itemDiv);
                });
                container.appendChild(groupDiv);
            }
            if (data.current) currentCid = data.current;
        } catch (e) { console.error('加载历史失败:', e); }
    }

    function showContextMenu(cid, title, x, y) {
        const menu = document.createElement('div');
        menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;background:var(--glass-bg);backdrop-filter:var(--glass-blur);border:1px solid var(--glass-border);border-radius:8px;padding:4px 0;z-index:1000;color:var(--text-primary);`;
        const rename = document.createElement('div');
        rename.innerText = '重命名';
        rename.style.padding = '6px 16px';
        rename.style.cursor = 'pointer';
        rename.addEventListener('click', async () => {
            const newTitle = prompt('新标题:', title);
            if (newTitle) {
                await fetch('/api/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid, title: newTitle }) });
                loadHistoryGroups();
                if (cid === currentCid && convTitleSpan) convTitleSpan.innerText = newTitle;
            }
            menu.remove();
        });
        const exportItem = document.createElement('div');
        exportItem.innerText = '导出对话';
        exportItem.style.padding = '6px 16px';
        exportItem.style.cursor = 'pointer';
        exportItem.addEventListener('click', async () => { await exportConversation(cid); menu.remove(); });
        const del = document.createElement('div');
        del.innerText = '删除';
        del.style.padding = '6px 16px';
        del.style.cursor = 'pointer';
        del.addEventListener('click', async () => {
            if (confirm('删除此对话？')) {
                const res = await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid }) });
                const data = await res.json();
                if (data.success) {
                    loadHistoryGroups();
                    if (cid === currentCid) {
                        if (data.current) loadConversation(data.current);
                        else {
                            currentCid = null;
                            if (msgContainer) msgContainer.innerHTML = '';
                            if (welcomeCard) { welcomeCard.style.display = 'flex'; welcomeCard.classList.remove('hide'); if (msgContainer) msgContainer.appendChild(welcomeCard); }
                            if (convTitleSpan) convTitleSpan.innerText = '银杏AI';
                            firstMessageSent = false;
                        }
                    }
                } else toast('删除失败');
            }
            menu.remove();
        });
        menu.append(rename, exportItem, del);
        document.body.appendChild(menu);
        const remove = e => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', remove); } };
        setTimeout(() => document.addEventListener('click', remove), 10);
    }

    async function exportConversation(cid) {
        if (!cid) { toast('没有可导出的对话'); return; }
        try {
            const res = await fetch('/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid }) });
            if (res.ok) {
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${convTitleSpan ? convTitleSpan.innerText : '对话'}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                toast('导出成功');
            } else toast('导出失败');
        } catch (e) { toast('导出异常'); }
    }

    async function loadConversation(cid) {
        try {
            const res = await fetch('/api/load', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cid })
            });
            const data = await res.json();
            if (data.messages) {
                currentCid = data.cid;
                firstMessageSent = data.messages.length > 0;
                if (msgContainer) msgContainer.innerHTML = '';
                if (!firstMessageSent && welcomeCard) {
                    welcomeCard.style.display = 'flex';
                    welcomeCard.classList.remove('hide');
                    if (msgContainer) msgContainer.appendChild(welcomeCard);
                }
                const settings = loadSettings();
                const showThink = settings.showThink !== false;

                for (const msg of data.messages) {
                    if (msg.role === 'user') {
                        let fileObj = null;
                        if (msg.image_data) {
                            fileObj = { type: 'image', data: `data:${msg.image_mime || 'image/jpeg'};base64,${msg.image_data}` };
                        } else if (msg.file_name) {
                            fileObj = { type: 'file', name: msg.file_name, lang: msg.file_lang || 'Code', size: msg.file_size || 0 };
                        }
                        addUserBubble(msg.content, fileObj);
                    } else {
                        const { bubble, container } = addAIPlaceholder();
                        if (msg.think && msg.think.trim() !== '') {
                            const thinkDiv = document.createElement('div');
                            thinkDiv.className = 'think-container';
                            thinkDiv.innerHTML = `<div class="think-header">💭 深度思考</div><div class="think-content">${escapeHtml(msg.think)}</div>`;
                            if (!showThink) thinkDiv.style.display = 'none';
                            if (container && bubble) container.insertBefore(thinkDiv, bubble);
                        }
                        if (msg.image_url) {
                            if (msg.image_url.match(/\.(mp4|webm|ogg)$/i)) {
                                bubble.innerHTML = `<div>${escapeHtml(msg.content)}</div><div><video controls style="max-width:100%;max-height:400px;border-radius:12px;"><source src="${msg.image_url}" type="video/mp4"></video></div>`;
                            } else {
                                bubble.innerHTML = `<div>${escapeHtml(msg.content)}</div><div><img src="${msg.image_url}" alt="生成内容" style="max-width:100%;max-height:400px;border-radius:12px;cursor:pointer;" onclick="window.open('${msg.image_url}','_blank')"></div>`;
                            }
                        } else {
                            if (bubble) bubble.innerHTML = escapeHtml(msg.content);
                        }
                    }
                }
                if (data.messages.length === 0 && welcomeCard) welcomeCard.style.display = 'flex';
                scrollBottom();
                const titleRes = await fetch('/api/history');
                const histData = await titleRes.json();
                const found = histData.history.find(h => h.cid === cid);
                if (convTitleSpan) convTitleSpan.innerText = found ? found.title : '银杏AI';
            }
            closeSidebar();
        } catch (e) { console.error('加载对话失败:', e); }
    }

    function closeSidebar() {
        if (sidebar) sidebar.classList.remove('open');
        if (main) main.classList.remove('sidebar-open');
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) overlay.classList.remove('active');
        if (menuIconBtn) menuIconBtn.innerHTML = '<i class="fas fa-bars"></i>';
    }

    function openSidebar() {
        if (sidebar) sidebar.classList.add('open');
        if (main) main.classList.add('sidebar-open');
        if (window.innerWidth <= 768) {
            const overlay = document.getElementById('sidebarOverlay');
            if (overlay) overlay.classList.add('active');
        }
        if (menuIconBtn) menuIconBtn.innerHTML = '<i class="fas fa-times"></i>';
    }

    function toggleSidebar() {
        if (sidebar && sidebar.classList.contains('open')) closeSidebar();
        else openSidebar();
    }

    const defaultSettings = { theme: 'dark', fontSize: 'medium', showThink: true };

    function loadSettings() {
        let saved = localStorage.getItem('ginkgo_settings');
        let settings;
        if (saved) {
            try {
                settings = JSON.parse(saved);
                if (settings.showThink === undefined) settings.showThink = true;
            } catch(e) {
                settings = { ...defaultSettings };
                localStorage.setItem('ginkgo_settings', JSON.stringify(settings));
            }
        } else {
            settings = { ...defaultSettings };
            localStorage.setItem('ginkgo_settings', JSON.stringify(settings));
        }
        return settings;
    }

    function applySettings(settings) {
        if (!settings) return;
        if (settings.theme === 'light') {
            document.documentElement.style.setProperty('--bg-body', '#f0f2f5');
            document.documentElement.style.setProperty('--glass-bg', 'rgba(255,255,255,0.4)');
            document.documentElement.style.setProperty('--glass-border', 'rgba(0,0,0,0.1)');
            document.documentElement.style.setProperty('--text-primary', '#1e293b');
            document.documentElement.style.setProperty('--text-secondary', '#475569');
        } else {
            document.documentElement.style.setProperty('--bg-body', '#0b0d15');
            document.documentElement.style.setProperty('--glass-bg', 'rgba(255,255,255,0.06)');
            document.documentElement.style.setProperty('--glass-border', 'rgba(255,255,255,0.12)');
            document.documentElement.style.setProperty('--text-primary', 'rgba(255,255,255,0.92)');
            document.documentElement.style.setProperty('--text-secondary', 'rgba(255,255,255,0.55)');
        }
        const fontSizeMap = { small: '13px', medium: '15px', large: '17px' };
        const fs = fontSizeMap[settings.fontSize] || '15px';
        document.documentElement.style.setProperty('--base-font-size', fs);
        document.body.style.fontSize = fs;

        const showThink = settings.showThink !== false;
        document.querySelectorAll('.think-container').forEach(el => {
            el.style.display = showThink ? '' : 'none';
        });
        if (toggleThink) {
            toggleThink.classList.toggle('active', showThink);
        }

        document.querySelectorAll('[data-theme]').forEach(el => el.classList.toggle('active', el.dataset.theme === settings.theme));
        document.querySelectorAll('.font-option').forEach(el => el.classList.toggle('active', el.dataset.fontsize === settings.fontSize));
        if (deepThinkTool) deepThinkTool.classList.toggle('active', deepThinkOn);
    }

    function applyThemeColor(color) {
        if (!color) return;
        document.documentElement.style.setProperty('--accent', color);
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        document.documentElement.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.2)`);
        document.documentElement.style.setProperty('--user-bubble', `rgba(${r},${g},${b},0.15)`);
        document.documentElement.style.setProperty('--think-bg', `rgba(${r},${g},${b},0.08)`);
        localStorage.setItem('themeColor', color);
    }

    function resetInputMode() {
        imageGenMode = false;
        if (createMenuBtn) createMenuBtn.classList.remove('active');
        if (messageInput) {
            messageInput.placeholder = '输入消息... (支持 /help /clear /save)';
        }
    }

    function exitCreateMode() {
        imageGenMode = false;
        imageGenModeType = '';
        if (createMenuBtn) createMenuBtn.classList.remove('active');
        if (messageInput) {
            messageInput.placeholder = '输入消息... (支持 /help /clear /save)';
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }
        clearPreview();
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        isCreating = false;
        closeCreateMenu();
    }

    function enterGenMode(mode, duration) {
        imageGenMode = true;
        imageGenModeType = mode;
        selectedDuration = duration || 'medium';
        if (messageInput) {
            messageInput.value = '';
            messageInput.style.height = 'auto';
            let placeholder = '';
            if (mode === 'text') placeholder = '🎨 请输入生图描述 (文生图)';
            else if (mode === 'image') placeholder = '🖼️ 请上传图片并输入修改要求 (图生图)';
            else if (mode === 'video_text') placeholder = `🎬 请输入视频描述 (${durationLabel[selectedDuration]})`;
            else if (mode === 'video_image') placeholder = `📹 请上传图片并输入动作描述 (${durationLabel[selectedDuration]})`;
            messageInput.placeholder = placeholder;
            messageInput.focus();
        }
        if (createMenuBtn) createMenuBtn.classList.add('active');
        if (mode === 'image' || mode === 'video_image') {
            toast('请点击📎上传图片');
        }
        closeCreateMenu();
    }

    function openCreateMenu() {
        createMenuModal.style.display = 'flex';
        showMenuLevel('main');
    }

    function closeCreateMenu() {
        createMenuModal.style.display = 'none';
    }

    function showMenuLevel(level) {
        menuLevel1.style.display = 'none';
        menuLevel2.style.display = 'none';

        if (level === 'main') {
            menuLevel1.style.display = 'flex';
            menuLevel1.classList.remove('hide');
            menuLevel1.classList.add('show');
        } else if (level === 'video_duration') {
            menuLevel2.style.display = 'flex';
            menuLevel2Title.innerText = '← 选择视频时长';
            menuLevel2Options.innerHTML = `
                <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin:10px 0;">
                    <button class="duration-picker-btn" data-duration="short" style="padding:10px 20px;border-radius:14px;border:2px solid var(--glass-border);background:var(--glass-bg);color:var(--text-primary);cursor:pointer;transition:0.2s;font-size:1rem;flex:1;min-width:80px;text-align:center;">
                        短<br><span style="font-size:0.7rem;color:var(--text-secondary);">≈2.5s</span>
                    </button>
                    <button class="duration-picker-btn active" data-duration="medium" style="padding:10px 20px;border-radius:14px;border:2px solid var(--accent);background:var(--accent-glow);color:var(--accent);cursor:pointer;transition:0.2s;font-size:1rem;flex:1;min-width:80px;text-align:center;">
                        中<br><span style="font-size:0.7rem;color:var(--text-secondary);">≈5s</span>
                    </button>
                    <button class="duration-picker-btn" data-duration="long" style="padding:10px 20px;border-radius:14px;border:2px solid var(--glass-border);background:var(--glass-bg);color:var(--text-primary);cursor:pointer;transition:0.2s;font-size:1rem;flex:1;min-width:80px;text-align:center;">
                        长<br><span style="font-size:0.7rem;color:var(--text-secondary);">≈10s</span>
                    </button>
                </div>
                <div style="display:flex;gap:12px;margin-top:8px;">
                    <button id="durationConfirmBtn" style="flex:1;padding:12px;border-radius:14px;border:1px solid var(--accent);background:var(--accent-glow);color:var(--accent);font-size:1rem;cursor:pointer;transition:0.2s;">确定</button>
                </div>
            `;

            menuLevel2Options.querySelectorAll('.duration-picker-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    menuLevel2Options.querySelectorAll('.duration-picker-btn').forEach(b => {
                        b.style.borderColor = 'var(--glass-border)';
                        b.style.background = 'var(--glass-bg)';
                        b.style.color = 'var(--text-primary)';
                    });
                    this.style.borderColor = 'var(--accent)';
                    this.style.background = 'var(--accent-glow)';
                    this.style.color = 'var(--accent)';
                    selectedDuration = this.dataset.duration;
                });
            });

            menuLevel2Options.querySelector('#durationConfirmBtn').addEventListener('click', function() {
                showMenuLevel('video_mode');
            });

            menuLevel2Title.onclick = function() {
                showMenuLevel('main');
            };

            menuLevel2.classList.remove('hide');
            menuLevel2.classList.add('show');
        } else if (level === 'video_mode') {
            menuLevel2.style.display = 'flex';
            menuLevel2Title.innerText = `← 已选 ${durationLabel[selectedDuration]}`;
            menuLevel2Options.innerHTML = `
                <button class="menu-level-btn" data-mode="video_text" style="padding:12px;border-radius:14px;border:1px solid var(--glass-border);background:var(--glass-bg);color:var(--text-primary);font-size:0.95rem;cursor:pointer;transition:0.2s;text-align:left;display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-film" style="color:var(--accent);"></i> 文生视频
                </button>
                <button class="menu-level-btn" data-mode="video_image" style="padding:12px;border-radius:14px;border:1px solid var(--glass-border);background:var(--glass-bg);color:var(--text-primary);font-size:0.95rem;cursor:pointer;transition:0.2s;text-align:left;display:flex;align-items:center;gap:10px;">
                    <i class="fas fa-video" style="color:var(--accent);"></i> 图生视频
                </button>
                <div style="font-size:0.8rem;color:var(--text-secondary);text-align:center;margin-top:4px;">当前时长: ${durationLabel[selectedDuration]}</div>
            `;

            menuLevel2Options.querySelectorAll('.menu-level-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const mode = this.dataset.mode;
                    enterGenMode(mode, selectedDuration);
                });
            });

            menuLevel2Title.onclick = function() {
                showMenuLevel('video_duration');
            };

            menuLevel2.classList.remove('hide');
            menuLevel2.classList.add('show');
        }
    }

    async function pollVideoStatus(videoId, bubble, finalMsg, cid) {
        if (pollingInterval) clearInterval(pollingInterval);
        pollStartTime = Date.now();
        pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/video_status?video_id=${videoId}`);
                const data = await res.json();
                if (data.error) {
                    if (data.error.includes('LOCAL_ENV_LIMIT') || data.error.includes('本地开发环境')) {
                        toast('⚠️ ' + data.error);
                        if (bubble) bubble.innerHTML = '❌ ' + data.error;
                        clearInterval(pollingInterval);
                        pollingInterval = null;
                        exitCreateMode();
                        return;
                    }
                    return;
                }
                const status = data.status;
                const progress = data.progress || 0;
                const now = Date.now();
                const elapsed = (now - pollStartTime) / 1000;

                let remaining = '';
                if (progress > 0 && progress < 100) {
                    const rate = progress / elapsed;
                    const totalEst = 100 / rate;
                    const remainingSec = Math.max(0, totalEst - elapsed);
                    if (remainingSec > 60) {
                        remaining = `约 ${Math.round(remainingSec / 60)} 分钟`;
                    } else if (remainingSec > 10) {
                        remaining = `约 ${Math.round(remainingSec)} 秒`;
                    } else {
                        remaining = '即将完成';
                    }
                } else if (progress >= 100) {
                    remaining = '即将完成';
                } else {
                    remaining = '估算中...';
                }

                if (bubble) {
                    bubble.innerHTML = `📹 视频生成中... 进度: ${progress}%  ${remaining ? '⏱️ ' + remaining : ''}`;
                }

                if (status === 'completed') {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                    const videoUrl = data.url;
                    if (bubble) {
                        bubble.innerHTML = `<div>🎬 生成视频：${escapeHtml(finalMsg)}</div><div><video controls style="max-width:100%;max-height:400px;border-radius:12px;"><source src="${videoUrl}" type="video/mp4"></video></div><div style="font-size:0.85rem;color:var(--text-secondary);">时长: ${data.seconds || ''}秒</div>`;
                    }
                    if (cid) {
                        await fetch('/api/add_media_msg', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ cid: cid, role: 'ai', content: `🎬 生成视频：${finalMsg}`, image_url: videoUrl })
                        });
                    }
                    loadHistoryGroups();
                    toast('✅ 视频生成完成！');
                    exitCreateMode();
                } else if (status === 'failed') {
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                    const err = data.error || '未知错误';
                    if (bubble) bubble.innerHTML = `❌ 视频生成失败：${err}`;
                    toast('❌ 视频生成失败');
                    exitCreateMode();
                }
            } catch (e) {
            }
        }, 3000);
    }

    async function handleCreateSend() {
        if (isCreating) return;
        if (!imageGenMode) return;

        const modeType = imageGenModeType;
        resetInputMode();

        const finalMsg = messageInput ? messageInput.value.trim() : '';
        const pendingImg = pendingFile && pendingFile.type === 'image' ? pendingFile : null;
        const imageDataUrl = pendingImg ? `data:${pendingImg.mime};base64,${pendingImg.base64}` : null;

        if (modeType === 'text' || modeType === 'image') {
            if (!finalMsg) { toast('请输入描述'); return; }
            if (modeType === 'image' && !pendingImg) { toast('图生图需要上传图片'); return; }

            isCreating = true;
            if (welcomeCard && welcomeCard.style.display !== 'none') {
                welcomeCard.classList.add('hide');
                setTimeout(() => welcomeCard.style.display = 'none', 500);
            }
            if (messageInput) {
                messageInput.value = '';
                messageInput.style.height = 'auto';
            }
            addUserBubble(finalMsg, pendingImg);
            clearPreview();

            const { bubble, container } = addAIPlaceholder();
            if (bubble) bubble.innerHTML = '🖼️ 正在用 Agnes Image 生成，预计需要 1-2 分钟，请稍候...';

            try {
                const payload = {
                    prompt: finalMsg,
                    cid: currentCid,
                    mode: modeType,
                };
                if (pendingImg) {
                    payload.image_data = pendingImg.base64;
                    payload.image_mime = pendingImg.mime;
                }
                const res = await fetch('/api/generate_image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.error) {
                    toast('❌ ' + data.error);
                    if (bubble) bubble.innerHTML = '⚠️ ' + data.error;
                    return;
                }
                if (bubble) {
                    bubble.innerHTML = `<div>🎨 生成图片：${escapeHtml(data.prompt)}</div><div><img src="${data.image_url}" alt="生成图片" style="max-width:100%;max-height:400px;border-radius:12px;cursor:pointer;" onclick="window.open('${data.image_url}','_blank')"></div>`;
                }
                if (currentCid) {
                    await fetch('/api/add_media_msg', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cid: currentCid, role: 'ai', content: `🎨 生成图片：${data.prompt}`, image_url: data.image_url })
                    });
                }
                if (data.cid && data.cid !== currentCid) {
                    currentCid = data.cid;
                    loadHistoryGroups();
                }
                if (convTitleSpan) convTitleSpan.innerText = data.title || '新对话';
            } catch (e) {
                toast('生成失败');
                if (bubble) bubble.innerHTML = '⚠️ 网络错误';
            } finally {
                exitCreateMode();
                isCreating = false;
            }
            return;
        }

        if (modeType === 'video_text' || modeType === 'video_image') {
            if (!finalMsg) { toast('请输入视频描述'); return; }
            if (modeType === 'video_image' && !pendingImg) { toast('图生视频需要上传图片'); return; }

            isCreating = true;
            if (welcomeCard && welcomeCard.style.display !== 'none') {
                welcomeCard.classList.add('hide');
                setTimeout(() => welcomeCard.style.display = 'none', 500);
            }
            if (messageInput) {
                messageInput.value = '';
                messageInput.style.height = 'auto';
            }
            addUserBubble(finalMsg, pendingImg);
            clearPreview();

            const { bubble, container } = addAIPlaceholder();
            if (bubble) {
                bubble.innerHTML = '🎬 好的，正在使用 Agnes-Video-V2.0 为您创作，预计需要 1-3 分钟，生成好后，我会主动发送给您。';
            }

            try {
                const payload = {
                    prompt: finalMsg,
                    cid: currentCid,
                    mode: modeType,
                    num_frames: durationMap[selectedDuration] || 121,
                };
                if (pendingImg) {
                    payload.image_data = pendingImg.base64;
                    payload.image_mime = pendingImg.mime;
                }
                const res = await fetch('/api/generate_video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (data.error && data.code === 'LOCAL_ENV_LIMIT') {
                    toast('⚠️ ' + data.error);
                    if (bubble) bubble.innerHTML = '❌ ' + data.error;
                    exitCreateMode();
                    isCreating = false;
                    return;
                }

                if (data.error) {
                    toast('❌ ' + data.error);
                    if (bubble) bubble.innerHTML = '⚠️ ' + data.error;
                    exitCreateMode();
                    isCreating = false;
                    return;
                }

                const videoId = data.video_id;
                const cid = currentCid;
                if (cid) {
                    let userPayload = { cid: cid, role: 'user', content: finalMsg };
                    if (pendingImg) {
                        userPayload.image_data = pendingImg.base64;
                        userPayload.image_mime = pendingImg.mime;
                    }
                    await fetch('/api/add_media_msg', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(userPayload)
                    });
                }
                if (data.cid && data.cid !== currentCid) {
                    currentCid = data.cid;
                    loadHistoryGroups();
                }
                if (convTitleSpan) convTitleSpan.innerText = data.title || '新对话';

                pollVideoStatus(videoId, bubble, finalMsg, cid || currentCid);
            } catch (e) {
                toast('视频任务提交失败');
                if (bubble) bubble.innerHTML = '⚠️ 网络错误';
                exitCreateMode();
                isCreating = false;
            }
            return;
        }
    }

    async function sendMessage(text) {
        if (imageGenMode) {
            await handleCreateSend();
            return;
        }

        if (isGenerating) return;
        let finalMsg = text !== null && text !== undefined ? text : (messageInput ? messageInput.value.trim() : '');
        const fileToSend = pendingFile;

        if (!finalMsg && !fileToSend) return;

        if (welcomeCard && welcomeCard.style.display !== 'none') {
            welcomeCard.classList.add('hide');
            setTimeout(() => welcomeCard.style.display = 'none', 500);
            if (!firstMessageSent) firstMessageSent = true;
        }

        if (messageInput) {
            messageInput.value = '';
            messageInput.style.height = 'auto';
        }
        clearPreview();

        let userFileObj = null;
        if (fileToSend) {
            if (fileToSend.type === 'image') {
                userFileObj = { type: 'image', data: fileToSend.data };
            } else {
                userFileObj = { type: 'file', name: fileToSend.name, lang: fileToSend.lang, size: fileToSend.size };
            }
        }
        addUserBubble(finalMsg || '', userFileObj);

        const { bubble: aiBubble, container: aiContainer } = addAIPlaceholder();
        if (aiBubble) showThinking(aiBubble);
        isGenerating = true;
        if (sendBtn) sendBtn.classList.add('hidden');
        if (stopBtn) stopBtn.classList.remove('hidden');
        stopRequested = false;

        try {
            const payload = { msg: finalMsg || '', cid: currentCid, deep: deepThinkOn };
            if (fileToSend) {
                if (fileToSend.type === 'image') {
                    payload.image_data = fileToSend.base64;
                    payload.image_mime = fileToSend.mime;
                } else {
                    payload.file_name = fileToSend.name;
                    payload.file_content = fileToSend.content;
                    payload.file_lang = fileToSend.lang;
                    payload.file_size = fileToSend.size;
                }
            }
            if (!currentCid) {
                const shortTitle = (finalMsg || '文件').substring(0, 6) + '…';
                await createNewConversation(shortTitle);
            }
            const res = await fetch('/api/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.error) {
                toast('❌ ' + data.message);
                if (aiBubble) aiBubble.innerHTML = '⚠️ ' + data.message;
                isGenerating = false;
                if (stopBtn) stopBtn.classList.add('hidden');
                if (sendBtn) sendBtn.classList.remove('hidden');
                return;
            }
            fullReplyText = data.reply;
            const thinkContent = data.think;

            if (deepThinkOn && thinkContent && thinkContent.trim() !== '') {
                const thinkDiv = document.createElement('div');
                thinkDiv.className = 'think-container';
                thinkDiv.innerHTML = `<div class="think-header">💭 深度思考 (耗时 ${data.time_elapsed || 0} 秒)</div><div class="think-content" id="think-content"></div>`;
                if (aiContainer && aiBubble) aiContainer.insertBefore(thinkDiv, aiBubble);

                const settings = loadSettings();
                if (!settings.showThink) {
                    thinkDiv.style.display = 'none';
                }

                const thinkContentEl = thinkDiv.querySelector('.think-content');
                let thinkIndex = 0;
                const thinkFull = thinkContent;
                if (thinkTimer) clearTimeout(thinkTimer);
                (function typeThink() {
                    if (stopRequested) {
                        if (aiBubble) {
                            aiBubble.innerHTML = '';
                            startTyping(aiBubble, fullReplyText, () => {
                                if (deepThinkOn && data.time_elapsed) {
                                    const ts = aiContainer ? aiContainer.querySelector('.timestamp') : null;
                                    if (ts) ts.innerText = `思考耗时 ${data.time_elapsed} 秒`;
                                }
                            });
                        }
                        return;
                    }
                    if (thinkIndex < thinkFull.length) {
                        if (thinkContentEl) thinkContentEl.textContent += thinkFull.charAt(thinkIndex);
                        thinkIndex++;
                        thinkTimer = setTimeout(typeThink, 20);
                        scrollBottom();
                    } else {
                        if (aiBubble) {
                            aiBubble.innerHTML = '';
                            startTyping(aiBubble, fullReplyText, () => {
                                if (deepThinkOn && data.time_elapsed) {
                                    const ts = aiContainer ? aiContainer.querySelector('.timestamp') : null;
                                    if (ts) ts.innerText = `思考耗时 ${data.time_elapsed} 秒`;
                                }
                            });
                        }
                    }
                })();
            } else {
                if (aiBubble) {
                    aiBubble.innerHTML = '';
                    startTyping(aiBubble, fullReplyText, () => {
                        if (deepThinkOn && data.time_elapsed) {
                            const ts = aiContainer ? aiContainer.querySelector('.timestamp') : null;
                            if (ts) ts.innerText = `思考耗时 ${data.time_elapsed} 秒`;
                        }
                    });
                }
            }

            if (data.cid !== currentCid) { currentCid = data.cid; loadHistoryGroups(); }
            if (convTitleSpan) convTitleSpan.innerText = data.title;
        } catch (e) {
            console.error('发送消息错误:', e);
            toast('🌐 网络请求失败');
            if (aiBubble) aiBubble.innerHTML = '网络错误，请检查后端。';
            isGenerating = false;
            if (stopBtn) stopBtn.classList.add('hidden');
            if (sendBtn) sendBtn.classList.remove('hidden');
        }
    }

    function init() {
        console.log('🚀 开始初始化 GinkgoAI...');

        let settings = loadSettings();
        settings.showThink = true;
        localStorage.setItem('ginkgo_settings', JSON.stringify(settings));
        applySettings(settings);

        const themeColor = localStorage.getItem('themeColor');
        if (themeColor && themeColorPicker) {
            themeColorPicker.value = themeColor;
            applyThemeColor(themeColor);
        }

        loadHistoryGroups().then(() => {
            if (!currentCid) {
                if (msgContainer) msgContainer.innerHTML = '';
                if (welcomeCard) { welcomeCard.style.display = 'flex'; if (msgContainer) msgContainer.appendChild(welcomeCard); }
                if (convTitleSpan) convTitleSpan.innerText = '银杏AI';
            } else {
                loadConversation(currentCid);
            }
        });

        function bind(el, event, handler) {
            if (!el) return;
            el.addEventListener(event, handler);
        }

        bind(menuIconBtn, 'click', toggleSidebar);
        bind(newChatIconBtn, 'click', newConversation);
        bind(exportChatBtn, 'click', () => exportConversation(currentCid));
        bind(sendBtn, 'click', () => sendMessage());
        bind(stopBtn, 'click', stopGeneration);

        bind(deepThinkTool, 'click', function() {
            deepThinkOn = !deepThinkOn;
            this.classList.toggle('active');
            const settings = loadSettings();
            settings.defaultDeep = deepThinkOn;
            localStorage.setItem('ginkgo_settings', JSON.stringify(settings));
        });

        if (messageInput) {
            messageInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.min(120, this.scrollHeight) + 'px';
            });
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && messageInput.value.trim()) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

        bind(uploadBtn, 'click', () => {
            if (uploadLock) { toast('请等待上次上传完成'); return; }
            uploadLock = true;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,.py,.js,.html,.css,.java,.cpp,.c,.go,.rs,.sh,.bat,.ps1,.txt,.md,.json,.xml,.yaml,.yml,.toml,.ini,.sql,.php,.rb,.swift,.kt,.ts,.vue,.jsx,.tsx,.csv,.log,.lua,.r,.scala';
            input.addEventListener('change', async (e) => {
                if (!e.target.files[0]) { uploadLock = false; return; }
                const file = e.target.files[0];
                const ext = '.' + file.name.split('.').pop();
                const lang = getLang(ext);

                if (file.type.startsWith('image/')) {
                    if (file.size > 5 * 1024 * 1024) { toast('图片大小不能超过5MB'); uploadLock = false; return; }
                    const reader = new FileReader();
                    reader.onload = function(ev) {
                        const base64 = ev.target.result.split(',')[1];
                        const dataUrl = ev.target.result;
                        pendingFile = { type: 'image', base64, mime: file.type, data: dataUrl, name: file.name, size: file.size };
                        updatePreview(pendingFile);
                        toast('📎 图片已上传，输入文字后发送');
                        uploadLock = false;
                        if (messageInput) messageInput.focus();
                    };
                    reader.onerror = function() { toast('读取图片失败'); uploadLock = false; };
                    reader.readAsDataURL(file);
                } else {
                    if (file.size > 500 * 1024) { toast('代码文件大小不能超过500KB'); uploadLock = false; return; }
                    const reader = new FileReader();
                    reader.onload = function(ev) {
                        const content = ev.target.result;
                        pendingFile = { type: 'file', name: file.name, lang, size: file.size, content };
                        updatePreview(pendingFile);
                        toast('📄 代码文件已上传，输入问题后发送');
                        uploadLock = false;
                        if (messageInput) messageInput.focus();
                    };
                    reader.onerror = function() { toast('读取文件失败'); uploadLock = false; };
                    reader.readAsText(file);
                }
            });
            input.click();
        });

        bind(previewRemove, 'click', clearPreview);

        bind(themeColorPicker, 'input', (e) => {
            const color = e.target.value;
            applyThemeColor(color);
        });
        bind(settingsClose, 'click', () => { if (settingsModal) { settingsModal.classList.remove('show'); settingsModal.style.display = 'none'; } });
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) { settingsModal.classList.remove('show'); settingsModal.style.display = 'none'; } });
        }
        const settingsItem = document.getElementById('settingsItem');
        if (settingsItem) {
            settingsItem.addEventListener('click', () => { if (settingsModal) { settingsModal.classList.add('show'); settingsModal.style.display = 'flex'; } if (popupMenu) popupMenu.style.display = 'none'; });
        }

        document.querySelectorAll('[data-theme]').forEach(el => {
            el.addEventListener('click', () => {
                const settings = loadSettings();
                settings.theme = el.dataset.theme;
                localStorage.setItem('ginkgo_settings', JSON.stringify(settings));
                applySettings(settings);
                document.querySelectorAll('[data-theme]').forEach(e => e.classList.remove('active'));
                el.classList.add('active');
            });
        });

        document.querySelectorAll('.font-option').forEach(el => {
            el.addEventListener('click', () => {
                const settings = loadSettings();
                settings.fontSize = el.dataset.fontsize;
                localStorage.setItem('ginkgo_settings', JSON.stringify(settings));
                applySettings(settings);
                document.querySelectorAll('.font-option').forEach(e => e.classList.remove('active'));
                el.classList.add('active');
            });
        });

        if (toggleThink) {
            toggleThink.addEventListener('click', function() {
                const settings = loadSettings();
                settings.showThink = !settings.showThink;
                localStorage.setItem('ginkgo_settings', JSON.stringify(settings));
                applySettings(settings);
            });
        }

        bind(aboutBtn, 'click', () => window.open('/about', '_blank'));
        bind(clearAllBtn, 'click', async () => {
            if (confirm('确定要清空所有对话历史吗？此操作不可恢复！')) {
                try {
                    const res = await fetch('/api/history');
                    const data = await res.json();
                    for (const item of data.history) {
                        await fetch('/api/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid: item.cid }) });
                    }
                    await loadHistoryGroups();
                    currentCid = null;
                    if (msgContainer) msgContainer.innerHTML = '';
                    if (welcomeCard) { welcomeCard.style.display = 'flex'; welcomeCard.classList.remove('hide'); if (msgContainer) msgContainer.appendChild(welcomeCard); }
                    if (convTitleSpan) convTitleSpan.innerText = '银杏AI';
                    firstMessageSent = false;
                    toast('已清空所有对话历史');
                } catch (e) { toast('清空失败'); }
            }
        });

        bind(dotMenuBtn, 'click', function(e) {
            e.stopPropagation();
            const rect = this.getBoundingClientRect();
            let top = rect.top - 150;
            if (top < 0) top = rect.bottom + 5;
            let left = rect.left + rect.width / 2 - 75;
            if (popupMenu) {
                popupMenu.style.left = left + 'px';
                popupMenu.style.top = top + 'px';
                popupMenu.style.display = 'block';
                popupMenu.classList.toggle('show');
            }
        });
        document.addEventListener('click', (e) => {
            if (popupMenu && !popupMenu.contains(e.target) && e.target !== dotMenuBtn) {
                popupMenu.style.display = 'none';
            }
        });

        const downloadApp = document.getElementById('downloadApp');
        if (downloadApp) downloadApp.addEventListener('click', () => toast('下载应用（演示）'));
        const contactOfficial = document.getElementById('contactOfficial');
        if (contactOfficial) contactOfficial.addEventListener('click', () => toast('联系官方'));

        bind(createMenuBtn, 'click', openCreateMenu);
        bind(createMenuClose, 'click', closeCreateMenu);
        if (createMenuModal) {
            createMenuModal.addEventListener('click', (e) => { if (e.target === createMenuModal) closeCreateMenu(); });
        }

        document.querySelectorAll('#menuLevel1 .menu-level-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const target = this.dataset.target;
                if (target === 'video') {
                    showMenuLevel('video_duration');
                } else if (target === 'image') {
                    menuLevel1.style.display = 'none';
                    menuLevel2.style.display = 'flex';
                    menuLevel2Title.innerText = '← AI生图';
                    menuLevel2Options.innerHTML = `
                        <button class="menu-level-btn" data-mode="text" style="padding:12px;border-radius:14px;border:1px solid var(--glass-border);background:var(--glass-bg);color:var(--text-primary);font-size:0.95rem;cursor:pointer;transition:0.2s;text-align:left;display:flex;align-items:center;gap:10px;">
                            <i class="fas fa-pen-fancy" style="color:var(--accent);"></i> 文生图
                        </button>
                        <button class="menu-level-btn" data-mode="image" style="padding:12px;border-radius:14px;border:1px solid var(--glass-border);background:var(--glass-bg);color:var(--text-primary);font-size:0.95rem;cursor:pointer;transition:0.2s;text-align:left;display:flex;align-items:center;gap:10px;">
                            <i class="fas fa-images" style="color:var(--accent);"></i> 图生图
                        </button>
                    `;
                    menuLevel2Options.querySelectorAll('.menu-level-btn').forEach(b => {
                        b.addEventListener('click', function() {
                            const mode = this.dataset.mode;
                            enterGenMode(mode);
                        });
                    });
                    menuLevel2Title.onclick = function() {
                        menuLevel2.style.display = 'none';
                        menuLevel1.style.display = 'flex';
                    };
                    menuLevel2.classList.remove('hide');
                    menuLevel2.classList.add('show');
                }
            });
        });

        console.log('✅ 银杏AI 初始化完成');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(init, 100);
        });
    } else {
        setTimeout(init, 100);
    }
})();

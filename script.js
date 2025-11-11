const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const sendIcon = document.getElementById('sendIcon');
const stopIcon = document.getElementById('stopIcon');
const messagesArea = document.getElementById('messagesArea');
const inputContainer = document.getElementById('inputContainer');
const emptyState = document.getElementById('emptyState');
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const newChatBtn = document.getElementById('newChatBtn');
const chatList = document.getElementById('chatList');
const modeSelect = document.getElementById('modeSelect');
const themeToggle = document.getElementById('themeToggle');

let typingTimeout;
let isGlorpTyping = false;
let currentChat = null;
let shouldStopTyping = false;
let currentResponseChatId = null; // Track which chat the current response belongs to, fixes issue when switching chats while Glorp is typing.. remove in future TODO!
let glorpMode = 'normal'; // Track current mode: 'normal' or 'thinking'

/**
 * Get system theme preference
 */
function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Initialize theme from IndexedDB or system preference
 */
async function initTheme() {
    const savedTheme = await getThemePreference();
    const theme = savedTheme || getSystemTheme();
    
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    }
    
    updateThemeIcon();
}

/**
 * Update theme icon
 */
function updateThemeIcon() {
    const icon = themeToggle.querySelector('.theme-icon');
    const isDark = document.body.classList.contains('dark-mode');
    icon.src = isDark ? 'assets/sun.svg' : 'assets/moon.svg';
    icon.alt = isDark ? 'Light mode' : 'Dark mode';
}

/**
 * Toggle theme
 */
async function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    await saveThemePreference(isDark ? 'dark' : 'light');
    updateThemeIcon();
}

/**
 * Initialize app
 */
async function initApp() {
    await initDB();
    
    // Initialize theme after DB is ready
    await initTheme();
    
    // Check if there's a shared chat in the URL
    const sharedChat = await loadSharedChat();
    if (sharedChat) {
        // Create a new chat with the shared messages
        currentChat = await createNewChat();
        currentChat.messages = sharedChat.messages;
        currentChat.title = sharedChat.title || 'Shared Glorp';
        await saveChat(currentChat);
        setCurrentChatId(currentChat.id);
        await loadChatMessages(currentChat);
        await updateChatList();
        updateEmptyState();
        // Clear the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }
    
    // Check if there's a current chat ID
    let chatId = getCurrentChatId();
    
    if (chatId) {
        // Try to load the chat
        currentChat = await getChat(chatId);
    }
    
    // If no chat or chat not found, create new one
    if (!currentChat) {
        currentChat = await createNewChat();
        setCurrentChatId(currentChat.id);
    }
    
    // Load chat messages
    await loadChatMessages(currentChat);
    
    // Load sidebar chat list
    await updateChatList();
    
    // Set up empty state
    updateEmptyState();
}

/**
 * Update empty state visibility
 */
function updateEmptyState() {
    if (currentChat && currentChat.messages.length === 0) {
        emptyState.classList.remove('hidden');
        inputContainer.classList.add('centered');
    } else {
        emptyState.classList.add('hidden');
        inputContainer.classList.remove('centered');
    }
}

/**
 * Load chat messages into UI
 */
async function loadChatMessages(chat) {
    // Clear current messages
    const messages = messagesArea.querySelectorAll('.message');
    messages.forEach(msg => msg.remove());
    
    // Add all messages from chat
    for (let i = 0; i < chat.messages.length; i++) {
        const msg = chat.messages[i];
        const messageDiv = createMessageElement(msg.content, msg.role === 'user', i);
        
        if (msg.role === 'assistant') {
            const content = messageDiv.querySelector('.content');
            if (content && msg.formattedContent) {
                // For assistant messages with formatted content, render it
                renderFormattedContent(content, msg.formattedContent, msg.formatType);
            } else if (content && msg.content) {
                // Fallback: render plain content
                content.textContent = msg.content;
            }
        }
        
        messagesArea.appendChild(messageDiv);
    }
    
    // Scroll to bottom
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

/**
 * Render formatted content (for loaded messages)
 */
function renderFormattedContent(container, response, formatType) {
    if (formatType === 'list' || formatType === 'steps') {
        const lines = response.text.split('\n');
        lines.forEach(line => {
            const lineElement = document.createElement('div');
            lineElement.textContent = line || '\u00A0'; // Use non-breaking space for empty lines
            container.appendChild(lineElement);
        });
    } else {
        const paragraphs = response.text.split('\n\n');
        paragraphs.forEach((para, index) => {
            const paragraphDiv = document.createElement('div');
            paragraphDiv.textContent = para;
            paragraphDiv.style.marginBottom = index < paragraphs.length - 1 ? '12px' : '0';
            container.appendChild(paragraphDiv);
        });
    }
    
    // Add codeblock if present
    if (response.hasCodeblock && response.codeblock) {
        const codeblock = createCodeblock(response.codeblock);
        
        if (response.codeblockPosition === 'start') {
            container.insertBefore(codeblock, container.firstChild);
        } else if (response.codeblockPosition === 'end') {
            container.appendChild(codeblock);
        } else {
            // Middle - insert in the middle
            const children = Array.from(container.children);
            const midPoint = Math.floor(children.length / 2);
            if (children[midPoint]) {
                container.insertBefore(codeblock, children[midPoint]);
            } else {
                container.appendChild(codeblock);
            }
        }
    }
}

/**
 * Update sidebar chat list
 */
async function updateChatList() {
    const chats = await getAllChats();
    chatList.innerHTML = '';
    
    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = 'chat-item';
        if (currentChat && chat.id === currentChat.id) {
            chatItem.classList.add('active');
        }
        
        const titleSpan = document.createElement('span');
        titleSpan.className = 'chat-item-title';
        titleSpan.textContent = chat.title;
        titleSpan.onclick = () => switchChat(chat.id);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-chat-btn';
        deleteBtn.innerHTML = '<img src="assets/trash.svg" alt="Delete">';
        deleteBtn.onclick = async (e) => {
            e.stopPropagation();
            await handleDeleteChat(chat.id);
        };
        
        chatItem.appendChild(titleSpan);
        chatItem.appendChild(deleteBtn);
        chatList.appendChild(chatItem);
    });
}

/**
 * Handle chat deletion
 */
async function handleDeleteChat(chatId) {
    // If deleting current chat, create a new one first
    if (currentChat && currentChat.id === chatId) {
        currentChat = await createNewChat();
        setCurrentChatId(currentChat.id);
        await loadChatMessages(currentChat);
        updateEmptyState();
    }
    
    await deleteChat(chatId);
    await updateChatList();
}

/**
 * Switch to a different chat
 */
async function switchChat(chatId) {
    if (isGlorpTyping) {
        shouldStopTyping = true;
        isGlorpTyping = false;
        
        // Update button back to send icon
        sendIcon.classList.remove('hidden');
        stopIcon.classList.add('hidden');
    }
    
    // Reset mode to normal when creating or switching chat, don't like this being site wide, makes it look as if its expensive lol
    glorpMode = 'normal';
    modeSelect.value = 'normal';
    
    currentChat = await getChat(chatId);
    setCurrentChatId(chatId);
    
    await loadChatMessages(currentChat);
    await updateChatList();
    updateEmptyState();
    
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
        sidebar.classList.remove('open');
    }
}

function resizeTextarea() {
    messageInput.style.height = 'auto';
    const scrollHeight = messageInput.scrollHeight;
    const newHeight = Math.max(48, Math.min(scrollHeight, 200));
    messageInput.style.height = newHeight + 'px';
}

function handleTyping() {
    clearTimeout(typingTimeout);

    const typingEvent = new CustomEvent('userTyping', {
        detail: { value: messageInput.value }
    });
    document.dispatchEvent(typingEvent);

    typingTimeout = setTimeout(() => {
        const stoppedEvent = new CustomEvent('userStoppedTyping', {
            detail: { value: messageInput.value }
        });
        document.dispatchEvent(stoppedEvent);
    }, 1000);
}

messageInput.addEventListener('input', function() {
    resizeTextarea();
    handleTyping();
});

messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendBtn.addEventListener('click', sendMessage);

/**
 * Create a message element
 */
function createMessageElement(text, isUser = false, messageIndex = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
    
    if (messageIndex !== null) {
        messageDiv.setAttribute('data-message-index', messageIndex);
    }
    
    messageDiv.addEventListener('click', function(e) {
        if (e.target.closest('button')) return;
        
        document.querySelectorAll('.message.actions-visible').forEach(msg => {
            if (msg !== messageDiv) {
                msg.classList.remove('actions-visible');
            }
        });
        
        messageDiv.classList.toggle('actions-visible');
    });
    
    if (isUser) {
        // Create text node for user message
        const textNode = document.createTextNode(text);
        messageDiv.appendChild(textNode);
        
        // Add action buttons for user messages
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'message-action-btn';
        editBtn.setAttribute('aria-label', 'Edit message');
        editBtn.innerHTML = '<img src="assets/pencil.svg" alt="Edit">';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            handleEditMessage(messageIndex);
        };
        
        const resendBtn = document.createElement('button');
        resendBtn.className = 'message-action-btn';
        resendBtn.setAttribute('aria-label', 'Resend message');
        resendBtn.innerHTML = '<img src="assets/arrow.svg" alt="Resend">';
        resendBtn.onclick = (e) => {
            e.stopPropagation();
            handleResendMessage(messageIndex);
        };
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(resendBtn);
        messageDiv.appendChild(actionsDiv);
    } else {
        // Assistant message with avatar
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
        
        const img = document.createElement('img');
        img.src = 'assets/glorp.png';
        img.alt = 'Glorp';
        avatar.appendChild(img);
        
        const content = document.createElement('div');
        content.className = 'content';
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        // Add share button for assistant messages
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        
        const shareBtn = document.createElement('button');
        shareBtn.className = 'message-action-btn';
        shareBtn.setAttribute('aria-label', 'Share conversation');
        shareBtn.innerHTML = '<img src="assets/share.svg" alt="Share">';
        shareBtn.onclick = () => handleShareMessage(messageIndex);
        
        actionsDiv.appendChild(shareBtn);
        messageDiv.appendChild(actionsDiv);
    }
    
    return messageDiv;
}

/**
 * Create a codeblock element
 */
function createCodeblock(code) {
    const wrapper = document.createElement('div');
    wrapper.className = 'codeblock-wrapper';
    
    const codeblock = document.createElement('div');
    codeblock.className = 'codeblock';
    
    const header = document.createElement('div');
    header.className = 'codeblock-header';
    
    const language = document.createElement('span');
    language.className = 'codeblock-language';
    language.textContent = 'glorpscript';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-button';
    copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
    
    const copyIcon = document.createElement('img');
    copyIcon.src = 'assets/clipboard.svg';
    copyIcon.alt = 'Copy';
    copyIcon.className = 'copy-icon';
    copyBtn.appendChild(copyIcon);
    
    copyBtn.onclick = function() {
        // Show loading, TODO add some delay to animation, because you never really see this
        copyIcon.src = 'assets/circle.svg';
        copyIcon.alt = 'Copying...';
        copyIcon.classList.add('spinning');
        
        // Strip HTML tags for copying
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = code;
        const plainCode = tempDiv.textContent || tempDiv.innerText || '';
        
        navigator.clipboard.writeText(plainCode).then(() => {
            copyIcon.src = 'assets/check.svg';
            copyIcon.alt = 'Copied';
            copyIcon.classList.remove('spinning');
            copyBtn.classList.add('copied');
            copyBtn.setAttribute('aria-label', 'Code copied to clipboard');
            
            setTimeout(() => {
                copyIcon.src = 'assets/clipboard.svg';
                copyIcon.alt = 'Copy';
                copyBtn.classList.remove('copied');
                copyBtn.setAttribute('aria-label', 'Copy code to clipboard');
            }, 2000);
        });
    };
    
    header.appendChild(language);
    header.appendChild(copyBtn);
    
    const content = document.createElement('div');
    content.className = 'codeblock-content';
    
    const pre = document.createElement('pre');
    pre.innerHTML = code;
    
    content.appendChild(pre);
    codeblock.appendChild(header);
    codeblock.appendChild(content);
    wrapper.appendChild(codeblock);
    
    return wrapper;
}

/**
 * Animate text appearing word by word or line by line
 */
async function animateText(container, text, formatType) {
    if (formatType === 'list' || formatType === 'steps') {
        // Animate line by line for lists and steps
        const lines = text.split('\n');
        const delays = getTypingDelays(text, formatType);
        
        for (let i = 0; i < lines.length; i++) {
            if (shouldStopTyping) break;
            
            await new Promise(resolve => setTimeout(resolve, delays[i]));
            
            const lineElement = document.createElement('div');
            lineElement.textContent = lines[i] || '\u00A0'; // Use non-breaking space for empty lines
            lineElement.style.opacity = '0';
            lineElement.style.animation = 'fadeIn 0.2s ease-in forwards';
            container.appendChild(lineElement);
            
            // Auto-scroll to bottom
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    } else {
        // Animate word by word for regular text
        const words = text.split(/\s+/);
        const delays = getTypingDelays(text, formatType);
        
        // Split text into paragraphs
        const paragraphs = text.split('\n\n');
        
        for (let p = 0; p < paragraphs.length; p++) {
            if (shouldStopTyping) break;
            
            const paragraphDiv = document.createElement('div');
            paragraphDiv.style.marginBottom = p < paragraphs.length - 1 ? '12px' : '0';
            container.appendChild(paragraphDiv);
            
            const paragraphWords = paragraphs[p].split(/\s+/);
            
            for (let i = 0; i < paragraphWords.length; i++) {
                if (shouldStopTyping) break;
                
                await new Promise(resolve => setTimeout(resolve, delays.shift() || 50));
                
                if (paragraphDiv.lastChild && paragraphDiv.lastChild.nodeType === Node.TEXT_NODE) {
                    paragraphDiv.lastChild.textContent += ' ' + paragraphWords[i];
                } else {
                    paragraphDiv.appendChild(document.createTextNode(paragraphWords[i]));
                }
                
                // Auto-scroll to bottom
                messagesArea.scrollTop = messagesArea.scrollHeight;
            }
        }
    }
}

/**
 * Display Glorp response with typing animation
 */
async function displayGlorpResponse(response) {
    isGlorpTyping = true;
    shouldStopTyping = false;
    
    // Update button to show stop icon
    sendIcon.classList.add('hidden');
    stopIcon.classList.remove('hidden');
    
    // Get the message index for the new assistant message (will be added after current messages)
    const messageIndex = currentChat.messages.length;
    
    const messageDiv = createMessageElement('', false, messageIndex);
    messagesArea.appendChild(messageDiv);
    
    const content = messageDiv.querySelector('.content');
    
    // Add "Hmm.." prefix if in thinking mode
    let displayText = response.text;
    if (glorpMode === 'thinking') {
        displayText = 'Hmm.. ' + displayText;
    }
    
    // Handle different codeblock positions (start, middle, end, none)
    if (response.hasCodeblock && response.codeblockPosition === 'start') {
        const codeblock = createCodeblock(response.codeblock);
        content.appendChild(codeblock);
        
        if (!shouldStopTyping) {
            await new Promise(resolve => setTimeout(resolve, 200));
            
            await animateText(content, displayText, response.formatType);
        }
        
    } else if (response.hasCodeblock && response.codeblockPosition === 'middle') {
        const textParts = displayText.split('\n\n');
        const midPoint = Math.floor(textParts.length / 2);
        
        const beforeText = textParts.slice(0, midPoint).join('\n\n');
        const afterText = textParts.slice(midPoint).join('\n\n');
        
        if (beforeText && !shouldStopTyping) {
            await animateText(content, beforeText, response.formatType);
        }
        
        if (!shouldStopTyping) {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Insert codeblock
            const codeblock = createCodeblock(response.codeblock);
            content.appendChild(codeblock);
            
            messagesArea.scrollTop = messagesArea.scrollHeight;
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if (afterText) {
                await animateText(content, afterText, response.formatType);
            }
        }
        
    } else if (response.hasCodeblock && response.codeblockPosition === 'end') {
        if (!shouldStopTyping) {
            await animateText(content, displayText, response.formatType);
        }
        
        if (!shouldStopTyping) {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const codeblock = createCodeblock(response.codeblock);
            content.appendChild(codeblock);
            
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
        
    } else {
        await animateText(content, displayText, response.formatType);
    }
    
    // Add completion indicator, need to add better UI for complete message TODO
    messageDiv.classList.add('complete');
    
    isGlorpTyping = false;
    shouldStopTyping = false;
    
    sendIcon.classList.remove('hidden');
    stopIcon.classList.add('hidden');
    messageInput.focus();
}

/**
 * Handle editing a user message
 */
async function handleEditMessage(messageIndex) {
    if (messageIndex === null || messageIndex === undefined) return;
    
    const message = currentChat.messages[messageIndex];
    if (!message || message.role !== 'user') return;
    
    if (isGlorpTyping) {
        shouldStopTyping = true;
        isGlorpTyping = false;
        sendIcon.classList.remove('hidden');
        stopIcon.classList.add('hidden');
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Delete this message and all messages after it first
    currentChat.messages = currentChat.messages.slice(0, messageIndex);
    await saveChat(currentChat);
    
    await loadChatMessages(currentChat);
    
    // Update empty state based on remaining messages
    if (currentChat.messages.length === 0) {
        emptyState.classList.remove('hidden');
        inputContainer.classList.add('centered');
    } else {
        emptyState.classList.add('hidden');
        inputContainer.classList.remove('centered');
    }
    
    // Put the message content back in the input
    messageInput.value = message.content;
    resizeTextarea();
    messageInput.focus();
}

/**
 * Handle resending a user message
 */
async function handleResendMessage(messageIndex) {
    if (messageIndex === null || messageIndex === undefined) return;
    
    const message = currentChat.messages[messageIndex];
    if (!message || message.role !== 'user') return;
    
    // Stop typing if Glorp is currently typing
    if (isGlorpTyping) {
        shouldStopTyping = true;
        isGlorpTyping = false;
        sendIcon.classList.remove('hidden');
        stopIcon.classList.add('hidden');
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    currentChat.messages = currentChat.messages.slice(0, messageIndex);
    await saveChat(currentChat);
    
    await loadChatMessages(currentChat);

    const messageText = message.content;
    
    currentResponseChatId = currentChat.id;

    emptyState.classList.add('hidden');
    inputContainer.classList.remove('centered');

    currentChat = await addMessageToChat(currentChat.id, {
        role: 'user',
        content: messageText,
        timestamp: Date.now()
    });
    
    const userMessage = createMessageElement(messageText, true, currentChat.messages.length - 1);
    messagesArea.appendChild(userMessage);
    
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    await updateChatList();
    
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

    const response = generateGlorpResponse(messageText);
    await displayGlorpResponse(response);
    
    if (currentResponseChatId === currentChat.id) {
        currentChat = await addMessageToChat(currentChat.id, {
            role: 'assistant',
            content: response.text,
            formattedContent: response,
            formatType: response.formatType,
            timestamp: Date.now()
        });
    }
    
    currentResponseChatId = null;
}

/**
 * Handle sharing conversation up to a specific message
 */
async function handleShareMessage(messageIndex) {
    if (messageIndex === null || messageIndex === undefined) return;
    
    const messagesToShare = currentChat.messages.slice(0, messageIndex + 1);
    
    // Create share object with same structure as IndexedDB messages
    const shareData = {
        title: currentChat.title,
        messages: messagesToShare.map(msg => ({
            role: msg.role,
            content: msg.content,
            formattedContent: msg.formattedContent,
            formatType: msg.formatType,
            timestamp: msg.timestamp
        }))
    };
    
    // Encode to URL-safe base64, this still breaks most of the time if its too large, but databses are for losers..
    const jsonString = JSON.stringify(shareData);
    const base64 = btoa(jsonString)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${base64}`;
    
    // Copy to clipboard
    try {
        await navigator.clipboard.writeText(shareUrl);

        const shareBtn = messagesArea.querySelector(`[data-message-index="${messageIndex}"] .message-action-btn[aria-label="Share conversation"]`);
        if (shareBtn) {
            const originalLabel = shareBtn.getAttribute('aria-label');
            shareBtn.setAttribute('aria-label', 'Link copied!');
            const img = shareBtn.querySelector('img');
            const originalSrc = img.src;
            img.src = 'assets/check.svg';
            
            setTimeout(() => {
                shareBtn.setAttribute('aria-label', originalLabel);
                img.src = originalSrc;
            }, 2000);
        }
    } catch (err) {
        console.error('Failed to copy share link:', err);
    }
}

/**
 * Load shared chat from URL
 */
async function loadSharedChat() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareParam = urlParams.get('share');
    
    if (!shareParam) return null;
    
    try {
        let base64 = shareParam
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        while (base64.length % 4) {
            base64 += '=';
        }
        
        const jsonString = atob(base64);
        const shareData = JSON.parse(jsonString);
        
        // Return the data in the same format as it was saved
        return {
            title: shareData.title,
            messages: shareData.messages
        };
    } catch (err) {
        console.error('Failed to load shared chat:', err);
        return null;
    }
}

/**
 * Send user message and get Glorp response
 */
async function sendMessage() {
    // If Glorp is typing, stop it
    if (isGlorpTyping) {
        shouldStopTyping = true;
        isGlorpTyping = false;
        
        sendIcon.classList.remove('hidden');
        stopIcon.classList.add('hidden');
        messageInput.focus();
        return;
    }
    
    const value = messageInput.value.trim();
    if (value) {
        currentResponseChatId = currentChat.id;
        
        const isFirstMessage = currentChat.messages.length === 0;
        if (isFirstMessage) {
            inputContainer.classList.remove('centered');
            inputContainer.classList.add('animating-down');
            emptyState.classList.add('hidden');
            
            setTimeout(() => {
                inputContainer.classList.remove('animating-down');
            }, 500);
        }
        
        currentChat = await addMessageToChat(currentChat.id, {
            role: 'user',
            content: value,
            timestamp: Date.now()
        });
        
        const userMessage = createMessageElement(value, true, currentChat.messages.length - 1);
        messagesArea.appendChild(userMessage);
        
        messageInput.value = '';
        messageInput.style.height = '48px';
        
        messagesArea.scrollTop = messagesArea.scrollHeight;
        
        await updateChatList();
        
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
        
        const response = generateGlorpResponse(value);
        await displayGlorpResponse(response);
        
        if (currentResponseChatId === currentChat.id) {
            currentChat = await addMessageToChat(currentChat.id, {
                role: 'assistant',
                content: response.text,
                formattedContent: response,
                formatType: response.formatType,
                timestamp: Date.now()
            });
        }
        
        currentResponseChatId = null;
    }
}

// Event Listeners
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

sidebarOverlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
});

newChatBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    if (isGlorpTyping) {
        shouldStopTyping = true;
        isGlorpTyping = false;
        
        const lastMessage = messagesArea.querySelector('.message.assistant:last-child');
        if (lastMessage && currentResponseChatId === currentChat.id) {
            const content = lastMessage.querySelector('.content');
            if (content) {
                const partialText = content.textContent.trim();
                if (partialText) {
                    await addMessageToChat(currentChat.id, {
                        role: 'assistant',
                        content: partialText,
                        timestamp: Date.now()
                    });
                }
            }
        }
        
        currentResponseChatId = null;
        
        sendIcon.classList.remove('hidden');
        stopIcon.classList.add('hidden');
    }
    
    glorpMode = 'normal';
    modeSelect.value = 'normal';
    
    sidebar.classList.remove('open');
    
    currentChat = await createNewChat();
    setCurrentChatId(currentChat.id);
    
    await loadChatMessages(currentChat);
    await updateChatList();
    updateEmptyState();
    
    messageInput.focus();
});

modeSelect.addEventListener('change', (e) => {
    glorpMode = e.target.value;
});

themeToggle.addEventListener('click', toggleTheme);

document.addEventListener('click', (e) => {
    if (!e.target.closest('.message')) {
        document.querySelectorAll('.message.actions-visible').forEach(msg => {
            msg.classList.remove('actions-visible');
        });
    }
});

document.addEventListener('userTyping', (e) => {
    // TODO
});

document.addEventListener('userStoppedTyping', (e) => {
    // TODO
});

initApp();
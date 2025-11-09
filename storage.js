// IndexedDB Storage for Glorp Chat

const DB_NAME = 'Glorp';
const DB_VERSION = 1; // meh
const CHAT_STORE = 'chats';
const SETTINGS_STORE = 'settings';

let db = null;

/**
 * Initialize IndexedDB
 */
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            // Create chats store if it doesn't exist
            if (!database.objectStoreNames.contains(CHAT_STORE)) {
                const chatStore = database.createObjectStore(CHAT_STORE, { keyPath: 'id' });
                chatStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            
            // Create settings store if it doesn't exist
            if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
                database.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
            }
        };
    });
}

/**
 * Generate unique chat ID
 */
function generateChatId() {
    return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Create a new chat session
 */
async function createNewChat() {
    const chat = {
        id: generateChatId(),
        title: 'New Glorp',
        messages: [],
        timestamp: Date.now(),
        lastUpdated: Date.now()
    };
    
    await saveChat(chat);
    return chat;
}

/**
 * Save chat to IndexedDB
 */
async function saveChat(chat) {
    return new Promise((resolve, reject) => {
        chat.lastUpdated = Date.now();
        
        const transaction = db.transaction([CHAT_STORE], 'readwrite');
        const store = transaction.objectStore(CHAT_STORE);
        const request = store.put(chat);
        
        request.onsuccess = () => resolve(chat);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get chat by ID
 */
async function getChat(chatId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CHAT_STORE], 'readonly');
        const store = transaction.objectStore(CHAT_STORE);
        const request = store.get(chatId);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all chats sorted by last updated (only non-empty chats)
 */
async function getAllChats() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CHAT_STORE], 'readonly');
        const store = transaction.objectStore(CHAT_STORE);
        const request = store.getAll();
        
        request.onsuccess = () => {
            const chats = request.result;
            // Filter out empty chats and sort by lastUpdated, most recent first
            const nonEmptyChats = chats.filter(chat => chat.messages && chat.messages.length > 0);
            nonEmptyChats.sort((a, b) => b.lastUpdated - a.lastUpdated);
            resolve(nonEmptyChats);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Delete chat by ID
 */
async function deleteChat(chatId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CHAT_STORE], 'readwrite');
        const store = transaction.objectStore(CHAT_STORE);
        const request = store.delete(chatId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Add message to chat
 */
async function addMessageToChat(chatId, message) {
    const chat = await getChat(chatId);
    if (!chat) throw new Error('Chat not found');
    
    chat.messages.push(message);
    
    // Update title based on first user message
    if (chat.messages.length === 1 && message.role === 'user') {
        chat.title = message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '');
    }
    
    await saveChat(chat);
    return chat;
}

/**
 * Get current chat ID from localStorage
 */
function getCurrentChatId() {
    return localStorage.getItem('currentChatId');
}

/**
 * Set current chat ID to localStorage
 */
function setCurrentChatId(chatId) {
    localStorage.setItem('currentChatId', chatId);
}

/**
 * Save theme preference to IndexedDB
 */
async function saveThemePreference(theme) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SETTINGS_STORE], 'readwrite');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.put({ key: 'theme', value: theme });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get theme preference from IndexedDB
 */
async function getThemePreference() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([SETTINGS_STORE], 'readonly');
        const store = transaction.objectStore(SETTINGS_STORE);
        const request = store.get('theme');
        
        request.onsuccess = () => resolve(request.result ? request.result.value : null);
        request.onerror = () => reject(request.error);
    });
}

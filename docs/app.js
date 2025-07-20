// NOTE: We no longer need the DOMContentLoaded wrapper because we are using 'defer' in the script tag.

// === CONFIGURATION ===
const API_BASE_URL = 'https://special-halibut-q7q56qj4p7xxfr76-80.app.github.dev';
const WEBSOCKET_URL = 'wss://special-halibut-q7q56qj4p7xxfr76-8080.app.github.dev';

// === STATE ===
let state = { currentUser: null, partner: null, websocket: null };

// === DOM ELEMENTS ===
const screens = { auth: document.getElementById('auth-screen'), main: document.getElementById('main-app') };
const authElements = { usernameInput: document.getElementById('username'), passwordInput: document.getElementById('password'), loginBtn: document.getElementById('login-btn'), registerBtn: document.getElementById('register-btn'), errorMsg: document.getElementById('auth-error') };
const mainAppElements = { currentUsername: document.getElementById('current-username'), partnerUsername: document.getElementById('partner-username'), partnerProfilePic: document.getElementById('partner-profile-pic'), chatHeaderUsername: document.getElementById('chat-header-username'), chatHeaderProfilePic: document.getElementById('chat-header-profile-pic'), lastMessagePreview: document.getElementById('last-message-preview'), lastMessageTime: document.getElementById('last-message-time'), logoutBtn: document.getElementById('logout-btn') };
const contentViews = { chat: document.getElementById('chat-view'), amara: document.getElementById('amara-view') };
const messageContainers = { chat: document.getElementById('message-container'), amara: document.getElementById('amara-message-container') };
const messageInputs = { chat: document.getElementById('message-input'), amara: document.getElementById('amara-message-input') };
const sendButtons = { chat: document.getElementById('send-btn'), amara: document.getElementById('send-amara-btn') };
const tabButtons = document.querySelectorAll('.tab-selector .tab');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = { overlay: document.getElementById('settings-modal'), closeBtn: document.getElementById('modal-close-btn'), profilePic: document.getElementById('settings-profile-pic'), nicknameInput: document.getElementById('nickname-input'), nicknameSaveBtn: document.getElementById('nickname-save-btn'), pfpInput: document.getElementById('pfp-upload-input'), pfpUploadBtn: document.getElementById('pfp-upload-btn'), status: document.getElementById('settings-status') };

// === FUNCTIONS ===

async function apiFetch(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, options);
        // Try to parse JSON, but if it fails (e.g., empty body), create a fallback.
        const responseData = await response.json().catch(() => ({ message: `Received a non-JSON response. Status: ${response.status}` }));
        if (!response.ok) {
            throw new Error(responseData.message || `HTTP error! Status: ${response.status}`);
        }
        return responseData;
    } catch (error) {
        console.error(`API Fetch Error (${endpoint}):`, error);
        throw error;
    }
}

const setStatusMessage = (element, message, type) => {
    element.textContent = message;
    element.className = `status-message ${type}`;
};

const switchScreen = (screenName) => {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
};

const handleLogin = async () => {
    const username = authElements.usernameInput.value.trim();
    const password = authElements.passwordInput.value.trim();
    if (!username || !password) { setStatusMessage(authElements.errorMsg, 'Please enter username and password.', 'error'); return; }
    try {
        const data = await apiFetch('login.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        initializeMainApp(data.userData, data.partnerData);
    } catch (error) {
        setStatusMessage(authElements.errorMsg, error.message, 'error');
    }
};

const handleRegister = async () => {
    const username = authElements.usernameInput.value.trim();
    const password = authElements.passwordInput.value.trim();
    if (!username || !password) { setStatusMessage(authElements.errorMsg, 'Please enter username and password.', 'error'); return; }
    try {
        await apiFetch('register.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        setStatusMessage(authElements.errorMsg, 'Registration successful! Please log in.', 'success');
        authElements.passwordInput.value = '';
    } catch (error) {
        setStatusMessage(authElements.errorMsg, error.message, 'error');
    }
};

const initializeMainApp = (userData, partnerData) => {
    state.currentUser = userData;
    state.partner = partnerData;
    updateProfileUI();
    switchScreen('main');
    loadChatHistory();
    connectWebSocket();
    switchView('chat-view');
};

const updateProfileUI = () => {
    const userDisplayName = state.currentUser.nickname || state.currentUser.username;
    mainAppElements.currentUsername.textContent = userDisplayName;
    const partnerDisplayName = state.partner.nickname || state.partner.username;
    mainAppElements.partnerUsername.textContent = partnerDisplayName;
    mainAppElements.chatHeaderUsername.textContent = partnerDisplayName;
    
    const cacheBuster = `?t=${new Date().getTime()}`;
    const userPfpUrl = state.currentUser.profilePic === 'default.png' ? 'assets/default.png' : `${API_BASE_URL}/uploads/${state.currentUser.profilePic}${cacheBuster}`;
    const partnerPfpUrl = state.partner.profilePic === 'default.png' ? 'assets/default.png' : `${API_BASE_URL}/uploads/${state.partner.profilePic}${cacheBuster}`;
    
    mainAppElements.partnerProfilePic.src = partnerPfpUrl;
    mainAppElements.chatHeaderProfilePic.src = partnerPfpUrl;
    settingsModal.profilePic.src = userPfpUrl;
};

const loadChatHistory = async () => {
    try {
        const messages = await apiFetch(`get_chat_history.php?userId=${state.currentUser.id}&partnerId=${state.partner.id}`);
        messageContainers.chat.innerHTML = '';
        messages.forEach(msg => {
            renderMessage('chat', msg.sender_id === state.currentUser.id ? 'sent' : 'received', msg.content);
        });
        updateLastMessage(messages[messages.length - 1]);
    } catch (error) { console.error("Failed to load chat history:", error); }
};

const connectWebSocket = () => {
    if (state.websocket) state.websocket.close();
    state.websocket = new WebSocket(WEBSOCKET_URL);
    state.websocket.onopen = () => {
        console.log('WebSocket Connected');
        state.websocket.send(JSON.stringify({ type: 'register', userId: state.currentUser.id }));
    };
    state.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chat' && data.senderId === state.partner.id) {
            renderMessage('chat', 'received', data.content);
            updateLastMessage({ content: data.content, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
        }
    };
    state.websocket.onclose = () => console.log('WebSocket Disconnected');
    state.websocket.onerror = (error) => console.error('WebSocket Error:', error);
};

const renderMessage = (view, type, content) => {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${type}`;
    bubble.textContent = content;
    messageContainers[view].appendChild(bubble);
    messageContainers[view].scrollTop = messageContainers[view].scrollHeight;
};

const updateLastMessage = (msg) => {
    if (!msg || !msg.content) { mainAppElements.lastMessagePreview.textContent = "No messages yet."; mainAppElements.lastMessageTime.textContent = ""; return; }
    mainAppElements.lastMessagePreview.textContent = msg.content.length > 25 ? msg.content.substring(0, 25) + '...' : msg.content;
    mainAppElements.lastMessageTime.textContent = msg.time || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
};

const sendChatMessage = () => {
    const content = messageInputs.chat.value.trim();
    if (!content || !state.websocket || state.websocket.readyState !== WebSocket.OPEN) return;
    state.websocket.send(JSON.stringify({ type: 'chat', senderId: state.currentUser.id, receiverId: state.partner.id, content }));
    renderMessage('chat', 'sent', content);
    updateLastMessage({ content, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    messageInputs.chat.value = '';
};

const sendAmaraMessage = async () => {
    const content = messageInputs.amara.value.trim();
    if (!content) return;
    renderMessage('amara', 'sent', content);
    messageInputs.amara.disabled = true;
    sendButtons.amara.disabled = true;
    try {
        const data = await apiFetch('amara.php', { method: 'POST', body: JSON.stringify({ userId: state.currentUser.id, partnerId: state.partner.id, message: content }) });
        renderMessage('amara', 'received', data.reply);
    } catch (error) {
        renderMessage('amara', 'received', `Error: ${error.message}`);
    } finally {
        messageInputs.amara.disabled = false;
        sendButtons.amara.disabled = false;
        messageInputs.amara.value = '';
    }
};

const switchView = (viewName) => {
    Object.values(contentViews).forEach(v => v.classList.remove('active'));
    document.getElementById(viewName).classList.add('active');
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.view === viewName));
};

const logout = () => {
    if (state.websocket) state.websocket.close();
    state = { currentUser: null, partner: null, websocket: null };
    authElements.usernameInput.value = '';
    authElements.passwordInput.value = '';
    setStatusMessage(authElements.errorMsg, '', '');
    switchScreen('auth');
};

const openSettingsModal = () => {
    settingsModal.nicknameInput.value = state.currentUser.nickname || '';
    updateProfileUI();
    setStatusMessage(settingsModal.status, '', '');
    settingsModal.overlay.style.display = 'flex';
};

const closeSettingsModal = () => { settingsModal.overlay.style.display = 'none'; };

const handleNicknameUpdate = async () => {
    const newNickname = settingsModal.nicknameInput.value.trim();
    if (!newNickname) { setStatusMessage(settingsModal.status, 'Nickname cannot be empty.', 'error'); return; }
    setStatusMessage(settingsModal.status, 'Saving...', '');
    try {
        await apiFetch('update_nickname.php', { method: 'POST', body: JSON.stringify({ userId: state.currentUser.id, nickname: newNickname }) });
        state.currentUser.nickname = newNickname;
        updateProfileUI();
        setStatusMessage(settingsModal.status, 'Nickname updated!', 'success');
    } catch (error) { setStatusMessage(settingsModal.status, error.message, 'error'); }
};

const handlePfpUpload = async () => {
    const file = settingsModal.pfpInput.files[0];
    if (!file) { setStatusMessage(settingsModal.status, 'Please select a file.', 'error'); return; }
    const formData = new FormData();
    formData.append('profilePic', file);
    formData.append('userId', state.currentUser.id);
    setStatusMessage(settingsModal.status, 'Uploading...', '');
    settingsModal.pfpUploadBtn.disabled = true;
    try {
        const data = await apiFetch('upload_pfp.php', { method: 'POST', body: formData });
        state.currentUser.profilePic = data.newFilename;
        updateProfileUI();
        setStatusMessage(settingsModal.status, 'Upload successful!', 'success');
    } catch (error) { setStatusMessage(settingsModal.status, error.message, 'error'); } finally { settingsModal.pfpUploadBtn.disabled = false; }
};

// === EVENT LISTENERS ===
authElements.loginBtn.addEventListener('click', handleLogin);
authElements.registerBtn.addEventListener('click', handleRegister);
sendButtons.chat.addEventListener('click', sendChatMessage);
messageInputs.chat.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
sendButtons.amara.addEventListener('click', sendAmaraMessage);
messageInputs.amara.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendAmaraMessage(); });
mainAppElements.logoutBtn.addEventListener('click', logout);
tabButtons.forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
settingsBtn.addEventListener('click', openSettingsModal);
settingsModal.closeBtn.addEventListener('click', closeSettingsModal);
settingsModal.nicknameSaveBtn.addEventListener('click', handleNicknameUpdate);
settingsModal.pfpUploadBtn.addEventListener('click', handlePfpUpload);
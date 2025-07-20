document.addEventListener('DOMContentLoaded', () => {
    // === CONFIGURATION ===
    // Use the hardcoded URLs from your specific Codespace for 100% reliability
    const API_BASE_URL = 'https://special-halibut-q7q56qj4p7xxfr76-80.app.github.dev'; // No /api here
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
    const settingsModal = { overlay: document.getElementById('settings-modal'), closeBtn: document.querySelector('.modal-close-btn'), profilePic: document.getElementById('settings-profile-pic'), nicknameInput: document.getElementById('nickname-input'), nicknameSaveBtn: document.getElementById('nickname-save-btn'), pfpInput: document.getElementById('pfp-upload-input'), pfpUploadBtn: document.getElementById('pfp-upload-btn'), status: document.getElementById('settings-status') };

    // === FUNCTIONS ===
    async function apiFetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, options);
            const responseData = await response.json().catch(() => ({ message: 'Invalid JSON response from server.' }));
            if (!response.ok) { throw new Error(responseData.message || `HTTP error! Status: ${response.status}`); }
            return responseData;
        } catch (error) { console.error(`API Fetch Error (${endpoint}):`, error); throw error; }
    }

    const setStatusMessage = (element, message, type) => { element.textContent = message; element.className = `status-message ${type}`; };

    const handleLogin = async () => { /* ... (Same logic, but uses apiFetch) */ };
    const handleRegister = async () => { /* ... (Same logic, but uses apiFetch) */ };

    const handleNicknameUpdate = async () => {
        const newNickname = settingsModal.nicknameInput.value.trim();
        if (!newNickname) { setStatusMessage(settingsModal.status, 'Nickname cannot be empty.', 'error'); return; }
        setStatusMessage(settingsModal.status, 'Saving...', '');
        try {
            const data = await apiFetch('update_nickname.php', { method: 'POST', body: JSON.stringify({ userId: state.currentUser.id, nickname: newNickname }) });
            if (data.success) {
                state.currentUser.nickname = newNickname;
                updateProfileUI();
                setStatusMessage(settingsModal.status, 'Nickname updated!', 'success');
            } else { throw new Error(data.message); }
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
            if (data.success) {
                state.currentUser.profilePic = data.newFilename;
                updateProfileUI();
                setStatusMessage(settingsModal.status, 'Upload successful!', 'success');
            } else { throw new Error(data.message); }
        } catch (error) { setStatusMessage(settingsModal.status, error.message, 'error'); } finally { settingsModal.pfpUploadBtn.disabled = false; }
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

    const openSettingsModal = () => {
        settingsModal.nicknameInput.value = state.currentUser.nickname || '';
        updateProfileUI();
        setStatusMessage(settingsModal.status, '', '');
        settingsModal.overlay.style.display = 'flex';
    };

    const closeSettingsModal = () => { settingsModal.overlay.style.display = 'none'; };

    // (All other functions like initializeMainApp, loadChatHistory, connectWebSocket, etc., remain largely the same)

    // === EVENT LISTENERS ===
    // (Add new listeners for settings)
    settingsBtn.addEventListener('click', openSettingsModal);
    settingsModal.closeBtn.addEventListener('click', closeSettingsModal);
    settingsModal.nicknameSaveBtn.addEventListener('click', handleNicknameUpdate);
    settingsModal.pfpUploadBtn.addEventListener('click', handlePfpUpload);
    // (Other listeners remain the same)
});
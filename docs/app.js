document.addEventListener('DOMContentLoaded', () => {
    // === CONFIGURATION (Hardcoded from your specific Codespace) ===
    const API_BASE_URL = 'https://special-halibut-q7q56qj4p7xxfr76-80.app.github.dev/api';
    const WEBSOCKET_URL = 'wss://special-halibut-q7q56qj4p7xxfr76-8080.app.github.dev';

    // === STATE ===
    let state = {
        currentUser: null,
        partner: null,
        websocket: null,
        activeView: 'chat' // 'chat' or 'amara'
    };

    // === DOM ELEMENTS ===
    const screens = {
        auth: document.getElementById('auth-screen'),
        main: document.getElementById('main-app')
    };
    const authElements = {
        usernameInput: document.getElementById('username'),
        passwordInput: document.getElementById('password'),
        loginBtn: document.getElementById('login-btn'),
        registerBtn: document.getElementById('register-btn'),
        errorMsg: document.getElementById('auth-error')
    };
    const mainAppElements = {
        currentUsername: document.getElementById('current-username'),
        partnerUsername: document.getElementById('partner-username'),
        partnerProfilePic: document.getElementById('partner-profile-pic'),
        chatHeaderUsername: document.getElementById('chat-header-username'),
        chatHeaderProfilePic: document.getElementById('chat-header-profile-pic'),
        lastMessagePreview: document.getElementById('last-message-preview'),
        lastMessageTime: document.getElementById('last-message-time'),
        logoutBtn: document.getElementById('logout-btn')
    };
    const viewContainers = {
        chat: document.getElementById('chat-view'),
        amara: document.getElementById('amara-view')
    };
    const messageContainers = {
        chat: document.getElementById('message-container'),
        amara: document.getElementById('amara-message-container')
    };
    const messageInputs = {
        chat: document.getElementById('message-input'),
        amara: document.getElementById('amara-message-input')
    };
    const sendButtons = {
        chat: document.getElementById('send-btn'),
        amara: document.getElementById('send-amara-btn')
    };
    const tabButtons = document.querySelectorAll('.tab-selector .tab');

    // === FUNCTIONS ===

    const switchScreen = (screenName) => {
        Object.values(screens).forEach(s => s.classList.remove('active'));
        screens[screenName].classList.add('active');
    };

    const setAuthError = (message) => {
        authElements.errorMsg.textContent = message;
    };

    const handleLogin = async () => {
        const username = authElements.usernameInput.value.trim();
        const password = authElements.passwordInput.value.trim();
        if (!username || !password) {
            setAuthError('Please enter both username and password.');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/login.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Login failed.');
            
            initializeMainApp(data.userData, data.partnerData);
        } catch (error) {
            setAuthError(error.message);
            console.error("Login Error:", error);
        }
    };

    const handleRegister = async () => {
        const username = authElements.usernameInput.value.trim();
        const password = authElements.passwordInput.value.trim();
        if (!username || !password) {
            setAuthError('Please enter both username and password.');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/register.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Registration failed.');
            setAuthError('Registration successful! Please log in.');
            authElements.passwordInput.value = '';
        } catch (error) {
            setAuthError(error.message);
            console.error("Register Error:", error);
        }
    };
    
    const initializeMainApp = (userData, partnerData) => {
        state.currentUser = userData;
        state.partner = partnerData;
        
        mainAppElements.currentUsername.textContent = userData.username;
        mainAppElements.partnerUsername.textContent = partnerData.username;
        mainAppElements.chatHeaderUsername.textContent = partnerData.username;
        
        switchScreen('main');
        loadChatHistory();
        connectWebSocket();
        switchView('chat');
    };
    
    const loadChatHistory = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/get_chat_history.php?userId=${state.currentUser.id}&partnerId=${state.partner.id}`);
            const messages = await res.json();
            messageContainers.chat.innerHTML = '';
            messages.forEach(msg => {
                renderMessage('chat', msg.sender_id === state.currentUser.id ? 'sent' : 'received', msg.content);
            });
            updateLastMessage(messages[messages.length - 1]);
        } catch (error) {
            console.error("Failed to load chat history:", error);
        }
    };

    const connectWebSocket = () => {
        if (state.websocket) {
            state.websocket.close();
        }
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
        if (!msg || !msg.content) {
            mainAppElements.lastMessagePreview.textContent = "No messages yet.";
            mainAppElements.lastMessageTime.textContent = "";
            return;
        }
        mainAppElements.lastMessagePreview.textContent = msg.content.length > 25 ? msg.content.substring(0, 25) + '...' : msg.content;
        mainAppElements.lastMessageTime.textContent = msg.time || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    };

    const sendChatMessage = () => {
        const content = messageInputs.chat.value.trim();
        if (!content || !state.websocket || state.websocket.readyState !== WebSocket.OPEN) return;
        
        const message = {
            type: 'chat',
            senderId: state.currentUser.id,
            receiverId: state.partner.id,
            content: content
        };
        
        state.websocket.send(JSON.stringify(message));
        renderMessage('chat', 'sent', content);
        updateLastMessage({ content: content, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
        messageInputs.chat.value = '';
    };

    const sendAmaraMessage = async () => {
        const content = messageInputs.amara.value.trim();
        if (!content) return;
        
        renderMessage('amara', 'sent', content);
        messageInputs.amara.disabled = true;
        sendButtons.amara.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/amara.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: state.currentUser.id,
                    partnerId: state.partner.id,
                    message: content
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.reply || "Unknown error from Amara.");
            renderMessage('amara', 'received', data.reply);
        } catch (error) {
            console.error("Amara Error:", error);
            renderMessage('amara', 'received', 'Error: Could not get a response from Amara.');
        } finally {
            messageInputs.amara.disabled = false;
            sendButtons.amara.disabled = false;
            messageInputs.amara.value = '';
        }
    };
    
    const switchView = (viewName) => {
        state.activeView = viewName;
        Object.values(viewContainers).forEach(v => v.classList.remove('active'));
        viewContainers[viewName].classList.add('active');
        
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.textContent.toLowerCase().includes(viewName));
        });
    };
    
    const logout = () => {
        if (state.websocket) state.websocket.close();
        state.currentUser = null;
        state.partner = null;
        authElements.usernameInput.value = '';
        authElements.passwordInput.value = '';
        setAuthError('');
        switchScreen('auth');
    }

    // === EVENT LISTENERS ===
    authElements.loginBtn.addEventListener('click', handleLogin);
    authElements.registerBtn.addEventListener('click', handleRegister);
    sendButtons.chat.addEventListener('click', sendChatMessage);
    messageInputs.chat.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });
    sendButtons.amara.addEventListener('click', sendAmaraMessage);
    messageInputs.amara.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAmaraMessage(); } });
    mainAppElements.logoutBtn.addEventListener('click', logout);
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.textContent.toLowerCase().includes('amara') ? 'amara' : 'chat';
            switchView(view);
        });
    });
});
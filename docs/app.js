document.addEventListener('DOMContentLoaded', () => {
    // === CONFIGURATION (Hardcoded from your specific Codespace) ===
    const API_BASE_URL = 'https://special-halibut-q7q56qj4p7xxfr76-80.app.github.dev/api';
    const WEBSOCKET_URL = 'wss://special-halibut-q7q56qj4p7xxfr76-8080.app.github.dev';

    // === STATE ===
    let state = { currentUser: null, partner: null, websocket: null };

    // === DOM ELEMENTS ===
    // (Most DOM elements remain the same)
    const settingsElements = {
        view: document.getElementById('settings-view'),
        profilePic: document.getElementById('settings-profile-pic'),
        uploadInput: document.getElementById('pfp-upload-input'),
        uploadBtn: document.getElementById('pfp-upload-btn'),
        uploadStatus: document.getElementById('upload-status'),
    };
    const navButtons = document.querySelectorAll('.bottom-nav button');

    // === FUNCTIONS ===

    // Generic fetch wrapper for better error handling
    async function apiFetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
                throw new Error(errorData.message);
            }
            return await response.json();
        } catch (error) {
            console.error(`API Fetch Error (${endpoint}):`, error);
            throw error; // Re-throw to be caught by the calling function
        }
    }

    const handleLogin = async () => {
        // ... uses apiFetch now
        try {
            const data = await apiFetch('login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            initializeMainApp(data.userData, data.partnerData);
        } catch (error) {
            setAuthError(error.message);
        }
    };

    const handleRegister = async () => {
        // ... uses apiFetch now
        try {
            const data = await apiFetch('register.php', { /* ... */ });
            setAuthError('Registration successful! Please log in.');
        } catch (error) {
            setAuthError(error.message);
        }
    };

    // NEW UPLOAD FUNCTION
    const handlePfpUpload = async () => {
        const file = settingsElements.uploadInput.files[0];
        if (!file) {
            setUploadStatus('Please select a file first.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('profilePic', file);
        formData.append('userId', state.currentUser.id);
        
        setUploadStatus('Uploading...', '');
        settingsElements.uploadBtn.disabled = true;

        try {
            const data = await apiFetch('upload_pfp.php', {
                method: 'POST',
                body: formData, // NOTE: No 'Content-Type' header needed for FormData
            });

            if (data.success) {
                setUploadStatus('Upload successful!', 'success');
                // Update state and UI with new image
                const newImageUrl = `${API_BASE_URL.replace('/api', '')}/${data.newUrl}?t=${new Date().getTime()}`; // Add timestamp to bust cache
                state.currentUser.profilePic = data.newUrl;
                document.getElementById('settings-profile-pic').src = newImageUrl;
                // You would update other profile pics here too if they existed
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            setUploadStatus(error.message, 'error');
        } finally {
            settingsElements.uploadBtn.disabled = false;
        }
    };

    const setUploadStatus = (message, type) => {
        settingsElements.uploadStatus.textContent = message;
        settingsElements.uploadStatus.className = `status-message ${type}`;
    };

    // (Other functions like connectWebSocket, sendMessage remain mostly the same but use apiFetch)

    // === EVENT LISTENERS ===
    // (Add listeners for nav and upload button)
    settingsElements.uploadBtn.addEventListener('click', handlePfpUpload);
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Logic to switch between chat-view, amara-view, and settings-view
        });
    });
});
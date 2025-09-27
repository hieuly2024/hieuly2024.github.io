// WEDDING FIREBASE - SILENT VERSION
// Tắt toast notifications phiền phức

let wishesData = [];
let currentPage = 1;
const itemsPerPage = 5;
let totalPages = 1;
let likesData = {};
let lastTapTime = 0;

// 🔧 NOTIFICATION SETTINGS - CONTROL TOAST MESSAGES
const NOTIFICATION_CONFIG = {
    // Set to false để tắt từng loại thông báo
    firebaseConnection: false,    // 🔥 Kết nối Firebase thành công
    syncSuccess: false,           // 🌐 Đã đồng bộ đến tất cả thiết bị
    newWishReceived: false,       // 💝 X lời chúc mới từ thiết bị khác
    wishSent: true,              // ✅ Lời chúc đã được gửi (keep this)
    errors: true,                // ❌ Error messages (keep this)

    // Advanced settings
    duration: {
        success: 2000,           // Success toast duration (ms)
        info: 1500,             // Info toast duration (ms)  
        error: 4000,            // Error toast duration (ms)
        warning: 3000           // Warning toast duration (ms)
    }
};

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCslqB0c_HpqjQhnYqBSw-mPQw_DASGT4w",
  authDomain: "wedding-wishes-nam2025.firebaseapp.com",
  databaseURL: "https://wedding-wishes-nam2025-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "wedding-wishes-nam2025",
  storageBucket: "wedding-wishes-nam2025.firebasestorage.app",
  messagingSenderId: "894669330387",
  appId: "1:894669330387:web:fd62ae2c06f6803e980126"
};

let database = null;
let isOnline = false;
let isFirebaseReady = false;

// Debug tools
window.debugApp = {
    data: () => ({
        wishes: wishesData.length,
        firebase: isFirebaseReady,
        online: isOnline
    }),

    // 🔧 Control notification settings
    notifications: {
        enableAll: () => {
            Object.keys(NOTIFICATION_CONFIG).forEach(key => {
                if (typeof NOTIFICATION_CONFIG[key] === 'boolean') {
                    NOTIFICATION_CONFIG[key] = true;
                }
            });
            console.log('✅ All notifications enabled');
        },

        disableAll: () => {
            Object.keys(NOTIFICATION_CONFIG).forEach(key => {
                if (typeof NOTIFICATION_CONFIG[key] === 'boolean') {
                    NOTIFICATION_CONFIG[key] = false;
                }
            });
            console.log('🔇 All notifications disabled');
        },

        silentMode: () => {
            NOTIFICATION_CONFIG.firebaseConnection = false;
            NOTIFICATION_CONFIG.syncSuccess = false;
            NOTIFICATION_CONFIG.newWishReceived = false;
            console.log('🤫 Silent mode: Only essential notifications');
        },

        status: () => {
            console.log('🔔 Notification Settings:', NOTIFICATION_CONFIG);
        },

        set: (type, value) => {
            if (NOTIFICATION_CONFIG.hasOwnProperty(type)) {
                NOTIFICATION_CONFIG[type] = value;
                console.log(`🔔 ${type}: ${value ? 'enabled' : 'disabled'}`);
            }
        }
    },

    export: () => {
        const data = {
            wishes: wishesData,
            likes: likesData,
            exportDate: new Date().toISOString(),
            version: 'firebase-silent'
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `wedding_firebase_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Only show essential success message
        if (NOTIFICATION_CONFIG.wishSent) {
            showToast('✅ Dữ liệu đã export!', 'success');
        }
    }
};

// 🔥 FIREBASE INITIALIZATION - Silent version
async function initFirebase() {
    try {
        console.log('🔥 Initializing Firebase (Silent Mode)...');

        // Check config
        if (firebaseConfig.apiKey.includes('your-api-key-here')) {
            console.warn('⚠️ Firebase config not set up');
            if (NOTIFICATION_CONFIG.errors) {
                showToast('⚠️ Cần setup Firebase config!', 'warning', NOTIFICATION_CONFIG.duration.warning);
            }
            return false;
        }

        // Load Firebase scripts
        await loadFirebaseScripts();

        // Initialize Firebase
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();

        // Test connection silently
        await database.ref('.info/connected').once('value');

        isFirebaseReady = true;
        console.log('✅ Firebase initialized successfully (Silent Mode)');

        // Setup listeners
        setupFirebaseListeners();

        // Load initial data
        await loadFromFirebase();

        // 🔇 SILENT: No success toast for Firebase connection
        if (NOTIFICATION_CONFIG.firebaseConnection) {
            showToast('🔥 Kết nối Firebase thành công!', 'success', NOTIFICATION_CONFIG.duration.success);
        }

        return true;

    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);

        if (NOTIFICATION_CONFIG.errors) {
            showToast('❌ Lỗi kết nối Firebase - Dùng offline mode', 'error', NOTIFICATION_CONFIG.duration.error);
        }

        loadFromLocalStorage();
        return false;
    }
}

// Load Firebase scripts
function loadFirebaseScripts() {
    return new Promise((resolve, reject) => {
        if (window.firebase) {
            resolve();
            return;
        }

        const scripts = [
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js'
        ];

        let loadedCount = 0;

        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loadedCount++;
                if (loadedCount === scripts.length) {
                    console.log('✅ Firebase scripts loaded');
                    resolve();
                }
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    });
}

// 📡 FIREBASE LISTENERS - Silent version  
function setupFirebaseListeners() {
    if (!database) return;

    // Listen for wishes changes
    database.ref('wishes').on('value', (snapshot) => {
        const data = snapshot.val();

        if (data && Array.isArray(data)) {
            const oldCount = wishesData.length;
            wishesData = data;

            console.log(`📡 Firebase sync: ${data.length} wishes received`);

            // 🔇 SILENT: Optional notification for new wishes
            if (data.length > oldCount && oldCount > 0 && NOTIFICATION_CONFIG.newWishReceived) {
                const newWishesCount = data.length - oldCount;
                showToast(`💝 ${newWishesCount} lời chúc mới!`, 'info', NOTIFICATION_CONFIG.duration.info);
            }

            updateDisplay();

            // Backup to localStorage
            localStorage.setItem('wedding_firebase_backup', JSON.stringify(data));
        }
    }, (error) => {
        console.error('❌ Firebase listener error:', error);
        if (NOTIFICATION_CONFIG.errors) {
            showToast('❌ Lỗi kết nối real-time!', 'error');
        }
    });

    // Listen for likes changes
    database.ref('likes').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            likesData = data;
            updateDisplay();
        }
    });

    // Listen for connection status - Silent
    database.ref('.info/connected').on('value', (snapshot) => {
        isOnline = snapshot.val() === true;
        console.log('🌐 Connection status:', isOnline ? 'Online' : 'Offline');

        // Optional connection status notifications
        if (isOnline && NOTIFICATION_CONFIG.firebaseConnection) {
            showToast('🌐 Online - Real-time sync active!', 'success', NOTIFICATION_CONFIG.duration.success);
        } else if (!isOnline && NOTIFICATION_CONFIG.firebaseConnection) {
            showToast('📱 Offline - Changes saved locally', 'warning', NOTIFICATION_CONFIG.duration.warning);
        }
    });

    console.log('📡 Firebase listeners setup (Silent Mode)');
}

// 📥 LOAD FROM FIREBASE
async function loadFromFirebase() {
    if (!database) return false;

    try {
        console.log('📥 Loading data from Firebase...');

        const snapshot = await database.ref('wishes').once('value');
        const data = snapshot.val();

        if (data && Array.isArray(data)) {
            wishesData = data;
            console.log(`✅ Loaded ${data.length} wishes from Firebase`);
        } else {
            console.log('📝 No wishes in Firebase, starting fresh');
            wishesData = [];
        }

        // Load likes
        const likesSnapshot = await database.ref('likes').once('value');
        const likesData_fb = likesSnapshot.val();

        if (likesData_fb) {
            likesData = likesData_fb;
        } else {
            likesData = {};
            wishesData.forEach(wish => {
                likesData[wish.id] = Math.floor(Math.random() * 8) + 1;
            });
        }

        updateDisplay();
        return true;

    } catch (error) {
        console.error('❌ Error loading from Firebase:', error);
        return false;
    }
}

// 💾 SAVE TO FIREBASE - Silent version
async function saveToFirebase() {
    if (!isFirebaseReady || !database) {
        console.warn('⚠️ Firebase not ready, saving to localStorage only');
        saveToLocalStorage();
        return false;
    }

    try {
        const updates = {
            '/wishes': wishesData,
            '/likes': likesData,
            '/lastUpdate': firebase.database.ServerValue.TIMESTAMP,
            '/statistics': {
                total: wishesData.length,
                present: wishesData.filter(w => w.presensi === 'hadir').length,
                absent: wishesData.filter(w => w.presensi === 'tidak_hadir').length,
                totalLikes: Object.values(likesData).reduce((sum, count) => sum + count, 0)
            }
        };

        await database.ref().update(updates);
        console.log('✅ Data saved to Firebase successfully');

        saveToLocalStorage();

        return true;

    } catch (error) {
        console.error('❌ Error saving to Firebase:', error);

        if (NOTIFICATION_CONFIG.errors) {
            showToast('❌ Không thể sync, đã lưu local', 'warning');
        }

        saveToLocalStorage();
        return false;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🎉 Wedding Website - Firebase Silent Version!');
    console.log('🔇 Notifications: Minimal mode');
    console.log('🔧 Debug: debugApp.notifications.status()');

    // Load localStorage first
    loadFromLocalStorage();

    // Connect Firebase silently
    const firebaseSuccess = await initFirebase();

    if (!firebaseSuccess) {
        console.log('📱 Running in offline mode');

        // Only show error if enabled
        if (NOTIFICATION_CONFIG.errors) {
            showToast('📱 Offline mode - Dữ liệu lưu local', 'info', NOTIFICATION_CONFIG.duration.info);
        }
    }

    console.log('✅ Silent initialization complete');
});

// 📝 SEND COMMENT - Silent version
async function sendComment(button) {
    console.log('📝 Sending comment...');

    const originalText = button.innerHTML;
    button.innerHTML = 'Đang gửi...';
    button.disabled = true;

    try {
        const name = document.getElementById('form-name').value.trim();
        const presence = document.getElementById('form-presence').value;
        const comment = document.getElementById('form-comment').value.trim();

        // Validation
        if (!name || presence === '0' || !comment) {
            if (NOTIFICATION_CONFIG.errors) {
                showToast('⚠️ Vui lòng điền đầy đủ thông tin!', 'warning');
            }
            return;
        }

        if (name.length < 2 || comment.length < 1) {
            if (NOTIFICATION_CONFIG.errors) {
                showToast('⚠️ Tên và lời chúc quá ngắn!', 'warning');
            }
            return;
        }

        // Create new wish
        const newWish = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
            nama: name,
            presensi: presence === '1' ? 'hadir' : 'tidak_hadir',
            ucapan: comment,
            timestamp: new Date().toISOString(),
            status: 'approved',
            replies: []
        };

        console.log('➕ Adding new wish:', newWish.nama);

        // Add to local array first
        wishesData.unshift(newWish);
        likesData[newWish.id] = 0;

        // Update display immediately
        updateDisplay();

        // Reset form
        document.getElementById('form-name').value = '';
        document.getElementById('form-presence').value = '0';
        document.getElementById('form-comment').value = '';

        // Show success message (keep this one)
        if (NOTIFICATION_CONFIG.wishSent) {
            showToast('✅ Lời chúc đã được gửi!', 'success');
        }

        // Save to Firebase silently
        const saved = await saveToFirebase();

        // 🔇 SILENT: No sync success toast
        if (saved && NOTIFICATION_CONFIG.syncSuccess) {
            showToast('🌐 Đã đồng bộ đến tất cả thiết bị!', 'info', NOTIFICATION_CONFIG.duration.info);
        }

    } catch (error) {
        console.error('❌ Send comment error:', error);

        if (NOTIFICATION_CONFIG.errors) {
            showToast('❌ Có lỗi xảy ra!', 'error');
        }

        // Rollback
        wishesData.shift();
        updateDisplay();

    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// 📱 LOCALSTORAGE functions
function saveToLocalStorage() {
    try {
        localStorage.setItem('wedding_firebase_wishes', JSON.stringify(wishesData));
        localStorage.setItem('wedding_firebase_likes', JSON.stringify(likesData));
        return true;
    } catch (error) {
        console.error('❌ localStorage save error:', error);
        return false;
    }
}

function loadFromLocalStorage() {
    try {
        const savedWishes = localStorage.getItem('wedding_firebase_wishes');
        const savedLikes = localStorage.getItem('wedding_firebase_likes');

        if (savedWishes) {
            wishesData = JSON.parse(savedWishes);
            console.log('📱 Loaded', wishesData.length, 'wishes from localStorage');
        } else {
            console.log('📝 No saved wishes, using sample data');
            addSampleData();
        }

        if (savedLikes) {
            likesData = JSON.parse(savedLikes);
        } else {
            likesData = {};
            wishesData.forEach(wish => {
                likesData[wish.id] = Math.floor(Math.random() * 5) + 1;
            });
        }

        updateDisplay();
        return true;

    } catch (error) {
        console.error('❌ localStorage load error:', error);
        addSampleData();
        return false;
    }
}

// Toggle like với Firebase sync
async function toggleLike(wishId, event) {
    if (event) event.stopPropagation();

    try {
        const isCurrentlyLiked = localStorage.getItem(`liked_${wishId}`) === 'true';

        if (isCurrentlyLiked) {
            likesData[wishId] = Math.max(0, (likesData[wishId] || 0) - 1);
            localStorage.removeItem(`liked_${wishId}`);
        } else {
            likesData[wishId] = (likesData[wishId] || 0) + 1;
            localStorage.setItem(`liked_${wishId}`, 'true');
        }

        // Update display immediately
        updateDisplay();

        // Save to Firebase silently
        if (isFirebaseReady && database) {
            try {
                await database.ref(`likes/${wishId}`).set(likesData[wishId]);
            } catch (error) {
                console.error('Like sync error:', error);
            }
        }

        console.log(isCurrentlyLiked ? '💔 Unliked' : '❤️ Liked', 'wish', wishId);

    } catch (error) {
        console.error('❌ Toggle like error:', error);
    }
}

// [Include all display functions from previous version - keeping them identical]

function updateDisplay() {
    calculateTotalPages();
    displayCurrentPage();
    updateStatistics();
    updatePagination();
    setupDoubleTapListeners();
}

function calculateTotalPages() {
    totalPages = Math.max(1, Math.ceil(wishesData.length / itemsPerPage));
}

function displayCurrentPage() {
    const wishesListContainer = document.getElementById('wishesList');
    if (!wishesListContainer) return;

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentWishes = wishesData.slice(startIndex, endIndex);

    wishesListContainer.innerHTML = '';

    if (currentWishes.length === 0) {
        wishesListContainer.innerHTML = `
            <div class="text-center py-5">
                <div class="mb-3">
                    <i class="fas fa-heart fa-3x text-muted"></i>
                </div>
                <h5 class="text-muted">Chưa có lời chúc nào</h5>
                <p class="text-muted">Hãy là người đầu tiên gửi lời chúc!</p>
            </div>
        `;
        return;
    }

    currentWishes.forEach(wish => {
        const wishElement = createWishElement(wish);
        wishesListContainer.appendChild(wishElement);
    });
}

function createWishElement(wish) {
    const div = document.createElement('div');
    div.className = 'wish-item mb-3 card';
    div.dataset.wishId = wish.id;

    const likeCount = likesData[wish.id] || 0;
    const timeFormatted = formatTime(wish.timestamp);
    const statusClass = wish.presensi === 'hadir' ? 'text-success' : 'text-warning';
    const statusText = wish.presensi === 'hadir' ? '✅' : '❌';
    const isLiked = localStorage.getItem(`liked_${wish.id}`) === 'true';

    div.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="card-title mb-1">${escapeHtml(wish.nama)} <span class="${statusClass}">${statusText}</span><small class="text-muted">${timeFormatted}</small></h6>
                    
                    <p class="card-text mt-2">${escapeHtml(wish.ucapan)}</p>
                </div>
                <div class="text-end">
                    <button class="btn btn-sm ${isLiked ? 'btn-danger' : 'btn-outline-danger'}" onclick="toggleLike('${wish.id}', event)">
                        <i class="fas fa-heart"></i> ${likeCount}
                    </button>
                </div>
            </div>
        </div>
    `;

    return div;
}

function updateStatistics() {
    const total = wishesData.length;
    const present = wishesData.filter(w => w.presensi === 'hadir').length;
    const absent = wishesData.filter(w => w.presensi === 'tidak_hadir').length;
    const totalLikes = Object.values(likesData).reduce((sum, count) => sum + count, 0);

    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    };

    updateElement('commentsCount', total);
    updateElement('totalComments', total);
    updateElement('presentCount', present);
    updateElement('absentCount', absent);
    updateElement('totalLikesCount', totalLikes);
}

function updatePagination() {
    const pageInfo = document.getElementById('pageInfo');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (pageInfo) pageInfo.textContent = `${currentPage}/${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

// Navigation functions
function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        displayCurrentPage();
        updatePagination();
        setupDoubleTapListeners();
    }
}

function nextPage() {
    if (currentPage < totalPages) goToPage(currentPage + 1);
}

function prevPage() {
    if (currentPage > 1) goToPage(currentPage - 1);
}

function changePage(direction) {
    if (direction === 'prev') prevPage();
    else if (direction === 'next') nextPage();
}

// Double tap
function setupDoubleTapListeners() {
    const wishItems = document.querySelectorAll('.wish-item');
    wishItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (e.target.closest('button')) return;

            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTapTime;

            if (tapLength < 500 && tapLength > 0) {
                const wishId = this.dataset.wishId;
                doubleTapLike(wishId);
                e.preventDefault();
            }

            lastTapTime = currentTime;
        });
    });
}

function doubleTapLike(wishId) {
    const isCurrentlyLiked = localStorage.getItem(`liked_${wishId}`) === 'true';

    if (!isCurrentlyLiked) {
        toggleLike(wishId);
    }
}

// Utility functions
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const map = {
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}

function formatTime(timestamp) {
    try {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = now - time;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 7) return `${days} ngày trước`;

        return time.toLocaleDateString('vi-VN');
    } catch {
        return 'Vừa xong';
    }
}

function addSampleData() {
    wishesData = [
        {
            id: "sample1",
            nama: "Gia đình cô dâu",
            presensi: "hadir",
            ucapan: "Chúc hai bạn trăm năm hạnh phúc, sớm có con trai nối dõi tông đường!",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            status: "approved",
            replies: []
        },
        {
            id: "sample2",
            nama: "Bạn thân thời học",
            presensi: "hadir",
            ucapan: "Chúc mừng đám cưới! Hạnh phúc bên nhau nhé! 💕",
            timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            status: "approved",
            replies: []
        }
    ];

    wishesData.forEach(wish => {
        likesData[wish.id] = Math.floor(Math.random() * 15) + 5;
    });
}

// 🔇 SILENT TOAST - Only show if enabled
function showToast(message, type = 'info', duration) {
    // Use default duration if not specified
    if (!duration) {
        duration = NOTIFICATION_CONFIG.duration[type] || 3000;
    }

    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        background: ${colors[type]};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        cursor: pointer;
    `;
    toast.textContent = message;

    toast.addEventListener('click', () => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    });

    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Network listeners - Silent
window.addEventListener('online', () => {
    console.log('🌐 Internet reconnected');
    if (isFirebaseReady && NOTIFICATION_CONFIG.firebaseConnection) {
        showToast('🌐 Reconnected - Syncing data...', 'success');
    } else if (!isFirebaseReady) {
        initFirebase();
    }
});

window.addEventListener('offline', () => {
    console.log('📱 Internet disconnected'); 
    if (NOTIFICATION_CONFIG.firebaseConnection) {
        showToast('📱 Offline - Changes saved locally', 'warning');
    }
});

console.log('🔇 Firebase Silent Wedding Website Ready!');
console.log('🔔 Use debugApp.notifications to control toasts');


// Auto-create pagination controls
function createPaginationControls() {
    const wishesListContainer = document.getElementById('wishesList');
    if (!wishesListContainer) return;
    
    let paginationContainer = document.querySelector('.pagination-container');
    if (paginationContainer) return; // Already exists
    
    paginationContainer = document.createElement('div');
    paginationContainer.className = 'pagination-container mt-4';
    paginationContainer.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <button id="prevBtn" class="btn btn-outline-primary" onclick="prevPage()">
                <i class="fas fa-chevron-left"></i> Trang trước
            </button>
            
            <span id="pageInfo" class="text-muted">
                Trang 1/1
            </span>
            
            <button id="nextBtn" class="btn btn-outline-primary" onclick="nextPage()">
                Trang sau <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    
    wishesListContainer.parentNode.insertBefore(paginationContainer, wishesListContainer.nextSibling);
}

// Call this after DOM loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(createPaginationControls, 1000);
});

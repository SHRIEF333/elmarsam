// Booking Management System - نسخة متعددة الأجهزة
class BookingManager {
    constructor() {
        this.bookings = this.loadBookings();
        this.notifications = this.loadNotifications();
        this.currentEditingId = null;
        this.socket = null;
        this.useServer = true;
        this.init();
    }

    init() {
        this.connectToServer();
        this.setupEventListeners();
        this.setDefaultDate();
        this.renderBookings();
        this.updateReports();
        this.updateNotificationsBadge();
        this.setupMessageListener();
        this.checkForNewPayments();
    }

    connectToServer() {
        try {
            this.socket = io();

            this.socket.on('connect', () => {
                console.log('✅ متصل بالخادم!');
                this.updateConnectionStatus(true);
            });

            // استقبال البيانات الأولية
            this.socket.on('initial-data', (data) => {
                console.log('📥 استقبال البيانات من الخادم');
                this.bookings = data.bookings || [];
                this.notifications = data.notifications || [];
                this.renderBookings();
                this.updateReports();
                this.updateNotificationsBadge();
            });

            // استقبال حجز جديد
            this.socket.on('booking-added', (data) => {
                console.log('🎉 حجز جديد من خادم:', data.booking);
                
                // التحقق من عدم التكرار
                if (!this.bookings.find(b => b.id === data.booking.id)) {
                    this.bookings.unshift(data.booking);
                    this.addNotification(data.notification);
                    this.renderBookings();
                    this.updateReports();
                    this.playNotificationSound();
                    this.showNotificationAlert(data.booking);
                }
            });

            // حذف حجز
            this.socket.on('booking-deleted', (bookingId) => {
                console.log('🗑️ حجز محذوف:', bookingId);
                this.bookings = this.bookings.filter(b => b.id !== bookingId);
                this.renderBookings();
                this.updateReports();
            });

            // تعديل حجز
            this.socket.on('booking-updated', (updatedBooking) => {
                console.log('✏️ حجز معدل:', updatedBooking);
                const index = this.bookings.findIndex(b => b.id === updatedBooking.id);
                if (index !== -1) {
                    this.bookings[index] = updatedBooking;
                    this.renderBookings();
                    this.updateReports();
                }
            });

            // قطع الاتصال
            this.socket.on('disconnect', () => {
                console.log('⚠️ قطع الاتصال بالخادم');
                this.updateConnectionStatus(false);
            });

            this.socket.on('error', () => {
                console.log('⚠️ خطأ في الاتصال - استخدام محلي');
                this.useServer = false;
                this.updateConnectionStatus(false);
            });

        } catch (error) {
            console.log('ℹ️ Socket.io غير متاح - استخدام محلي');
            this.useServer = false;
        }
    }

    updateConnectionStatus(connected) {
        let statusDiv = document.getElementById('connectionStatus');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'connectionStatus';
            statusDiv.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                padding: 10px 15px;
                border-radius: 5px;
                font-weight: 600;
                z-index: 1000;
                font-size: 0.9em;
            `;
            document.body.appendChild(statusDiv);
        }

        if (connected) {
            statusDiv.textContent = '🟢 متصل بالخادم (متعدد الأجهزة)';
            statusDiv.style.background = '#28a745';
            statusDiv.style.color = 'white';
        } else {
            statusDiv.textContent = '🔴 وضع محلي (جهاز واحد فقط)';
            statusDiv.style.background = '#ffc107';
            statusDiv.style.color = '#333';
        }
    }

    setupEventListeners() {
        // Notifications - Click on button toggles panel
        const notificationsBtn = document.getElementById('notificationsBtn');
        const notificationsPanel = document.getElementById('notificationsPanel');
        
        notificationsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            if (notificationsPanel.classList.contains('show')) {
                // Closing - set max-height to 0
                notificationsPanel.style.maxHeight = null;
                notificationsPanel.classList.remove('show');
            } else {
                // Opening - calculate and set max-height
                notificationsPanel.classList.add('show');
                notificationsPanel.style.maxHeight = notificationsPanel.scrollHeight + 'px';
                this.renderNotifications();
            }
        });
        
        // Prevent closing when clicking inside the panel
        notificationsPanel.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        document.getElementById('clearNotifications').addEventListener('click', () => this.clearNotifications());

        // Close notifications when clicking outside
        document.addEventListener('click', (e) => {
            if (!notificationsBtn.contains(e.target) && !notificationsPanel.contains(e.target)) {
                if (notificationsPanel.classList.contains('show')) {
                    notificationsPanel.style.maxHeight = null;
                    notificationsPanel.classList.remove('show');
                }
            }
        });

        // Tab navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Course price mapping
        this.coursePrice = {
            '🎨 مستوى اول (4 حصص) - 100 ج': '100',
            '🎨 مستوى ثاني (4 حصص) - 120 ج': '120',
            '🎨 مستوى ثالث (4 حصص) - 120 ج': '120',
            '🎨 مستوى متقدم واساسيات بورتريه (4 حصص) - 150 ج': '150'
        };

        // Auto-fill price when selecting course (Add form)
        const courseSelect = document.getElementById('courseName');
        const amountSelect = document.getElementById('amount');
        
        if (courseSelect && amountSelect) {
            courseSelect.addEventListener('change', () => {
                const selectedCourse = courseSelect.value;
                if (this.coursePrice[selectedCourse]) {
                    amountSelect.value = this.coursePrice[selectedCourse];
                }
            });
        }

        // Auto-fill price when selecting course (Edit form)
        const editCourseSelect = document.getElementById('editCourseName');
        const editAmountSelect = document.getElementById('editAmount');
        
        if (editCourseSelect && editAmountSelect) {
            editCourseSelect.addEventListener('change', () => {
                const selectedCourse = editCourseSelect.value;
                if (this.coursePrice[selectedCourse]) {
                    editAmountSelect.value = this.coursePrice[selectedCourse];
                }
            });
        }

        // Add booking form
        document.getElementById('addBookingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addBooking();
        });

        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterBookings(e.target.value);
        });

        // Edit modal
        document.querySelector('.close').addEventListener('click', () => this.closeEditModal());
        document.getElementById('cancelEdit').addEventListener('click', () => this.closeEditModal());
        document.getElementById('editBookingForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateBooking();
        });

        // Delete modal
        document.getElementById('cancelDelete').addEventListener('click', () => this.closeDeleteModal());
        document.getElementById('confirmDelete').addEventListener('click', () => this.deleteBooking());

        // Close modals on background click
        document.getElementById('editModal').addEventListener('click', (e) => {
            if (e.target.id === 'editModal') this.closeEditModal();
        });

        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') this.closeDeleteModal();
        });
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('bookingDate').value = today;
        document.getElementById('editBookingDate').value = today;
    }

    // Local Storage Management
    loadBookings() {
        const stored = localStorage.getItem('elmarsam_bookings');
        return stored ? JSON.parse(stored) : [];
    }

    saveBookings() {
        localStorage.setItem('elmarsam_bookings', JSON.stringify(this.bookings));
    }

    // Booking CRUD Operations
    addBooking() {
        const personName = document.getElementById('personName').value.trim();
        const courseName = document.getElementById('courseName').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const bookingDate = document.getElementById('bookingDate').value;
        const notes = document.getElementById('notes').value.trim();

        if (!personName || !courseName || !amount) {
            this.showNotification('الرجاء ملء جميع الحقول المطلوبة', 'error');
            return;
        }

        const booking = {
            id: Date.now(),
            personName,
            courseName,
            amount,
            bookingDate,
            notes,
            paymentStatus: 'completed',
            createdAt: new Date().toLocaleString('ar-EG')
        };

        this.bookings.push(booking);
        this.saveBookings();

        // Clear form
        document.getElementById('addBookingForm').reset();
        this.setDefaultDate();

        this.showNotification('✅ تم إضافة الحجز بنجاح', 'success');
        this.renderBookings();
        this.updateReports();
    }

    editBooking(id) {
        const booking = this.bookings.find(b => b.id === id);
        if (!booking) return;

        this.currentEditingId = id;
        document.getElementById('editPersonName').value = booking.personName;
        document.getElementById('editCourseName').value = booking.courseName;
        document.getElementById('editAmount').value = booking.amount;
        document.getElementById('editBookingDate').value = booking.bookingDate;
        document.getElementById('editNotes').value = booking.notes;

        document.getElementById('editModal').classList.add('show');
    }

    updateBooking() {
        const booking = this.bookings.find(b => b.id === this.currentEditingId);
        if (!booking) return;

        booking.personName = document.getElementById('editPersonName').value.trim();
        booking.courseName = document.getElementById('editCourseName').value.trim();
        booking.amount = parseFloat(document.getElementById('editAmount').value);
        booking.bookingDate = document.getElementById('editBookingDate').value;
        booking.notes = document.getElementById('editNotes').value.trim();

        this.saveBookings();
        this.closeEditModal();
        this.showNotification('✅ تم تحديث الحجز بنجاح', 'success');
        this.renderBookings();
        this.updateReports();
    }

    deleteBooking(id = null) {
        const idToDelete = id || this.currentEditingId;
        this.bookings = this.bookings.filter(b => b.id !== idToDelete);
        this.saveBookings();
        this.closeDeleteModal();
        this.showNotification('✅ تم حذف الحجز بنجاح', 'success');
        this.renderBookings();
        this.updateReports();
    }

    // UI Methods
    switchTab(tabName) {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) btn.classList.add('active');
        });

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');
    }

    renderBookings(bookingsToRender = this.bookings) {
        const tbody = document.getElementById('bookingsTable');
        const noData = document.getElementById('noData');

        tbody.innerHTML = '';

        if (bookingsToRender.length === 0) {
            noData.style.display = 'block';
            return;
        }

        noData.style.display = 'none';

        bookingsToRender.forEach((booking, index) => {
            const row = document.createElement('tr');
            
            // إضافة animation للحجز الجديد (الأول في القائمة)
            if (index === 0 && booking.paymentStatus === 'completed') {
                row.classList.add('new-booking');
            }
            
            const status = booking.paymentStatus === 'completed' ? '✅ مدفوع' : '⏳ في الانتظار';
            const statusColor = booking.paymentStatus === 'completed' ? 'color: #28a745;' : 'color: #ffc107;';
            
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${booking.personName}</strong></td>
                <td>${booking.courseName}</td>
                <td>${booking.amount.toFixed(2)} ج.م</td>
                <td>${new Date(booking.bookingDate).toLocaleDateString('ar-EG')}</td>
                <td style="${statusColor}"><strong>${status}</strong></td>
                <td>
                    <button class="btn btn-sm btn-edit" onclick="manager.editBooking(${booking.id})" title="تعديل">✏️</button>
                    <button class="btn btn-sm btn-delete" onclick="manager.showDeleteConfirm(${booking.id})" title="حذف">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    filterBookings(searchTerm) {
        if (!searchTerm) {
            this.renderBookings();
            return;
        }

        const filtered = this.bookings.filter(booking =>
            booking.personName.includes(searchTerm) ||
            booking.courseName.includes(searchTerm)
        );

        this.renderBookings(filtered);
    }

    showDeleteConfirm(id) {
        this.currentEditingId = id;
        document.getElementById('deleteModal').classList.add('show');
    }

    closeEditModal() {
        document.getElementById('editModal').classList.remove('show');
        this.currentEditingId = null;
    }

    closeDeleteModal() {
        document.getElementById('deleteModal').classList.remove('show');
        this.currentEditingId = null;
    }

    // Reports and Statistics
    updateReports() {
        this.updateMainStats();
        this.updateCourseStats();
        this.updateTopPayments();
    }

    updateMainStats() {
        // Total bookings
        document.getElementById('totalBookings').textContent = this.bookings.length;

        // Total amount
        const totalAmount = this.bookings.reduce((sum, b) => sum + b.amount, 0);
        document.getElementById('totalAmount').textContent = totalAmount.toFixed(2) + 'ج.م';

        // Unique courses
        const uniqueCourses = new Set(this.bookings.map(b => b.courseName)).size;
        document.getElementById('uniqueCourses').textContent = uniqueCourses;

        // Max booking
        const maxBooking = this.bookings.length > 0 ? Math.max(...this.bookings.map(b => b.amount)) : 0;
        document.getElementById('maxBooking').textContent = maxBooking.toFixed(2) + 'ج.م';
    }

    updateCourseStats() {
        const courseStats = {};

        this.bookings.forEach(booking => {
            if (!courseStats[booking.courseName]) {
                courseStats[booking.courseName] = {
                    count: 0,
                    total: 0
                };
            }
            courseStats[booking.courseName].count++;
            courseStats[booking.courseName].total += booking.amount;
        });

        // Sort by count
        const sorted = Object.entries(courseStats)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);

        const tbody = document.getElementById('coursesStats');
        tbody.innerHTML = '';

        sorted.forEach(([course, stats]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${course}</strong></td>
                <td>${stats.count}</td>
                <td>${stats.total.toFixed(2)} ج.م</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateTopPayments() {
        const sorted = [...this.bookings]
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);

        const tbody = document.getElementById('topPayments');
        tbody.innerHTML = '';

        sorted.forEach(booking => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${booking.personName}</strong></td>
                <td>${booking.courseName}</td>
                <td>${booking.amount.toFixed(2)} ج.م</td>
            `;
            tbody.appendChild(row);
        });
    }

    // Notifications
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'error' ? '#dc3545' : '#28a745'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 2000;
            font-weight: 600;
            animation: slideIn 0.3s;
            max-width: 400px;
        `;
        notification.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        if (!document.querySelector('style[data-notification]')) {
            style.setAttribute('data-notification', 'true');
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s';
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Notifications Management
    loadNotifications() {
        const stored = localStorage.getItem('elmarsam_notifications');
        return stored ? JSON.parse(stored) : [];
    }

    saveNotifications() {
        localStorage.setItem('elmarsam_notifications', JSON.stringify(this.notifications));
    }

    renderNotifications() {
        const list = document.getElementById('notificationsList');
        
        if (this.notifications.length === 0) {
            list.innerHTML = '<p class="no-notifications">لا توجد إشعارات حالياً</p>';
            return;
        }

        list.innerHTML = '';
        this.notifications.forEach(notif => {
            const item = document.createElement('div');
            item.className = 'notification-item success';
            item.innerHTML = `
                <div class="notification-item-text">
                    ✅ ${notif.message}
                </div>
                <div class="notification-item-meta">
                    ${notif.timestamp}
                </div>
            `;
            list.appendChild(item);
        });
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        if (this.notifications.length > 50) {
            this.notifications.pop();
        }
        this.saveNotifications();
        this.updateNotificationsBadge();
        this.renderNotifications();
    }

    clearNotifications() {
        if (confirm('هل تريد حذف جميع الإشعارات؟')) {
            this.notifications = [];
            this.saveNotifications();
            this.updateNotificationsBadge();
            this.renderNotifications();
        }
    }

    updateNotificationsBadge() {
        const badge = document.getElementById('notificationsBadge');
        badge.textContent = this.notifications.length > 0 ? this.notifications.length : '0';
    }

    setupMessageListener() {
        // استقبال الرسائل من نوافذ أخرى (payment.html)
        window.addEventListener('message', (event) => {
            if (event.data.type === 'NEW_PAYMENT') {
                const payment = event.data.data;
                
                console.log('📨 رسالة جديدة من نافذة أخرى:', payment);
                
                // إضافة إشعار
                this.addNotification(payment);

                // إضافة حجز جديد
                const exists = this.bookings.find(b => b.id === payment.id);
                if (!exists) {
                    const booking = {
                        id: payment.id,
                        personName: payment.personName,
                        courseName: payment.courseName,
                        amount: payment.amount,
                        phone: payment.phone || '',
                        bookingDate: new Date().toISOString().split('T')[0],
                        notes: `تم الدفع عبر: ${payment.method}`,
                        createdAt: payment.timestamp,
                        paymentStatus: 'completed'
                    };
                    
                    this.bookings.push(booking);
                    this.saveBookings();
                    this.renderBookings();
                    this.updateReports();
                    
                    // تنبيه صوتي وبصري
                    this.playNotificationSound();
                    this.showNotificationAlert(payment);
                }
            }
        });

        // مراقبة تغييرات localStorage (للمزامنة بين التبويبات المختلفة)
        window.addEventListener('storage', (event) => {
            if (event.key === 'elmarsam_notifications' || event.key === 'elmarsam_bookings') {
                console.log('💾 تم كشف تحديث في localStorage');
                
                // إعادة تحميل البيانات
                this.notifications = this.loadNotifications();
                this.bookings = this.loadBookings();
                
                this.updateNotificationsBadge();
                this.renderBookings();
                this.updateReports();
                
                // التحقق من إشعارات جديدة
                this.checkForNewNotifications();
            }
        });
    }

    checkForNewPayments() {
        // التحقق من الدفعات الجديدة كل 1 ثانية
        setInterval(() => {
            const currentNotifications = this.loadNotifications();
            
            // البحث عن إشعارات جديدة
            currentNotifications.forEach(notif => {
                if (!this.notifications.find(n => n.id === notif.id)) {
                    console.log('🔔 إشعار جديد:', notif);
                    
                    // إضافة الإشعار الجديد
                    this.addNotification(notif);
                    
                    // إذا كان إشعار دفع، أضف حجز جديد
                    if (notif.type === 'payment' || notif.message.includes('دفع')) {
                        const booking = {
                            id: notif.id,
                            personName: notif.personName,
                            courseName: notif.courseName,
                            amount: notif.amount,
                            phone: '',
                            bookingDate: new Date().toISOString().split('T')[0],
                            notes: `تم الدفع عبر: ${notif.method || 'نظام الدفع'}`,
                            createdAt: notif.timestamp,
                            paymentStatus: 'completed'
                        };
                        
                        if (!this.bookings.find(b => b.id === booking.id)) {
                            this.bookings.push(booking);
                            this.saveBookings();
                            this.renderBookings();
                            this.updateReports();
                        }
                    }
                }
            });
        }, 1000);
    }

    checkForNewNotifications() {
        // دالة مساعدة للتحقق من الإشعارات الجديدة
        const currentNotifications = this.loadNotifications();
        currentNotifications.forEach(notif => {
            if (!this.notifications.find(n => n.id === notif.id)) {
                this.addNotification(notif);
                this.playNotificationSound();
                this.showNotificationAlert(notif);
            }
        });
    }

    playNotificationSound() {
        // تشغيل صوت التنبيه
        try {
            // Create a beep sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 1000; // 1000 Hz
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('لم يتمكن من تشغيل الصوت:', e.message);
        }
    }

    showNotificationAlert(payment) {
        // عرض تنبيه بصري جميل
        const alertBox = document.createElement('div');
        alertBox.className = 'booking-alert';
        alertBox.innerHTML = `
            <div class="alert-content">
                <div class="alert-icon">✅</div>
                <div class="alert-text">
                    <h4>حجز جديد! 🎉</h4>
                    <p><strong>${payment.personName}</strong> دفع ${payment.amount} جنيه</p>
                    <p class="alert-course">${payment.courseName}</p>
                </div>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;
        
        document.body.appendChild(alertBox);
        
        // إزالة التنبيه بعد 5 ثواني
        setTimeout(() => {
            if (alertBox.parentElement) {
                alertBox.remove();
            }
        }, 5000);
    }
}

// Initialize the application
let manager;
document.addEventListener('DOMContentLoaded', () => {
    manager = new BookingManager();
    console.log('✅ نظام إدارة الحجوزات جاهز للاستخدام');
});

// Export functionality (optional)
function exportToCSV() {
    if (manager.bookings.length === 0) {
        manager.showNotification('❌ لا توجد بيانات للتصدير', 'error');
        return;
    }

    let csv = 'اسم الشخص,اسم الكورس,المبلغ,تاريخ الحجز,الملاحظات\n';
    manager.bookings.forEach(booking => {
        csv += `"${booking.personName}","${booking.courseName}",${booking.amount},"${booking.bookingDate}","${booking.notes}"\n`;
    });

    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,%EF%BB%BF' + encodeURIComponent(csv);
    link.download = `الحجوزات_${new Date().toLocaleDateString('ar-EG')}.csv`;
    link.click();

    manager.showNotification('✅ تم تصدير البيانات بنجاح', 'success');
}

// Backup functionality
function backupData() {
    const backup = {
        version: 1,
        exportDate: new Date().toLocaleString('ar-EG'),
        bookings: manager.bookings
    };

    const link = document.createElement('a');
    link.href = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    link.download = `نسخة_احتياطية_${new Date().toLocaleDateString('ar-EG')}.json`;
    link.click();

    manager.showNotification('✅ تم إنشاء نسخة احتياطية بنجاح', 'success');
}

// Import functionality
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.bookings && Array.isArray(data.bookings)) {
                if (confirm('هل تريد دمج البيانات أم استبدالها؟\n[موافق] = استبدال | [إلغاء] = دمج')) {
                    manager.bookings = data.bookings;
                } else {
                    manager.bookings = [...manager.bookings, ...data.bookings];
                }
                manager.saveBookings();
                manager.renderBookings();
                manager.updateReports();
                manager.showNotification('✅ تم استيراد البيانات بنجاح', 'success');
            }
        } catch (error) {
            manager.showNotification('❌ خطأ في قراءة الملف', 'error');
        }
    };
    reader.readAsText(file);
}

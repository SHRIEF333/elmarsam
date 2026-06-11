// Server.js - نظام الدفع المتعدد الأجهزة
// تشغيل: node server.js

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// ==================== البيانات المؤقتة (استبدلها بـ Database) ====================
let bookings = [];
let notifications = [];
let connectedClients = 0;

// ==================== Socket.io - الاتصال الفوري ====================

io.on('connection', (socket) => {
    connectedClients++;
    console.log(`\n📱 عميل جديد متصل! (إجمالي: ${connectedClients})`);
    console.log(`Socket ID: ${socket.id}`);

    // إرسال البيانات الحالية للعميل الجديد
    socket.emit('initial-data', {
        bookings: bookings,
        notifications: notifications,
        clientCount: connectedClients
    });

    // استقبال دفعة جديدة من صفحة الدفع
    socket.on('new-payment', (data) => {
        console.log('\n💳 دفعة جديدة مستقبلة:');
        console.log(data);

        // إنشاء حجز جديد
        const booking = {
            id: Date.now(),
            personName: data.personName,
            courseName: data.courseName,
            amount: data.amount,
            phone: data.phone,
            paymentMethod: data.paymentMethod,
            bookingDate: new Date().toISOString().split('T')[0],
            paymentStatus: 'completed',
            createdAt: new Date().toLocaleString('ar-EG'),
            timestamp: Date.now()
        };

        // إضافة للبيانات المحفوظة
        bookings.unshift(booking);
        if (bookings.length > 1000) bookings.pop();

        // إنشاء إشعار
        const notification = {
            id: booking.id,
            type: 'payment',
            personName: data.personName,
            courseName: data.courseName,
            amount: data.amount,
            method: data.paymentMethod,
            timestamp: new Date().toLocaleString('ar-EG'),
            message: `${data.personName} دفع ${data.amount} جنيه عبر ${data.paymentMethod}`,
            read: false
        };

        notifications.unshift(notification);
        if (notifications.length > 500) notifications.pop();

        // بث الدفعة الجديدة لجميع الأجهزة المتصلة
        console.log('📡 بث الحجز الجديد لجميع الأجهزة...');
        io.emit('booking-added', {
            booking: booking,
            notification: notification,
            totalBookings: bookings.length
        });
    });

    // استقبال طلب البيانات
    socket.on('get-bookings', () => {
        socket.emit('bookings-list', bookings);
    });

    socket.on('get-notifications', () => {
        socket.emit('notifications-list', notifications);
    });

    // حذف حجز
    socket.on('delete-booking', (bookingId) => {
        bookings = bookings.filter(b => b.id !== bookingId);
        io.emit('booking-deleted', bookingId);
        console.log(`🗑️ حجز محذوف: ${bookingId}`);
    });

    // تعديل حجز
    socket.on('edit-booking', (updatedBooking) => {
        const index = bookings.findIndex(b => b.id === updatedBooking.id);
        if (index !== -1) {
            bookings[index] = updatedBooking;
            io.emit('booking-updated', updatedBooking);
            console.log(`✏️ حجز معدل: ${updatedBooking.id}`);
        }
    });

    // قراءة الإشعارات
    socket.on('mark-notifications-read', () => {
        notifications.forEach(n => n.read = true);
        io.emit('notifications-marked-read');
    });

    // قطع الاتصال
    socket.on('disconnect', () => {
        connectedClients--;
        console.log(`\n❌ عميل قطع الاتصال! (إجمالي: ${connectedClients})`);
        io.emit('client-disconnected', connectedClients);
    });
});

// ==================== REST API Endpoints ====================

// الحصول على جميع الحجوزات
app.get('/api/bookings', (req, res) => {
    res.json({
        success: true,
        count: bookings.length,
        bookings: bookings
    });
});

// الحصول على الإشعارات
app.get('/api/notifications', (req, res) => {
    res.json({
        success: true,
        count: notifications.length,
        notifications: notifications
    });
});

// إضافة حجز جديد (من payment.html)
app.post('/api/bookings/add', (req, res) => {
    try {
        const { personName, courseName, amount, phone, paymentMethod } = req.body;

        if (!personName || !courseName || !amount || !paymentMethod) {
            return res.status(400).json({
                success: false,
                error: 'البيانات ناقصة'
            });
        }

        const booking = {
            id: Date.now(),
            personName,
            courseName,
            amount,
            phone,
            paymentMethod,
            bookingDate: new Date().toISOString().split('T')[0],
            paymentStatus: 'completed',
            createdAt: new Date().toLocaleString('ar-EG'),
            timestamp: Date.now()
        };

        bookings.unshift(booking);

        // بث الحجز الجديد
        io.emit('booking-added', {
            booking: booking,
            totalBookings: bookings.length
        });

        res.json({
            success: true,
            booking: booking,
            message: 'تم إضافة الحجز بنجاح'
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// حذف حجز
app.post('/api/bookings/delete/:id', (req, res) => {
    const bookingId = parseInt(req.params.id);
    bookings = bookings.filter(b => b.id !== bookingId);

    io.emit('booking-deleted', bookingId);

    res.json({
        success: true,
        message: 'تم حذف الحجز'
    });
});

// تعديل حجز
app.post('/api/bookings/update', (req, res) => {
    const updatedBooking = req.body;
    const index = bookings.findIndex(b => b.id === updatedBooking.id);

    if (index !== -1) {
        bookings[index] = updatedBooking;
        io.emit('booking-updated', updatedBooking);
        res.json({
            success: true,
            booking: updatedBooking
        });
    } else {
        res.status(404).json({
            success: false,
            error: 'الحجز غير موجود'
        });
    }
});

// حالة الخادم
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        connectedClients: connectedClients,
        totalBookings: bookings.length,
        totalNotifications: notifications.length,
        serverTime: new Date().toLocaleString('ar-EG')
    });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/payment', (req, res) => {
    res.sendFile(path.join(__dirname, 'payment.html'));
});

// ==================== بدء الخادم ====================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     🚀 خادم نظام الدفع يعمل!          ║
║                                        ║
║  📍 الرابط: http://localhost:${PORT}   ║
║  💳 صفحة الدفع: http://localhost:${PORT}/payment  ║
║  📊 لوحة الحجوزات: http://localhost:${PORT}        ║
║                                        ║
║  ⚡ WebSocket متاح للاتصالات الفورية ║
╚════════════════════════════════════════╝
    `);
});

// التعامل مع الأخطاء
process.on('uncaughtException', (err) => {
    console.error('❌ خطأ غير متعامل معه:', err);
});

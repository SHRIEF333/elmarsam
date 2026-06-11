// Payment System with Multiple Payment Methods
class PaymentSystem {
    constructor() {
        this.form = document.getElementById('paymentForm');
        
        // Course price mapping
        this.coursePrice = {
            '🎨 مستوى اول (4 حصص) - 100 ج': '100',
            '🎨 مستوى ثاني (4 حصص) - 120 ج': '120',
            '🎨 مستوى ثالث (4 حصص) - 120 ج': '120',
            '🎨 مستوى متقدم واساسيات بورتريه (4 حصص) - 150 ج': '150'
        };

        // Payment method labels
        this.methodLabels = {
            'vodafone': 'فودافون كاش',
            'instapay': 'إنستاباي',
            'fawry': 'فوري',
            'card': 'بطاقة ائتمانية'
        };
        
        this.init();
    }

    init() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handlePayment(e));
        
        // Course selection
        const courseSelect = document.getElementById('paymentCourseName');
        const amountSelect = document.getElementById('paymentAmount');
        
        courseSelect.addEventListener('change', () => {
            const selectedCourse = courseSelect.value;
            if (this.coursePrice[selectedCourse]) {
                amountSelect.value = this.coursePrice[selectedCourse];
            }
            this.updateSummary();
        });
        
        // Amount and payment method changes
        amountSelect.addEventListener('change', () => this.updateSummary());
        
        // Payment method selection
        const methodOptions = document.querySelectorAll('.method-option');
        methodOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Remove selected class from all
                methodOptions.forEach(opt => opt.classList.remove('selected'));
                // Add to clicked one
                option.classList.add('selected');
                // Check radio button
                const radio = option.querySelector('input[type="radio"]');
                radio.checked = true;
                // Update summary
                this.updateSummary();
            });
        });

        // Radio button change
        const radioButtons = document.querySelectorAll('input[name="paymentMethod"]');
        radioButtons.forEach(radio => {
            radio.addEventListener('change', () => this.updateSummary());
        });
    }

    updateSummary() {
        const courseName = document.getElementById('paymentCourseName').value;
        const amount = document.getElementById('paymentAmount').value;
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;

        document.getElementById('summaryCourseName').textContent = courseName || '--';
        document.getElementById('summaryAmount').textContent = amount ? amount + ' جنيه' : '--';
        document.getElementById('summaryMethod').textContent = paymentMethod ? this.methodLabels[paymentMethod] : '--';
        document.getElementById('summaryTotal').textContent = amount ? amount + ' جنيه' : '0 جنيه';
    }

    handlePayment(e) {
        e.preventDefault();

        const personName = document.getElementById('paymentPersonName').value.trim();
        const courseName = document.getElementById('paymentCourseName').value;
        const amount = parseFloat(document.getElementById('paymentAmount').value);
        const phone = document.getElementById('paymentPhone').value.trim();
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;

        // Validation
        if (!personName || !courseName || !amount || !paymentMethod) {
            alert('❌ الرجاء ملء جميع الحقول المطلوبة واختيار طريقة دفع');
            return;
        }

        if (!phone) {
            alert('⚠️ رقم الهاتف مطلوب لإكمال عملية الدفع');
            return;
        }

        // Create booking object
        const booking = {
            id: Date.now(),
            personName,
            courseName,
            amount,
            phone,
            paymentMethod: this.methodLabels[paymentMethod],
            bookingDate: new Date().toISOString().split('T')[0],
            notes: `الهاتف: ${phone}`,
            createdAt: new Date().toLocaleString('ar-EG'),
            paymentDate: new Date().toLocaleString('ar-EG'),
            paymentStatus: 'pending'
        };

        // Process payment based on method
        this.processPaymentByMethod(paymentMethod, booking);
    }

    processPaymentByMethod(method, booking) {
        switch(method) {
            case 'vodafone':
                this.processVodafonePayment(booking);
                break;
            case 'instapay':
                this.processInstapayPayment(booking);
                break;
            case 'fawry':
                this.processFawryPayment(booking);
                break;
            case 'card':
                this.processCardPayment(booking);
                break;
            default:
                alert('❌ طريقة دفع غير معروفة');
        }
    }

    processVodafonePayment(booking) {
        // Show loading
        const btn = this.form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⏳ جاري معالجة الدفع...';

        // Vodafone Cash Payment Integration
        // This is a placeholder - replace with actual API integration
        setTimeout(() => {
            // Show alert with instructions (in production, this would be handled by Vodafone API)
            alert(`📱 فودافون كاش\n\nسيتم تحويلك إلى تطبيق فودافون كاش\n\nالمبلغ: ${booking.amount} جنيه\nالمتلقي: نظام المرسم\n\nفي بيئة الإنتاج، سيتم معالجة الدفع تلقائياً`);
            
            // Save booking
            booking.paymentStatus = 'completed';
            this.savePayment(booking);
            this.sendNotification(booking);
            this.showSuccessMessage();
            
            // Reset form
            this.form.reset();
            this.resetSummary();
            btn.disabled = false;
            btn.textContent = originalText;
        }, 1000);
    }

    processInstapayPayment(booking) {
        const btn = this.form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⏳ جاري المعالجة...';

        // Instapay Payment Integration
        setTimeout(() => {
            alert(`🏪 إنستاباي\n\nسيتم توجيهك إلى واجهة الدفع الآمنة\n\nالمبلغ: ${booking.amount} جنيه\n\nفي بيئة الإنتاج، ستتصل بـ API إنستاباي مباشرة`);
            
            booking.paymentStatus = 'completed';
            this.savePayment(booking);
            this.sendNotification(booking);
            this.showSuccessMessage();
            
            this.form.reset();
            this.resetSummary();
            btn.disabled = false;
            btn.textContent = originalText;
        }, 1000);
    }

    processFawryPayment(booking) {
        const btn = this.form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⏳ جاري الاتصال بفوري...';

        // إرسال الطلب للـ Backend
        fetch('/api/payment/fawry/initiate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: booking.amount,
                personName: booking.personName,
                phone: booking.phone,
                bookingId: booking.id
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('📥 رد من فوري:', data);

            if (data.success) {
                // نجاح - احفظ البيانات وأعد التوجيه
                booking.paymentStatus = 'pending';
                booking.transactionId = data.referenceNumber || data.transactionId;
                booking.paymentMethod = 'فوري';
                
                this.savePayment(booking);
                this.sendNotification(booking);

                // أعد التوجيه إلى رابط الدفع
                if (data.paymentUrl) {
                    console.log('🔗 التوجيه إلى:', data.paymentUrl);
                    window.location.href = data.paymentUrl;
                } else {
                    alert(`✅ تم إنشاء عملية الدفع بنجاح!\n\nرقم المرجع: ${data.referenceNumber}\n\nاذهب إلى فوري وأكمل الدفع باستخدام هذا الرقم`);
                    this.showSuccessMessage();
                    this.form.reset();
                    this.resetSummary();
                }
            } else {
                // فشل
                alert(`❌ فشل في إنشاء عملية الدفع\n\n${data.error || 'حاول مرة أخرى'}`);
                console.error('Fawry error details:', data);
            }

            btn.disabled = false;
            btn.textContent = originalText;
        })
        .catch(error => {
            console.error('❌ خطأ الاتصال:', error);
            alert(`❌ حدث خطأ في الاتصال\n\n${error.message}`);
            btn.disabled = false;
            btn.textContent = originalText;
        });
    }

    processCardPayment(booking) {
        const btn = this.form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '⏳ جاري المعالجة...';

        // Credit Card Payment Integration (Stripe, Square, etc.)
        setTimeout(() => {
            alert(`💳 بطاقة ائتمانية\n\nسيتم توجيهك إلى نموذج الدفع الآمن\n\nالمبلغ: ${booking.amount} جنيه\n\nفي بيئة الإنتاج، ستتصل بـ خدمة الدفع (Stripe/Square) مباشرة`);
            
            booking.paymentStatus = 'completed';
            this.savePayment(booking);
            this.sendNotification(booking);
            this.showSuccessMessage();
            
            this.form.reset();
            this.resetSummary();
            btn.disabled = false;
            btn.textContent = originalText;
        }, 1000);
    }

    savePayment(booking) {
        const stored = localStorage.getItem('elmarsam_bookings');
        const bookings = stored ? JSON.parse(stored) : [];
        bookings.push(booking);
        localStorage.setItem('elmarsam_bookings', JSON.stringify(bookings));
    }

    sendNotification(booking) {
        const stored = localStorage.getItem('elmarsam_notifications');
        const notifications = stored ? JSON.parse(stored) : [];

        const notification = {
            id: Date.now(),
            type: 'payment',
            personName: booking.personName,
            courseName: booking.courseName,
            amount: booking.amount,
            method: booking.paymentMethod,
            timestamp: new Date().toLocaleString('ar-EG'),
            message: `${booking.personName} دفع ${booking.amount} جنيه عبر ${booking.paymentMethod}`
        };

        notifications.unshift(notification);

        if (notifications.length > 50) {
            notifications.pop();
        }

        localStorage.setItem('elmarsam_notifications', JSON.stringify(notifications));

        // Send event to main window
        if (window.opener) {
            window.opener.postMessage({
                type: 'NEW_PAYMENT',
                data: notification
            }, '*');
        }
    }

    showSuccessMessage() {
        const msg = document.getElementById('successMessage');
        msg.classList.add('show');

        setTimeout(() => {
            msg.classList.remove('show');
        }, 3000);
    }

    resetSummary() {
        document.getElementById('summaryCourseName').textContent = '--';
        document.getElementById('summaryAmount').textContent = '--';
        document.getElementById('summaryMethod').textContent = '--';
        document.getElementById('summaryTotal').textContent = '0 جنيه';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new PaymentSystem();
    console.log('✅ نظام الدفع المتعدد جاهز');
});

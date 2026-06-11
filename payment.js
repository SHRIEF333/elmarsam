const supabaseUrl = "https://uorkphjfmagixrwjmpbv.supabase.co";
const supabaseKey = "sb_publishable_OzHioeVhwZwwpRy11Pf1Rw_xhx927ft";

const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// =======================
// 💳 إرسال الدفع
// =======================
document.getElementById("paymentForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const name = document.getElementById("paymentPersonName").value;
    const course = document.getElementById("paymentCourseName").value;
    const amount = document.getElementById("paymentAmount").value;
    const phone = document.getElementById("paymentPhone").value;

    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;

    if (!name || !course || !amount || !method) {
        alert("❌ من فضلك اكمل البيانات");
        return;
    }

    const { error } = await supabase
        .from("payments")
        .insert([
            {
                personName: name,
                courseName: course,
                amount: Number(amount),
                bookingDate: new Date().toISOString().split('T')[0],
                phone: phone,
                notes: method,
                paymentStatus: "completed",
                createdAt: new Date().toISOString()
            }
        ]);

    if (error) {
        console.log(error);
        alert("❌ حصل خطأ في الدفع");
        return;
    }

    // نجاح
    document.getElementById("successMessage").classList.add("show");

    document.getElementById("paymentForm").reset();

    updateSummary();
});

// =======================
// 📊 تحديث الـ Summary
// =======================
function updateSummary() {

    const course = document.getElementById("paymentCourseName").value;
    const amount = document.getElementById("paymentAmount").value;
    const method = document.querySelector('input[name="paymentMethod"]:checked')?.value;

    document.getElementById("summaryCourseName").textContent = course || "--";
    document.getElementById("summaryAmount").textContent = amount ? amount + " جنيه" : "--";
    document.getElementById("summaryMethod").textContent = method || "--";
    document.getElementById("summaryTotal").textContent = amount ? amount + " جنيه" : "0 جنيه";
}

// =======================
// 🎯 أحداث الفورم
// =======================
document.getElementById("paymentCourseName").addEventListener("change", updateSummary);
document.getElementById("paymentAmount").addEventListener("change", updateSummary);

document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
    radio.addEventListener("change", updateSummary);
});

// =======================
// 🎨 اختيار طريقة الدفع UI
// =======================
document.querySelectorAll(".method-option").forEach(option => {
    option.addEventListener("click", function() {

        document.querySelectorAll(".method-option").forEach(o => o.classList.remove("selected"));

        this.classList.add("selected");

        this.querySelector("input").checked = true;

        updateSummary();
    });
});

// ============================================
// КОНТАКТЫ: отправка заявок в Google Sheets
// ============================================

const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbzWMfPLH3N6LZzwtuNr8d6vUS4JB0O_RWXZHCTf3-ZKbhpD0ZAFZCFXihFJAyZtpC2IMg/exec';

function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleString('ru-RU'),
            name: document.getElementById('name')?.value.trim() || '',
            phone: document.getElementById('phone')?.value.trim() || '',
            email: document.getElementById('email')?.value.trim() || '',
            car: document.getElementById('car')?.value.trim() || '',
            message: document.getElementById('message')?.value.trim() || '',
            status: 'new'
        };
        
        if (!formData.name || !formData.phone) {
            Swal.fire({ icon: 'error', title: 'Ошибка!', text: 'Заполните имя и телефон', confirmButtonColor: '#ff5722' });
            return;
        }
        
        const btn = form.querySelector('button');
        const originalText = btn.textContent;
        btn.textContent = 'Отправка...';
        btn.disabled = true;
        
        try {
            await fetch(GOOGLE_SHEETS_API, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            Swal.fire({ icon: 'success', title: 'Заявка отправлена!', text: 'Мы свяжемся с вами', confirmButtonColor: '#ff5722' });
            form.reset();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Ошибка!', text: 'Не удалось отправить', confirmButtonColor: '#ff5722' });
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
}

document.addEventListener('DOMContentLoaded', initContactForm);
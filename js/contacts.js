// ============================================
// КОНТАКТЫ: отправка заявок (с серверными настройками)
// ============================================

let cachedSettings = null;

async function loadSettings() {
    if (cachedSettings) return cachedSettings;
    try {
        const response = await fetch('/api/settings');
        cachedSettings = await response.json();
        return cachedSettings;
    } catch (error) {
        console.error('Ошибка загрузки настроек:', error);
        return { formsubmitEnabled: false, googleSheetsEnabled: true };
    }
}

async function getFormsubmitUrl() {
    const settings = await loadSettings();
    if (settings.formsubmitEnabled && settings.formsubmitUrl) {
        return settings.formsubmitUrl;
    }
    return null;
}

async function getGoogleSheetsUrl() {
    const settings = await loadSettings();
    if (settings.googleSheetsEnabled && settings.googleSheetsUrl) {
        return settings.googleSheetsUrl;
    }
    return null;
}

async function initContactForm() {
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
        
        const googleUrl = await getGoogleSheetsUrl();
        const formsubmitUrl = await getFormsubmitUrl();
        
        let googleOk = false, emailOk = false;
        
        if (googleUrl) {
            try {
                await fetch(googleUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                googleOk = true;
            } catch (error) { console.error('Google Sheets error:', error); }
        }
        
        if (formsubmitUrl) {
            try {
                await fetch(formsubmitUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        name: formData.name,
                        phone: formData.phone,
                        email: formData.email,
                        car: formData.car,
                        message: formData.message,
                        _subject: `Новая заявка от ${formData.name}`
                    })
                });
                emailOk = true;
            } catch (error) { console.error('FormSubmit error:', error); }
        }
        
        btn.textContent = originalText;
        btn.disabled = false;
        
        if (googleOk || emailOk) {
            Swal.fire({
                icon: 'success',
                title: 'Заявка отправлена!',
                text: 'Мы свяжемся с вами в ближайшее время',
                confirmButtonColor: '#ff5722'
            });
            form.reset();
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Внимание',
                text: 'Заявка сохранена, но есть проблемы с отправкой',
                confirmButtonColor: '#ff5722'
            });
            form.reset();
        }
    });
}

document.addEventListener('DOMContentLoaded', initContactForm);
// Загрузка HTML компонентов
async function loadComponent(elementId, componentPath) {
    try {
        const response = await fetch(componentPath);
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
    } catch (error) {
        console.error(`Ошибка загрузки ${componentPath}:`, error);
    }
}

// Загрузка всех компонентов на странице
async function loadAllComponents() {
    const components = document.querySelectorAll('[data-component]');
    for (const el of components) {
        const componentPath = el.getAttribute('data-component');
        await loadComponent(el.id, componentPath);
    }
}

// Инициализация после загрузки компонентов
async function initPage() {
    await loadAllComponents();
    
    // Активация текущей ссылки в меню
    setTimeout(() => {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav a').forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage || (currentPage === 'index.html' && href === 'index.html')) {
                link.classList.add('active');
            }
        });
    }, 100);
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', initPage);
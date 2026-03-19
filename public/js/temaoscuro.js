// TEMA OSCURO/CLARO
document.addEventListener('DOMContentLoaded', function() {
    const themeSaved = localStorage.getItem('theme') || 'light';
    aplicarTema(themeSaved);

    const toggleBtn = document.getElementById('themeToggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', cambiarTema);
    }
});

function aplicarTema(tema) {
    const html = document.documentElement;
    const toggleBtn = document.getElementById('themeToggle');

    if (tema === 'dark') {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-sun"></i> Claro';
        }
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-moon"></i> Oscuro';
        }
    }
}

function cambiarTema() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    aplicarTema(newTheme);
}

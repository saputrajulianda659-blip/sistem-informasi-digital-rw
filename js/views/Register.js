// js/views/Register.js - View Component for Warga Registration
(function () {
    function renderRegisterView() {
        if (typeof window !== 'undefined' && typeof window.renderRegister === 'function') {
            const app = document.getElementById('app');
            if (app) {
                app.innerHTML = window.renderRegister();
                if (typeof window.setupRegisterEvents === 'function') {
                    window.setupRegisterEvents();
                }
            }
            return window.renderRegister();
        }
        return '';
    }

    const RegisterView = {
        render: renderRegisterView,
        setup: function () {
            if (typeof window !== 'undefined' && typeof window.setupRegisterEvents === 'function') {
                window.setupRegisterEvents();
            }
        }
    };

    if (typeof window !== 'undefined') {
        window.RegisterView = RegisterView;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = RegisterView;
    }
})();


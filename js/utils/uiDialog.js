// js/utils/uiDialog.js
export { renderStatusBadge } from './badge.js';
/**
 * Modern Custom Dialog & Confirmation Utility (SweetAlert2 & Custom HTML Modal fallback)
 * Dilarang keras menggunakan window.alert() atau window.confirm() native browser.
 */

/**
 * Show a modern confirmation dialog for deletion or actions.
 * @param {Object} options
 * @param {string} [options.title="Konfirmasi Hapus"]
 * @param {string} [options.message="Apakah Anda yakin ingin menghapus data ini?"]
 * @param {string} [options.itemName=""] Nama data / item yang akan dihapus
 * @param {string} [options.confirmText="Ya, Hapus"]
 * @param {string} [options.cancelText="Batal"]
 * @param {string} [options.confirmButtonColor="#dc2626"]
 * @param {string} [options.icon="warning"]
 * @returns {Promise<boolean>} Resolves to true if confirmed, false otherwise.
 */
export async function showConfirmDialog({
    title = 'Konfirmasi Hapus',
    message = '',
    itemName = '',
    confirmText = 'Ya, Hapus',
    cancelText = 'Batal',
    confirmButtonColor = '#dc2626',
    icon = 'warning'
} = {}) {
    let finalMessage = message;
    if (!finalMessage && itemName) {
        finalMessage = `Apakah Anda yakin ingin menghapus ${itemName}?`;
    } else if (!finalMessage) {
        finalMessage = 'Apakah Anda yakin ingin menghapus data ini?';
    }

    if (typeof window !== 'undefined' && window.Swal && typeof window.Swal.fire === 'function') {
        const result = await window.Swal.fire({
            title: title,
            text: finalMessage,
            icon: icon,
            showCancelButton: true,
            confirmButtonColor: confirmButtonColor,
            cancelButtonColor: '#64748b',
            confirmButtonText: confirmText,
            cancelButtonText: cancelText,
            reverseButtons: true,
            focusCancel: true
        });
        return result.isConfirmed;
    }

    // Fallback modern custom modal jika SweetAlert2 belum selesai load dari CDN
    return new Promise((resolve) => {
        let existing = document.getElementById('customModalDialogBackdrop');
        if (existing) existing.remove();

        const backdrop = document.createElement('div');
        backdrop.id = 'customModalDialogBackdrop';
        backdrop.style.position = 'fixed';
        backdrop.style.inset = '0';
        backdrop.style.background = 'rgba(15, 23, 42, 0.65)';
        backdrop.style.zIndex = '99999';
        backdrop.style.backdropFilter = 'blur(4px)';
        backdrop.style.display = 'flex';
        backdrop.style.alignItems = 'center';
        backdrop.style.justifyContent = 'center';
        backdrop.style.padding = '1rem';

        backdrop.innerHTML = `
            <div style="width: 100%; max-width: 440px; background: #ffffff; border-radius: 16px; padding: 1.75rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); font-family: inherit; animation: fadeIn 0.2s ease;">
                <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; flex-shrink: 0;">
                        <i class="ph-bold ph-trash"></i>
                    </div>
                    <div>
                        <h3 style="font-size: 1.2rem; font-weight: 800; color: #1e293b; margin: 0 0 0.35rem 0;">${title}</h3>
                        <p style="font-size: 0.885rem; color: #64748b; margin: 0; line-height: 1.5; white-space: pre-line;">${finalMessage}</p>
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
                    <button type="button" id="btnCustomDialogCancel" class="btn btn-secondary btn-cancel" style="padding: 9px 18px;">
                        ${cancelText}
                    </button>
                    <button type="button" id="btnCustomDialogConfirm" style="background: ${confirmButtonColor}; color: #ffffff; border: none; border-radius: 8px; padding: 9px 22px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);

        const cleanup = (value) => {
            backdrop.remove();
            resolve(value);
        };

        const btnCancel = backdrop.querySelector('#btnCustomDialogCancel');
        const btnConfirm = backdrop.querySelector('#btnCustomDialogConfirm');

        if (btnCancel) btnCancel.onclick = () => cleanup(false);
        if (btnConfirm) btnConfirm.onclick = () => cleanup(true);
        backdrop.onclick = (e) => {
            if (e.target === backdrop) cleanup(false);
        };
    });
}

/**
 * Show a modern Alert / Toast / Notification dialog
 * @param {string} message
 * @param {('success'|'error'|'warning'|'info')} [type="info"]
 * @param {string} [title=""]
 */
export async function showAlertDialog(message, type = 'info', title = '') {
    if (typeof window !== 'undefined' && window.Swal && typeof window.Swal.fire === 'function') {
        const swalTitle = title || (type === 'success' ? 'Berhasil' : (type === 'error' ? 'Gagal' : 'Informasi'));
        return await window.Swal.fire({
            title: swalTitle,
            text: message,
            icon: type,
            confirmButtonColor: '#4880FF',
            confirmButtonText: 'Tutup'
        });
    }

    // Fallback UI modal jika Swal belum terpasang
    return new Promise((resolve) => {
        let existing = document.getElementById('customAlertDialogBackdrop');
        if (existing) existing.remove();

        const backdrop = document.createElement('div');
        backdrop.id = 'customAlertDialogBackdrop';
        backdrop.style.position = 'fixed';
        backdrop.style.inset = '0';
        backdrop.style.background = 'rgba(15, 23, 42, 0.65)';
        backdrop.style.zIndex = '99999';
        backdrop.style.backdropFilter = 'blur(4px)';
        backdrop.style.display = 'flex';
        backdrop.style.alignItems = 'center';
        backdrop.style.justifyContent = 'center';
        backdrop.style.padding = '1rem';

        const colorMap = {
            success: { bg: '#dcfce7', text: '#166534', icon: 'ph-check-circle', btn: '#16a34a', defTitle: 'Berhasil' },
            error: { bg: '#fee2e2', text: '#991b1b', icon: 'ph-x-circle', btn: '#dc2626', defTitle: 'Gagal' },
            warning: { bg: '#fef3c7', text: '#92400e', icon: 'ph-warning', btn: '#d97706', defTitle: 'Peringatan' },
            info: { bg: '#e0e7ff', text: '#3730a3', icon: 'ph-info', btn: '#4880FF', defTitle: 'Informasi' }
        };

        const config = colorMap[type] || colorMap.info;
        const modalTitle = title || config.defTitle;

        backdrop.innerHTML = `
            <div style="width: 100%; max-width: 420px; background: #ffffff; border-radius: 16px; padding: 1.75rem; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); font-family: inherit; animation: fadeIn 0.2s ease;">
                <div style="display: flex; align-items: flex-start; gap: 1rem; margin-bottom: 1.25rem;">
                    <div style="width: 48px; height: 48px; border-radius: 12px; background: ${config.bg}; color: ${config.text}; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; flex-shrink: 0;">
                        <i class="ph-bold ${config.icon}"></i>
                    </div>
                    <div>
                        <h3 style="font-size: 1.2rem; font-weight: 800; color: #1e293b; margin: 0 0 0.35rem 0;">${modalTitle}</h3>
                        <p style="font-size: 0.885rem; color: #64748b; margin: 0; line-height: 1.5; white-space: pre-line;">${message}</p>
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: 1.5rem;">
                    <button type="button" id="btnCustomAlertClose" style="background: ${config.btn}; color: #ffffff; border: none; border-radius: 8px; padding: 9px 24px; font-weight: 700; cursor: pointer;">
                        Tutup
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);

        const close = () => {
            backdrop.remove();
            resolve();
        };

        const btnClose = backdrop.querySelector('#btnCustomAlertClose');
        if (btnClose) btnClose.onclick = close;
        backdrop.onclick = (e) => {
            if (e.target === backdrop) close();
        };
    });
}

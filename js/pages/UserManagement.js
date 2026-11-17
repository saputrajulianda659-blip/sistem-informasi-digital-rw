// js/pages/UserManagement.js
import { getAllUsers, addUser, updateUser, deleteUser, resetUserPassword, toggleUserStatus, ROLES, getCurrentUser, fetchUsers } from '../models/User.js';
import { getCollection } from '../utils/db.js';
import { showConfirmDialog } from '../utils/uiDialog.js';
import { renderStatusBadge } from '../utils/badge.js';

export function renderUserManagement() {
    const currentUser = getCurrentUser();
    let users = getAllUsers();

    // Territory filter for Ketua RT & Ketua RW
    if (currentUser) {
        if (currentUser.role === ROLES.KETUA_RT && currentUser.rt) {
            const myRt = String(currentUser.rt).padStart(2, '0');
            users = users.filter(u => String(u.rt || '').padStart(2, '0') === myRt || u.role === ROLES.KETUA_RT);
        } else if (currentUser.role === ROLES.KETUA_RW && currentUser.rw) {
            const myRw = String(currentUser.rw || '05').padStart(2, '0');
            users = users.filter(u => String(u.rw || '05').padStart(2, '0') === myRw);
        }
    }

    // Summary calculations
    const normalizeRole = (r) => String(r || '').toLowerCase().replace(/[\s_-]+/g, '');
    const totalUsers = users.length;
    const totalSuperAdmin = users.filter(u => {
        const nr = normalizeRole(u.role);
        return nr === 'superadmin' || nr === 'admin' || u.role === ROLES.SUPER_ADMIN;
    }).length;
    const totalPengurus = users.filter(u => {
        const nr = normalizeRole(u.role);
        return nr === 'rt' || nr === 'rw' || nr.includes('rt') || nr.includes('rw') || u.role === ROLES.KETUA_RW || u.role === ROLES.KETUA_RT;
    }).length;
    const totalWarga = users.filter(u => {
        const nr = normalizeRole(u.role);
        return nr === 'warga' || u.role === ROLES.WARGA;
    }).length;

    const canAddAccount = currentUser && [ROLES.SUPER_ADMIN, ROLES.KETUA_RW, ROLES.KETUA_RT].includes(currentUser.role);

    return `
        <div class="user-management-page">
            <!-- Header Section -->
            <div class="flex items-center justify-between" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <div>
                    <h1 class="text-2xl font-bold" style="font-size: 1.65rem; color: var(--text-main); margin-bottom: 0.25rem;">Manajemen Pengguna</h1>
                    <p class="text-muted" style="font-size: 0.9rem; color: var(--text-muted);">Kelola data akun, kredensial, hak akses kependudukan, dan status pengguna sistem Digital RW.</p>
                </div>
                ${canAddAccount ? `
                    <button id="btnTambahUser" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; padding: 0.65rem 1.25rem; font-weight: 600; border-radius: var(--radius-md); box-shadow: var(--shadow-sm);">
                        <i class="ph-bold ph-user-plus text-lg"></i>
                        <span>+ Tambah Akun</span>
                    </button>
                ` : ''}
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid mb-6" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.25rem; margin-bottom: 1.75rem;">
                <div class="card" style="padding: 1.25rem; border-radius: var(--radius-lg); border-top: 4px solid var(--primary-color); background: var(--surface-color); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Total Pengguna</p>
                            <h3 id="statTotalUsers" style="font-size: 1.75rem; font-weight: 800; color: var(--text-main); margin: 0;">${totalUsers}</h3>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="ph ph-users-three"></i>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 1.25rem; border-radius: var(--radius-lg); border-top: 4px solid #8b5cf6; background: var(--surface-color); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Super Admin</p>
                            <h3 id="statSuperAdmin" style="font-size: 1.75rem; font-weight: 800; color: #8b5cf6; margin: 0;">${totalSuperAdmin}</h3>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #f5f3ff; color: #8b5cf6; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="ph ph-shield-check"></i>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 1.25rem; border-radius: var(--radius-lg); border-top: 4px solid #0284c7; background: var(--surface-color); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Pengurus RT / RW</p>
                            <h3 id="statPengurus" style="font-size: 1.75rem; font-weight: 800; color: #0284c7; margin: 0;">${totalPengurus}</h3>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #f0f9ff; color: #0284c7; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="ph ph-buildings"></i>
                        </div>
                    </div>
                </div>

                <div class="card" style="padding: 1.25rem; border-radius: var(--radius-lg); border-top: 4px solid var(--success-color); background: var(--surface-color); box-shadow: var(--shadow-sm);">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">Warga Terdaftar</p>
                            <h3 id="statWarga" style="font-size: 1.75rem; font-weight: 800; color: var(--success-color); margin: 0;">${totalWarga}</h3>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="ph ph-user"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filters & Search Toolbar -->
            <div class="card mb-4" style="padding: 1rem 1.25rem; border-radius: var(--radius-lg); margin-bottom: 1.5rem; background: var(--surface-color); border: 1px solid var(--border-color);">
                <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
                    <div style="flex: 1; min-width: 260px; position: relative;">
                        <i class="ph ph-magnifying-glass" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 1.1rem;"></i>
                        <input type="text" id="searchUserInput" class="form-input" placeholder="Cari nama, username, email, NIK, atau No HP..." style="width: 100%; padding: 0.6rem 0.75rem 0.6rem 2.4rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                    </div>
                    
                    <div style="width: 180px;">
                        <select id="filterRoleSelect" class="form-input" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            <option value="">Semua Peran (Role)</option>
                            <option value="${ROLES.SUPER_ADMIN}">Super Admin</option>
                            <option value="${ROLES.KETUA_RW}">Ketua RW</option>
                            <option value="${ROLES.KETUA_RT}">Ketua RT</option>
                            <option value="${ROLES.WARGA}">Warga</option>
                        </select>
                    </div>

                    <div style="width: 160px;">
                        <select id="filterStatusSelect" class="form-input" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            <option value="">Semua Status</option>
                            <option value="Aktif">Aktif</option>
                            <option value="Nonaktif">Nonaktif</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Users Table Card -->
            <div class="card" style="overflow-x: auto; padding: 0; border-radius: var(--radius-lg); border: 1px solid var(--border-color); background: var(--surface-color); box-shadow: var(--shadow-sm);">
                <div class="table-subbar-header" style="padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: #fafbfc;">
                    <h3 class="font-bold table-subbar-title" style="font-size: 1.05rem; color: var(--text-main);">Daftar Akun Pengguna</h3>
                    <span id="userCountBadge" class="table-count-badge" style="font-size: 0.8rem; background: #e2e8f0; color: #475569; padding: 0.2rem 0.65rem; border-radius: 9999px; font-weight: 600;">${totalUsers} Akun</span>
                </div>
                <table class="data-table" style="width: 100%; border-collapse: collapse; text-align: left; min-width: 800px;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); background: #f8fafc;">
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color);">Username & Akun</th>
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color);">Nama Lengkap</th>
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color);">Peran / Role</th>
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color);">Nomor RT/RW</th>
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color);">Status</th>
                            <th style="padding: 0.9rem 1.25rem; font-weight: 600; font-size: 0.85rem; color: var(--secondary-color); text-align: center;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="userTableBody">
                        ${renderUserRows(users, currentUser)}
                    </tbody>
                </table>
            </div>

            <!-- Modal Form Tambah/Edit Akun -->
            <div id="modalUserForm" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 9999; align-items: center; justify-content: center; padding: 1rem;">
                <div class="card" style="width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; overscroll-behavior: contain; padding: 1.75rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); background: #ffffff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 38px; height: 38px; border-radius: 10px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.3rem;">
                                <i id="modalUserIcon" class="ph ph-user-plus"></i>
                            </div>
                            <h3 id="modalUserTitle" class="text-xl font-bold" style="margin: 0;">Ubah Data & Peran Pengguna</h3>
                        </div>
                        <button id="btnCloseUserModal" style="color: var(--text-muted); font-size: 1.4rem; padding: 4px; border-radius: 6px; display: flex;"><i class="ph ph-x"></i></button>
                    </div>

                    <form id="formUser">
                        <input type="hidden" id="userIdInput" value="">

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Username <span style="color: var(--danger-color);">*</span></label>
                                <input type="text" id="userUsernameInput" class="form-input" required placeholder="Contoh: rt03user" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            </div>

                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Nama Lengkap <span style="color: var(--danger-color);">*</span></label>
                                <input type="text" id="userNameInput" class="form-input" required placeholder="Contoh: Hendra Wijaya" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Email</label>
                                <input type="email" id="userEmailInput" class="form-input" placeholder="user@rwdigital.id" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            </div>

                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Peran (Role) <span style="color: var(--danger-color);">*</span></label>
                                <select id="userRoleInput" class="form-input" required style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                                    <option value="${ROLES.WARGA}">Warga</option>
                                    <option value="${ROLES.KETUA_RT}">Ketua RT</option>
                                    <option value="${ROLES.KETUA_RW}">Ketua RW</option>
                                    <option value="${ROLES.SUPER_ADMIN}">Super Admin</option>
                                </select>
                                <small id="userRoleHelpText" style="display: none; color: #dc2626; font-size: 0.75rem; margin-top: 4px; font-weight: 600;">(Hanya Super Admin yang berwenang mengubah Peran Pengguna)</small>
                            </div>
                        </div>

                        <div id="rtRwContainer" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Nomor RT</label>
                                <input type="text" id="userRtInput" class="form-input" placeholder="Contoh: 01" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            </div>

                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Nomor RW</label>
                                <input type="text" id="userRwInput" class="form-input" value="05" placeholder="Contoh: 05" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">NIK (Kependudukan)</label>
                                <input type="text" id="userNikInput" class="form-input" maxlength="16" placeholder="16 digit NIK" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            </div>

                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Status Akun</label>
                                <select id="userStatusInput" class="form-input" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                                    <option value="Aktif">Aktif</option>
                                    <option value="Nonaktif">Nonaktif</option>
                                </select>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Nomor HP / WhatsApp</label>
                                <input type="text" id="userNoHpInput" class="form-input" placeholder="Contoh: 08123456789" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            </div>

                            <div class="form-group" style="margin-bottom: 0;">
                                <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Alamat Tempat Tinggal</label>
                                <input type="text" id="userAlamatInput" class="form-input" placeholder="Contoh: Jl. Merdeka No. 12" style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                            </div>
                        </div>

                        <div id="passwordFieldGroup" class="form-group mb-4" style="margin-bottom: 1.25rem;">
                            <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">
                                Kata Sandi (Password)
                                <span id="passwordHelpText" style="font-weight: normal; color: var(--text-muted); font-size: 0.8rem;">(Kosongkan untuk kata sandi default: password123)</span>
                            </label>
                            <input type="password" id="userPasswordInput" class="form-input" placeholder="Masukkan password..." style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
                            <button type="button" id="btnCancelUserModal" class="btn btn-secondary btn-cancel" style="padding: 0.6rem 1.2rem;">Batal</button>
                            <button type="submit" id="btnSubmitUser" class="btn btn-primary" style="padding: 0.6rem 1.4rem; font-weight: 600; border-radius: var(--radius-md);">Simpan Akun</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Modal Reset Password -->
            <div id="modalResetPassword" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); z-index: 9999; align-items: center; justify-content: center; padding: 1rem;">
                <div class="card" style="width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; overscroll-behavior: contain; padding: 1.75rem; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); background: #ffffff;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 1rem;">
                        <div style="width: 44px; height: 44px; border-radius: 12px; background: #fef3c7; color: #d97706; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                            <i class="ph-bold ph-key"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold" style="margin: 0; color: var(--text-main);">Reset Kata Sandi</h3>
                            <p id="resetUserTarget" style="font-size: 0.85rem; color: var(--text-muted); margin: 0;">Pengguna: -</p>
                        </div>
                    </div>

                    <p style="font-size: 0.875rem; color: #475569; margin-bottom: 1.25rem;">
                        Tentukan kata sandi baru untuk akun ini atau gunakan kata sandi default sistem.
                    </p>

                    <form id="formResetPassword">
                        <input type="hidden" id="resetUserId" value="">
                        <div class="form-group mb-4" style="margin-bottom: 1.25rem;">
                            <label class="form-label" style="display: block; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.35rem;">Kata Sandi Baru</label>
                            <input type="text" id="newPasswordInput" class="form-input" required value="password123" placeholder="Masukkan password baru..." style="width: 100%; padding: 0.6rem 0.75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 0.9rem;">
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
                            <button type="button" id="btnCancelReset" class="btn btn-secondary btn-cancel" style="padding: 0.55rem 1.1rem;">Batal</button>
                            <button type="submit" class="btn btn-primary" style="padding: 0.55rem 1.25rem; font-weight: 600; border-radius: var(--radius-md); background: #d97706; border-color: #d97706;">Terapkan Sandi Baru</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
}

function getRoleBadge(role) {
    switch (role) {
        case ROLES.SUPER_ADMIN:
            return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 0.25rem 0.65rem; background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;"><i class="ph-bold ph-shield-star"></i> Super Admin</span>`;
        case ROLES.KETUA_RW:
            return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 0.25rem 0.65rem; background: #f0f9ff; color: #0284c7; border: 1px solid #bae6fd; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;"><i class="ph-bold ph-buildings"></i> Ketua RW</span>`;
        case ROLES.KETUA_RT:
            return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 0.25rem 0.65rem; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 9999px; font-size: 0.75rem; font-weight: 700;"><i class="ph-bold ph-house-line"></i> Ketua RT</span>`;
        case ROLES.WARGA:
        default:
            return `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 0.25rem 0.65rem; background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; border-radius: 9999px; font-size: 0.75rem; font-weight: 600;"><i class="ph ph-user"></i> Warga</span>`;
    }
}

function getStatusBadge(status) {
    const isAktif = status !== 'Nonaktif';
    return renderStatusBadge(isAktif ? 'Aktif' : 'Nonaktif');
}

function renderUserRows(users, currentUser) {
    if (users.length === 0) {
        return `<tr><td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">Tidak ada akun pengguna yang sesuai dengan kriteria pencarian.</td></tr>`;
    }

    const isSuperAdmin = currentUser && currentUser.role === ROLES.SUPER_ADMIN;
    const daftarWarga = (typeof getCollection === 'function' ? getCollection('warga') : (window.db?.warga || [])) || [];

    return users.map(u => {
        const isSelf = currentUser && (currentUser.id === u.id);
        const matchedWarga = daftarWarga.find(w => 
            (u.nik && w.nik === u.nik) || 
            (w.nama && u.name && w.nama.trim().toLowerCase() === u.name.trim().toLowerCase()) ||
            (u.email && w.email && w.email.trim().toLowerCase() === u.email.trim().toLowerCase())
        );
        const resolvedNik = u.nik || (matchedWarga ? matchedWarga.nik : '');
        const resolvedNoHp = u.no_hp || (matchedWarga ? (matchedWarga.no_hp || matchedWarga.telepon) : '');
        const resolvedRt = u.rt || (matchedWarga ? matchedWarga.rt : '');
        const resolvedRw = u.rw || (matchedWarga ? matchedWarga.rw : '05');
        const wilayahText = resolvedRt ? `RT ${resolvedRt} / RW ${resolvedRw}` : (resolvedRw ? `RW ${resolvedRw}` : '-');
        const initial = (u.name || u.username || 'U').charAt(0).toUpperCase();

        return `
            <tr id="row-user-${u.id}" style="border-bottom: 1px solid var(--border-color); transition: background-color 0.15s ease;" onmouseover="this.style.backgroundColor='var(--surface-hover)'" onmouseout="this.style.backgroundColor='transparent'">
                <td style="padding: 1rem 1.25rem;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem;">
                            ${initial}
                        </div>
                        <div>
                            <div style="font-weight: 600; color: var(--text-main); font-size: 0.9rem;">@${u.username}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${u.email || '-'}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 1rem 1.25rem;">
                    <strong style="color: var(--text-main); font-size: 0.9rem;">${u.name}</strong>
                    ${resolvedNik ? `<div style="font-size: 0.75rem; color: var(--text-muted);">NIK: ${resolvedNik}</div>` : ''}
                    ${resolvedNoHp ? `<div style="font-size: 0.75rem; color: #2563eb;"><i class="ph ph-phone"></i> ${resolvedNoHp}</div>` : ''}
                </td>
                <td style="padding: 1rem 1.25rem;">
                    ${getRoleBadge(u.role)}
                </td>
                <td style="padding: 1rem 1.25rem; font-size: 0.85rem; color: var(--text-main);">
                    <span style="display: inline-flex; align-items: center; gap: 4px; font-weight: 500;">
                        <i class="ph ph-map-pin text-muted"></i> ${wilayahText}
                    </span>
                </td>
                <td style="padding: 1rem 1.25rem;">
                    ${getStatusBadge(u.status)}
                </td>
                <td style="padding: 1rem 1.25rem; text-align: center;">
                    <div style="display: inline-flex; gap: 6px; align-items: center;">
                        <button class="btn btn-action-edit" data-id="${u.id}" title="Ubah Data & Peran Pengguna" style="padding: 0.35rem 0.6rem; border: 1px solid var(--border-color); border-radius: 6px; color: var(--primary-color); background: white; font-size: 0.9rem; cursor: pointer;">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="btn btn-action-reset" data-id="${u.id}" data-name="${u.name}" data-username="${u.username}" title="Reset Kata Sandi" style="padding: 0.35rem 0.6rem; border: 1px solid #fde68a; border-radius: 6px; color: #d97706; background: #fffbeb; font-size: 0.9rem; cursor: pointer;">
                            <i class="ph ph-key"></i>
                        </button>
                        <button class="btn btn-action-status" data-id="${u.id}" data-status="${u.status || 'Aktif'}" title="${u.status === 'Nonaktif' ? 'Aktifkan Akun' : 'Nonaktifkan Akun'}" style="padding: 0.35rem 0.6rem; border: 1px solid ${u.status === 'Nonaktif' ? '#bbf7d0' : '#fed7aa'}; border-radius: 6px; color: ${u.status === 'Nonaktif' ? '#16a34a' : '#ea580c'}; background: ${u.status === 'Nonaktif' ? '#f0fdf4' : '#fff7ed'}; font-size: 0.9rem; cursor: pointer;">
                            <i class="ph ${u.status === 'Nonaktif' ? 'ph-check-circle' : 'ph-prohibit'}"></i>
                        </button>
                        ${isSuperAdmin && !isSelf ? `
                            <button class="btn btn-action-delete" data-id="${u.id}" data-username="${u.username}" title="Hapus Akun" style="padding: 0.35rem 0.6rem; border: 1px solid #fecaca; border-radius: 6px; color: var(--danger-color); background: #fef2f2; font-size: 0.9rem; cursor: pointer;">
                                <i class="ph ph-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

export function setupUserManagementEvents() {
    const modalUser = document.getElementById('modalUserForm');
    const modalReset = document.getElementById('modalResetPassword');
    const formUser = document.getElementById('formUser');
    const formReset = document.getElementById('formResetPassword');
    const btnTambah = document.getElementById('btnTambahUser');
    const btnCloseUser = document.getElementById('btnCloseUserModal');
    const btnCancelUser = document.getElementById('btnCancelUserModal');
    const btnCancelReset = document.getElementById('btnCancelReset');

    const searchInput = document.getElementById('searchUserInput');
    const roleFilter = document.getElementById('filterRoleSelect');
    const statusFilter = document.getElementById('filterStatusSelect');
    const tableBody = document.getElementById('userTableBody');
    const countBadge = document.getElementById('userCountBadge');

    const currentUser = getCurrentUser();
    const isSuperAdmin = currentUser && currentUser.role === ROLES.SUPER_ADMIN;

    function filterUsers() {
        const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
        const role = roleFilter ? roleFilter.value : '';
        const status = statusFilter ? statusFilter.value : '';

        let users = getAllUsers();

        // Territory filtering
        if (currentUser) {
            if (currentUser.role === ROLES.KETUA_RT && currentUser.rt) {
                const myRt = String(currentUser.rt).padStart(2, '0');
                users = users.filter(u => String(u.rt || '').padStart(2, '0') === myRt || u.role === ROLES.KETUA_RT);
            } else if (currentUser.role === ROLES.KETUA_RW && currentUser.rw) {
                const myRw = String(currentUser.rw || '05').padStart(2, '0');
                users = users.filter(u => String(u.rw || '05').padStart(2, '0') === myRw);
            }
        }

        if (query) {
            users = users.filter(u =>
                (u.username || '').toLowerCase().includes(query) ||
                (u.name || '').toLowerCase().includes(query) ||
                (u.email || '').toLowerCase().includes(query) ||
                (u.nik || '').includes(query) ||
                (u.no_hp || '').includes(query)
            );
        }

        if (role) {
            users = users.filter(u => u.role === role);
        }

        if (status) {
            users = users.filter(u => (u.status || 'Aktif') === status);
        }

        if (tableBody) {
            tableBody.innerHTML = renderUserRows(users, currentUser);
            attachRowActionEvents();
        }
        if (countBadge) {
            countBadge.innerText = `${users.length} Akun`;
        }

        // Sinkronkan angka pada kartu metrik dengan state array pengguna yang sedang aktif
        const statTotal = document.getElementById('statTotalUsers');
        const statAdmin = document.getElementById('statSuperAdmin');
        const statPengurus = document.getElementById('statPengurus');
        const statWarga = document.getElementById('statWarga');
        const normalizeRole = (r) => String(r || '').toLowerCase().replace(/[\s_-]+/g, '');
        if (statTotal) statTotal.innerText = users.length;
        if (statAdmin) statAdmin.innerText = users.filter(u => {
            const nr = normalizeRole(u.role);
            return nr === 'superadmin' || nr === 'admin' || u.role === ROLES.SUPER_ADMIN;
        }).length;
        if (statPengurus) statPengurus.innerText = users.filter(u => {
            const nr = normalizeRole(u.role);
            return nr === 'rt' || nr === 'rw' || nr.includes('rt') || nr.includes('rw') || u.role === ROLES.KETUA_RW || u.role === ROLES.KETUA_RT;
        }).length;
        if (statWarga) statWarga.innerText = users.filter(u => {
            const nr = normalizeRole(u.role);
            return nr === 'warga' || u.role === ROLES.WARGA;
        }).length;
    }

    if (searchInput) searchInput.addEventListener('input', filterUsers);
    if (roleFilter) roleFilter.addEventListener('change', filterUsers);
    if (statusFilter) statusFilter.addEventListener('change', filterUsers);

    // Modal Add Open
    if (btnTambah && modalUser) {
        btnTambah.addEventListener('click', () => {
            formUser.reset();
            document.getElementById('userIdInput').value = '';
            document.getElementById('modalUserTitle').innerText = 'Tambah Akun Pengguna';
            document.getElementById('modalUserIcon').className = 'ph ph-user-plus';
            document.getElementById('passwordHelpText').innerText = '(Kosongkan untuk kata sandi default: password123)';
            document.getElementById('userUsernameInput').readOnly = false;
            document.getElementById('userRwInput').value = '05';
            document.getElementById('userStatusInput').value = 'Aktif';

            const roleInput = document.getElementById('userRoleInput');
            const roleHelp = document.getElementById('userRoleHelpText');

            if (isSuperAdmin) {
                roleInput.disabled = false;
                roleInput.style.backgroundColor = '#ffffff';
                if (roleHelp) roleHelp.style.display = 'none';
            } else {
                roleInput.value = ROLES.WARGA;
                roleInput.disabled = true;
                roleInput.style.backgroundColor = '#f1f5f9';
                if (roleHelp) {
                    roleHelp.style.display = 'block';
                    roleHelp.innerText = '(Hanya Super Admin yang berwenang mengubah Peran Pengguna)';
                }
                if (currentUser && currentUser.role === ROLES.KETUA_RT) {
                    document.getElementById('userRtInput').value = currentUser.rt || '';
                }
            }

            modalUser.style.display = 'flex';
        });
    }

    const closeUserModal = () => {
        if (modalUser) modalUser.style.display = 'none';
        if (formUser) formUser.reset();
    };

    const closeResetModal = () => {
        if (modalReset) modalReset.style.display = 'none';
        if (formReset) formReset.reset();
    };

    if (btnCloseUser) btnCloseUser.addEventListener('click', closeUserModal);
    if (btnCancelUser) btnCancelUser.addEventListener('click', closeUserModal);
    if (btnCancelReset) btnCancelReset.addEventListener('click', closeResetModal);

    // Form Submit (Add or Edit) - Sends PUT /api/users/:id or POST /api/users
    if (formUser) {
        formUser.onsubmit = async (e) => {
            e.preventDefault();

            if (formUser.dataset.isSubmitting === 'true') {
                return;
            }
            formUser.dataset.isSubmitting = 'true';

            const id = document.getElementById('userIdInput').value;
            const btnSubmit = document.getElementById('btnSubmitUser');

            const noHpValue = document.getElementById('userNoHpInput') ? document.getElementById('userNoHpInput').value.trim() : '';
            const userData = {
                id: id || undefined,
                username: document.getElementById('userUsernameInput').value.trim(),
                name: document.getElementById('userNameInput').value.trim(),
                email: document.getElementById('userEmailInput').value.trim(),
                role: document.getElementById('userRoleInput').value,
                rt: document.getElementById('userRtInput').value.trim(),
                rw: document.getElementById('userRwInput').value.trim(),
                nik: document.getElementById('userNikInput').value.trim(),
                status: document.getElementById('userStatusInput').value,
                no_hp: noHpValue,
                phone: noHpValue,
                alamat: document.getElementById('userAlamatInput') ? document.getElementById('userAlamatInput').value.trim() : '',
                password: document.getElementById('userPasswordInput').value.trim()
            };

            const originalBtnHtml = btnSubmit ? btnSubmit.innerHTML : 'Simpan Akun';
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Menyimpan ke Database...';
            }

            try {
                if (id) {
                    await updateUser(id, userData);
                    showToast('Data akun pengguna berhasil disimpan ke database!', 'success');
                } else {
                    await addUser(userData);
                    showToast('Akun pengguna baru berhasil ditambahkan ke database!', 'success');
                }
                closeUserModal();
                // Re-fetch data from database to ensure fresh state and refresh table
                await fetchUsers();
                filterUsers();
            } catch (err) {
                showToast(err.message || 'Gagal menyimpan data akun pengguna.', 'error');
            } finally {
                formUser.dataset.isSubmitting = 'false';
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = originalBtnHtml;
                }
            }
        };
    }

    // Form Submit (Reset Password)
    if (formReset) {
        formReset.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('resetUserId').value;
            const newPassword = document.getElementById('newPasswordInput').value;

            try {
                resetUserPassword(id, newPassword);
                showToast(`Kata sandi akun berhasil direset menjadi: "${newPassword}"`, 'success');
                closeResetModal();
            } catch (err) {
                showToast(err.message, 'error');
            }
        });
    }

    function attachRowActionEvents() {
        // Edit button - opens "Ubah Data & Peran Pengguna" modal
        document.querySelectorAll('.btn-action-edit').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const user = getAllUsers().find(u => String(u.id) === String(id));
                if (!user) return;

                const daftarWarga = (typeof getCollection === 'function' ? getCollection('warga') : (window.db?.warga || [])) || [];
                const matchedWarga = daftarWarga.find(w => 
                    (user.nik && w.nik === user.nik) || 
                    (w.nama && user.name && w.nama.trim().toLowerCase() === user.name.trim().toLowerCase()) ||
                    (user.email && w.email && w.email.trim().toLowerCase() === user.email.trim().toLowerCase())
                );

                const resolvedNik = user.nik || (matchedWarga ? matchedWarga.nik : '');
                const resolvedNoHp = user.no_hp || (matchedWarga ? (matchedWarga.no_hp || matchedWarga.telepon) : '');
                const resolvedAlamat = user.alamat || (matchedWarga ? matchedWarga.alamat : '');
                const resolvedRt = user.rt || (matchedWarga ? matchedWarga.rt : '');
                const resolvedRw = user.rw || (matchedWarga ? matchedWarga.rw : '05');

                document.getElementById('userIdInput').value = user.id;
                document.getElementById('userUsernameInput').value = user.username || '';
                document.getElementById('userNameInput').value = user.name || '';
                document.getElementById('userEmailInput').value = user.email || '';

                const roleInput = document.getElementById('userRoleInput');
                const roleHelp = document.getElementById('userRoleHelpText');
                roleInput.value = user.role || ROLES.WARGA;

                // Role permission check:
                // Super Admin can edit any role.
                // Ketua RT & Ketua RW can edit citizen data, but CANNOT change Role.
                if (isSuperAdmin) {
                    roleInput.disabled = false;
                    roleInput.style.backgroundColor = '#ffffff';
                    if (roleHelp) roleHelp.style.display = 'none';
                } else {
                    roleInput.disabled = true;
                    roleInput.style.backgroundColor = '#f1f5f9';
                    if (roleHelp) {
                        roleHelp.style.display = 'block';
                        roleHelp.innerText = '(Hanya Super Admin yang berwenang mengubah Peran Pengguna)';
                    }
                }

                document.getElementById('userRtInput').value = resolvedRt;
                document.getElementById('userRwInput').value = resolvedRw;
                document.getElementById('userNikInput').value = resolvedNik;
                document.getElementById('userStatusInput').value = user.status || 'Aktif';

                if (document.getElementById('userNoHpInput')) {
                    document.getElementById('userNoHpInput').value = resolvedNoHp;
                }
                if (document.getElementById('userAlamatInput')) {
                    document.getElementById('userAlamatInput').value = resolvedAlamat;
                }

                document.getElementById('userPasswordInput').value = '';

                document.getElementById('modalUserTitle').innerText = 'Ubah Data & Peran Pengguna';
                document.getElementById('modalUserIcon').className = 'ph ph-user-gear';
                document.getElementById('passwordHelpText').innerText = '(Kosongkan jika tidak ingin mengubah kata sandi)';

                modalUser.style.display = 'flex';
            };
        });

        // Reset password button
        document.querySelectorAll('.btn-action-reset').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const name = e.currentTarget.getAttribute('data-name');
                const username = e.currentTarget.getAttribute('data-username');

                document.getElementById('resetUserId').value = id;
                document.getElementById('resetUserTarget').innerText = `Pengguna: ${name} (@${username})`;
                document.getElementById('newPasswordInput').value = 'password123';

                modalReset.style.display = 'flex';
            };
        });

        // Toggle status button
        document.querySelectorAll('.btn-action-status').forEach(btn => {
            btn.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                try {
                    const updated = toggleUserStatus(id);
                    showToast(`Status akun @${updated.username} diubah menjadi ${updated.status}`, 'success');
                    filterUsers();
                } catch (err) {
                    showToast(err.message, 'error');
                }
            };
        });

        // Delete button with SweetAlert2 or Modal
        document.querySelectorAll('.btn-action-delete').forEach(btn => {
            btn.onclick = async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const username = e.currentTarget.getAttribute('data-username');

                const confirmed = await showConfirmDialog({
                    title: 'Konfirmasi Hapus',
                    message: `Apakah Anda yakin ingin menghapus akun @${username}?`,
                    itemName: `akun @${username}`,
                    confirmText: 'Ya, Hapus',
                    cancelText: 'Batal',
                    confirmButtonColor: '#dc2626'
                });

                if (confirmed) {
                    try {
                        await deleteUser(id);
                        showToast(`Akun @${username} berhasil dihapus dari database.`, 'success');
                        filterUsers();
                    } catch (err) {
                        showToast(err.message, 'error');
                    }
                }
            };
        });
    }

    attachRowActionEvents();
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.background = type === 'error' ? '#991b1b' : '#166534';
    toast.style.color = 'white';
    toast.style.padding = '0.9rem 1.4rem';
    toast.style.borderRadius = '10px';
    toast.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.2)';
    toast.style.zIndex = '999999';
    toast.style.fontWeight = '600';
    toast.style.fontSize = '0.9rem';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';
    toast.style.transition = 'all 0.3s ease';

    const icon = type === 'error' ? 'ph-x-circle' : 'ph-check-circle';
    toast.innerHTML = `<i class="ph-fill ${icon}" style="font-size: 1.25rem;"></i> <span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

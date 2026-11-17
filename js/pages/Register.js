// js/pages/Register.js
// Halaman Pendaftaran Akun Mandiri untuk Warga Digital RW
import { callBackendApi } from '../services/apiClient.js';
import { getCollection, saveCollection, syncWithBackend } from '../utils/db.js';
import { hashPassword } from '../utils/crypto.js';
import { showAlertDialog } from '../utils/uiDialog.js';

export function renderRegister() {
    return `
        <div class="auth-layout" style="min-height: 100vh; padding: 2rem 1rem;">
            <div class="card login-box" style="max-width: 600px; padding: 2.25rem 2rem;">
                <div class="login-header" style="margin-bottom: 1.5rem; text-align: center;">
                    <div class="login-icon" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); margin: 0 auto 1rem auto; width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.75rem;">
                        <i class="ph-bold ph-user-plus"></i>
                    </div>
                    <h1 style="font-size: 1.5rem; font-weight: 800; color: #1E293B; margin-bottom: 0.35rem;">Pendaftaran Akun Warga Baru</h1>
                    <p style="font-size: 0.875rem; margin-top: 0.25rem; color: var(--text-muted);">
                        Sistem Informasi Pelayanan & Tata Kelola Warga Terpadu RW 05
                    </p>
                </div>

                <div id="registerError" style="color: var(--danger-color); font-size: 0.875rem; font-weight: 600; margin-bottom: 1.25rem; display: none; text-align: center; padding: 0.75rem 1rem; background-color: var(--danger-light); border: 1px solid rgba(239, 56, 38, 0.2); border-radius: var(--radius-md);">
                    <i class="ph-bold ph-warning-circle align-middle"></i> <span id="registerErrorMsg">NIK/Email sudah terdaftar</span>
                </div>

                <form id="registerForm" novalidate>
                    <!-- Baris 1: NIK & Nomor KK -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="regNik" style="font-size: 0.8125rem; font-weight: 700;">
                                NIK (KTP) <span class="text-danger">*</span>
                            </label>
                            <input type="text" id="regNik" class="form-input" placeholder="16 digit angka NIK" maxlength="16" inputmode="numeric" required>
                            <div id="nikError" style="color: var(--danger-color); font-size: 0.72rem; margin-top: 0.25rem; display: none;">NIK harus 16 digit angka</div>
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="regNoKk" style="font-size: 0.8125rem; font-weight: 700;">
                                Nomor KK <span class="text-danger">*</span>
                            </label>
                            <input type="text" id="regNoKk" class="form-input" placeholder="16 digit nomor KK" maxlength="16" inputmode="numeric" required>
                            <div id="noKkError" style="color: var(--danger-color); font-size: 0.72rem; margin-top: 0.25rem; display: none;">Nomor KK harus 16 digit angka</div>
                        </div>
                    </div>

                    <!-- Baris 2: Nama Lengkap -->
                    <div class="form-group" style="margin-bottom: 1rem;">
                        <label class="form-label" for="regNama" style="font-size: 0.8125rem; font-weight: 700;">
                            Nama Lengkap (Sesuai KTP) <span class="text-danger">*</span>
                        </label>
                        <input type="text" id="regNama" class="form-input" placeholder="Nama lengkap Anda" required>
                        <div id="namaError" style="color: var(--danger-color); font-size: 0.72rem; margin-top: 0.25rem; display: none;">Nama lengkap wajib diisi</div>
                    </div>

                    <!-- Baris 3: Pilihan RT & Jenis Kelamin -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="regRt" style="font-size: 0.8125rem; font-weight: 700;">
                                Wilayah RT <span class="text-danger">*</span>
                            </label>
                            <select id="regRt" class="form-input" required>
                                <option value="01">RT 01 (RW 05)</option>
                                <option value="02">RT 02 (RW 05)</option>
                            </select>
                            <small style="color: var(--text-muted); font-size: 0.7rem;">RW 05 terisi otomatis</small>
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="regJk" style="font-size: 0.8125rem; font-weight: 700;">
                                Jenis Kelamin <span class="text-danger">*</span>
                            </label>
                            <select id="regJk" class="form-input" required>
                                <option value="L">Laki-laki</option>
                                <option value="P">Perempuan</option>
                            </select>
                        </div>
                    </div>

                    <!-- Baris 4: Nomor WhatsApp & Email -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="regHp" style="font-size: 0.8125rem; font-weight: 700;">
                                No. WhatsApp / HP <span class="text-danger">*</span>
                            </label>
                            <input type="tel" id="regHp" class="form-input" placeholder="08xxxxxxxxxx" required>
                            <small style="color: var(--text-muted); font-size: 0.7rem;">Untuk notifikasi status surat</small>
                            <div id="hpError" style="color: var(--danger-color); font-size: 0.72rem; margin-top: 0.25rem; display: none;">Nomor WhatsApp/HP wajib valid</div>
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="regEmail" style="font-size: 0.8125rem; font-weight: 700;">
                                Alamat Email Aktif <span class="text-danger">*</span>
                            </label>
                            <input type="email" id="regEmail" class="form-input" placeholder="nama@email.com" required>
                            <div id="emailError" style="color: var(--danger-color); font-size: 0.72rem; margin-top: 0.25rem; display: none;">Alamat email tidak valid</div>
                        </div>
                    </div>

                    <!-- Baris 5: Password & Konfirmasi Password -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="regPassword" style="font-size: 0.8125rem; font-weight: 700;">
                                Password <span class="text-danger">*</span>
                            </label>
                            <input type="password" id="regPassword" class="form-input" placeholder="Minimal 6 karakter" required autocomplete="new-password">
                            <div id="passwordError" style="color: var(--danger-color); font-size: 0.72rem; margin-top: 0.25rem; display: none;">Password minimal 6 karakter</div>
                        </div>

                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label" for="regPasswordConfirm" style="font-size: 0.8125rem; font-weight: 700;">
                                Konfirmasi Password <span class="text-danger">*</span>
                            </label>
                            <input type="password" id="regPasswordConfirm" class="form-input" placeholder="Ulangi password" required autocomplete="new-password">
                            <div id="passwordConfirmError" style="color: var(--danger-color); font-size: 0.72rem; margin-top: 0.25rem; display: none;">Konfirmasi password tidak cocok</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
                        <a href="#/login" id="btnBackToLogin" class="btn btn-secondary" style="flex: 1; padding: 0.85rem; font-size: 0.95rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; border: 1px solid var(--border-color); background: #f8fafc; color: #475569; border-radius: 8px;">
                            <i class="ph-bold ph-arrow-left"></i>
                            <span>Kembali ke Login</span>
                        </a>
                        <button type="submit" id="btnSubmitRegister" class="btn btn-primary" style="flex: 1; padding: 0.85rem; font-size: 0.95rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="ph-bold ph-check-circle"></i>
                            <span>Daftar Sekarang</span>
                        </button>
                    </div>
                </form>

                <div style="text-align: center; margin-top: 1.25rem; padding-top: 1rem; border-top: 1px dashed var(--border-color);">
                    <p style="font-size: 0.875rem; color: var(--text-muted); margin: 0;">
                        Sudah punya akun? 
                        <a href="#/login" style="color: var(--primary-color); font-weight: 700; text-decoration: none; margin-left: 4px;">
                            Kembali ke Login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    `;
}

export function setupRegisterEvents() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    // Filter numeric only for NIK and No KK
    const nikInput = document.getElementById('regNik');
    const noKkInput = document.getElementById('regNoKk');
    const hpInput = document.getElementById('regHp');

    [nikInput, noKkInput].forEach(inp => {
        if (inp) {
            inp.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
            });
        }
    });

    if (hpInput) {
        hpInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^\d+]/g, '').slice(0, 16);
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nik = (nikInput?.value || '').trim();
        const no_kk = (noKkInput?.value || '').trim();
        const nama = (document.getElementById('regNama')?.value || '').trim();
        const rt = (document.getElementById('regRt')?.value || '01').trim();
        const rw = '05';
        const jk = (document.getElementById('regJk')?.value || 'L').trim();
        const no_hp = (hpInput?.value || '').trim();
        const email = (document.getElementById('regEmail')?.value || '').trim().toLowerCase();
        const password = (document.getElementById('regPassword')?.value || '').trim();
        const passwordConfirm = (document.getElementById('regPasswordConfirm')?.value || '').trim();

        // Reset errors
        const errorBox = document.getElementById('registerError');
        const errorMsg = document.getElementById('registerErrorMsg');
        const nikError = document.getElementById('nikError');
        const noKkError = document.getElementById('noKkError');
        const namaError = document.getElementById('namaError');
        const hpError = document.getElementById('hpError');
        const emailError = document.getElementById('emailError');
        const passError = document.getElementById('passwordError');
        const passConfError = document.getElementById('passwordConfirmError');

        if (errorBox) errorBox.style.display = 'none';
        if (nikError) nikError.style.display = 'none';
        if (noKkError) noKkError.style.display = 'none';
        if (namaError) namaError.style.display = 'none';
        if (hpError) hpError.style.display = 'none';
        if (emailError) emailError.style.display = 'none';
        if (passError) passError.style.display = 'none';
        if (passConfError) passConfError.style.display = 'none';

        const showError = (msg) => {
            if (errorBox && errorMsg) {
                errorMsg.textContent = msg;
                errorBox.style.display = 'block';
                errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
            if (typeof window !== 'undefined' && window.Swal && typeof window.Swal.fire === 'function') {
                window.Swal.fire({
                    icon: 'error',
                    title: 'Gagal Mendaftar',
                    text: msg,
                    confirmButtonColor: '#dc2626'
                });
            }
        };

        // 1. Validasi NIK (16 digit angka)
        if (!/^\d{16}$/.test(nik)) {
            if (nikError) nikError.style.display = 'block';
            showError("NIK harus berupa 16 digit angka.");
            return;
        }

        // 2. Validasi Nomor KK (16 digit angka)
        if (!/^\d{16}$/.test(no_kk)) {
            if (noKkError) noKkError.style.display = 'block';
            showError("Nomor Kartu Keluarga harus berupa 16 digit angka.");
            return;
        }

        // 3. Validasi Nama Lengkap
        if (!nama || nama.length < 2) {
            if (namaError) namaError.style.display = 'block';
            showError("Nama lengkap wajib diisi sesuai KTP.");
            return;
        }

        // 4. Validasi WhatsApp / HP
        const cleanHp = no_hp.replace(/[\s-]/g, '');
        if (!/^[0-9+]{9,16}$/.test(cleanHp)) {
            if (hpError) hpError.style.display = 'block';
            showError("Nomor WhatsApp / HP tidak valid.");
            return;
        }

        // 5. Validasi Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            if (emailError) emailError.style.display = 'block';
            showError("Format alamat email tidak valid.");
            return;
        }

        // 6. Validasi Password
        if (password.length < 6) {
            if (passError) passError.style.display = 'block';
            showError("Password minimal 6 karakter.");
            return;
        }

        if (password !== passwordConfirm) {
            if (passConfError) passConfError.style.display = 'block';
            showError("Konfirmasi password tidak cocok dengan password yang dimasukkan.");
            return;
        }

        // 7. Cek Duplikasi Lokal Instan
        const localWarga = getCollection('warga') || [];
        const localUsers = getCollection('users') || [];

        const isDuplicateNik = localWarga.some(w => String(w.nik || '').trim() === nik) ||
                               localUsers.some(u => String(u.nik || '').trim() === nik);
        const isDuplicateEmail = localWarga.some(w => String(w.email || '').trim().toLowerCase() === email) ||
                                 localUsers.some(u => String(u.email || '').trim().toLowerCase() === email);

        if (isDuplicateNik || isDuplicateEmail) {
            showError("NIK/Email sudah terdaftar");
            return;
        }

        // Tombol loading state
        const submitBtn = document.getElementById('btnSubmitRegister');
        const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Memproses Pendaftaran...';
        }

        const hashedPassword = hashPassword(password);
        const nowIso = new Date().toISOString();

        const registerPayload = {
            action: 'register',
            nik: nik,
            no_kk: no_kk,
            nama: nama,
            rt: rt,
            rw: rw,
            telepon: no_hp,
            no_hp: no_hp,
            email: email,
            jenis_kelamin: jk,
            password: password,
            hashed_password: hashedPassword,
            role: 'warga',
            status_warga: 'Tetap',
            created_at: nowIso
        };

        try {
            // Panggil API Backend (auth.php / warga.php)
            let res = null;
            try {
                res = await callBackendApi('auth.php', registerPayload, 'POST');
            } catch (errAuth) {
                // Fallback ke warga.php jika auth.php gagal
                res = await callBackendApi('warga.php', registerPayload, 'POST');
            }

            if (res && res.error) {
                throw new Error(res.error);
            }

            // Simpan ke state localStorage kependudukan & pengguna secara sinkron
            const newWargaItem = {
                nik: nik,
                no_kk: no_kk,
                nama: nama,
                rt: rt,
                rw: rw,
                telepon: no_hp,
                no_hp: no_hp,
                email: email,
                jenis_kelamin: jk,
                password: hashedPassword,
                role: 'warga',
                status_warga: 'Tetap',
                status: 'Tetap',
                pekerjaan: '-',
                agama: 'Islam',
                alamat: `RT ${rt} / RW ${rw}`,
                created_at: nowIso
            };

            const newUserId = (res && res.data && res.data.user && res.data.user.id) ? res.data.user.id : Date.now();
            const newUserItem = {
                id: newUserId,
                name: nama,
                username: nik,
                email: email,
                role: 'Warga',
                rt: rt,
                rw: rw,
                nik: nik,
                no_hp: no_hp,
                alamat: `RT ${rt} / RW ${rw}`,
                status: 'Aktif',
                password: hashedPassword,
                created_at: nowIso
            };

            // Update local collections
            const currentWarga = getCollection('warga') || [];
            currentWarga.push(newWargaItem);
            saveCollection('warga', currentWarga);

            const currentUsers = getCollection('users') || [];
            currentUsers.push(newUserItem);
            saveCollection('users', currentUsers);

            // Trigger non-blocking background sync
            syncWithBackend().catch(() => {});

            // Notifikasi sukses dan redirect otomatis ke #/login
            await showAlertDialog(
                "Pendaftaran berhasil! Silakan login menggunakan NIK dan password Anda.",
                "success",
                "Pendaftaran Berhasil"
            );

            window.location.hash = '#/login';

        } catch (err) {
            console.error("Register Error:", err);
            const msg = err.message || "Terjadi kesalahan saat pendaftaran.";
            if (msg.includes("NIK") && msg.includes("terdaftar")) {
                showError("NIK/Email sudah terdaftar");
            } else if (msg.includes("Email") && msg.includes("terdaftar")) {
                showError("NIK/Email sudah terdaftar");
            } else {
                showError(msg);
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnHtml;
            }
        }
    });
}

export const RegisterView = {
    render: () => {
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = renderRegister();
            setupRegisterEvents();
        }
        return renderRegister();
    },
    setup: setupRegisterEvents
};

if (typeof window !== 'undefined') {
    window.RegisterView = RegisterView;
    window.renderRegister = renderRegister;
    window.setupRegisterEvents = setupRegisterEvents;
}

export default RegisterView;


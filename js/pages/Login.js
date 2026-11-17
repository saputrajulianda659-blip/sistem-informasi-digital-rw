// js/pages/Login.js
import { authenticate, login } from '../models/User.js';

export function renderLogin() {
    return `
        <div class="login-landing-page" style="width: 100%; min-height: 100vh; overflow-x: hidden; background: #f8fafc;">
            <!-- SEKSI ATAS: FORM LOGIN & FULL BACKGROUND WARGA -->
            <section class="min-h-screen bg-cover bg-center bg-no-repeat relative flex flex-col items-center justify-center p-4" style="
                min-height: 100vh;
                width: 100%;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 2.5rem 1rem;
                background: #0f172a url('assets/img/bg-warga.jpg') center center / cover no-repeat;
            ">
                <!-- Overlay Semi-Transparan Elegan (bg-gradient-to-br from-blue-950/80 via-slate-900/75 to-blue-900/80) -->
                <div class="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-slate-900/75 to-blue-900/80" style="
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, rgba(23, 37, 84, 0.80) 0%, rgba(15, 23, 42, 0.75) 50%, rgba(30, 58, 138, 0.80) 100%);
                    z-index: 1;
                "></div>

                <!-- Card Login di Posisi Tengah -->
                <div class="card login-box bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md relative z-10 border border-slate-100" style="
                    position: relative;
                    z-index: 10;
                    max-width: 440px;
                    width: 100%;
                    background: #FFFFFF;
                    border-radius: 16px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.35);
                    border: 1px solid rgba(226, 232, 240, 0.9);
                    padding: 2.25rem 2rem;
                    transform: translateZ(0);
                    will-change: transform;
                    margin: auto;
                ">
                    <div class="login-header" style="text-align: center; margin-bottom: 1.5rem;">
                        <div class="login-icon" style="width: 56px; height: 56px; border-radius: 16px; background: linear-gradient(135deg, #4880FF 0%, #356BE5 100%); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 1.85rem; margin: 0 auto 0.85rem auto;">
                            <i class="ph-bold ph-house-line"></i>
                        </div>
                        <h1 style="font-size: 1.55rem; font-weight: 800; color: #1e293b; margin-bottom: 0.25rem;"><span style="color: var(--primary-color);">Digital</span> RW</h1>
                        <p style="color: #64748b; font-size: 0.875rem; margin: 0;">Sistem Informasi Pelayanan & Tata Kelola Warga Terpadu</p>
                    </div>
                    
                    <form id="loginForm">
                        <div class="form-group" style="margin-bottom: 1rem;">
                            <label class="form-label" for="username" style="display: block; font-size: 0.8125rem; font-weight: 700; color: #334155; margin-bottom: 0.4rem;">Username / Email</label>
                            <input type="text" id="username" class="form-input" placeholder="Masukkan username atau email Anda" required autocomplete="username" style="width: 100%;">
                            <div id="usernameError" style="color: var(--danger-color); font-size: 0.75rem; margin-top: 0.35rem; display: none;">Username/Email wajib diisi</div>
                        </div>
                        
                        <div class="form-group mb-6" style="margin-bottom: 1.25rem;">
                            <label class="form-label" for="password" style="display: block; font-size: 0.8125rem; font-weight: 700; color: #334155; margin-bottom: 0.4rem;">Password</label>
                            <input type="password" id="password" class="form-input" placeholder="Masukkan password akun Anda" required autocomplete="current-password" style="width: 100%;">
                            <div id="passwordError" style="color: var(--danger-color); font-size: 0.75rem; margin-top: 0.35rem; display: none;">Password wajib diisi</div>
                        </div>
                        
                        <div id="loginError" style="color: var(--danger-color); font-size: 0.875rem; font-weight: 600; margin-bottom: 1.25rem; display: none; text-align: center; padding: 0.75rem; background-color: var(--danger-light); border: 1px solid rgba(239, 56, 38, 0.2); border-radius: var(--radius-md);">
                            <i class="ph-bold ph-warning-circle align-middle"></i> Username/Email atau password salah!
                        </div>

                        <button type="submit" id="btnSubmitLogin" class="btn btn-primary" style="width: 100%; padding: 0.8125rem; font-size: 0.9375rem; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
                            <span>Masuk ke Dashboard</span>
                            <i class="ph-bold ph-arrow-right"></i>
                        </button>

                        <p class="text-center text-sm text-slate-500 mt-4" style="text-align: center; font-size: 0.875rem; color: #64748b; margin-top: 1rem;">
                            Belum punya akun? 
                            <a href="#/register" id="btnGoToRegister" class="text-blue-600 font-semibold hover:underline cursor-pointer" style="color: #2563eb; font-weight: 600; text-decoration: underline; cursor: pointer;">
                                Daftar Akun Baru
                            </a>
                        </p>
                    </form>
                </div>

                <!-- Indikator Scroll di bawah card -->
                <div style="position: relative; z-index: 10; margin-top: 1.5rem; text-align: center;">
                    <a href="#info-rw05" style="color: rgba(255, 255, 255, 0.9); font-size: 0.8125rem; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 7px 16px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 9999px; transition: all 0.2s;">
                        <span>↓ Scroll ke bawah untuk info RW 05</span>
                    </a>
                </div>
            </section>

            <!-- SEKSI BAWAH: INFORMASI & PROFIL LINGKUNGAN RW 05 -->
            <section id="info-rw05" class="bg-slate-50 py-16 px-6 md:px-12 text-slate-800" style="
                background-color: #f8fafc;
                padding: 4.5rem 1.5rem;
                color: #1e293b;
                width: 100%;
            ">
                <div style="max-width: 1100px; margin: 0 auto;">
                    
                    <!-- A. Header & Sambutan -->
                    <div style="text-align: center; max-width: 780px; margin: 0 auto 3.5rem auto;">
                        <span style="display: inline-block; padding: 4px 12px; background: #e0f2fe; color: #0284c7; font-size: 0.75rem; font-weight: 700; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem;">
                            Profil & Layanan Warga
                        </span>
                        <h2 style="font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 1rem; line-height: 1.3;">
                            Sekilas Tentang Lingkungan RW 05
                        </h2>
                        <p style="font-size: 1rem; color: #475569; line-height: 1.7; margin: 0;">
                            Selamat datang di Portal Layanan Mandiri RW 05. Kami berkomitmen menciptakan lingkungan yang aman, rukun, dan transparan dengan mempermudah pengurusan administrasi warga RT 01 dan RT 02 secara terpadu dan efisien.
                        </p>
                    </div>

                    <!-- B. 3 Langkah Alur Pelayanan Mandiri (Grid 3 Kolom) -->
                    <div style="margin-bottom: 4rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: #1e293b; text-align: center; margin-bottom: 1.75rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="ph-bold ph-path" style="color: #2563eb;"></i> Alur Pelayanan Surat Mandiri
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
                            <!-- Kolom 1 -->
                            <div class="alur-card group transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:border-blue-300 cursor-default" style="background: #ffffff; padding: 2rem 1.5rem; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); cursor: default;">
                                <div class="alur-icon transition-transform duration-300 group-hover:scale-110" style="width: 48px; height: 48px; border-radius: 12px; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1.25rem;">
                                    <i class="ph-bold ph-user-circle"></i>
                                </div>
                                <h4 style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem;">
                                    1. Masuk / Registrasi
                                </h4>
                                <p style="font-size: 0.875rem; color: #64748b; line-height: 1.6; margin: 0;">
                                    Masuk menggunakan Username/Email atau daftarkan akun keluarga Anda secara mandiri.
                                </p>
                            </div>

                            <!-- Kolom 2 -->
                            <div class="alur-card group transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:border-blue-300 cursor-default" style="background: #ffffff; padding: 2rem 1.5rem; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); cursor: default;">
                                <div class="alur-icon transition-transform duration-300 group-hover:scale-110" style="width: 48px; height: 48px; border-radius: 12px; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1.25rem;">
                                    <i class="ph-bold ph-file-text"></i>
                                </div>
                                <h4 style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem;">
                                    2. Ajukan Permohonan
                                </h4>
                                <p style="font-size: 0.875rem; color: #64748b; line-height: 1.6; margin: 0;">
                                    Buat Surat Pengantar (Domisili, SKTM, Usaha, Kelahiran) langsung dari HP tanpa repot bolak-balik.
                                </p>
                            </div>

                            <!-- Kolom 3 -->
                            <div class="alur-card group transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-xl hover:border-blue-300 cursor-default" style="background: #ffffff; padding: 2rem 1.5rem; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); cursor: default;">
                                <div class="alur-icon transition-transform duration-300 group-hover:scale-110" style="width: 48px; height: 48px; border-radius: 12px; background: #faf5ff; color: #9333ea; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 1.25rem;">
                                    <i class="ph-bold ph-check-circle"></i>
                                </div>
                                <h4 style="font-size: 1.1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.5rem;">
                                    3. Verifikasi & Unduh
                                </h4>
                                <p style="font-size: 0.875rem; color: #64748b; line-height: 1.6; margin: 0;">
                                    Pantau persetujuan berkas dari Ketua RT secara real-time dan unduh dokumen yang telah diverifikasi.
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- C. Informasi Wilayah & Jam Layanan (Grid 2 Kolom) -->
                    <div style="margin-bottom: 4rem;">
                        <h3 style="font-size: 1.25rem; font-weight: 800; color: #1e293b; text-align: center; margin-bottom: 1.75rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="ph-bold ph-map-pin" style="color: #ea580c;"></i> Informasi Wilayah & Jam Layanan
                        </h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
                            <!-- Card Wilayah RT 01 -->
                            <div style="background: #ffffff; padding: 1.75rem; border-radius: 14px; border: 1px solid #e2e8f0; border-top: 4px solid #f59e0b; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                                    <h4 style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0;">Wilayah RT 01</h4>
                                    <span style="font-size: 0.75rem; font-weight: 700; background: #fef3c7; color: #d97706; padding: 3px 8px; border-radius: 6px;">RW 05</span>
                                </div>
                                <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.875rem;">
                                    <li style="display: flex; align-items: flex-start; gap: 8px;">
                                        <i class="ph-bold ph-user" style="color: #f59e0b; margin-top: 2px;"></i>
                                        <div><strong style="color: #334155;">Ketua RT:</strong> Bapak Ahmad Fauzi</div>
                                    </li>
                                    <li style="display: flex; align-items: flex-start; gap: 8px;">
                                        <i class="ph-bold ph-clock" style="color: #f59e0b; margin-top: 2px;"></i>
                                        <div><strong style="color: #334155;">Jam Layanan Konsultasi:</strong> 19.00 – 21.00 WIB (Senin – Jumat)</div>
                                    </li>
                                    <li style="display: flex; align-items: flex-start; gap: 8px;">
                                        <i class="ph-bold ph-buildings" style="color: #f59e0b; margin-top: 2px;"></i>
                                        <div><strong style="color: #334155;">Cakupan:</strong> Blok A & Blok B</div>
                                    </li>
                                </ul>
                            </div>

                            <!-- Card Wilayah RT 02 -->
                            <div style="background: #ffffff; padding: 1.75rem; border-radius: 14px; border: 1px solid #e2e8f0; border-top: 4px solid #8b5cf6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
                                    <h4 style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0;">Wilayah RT 02</h4>
                                    <span style="font-size: 0.75rem; font-weight: 700; background: #ede9fe; color: #7c3aed; padding: 3px 8px; border-radius: 6px;">RW 05</span>
                                </div>
                                <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.875rem;">
                                    <li style="display: flex; align-items: flex-start; gap: 8px;">
                                        <i class="ph-bold ph-user" style="color: #8b5cf6; margin-top: 2px;"></i>
                                        <div><strong style="color: #334155;">Ketua RT:</strong> Bapak Eko Prasetyo</div>
                                    </li>
                                    <li style="display: flex; align-items: flex-start; gap: 8px;">
                                        <i class="ph-bold ph-clock" style="color: #8b5cf6; margin-top: 2px;"></i>
                                        <div><strong style="color: #334155;">Jam Layanan Konsultasi:</strong> 19.00 – 21.00 WIB (Senin – Jumat)</div>
                                    </li>
                                    <li style="display: flex; align-items: flex-start; gap: 8px;">
                                        <i class="ph-bold ph-buildings" style="color: #8b5cf6; margin-top: 2px;"></i>
                                        <div><strong style="color: #334155;">Cakupan:</strong> Blok C & Gang Masjid</div>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- D. Footer & Kontak Bantuan -->
                    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 2rem; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1.5rem;">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <div style="width: 44px; height: 44px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
                                <i class="ph-bold ph-shield-check"></i>
                            </div>
                            <div>
                                <div style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">Layanan Darurat Lingkungan</div>
                                <div style="font-size: 0.85rem; color: #64748b;">Pos Keamanan Lingkungan Siaga 24 Jam</div>
                            </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 14px;">
                            <div style="width: 44px; height: 44px; border-radius: 50%; background: #f0fdf4; color: #16a34a; display: flex; align-items: center; justify-content: center; font-size: 1.35rem;">
                                <i class="ph-bold ph-map-trifold"></i>
                            </div>
                            <div>
                                <div style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">Sekretariat Balai RW 05</div>
                                <div style="font-size: 0.85rem; color: #64748b;">Jl. Lingkungan RW 05</div>
                            </div>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 3rem; color: #94a3b8; font-size: 0.8125rem;">
                        &copy; 2026 Sistem Informasi Pelayanan Digital RW 05. Seluruh hak cipta dilindungi.
                    </div>

                </div>
            </section>
        </div>
        <style>
            html {
                scroll-behavior: smooth;
            }
            .text-blue-600, #btnGoToRegister {
                color: #2563eb !important;
            }
            #btnGoToRegister:hover {
                color: #1d4ed8 !important;
                text-decoration: underline !important;
            }
            .alur-card {
                transition: all 0.3s cubic-bezier(0, 0, 0.2, 1) !important;
            }
            .alur-card:hover {
                transform: translateY(-8px) !important;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
                border-color: #93c5fd !important;
            }
            .alur-card .alur-icon {
                transition: transform 0.3s cubic-bezier(0, 0, 0.2, 1) !important;
            }
            .alur-card:hover .alur-icon {
                transform: scale(1.1) !important;
            }
        </style>
    `;
}

export function setupLoginEvents() {
    // Smooth scroll to #info-rw05 without triggering hash navigation
    const btnScroll = document.querySelector('a[href="#info-rw05"]');
    if (btnScroll) {
        btnScroll.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.getElementById('info-rw05');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // Navigation to Register
    const btnGoToRegister = document.getElementById('btnGoToRegister');
    if (btnGoToRegister) {
        btnGoToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#/register';
        });
    }

    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const userVal = document.getElementById('username').value.trim();
            const passVal = document.getElementById('password').value.trim();
            const btnSubmit = document.getElementById('btnSubmitLogin') || form.querySelector('button[type="submit"]');
            const err = document.getElementById('loginError');
            let isValid = true;

            // Simple validation
            if (!userVal) {
                document.getElementById('usernameError').style.display = 'block';
                isValid = false;
            } else {
                document.getElementById('usernameError').style.display = 'none';
            }

            if (!passVal) {
                document.getElementById('passwordError').style.display = 'block';
                isValid = false;
            } else {
                document.getElementById('passwordError').style.display = 'none';
            }

            if (!isValid) return;

            // 1. Tampilkan status loading ringan pada tombol seketika (tanpa reload / overlay layar)
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = `<span>Memverifikasi...</span> <i class="ph-bold ph-spinner ph-spin" style="font-size: 1.1rem;"></i>`;
            }
            if (err) err.style.display = 'none';

            try {
                // 2. Cek kecocokan kredensial seketika (0ms) di state lokal
                let user = null;
                try {
                    user = authenticate(userVal, passVal);
                } catch (localAuthErr) {
                    // Fallback sinkronisasi user backend jika akun baru dibuat di server
                    try {
                        const { fetchUsers } = await import('../models/User.js');
                        await fetchUsers();
                        user = authenticate(userVal, passVal);
                    } catch (fallbackErr) {
                        throw localAuthErr;
                    }
                }

                if (user) {
                    // 3. Simpan data sesi pengguna ke localStorage seketika
                    login(user);

                    // 4. Pengalihan rute SPA seketika ke #/dashboard (0ms, tanpa reload layar penuh dan tanpa delay buatan)
                    if (window.location.hash === '#/dashboard') {
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                    } else {
                        window.location.hash = '#/dashboard';
                    }

                    // 5. Sinkronisasi data ke backend berjalan di latar belakang secara asynchronous setelah Dashboard tampil
                    setTimeout(() => {
                        import('../utils/db.js').then(({ syncWithBackend }) => {
                            syncWithBackend().catch(() => {});
                        }).catch(() => {});
                    }, 1500);
                    return;
                } else {
                    throw new Error("Username/Email atau password salah!");
                }
            } catch (error) {
                console.warn("Login Error:", error);
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = `<span>Masuk ke Dashboard</span> <i class="ph-bold ph-arrow-right"></i>`;
                }

                if (err) {
                    err.innerHTML = `<i class="ph-bold ph-warning-circle align-middle"></i> ${error.message || 'Username/Email atau password salah!'}`;
                    err.style.display = 'block';
                }

                // Shake animation for error
                const loginBox = document.querySelector('.login-box');
                if (loginBox) {
                    loginBox.style.transition = 'transform 0.1s';
                    loginBox.style.transform = 'translateX(10px)';
                    setTimeout(() => loginBox.style.transform = 'translateX(-10px)', 100);
                    setTimeout(() => loginBox.style.transform = 'translateX(10px)', 200);
                    setTimeout(() => {
                        loginBox.style.transform = 'translateX(0)';
                        loginBox.style.transition = '';
                    }, 300);
                }
            }
        });
    }
}

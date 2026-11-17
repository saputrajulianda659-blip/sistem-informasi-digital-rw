import { getCollection, saveCollection, initDB, syncWithBackend } from '../utils/db.js';
import { hashPassword } from '../utils/crypto.js';
import { callBackendApi } from '../services/apiClient.js';
import { resetSyncSignature } from '../services/syncService.js';

export const ROLES = {
    SUPER_ADMIN: 'Super Admin',
    KETUA_RW: 'Ketua RW',
    KETUA_RT: 'Ketua RT',
    WARGA: 'Warga'
};

const defaultUsers = [
    { id: 1, name: 'Budi Santoso', role: ROLES.SUPER_ADMIN, username: 'budi', email: 'budi@rwdigital.id', password: hashPassword('password'), status: 'Aktif', rt: '01', rw: '05', nik: '3201010101010001', no_hp: '082135409820', alamat: 'Jl. Melati No.1' },
    { id: 2, name: 'Bambang Mulyono', role: ROLES.KETUA_RW, username: 'bambang', email: 'bambang@rwdigital.id', password: hashPassword('password'), rt: '01', rw: '05', nik: '3201010101010008', no_hp: '082114122927', alamat: 'Jl. Melati No.2', status: 'Aktif' },
    { id: 3, name: 'Ahmad Fauzi', role: ROLES.KETUA_RT, username: 'ahmad', email: 'rt01@rwdigital.id', password: hashPassword('password'), rt: '01', rw: '05', nik: '3201010101010011', no_hp: '081234567891', alamat: 'Jl. Melati No.3', status: 'Aktif' },
    { id: 4, name: 'Eko Prasetyo', role: ROLES.KETUA_RT, username: 'eko', email: 'rt02@rwdigital.id', password: hashPassword('password'), rt: '02', rw: '05', nik: '3201010101010012', no_hp: '081234567892', alamat: 'Jl. Merdeka No.5', status: 'Aktif' },
    { id: 5, name: 'Julianda Saputra', role: ROLES.WARGA, username: 'julianda', email: 'saputrajulianda659@gmail.com', password: hashPassword('password'), rt: '01', rw: '05', nik: '3201010101010002', no_hp: '0895386105537', alamat: 'Jl. Melati No. 4', status: 'Aktif' },
    { id: 6, name: 'Siti Aminah', role: ROLES.WARGA, username: 'siti', email: 'iqisssss26@gmail.com', password: hashPassword('password'), rt: '02', rw: '05', nik: '3201010101010003', no_hp: '083827740391', alamat: 'Jl. Merdeka No.5', status: 'Aktif' }
];

function getUsers() {
    initDB();
    let users = getCollection('users');
    if (!users || users.length === 0) {
        saveCollection('users', defaultUsers);
        users = defaultUsers;
    } else {
        // Ensure default admin/staff accounts exist if missing, and sync missing core fields
        let updated = false;
        defaultUsers.forEach(defUser => {
            const existingIdx = users.findIndex(u =>
                (u.id && u.id === defUser.id) ||
                (u.username && u.username.toLowerCase() === defUser.username.toLowerCase())
            );
            if (existingIdx === -1) {
                users.push(defUser);
                updated = true;
            } else {
                const u = users[existingIdx];
                if (!u.nik && defUser.nik) { u.nik = defUser.nik; updated = true; }
                if (!u.no_hp && defUser.no_hp) { u.no_hp = defUser.no_hp; updated = true; }
                if (!u.alamat && defUser.alamat) { u.alamat = defUser.alamat; updated = true; }
                if (!u.rt && defUser.rt) { u.rt = defUser.rt; updated = true; }
                if (!u.rw && defUser.rw) { u.rw = defUser.rw; updated = true; }
            }
        });

        // Ensure status and passwords are set
        users = users.map(u => {
            let uMod = false;
            let item = { ...u };
            if (!item.status) {
                item.status = 'Aktif';
                uMod = true;
            }
            if (!item.password) {
                item.password = hashPassword('password');
                uMod = true;
            }
            if (uMod) updated = true;
            return item;
        });

        if (updated) {
            saveCollection('users', users);
        }
    }
    return users;
}

export async function fetchUsers() {
    try {
        const res = await callBackendApi('users.php', {}, 'GET');
        if (res && res.success && Array.isArray(res.data)) {
            const currentUsers = getCollection('users') || [];
            const syncedUsers = res.data.map(u => {
                const existing = currentUsers.find(cu => String(cu.id) === String(u.id));
                return {
                    ...u,
                    password: u.password || existing?.password || hashPassword('password'),
                    status: u.status || 'Aktif'
                };
            });
            saveCollection('users', syncedUsers);
            return syncedUsers;
        }
    } catch (e) {
        console.warn('[fetchUsers Backend Error, fallback to local]', e);
    }
    return getUsers();
}

export function getAllUsers() {
    return getUsers();
}

export function getUserById(id) {
    const numId = Number(id);
    return getUsers().find(u => u.id === numId || u.id === id) || null;
}

export function getUserByNik(nik) {
    return getUsers().find(u => u.nik === nik) || null;
}

export function getUsersByRole(role) {
    return getUsers().filter(u => u.role === role);
}

export function getKetuaRT(rt, rw) {
    const cleanRt = String(rt || '01').padStart(2, '0');
    const cleanRw = String(rw || '05').padStart(2, '0');
    return getUsers().find(u => u.role === ROLES.KETUA_RT && String(u.rt || '').padStart(2, '0') === cleanRt) 
        || getUsers().find(u => u.role === ROLES.KETUA_RT) 
        || null;
}

export function getKetuaRW(rw) {
    const cleanRw = String(rw || '05').padStart(2, '0');
    return getUsers().find(u => u.role === ROLES.KETUA_RW && (!u.rw || String(u.rw).padStart(2, '0') === cleanRw)) 
        || getUsers().find(u => u.role === ROLES.KETUA_RW) 
        || null;
}

export function getSuperAdmin() {
    return getUsers().find(u => u.role === ROLES.SUPER_ADMIN) || null;
}

export async function addUser(userData) {
    const users = getUsers();
    const cleanUsername = (userData.username || '').trim().toLowerCase();

    if (!cleanUsername) {
        throw new Error('Username wajib diisi.');
    }
    if (!userData.name || !userData.name.trim()) {
        throw new Error('Nama lengkap wajib diisi.');
    }
    if (users.some(u => (u.username || '').toLowerCase() === cleanUsername)) {
        throw new Error(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`);
    }
    if (userData.email && users.some(u => (u.email || '').toLowerCase() === userData.email.trim().toLowerCase())) {
        throw new Error(`Email "${userData.email}" sudah terdaftar.`);
    }

    const rawPassword = userData.password && userData.password.trim() ? userData.password.trim() : 'password123';
    let newUser = {
        id: Date.now(),
        name: userData.name.trim(),
        username: cleanUsername,
        email: userData.email ? userData.email.trim() : `${cleanUsername}@rwdigital.id`,
        role: userData.role || ROLES.WARGA,
        status: userData.status || 'Aktif',
        password: hashPassword(rawPassword),
        rt: userData.rt || '',
        rw: userData.rw || '05',
        nik: userData.nik || '',
        no_hp: userData.no_hp || '',
        alamat: userData.alamat || '',
        created_at: new Date().toISOString()
    };

    // 1. Sync to backend API (POST /api/users)
    try {
        const res = await callBackendApi('users.php', {
            action: 'create',
            username: newUser.username,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            rt: newUser.rt,
            rw: newUser.rw,
            nik: newUser.nik,
            status: newUser.status,
            no_hp: newUser.no_hp,
            alamat: newUser.alamat,
            password: rawPassword
        }, 'POST');
        if (res && res.data && res.data.id) {
            newUser.id = res.data.id;
        }
    } catch (e) {
        console.warn('[User Create Backend Notice]', e);
    }

    users.push(newUser);
    saveCollection('users', users);

    try {
        await syncWithBackend();
    } catch (e) { }

    return newUser;
}

export async function updateUser(id, updatedData) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        throw new Error('Autentikasi diperlukan. Silakan login kembali.');
    }

    const users = getUsers();
    const numId = Number(id);
    const index = users.findIndex(u => u.id === numId || u.id === id);

    if (index === -1) {
        throw new Error('Pengguna tidak ditemukan.');
    }

    let targetUser = { ...users[index] };

    // Role Permission Checks (Frontend Enforcement)
    const isSuperAdmin = currentUser.role === ROLES.SUPER_ADMIN;
    const isKetuaRW = currentUser.role === ROLES.KETUA_RW;
    const isKetuaRT = currentUser.role === ROLES.KETUA_RT;

    if (!isSuperAdmin && !isKetuaRW && !isKetuaRT) {
        throw new Error('Akses ditolak: Anda tidak memiliki hak untuk mengubah data pengguna.');
    }

    // Role Permission:
    // - Super Admin: Hak akses penuh mengubah SEMUA data pengguna termasuk Role
    // - Ketua RT & Ketua RW: Hak akses data kependudukan (Nama, NIK, Email, No HP, Alamat), TETAPI TIDAK BISA mengubah Role
    let finalRole = targetUser.role;
    if (isSuperAdmin) {
        if (updatedData.role) finalRole = updatedData.role;
    } else {
        // Enforce role immutability for Ketua RT & Ketua RW
        finalRole = targetUser.role || ROLES.WARGA;
    }

    // Territorial check for Ketua RT & Ketua RW
    if (isKetuaRT) {
        const userRt = String(currentUser.rt || '').padStart(2, '0');
        const targetRt = String(targetUser.rt || '').padStart(2, '0');
        if (userRt && targetRt && userRt !== targetRt) {
            throw new Error(`Akses ditolak: Ketua RT hanya berwenang mengubah data warga dalam wilayah RT ${userRt}.`);
        }
    }
    if (isKetuaRW) {
        const userRw = String(currentUser.rw || '05').padStart(2, '0');
        const targetRw = String(targetUser.rw || '05').padStart(2, '0');
        if (userRw && targetRw && userRw !== targetRw) {
            throw new Error(`Akses ditolak: Ketua RW hanya berwenang mengubah data warga dalam wilayah RW ${userRw}.`);
        }
    }

    // Check duplicate username if changed
    if (updatedData.username) {
        const cleanUsername = updatedData.username.trim().toLowerCase();
        if (cleanUsername !== (targetUser.username || '').toLowerCase() &&
            users.some(u => (u.id !== targetUser.id) && (u.username || '').toLowerCase() === cleanUsername)) {
            throw new Error(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`);
        }
        targetUser.username = cleanUsername;
    }

    if (updatedData.name) targetUser.name = updatedData.name.trim();
    if (updatedData.email) targetUser.email = updatedData.email.trim();
    targetUser.role = finalRole;
    if (updatedData.status) targetUser.status = updatedData.status;
    if (updatedData.rt !== undefined) targetUser.rt = updatedData.rt;
    if (updatedData.rw !== undefined) targetUser.rw = updatedData.rw;
    if (updatedData.nik !== undefined) targetUser.nik = updatedData.nik;
    if (updatedData.no_hp !== undefined) targetUser.no_hp = updatedData.no_hp;
    if (updatedData.alamat !== undefined) targetUser.alamat = updatedData.alamat;

    if (updatedData.password && updatedData.password.trim()) {
        targetUser.password = hashPassword(updatedData.password.trim());
    }

    // 1. Call Backend API: PUT /api/users/:id with updated fields
    try {
        const payload = {
            action: 'update',
            id: id,
            username: targetUser.username,
            name: targetUser.name,
            email: targetUser.email,
            role: finalRole,
            rt: targetUser.rt,
            rw: targetUser.rw,
            nik: targetUser.nik,
            status: targetUser.status,
            no_hp: targetUser.no_hp || targetUser.phone || '',
            phone: targetUser.no_hp || targetUser.phone || '',
            alamat: targetUser.alamat || '',
            password: updatedData.password || ''
        };
        const res = await callBackendApi(`users/${encodeURIComponent(id)}`, payload, 'PUT');
        if (res && res.data) {
            targetUser = { ...targetUser, ...res.data };
        }
    } catch (err) {
        if (err.message && (err.message.includes('Akses ditolak') || err.message.includes('sudah digunakan') || err.message.includes('wajib'))) {
            throw err;
        }
        console.warn('[User Update Backend Warning]', err);
    }

    // 2. Update local state in localStorage
    users[index] = targetUser;
    saveCollection('users', users);

    // 3. Synchronize linked citizen in local 'warga' collection if NIK is present
    if (targetUser.nik) {
        const warga = getCollection('warga') || [];
        const wIdx = warga.findIndex(w => w.nik === targetUser.nik);
        if (wIdx !== -1) {
            warga[wIdx] = {
                ...warga[wIdx],
                nama: targetUser.name,
                email: targetUser.email,
                no_hp: targetUser.no_hp || warga[wIdx].no_hp,
                alamat: targetUser.alamat || warga[wIdx].alamat,
                rt: targetUser.rt || warga[wIdx].rt,
                rw: targetUser.rw || warga[wIdx].rw
            };
            saveCollection('warga', warga);
        }
    }

    // Update active session if currently logged in user was modified
    if (currentUser.id === targetUser.id) {
        login({ ...currentUser, ...targetUser });
    }

    // 4. Background re-sync with backend database
    try {
        await syncWithBackend();
    } catch (e) { }

    return targetUser;
}

export function resetUserPassword(id, newPassword = 'password123') {
    const users = getUsers();
    const numId = Number(id);
    const index = users.findIndex(u => u.id === numId || u.id === id);

    if (index === -1) {
        throw new Error('Pengguna tidak ditemukan.');
    }

    users[index].password = hashPassword(newPassword);
    saveCollection('users', users);
    return users[index];
}

export function toggleUserStatus(id) {
    const users = getUsers();
    const numId = Number(id);
    const index = users.findIndex(u => u.id === numId || u.id === id);

    if (index === -1) {
        throw new Error('Pengguna tidak ditemukan.');
    }

    const currentStatus = users[index].status || 'Aktif';
    users[index].status = currentStatus === 'Aktif' ? 'Nonaktif' : 'Aktif';
    saveCollection('users', users);
    return users[index];
}

export async function deleteUser(id) {
    const users = getUsers();
    const numId = Number(id);
    const currentUser = getCurrentUser();

    if (currentUser && (currentUser.id === numId || currentUser.id === id)) {
        throw new Error('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.');
    }

    // Call backend API: DELETE /api/users/:id
    try {
        await callBackendApi(`users/${encodeURIComponent(id)}`, {
            action: 'delete',
            id: id
        }, 'DELETE');
    } catch (e) {
        if (e.message && e.message.includes('Akses ditolak')) {
            throw e;
        }
    }

    const filtered = users.filter(u => u.id !== numId && u.id !== id);
    if (filtered.length === users.length) {
        throw new Error('Pengguna tidak ditemukan.');
    }

    saveCollection('users', filtered);

    try {
        await syncWithBackend();
    } catch (e) { }

    return true;
}

export function authenticate(identifier, password) {
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
        throw new Error("Username atau Email wajib diisi!");
    }
    if (!password || !String(password).trim()) {
        throw new Error("Password wajib diisi!");
    }

    const users = getUsers();
    const inputIdentifier = identifier.trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const hashedInput = hashPassword(cleanPassword);

    // HANYA cocokkan dengan field username atau email di database:
    const user = users.find(u => 
        (u.username && u.username.toLowerCase() === inputIdentifier) ||
        (u.email && u.email.toLowerCase() === inputIdentifier)
    );

    if (!user) {
        throw new Error("Username atau Email tidak ditemukan!");
    }

    // Validasi password sesuai data user (mendukung plain text maupun hash)
    const isPasswordValid = (user.password === cleanPassword) || (user.password === hashedInput);
    if (!isPasswordValid) {
        throw new Error("Password salah!");
    }

    if (user.status === 'Nonaktif') {
        throw new Error('Akun Anda saat ini berstatus Nonaktif. Silakan hubungi Super Admin.');
    }

    return user;
}

export function getCurrentUser() {
    try {
        if (typeof localStorage === 'undefined') return null;
        const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
        if (!userStr) return null;
        let user = JSON.parse(userStr);
        if (user && (user.id || user.username)) {
            // Auto-enrich user if missing NIK, RT, RW, or nama
            const def = defaultUsers.find(du => 
                (user.id && du.id === user.id) || 
                (user.username && du.username.toLowerCase() === user.username.toLowerCase())
            );
            let modified = false;
            if (def) {
                if (!user.nik && def.nik) { user.nik = def.nik; modified = true; }
                if (!user.rt && def.rt) { user.rt = def.rt; modified = true; }
                if (!user.rw && def.rw) { user.rw = def.rw; modified = true; }
                if (!user.name && def.name) { user.name = def.name; modified = true; }
            }
            if (!user.nama && user.name) { user.nama = user.name; modified = true; }
            if (!user.name && user.nama) { user.name = user.nama; modified = true; }
            
            if (user.rt) {
                const padRt = String(user.rt).padStart(2, '0');
                if (user.rt !== padRt) {
                    user.rt = padRt;
                    modified = true;
                }
            }
            if (user.rw) {
                const padRw = String(user.rw).padStart(2, '0');
                if (user.rw !== padRw) {
                    user.rw = padRw;
                    modified = true;
                }
            }

            if (modified) {
                try {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                } catch (err) {}
            }
        }
        return user;
    } catch (e) {
        console.error('Failed to get current user from localStorage:', e);
        return null;
    }
}

export function login(user) {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('currentUser', JSON.stringify(user));
        }
    } catch (e) {
        console.error('Failed to save user to localStorage:', e);
    }
}

export function logout() {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('currentUser');
            localStorage.removeItem('user');
            localStorage.removeItem('activeRole');
            localStorage.removeItem('emergencyAlert');
        }
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.clear();
        }
        try {
            resetSyncSignature();
        } catch (sigErr) {}
    } catch (e) {
        console.error('Failed to clear user from localStorage:', e);
    }
}

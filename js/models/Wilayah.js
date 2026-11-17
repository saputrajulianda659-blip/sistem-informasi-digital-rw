// js/models/Wilayah.js
import { getCollection, saveCollection, initDB } from '../utils/db.js';

const defaultWilayah = [
    {
        id: 'RT01-RW05',
        rt: '01',
        rw: '05',
        nama_ketua_rt: 'Pak RT 01',
        kontak: '081298765432',
        keterangan: 'Mencakup Blok A1 - Blok B10, Pos Satpam Utama'
    },
    {
        id: 'RT02-RW05',
        rt: '02',
        rw: '05',
        nama_ketua_rt: 'Pak RT 02',
        kontak: '085612345678',
        keterangan: 'Mencakup Blok C1 - Blok D12, Area Taman Bermain'
    }
];

function getWilayahList() {
    initDB();
    let wilayah = getCollection('wilayah');
    if (!wilayah || wilayah.length === 0) {
        saveCollection('wilayah', defaultWilayah);
        wilayah = defaultWilayah;
    }
    return wilayah;
}

export function getAllWilayah() {
    const wilayah = getWilayahList();
    const warga = getCollection('warga');

    // Enrich with dynamic total warga count
    return wilayah.map(w => {
        const totalWarga = warga.filter(item => {
            const rtMatch = String(item.rt).padStart(2, '0') === String(w.rt).padStart(2, '0');
            const rwMatch = String(item.rw).padStart(2, '0') === String(w.rw).padStart(2, '0');
            return rtMatch && rwMatch;
        }).length;

        return {
            ...w,
            total_warga: totalWarga
        };
    });
}

export function getWilayahById(id) {
    const list = getAllWilayah();
    return list.find(w => w.id === id) || null;
}

export function addWilayah(data) {
    const list = getWilayahList();
    const rtFormatted = String(data.rt || '').padStart(2, '0');
    const rwFormatted = String(data.rw || '05').padStart(2, '0');

    if (!data.rt) {
        throw new Error('Nomor RT wajib diisi.');
    }

    const generatedId = `RT${rtFormatted}-RW${rwFormatted}`;

    // Check duplicate
    if (list.some(w => w.id === generatedId || (String(w.rt).padStart(2, '0') === rtFormatted && String(w.rw).padStart(2, '0') === rwFormatted))) {
        throw new Error(`Unit RT ${rtFormatted} di RW ${rwFormatted} sudah terdaftar dalam sistem.`);
    }

    const newWilayah = {
        id: generatedId,
        rt: rtFormatted,
        rw: rwFormatted,
        nama_ketua_rt: data.nama_ketua_rt ? data.nama_ketua_rt.trim() : 'Belum Ditentukan',
        kontak: data.kontak ? data.kontak.trim() : '-',
        keterangan: data.keterangan ? data.keterangan.trim() : 'Wilayah RT ' + rtFormatted
    };

    list.push(newWilayah);
    saveCollection('wilayah', list);
    return newWilayah;
}

export function updateWilayah(id, data) {
    const list = getWilayahList();
    const index = list.findIndex(w => w.id === id);

    if (index === -1) {
        throw new Error('Data unit wilayah tidak ditemukan.');
    }

    const target = list[index];

    if (data.nama_ketua_rt !== undefined) target.nama_ketua_rt = data.nama_ketua_rt.trim();
    if (data.kontak !== undefined) target.kontak = data.kontak.trim();
    if (data.keterangan !== undefined) target.keterangan = data.keterangan.trim();
    if (data.rw !== undefined) target.rw = String(data.rw).padStart(2, '0');

    list[index] = target;
    saveCollection('wilayah', list);
    return target;
}

export function deleteWilayah(id) {
    const list = getWilayahList();
    const filtered = list.filter(w => w.id !== id);

    if (filtered.length === list.length) {
        throw new Error('Data unit wilayah tidak ditemukan.');
    }

    saveCollection('wilayah', filtered);
    return true;
}

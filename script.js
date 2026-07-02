/**
 * Finance Tracker Engine - Core JavaScript Production Logic
 * Dibangunkan khusus untuk kegunaan Naib Bendahari Persatuan
 */

// Global App State Store
let transactions = [];
let isEditing = false;

// DOM Element Registry
const financeForm = document.getElementById('finance-form');
const trxTypeInput = document.getElementById('trx-type');
const trxAmountInput = document.getElementById('trx-amount');
const trxDateInput = document.getElementById('trx-date');
const trxCategoryInput = document.getElementById('trx-category');
const trxReasonInput = document.getElementById('trx-reason');
const editIdInput = document.getElementById('edit-id');

const formTitle = document.getElementById('form-title');
const btnSubmit = document.getElementById('btn-submit');
const btnCancelEdit = document.getElementById('btn-cancel-edit');

const txtBalance = document.getElementById('txt-balance');
const txtIncome = document.getElementById('txt-income');
const txtExpense = document.getElementById('txt-expense');
const txtTotalTrx = document.getElementById('txt-total-trx');

const tableBody = document.getElementById('table-body');
const emptyState = document.getElementById('empty-state');

const searchInput = document.getElementById('search-input');
const filterType = document.getElementById('filter-type');
const sortBy = document.getElementById('sort-by');

const btnExport = document.getElementById('btn-export');
const btnReset = document.getElementById('btn-reset');

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Set default tarikh hari ini pada borang input
    setDefaultDate();
    // Muatkan data asal daripada localStorage
    loadTransactions();
    // Sediakan Event Listeners
    setupEventListeners();
    // Sediakan Rendering Ikon Lucide
    lucide.createIcons();
});

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    trxDateInput.value = today;
}

// ==========================================
// CORE DATA METHODS
// ==========================================

// Fungsi memuatkan data dari storan pelayar web
function loadTransactions() {
    const storedData = localStorage.getItem('association_transactions');
    if (storedData) {
        transactions = JSON.parse(storedData);
    } else {
        transactions = [];
    }
    executeViewPipeline();
}

// Fungsi menyimpan state senarai ke storan pelayar web
function saveTransactions() {
    localStorage.setItem('association_transactions', JSON.stringify(transactions));
}

// Fungsi menjana corak kod ID TRX unik mengikut turutan bersiri
function generateTransactionID() {
    if (transactions.length === 0) return 'TRX-0001';
    
    // Cari nilai ID tertinggi berangka sedia ada
    const maxId = transactions.reduce((max, trx) => {
        const idNum = parseInt(trx.id.split('-')[1]);
        return idNum > max ? idNum : max;
    }, 0);
    
    const nextIdNum = maxId + 1;
    return `TRX-${String(nextIdNum).padStart(4, '0')}`;
}

// ==========================================
// EVENT CONTROLLERS
// ==========================================
function setupEventListeners() {
    // Borang pendaftaran/kemaskini transaksi
    financeForm.addEventListener('submit', addTransaction);
    
    // Pembatalan proses suntingan data
    btnCancelEdit.addEventListener('click', resetFormState);
    
    // Komponen carian, penapisan dan susunan susun atur jadual
    searchInput.addEventListener('input', executeViewPipeline);
    filterType.addEventListener('change', executeViewPipeline);
    sortBy.addEventListener('change', executeViewPipeline);
    
    // Sistem Utiliti Ekstra
    btnExport.addEventListener('click', exportCSV);
    btnReset.addEventListener('click', resetAllData);
}

// ==========================================
// ADD / EDIT OPERATION PIPELINE
// ==========================================
function addTransaction(e) {
    e.preventDefault();
    
    const amount = parseFloat(trxAmountInput.value);
    const type = trxTypeInput.value;
    const date = trxDateInput.value;
    const category = trxCategoryInput.value;
    const reason = trxReasonInput.value.trim();
    const currentId = editIdInput.value;

    if (!category) {
        alert('Sila pilih kategori yang sah.');
        return;
    }

    if (isEditing && currentId) {
        // Melaksanakan mod pembaruan maklumat sedia ada
        const index = transactions.findIndex(t => t.id === currentId);
        if (index !== -1) {
            transactions[index].type = type;
            transactions[index].amount = amount;
            transactions[index].date = date;
            transactions[index].category = category;
            transactions[index].reason = reason;
        }
        isEditing = false;
    } else {
        // Melaksanakan kemasukan data pendaftaran baharu
        const newTransaction = {
            id: generateTransactionID(),
            type,
            amount,
            date,
            category,
            reason
        };
        transactions.push(newTransaction);
    }

    saveTransactions();
    resetFormState();
    executeViewPipeline();
}

function editTransaction(id) {
    const targetTrx = transactions.find(t => t.id === id);
    if (!targetTrx) return;

    // Masukkan data lama kembali ke ruangan medan borang input
    editIdInput.value = targetTrx.id;
    trxTypeInput.value = targetTrx.type;
    trxAmountInput.value = targetTrx.amount;
    trxDateInput.value = targetTrx.date;
    trxCategoryInput.value = targetTrx.category;
    trxReasonInput.value = targetTrx.reason;

    // Ubah UI skrin kepada tetapan mod suntingan (Edit Mode)
    isEditing = true;
    formTitle.textContent = `Kemaskini Data [ ${targetTrx.id} ]`;
    btnSubmit.innerHTML = `<i data-lucide="check-circle"></i> Kemaskini Transaksi`;
    btnCancelEdit.style.display = 'inline-block';
    lucide.createIcons();
    
    // Skrol ke atas secara responsif untuk pengguna mobile fokus pada borang
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteTransaction(id) {
    const confirmDelete = confirm(`Adakah anda pasti mahu memadam transaksi ber-ID ${id}?`);
    if (!confirmDelete) return;

    // Jika dipadam sewaktu sedang mengedit entri yang sama, batalkan edit state
    if (isEditing && editIdInput.value === id) {
        resetFormState();
    }

    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    executeViewPipeline();
}

function resetFormState() {
    financeForm.reset();
    editIdInput.value = '';
    isEditing = false;
    formTitle.textContent = 'Tambah Transaksi Baru';
    btnSubmit.innerHTML = `<i data-lucide="plus-circle"></i> Add Transaction`;
    btnCancelEdit.style.display = 'none';
    setDefaultDate();
    lucide.createIcons();
}

// ==========================================
// ENGINE RENDER PIPELINES
// ==========================================

// Paip utama kawalan aliran pemprosesan view logik (Prose Berpusat)
function executeViewPipeline() {
    let processData = [...transactions];
    
    // 1. Jalankan tapisan mengikut jenis (All / Income / Expense)
    processData = filterTransactions(processData);
    
    // 2. Jalankan tapisan enjin carian teks bebas
    processData = searchTransactions(processData);
    
    // 3. Susun data mengikut kronologi atau amaun nilai wang terpilih
    processData = sortTransactions(processData);
    
    // 4. Kemas kini agregat ringkasan kewangan terkini
    updateSummary();
    
    // 5. Paparkan hasil senarai ke dalam struktur jadual HTML
    renderTransactions(processData);
}

function filterTransactions(data) {
    const filterValue = filterType.value;
    if (filterValue === 'All') return data;
    return data.filter(t => t.type === filterValue);
}

function searchTransactions(data) {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) return data;
    
    return data.filter(t => 
        t.id.toLowerCase().includes(query) ||
        t.reason.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
    );
}

function sortTransactions(data) {
    const criteria = sortBy.value;
    
    return data.sort((a, b) => {
        if (criteria === 'Newest') {
            return new Date(b.date) - new Date(a.date) || b.id.localeCompare(a.id);
        } else if (criteria === 'Oldest') {
            return new Date(a.date) - new Date(b.date) || a.id.localeCompare(b.id);
        } else if (criteria === 'Highest Amount') {
            return b.amount - a.amount;
        } else if (criteria === 'Lowest Amount') {
            return a.amount - b.amount;
        }
        return 0;
    });
}

function updateSummary() {
    let incomeSum = 0;
    let expenseSum = 0;

    // Kira menggunakan keseluruhan data asal daripada rekod storan
    transactions.forEach(t => {
        if (t.type === 'Income') {
            incomeSum += t.amount;
        } else if (t.type === 'Expense') {
            expenseSum += t.amount;
        }
    });

    const netBalance = incomeSum - expenseSum;

    // Paparkan kemas kini data secara format kewangan tempatan (RM)
    txtBalance.textContent = `RM ${netBalance.toFixed(2)}`;
    txtIncome.textContent = `RM ${incomeSum.toFixed(2)}`;
    txtExpense.textContent = `RM ${expenseSum.toFixed(2)}`;
    txtTotalTrx.textContent = `${transactions.length} Transaksi Direkodkan`;
    
    // Tukar penggayaan warna baki bersih sekiranya negatif (Defisit)
    if (netBalance < 0) {
        txtBalance.style.color = 'var(--color-expense)';
    } else {
        txtBalance.style.color = 'var(--text-main)';
    }
}

function renderTransactions(dataList) {
    tableBody.innerHTML = '';
    
    if (dataList.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    dataList.forEach(trx => {
        const tr = document.createElement('tr');
        
        // Penetapan indikator visual dinamik mengikut jenis operasi aliran tunai
        const typeBadgeClass = trx.type === 'Income' ? 'badge badge-income' : 'badge badge-expense';
        const amountClass = trx.type === 'Income' ? 'amt-income' : 'amt-expense';
        const amountPrefix = trx.type === 'Income' ? '+' : '-';
        
        // Menukar format penyusunan teks tarikh ke format tempatan ringkas (DD/MM/YYYY)
        const dateObj = new Date(trx.date);
        const formattedDate = !isNaN(dateObj) ? dateObj.toLocaleDateString('ms-MY') : trx.date;

        tr.innerHTML = `
            <td><strong>${trx.id}</strong></td>
            <td>${formattedDate}</td>
            <td><span class="badge-category">${trx.category}</span></td>
            <td>${escapeHTML(trx.reason)}</td>
            <td><span class="${typeBadgeClass}">${trx.type}</span></td>
            <td class="${amountClass}">${amountPrefix} RM ${trx.amount.toFixed(2)}</td>
            <td>
                <div class="actions-cell">
                    <button class="btn-icon btn-edit" onclick="editTransaction('${trx.id}')" title="Edit Transaksi">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteTransaction('${trx.id}')" title="Padam Transaksi">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });
    
    // Hidupkan semula render bagi suntikan ikon dinamik yang baharu dibina
    lucide.createIcons();
}

// XSS Prevention Helper untuk membersihkan data string dari input luaran
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// ==========================================
// UTILITY FUNCTIONS (EXPORT & RESET)
// ==========================================

function exportCSV() {
    if (transactions.length === 0) {
        alert('Tiada data transaksi untuk dieksport.');
        return;
    }

    // Penyediaan baris pengepala struktur fail dokumen data CSV
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID,Tarikh,Kategori,Tujuan,Jenis,Amaun (RM)\r\n';

    // Membina rentetan data baris demi baris
    transactions.forEach(t => {
        // Lapisi ruangan teks justifikasi dengan tanda pembuka kata sekiranya terdapat tanda koma
        const cleanReason = t.reason.includes(',') ? `"${t.reason}"` : t.reason;
        const row = [t.id, t.date, t.category, cleanReason, t.type, t.amount.toFixed(2)].join(',');
        csvContent += row + '\r\n';
    });

    // Pemicuan muat turun binari secara simulasi klik dokumen di pelayar web
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', encodedUri);
    downloadAnchor.setAttribute('download', `Laporan_Kewangan_Persatuan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

function resetAllData() {
    const finalConfirm = confirm('AMARAN: Anda mahu memadam kesemua data rekod transaksi persatuan dalam sistem ini? Tindakan ini tidak boleh dikembalikan.');
    
    if (finalConfirm) {
        localStorage.removeItem('association_transactions');
        transactions = [];
        resetFormState();
        executeViewPipeline();
        alert('Kesemua data transaksi storan telah berjaya dibersihkan secara total.');
    }
}
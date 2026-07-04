/**
 * Finance Tracker Engine - Core JavaScript Production Logic (With Receipt Upload)
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
const trxReceiptInput = document.getElementById('trx-receipt'); 
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

// Suntikan Struktur Modal Resit secara Dinamik ke HTML
const modalMarkup = `
<div id="receipt-modal" class="receipt-modal">
    <div class="modal-content">
        <button type="button" class="btn-close-modal" onclick="closeModal()">Tutup</button>
        <img id="modal-preview-img" src="" alt="Bukti Resit / Transaksi">
    </div>
</div>`;
document.body.insertAdjacentHTML('beforeend', modalMarkup);

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    setDefaultDate();
    loadTransactions();
    setupEventListeners();
    lucide.createIcons();
});

function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    trxDateInput.value = today;
}

// ==========================================
// CORE DATA METHODS
// ==========================================
function loadTransactions() {
    const storedData = localStorage.getItem('association_transactions');
    if (storedData) {
        transactions = JSON.parse(storedData);
    } else {
        transactions = [];
    }
    executeViewPipeline();
}

function saveTransactions() {
    localStorage.setItem('association_transactions', JSON.stringify(transactions));
}

function generateTransactionID() {
    if (transactions.length === 0) return 'TRX-0001';
    
    const maxId = transactions.reduce((max, trx) => {
        const idNum = parseInt(trx.id.split('-')[1]);
        return idNum > max ? idNum : max;
    }, 0);
    
    const nextIdNum = maxId + 1;
    return `TRX-${String(nextIdNum).padStart(4, '0')}`;
}

// Asynchronous Helper: Menukar fail imej fizikal kepada bentuk String Base64 Data URL
function processFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ==========================================
// EVENT CONTROLLERS
// ==========================================
function setupEventListeners() {
    financeForm.addEventListener('submit', handleFormSubmit);
    btnCancelEdit.addEventListener('click', resetFormState);
    searchInput.addEventListener('input', executeViewPipeline);
    filterType.addEventListener('change', executeViewPipeline);
    sortBy.addEventListener('change', executeViewPipeline);
    btnExport.addEventListener('click', exportCSV);
    btnReset.addEventListener('click', resetAllData);
}

// ==========================================
// ADD / EDIT OPERATION PIPELINE
// ==========================================
async function handleFormSubmit(e) {
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

    // Menguruskan pemprosesan fail bukti gambar jika diupload
    let receiptDataString = null;
    if (trxReceiptInput.files && trxReceiptInput.files[0]) {
        try {
            receiptDataString = await processFileToBase64(trxReceiptInput.files[0]);
        } catch (error) {
            alert('Ralat semasa memproses fail gambar bukti.');
            return;
        }
    }

    if (isEditing && currentId) {
        const index = transactions.findIndex(t => t.id === currentId);
        if (index !== -1) {
            transactions[index].type = type;
            transactions[index].amount = amount;
            transactions[index].date = date;
            transactions[index].category = category;
            transactions[index].reason = reason;
            
            // Jika ada muat naik fail baharu ketika edit, gantikan fail lama.
            if (receiptDataString) {
                transactions[index].receipt = receiptDataString;
            }
        }
        isEditing = false;
    } else {
        const newTransaction = {
            id: generateTransactionID(),
            type,
            amount,
            date,
            category,
            reason,
            receipt: receiptDataString // Menyimpan rujukan gambar (Base64) atau null
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

    editIdInput.value = targetTrx.id;
    trxTypeInput.value = targetTrx.type;
    trxAmountInput.value = targetTrx.amount;
    trxDateInput.value = targetTrx.date;
    trxCategoryInput.value = targetTrx.category;
    trxReasonInput.value = targetTrx.reason;
    trxReceiptInput.value = ''; // Set semula rujukan fail fizikal input kepada kosong

    isEditing = true;
    formTitle.textContent = `Kemaskini Data [ ${targetTrx.id} ]`;
    btnSubmit.innerHTML = `<i data-lucide="check-circle"></i> Kemaskini Transaksi`;
    btnCancelEdit.style.display = 'inline-block';
    lucide.createIcons();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteTransaction(id) {
    const confirmDelete = confirm(`Adakah anda pasti mahu memadam transaksi ber-ID ${id}?`);
    if (!confirmDelete) return;

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
    btnSubmit.innerHTML = `<i data-lucide="plus-circle"></i> Simpan Transaksi`;
    btnCancelEdit.style.display = 'none';
    setDefaultDate();
    lucide.createIcons();
}

// Kawalan Fungsi Papar / Tutup Modal Resit
window.openReceipt = function(id) {
    const targetTrx = transactions.find(t => t.id === id);
    if (targetTrx && targetTrx.receipt) {
        document.getElementById('modal-preview-img').src = targetTrx.receipt;
        document.getElementById('receipt-modal').style.display = 'flex';
    }
}

window.closeModal = function() {
    document.getElementById('receipt-modal').style.display = 'none';
}

// ==========================================
// ENGINE RENDER PIPELINES
// ==========================================
function executeViewPipeline() {
    let processData = [...transactions];
    
    processData = filterTransactions(processData);
    processData = searchTransactions(processData);
    processData = sortTransactions(processData);
    updateSummary();
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

    transactions.forEach(t => {
        if (t.type === 'Income') {
            incomeSum += t.amount;
        } else if (t.type === 'Expense') {
            expenseSum += t.amount;
        }
    });

    const netBalance = incomeSum - expenseSum;

    txtBalance.textContent = `RM ${netBalance.toFixed(2)}`;
    txtIncome.textContent = `RM ${incomeSum.toFixed(2)}`;
    txtExpense.textContent = `RM ${expenseSum.toFixed(2)}`;
    txtTotalTrx.textContent = `${transactions.length} Transaksi Direkodkan`;
    
    if (netBalance < 0) {
        txtBalance.style.color = 'var(--color-expense)';
    } else {
        txtBalance.style.color = 'var(--text-main)';
    }
}

function renderTransactions(dataList) {
    tableBody.innerHTML = '';
    
    if (dataList.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    dataList.forEach(trx => {
        const tr = document.createElement('tr');
        
        const typeBadgeClass = trx.type === 'Income' ? 'badge badge-income' : 'badge badge-expense';
        const amountClass = trx.type === 'Income' ? 'amt-income' : 'amt-expense';
        const amountPrefix = trx.type === 'Income' ? '+' : '-';
        
        const dateObj = new Date(trx.date);
        const formattedDate = !isNaN(dateObj) ? dateObj.toLocaleDateString('ms-MY') : trx.date;

        // Sekiranya ada rujukan fail gambar resit, wujudkan butang ikon imej di sebelah teks tujuan
        const receiptButtonMarkup = trx.receipt 
            ? `<button class="btn-icon btn-view-receipt" onclick="openReceipt('${trx.id}')" title="Lihat Bukti Resit"><i data-lucide="image"></i></button>`
            : '';

        tr.innerHTML = `
            <td><strong>${trx.id}</strong></td>
            <td>${formattedDate}</td>
            <td><span class="badge-category">${trx.category}</span></td>
            <td>${escapeHTML(trx.reason)} ${receiptButtonMarkup}</td>
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
    
    lucide.createIcons();
}

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

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID,Tarikh,Kategori,Tujuan,Jenis,Amaun (RM)\r\n';

    transactions.forEach(t => {
        const cleanReason = t.reason.includes(',') ? `"${t.reason}"` : t.reason;
        const row = [t.id, t.date, t.category, cleanReason, t.type, t.amount.toFixed(2)].join(',');
        csvContent += row + '\r\n';
    });

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

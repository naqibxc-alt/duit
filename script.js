// --- STATE UTK SIMPAN DATA ---
let transactions = [];
let currentBase64Receipt = ""; // Menyimpan sementara string Base64 file resit yang sedang diupload

// --- INITIAL LOAD ---
window.onload = function() {
    // Set default tarikh hari ini pada borang
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    loadData();
    toggleFormStyle(); // Kemas kini gaya input radio semasa muat turun pertama
};

// --- LOAD DATA DARI LOCALSTORAGE ---
function loadData() {
    const storedData = localStorage.getItem('bendahari_transactions');
    if (storedData) {
        try {
            transactions = JSON.parse(storedData);
        } catch (e) {
            transactions = [];
            showToast("Gagal memuat turun data lama. Struktur rosak.", "danger");
        }
    } else {
        transactions = [];
    }
    updateSummary();
    renderTransactions();
}

// --- SAVE DATA KE LOCALSTORAGE ---
function saveData() {
    localStorage.setItem('bendahari_transactions', JSON.stringify(transactions));
    updateSummary();
    renderTransactions();
}

// --- HITUNG & KEMASKINI SUMMARY DASHBOARD ---
function updateSummary() {
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach(t => {
        const amt = parseFloat(t.amount) || 0;
        if (t.type === 'Income') {
            totalIncome += amt;
        } else if (t.type === 'Expense') {
            totalExpense += amt;
        }
    });

    const balance = totalIncome - totalExpense;
    const totalCount = transactions.length;

    // Papar pada dashboard interface
    document.getElementById('txtBalance').innerText = `RM ${balance.toFixed(2)}`;
    document.getElementById('txtTotalIncome').innerText = `RM ${totalIncome.toFixed(2)}`;
    document.getElementById('txtTotalExpense').innerText = `RM ${totalExpense.toFixed(2)}`;
    document.getElementById('txtTotalCount').innerText = totalCount;

    // Ubah warna Baki Semasa mengikut nilai positif / negatif
    const balanceElement = document.getElementById('txtBalance');
    if (balance < 0) {
        balanceElement.className = "summary-amount text-danger";
    } else if (balance > 0) {
        balanceElement.className = "summary-amount text-success";
    } else {
        balanceElement.className = "summary-amount";
    }
}

// --- HANDLE FILE UPLOAD & CONVERT TO BASE64 ---
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Limit saiz fail ke 2MB untuk mengelakkan localStorage cepat penuh
    if (file.size > 2 * 1024 * 1024) {
        showToast("Fail terlalu besar! Had maksimum adalah 2MB.", "danger");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        // Simpan rentetan base64 lengkap beserta prefix data URI
        currentBase64Receipt = e.target.result;
        
        // Papar indikator preview fail sedia digunakan
        const previewCont = document.getElementById('receiptPreviewContainer');
        previewCont.className = "preview-container";
        previewCont.innerHTML = `<span class="preview-label">📄 Fail sedia (${file.name})</span>
                                 <button type="button" class="btn btn-sm btn-danger-outline" style="min-height:28px; padding:2px 8px;" onclick="clearReceiptFile()">Padam</button>`;
    };
    reader.readAsDataURL(file);
}

// Padam fail yang dipilih dalam borang
function clearReceiptFile() {
    document.getElementById('receipt').value = "";
    currentBase64Receipt = "";
    document.getElementById('receiptPreviewContainer').className = "preview-container hidden";
}

// --- DYNAMIC FORM SYLING BERDASARKAN JENIS (INCOME/EXPENSE) ---
function toggleFormStyle() {
    const selectedType = document.querySelector('input[name="type"]:checked').value;
    const btnSubmit = document.getElementById('btnSubmit');
    
    if (selectedType === 'Income') {
        btnSubmit.style.backgroundColor = "var(--success-color)";
    } else {
        btnSubmit.style.backgroundColor = "var(--danger-color)";
    }
}

// --- HANDLE SUBMIT FORM (ADD / EDIT) ---
function handleFormSubmit(event) {
    event.preventDefault();

    const id = document.getElementById('transactionId').value;
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const notes = document.getElementById('notes').value.trim();

    if (!amount || !date || !category || !notes) {
        showToast("Sila lengkapkan semua ruangan wajib.", "danger");
        return;
    }

    if (id === "") {
        // MODE: TAMBAH TRANSAKSI BARU
        const newTransaction = {
            id: 'id_' + Date.now() + Math.random().toString(36).substr(2, 5),
            type,
            amount,
            date,
            category,
            notes,
            receipt: currentBase64Receipt // Jika kosong, bermakna tiada resit dimasukkan
        };
        transactions.push(newTransaction);
        showToast("Transaksi Berjaya Direkodkan!", "success");
    } else {
        // MODE: EDIT TRANSAKSI SEDIA ADA
        const index = transactions.findIndex(t => t.id === id);
        if (index !== -1) {
            transactions[index].type = type;
            transactions[index].amount = amount;
            transactions[index].date = date;
            transactions[index].category = category;
            transactions[index].notes = notes;
            
            // Jika pengguna menukar atau memuat naik fail baru, gantikan. 
            // Jika tidak, kekalkan fail resit yang lama.
            if (currentBase64Receipt !== "") {
                transactions[index].receipt = currentBase64Receipt;
            }
            showToast("Transaksi Berjaya Dikemaskini!", "success");
        }
    }

    saveData();
    clearForm();
}

// --- RENDER TRANSACTIONS (DESKTOP TABLE & MOBILE CARDS) ---
function renderTransactions() {
    const searchVal = document.getElementById('searchBar').value.toLowerCase();
    const filterType = document.getElementById('filterType').value;
    const sortOrder = document.getElementById('sortOrder').value;

    const desktopBody = document.getElementById('desktopTransactionList');
    const mobileContainer = document.getElementById('mobileTransactionList');
    const emptyState = document.getElementById('emptyState');

    // Tapis Data
    let filtered = transactions.filter(t => {
        const matchSearch = t.notes.toLowerCase().includes(searchVal) || t.category.toLowerCase().includes(searchVal);
        const matchType = (filterType === 'All') || (t.type === filterType);
        return matchSearch && matchType;
    });

    // Susun Data (Sorting)
    filtered.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    // Bersihkan paparan sedia ada
    desktopBody.innerHTML = "";
    mobileContainer.innerHTML = "";

    if (filtered.length === 0) {
        emptyState.className = "empty-state";
        return;
    } else {
        emptyState.className = "empty-state hidden";
    }

    // Bina UI rows & cards secara dinamik
    filtered.forEach(t => {
        // Format tarikh untuk kemasan paparan tempatan (Contoh: 15/10/2025)
        const dateObj = new Date(t.date);
        const formattedDate = isNaN(dateObj) ? t.date : dateObj.toLocaleDateString('ms-MY');

        const badgeClass = t.type === 'Income' ? 'badge-income' : 'badge-expense';
        const amountClass = t.type === 'Income' ? 'text-success' : 'text-danger';
        const sign = t.type === 'Income' ? '+' : '-';

        // Penyediaan Button Thumbnail / Ikon Dokumen Resit
        let receiptHtml = `<span class="thumbnail-receipt" style="opacity: 0.3; cursor: not-allowed;" title="Tiada Bukti">❌</span>`;
        if (t.receipt && t.receipt.trim() !== "") {
            if (t.receipt.startsWith("data:application/pdf")) {
                receiptHtml = `<div class="thumbnail-receipt" onclick="viewReceipt('${t.id}')" title="Lihat PDF">📄</div>`;
            } else {
                receiptHtml = `<img src="${t.receipt}" class="thumbnail-receipt" onclick="viewReceipt('${t.id}')" alt="Resit" title="Lihat Gambar">`;
            }
        }

        // 1. Suntik ke Tabel Desktop
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td><strong>${t.category}</strong></td>
            <td>${t.notes}</td>
            <td><span class="badge ${badgeClass}">${t.type}</span></td>
            <td class="${amountClass} font-bold" style="font-weight:600;">${sign}RM ${parseFloat(t.amount).toFixed(2)}</td>
            <td>${receiptHtml}</td>
            <td>
                <div class="btn-group-actions">
                    <button class="btn btn-outline btn-sm" onclick="editTransaction('${t.id}')">✏️ Edit</button>
                    <button class="btn btn-danger-outline btn-sm" onclick="deleteTransaction('${t.id}')">🗑️</button>
                </div>
            </td>
        `;
        desktopBody.appendChild(tr);

        // 2. Suntik ke Senarai Kad Telefon Pintar (Mobile)
        const mobileCard = document.createElement('div');
        mobileCard.className = "mobile-trans-card";
        mobileCard.innerHTML = `
            <div class="mobile-card-top">
                <div>
                    <div class="mobile-card-date">${formattedDate}</div>
                    <div class="mobile-card-cat">${t.category}</div>
                </div>
                <div class="mobile-card-amt ${amountClass}" style="font-weight:700;">
                    ${sign}RM ${parseFloat(t.amount).toFixed(2)}
                </div>
            </div>
            <div class="mobile-card-notes">${t.notes}</div>
            <div class="mobile-card-bottom">
                <div>
                    <span style="font-size: 0.75rem; color: var(--text-light); display:block;">Bukti Fail:</span>
                    ${receiptHtml}
                </div>
                <div class="mobile-actions">
                    <button class="btn btn-outline btn-sm" onclick="editTransaction('${t.id}')">✏️ Edit</button>
                    <button class="btn btn-danger-outline btn-sm" onclick="deleteTransaction('${t.id}')">🗑️ Hapus</button>
                </div>
            </div>
        `;
        mobileContainer.appendChild(mobileCard);
    });
}

// --- POPULATE DATA TRANSAKSI KE FORM UNTUK EDIT ---
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    // Tukar tajuk borang dan aktifkan butang batal
    document.getElementById('formTitle').innerText = "Kemaskini Rekod";
    document.getElementById('btnCancelEdit').className = "btn btn-outline btn-block";
    document.getElementById('btnSubmit').innerText = "Simpan Perubahan";

    // Set nilai form elements mengikut data sedia ada
    document.getElementById('transactionId').value = transaction.id;
    
    // Set Radio Button Jenis
    const radios = document.getElementsByName('type');
    for (let i = 0; i < radios.length; i++) {
        if (radios[i].value === transaction.type) {
            radios[i].checked = true;
            break;
        }
    }
    
    document.getElementById('amount').value = transaction.amount;
    document.getElementById('date').value = transaction.date;
    document.getElementById('category').value = transaction.category;
    document.getElementById('notes').value = transaction.notes;

    // Reset base64 global untuk edit. 
    currentBase64Receipt = ""; 

    // Urus info preview dokumen jika ada fail sedia ada
    const previewCont = document.getElementById('receiptPreviewContainer');
    if (transaction.receipt && transaction.receipt.trim() !== "") {
        previewCont.className = "preview-container";
        const isPdf = transaction.receipt.startsWith("data:application/pdf");
        previewCont.innerHTML = `<span class="preview-label">📂 Mempunyai dokumen bukti lama (${isPdf ? 'PDF' : 'Imej'})</span>
                                 <button type="button" class="btn btn-sm btn-outline" style="min-height:28px; padding:2px 8px;" onclick="viewReceipt('${transaction.id}')">Lihat</button>`;
    } else {
        previewCont.className = "preview-container hidden";
    }

    toggleFormStyle();
    
    // Fokus skrol kembali ke atas borang untuk memudahkan pengguna telefon
    document.getElementById('formTitle').scrollIntoView({ behavior: 'smooth' });
}

// --- PADAM TRANSAKSI ---
function deleteTransaction(id) {
    const confirmDelete = confirm("Adakah anda pasti mahu memadamkan rekod transaksi ini?");
    if (confirmDelete) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        showToast("Rekod transaksi berjaya dipadamkan.", "success");
        
        // Sekiranya transaksi yang sedang diedit itu dipadamkan, bersihkan borang
        if (document.getElementById('transactionId').value === id) {
            clearForm();
        }
    }
}

// --- CLEAR / CLEARING FORM STATE ---
function clearForm() {
    document.getElementById('formTitle').innerText = "Tambah Transaksi";
    document.getElementById('btnCancelEdit').className = "btn btn-outline btn-block hidden";
    document.getElementById('btnSubmit').innerText = "Simpan Transaksi";

    document.getElementById('transactionId').value = "";
    document.getElementById('amount').value = "";
    document.getElementById('notes').value = "";
    document.getElementById('category').value = "";
    document.getElementById('receipt').value = "";
    
    // Set balik tarikh hari ini
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    
    // Set default Radio button semula ke 'Income'
    document.getElementsByName('type')[0].checked = true;
    
    currentBase64Receipt = "";
    document.getElementById('receiptPreviewContainer').className = "preview-container hidden";
    
    toggleFormStyle();
}

// --- VIEW RECEIPT FULLSCREEN POPUP MODAL ---
function viewReceipt(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction || !transaction.receipt) {
        showToast("Tiada dokumen atau fail resit disertakan.", "danger");
        return;
    }

    const modal = document.getElementById('receiptModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = ""; // Kosongkan modal dahulu

    // Semak format fail sama ada PDF atau Data Imej Base64 biasa
    if (transaction.receipt.startsWith("data:application/pdf")) {
        const iframe = document.createElement('iframe');
        iframe.src = transaction.receipt;
        modalBody.appendChild(iframe);
    } else {
        const img = document.createElement('img');
        img.src = transaction.receipt;
        img.alt = "Bukti Dokumen Kewangan";
        modalBody.appendChild(img);
    }

    modal.className = "modal"; // Tunjukkan modal
}

function closeModal(event) {
    // Tutup hanya jika pengguna klik butang pangkah atau klik luar kawasan modal-content
    if (event.target.id === 'receiptModal' || event.target.className === 'modal-close') {
        document.getElementById('receiptModal').className = "modal hidden";
    }
}

// --- EXPORT DATA SEBAGAI FAIL CSV ---
function exportCSV() {
    if (transactions.length === 0) {
        showToast("Tiada data rekod untuk diexport.", "danger");
        return;
    }

    // Bina struktur baris demi baris CSV dengan BOM suapan untuk sokongan Microsoft Excel (tulisan khas/RM)
    let csvContent = "\uFEFF"; 
    csvContent += "ID,Tarikh,Jenis,Kategori,Sebab Catatan,Jumlah (RM)\n";

    transactions.forEach(t => {
        // Bersihkan sebarang koma atau tanda petik di dalam teks catatan bagi mengelakkan kerosakan format CSV
        const cleanNotes = t.notes.replace(/"/g, '""');
        const cleanCategory = t.category.replace(/"/g, '""');
        
        csvContent += `"${t.id}","${t.date}","${t.type}","${cleanCategory}","${cleanNotes}","${parseFloat(t.amount).toFixed(2)}"\n`;
    });

    // Cipta objek Blob muat turun fail maya browser
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Laporan_Kewangan_Bendahari_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("Fail CSV berjaya dijana dan dimuat turun!", "success");
}

// --- RESET DATA KESELURUHAN ---
function resetData() {
    const doubleConfirm = confirm("PERINGATAN KRITIKAL:\nAdakah anda pasti untuk padam SEMUA data transaksi dan resit? Tindakan ini tidak boleh dikembalikan.");
    if (doubleConfirm) {
        transactions = [];
        localStorage.removeItem('bendahari_transactions');
        clearForm();
        updateSummary();
        renderTransactions();
        showToast("Sistem berjaya dikosongkan sepenuhnya.", "success");
    }
}

// --- SISTEM TOAST NOTIFICATION DYNAMIC ---
function showToast(message, status = "success") {
    const toast = document.getElementById('toastNotification');
    toast.innerText = message;
    
    // Tukar warna mengikut status maklum balas
    if (status === "success") {
        toast.style.backgroundColor = "#2ecc71";
    } else {
        toast.style.backgroundColor = "#e74c3c";
    }
    
    toast.className = "toast"; // Tampilkan toast

    // Sembunyikan secara automatik selepas 3.5 saat
    setTimeout(() => {
        toast.className = "toast hidden";
    }, 3500);
}

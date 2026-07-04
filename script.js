// --- STATE UTK SIMPAN DATA ---
let transactions = [];
let currentReceiptLink = ""; // Menyimpan nilai pautan input secara sementara

// --- INITIAL LOAD ---
window.onload = function() {
    // Set default tarikh hari ini pada borang
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;

    loadData();
    toggleFormStyle(); // Kemas kini gaya butang simpan di awal aplikasi
};

// --- LOAD DATA DARI LOCALSTORAGE ---
function loadData() {
    const storedData = localStorage.getItem('bendahari_transactions');
    if (storedData) {
        try {
            transactions = JSON.parse(storedData);
        } catch (e) {
            transactions = [];
            showToast("Gagal memuat turun data. Struktur fail rosak.", "danger");
        }
    } else {
        transactions = [];
    }
    updateSummary();
    renderTransactions();
}

// --- SAVE DATA KE LOCALSTORAGE ---
function saveData() {
    try {
        localStorage.setItem('bendahari_transactions', JSON.stringify(transactions));
        updateSummary();
        renderTransactions();
    } catch (e) {
        console.error("Storan gagal disimpan:", e);
        alert("⚠️ Gagal menyimpan data ke dalam browser!");
    }
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

    // Ubah warna teks Baki Semasa mengikut baki positif/negatif
    const balanceElement = document.getElementById('txtBalance');
    if (balance < 0) {
        balanceElement.className = "summary-amount text-danger";
    } else if (balance > 0) {
        balanceElement.className = "summary-amount text-success";
    } else {
        balanceElement.className = "summary-amount";
    }
}

// --- HANDLE INPUT PAUTAN LINK ---
function handleLinkInput(event) {
    const linkVal = event.target.value.trim();
    currentReceiptLink = linkVal;
    
    const previewCont = document.getElementById('receiptPreviewContainer');
    if (linkVal !== "") {
        previewCont.className = "preview-container";
        previewCont.innerHTML = `<span class="preview-label">🔗 Pautan dikesan & sedia disimpan.</span>`;
    } else {
        previewCont.className = "preview-container hidden";
    }
}

// --- DYNAMIC FORM STYLING BERDASARKAN JENIS (INCOME/EXPENSE) ---
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
    const inputLink = document.getElementById('receiptLink').value.trim();

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
            receipt: inputLink // Menyimpan URL teks (Google Drive dll)
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
            transactions[index].receipt = inputLink;
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

    // Bina UI secara dinamik
    filtered.forEach(t => {
        const dateObj = new Date(t.date);
        const formattedDate = isNaN(dateObj) ? t.date : dateObj.toLocaleDateString('ms-MY');

        const badgeClass = t.type === 'Income' ? 'badge-income' : 'badge-expense';
        const amountClass = t.type === 'Income' ? 'text-success' : 'text-danger';
        const sign = t.type === 'Income' ? '+' : '-';

        // Penyediaan Ikon/Pautan Resit
        let receiptHtml = `<span class="thumbnail-receipt disabled" title="Tiada Bukti">❌</span>`;
        if (t.receipt && t.receipt.trim() !== "") {
            receiptHtml = `<button class="thumbnail-receipt" onclick="viewReceipt('${t.id}')" title="Buka Pautan Bukti">🔗</button>`;
        }

        // 1. Suntik ke Tabel Desktop
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formattedDate}</td>
            <td><strong>${t.category}</strong></td>
            <td>${t.notes}</td>
            <td><span class="badge ${badgeClass}">${t.type}</span></td>
            <td class="${amountClass}" style="font-weight:600;">${sign}RM ${parseFloat(t.amount).toFixed(2)}</td>
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
                    <span style="font-size: 0.75rem; color: var(--text-light); display:block; margin-bottom:2px;">Resit:</span>
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

    // Tukar tajuk borang dan urus aktif butang batal
    document.getElementById('formTitle').innerText = "Kemaskini Rekod";
    document.getElementById('btnCancelEdit').className = "btn btn-outline btn-block";
    document.getElementById('btnSubmit').innerText = "Simpan Perubahan";

    // Set nilai form elements mengikut data sedia ada
    document.getElementById('transactionId').value = transaction.id;
    
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
    document.getElementById('receiptLink').value = transaction.receipt || "";

    // Kemaskini kawasan informasi pautan sedia ada
    const previewCont = document.getElementById('receiptPreviewContainer');
    if (transaction.receipt && transaction.receipt.trim() !== "") {
        previewCont.className = "preview-container";
        previewCont.innerHTML = `<span class="preview-label">🔗 Mempunyai pautan resit disimpan.</span>
                                 <button type="button" class="btn btn-sm btn-outline" style="min-height:28px; padding:2px 8px;" onclick="viewReceipt('${transaction.id}')">Buka Link</button>`;
    } else {
        previewCont.className = "preview-container hidden";
    }

    toggleFormStyle();
    
    // Skrol automatik ke atas borang (bagus untuk kegunaan peranti telefon)
    document.getElementById('formTitle').scrollIntoView({ behavior: 'smooth' });
}

// --- PADAM TRANSAKSI ---
function deleteTransaction(id) {
    const confirmDelete = confirm("Adakah anda pasti mahu memadamkan rekod transaksi ini?");
    if (confirmDelete) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        showToast("Rekod transaksi berjaya dipadamkan.", "success");
        
        if (document.getElementById('transactionId').value === id) {
            clearForm();
        }
    }
}

// --- BERSIHKAN SEMULA BORANG (RESET FORM STATE) ---
function clearForm() {
    document.getElementById('formTitle').innerText = "Tambah Transaksi";
    document.getElementById('btnCancelEdit').className = "btn btn-outline btn-block hidden";
    document.getElementById('btnSubmit').innerText = "Simpan Transaksi";

    document.getElementById('transactionId').value = "";
    document.getElementById('amount').value = "";
    document.getElementById('notes').value = "";
    document.getElementById('category').value = "";
    document.getElementById('receiptLink').value = "";
    
    // Kembalikan tarikh kepada hari ini
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    document.getElementsByName('type')[0].checked = true;
    
    currentReceiptLink = "";
    document.getElementById('receiptPreviewContainer').className = "preview-container hidden";
    
    toggleFormStyle();
}

// --- BUKA PAUTAN RESIT (VIEW LINK) ---
function viewReceipt(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction || !transaction.receipt || transaction.receipt.trim() === "") {
        showToast("Tiada pautan dokumen atau resit untuk transaksi ini.", "danger");
        return;
    }
    
    // Buka pautan luar (Google Drive/Dropbox) di tab baru pelayar web
    window.open(transaction.receipt, '_blank');
}

// --- EXPORT DATA SEBAGAI FAIL CSV ---
function exportCSV() {
    if (transactions.length === 0) {
        showToast("Tiada data rekod untuk diexport.", "danger");
        return;
    }

    // Bina struktur baris demi baris CSV beserta BOM suapan khas untuk sokongan Microsoft Excel (Simbol RM/Tulisan Khas)
    let csvContent = "\uFEFF"; 
    csvContent += "ID,Tarikh,Jenis,Kategori,Sebab Catatan,Pautan Resit,Jumlah (RM)\n";

    transactions.forEach(t => {
        const cleanNotes = t.notes.replace(/"/g, '""');
        const cleanCategory = t.category.replace(/"/g, '""');
        const cleanLink = (t.receipt || "").replace(/"/g, '""');
        
        csvContent += `"${t.id}","${t.date}","${t.type}","${cleanCategory}","${cleanNotes}","${cleanLink}","${parseFloat(t.amount).toFixed(2)}"\n`;
    });

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
    const doubleConfirm = confirm("PERINGATAN UTAMA:\nAdakah anda pasti untuk padam SEMUA data transaksi dalam sistem? Tindakan ini tidak boleh dikembalikan.");
    if (doubleConfirm) {
        transactions = [];
        localStorage.removeItem('bendahari_transactions');
        clearForm();
        updateSummary();
        renderTransactions();
        showToast("Sistem berjaya dikosongkan sepenuhnya.", "success");
    }
}

// --- SISTEM TOAST NOTIFICATION ---
function showToast(message, status = "success") {
    const toast = document.getElementById('toastNotification');
    toast.innerText = message;
    
    if (status === "success") {
        toast.style.backgroundColor = "#2ecc71";
    } else {
        toast.style.backgroundColor = "#e74c3c";
    }
    
    toast.className = "toast";

    setTimeout(() => {
        toast.className = "toast hidden";
    }, 3500);
}

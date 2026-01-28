// DATA STORAGE
// =======================
let incomeHistory = JSON.parse(localStorage.getItem('coffee_income_history')) || [];
let totalIncome = parseFloat(localStorage.getItem('coffee_income_total')) || 0;
let transactionHistory = JSON.parse(localStorage.getItem('coffee_history')) || [];
let currentUserRole = "admin";

// =======================
// LOGIN & ROLE SETUP
// =======================
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;

    if (email === "owner@coffee.com" && pass === "admin123") {
        currentUserRole = "admin";
         localStorage.setItem('coffee_user_role', 'admin');
        initSystem("Administrator");
    } else if (email === "sale@coffee.com" && pass === "sale123") {
        currentUserRole = "sale";
         localStorage.setItem('coffee_user_role', 'sale');
        initSystem("Sale Person");
    } else {
        alert("Invalid credentials!");
    }
});

function initSystem(roleName) {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('dashboard-section').classList.remove('hidden');
    document.getElementById('sidebar-nav').classList.remove('hidden');
    document.getElementById('user-display').innerText = `Logged in as ${roleName}`;
    document.getElementById('role-text').innerText = roleName;
    if(document.querySelector('.overlay')) document.querySelector('.overlay').style.display = 'none';

    setupPermissions();
    updateUI();

    // Handle deep linking
if (window.location.hash) {
    const sectionId = window.location.hash.substring(1);
    const section = document.getElementById(sectionId);
    if (section) {
        showSection(sectionId);
    }
}
}

function logout() {
    localStorage.removeItem('coffee_user_role');
    location.reload();
}
// Auto-login check
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'logout') {
        localStorage.removeItem('coffee_user_role');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    const savedRole = localStorage.getItem('coffee_user_role');
    if (savedRole === 'admin') {
        currentUserRole = 'admin';
        initSystem('Administrator');
    } else if (savedRole === 'sale') {
        currentUserRole = 'sale';
        initSystem('Sale Person');
    }
});



function setupPermissions() {
    const isSale = currentUserRole === "sale";
    
    // UI Label Adjustments
    document.getElementById('report-link-text').innerText = isSale ? "Submit Report" : "Reports";
    document.getElementById('dash-title').innerText = isSale ? "Sales Entry Portal" : "Admin Dashboard";
    
    // Hide Admin-only features
    if (document.getElementById('balance-card')) {
        isSale ? document.getElementById('balance-card').classList.add('hidden') : document.getElementById('balance-card').classList.remove('hidden');
    }
    
    // Master Delete Buttons visibility
    const masterDelExp = document.getElementById('master-del-btn');
    const masterDelInc = document.getElementById('master-del-income-btn');
    if (masterDelExp) isSale ? masterDelExp.classList.add('hidden') : masterDelExp.classList.remove('hidden');
    if (masterDelInc) isSale ? masterDelInc.classList.add('hidden') : masterDelInc.classList.remove('hidden');

    // Report Content Setup
    const reportArea = document.getElementById('report-content-area');
    if (isSale) {
        reportArea.innerHTML = `
            <h2><i class="fas fa-paper-plane"></i> Submit Daily Report</h2>
            <p style="color:#666; margin-bottom:20px;">Review all entries before sending to the Administrator.</p>
            <div class="stat-box" style="background:#f8f9fa; padding:20px; border-radius:15px; margin-bottom:20px;">
                <h4 style="margin:0">Total Records Today</h4>
                <p style="font-size:24px; font-weight:bold; color:#3e2723;" id="sale-count-view">0</p>
            </div>
            <button class="btn-action btn-save" onclick="submitReport()" style="width:100%; padding:20px;">SEND REPORT TO ADMIN</button>
        `;
    } else {
        reportArea.innerHTML = `
            <h2>Financial Insights</h2>
            <div class="stats-row" style="display:flex; gap:20px; margin-top:20px;">
                <div class="stat-box" style="flex:1; border:1px solid #eee; padding:20px; border-radius:15px;">
                    <h4>Total Transactions</h4><p id="report-count" style="font-size:24px; font-weight:bold;">0</p>
                </div>
                <div class="stat-box" style="flex:1; border:1px solid #eee; padding:20px; border-radius:15px;">
                    <h4>Avg Expense</h4><p id="report-avg" style="font-size:24px; font-weight:bold;">$0</p>
                </div>
            </div>
        `;
    }
}

function showSection(id) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active-section'));
    document.getElementById(id).classList.add('active-section');
}

// =======================
// EXPENSE FUNCTIONS
// =======================
function addNewRow() {
    const tbody = document.getElementById('input-rows');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="text-align:center"><input type="checkbox" class="row-checkbox"></td>
        <td><input type="text" class="row-desc" placeholder="Item Name" required></td>
        <td><select class="row-cat"><option>Supplies</option><option>Wages</option><option>Utilities</option></select></td>
        <td><input type="date" class="row-date" required></td>
        <td><input type="text" class="row-payer" placeholder="Name"></td>
        <td><input type="number" class="row-amt" placeholder="0.00" step="0.01" required></td>
    `;
    tbody.appendChild(tr);
}

function saveFromPage(event) {
    event.preventDefault();
    const rows = document.querySelectorAll('#input-rows tr');
    let count = 0;
    rows.forEach(row => {
        const desc = row.querySelector('.row-desc').value;
        const cat = row.querySelector('.row-cat').value;
        const date = row.querySelector('.row-date').value;
        const payer = row.querySelector('.row-payer').value;
        const amt = parseFloat(row.querySelector('.row-amt').value);
        if (desc && date && amt > 0) {
            transactionHistory.unshift({ desc, cat, date, payer, amt });
            count++;
        }
    });
    if (count > 0) {
        localStorage.setItem('coffee_history', JSON.stringify(transactionHistory));
        updateUI();
        alert("Expense Records Saved!");
        document.getElementById('input-rows').innerHTML = "";
    }
}

function deleteHistoryItem(index) {
    if (currentUserRole !== "admin") return alert("Only Admin can delete!");
    if (confirm("Delete this expense entry?")) {
        transactionHistory.splice(index, 1);
        localStorage.setItem('coffee_history', JSON.stringify(transactionHistory));
        updateUI();
    }
}
/*
function deleteSelectedRows() {
    if (currentUserRole !== "admin") return;
    const historyChecked = document.querySelectorAll('#history-rows-manage .row-checkbox:checked');
    if (historyChecked.length > 0) {
        if (confirm(`Delete ${historyChecked.length} records?`)) {
            const indexes = Array.from(historyChecked).map(cb => parseInt(cb.dataset.index));
            indexes.sort((a,b) => b-a).forEach(idx => transactionHistory.splice(idx, 1));
            localStorage.setItem('coffee_history', JSON.stringify(transactionHistory));
            updateUI();
        }
    }
}*/
function deleteSelectedRows() {
    // 1. Handle Saved History (Database)
    const historyChecked = document.querySelectorAll('#history-rows-manage .row-checkbox:checked');
    if (historyChecked.length > 0 && confirm(`Delete ${historyChecked.length} saved records?`)) {
        const indexes = Array.from(historyChecked).map(cb => parseInt(cb.dataset.index));
        indexes.sort((a,b) => b-a).forEach(idx => transactionHistory.splice(idx, 1));
        localStorage.setItem('coffee_history', JSON.stringify(transactionHistory));
    }

    // 2. Handle New Input Rows (Screen UI)
    const inputChecked = document.querySelectorAll('#input-rows .row-checkbox:checked');
    inputChecked.forEach(cb => cb.closest('tr').remove());

    updateUI(); // Refresh everything
}
function toggleSelectAll(source) {
    document.querySelectorAll('#history-rows-manage .row-checkbox').forEach(cb => cb.checked = source.checked);
}

// =======================
// INCOME FUNCTIONS
// =======================
function addNewIncomeRow() {
    const tbody = document.getElementById('income-input-rows');
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td style="text-align:center"><input type="checkbox" class="income-row-checkbox"></td>
        <td><input type="text" class="income-desc" placeholder="Income Description" required></td>
        <td><select class="income-source"><option>Sales</option><option>Service</option><option>Other</option></select></td>
        <td><input type="date" class="income-date" required></td>
        <td><input type="text" class="income-receiver" placeholder="Received By"></td>
        <td><input type="number" class="income-amt" step="0.01" placeholder="0.00" required></td>
    `;
    tbody.appendChild(tr);
}

function saveIncomeFromPage(event) {
    event.preventDefault();
    const rows = document.querySelectorAll('#income-input-rows tr');
    let count = 0;
    rows.forEach(row => {
        const desc = row.querySelector('.income-desc').value;
        const source = row.querySelector('.income-source').value;
        const date = row.querySelector('.income-date').value;
        const receiver = row.querySelector('.income-receiver').value;
        const amt = parseFloat(row.querySelector('.income-amt').value);

        if (desc && date && amt > 0) {
            incomeHistory.unshift({ desc, source, date, receiver, amt });
            count++;
        }
    });

    if (count > 0) {
        localStorage.setItem('coffee_income_history', JSON.stringify(incomeHistory));
        updateUI();
        alert("Income Records Saved!");
        document.getElementById('income-input-rows').innerHTML = "";
    }
}

function deleteIncomeItem(index) {
    if (currentUserRole !== "admin") return alert("Only Admin can delete!");
    if (confirm("Delete this income entry?")) {
        incomeHistory.splice(index, 1);
        localStorage.setItem('coffee_income_history', JSON.stringify(incomeHistory));
        updateUI();
    }
}
/*
function deleteSelectedIncomeRows() {
    if (currentUserRole !== "admin") return;
    const historyChecked = document.querySelectorAll('#income-history-rows .income-row-checkbox:checked');
    if (historyChecked.length > 0) {
        if (confirm(`Delete ${historyChecked.length} income records?`)) {
            const indexes = Array.from(historyChecked).map(cb => parseInt(cb.dataset.index));
            indexes.sort((a,b) => b-a).forEach(idx => incomeHistory.splice(idx, 1));
            localStorage.setItem('coffee_income_history', JSON.stringify(incomeHistory));
            updateUI();
        }
    }
}*/
function deleteSelectedIncomeRows() {
    // 1. Handle Saved History (Database)
    const historyChecked = document.querySelectorAll('#income-history-rows .income-row-checkbox:checked');
    if (historyChecked.length > 0 && confirm(`Delete ${historyChecked.length} saved income records?`)) {
        const indexes = Array.from(historyChecked).map(cb => parseInt(cb.dataset.index));
        indexes.sort((a,b) => b-a).forEach(idx => incomeHistory.splice(idx, 1));
        localStorage.setItem('coffee_income_history', JSON.stringify(incomeHistory));
    }

    // 2. Handle New Input Rows (Screen UI)
    const inputChecked = document.querySelectorAll('#income-input-rows .income-row-checkbox:checked');
    inputChecked.forEach(cb => cb.closest('tr').remove());

    updateUI(); // Refresh everything
}
function toggleSelectAllIncome(source) {
    document.querySelectorAll('#income-history-rows .income-row-checkbox').forEach(cb => cb.checked = source.checked);
}

// =======================
// REPORT FUNCTIONS
// =======================
function submitReport() {
    alert("SUCCESS: Today's report has been submitted to Administrator.");
    showSection('dashboard');
}

// =======================
// UPDATE UI FUNCTION
// =======================
function updateUI() {
    // ====== Expenses Processing ======
    let exTotal = 0;
    let dashExpHTML = "";
    let manageExpHTML = "";
    
    transactionHistory.forEach((item, idx) => {
        exTotal += item.amt;
        dashExpHTML += `<tr><td>${item.desc}</td><td>${item.cat}</td><td>${item.date}</td><td>${item.payer}</td><td style="color:red">-$${item.amt.toLocaleString()}</td></tr>`;
        manageExpHTML += `
            <tr>
                <td style="text-align:center"><input type="checkbox" class="row-checkbox" data-index="${idx}"></td>
                <td>${item.desc}</td><td>${item.cat}</td><td>${item.date}</td><td>${item.payer}</td>
                <td style="color:red">-$${item.amt.toLocaleString()}</td>
                <td>${currentUserRole === 'admin' ? `<button class="delete-icon-btn" onclick="deleteHistoryItem(${idx})"><i class="fas fa-trash"></i></button>` : `<i class="fas fa-lock" style="color:#ccc"></i>`}</td>
            </tr>
        `;
    });

    // ====== Income Processing ======
    let currentIncomeTotal = 0;
    let incomeHTML = "";
    
    incomeHistory.forEach((item, idx) => {
        currentIncomeTotal += item.amt;
        incomeHTML += `
            <tr>
                <td style="text-align:center"><input type="checkbox" class="income-row-checkbox" data-index="${idx}"></td>
                <td>${item.desc}</td><td>${item.source}</td><td>${item.date}</td><td>${item.receiver}</td>
                <td style="color:green">+$${item.amt.toLocaleString()}</td>
                <td>${currentUserRole === 'admin' ? `<button class="delete-icon-btn" onclick="deleteIncomeItem(${idx})"><i class="fas fa-trash"> </i></button>` : `<i class="fas fa-lock" style="color:#ccc"></i>`}</td>
            </tr>
        `;
    });

    // Update global total and storage
    totalIncome = currentIncomeTotal;
    localStorage.setItem('coffee_income_total', totalIncome);

    // ====== Update Cards ======
    document.getElementById('card-income').innerText = `$${totalIncome.toLocaleString()}`;
    document.getElementById('card-total').innerText = `$${exTotal.toLocaleString()}`;
    document.getElementById('card-remaining').innerText = `$${(totalIncome - exTotal).toLocaleString()}`;

    // ====== Update Tables ======
    document.getElementById('expense-rows').innerHTML = dashExpHTML;
    document.getElementById('history-rows-manage').innerHTML = manageExpHTML;
    document.getElementById('income-history-rows').innerHTML = incomeHTML;

    // ====== Update Reports / Stats ======
    if (currentUserRole === 'admin') {
        const reportCount = document.getElementById('report-count');
        const reportAvg = document.getElementById('report-avg');
        if(reportCount) reportCount.innerText = transactionHistory.length + incomeHistory.length;
        if(reportAvg) reportAvg.innerText = `$${(exTotal / (transactionHistory.length || 1)).toFixed(2)}`;
    } else {
        const saleCount = document.getElementById('sale-count-view');
        if(saleCount) saleCount.innerText = transactionHistory.length + incomeHistory.length;
    }
}

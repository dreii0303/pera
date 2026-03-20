document.addEventListener("DOMContentLoaded", function () {
    // Helper to safely get element
    const el = (id) => document.getElementById(id);

    // --- REGISTRATION & LOGIN LOGIC ---
    const loginEmail = el("loginEmail"), 
          loginPassword = el("loginPassword"),
          loginEmailError = el("loginEmailError");

    const validateEmail = (field, errorField) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isValid = regex.test(field.value.trim());
        if (errorField) errorField.textContent = isValid ? "" : "Enter a valid email address.";
        return isValid;
    };

    const regForm = el("registerForm");
    if (regForm) {
        regForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const successMessage = el("successMessage");
            if (successMessage) successMessage.textContent = "Registration successful! Redirecting...";
            setTimeout(() => { window.location.href = "index.html"; }, 1500);
        });
    }

    const loginForm = el("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            if (validateEmail(loginEmail, loginEmailError)) {
                window.location.href = "home.html";
            }
        });
    }

    // --- DATA PERSISTENCE HELPERS ---
    const saveData = (key, data) => {
        const existingData = JSON.parse(localStorage.getItem(key)) || [];
        existingData.push(data);
        localStorage.setItem(key, JSON.stringify(existingData));
    };

    // --- EXPENSE & INCOME RECORDING LOGIC ---
    const expenseForm = el("expenseForm");
    if (expenseForm) {
        expenseForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const amount = el("expAmount").value;
            const category = el("expCategory").value;
            const date = el("expDate").value;

            if (amount && category && date) {
                const newExpense = { amount, category, date, type: 'expense' };
                saveData("transactions", newExpense);
                alert("Expense saved successfully!");
                expenseForm.reset();
                updateFinancialSummary();
            }
        });
    }

    const incomeForm = el("incomeForm");
    if (incomeForm) {
        incomeForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const source = el("incSource").value;
            const amount = el("incAmount").value;
            const date = new Date().toISOString().split('T')[0];

            if (source && amount) {
                const newIncome = { source, amount, type: 'income', date: date, category: 'Income' };
                saveData("transactions", newIncome);
                alert("Income added successfully!");
                incomeForm.reset();
                updateFinancialSummary();
            }
        });
    }

    // --- BANK MANAGEMENT LOGIC ---
    const bankList = el("bankList");
    const bankForm = el("bankForm");

    window.renderBanks = () => {
        if (!bankList) return;
        const accounts = JSON.parse(localStorage.getItem("bankAccounts")) || [];
        
        const addBtnHTML = `
            <div class="add-account-card" onclick="openBankModal()" style="cursor:pointer; border: 2px dashed rgba(255,255,255,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 16px; min-height: 220px;">
                <div style="font-size: 2.5rem; color: #4db8ff;">+</div>
                <h3 style="color: #4db8ff;">ADD ACCOUNT</h3>
            </div>`;
        
        bankList.innerHTML = accounts.map((acc, index) => `
            <div class="bank-card">
                <div>
                    <div class="chip"></div>
                    <h3 style="font-size: 0.8rem; opacity: 0.7;">Account Name</h3>
                    <div class="bank-name" style="font-size: 1.2rem; font-weight: bold;">${acc.name}</div>
                </div>
                <div>
                    <h3 style="font-size: 0.8rem; opacity: 0.7;">Current Balance</h3>
                    <div class="amount" style="font-family: monospace; font-size: 1.5rem;">₱${parseFloat(acc.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                    <button class="delete-bank-btn" onclick="deleteBank(${index})" style="margin-top: 15px; background: rgba(248, 113, 113, 0.2); color: #f87171; border: 1px solid #f87171; padding: 5px 10px; border-radius: 4px; cursor: pointer;">REMOVE</button>
                </div>
            </div>
        `).join('') + addBtnHTML;
    };

    if (bankForm) {
        bankForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = el("bankName").value;
            const balance = el("bankBalance").value;

            if (name && balance) {
                const accounts = JSON.parse(localStorage.getItem("bankAccounts")) || [];
                accounts.push({ name, balance: parseFloat(balance) });
                localStorage.setItem("bankAccounts", JSON.stringify(accounts));
                bankForm.reset();
                if (typeof closeBankModal === "function") closeBankModal();
                renderBanks();
                updateFinancialSummary();
            }
        });
    }

    window.deleteBank = (index) => {
        if (confirm("Delete this account?")) {
            const accounts = JSON.parse(localStorage.getItem("bankAccounts")) || [];
            accounts.splice(index, 1);
            localStorage.setItem("bankAccounts", JSON.stringify(accounts));
            renderBanks();
            updateFinancialSummary();
        }
    };

    window.openBankModal = () => { el("bankModal").style.display = "flex"; };
    window.closeBankModal = () => { el("bankModal").style.display = "none"; };

    // --- RECURRING PAYMENTS LOGIC ---
    const recurringForm = el("recurringForm");
    const recurringList = el("recurringList");
    const recurringTotalDisplay = el("recurringTotal");

    // NEW: Engine to check and deduct due monthly payments
    window.processRecurringPayments = () => {
        const recurring = JSON.parse(localStorage.getItem("recurringPayments")) || [];
        const today = new Date();
        const currentMonthYear = `${today.getMonth()}-${today.getFullYear()}`;
        let updated = false;

        recurring.forEach(item => {
            const billingDay = new Date(item.date).getDate();
            
            // Deduct if: Today is past the billing day AND it hasn't been deducted this month
            if (today.getDate() >= billingDay && item.lastDeducted !== currentMonthYear) {
                
                // Create transaction
                const autoTransaction = { 
                    amount: item.amount, 
                    category: `Auto-Pay: ${item.name}`, 
                    date: today.toISOString().split('T')[0], 
                    type: 'expense' 
                };
                saveData("transactions", autoTransaction);

                // Update deduction flag
                item.lastDeducted = currentMonthYear;
                updated = true;
            }
        });

        if (updated) {
            localStorage.setItem("recurringPayments", JSON.stringify(recurring));
            updateFinancialSummary();
        }
    };

    window.renderRecurring = () => {
        const recurring = JSON.parse(localStorage.getItem("recurringPayments")) || [];
        let totalMonthly = 0;

        if (recurringList) {
            recurringList.innerHTML = recurring.map((item, index) => {
                const amount = parseFloat(item.amount);
                totalMonthly += amount;
                
                const billingDateObj = new Date(item.date);
                const day = billingDateObj.getDate();

                return `
                    <div class="card" style="border-left: 5px solid #4db8ff;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                            <h3 style="margin-bottom: 0; color: white;">${item.name}</h3>
                            <span style="padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; background: rgba(77, 184, 255, 0.2); color: #4db8ff; font-weight: bold;">Monthly</span>
                        </div>
                        <div class="amount" style="color: white;">₱${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        <p style="color: rgba(255,255,255,0.6); margin-top: 10px; font-size: 0.9rem;">📅 Charges on day ${day} of every month</p>
                        <button onclick="deleteRecurring(${index})" style="background: rgba(248, 113, 113, 0.1); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.2); padding: 8px; border-radius: 8px; cursor: pointer; font-size: 0.8rem; margin-top: 20px; width: 100%;">Remove Subscription</button>
                    </div>
                `;
            }).join('') || '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: rgba(255,255,255,0.2);">No subscriptions added yet.</div>';
        }

        if (recurringTotalDisplay) {
            recurringTotalDisplay.textContent = `₱${totalMonthly.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        }
    };

    if (recurringForm) {
        recurringForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = el("recName").value;
            const amount = el("recAmount").value;
            const date = el("recDate").value;

            if (name && amount && date) {
                const recurring = JSON.parse(localStorage.getItem("recurringPayments")) || [];
                
                // Save new sub with null lastDeducted so it checks immediately
                recurring.push({ 
                    name, 
                    amount: parseFloat(amount), 
                    date, 
                    lastDeducted: null 
                });
                
                localStorage.setItem("recurringPayments", JSON.stringify(recurring));
                recurringForm.reset();
                
                processRecurringPayments();
                renderRecurring();
            }
        });
    }

    window.deleteRecurring = (index) => {
        if (confirm("Stop this monthly subscription?")) {
            const recurring = JSON.parse(localStorage.getItem("recurringPayments")) || [];
            recurring.splice(index, 1);
            localStorage.setItem("recurringPayments", JSON.stringify(recurring));
            renderRecurring();
            updateFinancialSummary();
        }
    };

    // --- FINANCIAL SUMMARY DISPLAY LOGIC ---
    window.updateFinancialSummary = () => {
        const tableBody = el("transactionTableBody");
        const balanceDisplay = el("totalBalance");
        const incomeDisplay = el("totalIncome");
        const expenseDisplay = el("totalExpense");

        const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
        const accounts = JSON.parse(localStorage.getItem("bankAccounts")) || [];
        
        let bankTotal = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
        let incomeTotal = 0;
        let expenseTotal = 0;
        let transactionNet = 0;
        
        if (tableBody) tableBody.innerHTML = ""; 

        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        transactions.forEach(txn => {
            const isIncome = txn.type === "income";
            const amountNum = parseFloat(txn.amount);
            if (isIncome) { incomeTotal += amountNum; transactionNet += amountNum; }
            else { expenseTotal += amountNum; transactionNet -= amountNum; }

            if (tableBody) {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${txn.date}</td>
                    <td>${isIncome ? txn.source : txn.category}</td>
                    <td>${isIncome ? 'Income' : 'Expense'}</td>
                    <td style="color: ${isIncome ? '#059669' : '#f87171'}; font-weight: bold;">
                        ${isIncome ? '+' : '-'} ₱${amountNum.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </td>
                `;
                tableBody.appendChild(row);
            }
        });

        const totalOverall = bankTotal + transactionNet;

        if (balanceDisplay) {
            balanceDisplay.textContent = `₱${totalOverall.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
            balanceDisplay.style.color = totalOverall >= 0 ? "#4ade80" : "#f87171";
        }
        if (incomeDisplay) incomeDisplay.textContent = `₱${incomeTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        if (expenseDisplay) expenseDisplay.textContent = `₱${expenseTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    };

    // --- PASSWORD TOGGLE LOGIC ---
    const setupToggle = (inputId, toggleId) => {
        const input = el(inputId);
        const toggle = el(toggleId);
        if (input && toggle) {
            toggle.addEventListener("click", () => {
                const isPassword = input.type === "password";
                input.type = isPassword ? "text" : "password";
                toggle.textContent = isPassword ? "Hide" : "Show";
            });
        }
    };

    setupToggle("password", "togglePass");
    setupToggle("confirmPassword", "toggleConfirm");
    setupToggle("loginPassword", "toggleLoginPass");

    window.clearHistory = () => {
        if (confirm("Clear all data?")) {
            localStorage.clear();
            location.reload();
        }
    };

    window.logout = () => { window.location.href = "index.html"; };

    // Initial Runs
    renderBanks();
    processRecurringPayments(); // Checks for due bills immediately on load
    renderRecurring();
    updateFinancialSummary();


    // Add this helper inside your DOMContentLoaded function in web.js
window.updateDashboard = () => {
    const transactions = JSON.parse(localStorage.getItem("transactions")) || [];
    const accounts = JSON.parse(localStorage.getItem("bankAccounts")) || [];
    const recurring = JSON.parse(localStorage.getItem("recurringPayments")) || [];
    
    // Calculate Totals
    let bankTotal = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0);
    let incomeTotal = 0;
    let expenseTotal = 0;
    let netChange = 0;

    // Filter transactions for current month (optional, but better for dashboards)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    transactions.forEach(txn => {
        const txnDate = new Date(txn.date);
        const amount = parseFloat(txn.amount);
        
        if (txn.type === "income") {
            incomeTotal += amount;
            netChange += amount;
        } else {
            expenseTotal += amount;
            netChange -= amount;
        }
    });

    // Inject into Dashboard Card IDs
    if(document.getElementById("dashTotalBalance")) {
        document.getElementById("dashTotalBalance").textContent = `₱${(bankTotal + netChange).toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    }
    if(document.getElementById("dashTotalIncome")) {
        document.getElementById("dashTotalIncome").textContent = `₱${incomeTotal.toLocaleString()}`;
    }
    if(document.getElementById("dashTotalExpense")) {
        document.getElementById("dashTotalExpense").textContent = `₱${expenseTotal.toLocaleString()}`;
    }
    if(document.getElementById("dashRecurringCount")) {
        document.getElementById("dashRecurringCount").textContent = recurring.length;
    }

    // Inject Recent 5 Transactions
    const tableBody = document.getElementById("dashTransactionTable");
    if (tableBody) {
        tableBody.innerHTML = "";
        const recent = transactions.sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        
        recent.forEach(txn => {
            const row = document.createElement("tr");
            const isIncome = txn.type === "income";
            row.innerHTML = `
                <td>${txn.date}</td>
                <td>${isIncome ? txn.source : txn.category}</td>
                <td><span class="badge ${txn.type}">${txn.type.toUpperCase()}</span></td>
                <td style="color: ${isIncome ? '#4ade80' : '#f87171'}; font-weight:bold;">
                    ${isIncome ? '+' : '-'} ₱${parseFloat(txn.amount).toLocaleString()}
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
};


updateDashboard();

});


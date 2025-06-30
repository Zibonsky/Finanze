// Personal Finance App - JavaScript
class FinanceApp {
    constructor() {
        this.transactions = [];
        this.currentFilter = 'all';
        this.charts = {};
        this.transactionIdCounter = 1;
        
        this.init();
    }

    init() {
        this.loadTransactions();
        this.bindEvents();
        this.setTodayDate();
        this.updateDisplay();
        this.initCharts();
    }

    // Data Management
    loadTransactions() {
        try {
            const stored = localStorage.getItem('financeTransactions');
            if (stored) {
                this.transactions = JSON.parse(stored);
                // Ensure counter is higher than existing IDs
                const maxId = Math.max(...this.transactions.map(t => parseInt(t.id) || 0), 0);
                this.transactionIdCounter = maxId + 1;
            }
        } catch (error) {
            console.error('Errore nel caricamento dei dati:', error);
            this.transactions = [];
        }
    }

    saveTransactions() {
        try {
            localStorage.setItem('financeTransactions', JSON.stringify(this.transactions));
        } catch (error) {
            console.error('Errore nel salvataggio dei dati:', error);
            this.showToast('Errore nel salvataggio dei dati', 'error');
        }
    }

    // Event Binding
    bindEvents() {
        // Form submission
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Type selection
        document.querySelectorAll('input[name="type"]').forEach(radio => {
            radio.addEventListener('change', this.toggleCategoryField.bind(this));
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setFilter(e.target.dataset.period);
            });
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', this.exportToCSV.bind(this));

        // Modal events
        document.getElementById('cancelDelete').addEventListener('click', this.hideDeleteModal.bind(this));
        document.getElementById('confirmDelete').addEventListener('click', this.confirmDelete.bind(this));
        document.getElementById('deleteModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteModal') {
                this.hideDeleteModal();
            }
        });
    }

    // Form Handling
    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    toggleCategoryField() {
        const type = document.querySelector('input[name="type"]:checked').value;
        const categoryGroup = document.getElementById('categoryGroup');
        const categorySelect = document.getElementById('category');
        
        if (type === 'spesa') {
            categoryGroup.style.display = 'block';
            categorySelect.required = true;
        } else {
            categoryGroup.style.display = 'none';
            categorySelect.required = false;
            categorySelect.value = '';
        }
    }

    addTransaction() {
        const type = document.querySelector('input[name="type"]:checked').value;
        const category = type === 'spesa' ? document.getElementById('category').value : null;
        const amountInput = document.getElementById('amount').value;
        const date = document.getElementById('date').value;

        // Improved validation
        const amount = parseFloat(amountInput);
        
        if (!amountInput || isNaN(amount) || amount <= 0) {
            this.showToast('Inserisci un importo valido maggiore di zero', 'error');
            return;
        }

        if (type === 'spesa' && (!category || category.trim() === '')) {
            this.showToast('Seleziona una categoria per la spesa', 'error');
            return;
        }

        if (!date) {
            this.showToast('Inserisci una data valida', 'error');
            return;
        }

        // Create transaction
        const transaction = {
            id: this.transactionIdCounter++,
            tipo: type,
            categoria: category,
            data: date,
            importo: amount,
            timestamp: new Date().toISOString()
        };

        this.transactions.push(transaction);
        this.saveTransactions();
        this.updateDisplay();
        this.updateCharts();
        
        // Reset form
        document.getElementById('transactionForm').reset();
        this.setTodayDate();
        this.toggleCategoryField();
        
        this.showToast('Transazione aggiunta con successo!', 'success');
    }

    deleteTransaction(id) {
        this.pendingDeleteId = id;
        this.showDeleteModal();
    }

    confirmDelete() {
        if (this.pendingDeleteId) {
            this.transactions = this.transactions.filter(t => t.id !== this.pendingDeleteId);
            this.saveTransactions();
            this.updateDisplay();
            this.updateCharts();
            this.showToast('Transazione eliminata', 'info');
        }
        this.hideDeleteModal();
    }

    // Filter Management
    setFilter(period) {
        this.currentFilter = period;
        
        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-period="${period}"]`).classList.add('active');
        
        this.updateDisplay();
        this.updateCharts();
    }

    getFilteredTransactions() {
        const now = new Date();
        const transactions = [...this.transactions];
        
        switch (this.currentFilter) {
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                weekStart.setHours(0, 0, 0, 0);
                return transactions.filter(t => new Date(t.data) >= weekStart);
                
            case 'month':
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                return transactions.filter(t => new Date(t.data) >= monthStart);
                
            case '30days':
                const thirtyDaysAgo = new Date(now);
                thirtyDaysAgo.setDate(now.getDate() - 30);
                return transactions.filter(t => new Date(t.data) >= thirtyDaysAgo);
                
            default:
                return transactions;
        }
    }

    // Display Updates
    updateDisplay() {
        this.updateSummary();
        this.updateTransactionsList();
        this.updateStats();
    }

    updateSummary() {
        const filtered = this.getFilteredTransactions();
        const income = filtered.filter(t => t.tipo === 'guadagno').reduce((sum, t) => sum + t.importo, 0);
        const expenses = filtered.filter(t => t.tipo === 'spesa').reduce((sum, t) => sum + t.importo, 0);
        const balance = income - expenses;

        document.getElementById('totalIncome').textContent = this.formatCurrency(income);
        document.getElementById('totalExpenses').textContent = this.formatCurrency(expenses);
        document.getElementById('balance').textContent = this.formatCurrency(balance);
        
        // Update balance color
        const balanceElement = document.getElementById('balance');
        balanceElement.classList.toggle('negative', balance < 0);
    }

    updateTransactionsList() {
        const listContainer = document.getElementById('transactionsList');
        const filtered = this.getFilteredTransactions();
        const recent = filtered.slice(-10).reverse(); // Last 10, most recent first
        
        if (recent.length === 0) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <p>Nessuna transazione nel periodo selezionato.</p>
                    <p>Inizia aggiungendo la tua prima transazione! 👆</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = recent.map(transaction => `
            <div class="transaction-item fade-in">
                <div class="transaction-details">
                    <div class="transaction-type transaction-type--${transaction.tipo}">
                        ${transaction.tipo === 'guadagno' ? '📈' : '📉'} ${transaction.tipo.charAt(0).toUpperCase() + transaction.tipo.slice(1)}
                    </div>
                    ${transaction.categoria ? `<div class="transaction-category">${this.getCategoryIcon(transaction.categoria)} ${transaction.categoria}</div>` : ''}
                    <div class="transaction-date">${this.formatDate(transaction.data)}</div>
                </div>
                <div class="transaction-amount transaction-amount--${transaction.tipo}">
                    ${transaction.tipo === 'guadagno' ? '+' : '-'}${this.formatCurrency(transaction.importo)}
                </div>
                <div class="transaction-actions">
                    <button class="btn-delete" onclick="app.deleteTransaction(${transaction.id})">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        const filtered = this.getFilteredTransactions();
        const totalTransactions = filtered.length;
        
        if (totalTransactions === 0) {
            document.getElementById('statsInfo').textContent = 'Nessuna transazione';
            return;
        }

        const expenses = filtered.filter(t => t.tipo === 'spesa');
        const avgDaily = expenses.length > 0 ? expenses.reduce((sum, t) => sum + t.importo, 0) / 30 : 0;
        
        let topCategory = 'Nessuna';
        if (expenses.length > 0) {
            const categoryTotals = {};
            expenses.forEach(t => {
                categoryTotals[t.categoria] = (categoryTotals[t.categoria] || 0) + t.importo;
            });
            topCategory = Object.keys(categoryTotals).reduce((a, b) => 
                categoryTotals[a] > categoryTotals[b] ? a : b
            );
        }

        document.getElementById('statsInfo').textContent = 
            `${totalTransactions} transazioni • Spesa media: ${this.formatCurrency(avgDaily)}/giorno • Top categoria: ${topCategory}`;
    }

    // Charts
    initCharts() {
        this.initExpenseChart();
        this.initComparisonChart();
        this.initTrendChart();
    }

    initExpenseChart() {
        const ctx = document.getElementById('expenseChart').getContext('2d');
        this.charts.expense = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5', '#5D878F', '#DB4545', '#D2BA4C']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.raw;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${this.formatCurrency(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    initComparisonChart() {
        const ctx = document.getElementById('comparisonChart').getContext('2d');
        this.charts.comparison = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Guadagni', 'Spese'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#10b981', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.label}: ${this.formatCurrency(context.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    initTrendChart() {
        const ctx = document.getElementById('trendChart').getContext('2d');
        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Guadagni',
                        data: [],
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Spese',
                        data: [],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${this.formatCurrency(context.raw)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    updateCharts() {
        this.updateExpenseChart();
        this.updateComparisonChart();
        this.updateTrendChart();
    }

    updateExpenseChart() {
        const filtered = this.getFilteredTransactions();
        const expenses = filtered.filter(t => t.tipo === 'spesa');
        
        const categoryTotals = {};
        expenses.forEach(t => {
            categoryTotals[t.categoria] = (categoryTotals[t.categoria] || 0) + t.importo;
        });

        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        this.charts.expense.data.labels = labels;
        this.charts.expense.data.datasets[0].data = data;
        this.charts.expense.update();
    }

    updateComparisonChart() {
        const filtered = this.getFilteredTransactions();
        const income = filtered.filter(t => t.tipo === 'guadagno').reduce((sum, t) => sum + t.importo, 0);
        const expenses = filtered.filter(t => t.tipo === 'spesa').reduce((sum, t) => sum + t.importo, 0);

        this.charts.comparison.data.datasets[0].data = [income, expenses];
        this.charts.comparison.update();
    }

    updateTrendChart() {
        const filtered = this.getFilteredTransactions();
        const last30Days = this.getLast30Days();
        
        const dailyIncome = {};
        const dailyExpenses = {};
        
        // Initialize all days with 0
        last30Days.forEach(date => {
            dailyIncome[date] = 0;
            dailyExpenses[date] = 0;
        });

        // Aggregate transactions by day
        filtered.forEach(t => {
            const date = t.data;
            if (last30Days.includes(date)) {
                if (t.tipo === 'guadagno') {
                    dailyIncome[date] += t.importo;
                } else {
                    dailyExpenses[date] += t.importo;
                }
            }
        });

        const labels = last30Days.map(date => this.formatShortDate(date));
        const incomeData = last30Days.map(date => dailyIncome[date]);
        const expenseData = last30Days.map(date => dailyExpenses[date]);

        this.charts.trend.data.labels = labels;
        this.charts.trend.data.datasets[0].data = incomeData;
        this.charts.trend.data.datasets[1].data = expenseData;
        this.charts.trend.update();
    }

    // Utility Functions
    formatCurrency(amount) {
        return new Intl.NumberFormat('it-IT', {
            style: 'currency',
            currency: 'EUR'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatShortDate(dateString) {
        return new Date(dateString).toLocaleDateString('it-IT', {
            month: 'short',
            day: 'numeric'
        });
    }

    getCategoryIcon(category) {
        const icons = {
            'Casa': '🏠',
            'Trasporti': '🚗',
            'Cibo': '🍽️',
            'Divertimento': '🎉',
            'Salute': '🏥',
            'Shopping': '🛍️',
            'Altro': '📋'
        };
        return icons[category] || '📋';
    }

    getLast30Days() {
        const days = [];
        const today = new Date();
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            days.push(date.toISOString().split('T')[0]);
        }
        
        return days;
    }

    // Modal Management
    showDeleteModal() {
        document.getElementById('deleteModal').classList.add('show');
    }

    hideDeleteModal() {
        document.getElementById('deleteModal').classList.remove('show');
        this.pendingDeleteId = null;
    }

    // Toast Notifications
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast toast--${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Export Functionality
    exportToCSV() {
        const filtered = this.getFilteredTransactions();
        if (filtered.length === 0) {
            this.showToast('Nessuna transazione da esportare', 'error');
            return;
        }

        const headers = ['Data', 'Tipo', 'Categoria', 'Importo'];
        const rows = filtered.map(t => [
            t.data,
            t.tipo,
            t.categoria || '',
            t.importo
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `transazioni_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showToast('Esportazione completata!', 'success');
        }
    }
}

// Initialize the app
const app = new FinanceApp();
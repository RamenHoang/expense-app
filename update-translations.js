const fs = require('fs');
const path = require('path');

// Mapping of English text to translation keys
const translations = {
  // Navigation
  'Dashboard': 'navigation.dashboard',
  'Transactions': 'navigation.transactions',
  'Budgets': 'navigation.budgets',
  'Settings': 'navigation.settings',
  
  // Common
  'Save': 'common.save',
  'Cancel': 'common.cancel',
  'Delete': 'common.delete',
  'Edit': 'common.edit',
  'Add': 'common.add',
  'Confirm': 'common.confirm',
  'Close': 'common.close',
  'Select': 'common.select',
  'Search': 'common.search',
  'Filter': 'common.filter',
  'All': 'common.all',
  'Loading...': 'common.loading',
  'Apply': 'common.apply',
  'Reset': 'common.reset',
  
  // Dashboard
  'Total Balance': 'dashboard.totalBalance',
  'Income': 'dashboard.income',
  'Expense': 'dashboard.expense',
  'Recent Transactions': 'dashboard.recentTransactions',
  'View All': 'dashboard.viewAll',
  'Budget Overview': 'dashboard.budgetOverview',
  'Spending by Category': 'dashboard.spendingByCategory',
  'No budgets': 'dashboard.noBudgets',
  'No transactions': 'dashboard.noTransactions',
  'Month': 'dashboard.month',
  'Year': 'dashboard.year',
  'Custom': 'dashboard.custom',
  'Select Date Range': 'dashboard.selectDateRange',
  'From': 'dashboard.from',
  'To': 'dashboard.to',
  'Spent': 'dashboard.spent',
  'Remaining': 'dashboard.remaining',
  
  // Transactions
  'Add Transaction': 'transactions.addTransaction',
  'Edit Transaction': 'transactions.editTransaction',
  'Delete Transaction': 'transactions.deleteTransaction',
  'Amount': 'transactions.amount',
  'Category': 'transactions.category',
  'Date': 'transactions.date',
  'Description': 'transactions.description',
  'Type': 'transactions.type',
  'Select Category': 'transactions.selectCategory',
  'Enter amount': 'transactions.enterAmount',
  'Enter description': 'transactions.enterDescription',
  'No transactions': 'transactions.noTransactions',
  'Transaction added': 'transactions.transactionAdded',
  'Transaction updated': 'transactions.transactionUpdated',
  'Transaction deleted': 'transactions.transactionDeleted',
  
  // Budgets
  'Add Budget': 'budgets.addBudget',
  'Edit Budget': 'budgets.editBudget',
  'Delete Budget': 'budgets.deleteBudget',
  'Select Period': 'budgets.selectPeriod',
  'Monthly': 'budgets.monthly',
  'Yearly': 'budgets.yearly',
  'Weekly': 'budgets.weekly',
  'No budgets': 'budgets.noBudgets',
  
  // Categories
  'Manage Categories': 'categories.manageCategories',
  'Add Category': 'categories.addCategory',
  'Edit Category': 'categories.editCategory',
  'Delete Category': 'categories.deleteCategory',
  'Name': 'categories.name',
  'Icon': 'categories.icon',
  'Color': 'categories.color',
  
  // Settings
  'Profile': 'settings.profile',
  'Currency': 'settings.currency',
  'Language': 'settings.language',
  'Notifications': 'settings.notifications',
  'Security': 'settings.security',
  'About': 'settings.about',
  'Logout': 'settings.logout',
  'Select Currency': 'settings.selectCurrency',
  
  // Auth
  'Login': 'auth.login',
  'Register': 'auth.register',
  'Email': 'auth.email',
  'Password': 'auth.password',
  'Sign In': 'auth.signIn',
  'Sign Up': 'auth.signUp',
  'Forgot Password?': 'auth.forgotPassword',
  'Don\'t have an account?': 'auth.noAccount',
  'Already have an account?': 'auth.hasAccount',
};

console.log('Translation update script ready.');
console.log('This is a template. Manual updates recommended for accuracy.');


import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL || "https://salon-pos-production.up.railway.app";

const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Auth
  login: (data) =>
  axios.post(`${BASE_URL}/api/auth/login`, data),

  getMe: () =>
    axios.get(`${BASE_URL}/api/auth/me`, { headers: getAuthHeader() }),

  // Dashboard
  getDashboardStats: () =>
    axios.get(`${BASE_URL}/api/dashboard/stats`, { headers: getAuthHeader() }),

  getRevenueChart: () =>
    axios.get(`${BASE_URL}/api/dashboard/revenue-chart`, { headers: getAuthHeader() }),

  getRecentBookings: () =>
    axios.get(`${BASE_URL}/api/dashboard/recent-bookings`, { headers: getAuthHeader() }),

  getRecentTransactions: () =>
    axios.get(`${BASE_URL}/api/dashboard/recent-transactions`, { headers: getAuthHeader() }),

  // Customers
  getCustomers: () =>
    axios.get(`${BASE_URL}/api/customers`, { headers: getAuthHeader() }),

  createCustomer: (data) =>
    axios.post(`${BASE_URL}/api/customers`, data, { headers: getAuthHeader() }),

  updateCustomer: (id, data) =>
    axios.put(`${BASE_URL}/api/customers/${id}`, data, { headers: getAuthHeader() }),

  deleteCustomer: (id) =>
    axios.delete(`${BASE_URL}/api/customers/${id}`, { headers: getAuthHeader() }),

  // Services
  getServices: () =>
    axios.get(`${BASE_URL}/api/services`, { headers: getAuthHeader() }),

  createService: (data) =>
    axios.post(`${BASE_URL}/api/services`, data, { headers: getAuthHeader() }),

  updateService: (id, data) =>
    axios.put(`${BASE_URL}/api/services/${id}`, data, { headers: getAuthHeader() }),

  deleteService: (id) =>
    axios.delete(`${BASE_URL}/api/services/${id}`, { headers: getAuthHeader() }),

  // Products
  getProducts: () =>
    axios.get(`${BASE_URL}/api/products`, { headers: getAuthHeader() }),

  createProduct: (data) =>
    axios.post(`${BASE_URL}/api/products`, data, { headers: getAuthHeader() }),

  updateProduct: (id, data) =>
    axios.put(`${BASE_URL}/api/products/${id}`, data, { headers: getAuthHeader() }),

  deleteProduct: (id) =>
    axios.delete(`${BASE_URL}/api/products/${id}`, { headers: getAuthHeader() }),

  // Stylists
  getStylists: () =>
    axios.get(`${BASE_URL}/api/stylists`, { headers: getAuthHeader() }),

  createStylist: (data) =>
    axios.post(`${BASE_URL}/api/stylists`, data, { headers: getAuthHeader() }),

  updateStylist: (id, data) =>
    axios.put(`${BASE_URL}/api/stylists/${id}`, data, { headers: getAuthHeader() }),

  deleteStylist: (id) =>
    axios.delete(`${BASE_URL}/api/stylists/${id}`, { headers: getAuthHeader() }),

  // Bookings
  getBookings: () =>
    axios.get(`${BASE_URL}/api/bookings`, { headers: getAuthHeader() }),

  createBooking: (data) =>
    axios.post(`${BASE_URL}/api/bookings`, data, { headers: getAuthHeader() }),

  updateBooking: (id, data) =>
    axios.put(`${BASE_URL}/api/bookings/${id}`, data, { headers: getAuthHeader() }),

  deleteBooking: (id) =>
    axios.delete(`${BASE_URL}/api/bookings/${id}`, { headers: getAuthHeader() }),

  // Transactions
  getTransactions: () =>
    axios.get(`${BASE_URL}/api/transactions`, { headers: getAuthHeader() }),

  createTransaction: (data) =>
    axios.post(`${BASE_URL}/api/transactions`, data, { headers: getAuthHeader() }),

  // Settings
  getSettings: () =>
    axios.get(`${BASE_URL}/api/settings`, { headers: getAuthHeader() }),

  updateSettings: (data) =>
    axios.put(`${BASE_URL}/api/settings`, data, { headers: getAuthHeader() }),

  // Reports
  getTransactionReport: (startDate, endDate) =>
    axios.get(`${BASE_URL}/api/reports/transactions`, {
      params: { start_date: startDate, end_date: endDate },
      headers: getAuthHeader(),
    }),

  getStylistCommissionReport: (startDate, endDate) =>
    axios.get(`${BASE_URL}/api/reports/stylist-commission`, {
      params: { start_date: startDate, end_date: endDate },
      headers: getAuthHeader(),
    }),


  // Cash Expenses (Kas Kasir)
  getCashExpenses: (date) =>
    axios.get(`${BASE_URL}/api/cash-expenses`, {
      params: { date },
      headers: getAuthHeader(),
    }),

  createCashExpense: (data) =>
    axios.post(`${BASE_URL}/api/cash-expenses`, data, { headers: getAuthHeader() }),

  deleteCashExpense: (id) =>
    axios.delete(`${BASE_URL}/api/cash-expenses/${id}`, { headers: getAuthHeader() }),

  getCashExpenseReport: (startDate, endDate) =>
    axios.get(`${BASE_URL}/api/reports/cash-expenses`, {
      params: { start_date: startDate, end_date: endDate },
      headers: getAuthHeader(),
    }),

};

export default api;
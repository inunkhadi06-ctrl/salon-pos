import axios from 'axios';

const BACKEND_URL = "http://127.0.0.1:8000";
const API = `${BACKEND_URL}/api`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Dashboard
  getDashboardStats: () => axios.get(`${API}/dashboard/stats`, { headers: getAuthHeader() }),
  getRevenueChart: () => axios.get(`${API}/dashboard/revenue-chart`, { headers: getAuthHeader() }),
  getRecentBookings: () => axios.get(`${API}/dashboard/recent-bookings`, { headers: getAuthHeader() }),
  getRecentTransactions: () => axios.get(`${API}/dashboard/recent-transactions`, { headers: getAuthHeader() }),

  // Customers
  getCustomers: () => axios.get(`${API}/customers`, { headers: getAuthHeader() }),
  createCustomer: (data) => axios.post(`${API}/customers`, data, { headers: getAuthHeader() }),
  updateCustomer: (id, data) => axios.put(`${API}/customers/${id}`, data, { headers: getAuthHeader() }),
  deleteCustomer: (id) => axios.delete(`${API}/customers/${id}`, { headers: getAuthHeader() }),

  // Services
  getServices: () => axios.get(`${API}/services`, { headers: getAuthHeader() }),
  createService: (data) => axios.post(`${API}/services`, data, { headers: getAuthHeader() }),
  updateService: (id, data) => axios.put(`${API}/services/${id}`, data, { headers: getAuthHeader() }),
  deleteService: (id) => axios.delete(`${API}/services/${id}`, { headers: getAuthHeader() }),

  // Products
  getProducts: () => axios.get(`${API}/products`, { headers: getAuthHeader() }),
  createProduct: (data) => axios.post(`${API}/products`, data, { headers: getAuthHeader() }),
  updateProduct: (id, data) => axios.put(`${API}/products/${id}`, data, { headers: getAuthHeader() }),
  deleteProduct: (id) => axios.delete(`${API}/products/${id}`, { headers: getAuthHeader() }),

  // Stylists
  getStylists: () => axios.get(`${API}/stylists`, { headers: getAuthHeader() }),
  createStylist: (data) => axios.post(`${API}/stylists`, data, { headers: getAuthHeader() }),
  updateStylist: (id, data) => axios.put(`${API}/stylists/${id}`, data, { headers: getAuthHeader() }),
  deleteStylist: (id) => axios.delete(`${API}/stylists/${id}`, { headers: getAuthHeader() }),

  // Bookings
  getBookings: () => axios.get(`${API}/bookings`, { headers: getAuthHeader() }),
  createBooking: (data) => axios.post(`${API}/bookings`, data, { headers: getAuthHeader() }),
  updateBooking: (id, data) => axios.put(`${API}/bookings/${id}`, data, { headers: getAuthHeader() }),
  deleteBooking: (id) => axios.delete(`${API}/bookings/${id}`, { headers: getAuthHeader() }),

  // Transactions
  getTransactions: () => axios.get(`${API}/transactions`, { headers: getAuthHeader() }),
  createTransaction: (data) => axios.post(`${API}/transactions`, data, { headers: getAuthHeader() }),

  // Settings
  getSettings: () => axios.get(`${API}/settings`, { headers: getAuthHeader() }),
  updateSettings: (data) => axios.put(`${API}/settings`, data, { headers: getAuthHeader() }),

  // Reports
  getTransactionReport: (startDate, endDate) => 
    axios.get(`${API}/reports/transactions`, {
      params: { start_date: startDate, end_date: endDate },
      headers: getAuthHeader()
    }),
  getStylistCommissionReport: (startDate, endDate) => 
    axios.get(`${API}/reports/stylist-commission`, {
      params: { start_date: startDate, end_date: endDate },
      headers: getAuthHeader()
    }),
};

export default api;
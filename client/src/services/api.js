import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api', timeout: 15000 });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mssms_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use((response) => response.data, (error) => {
  if (error.response?.status === 401) window.dispatchEvent(new Event('mssms:unauthorized'));
  const message = error.response?.data?.error || error.message || 'Request failed';
  return Promise.reject(new Error(message));
});

export const stationsApi = {
  list: () => api.get('/stations'),
  create: (data) => api.post('/stations', data),
  update: (id, data) => api.put(`/stations/${id}`, data),
  readings: (id, params = {}) => api.get(`/stations/${id}/readings`, { params })
};
export const sensorsApi = { list: () => api.get('/sensors'), create: (data) => api.post('/sensors', data), calibrate: (id, data = {}) => api.put(`/sensors/${id}/calibrate`, data) };
export const maintenanceApi = { list: (params) => api.get('/maintenance', { params }), create: (data) => api.post('/maintenance', data) };
export const alertsApi = { list: (params) => api.get('/alerts', { params }), update: (id, data) => api.put(`/alerts/${id}`, data) };
export const readingsApi = { latest: (params) => api.get('/readings', { params }) };
export async function downloadReport(params = {}) {
  const response = await api.get('/reports/readings.csv', { params, responseType: 'blob' });
  const url = URL.createObjectURL(response);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'mssms-readings.csv'; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default api;

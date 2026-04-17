import axios from 'axios';

// Reads credentials stored at login time
const getAuthHeader = () => {
  const token = localStorage.getItem('tt_token');
  return token ? { Authorization: `Basic ${token}` } : {};
};

const api = axios.create({
  baseURL: 'http://localhost:8080',
});

api.interceptors.request.use((config) => {
  config.headers = {
    ...config.headers,
    ...getAuthHeader(),
  };
  return config;
});

export default api;

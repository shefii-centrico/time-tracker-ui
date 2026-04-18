import axios from 'axios';

const getAuthHeader = () => {
  const token = localStorage.getItem('tt_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
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

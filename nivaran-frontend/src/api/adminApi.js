import api from './axios';

export const loginAdmin = async (credentials) => {
  const response = await api.post('/admin/login', credentials);
  return response.data;
};

export const logoutAdmin = async () => {
  const response = await api.post('/admin/logout');
  return response.data;
};

export const getCurrentAdmin = async () => {
  const response = await api.get('/admin/me');
  return response.data;
};

export const getAdminDashboardStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const getAdminDepartments = async () => {
  const response = await api.get('/admin/departments');
  return response.data;
};

export const getAdminCitizens = async () => {
  const response = await api.get('/admin/citizens');
  return response.data;
};

export const getAdminAllGrievances = async () => {
  const response = await api.get('/admin/grievances');
  return response.data;
};

export const approveDepartment = async (id) => {
  const response = await api.patch(`/admin/departments/${id}/approve`);
  return response.data;
};

export const rejectDepartment = async (id) => {
  const response = await api.patch(`/admin/departments/${id}/reject`);
  return response.data;
};

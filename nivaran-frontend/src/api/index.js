import api from './axios'

// ----------------- AUTH --------------------------------------------

export const registerUser = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const loginUser = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const getCurrentCitizen = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const updateCitizenProfile = async (profileData) => {
  const response = await api.put('/auth/profile', profileData);
  return response.data;
};

export const changePasswordUser = async (passData) => {
  const response = await api.put('/auth/change-password', passData);
  return response.data;
};


// ----------------- GRIEVANCE ----------------------------------------

export const createGrievance = async (grievanceData) => {
  const response = await api.post('/grievances', grievanceData);
  return response.data;
};

export const getMyGrievances = async () => {
  const response = await api.get('/grievances/my');
  return response.data;
};

export const getGrievanceById = async (id) => {
  const response = await api.get(`/grievances/${id}`);
  return response.data;
};

export const getGrievanceTracking = async (id) => {
  const response = await api.get(`/grievances/${id}/tracking`);
  return response.data;
};

export const getMyGrievanceCount = async () => {
  const response = await api.get('/grievances/my/count');
  return response.data;
};

export const updateGrievance = async (id, grievanceData) => {
  const response = await api.put(`/grievances/${id}`, grievanceData);
  return response.data;
};

export const deleteGrievance = async (id) => {
  const response = await api.delete(`/grievances/${id}`);
  return response.data;
};


// ----------------- CITIZEN DASHBOARD -------------------------------

export const getCitizenDashboardStats = async () => {
  const response = await api.get('/citizen/dashboard/stats');
  return response.data;
};


// ----------------- ADMIN -------------------------------------------
export {
  loginAdmin,
  logoutAdmin,
  getCurrentAdmin,
  getAdminDashboardStats,
  getAdminDepartments,
  getAdminCitizens,
  getAdminAllGrievances,
  approveDepartment,
  rejectDepartment,
} from './adminApi';

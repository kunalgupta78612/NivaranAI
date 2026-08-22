import api from './axios'

// ----------------- DEPARTMENT AUTH -----------------------------------

export const registerDepartment = async (data) => {
  const response = await api.post('/department/register', data)
  return response.data
}

export const loginDepartment = async (credentials) => {
  const response = await api.post('/department/login', credentials)
  return response.data
}

export const logoutDepartment = async () => {
  const response = await api.post('/department/logout')
  return response.data
}

export const getDepartmentMe = async () => {
  const response = await api.get('/department/me')
  return response.data
}

export const changeDepartmentPassword = async (passData) => {
  const response = await api.put('/department/change-password', passData)
  return response.data
}

// ----------------- DEPARTMENT GRIEVANCES -----------------------------

export const getDepartmentGrievances = async () => {
  const response = await api.get('/department/grievances')
  return response.data
}

export const updateGrievanceStatusDept = async ({ id, status }) => {
  const response = await api.patch(`/department/grievances/${id}/status`, { status })
  return response.data
}

// ----------------- DEPARTMENT CITIZENS -------------------------------

export const getDepartmentCitizens = async () => {
  const response = await api.get('/department/citizens')
  return response.data
}

export const approveCitizenByDept = async (id) => {
  const response = await api.patch(`/department/citizens/${id}/approve`)
  return response.data
}

export const rejectCitizenByDept = async (id) => {
  const response = await api.patch(`/department/citizens/${id}/reject`)
  return response.data
}

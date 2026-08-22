import re

with open('src/pages/AuthPage.jsx', 'r', encoding='utf-8') as f:
    auth = f.read()

# Add useAdminLogin to imports
auth = auth.replace("import { useDepartmentRegister, useDepartmentLogin } from '../lib/departmentAuthApi'", "import { useDepartmentRegister, useDepartmentLogin } from '../lib/departmentAuthApi'\nimport { useAdminLogin } from '../lib/adminAuthApi'")

# Add adminLoginMutation inside AuthPage
auth = auth.replace("const deptLoginMutation = useDepartmentLogin()", "const deptLoginMutation = useDepartmentLogin()\n  const adminLoginMutation = useAdminLogin()\n  const [successMsg, setSuccessMsg] = useState(null)")

# Update personas definition for Admin
auth = auth.replace("admin: { name: 'Indore Municipal Corp.', detail: 'City Commissioner', route: '/admin', badge: 'Commissioner Persona' }", "admin: { name: 'Astha Admin', detail: 'Built-in System Admin (astha@gmail.com / 12345678)', route: '/admin', badge: 'System Admin Persona' }")

# Update quickLogin for admin
old_quick = """  function quickLogin(rKey) {
    setRole(rKey)
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      nav(personas[rKey].route)
    }, 500)
  }"""

new_quick = """  function quickLogin(rKey) {
    setRole(rKey)
    if (rKey === 'admin') {
      setFormData((p) => ({ ...p, email: 'astha@gmail.com', password: '12345678' }))
    } else if (rKey === 'officer') {
      setDeptFormData((p) => ({ ...p, email: 'pwd.indore@civic.gov.in', password: '12345678' }))
    } else {
      setFormData((p) => ({ ...p, email: 'astha.patel@indorecivic.gov.in', password: '12345678' }))
    }
  }"""

auth = auth.replace(old_quick, new_quick)

# Update handleSubmit
old_submit = """  async function handleSubmit(e) {
    e.preventDefault()
    setApiError(null)
    setLoading(true)

    try {
      if (role === 'officer') {
        // Department auth flow
        if (isSignup) {
          await deptRegisterMutation.mutateAsync(deptFormData)
          await deptLoginMutation.mutateAsync({
            email: deptFormData.email,
            password: deptFormData.password,
          })
        } else {
          await deptLoginMutation.mutateAsync({
            email: deptFormData.email,
            password: deptFormData.password,
          })
        }
        nav('/officer')
      } else {
        // Citizen auth flow
        if (isSignup && !validate()) { setLoading(false); return }
        if (isSignup) {
          await registerMutation.mutateAsync(formData)
          await loginMutation.mutateAsync({
            email: formData.email,
            password: formData.password,
          })
        } else {
          await loginMutation.mutateAsync({
            email: formData.email,
            password: formData.password,
          })
        }
        nav(personas[role].route)
      }
    } catch (err) {
      setApiError(err.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }"""

new_submit = """  async function handleSubmit(e) {
    e.preventDefault()
    setApiError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (role === 'admin') {
        // Built-in Admin Login
        await adminLoginMutation.mutateAsync({
          email: formData.email || 'astha@gmail.com',
          password: formData.password || '12345678',
        })
        nav('/admin')
      } else if (role === 'officer') {
        // Department Auth Flow
        if (isSignup) {
          await deptRegisterMutation.mutateAsync(deptFormData)
          setSuccessMsg('Department registration submitted! Your account is pending admin approval before you can sign in.')
          nav('/login')
        } else {
          await deptLoginMutation.mutateAsync({
            email: deptFormData.email,
            password: deptFormData.password,
          })
          nav('/officer')
        }
      } else {
        // Citizen Auth Flow
        if (isSignup && !validate()) { setLoading(false); return }
        if (isSignup) {
          await registerMutation.mutateAsync(formData)
          await loginMutation.mutateAsync({
            email: formData.email,
            password: formData.password,
          })
        } else {
          await loginMutation.mutateAsync({
            email: formData.email,
            password: formData.password,
          })
        }
        nav(personas[role].route)
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Something went wrong. Please try again."
      setApiError(msg)
    } finally {
      setLoading(false)
    }
  }"""

auth = auth.replace(old_submit, new_submit)

# Display successMsg if present
old_err_display = """              {/* API Error Display */}
              {apiError && ("""

new_err_display = """              {/* Success Feedback Display */}
              {successMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-extrabold text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* API Error Display */}
              {apiError && ("""

auth = auth.replace(old_err_display, new_err_display)

with open('src/pages/AuthPage.jsx', 'w', encoding='utf-8') as f:
    f.write(auth)
print('AuthPage.jsx successfully updated!')

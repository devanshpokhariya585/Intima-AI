import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('intimaai_user')
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const stored = localStorage.getItem('intimaai_users')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })

  const register = ({ fullName, email, password, role }) => {
    const exists = registeredUsers.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (exists) return { success: false, error: 'An account with this email already exists.' }

    const newUser = { id: Date.now(), fullName, email, password, role }
    const updated = [...registeredUsers, newUser]
    setRegisteredUsers(updated)
    localStorage.setItem('intimaai_users', JSON.stringify(updated))

    const sessionUser = { id: newUser.id, fullName, email, role }
    setUser(sessionUser)
    localStorage.setItem('intimaai_user', JSON.stringify(sessionUser))
    return { success: true }
  }

  const login = ({ email, password }) => {
    const found = registeredUsers.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )
    if (!found) return { success: false, error: 'Invalid email or password.' }

    const sessionUser = { id: found.id, fullName: found.fullName, email: found.email, role: found.role }
    setUser(sessionUser)
    localStorage.setItem('intimaai_user', JSON.stringify(sessionUser))
    return { success: true }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('intimaai_user')
  }

  return (
    <AuthContext.Provider value={{ user, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
import { Link, Route, Routes } from "react-router-dom"

import ProtectedRoute from "./components/ProtectedRoute"
import DashboardPage from "./pages/DashboardPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"

function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-brand-700">NursifyGH</h1>
        <p className="mt-2 text-gray-600">
          The study platform for Ghanaian nursing &amp; midwifery students.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link to="/login" className="btn-primary">
            Log in
          </Link>
          <Link to="/register" className="btn-secondary">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
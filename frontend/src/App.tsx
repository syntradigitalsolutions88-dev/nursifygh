import { Link, Route, Routes } from "react-router-dom"

import ProtectedRoute from "./components/ProtectedRoute"
import CarePlanDetailPage from "./pages/CarePlanDetailPage"
import CarePlansPage from "./pages/CarePlansPage"
import CheckoutCallbackPage from "./pages/CheckoutCallbackPage"
import CoursesPage from "./pages/CoursesPage"
import DashboardPage from "./pages/DashboardPage"
import LoginPage from "./pages/LoginPage"
import NcpBuilderPage from "./pages/NcpBuilderPage"
import PublicLibraryPage from "./pages/PublicLibraryPage"
import QuizPage from "./pages/QuizPage"
import QuizResultsPage from "./pages/QuizResultsPage"
import RegisterPage from "./pages/RegisterPage"
import SharedPlanPage from "./pages/SharedPlanPage"
import SubscribePage from "./pages/SubscribePage"

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

      <Route path="/shared/:token" element={<SharedPlanPage />} />
      <Route path="/checkout/callback" element={<CheckoutCallbackPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/subscribe"
        element={
          <ProtectedRoute>
            <SubscribePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses"
        element={
          <ProtectedRoute>
            <CoursesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/:courseId"
        element={
          <ProtectedRoute>
            <QuizPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/quizzes/results/:attemptId"
        element={
          <ProtectedRoute>
            <QuizResultsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/careplans"
        element={
          <ProtectedRoute>
            <CarePlansPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/careplans/new"
        element={
          <ProtectedRoute>
            <NcpBuilderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/careplans/:planId"
        element={
          <ProtectedRoute>
            <CarePlanDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/library"
        element={
          <ProtectedRoute>
            <PublicLibraryPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
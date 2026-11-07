import { Route, Routes } from "react-router-dom"

import ProtectedRoute from "./components/ProtectedRoute"
import AboutPage from "./pages/AboutPage"
import AppContactPage from "./pages/AppContactPage"
import AppHelpPage from "./pages/AppHelpPage"
import CarePlanDetailPage from "./pages/CarePlanDetailPage"
import CarePlanTranscriptionPage from "./pages/CarePlanTranscriptionPage"
import CarePlansPage from "./pages/CarePlansPage"
import CheckoutCallbackPage from "./pages/CheckoutCallbackPage"
import ContactPage from "./pages/ContactPage"
import CoursesPage from "./pages/CoursesPage"
import DashboardPage from "./pages/DashboardPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import HelpArticlePage from "./pages/HelpArticlePage"
import HelpCenterPage from "./pages/HelpCenterPage"
import LandingPage from "./pages/LandingPage"
import LoginPage from "./pages/LoginPage"
import NcpBuilderPage from "./pages/NcpBuilderPage"
import PrivacyPage from "./pages/PrivacyPage"
import ProfilePage from "./pages/ProfilePage"
import PublicLibraryPage from "./pages/PublicLibraryPage"
import PublicPlanDetailPage from "./pages/PublicPlanDetailPage"
import QuizPage from "./pages/QuizPage"
import QuizResultsPage from "./pages/QuizResultsPage"
import RegisterPage from "./pages/RegisterPage"
import ResetPasswordPage from "./pages/ResetPasswordPage"
import SharedPlanPage from "./pages/SharedPlanPage"
import SubscribePage from "./pages/SubscribePage"
import TermsPage from "./pages/TermsPage"

export default function App() {
  return (
    <Routes>
      {/* Public marketing + support */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/help" element={<HelpCenterPage />} />
      <Route path="/help/:slug" element={<HelpArticlePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Auth */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Public share links (no auth required) */}
      <Route path="/shared/:token" element={<SharedPlanPage />} />
      <Route path="/checkout/callback" element={<CheckoutCallbackPage />} />

      {/* Authenticated app */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/courses" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
      <Route path="/quizzes/:courseId" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />
      <Route path="/quizzes/results/:attemptId" element={<ProtectedRoute><QuizResultsPage /></ProtectedRoute>} />
      <Route path="/careplans" element={<ProtectedRoute><CarePlansPage /></ProtectedRoute>} />
      <Route path="/careplans/new" element={<ProtectedRoute><NcpBuilderPage /></ProtectedRoute>} />
      <Route path="/careplans/:planId" element={<ProtectedRoute><CarePlanDetailPage /></ProtectedRoute>} />
      <Route path="/careplans/:planId/transcription" element={<ProtectedRoute><CarePlanTranscriptionPage /></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><PublicLibraryPage /></ProtectedRoute>} />
      <Route path="/library/:planId" element={<ProtectedRoute><PublicPlanDetailPage /></ProtectedRoute>} />
      <Route path="/subscribe" element={<ProtectedRoute><SubscribePage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><AppHelpPage /></ProtectedRoute>} />
      <Route path="/support/contact" element={<ProtectedRoute><AppContactPage /></ProtectedRoute>} />
    </Routes>
  )
}
import { Route, Routes } from "react-router-dom"

import ProtectedRoute from "./components/ProtectedRoute"
import PaywallGate from "./components/PaywallGate"
import PwaInstallPrompt from "./components/PwaInstallPrompt"
import AboutPage from "./pages/AboutPage"
import AmbassadorPage from "./pages/AmbassadorPage"
import AppContactPage from "./pages/AppContactPage"
import AppHelpPage from "./pages/AppHelpPage"
import CarePlanDetailPage from "./pages/CarePlanDetailPage"
import CarePlanTranscriptionPage from "./pages/CarePlanTranscriptionPage"
import CarePlansPage from "./pages/CarePlansPage"
import CheckoutCallbackPage from "./pages/CheckoutCallbackPage"
import ClinicalsPage from "./pages/ClinicalsPage"
import ContactPage from "./pages/ContactPage"
import CoursesPage from "./pages/CoursesPage"
import DashboardPage from "./pages/DashboardPage"
import ForgotPasswordPage from "./pages/ForgotPasswordPage"
import HelpArticlePage from "./pages/HelpArticlePage"
import HelpCenterPage from "./pages/HelpCenterPage"
import LandingPage from "./pages/LandingPage"
import LoginPage from "./pages/LoginPage"
import MockExamPage from "./pages/MockExamPage"
import MySubmissionsPage from "./pages/MySubmissionsPage"
import NcpBuilderPage from "./pages/NcpBuilderPage"
import PastPaperUploadPage from "./pages/PastPaperUploadPage"
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
    <>
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

        {/* Public share links */}
        <Route path="/shared/:token" element={<SharedPlanPage />} />
        <Route path="/checkout/callback" element={<CheckoutCallbackPage />} />

        {/* Dashboard */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/subscribe" element={<ProtectedRoute><SubscribePage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><AppHelpPage /></ProtectedRoute>} />
        <Route path="/support/contact" element={<ProtectedRoute><AppContactPage /></ProtectedRoute>} />
        <Route path="/my-submissions" element={<ProtectedRoute><MySubmissionsPage /></ProtectedRoute>} />

        {/* Ambassador Program */}
        <Route path="/ambassador" element={<ProtectedRoute><AmbassadorPage /></ProtectedRoute>} />

        {/* Courses & Quizzes */}
        <Route path="/courses" element={
          <ProtectedRoute>
            <PaywallGate feature="Courses & Quizzes" description="148 NMC courses with 1,000+ practice questions across all 4 departments.">
              <CoursesPage />
            </PaywallGate>
          </ProtectedRoute>
        } />

        <Route path="/quizzes/:courseId" element={
          <ProtectedRoute>
            <PaywallGate feature="Practice Quiz" description="Answer real NMC past questions with instant grading and rationales.">
              <QuizPage />
            </PaywallGate>
          </ProtectedRoute>
        } />

        <Route path="/courses/:courseId/upload" element={
          <ProtectedRoute>
            <PaywallGate feature="Upload Past Paper" description="Upload a photo of any N&MC past paper and turn it into practice questions.">
              <PastPaperUploadPage />
            </PaywallGate>
          </ProtectedRoute>
        } />

        <Route path="/quizzes/results/:attemptId" element={
          <ProtectedRoute>
            <PaywallGate feature="Quiz Results" description="Review your answers with clinical rationales for every question.">
              <QuizResultsPage />
            </PaywallGate>
          </ProtectedRoute>
        } />

        {/* Mock Exam */}
        <Route path="/mock-exam" element={
          <ProtectedRoute>
            <PaywallGate feature="Mock Exam Simulator" description="Take 60-minute, 50-question exams with auto-grading and timer.">
              <MockExamPage />
            </PaywallGate>
          </ProtectedRoute>
        } />

        {/* Clinicals */}
        <Route path="/clinicals" element={
          <ProtectedRoute>
            <PaywallGate feature="Clinical Tracker" description="Log procedures with hospital, ward, and supervisor — ready for your N&MC booklet.">
              <ClinicalsPage />
            </PaywallGate>
          </ProtectedRoute>
        } />

        {/* Care Plans */}
        <Route path="/careplans" element={
          <ProtectedRoute>
            <PaywallGate feature="Care Plans" description="Build NANDA-based care plans with AI assistance and SMART goals.">
              <CarePlansPage />
            </PaywallGate>
          </ProtectedRoute>
        } />

        <Route path="/careplans/new" element={
          <ProtectedRoute>
            <PaywallGate feature="Create Care Plan" description="Use AI Autofill to draft a complete NCP in seconds.">
              <NcpBuilderPage />
            </PaywallGate>
          </ProtectedRoute>
        } />

        <Route path="/careplans/:planId" element={
          <ProtectedRoute>
            <PaywallGate feature="Care Plan Detail" description="View, edit, and share your NANDA care plans.">
              <CarePlanDetailPage />
            </PaywallGate>
          </ProtectedRoute>
        } />

        <Route path="/careplans/:planId/transcription" element={
          <ProtectedRoute>
            <PaywallGate feature="N&MC Transcription View" description="Print-ready N&MC licensure format for your clinical booklet.">
              <CarePlanTranscriptionPage />
            </PaywallGate>
          </ProtectedRoute>
        } />

        {/* Library */}
        <Route path="/library" element={
          <ProtectedRoute>
            <PaywallGate feature="Community Library" description="Browse and copy care plans shared by other nursing students.">
              <PublicLibraryPage />
            </PaywallGate>
          </ProtectedRoute>
        } />

        <Route path="/library/:planId" element={
          <ProtectedRoute>
            <PaywallGate feature="Shared Care Plan" description="View detailed NCPs from the community library.">
              <PublicPlanDetailPage />
            </PaywallGate>
          </ProtectedRoute>
        } />
      </Routes>

      <PwaInstallPrompt />
    </>
  )
}
import { Link, Route, Routes } from "react-router-dom"

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
        <p className="mt-6 text-xs text-gray-400">
          Frontend scaffold v0.1 — routes arrive next
        </p>
      </div>
    </div>
  )
}

function Placeholder({ name }: { name: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-brand-700">{name}</h1>
        <p className="mt-2 text-gray-500">Coming in the next message.</p>
        <Link to="/" className="mt-6 inline-block text-brand-600 hover:underline">
          ← Back home
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Placeholder name="Login" />} />
      <Route path="/register" element={<Placeholder name="Register" />} />
    </Routes>
  )
}
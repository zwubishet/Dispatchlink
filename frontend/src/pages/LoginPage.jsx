import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ phone: '', password: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await login(form.phone, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f6ea] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img
            src="/dispatchlink-logo.svg"
            alt="DispatchLink"
            className="w-16 h-16 rounded-2xl mb-4 shadow-lg shadow-brand-900/20"
          />
          <h1 className="text-3xl font-bold text-stone-950">DispatchLink</h1>
          <p className="text-stone-500 text-sm mt-1">Distributor Operations Hub</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-stone-950 mb-5">Sign in to your account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Phone number</label>
              <input
                type="tel"
                className="input"
                placeholder="09xxxxxxxx"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center py-2.5" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          <p className="text-xs text-stone-400 text-center mt-4">
            Default: 0900000000 / admin123
          </p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthCard from './AuthCard';
import { Input } from '../../components/ui/FormFields';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { login } from '../../services/authService';
import { useAuth, homePathForRole } from '../../hooks/useAuth';
import { friendlyError } from '../../utils/errors';
import { isEmail, validate, required } from '../../utils/validation';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, profile, role, loading, authMessage, clearAuthMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect by role once the profile has loaded.
  useEffect(() => {
    if (!loading && user && profile) {
      const from = location.state?.from;
      navigate(from && from !== '/login' ? from : homePathForRole(role), { replace: true });
    }
  }, [loading, user, profile, role, navigate, location.state]);

  useEffect(() => {
    if (authMessage) setSubmitting(false);
  }, [authMessage]);

  const onSubmit = async (e) => {
    e.preventDefault();
    clearAuthMessage();
    const v = validate(form, {
      email: [
        [required, 'Email is required.'],
        [isEmail, 'Please enter a valid email address.'],
      ],
      password: [[required, 'Password is required.']],
    });
    setErrors(v);
    if (Object.keys(v).length) return;
    setSubmitting(true);
    setError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(friendlyError(err, 'Login failed. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to continue to EcoSort."
      footer={
        <>
          New to EcoSort?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Alert type="warning">{authMessage}</Alert>
        <Alert type="error">{error}</Alert>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          required
        />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={submitting}>
          {submitting ? 'Logging in...' : 'Login'}
        </Button>
      </form>
    </AuthCard>
  );
}

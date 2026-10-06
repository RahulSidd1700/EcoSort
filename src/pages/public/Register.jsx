import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthCard from './AuthCard';
import { Input, Textarea } from '../../components/ui/FormFields';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { register } from '../../services/authService';
import { useAuth, homePathForRole } from '../../hooks/useAuth';
import { friendlyError } from '../../utils/errors';
import { isEmail, isPhone, validate, required, minLen } from '../../utils/validation';

const EMPTY = { name: '', email: '', phone: '', password: '', confirm: '', address: '', area: '' };

export default function Register() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { user, profile, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && profile) navigate(homePathForRole(role), { replace: true });
  }, [user, profile, role, navigate]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validate(form, {
      name: [[minLen(2), 'Please enter your full name.']],
      email: [
        [required, 'Email is required.'],
        [isEmail, 'Please enter a valid email address.'],
      ],
      phone: [[isPhone, 'Please enter a valid phone number.']],
      password: [[minLen(6), 'Password must be at least 6 characters.']],
      confirm: [[(val, all) => val === all.password, 'Passwords do not match.']],
      address: [[minLen(5), 'Please enter your address.']],
    });
    setErrors(v);
    if (Object.keys(v).length) return;
    setSubmitting(true);
    setError('');
    try {
      await register(form);
    } catch (err) {
      setError(friendlyError(err, 'Registration failed. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Create your EcoSort account"
      subtitle="Start sorting smarter and earning EcoPoints."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Login
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Alert type="error">{error}</Alert>
        <Input
          label="Full Name"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          autoComplete="name"
          required
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          autoComplete="email"
          required
        />
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={set('phone')}
          error={errors.phone}
          autoComplete="tel"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            autoComplete="new-password"
            hint="At least 6 characters"
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={form.confirm}
            onChange={set('confirm')}
            error={errors.confirm}
            autoComplete="new-password"
            required
          />
        </div>
        <Textarea
          label="Address"
          value={form.address}
          onChange={set('address')}
          error={errors.address}
          autoComplete="street-address"
          required
        />
        <Input
          label="Area / Locality"
          value={form.area}
          onChange={set('area')}
          hint="Used to match nearby collectors (e.g. Koramangala)"
        />
        <Button type="submit" className="w-full" loading={submitting}>
          {submitting ? 'Creating account...' : 'Register'}
        </Button>
      </form>
    </AuthCard>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthCard from './AuthCard';
import { Input } from '../../components/ui/FormFields';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { resetPassword } from '../../services/authService';
import { friendlyError } from '../../utils/errors';
import { isEmail } from '../../utils/validation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!isEmail(email)) {
      setStatus({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(email);
      setStatus({
        type: 'success',
        message: 'If an account exists for this email, a password reset link has been sent.',
      });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        // Do not reveal whether the email is registered.
        setStatus({
          type: 'success',
          message: 'If an account exists for this email, a password reset link has been sent.',
        });
      } else {
        setStatus({ type: 'error', message: friendlyError(err, 'Could not send the reset email. Please try again.') });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link to="/login" className="font-semibold text-brand-700 hover:underline">
          Back to login
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Alert type={status.type || 'info'}>{status.message}</Alert>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Button type="submit" className="w-full" loading={submitting}>
          Send reset link
        </Button>
      </form>
    </AuthCard>
  );
}

import { Check, Circle, XCircle } from 'lucide-react';
import { PICKUP_STEPS } from '../utils/constants';
import { formatDate } from '../utils/format';

const STEP_TIME_FIELD = {
  REQUESTED: 'createdAt',
  ASSIGNED: 'assignedAt',
  COLLECTED: 'collectedAt',
  COMPLETED: 'completedAt',
};

/** Visual timeline: done steps get a tick, the current step is highlighted, later steps are empty. */
export default function PickupTimeline({ pickup }) {
  if (pickup.status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
        <XCircle size={18} className="text-red-500" aria-hidden="true" /> This pickup request was cancelled.
      </div>
    );
  }
  const currentIndex = PICKUP_STEPS.findIndex((s) => s.status === pickup.status);
  const historyTime = (status) => pickup.history?.filter((h) => h.status === status).pop()?.at;

  return (
    <ol className="relative space-y-0" aria-label="Pickup progress">
      {PICKUP_STEPS.map((step, i) => {
        const done = i < currentIndex || pickup.status === 'COMPLETED';
        const current = i === currentIndex && pickup.status !== 'COMPLETED';
        const time = pickup[STEP_TIME_FIELD[step.status]] || historyTime(step.status);
        return (
          <li key={step.status} className="relative flex gap-3 pb-4 last:pb-0">
            {i < PICKUP_STEPS.length - 1 && (
              <span
                className={`absolute top-7 left-[13px] h-[calc(100%-1.5rem)] w-0.5 ${done ? 'bg-brand-500' : 'bg-slate-200'}`}
                aria-hidden="true"
              />
            )}
            <span
              className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                done
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : current
                    ? 'border-brand-600 bg-white text-brand-600'
                    : 'border-slate-300 bg-white text-slate-300'
              }`}
            >
              {done ? <Check size={16} /> : <Circle size={10} fill={current ? 'currentColor' : 'none'} />}
            </span>
            <div className="pt-0.5">
              <p className={`text-sm font-medium ${done || current ? 'text-slate-800' : 'text-slate-400'}`}>
                {step.label}
                {current && <span className="ml-2 text-xs font-semibold text-brand-700">(current)</span>}
              </p>
              {(done || current) && time && <p className="text-xs text-slate-500">{formatDate(time, true)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

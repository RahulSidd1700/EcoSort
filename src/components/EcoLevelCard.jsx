import { getEcoLevel } from '../utils/impact';

export default function EcoLevelCard({ points = 0 }) {
  const level = getEcoLevel(points);
  return (
    <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-emerald-700 p-5 text-white shadow-sm">
      <p className="text-sm text-brand-100">Eco Level</p>
      <p className="mt-1 text-2xl font-bold">
        <span aria-hidden="true">{level.emoji}</span> {level.name}
      </p>
      <p className="mt-1 text-sm text-brand-100">{points} EcoPoints</p>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-white/25"
        role="progressbar"
        aria-valuenow={level.progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress to next level"
      >
        <div className="h-full rounded-full bg-white" style={{ width: `${level.progress}%` }} />
      </div>
      <p className="mt-2 text-xs text-brand-100">
        {level.next ? `${level.pointsToNext} points to ${level.next.name}` : 'You have reached the highest level!'}
      </p>
    </div>
  );
}

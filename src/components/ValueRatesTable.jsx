import { useSetting } from '../hooks/useSettings';
import { formatRange } from '../utils/format';

/** Sample value rates from Firestore settings/rates (with built-in defaults). */
export default function ValueRatesTable() {
  const { value } = useSetting('rates');
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 font-medium">Material</th>
              <th className="py-2 font-medium">Estimated rate</th>
            </tr>
          </thead>
          <tbody>
            {(value.items || []).map((r) => (
              <tr key={r.material} className="border-b border-slate-100 last:border-0">
                <td className="py-2">{r.material}</td>
                <td className="py-2 font-medium">
                  {r.min === null || r.min === undefined || r.min === ''
                    ? 'Variable'
                    : `${formatRange(r.min, r.max)}/${r.unit || 'kg'}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
        Estimated value only. Actual recycler price may vary. These are sample rates, not live market prices.
      </p>
    </div>
  );
}

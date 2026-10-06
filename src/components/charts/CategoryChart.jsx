import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CATEGORIES } from '../../utils/constants';

/** Pie chart of counts (or kg) per waste category. counts: { recyclable: 3, ... } */
export default function CategoryChart({ counts, unit = 'items', height = 260 }) {
  const data = CATEGORIES.map((c) => ({ name: c.label, value: Number(counts[c.id] || 0), color: c.color })).filter(
    (d) => d.value > 0,
  );
  if (!data.length) {
    return <p className="py-10 text-center text-sm text-slate-500">No data to show yet.</p>;
  }
  return (
    <div
      style={{ height }}
      role="img"
      aria-label={`Waste by category: ${data.map((d) => `${d.name} ${d.value}`).join(', ')}`}
    >
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => `${v} ${unit}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

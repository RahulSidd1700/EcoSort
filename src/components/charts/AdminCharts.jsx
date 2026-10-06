import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import Card from '../ui/Card';
import CategoryChart from './CategoryChart';
import { PICKUP_STATUSES } from '../../utils/constants';
import { formatStatus, toDate } from '../../utils/format';
import { toKg } from '../../utils/impact';

const STATUS_COLORS = {
  REQUESTED: '#f59e0b',
  ASSIGNED: '#0ea5e9',
  ON_THE_WAY: '#6366f1',
  COLLECTED: '#14b8a6',
  COMPLETED: '#16a34a',
  CANCELLED: '#94a3b8',
};

/** Last N months as [{ key: '2026-05', label: 'May' }] */
function lastMonths(n = 6) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ key: `${m.getFullYear()}-${m.getMonth()}`, label: m.toLocaleString('en-IN', { month: 'short' }) });
  }
  return out;
}
const monthKey = (value) => {
  const d = toDate(value);
  return d ? `${d.getFullYear()}-${d.getMonth()}` : '';
};

export function buildMonthlySeries({ pickups, listings, users, factors }) {
  return lastMonths(6).map(({ key, label }) => {
    const completed = pickups.filter((p) => p.status === 'COMPLETED' && monthKey(p.completedAt || p.updatedAt) === key);
    const sold = listings.filter((l) => l.status === 'SOLD' && monthKey(l.soldAt || l.updatedAt) === key);
    const kg = [...completed, ...sold].reduce((s, x) => s + toKg(x.quantity, x.unit, factors), 0);
    const activeUsers = new Set([
      ...pickups.filter((p) => monthKey(p.createdAt) === key).map((p) => p.userId),
      ...listings.filter((l) => monthKey(l.createdAt) === key).map((l) => l.sellerId),
    ]).size;
    return {
      month: label,
      kg: Math.round(kg * 10) / 10,
      newUsers: users.filter((u) => u.role === 'user' && monthKey(u.createdAt) === key).length,
      activeUsers,
    };
  });
}

export default function AdminCharts({ pickups, listings, users, wasteItems, factors }) {
  const categoryKg = {};
  [...pickups.filter((p) => p.status !== 'CANCELLED'), ...listings.filter((l) => l.status !== 'CANCELLED')].forEach(
    (x) => {
      categoryKg[x.category] =
        Math.round(((categoryKg[x.category] || 0) + toKg(x.quantity, x.unit, factors)) * 10) / 10;
    },
  );
  wasteItems.forEach((w) => {
    if (!categoryKg[w.category]) categoryKg[w.category] = 0;
  });
  const statusData = PICKUP_STATUSES.map((s) => ({
    status: formatStatus(s),
    key: s,
    count: pickups.filter((p) => p.status === s).length,
  }));
  const monthly = buildMonthlySeries({ pickups, listings, users, factors });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Waste by category (kg, estimated)">
        <CategoryChart counts={categoryKg} unit="kg" />
      </Card>
      <Card title="Pickup status">
        <div className="h-[260px]" role="img" aria-label={statusData.map((s) => `${s.status}: ${s.count}`).join(', ')}>
          <ResponsiveContainer>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="status" tick={{ fontSize: 11 }} interval={0} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Pickups" radius={[6, 6, 0, 0]}>
                {statusData.map((s) => (
                  <Cell key={s.key} fill={STATUS_COLORS[s.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Waste collected over time (kg, estimated)">
        <div className="h-[260px]">
          <ResponsiveContainer>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `${v} kg`} />
              <Line
                type="monotone"
                dataKey="kg"
                name="Collected / sold"
                stroke="#16a34a"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="User participation">
        <div className="h-[260px]">
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="newUsers" name="New users" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              <Bar dataKey="activeUsers" name="Active users" fill="#16a34a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

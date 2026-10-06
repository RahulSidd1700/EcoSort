import { useState } from 'react';
import { Eye, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FilterBar from '../../components/ui/FilterBar';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import { ListSkeleton } from '../../components/ui/Skeleton';
import StatusBadge, { CategoryBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useAdminData } from '../../hooks/useAdminData';
import { setUserActive } from '../../services/adminService';
import { ROLES } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { formatDate, shortId, sortByDateDesc } from '../../utils/format';

export default function AdminUsers() {
  const { profile: me } = useAuth();
  const d = useAdminData(['users', 'waste', 'pickups']);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  const term = search.trim().toLowerCase();
  const users = d.users.filter(
    (u) => (!role || u.role === role) && (!term || `${u.name} ${u.email}`.toLowerCase().includes(term)),
  );

  const toggleActive = async (u) => {
    const activate = u.active === false;
    if (!activate && !window.confirm(`Deactivate ${u.name}? They will not be able to log in.`)) return;
    setBusy(u.id);
    try {
      await setUserActive(u.id, activate);
      setMessage({ type: 'success', text: `${u.name} has been ${activate ? 'activated' : 'deactivated'}.` });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err, 'Could not update the account.') });
    } finally {
      setBusy('');
    }
  };

  const userWaste = selected ? sortByDateDesc(d.wasteItems.filter((w) => w.userId === selected.id)) : [];
  const userPickups = selected ? sortByDateDesc(d.pickups.filter((p) => p.userId === selected.id)) : [];

  return (
    <div className="fade-in">
      <PageHeader
        title="Users"
        subtitle="View accounts, activity history and activate/deactivate users. Passwords are never visible."
      />
      <Alert type={message.type || 'info'} className="mb-4">
        {message.text}
      </Alert>
      <Alert type="error" className="mb-4">
        {d.error}
      </Alert>
      <FilterBar
        search={search}
        onSearch={setSearch}
        searchPlaceholder="Search name or email..."
        filters={[
          {
            label: 'Roles',
            value: role,
            onChange: setRole,
            options: ROLES.map((r) => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) })),
          },
        ]}
      />
      {d.loading ? (
        <ListSkeleton />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" message="Try a different search or role filter." />
      ) : (
        <DataTable
          caption="Users"
          rows={users}
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (u) => (
                <>
                  <p className="font-medium">
                    {u.name}
                    {u.isDemo && <span className="ml-1 text-xs text-slate-400">(demo)</span>}
                  </p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </>
              ),
            },
            { key: 'role', label: 'Role', render: (u) => <span className="capitalize">{u.role}</span> },
            { key: 'phone', label: 'Phone' },
            { key: 'ecoPoints', label: 'EcoPoints', render: (u) => u.ecoPoints || 0 },
            { key: 'createdAt', label: 'Joined', render: (u) => formatDate(u.createdAt) },
            {
              key: 'active',
              label: 'Status',
              render: (u) => <StatusBadge status={u.active === false ? 'INACTIVE' : 'ACTIVE'} />,
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (u) => (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" icon={Eye} onClick={() => setSelected(u)}>
                    View
                  </Button>
                  {u.id !== me.uid && (
                    <Button
                      size="sm"
                      variant={u.active === false ? 'outline' : 'ghost'}
                      className={u.active === false ? '' : 'text-red-600'}
                      loading={busy === u.id}
                      onClick={() => toggleActive(u)}
                    >
                      {u.active === false ? 'Activate' : 'Deactivate'}
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name || 'User'} size="lg">
        {selected && (
          <div className="space-y-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="font-medium">{selected.email}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-medium">{selected.phone || '-'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Role</dt>
                <dd className="font-medium capitalize">{selected.role}</dd>
              </div>
              <div>
                <dt className="text-slate-500">EcoPoints</dt>
                <dd className="font-medium">{selected.ecoPoints || 0}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Address</dt>
                <dd className="font-medium">
                  {selected.address || '-'} {selected.area && `(${selected.area})`}
                </dd>
              </div>
            </dl>
            <section>
              <h3 className="mb-2 font-semibold">Waste history ({userWaste.length})</h3>
              {userWaste.length === 0 ? (
                <p className="text-sm text-slate-500">No waste records.</p>
              ) : (
                <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto text-sm">
                  {userWaste.map((w) => (
                    <li key={w.id} className="flex items-center justify-between gap-2 py-2">
                      <span>
                        {w.itemName}{' '}
                        <span className="text-xs text-slate-400">
                          · {formatDate(w.createdAt)} · {w.source}
                        </span>
                      </span>
                      <CategoryBadge category={w.category} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section>
              <h3 className="mb-2 font-semibold">Pickup history ({userPickups.length})</h3>
              {userPickups.length === 0 ? (
                <p className="text-sm text-slate-500">No pickup requests.</p>
              ) : (
                <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto text-sm">
                  {userPickups.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                      <span>
                        {shortId(p.id)} · {p.itemName}{' '}
                        <span className="text-xs text-slate-400">· {formatDate(p.preferredDate)}</span>
                      </span>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}

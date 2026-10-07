import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye, Tag } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { CardGridSkeleton } from '../../components/ui/Skeleton';
import ListingCard from '../../components/ListingCard';
import ValueRatesTable from '../../components/ValueRatesTable';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { subscribeMyListings, deleteListing } from '../../services/listingService';
import { friendlyError } from '../../utils/errors';
import { sortByDateDesc } from '../../utils/format';

export default function SellWaste() {
  const { profile } = useAuth();
  const { data, loading, error } = useRealtime((ok, fail) => subscribeMyListings(profile.uid, ok, fail), [profile.uid]);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const listings = sortByDateDesc(data);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteListing(toDelete.id);
      setMessage({ type: 'success', text: 'Listing deleted.' });
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err, 'Could not delete the listing.') });
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        title="Sell Waste"
        subtitle="List recyclable materials and e-waste for collectors and recyclers. This is a sale / collection arrangement - no online payment."
        actions={
          <Button icon={Plus} to="/sell/new">
            Create Listing
          </Button>
        }
      />
      <Alert type={message.type || 'info'} className="mb-4">
        {message.text}
      </Alert>
      <Alert type="error" className="mb-4">
        {error}
      </Alert>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <h2 className="mb-3 font-semibold text-slate-700">My Listings ({listings.length})</h2>
          {loading ? (
            <CardGridSkeleton count={3} className="h-72" />
          ) : listings.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="No listings yet"
              message="Create a listing to sell recyclable materials or e-waste."
              actionLabel="Create Listing"
              actionTo="/sell/new"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {listings.map((l) => (
                <ListingCard key={l.id} listing={l}>
                  <Button size="sm" variant="secondary" icon={Eye} to={`/marketplace/${l.id}`}>
                    View
                  </Button>
                  {l.status === 'AVAILABLE' && (
                    <Button size="sm" variant="secondary" icon={Pencil} to={`/sell/${l.id}/edit`}>
                      Edit
                    </Button>
                  )}
                  {['AVAILABLE', 'OFFER_RECEIVED', 'CANCELLED'].includes(l.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      icon={Trash2}
                      onClick={() => setToDelete(l)}
                    >
                      Delete
                    </Button>
                  )}
                </ListingCard>
              ))}
            </div>
          )}
        </div>
        <Card title="Estimated value rates" className="h-fit">
          <ValueRatesTable />
        </Card>
      </div>

      <Modal
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        title="Delete listing?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          “{toDelete?.itemName}” will be permanently removed from the marketplace.
        </p>
      </Modal>
    </div>
  );
}

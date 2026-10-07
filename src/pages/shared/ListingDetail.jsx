import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, HandCoins, Check, X, Pencil, Ban, CheckCheck, Phone, Mail, MapPin } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Modal from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { Input, Textarea } from '../../components/ui/FormFields';
import StatusBadge, { CategoryBadge } from '../../components/ui/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../hooks/useRealtime';
import { subscribeListing, listingAction, getArrangement } from '../../services/listingService';
import { CATEGORY_MAP, CONDITIONS } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { formatDate, formatINR, formatStatus } from '../../utils/format';

export default function ListingDetail() {
  const { id } = useParams();
  const { profile, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: listing, loading, error } = useRealtime((ok, fail) => subscribeListing(id, ok, fail), [id], true, null);
  const [message, setMessage] = useState({
    type: location.state?.message ? 'success' : '',
    text: location.state?.message || '',
  });
  const [busy, setBusy] = useState('');
  const [offerOpen, setOfferOpen] = useState(false);
  const [offer, setOffer] = useState({ price: '', message: '' });
  const [offerError, setOfferError] = useState('');
  const [arrangement, setArrangement] = useState(null);

  const isSeller = listing?.sellerId === profile.uid;
  const isBuyer = listing?.buyerId === profile.uid;
  const canSeeContacts =
    listing && ['ACCEPTED', 'SOLD'].includes(listing.status) && (isSeller || isBuyer || role === 'admin');

  useEffect(() => {
    if (!canSeeContacts) return;
    getArrangement(id)
      .then(setArrangement)
      .catch(() => setArrangement(null));
  }, [id, canSeeContacts, listing?.status]);

  const run = async (action, extra = {}, successText) => {
    setBusy(action);
    setMessage({ type: '', text: '' });
    try {
      const res = await listingAction(id, action, extra);
      const pts = res?.pointsAwarded ? ` You earned ${res.pointsAwarded} EcoPoints!` : '';
      setMessage({ type: 'success', text: `${successText}${pts}` });
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: friendlyError(err, 'Action failed. Please try again.') });
      return false;
    } finally {
      setBusy('');
    }
  };

  const submitOffer = async (e) => {
    e.preventDefault();
    if (offer.price === '' || Number(offer.price) < 0) {
      setOfferError('Offer price must be zero or greater.');
      return;
    }
    setOfferError('');
    const ok = await run(
      'make_offer',
      { offerPrice: Number(offer.price), message: offer.message },
      'Your offer has been sent to the seller.',
    );
    if (ok) setOfferOpen(false);
  };

  if (loading) return <PageLoader label="Loading listing..." />;
  if (error || !listing) {
    return (
      <div className="space-y-4">
        <Alert type="error">{error || 'This listing was not found. It may have been removed.'}</Alert>
        <Button variant="secondary" icon={ArrowLeft} to="/marketplace">
          Back to marketplace
        </Button>
      </div>
    );
  }

  const condition = CONDITIONS.find((c) => c.value === listing.condition)?.label || listing.condition;

  return (
    <div className="fade-in space-y-4">
      <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)}>
        Back
      </Button>
      <Alert type={message.type || 'info'}>{message.text}</Alert>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card className="overflow-hidden p-0">
            <div className="flex h-64 items-center justify-center bg-slate-100 text-7xl" aria-hidden="true">
              {CATEGORY_MAP[listing.category]?.emoji}
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold">{listing.itemName}</h1>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <CategoryBadge category={listing.category} />
                    <StatusBadge status={listing.status} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Expected price</p>
                  <p className="text-2xl font-bold text-brand-700">{formatINR(listing.expectedPrice)}</p>
                </div>
              </div>
              {listing.description && <p className="text-slate-600">{listing.description}</p>}
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-slate-500">Quantity</dt>
                  <dd className="font-medium">
                    {listing.quantity} {listing.unit}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Condition</dt>
                  <dd className="font-medium">{condition}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Pickup available</dt>
                  <dd className="font-medium">{listing.pickupAvailable ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Seller</dt>
                  <dd className="font-medium">{listing.sellerName}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Seller area</dt>
                  <dd className="font-medium">{listing.sellerArea || '-'}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Listed on</dt>
                  <dd className="font-medium">{formatDate(listing.createdAt)}</dd>
                </div>
              </dl>
              <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                Sale / Collection Arrangement: payment is settled directly between seller and buyer at collection.
                EcoSort does not process payments.
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card title="Actions">
            <div className="space-y-3">
              {listing.buyerId && listing.status !== 'AVAILABLE' && (
                <div className="rounded-xl bg-slate-50 p-3 text-sm">
                  <p className="text-slate-500">
                    Offer from <strong className="text-slate-700">{listing.buyerName}</strong>
                  </p>
                  <p className="text-xl font-bold">{formatINR(listing.offerPrice)}</p>
                  {listing.offerMessage && <p className="mt-1 text-slate-600">“{listing.offerMessage}”</p>}
                </div>
              )}

              {/* Seller actions */}
              {isSeller && listing.status === 'AVAILABLE' && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" icon={Pencil} to={`/sell/${id}/edit`}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    icon={Ban}
                    loading={busy === 'cancel'}
                    onClick={() => run('cancel', {}, 'Listing cancelled.')}
                  >
                    Cancel listing
                  </Button>
                  <p className="w-full text-sm text-slate-500">Waiting for offers from collectors / recyclers.</p>
                </div>
              )}
              {isSeller && listing.status === 'OFFER_RECEIVED' && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    icon={Check}
                    loading={busy === 'accept_offer'}
                    disabled={Boolean(busy)}
                    onClick={() => run('accept_offer', {}, 'Offer accepted. Contact details are now shared.')}
                  >
                    Accept offer
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={X}
                    loading={busy === 'reject_offer'}
                    disabled={Boolean(busy)}
                    onClick={() => run('reject_offer', {}, 'Offer rejected. Listing is available again.')}
                  >
                    Reject
                  </Button>
                </div>
              )}
              {(isSeller || isBuyer) && listing.status === 'ACCEPTED' && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">
                    Meet, hand over the material and settle the price. Then mark the transaction as completed.
                  </p>
                  <Button
                    size="sm"
                    icon={CheckCheck}
                    loading={busy === 'mark_sold'}
                    onClick={() => run('mark_sold', {}, 'Transaction marked as completed.')}
                  >
                    Mark transaction completed
                  </Button>
                  {isSeller && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      icon={Ban}
                      loading={busy === 'cancel'}
                      onClick={() => run('cancel', {}, 'Listing cancelled.')}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              )}

              {/* Collector actions */}
              {role === 'collector' && !isSeller && listing.status === 'AVAILABLE' && (
                <Button
                  icon={HandCoins}
                  onClick={() => {
                    setOffer({ price: listing.expectedPrice ?? '', message: '' });
                    setOfferOpen(true);
                  }}
                >
                  Make an offer
                </Button>
              )}
              {isBuyer && listing.status === 'OFFER_RECEIVED' && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">Your offer is waiting for the seller's response.</p>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={busy === 'withdraw_offer'}
                    onClick={() => run('withdraw_offer', {}, 'Offer withdrawn.')}
                  >
                    Withdraw offer
                  </Button>
                </div>
              )}
              {role === 'collector' && !isBuyer && listing.status === 'OFFER_RECEIVED' && (
                <p className="text-sm text-slate-500">Another recycler has already made an offer on this listing.</p>
              )}

              {listing.status === 'SOLD' && (
                <Alert type="success">This transaction is completed. Thank you for recycling!</Alert>
              )}
              {listing.status === 'CANCELLED' && <Alert type="info">This listing was cancelled.</Alert>}
              {role === 'user' && !isSeller && (
                <p className="text-sm text-slate-500">Only collectors / recyclers can make offers on listings.</p>
              )}
              {role === 'admin' && (
                <Button size="sm" variant="secondary" to="/admin/marketplace">
                  Manage in admin panel
                </Button>
              )}
            </div>
          </Card>

          {canSeeContacts && arrangement && (
            <Card title="Collection arrangement">
              <div className="space-y-4 text-sm">
                {[
                  {
                    title: 'Seller',
                    name: arrangement.sellerName,
                    phone: arrangement.sellerPhone,
                    address: arrangement.sellerAddress,
                  },
                  {
                    title: 'Buyer (Recycler)',
                    name: arrangement.buyerName,
                    phone: arrangement.buyerPhone,
                    email: arrangement.buyerEmail,
                  },
                ].map((p) => (
                  <div key={p.title}>
                    <p className="text-xs font-semibold text-slate-400 uppercase">{p.title}</p>
                    <p className="font-medium">{p.name}</p>
                    {p.phone && (
                      <p className="flex items-center gap-1 text-slate-600">
                        <Phone size={14} aria-hidden="true" />{' '}
                        <a href={`tel:${p.phone}`} className="hover:underline">
                          {p.phone}
                        </a>
                      </p>
                    )}
                    {p.email && (
                      <p className="flex items-center gap-1 text-slate-600">
                        <Mail size={14} aria-hidden="true" /> {p.email}
                      </p>
                    )}
                    {p.address && (
                      <p className="flex items-center gap-1 text-slate-600">
                        <MapPin size={14} aria-hidden="true" /> {p.address}
                      </p>
                    )}
                  </div>
                ))}
                <p className="rounded-lg bg-slate-50 p-2">
                  Agreed price: <strong>{formatINR(arrangement.agreedPrice)}</strong>
                </p>
              </div>
            </Card>
          )}

          {listing.history?.length > 0 && (
            <Card title="Transaction history">
              <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
                {[...listing.history].reverse().map((h, i) => (
                  <li key={i} className="text-sm">
                    <p className="font-medium">{formatStatus(h.status)}</p>
                    <p className="text-slate-500">
                      {h.note} · {h.byName}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(h.at, true)}</p>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        title={`Make an offer: ${listing.itemName}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOfferOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="offer-form" loading={busy === 'make_offer'}>
              Send offer
            </Button>
          </>
        }
      >
        <form id="offer-form" onSubmit={submitOffer} className="space-y-4">
          <Input
            label="Offer price (₹)"
            type="number"
            min="0"
            step="any"
            value={offer.price}
            onChange={(e) => setOffer({ ...offer, price: e.target.value })}
            error={offerError}
            required
          />
          <Textarea
            label="Message to seller (optional)"
            value={offer.message}
            onChange={(e) => setOffer({ ...offer, message: e.target.value })}
            maxLength={300}
            placeholder="e.g. I can collect this Saturday morning."
          />
        </form>
      </Modal>
    </div>
  );
}

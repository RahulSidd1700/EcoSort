import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { PageLoader } from '../../components/ui/LoadingSpinner';
import { Input, Select, Textarea } from '../../components/ui/FormFields';
import ValueRatesTable from '../../components/ValueRatesTable';
import { useAuth } from '../../hooks/useAuth';
import { createListing, getListing, updateListing } from '../../services/listingService';
import { CATEGORY_MAP, CONDITIONS, SELLABLE_CATEGORIES, UNITS } from '../../utils/constants';
import { friendlyError } from '../../utils/errors';
import { validate, minLen, positiveNumber, nonNegativeNumber, required } from '../../utils/validation';

const categoryOptions = SELLABLE_CATEGORIES.map((id) => ({ value: id, label: CATEGORY_MAP[id].label }));

export default function ListingForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const prefill = useLocation().state || {};

  const [form, setForm] = useState({
    itemName: prefill.itemName || '',
    category: SELLABLE_CATEGORIES.includes(prefill.category) ? prefill.category : '',
    description: '',
    quantity: 1,
    unit: 'item',
    condition: 'good',
    expectedPrice: '',
    pickupAvailable: true,
    sellerArea: profile.area || '',
    wasteId: prefill.wasteId || null,
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    getListing(id)
      .then((listing) => {
        if (!listing || listing.sellerId !== profile.uid) setError('Listing not found.');
        else if (listing.status !== 'AVAILABLE') setError('Only available listings can be edited.');
        else setForm((f) => ({ ...f, ...listing }));
      })
      .catch((err) => setError(friendlyError(err, 'Could not load the listing.')))
      .finally(() => setLoading(false));
  }, [id, isEdit, profile.uid]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = validate(form, {
      itemName: [[minLen(2), 'Please enter the item name.']],
      category: [[required, 'Please choose a category (Recyclable or E-Waste).']],
      quantity: [[positiveNumber, 'Quantity must be greater than zero.']],
      unit: [[required, 'Please choose a unit.']],
      condition: [[required, 'Please choose the condition.']],
      expectedPrice: [[nonNegativeNumber, 'Price must be zero or greater.']],
    });
    setErrors(v);
    if (Object.keys(v).length) return;

    setSubmitting(true);
    setError('');
    try {
      if (isEdit) {
        await updateListing(id, form);
        navigate(`/marketplace/${id}`, { state: { message: 'Listing updated successfully.' } });
      } else {
        const newId = await createListing(profile, form);
        navigate(`/marketplace/${newId}`, { state: { message: 'Listing created successfully.' } });
      }
    } catch (err) {
      setError(friendlyError(err, isEdit ? 'Listing could not be updated.' : 'Listing could not be created.'));
      setSubmitting(false);
    }
  };

  if (loading) return <PageLoader label="Loading listing..." />;

  return (
    <div className="fade-in">
      <PageHeader
        title={isEdit ? 'Edit Listing' : 'Create Listing'}
        subtitle="Only Recyclable and E-Waste items can be listed for sale."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Alert type="error">{error}</Alert>
            <Input
              label="Waste / item name"
              value={form.itemName}
              onChange={set('itemName')}
              error={errors.itemName}
              placeholder="e.g. Old laptop, Cardboard boxes"
              required
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Category"
                value={form.category}
                onChange={set('category')}
                options={categoryOptions}
                placeholder="Select category"
                error={errors.category}
                required
              />
              <Select
                label="Condition"
                value={form.condition}
                onChange={set('condition')}
                options={CONDITIONS}
                error={errors.condition}
                required
              />
            </div>
            <Textarea
              label="Description"
              value={form.description}
              onChange={set('description')}
              placeholder="Brand, model, age, any defects..."
              maxLength={1000}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Quantity"
                type="number"
                min="0.01"
                step="any"
                value={form.quantity}
                onChange={set('quantity')}
                error={errors.quantity}
                required
              />
              <Select
                label="Unit"
                value={form.unit}
                onChange={set('unit')}
                options={UNITS}
                error={errors.unit}
                required
              />
              <Input
                label="Expected price (₹)"
                type="number"
                min="0"
                step="any"
                value={form.expectedPrice}
                onChange={set('expectedPrice')}
                error={errors.expectedPrice}
                required
              />
            </div>
            <Input
              label="Seller area / locality"
              value={form.sellerArea}
              onChange={set('sellerArea')}
              hint="Shown on the listing card. Your full address stays private."
            />
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-slate-700">Pickup available?</legend>
              <div className="flex gap-4 text-sm">
                {[true, false].map((v) => (
                  <label key={String(v)} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pickupAvailable"
                      checked={form.pickupAvailable === v}
                      onChange={() => setForm({ ...form, pickupAvailable: v })}
                      className="accent-brand-600"
                    />
                    {v ? 'Yes - buyer can collect from me' : 'No - I will drop it off'}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex gap-2 pt-2">
              <Button type="submit" loading={submitting}>
                {isEdit ? 'Save changes' : 'Create listing'}
              </Button>
              <Button variant="secondary" onClick={() => navigate(-1)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
        <Card title="Estimated value rates" className="h-fit">
          <ValueRatesTable />
        </Card>
      </div>
    </div>
  );
}

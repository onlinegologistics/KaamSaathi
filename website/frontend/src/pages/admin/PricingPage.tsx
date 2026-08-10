import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCategoriesList } from '@/hooks/useCategories';
import {
  usePricingRulesList,
  useCreatePricingRule,
  useUpdatePricingRule,
  useTogglePricingRule,
  useDeletePricingRule,
} from '@/hooks/usePricing';
import type { MinimumPriceRule } from '@/types';

const ANY_CATEGORY = '__any__';

interface RuleForm {
  city: string;
  area: string;
  category: string;
  baseMinimumPrice: string;
  hourlyRate: string;
}

const emptyForm: RuleForm = { city: '', area: '', category: ANY_CATEGORY, baseMinimumPrice: '', hourlyRate: '' };

export const PricingPage = () => {
  const [page, setPage] = useState(1);
  const [cityFilter, setCityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data, isLoading } = usePricingRulesList({
    page,
    limit: 20,
    city: cityFilter || undefined,
    category: categoryFilter || undefined,
  });
  const { data: categories } = useCategoriesList();
  const createRule = useCreatePricingRule();
  const updateRule = useUpdatePricingRule();
  const toggleRule = useTogglePricingRule();
  const deleteRule = useDeletePricingRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<MinimumPriceRule | null>(null);
  const [form, setForm] = useState<RuleForm>(emptyForm);
  const [ruleToDelete, setRuleToDelete] = useState<MinimumPriceRule | null>(null);

  const categoryName = useMemo(() => {
    const map = new Map((categories ?? []).map((c) => [c.key, c.name]));
    return (key: string) => (key ? map.get(key) ?? key : 'Any category');
  }, [categories]);

  const openCreateDialog = () => {
    setEditingRule(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (rule: MinimumPriceRule) => {
    setEditingRule(rule);
    setForm({
      city: rule.city,
      area: rule.area,
      category: rule.category || ANY_CATEGORY,
      baseMinimumPrice: String(rule.baseMinimumPrice),
      hourlyRate: rule.hourlyRate !== undefined ? String(rule.hourlyRate) : '',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const payload = {
      city: form.city.trim(),
      area: form.area.trim(),
      category: form.category === ANY_CATEGORY ? '' : form.category,
      baseMinimumPrice: Number(form.baseMinimumPrice),
      hourlyRate: form.hourlyRate.trim() ? Number(form.hourlyRate) : undefined,
    };

    const onSuccess = () => {
      toast.success(editingRule ? 'Pricing rule updated.' : 'Pricing rule created.');
      setDialogOpen(false);
    };
    const onError = () => toast.error('Failed to save pricing rule.');

    if (editingRule) {
      updateRule.mutate({ id: editingRule._id, payload }, { onSuccess, onError });
    } else {
      createRule.mutate(payload, { onSuccess, onError });
    }
  };

  const handleDelete = () => {
    if (!ruleToDelete) return;
    deleteRule.mutate(ruleToDelete._id, {
      onSuccess: () => {
        toast.success('Pricing rule deleted.');
        setRuleToDelete(null);
      },
      onError: () => toast.error('Failed to delete pricing rule.'),
    });
  };

  const columns: ColumnDef<MinimumPriceRule>[] = [
    { id: 'city', header: 'City', cell: ({ row }) => row.original.city || 'Any' },
    { id: 'area', header: 'Area', cell: ({ row }) => row.original.area || 'Any' },
    { id: 'category', header: 'Category', cell: ({ row }) => categoryName(row.original.category) },
    { id: 'base', header: 'Base Price', cell: ({ row }) => `₹${row.original.baseMinimumPrice}` },
    {
      id: 'hourly',
      header: 'Hourly Rate',
      cell: ({ row }) => (row.original.hourlyRate !== undefined ? `₹${row.original.hourlyRate}/hr` : '—'),
    },
    {
      id: 'active',
      header: 'Active',
      cell: ({ row }) => (
        <Switch checked={row.original.isActive} onCheckedChange={() => toggleRule.mutate(row.original._id)} />
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="icon" onClick={() => openEditDialog(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setRuleToDelete(row.original)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Minimum Pricing"
        description="Recommended minimum job prices by city, area, and category — shown to employers while posting a job."
        actions={
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add Rule
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Filter by city"
          value={cityFilter}
          onChange={(e) => {
            setCityFilter(e.target.value);
            setPage(1);
          }}
          className="w-52"
        />
        <Select
          value={categoryFilter || 'all'}
          onValueChange={(value) => {
            setCategoryFilter(value === 'all' ? '' : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(categories ?? []).map((category) => (
              <SelectItem key={category.key} value={category.key}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        page={page}
        pageCount={data?.pagination.pages ?? 1}
        onPageChange={setPage}
        emptyMessage="No pricing rules yet."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit Pricing Rule' : 'Add Pricing Rule'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price-city">City</Label>
                <Input
                  id="price-city"
                  placeholder="e.g. Pune (blank = any city)"
                  value={form.city}
                  onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-area">Area</Label>
                <Input
                  id="price-area"
                  placeholder="e.g. Hinjawadi (optional)"
                  value={form.area}
                  onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(value) => setForm((prev) => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_CATEGORY}>Any category</SelectItem>
                  {(categories ?? []).map((category) => (
                    <SelectItem key={category.key} value={category.key}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="price-base">Base minimum price *</Label>
                <Input
                  id="price-base"
                  type="number"
                  min={0}
                  value={form.baseMinimumPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, baseMinimumPrice: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price-hourly">Hourly rate (optional)</Label>
                <Input
                  id="price-hourly"
                  type="number"
                  min={0}
                  value={form.hourlyRate}
                  onChange={(e) => setForm((prev) => ({ ...prev, hourlyRate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.baseMinimumPrice || createRule.isPending || updateRule.isPending}
            >
              {createRule.isPending || updateRule.isPending ? 'Saving...' : editingRule ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!ruleToDelete}
        onOpenChange={(open) => !open && setRuleToDelete(null)}
        title="Delete this pricing rule?"
        description={`Base price ₹${ruleToDelete?.baseMinimumPrice} for ${ruleToDelete?.city || 'any city'} will be removed. Existing job postings keep their recorded suggestion.`}
        confirmLabel="Delete"
        destructive
        loading={deleteRule.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
};

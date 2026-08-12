import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, ImagePlus } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAdsList, useCreateAd, useUpdateAd, useToggleAd, useDeleteAd } from '@/hooks/useAds';
import type { Ad } from '@/types';
import type { AdPayload } from '@/api/ads';

const TARGET_OPTIONS: { key: AdPayload['targetAccountType']; label: string }[] = [
  { key: 'all', label: 'Everyone' },
  { key: 'worker', label: 'Workers only' },
  { key: 'employer', label: 'Employers only' },
  { key: 'both', label: "'Both' accounts only" },
];

const targetLabel = (key: Ad['targetAccountType']) => TARGET_OPTIONS.find((o) => o.key === key)?.label ?? key;

const emptyForm: AdPayload = {
  title: '',
  subtitle: '',
  imageUrl: '',
  ctaLabel: 'Learn More',
  ctaUrl: '',
  targetAccountType: 'all',
  isActive: true,
  sortOrder: 0,
};

const fileToDataUri = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const AdsPage = () => {
  const { data: ads, isLoading } = useAdsList();
  const createAd = useCreateAd();
  const updateAd = useUpdateAd();
  const toggleAd = useToggleAd();
  const deleteAd = useDeleteAd();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdPayload>(emptyForm);
  const [adToDelete, setAdToDelete] = useState<Ad | null>(null);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (ad: Ad) => {
    setEditingId(ad._id);
    setForm({
      title: ad.title,
      subtitle: ad.subtitle,
      imageUrl: ad.imageUrl,
      ctaLabel: ad.ctaLabel,
      ctaUrl: ad.ctaUrl,
      targetAccountType: ad.targetAccountType,
      isActive: ad.isActive,
      sortOrder: ad.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleImagePick = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image must be under 3MB.');
      return;
    }
    const dataUri = await fileToDataUri(file);
    setForm((prev) => ({ ...prev, imageUrl: dataUri }));
  };

  const handleSave = () => {
    const onSuccess = () => {
      toast.success(editingId ? 'Ad updated.' : 'Ad created.');
      setDialogOpen(false);
    };
    const onError = () => toast.error(editingId ? 'Failed to update ad.' : 'Failed to create ad.');

    if (editingId) {
      updateAd.mutate({ id: editingId, payload: form }, { onSuccess, onError });
    } else {
      createAd.mutate(form, { onSuccess, onError });
    }
  };

  const handleDelete = () => {
    if (!adToDelete) return;
    deleteAd.mutate(adToDelete._id, {
      onSuccess: () => {
        toast.success('Ad deleted.');
        setAdToDelete(null);
      },
      onError: () => toast.error('Failed to delete ad.'),
    });
  };

  const saving = createAd.isPending || updateAd.isPending;

  return (
    <div>
      <PageHeader
        title="Ads"
        description="Manage the promotional banner shown on the Explore tab's hero section, targeted by account type."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Ad
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !ads?.length ? (
        <p className="text-sm text-muted-foreground">No ads yet — create one to start showing it in the app.</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((ad) => (
                <TableRow key={ad._id}>
                  <TableCell>
                    {ad.imageUrl ? (
                      <img src={ad.imageUrl} alt={ad.title} className="h-12 w-20 rounded object-cover" />
                    ) : (
                      <div className="flex h-12 w-20 items-center justify-center rounded bg-muted text-muted-foreground">
                        <ImagePlus className="h-4 w-4" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{ad.title}</p>
                    <p className="max-w-xs truncate text-xs text-muted-foreground">{ad.subtitle}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{targetLabel(ad.targetAccountType)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch checked={ad.isActive} onCheckedChange={() => toggleAd.mutate(ad._id)} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(ad)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setAdToDelete(ad)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Ad' : 'Add Ad'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Banner image</Label>
              <div className="flex items-center gap-3">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Preview" className="h-16 w-28 rounded object-cover" />
                ) : (
                  <div className="flex h-16 w-28 items-center justify-center rounded border border-dashed text-muted-foreground">
                    <ImagePlus className="h-5 w-5" />
                  </div>
                )}
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  {form.imageUrl ? 'Change image' : 'Upload image'}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImagePick(e.target.files?.[0])}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad-title">Title</Label>
              <Input
                id="ad-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ad-subtitle">Subtitle</Label>
              <Input
                id="ad-subtitle"
                value={form.subtitle}
                onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ad-cta-label">Button label</Label>
                <Input
                  id="ad-cta-label"
                  value={form.ctaLabel}
                  onChange={(e) => setForm((prev) => ({ ...prev, ctaLabel: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-cta-url">Button link (URL)</Label>
                <Input
                  id="ad-cta-url"
                  placeholder="https://..."
                  value={form.ctaUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, ctaUrl: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Show to</Label>
                <Select
                  value={form.targetAccountType}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, targetAccountType: value as AdPayload['targetAccountType'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_OPTIONS.map((opt) => (
                      <SelectItem key={opt.key} value={opt.key}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ad-sort">Sort order</Label>
                <Input
                  id="ad-sort"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="ad-active">Active</Label>
              <Switch
                id="ad-active"
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!form.title || saving}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!adToDelete}
        onOpenChange={(open) => !open && setAdToDelete(null)}
        title="Delete this ad?"
        description={`"${adToDelete?.title}" will stop showing in the app immediately.`}
        confirmLabel="Delete"
        destructive
        loading={deleteAd.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
};

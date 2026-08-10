import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCategoriesList,
  useCreateCategory,
  useToggleCategory,
  useDeleteCategory,
} from '@/hooks/useCategories';
import type { Category } from '@/types';

const CATEGORY_GROUPS = [
  { key: 'labor', name: 'Labor' },
  { key: 'skilled-workers', name: 'Skilled Workers' },
  { key: 'professional', name: 'Professional' },
  { key: 'home-services', name: 'Home Services' },
] as const;

type CategoryGroupKey = (typeof CATEGORY_GROUPS)[number]['key'];

export const CategoriesPage = () => {
  const { data: categories, isLoading } = useCategoriesList();
  const createCategory = useCreateCategory();
  const toggleCategory = useToggleCategory();
  const deleteCategory = useDeleteCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [groupKey, setGroupKey] = useState<CategoryGroupKey>('labor');
  const [icon, setIcon] = useState('briefcase-outline');
  const [color, setColor] = useState('#F45B18');
  const [kycDocumentLabel, setKycDocumentLabel] = useState('Work Document');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const groupedCategories = CATEGORY_GROUPS.map((group) => ({
    ...group,
    items: categories?.filter((category) => category.groupKey === group.key) ?? [],
  }));

  const resetForm = () => {
    setName('');
    setKey('');
    setGroupKey('labor');
    setIcon('briefcase-outline');
    setColor('#F45B18');
    setKycDocumentLabel('Work Document');
  };

  const handleCreate = () => {
    createCategory.mutate(
      { name, key, groupKey, icon, color, kycDocumentLabel },
      {
        onSuccess: () => {
          toast.success('Sub-category created.');
          setDialogOpen(false);
          resetForm();
        },
        onError: () => toast.error('Failed to create sub-category.'),
      }
    );
  };

  const handleDelete = () => {
    if (!categoryToDelete) return;
    deleteCategory.mutate(categoryToDelete._id, {
      onSuccess: () => {
        toast.success('Sub-category deleted.');
        setCategoryToDelete(null);
      },
      onError: () => toast.error('Failed to delete sub-category.'),
    });
  };

  return (
    <div>
      <PageHeader
        title="Category Management"
        description="Manage 4 main categories and their sub-categories platform-wide."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Sub-category
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {groupedCategories.map((group) => (
            <Card key={group.key}>
              <CardContent className="space-y-3 p-4">
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-xs text-muted-foreground">{group.items.length} sub-categories</p>
                </div>
                <div className="space-y-2">
                  {group.items.map((category) => (
                    <div key={category._id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">{category.name}</p>
                        <p className="text-xs text-muted-foreground">key: {category.key}</p>
                        <p className="text-xs text-muted-foreground">
                          doc: {category.kycDocumentLabel || 'Work Document'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={category.isActive}
                          onCheckedChange={() => toggleCategory.mutate(category._id)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setCategoryToDelete(category)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sub-category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Main Category</Label>
              <Select value={groupKey} onValueChange={(value) => setGroupKey(value as CategoryGroupKey)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_GROUPS.map((group) => (
                    <SelectItem key={group.key} value={group.key}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-name">Sub-category Name</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-key">Key (slug)</Label>
              <Input
                id="cat-key"
                value={key}
                onChange={(e) => setKey(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cat-icon">Icon</Label>
                <Input id="cat-icon" value={icon} onChange={(e) => setIcon(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-color">Color</Label>
                <Input id="cat-color" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-doc">Required KYC Document</Label>
              <Input id="cat-doc" value={kycDocumentLabel} onChange={(e) => setKycDocumentLabel(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name || !key || !groupKey || createCategory.isPending}>
              {createCategory.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        title="Delete this sub-category?"
        description={`"${categoryToDelete?.name}" will be removed from the platform.`}
        confirmLabel="Delete"
        destructive
        loading={deleteCategory.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
};

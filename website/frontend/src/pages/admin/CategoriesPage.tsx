import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export const CategoriesPage = () => {
  const { data: categories, isLoading } = useCategoriesList();
  const createCategory = useCreateCategory();
  const toggleCategory = useToggleCategory();
  const deleteCategory = useDeleteCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const handleCreate = () => {
    createCategory.mutate(
      { name, key },
      {
        onSuccess: () => {
          toast.success('Category created.');
          setDialogOpen(false);
          setName('');
          setKey('');
        },
        onError: () => toast.error('Failed to create category.'),
      }
    );
  };

  const handleDelete = () => {
    if (!categoryToDelete) return;
    deleteCategory.mutate(categoryToDelete._id, {
      onSuccess: () => {
        toast.success('Category deleted.');
        setCategoryToDelete(null);
      },
      onError: () => toast.error('Failed to delete category.'),
    });
  };

  return (
    <div>
      <PageHeader
        title="Category Management"
        description="Add, edit, or disable job categories platform-wide."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories?.map((category) => (
            <Card key={category._id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium">{category.name}</p>
                  <p className="text-xs text-muted-foreground">key: {category.key}</p>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Name</Label>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!name || !key || createCategory.isPending}>
              {createCategory.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        title="Delete this category?"
        description={`"${categoryToDelete?.name}" will be removed from the platform.`}
        confirmLabel="Delete"
        destructive
        loading={deleteCategory.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
};

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateJob } from '@/hooks/useJobs';
import type { Job } from '@/types';

interface JobEditDialogProps {
  job: Job | null;
  onOpenChange: (open: boolean) => void;
}

const STATUSES = ['open', 'in-progress', 'completed', 'cancelled'];

export const JobEditDialog = ({ job, onOpenChange }: JobEditDialogProps) => {
  const updateJob = useUpdateJob();
  const [title, setTitle] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [status, setStatus] = useState('open');

  useEffect(() => {
    if (job) {
      setTitle(job.title);
      setPayAmount(String(job.payAmount));
      setStatus(job.status);
    }
  }, [job]);

  if (!job) return null;

  const poster = typeof job.postedBy === 'object' ? job.postedBy.name || job.postedBy.phone : job.postedBy;

  const handleSave = () => {
    updateJob.mutate(
      { id: job._id, payload: { title, payAmount: Number(payAmount), status: status as Job['status'] } },
      {
        onSuccess: () => {
          toast.success('Job updated.');
          onOpenChange(false);
        },
        onError: () => toast.error('Failed to update job.'),
      }
    );
  };

  return (
    <Dialog open={!!job} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
          <DialogDescription>Posted by {poster} · {job.category}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="job-title">Title</Label>
            <Input id="job-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job-pay">Pay amount (₹)</Label>
            <Input
              id="job-pay"
              type="number"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-sm font-medium">Description</p>
            <p className="mt-1 text-sm text-muted-foreground">{job.description}</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateJob.isPending}>
            {updateJob.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

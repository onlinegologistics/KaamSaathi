import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, BadgeCheck, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserDetail, useBlockUser, useUnblockUser, useVerifyUser } from '@/hooks/useUsers';

export const UserDetailPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useUserDetail(id);
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const verifyUser = useVerifyUser();

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const { user, jobsPosted, jobsWorked, ratingsReceived } = data;

  const handleToggleBlock = () => {
    const mutation = user.isBlocked ? unblockUser : blockUser;
    mutation.mutate(user._id, {
      onSuccess: () => toast.success(user.isBlocked ? 'User unblocked.' : 'User blocked.'),
      onError: () => toast.error('Action failed.'),
    });
  };

  const handleVerify = () => {
    verifyUser.mutate(user._id, {
      onSuccess: () => toast.success('User manually verified.'),
      onError: () => toast.error('Failed to verify user.'),
    });
  };

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate('/users')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to users
      </Button>

      <PageHeader
        title={user.name || 'Unnamed user'}
        description={user.phone}
        actions={
          <>
            {!user.aadhaarVerification.isVerified && (
              <Button variant="outline" onClick={handleVerify} disabled={verifyUser.isPending}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Manually Verify
              </Button>
            )}
            <Button
              variant={user.isBlocked ? 'default' : 'destructive'}
              onClick={handleToggleBlock}
              disabled={blockUser.isPending || unblockUser.isPending}
            >
              {user.isBlocked ? 'Unblock User' : 'Block User'}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={user.isBlocked ? 'blocked' : 'active'} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verification</CardTitle>
          </CardHeader>
          <CardContent>
            {user.aadhaarVerification.isVerified ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                <BadgeCheck className="h-4 w-4" /> Aadhaar Verified
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Not verified</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {user.ratingAverage.toFixed(1)} ★ <span className="text-sm font-normal text-muted-foreground">({user.ratingCount})</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jobs Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{user.jobsCompletedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="posted">
        <TabsList>
          <TabsTrigger value="posted">Posted Jobs ({jobsPosted.length})</TabsTrigger>
          <TabsTrigger value="worked">Worked Jobs ({jobsWorked.length})</TabsTrigger>
          <TabsTrigger value="ratings">Ratings Received ({ratingsReceived.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="posted" className="mt-4 space-y-2">
          {jobsPosted.length ? (
            jobsPosted.map((job) => (
              <Card key={job._id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{job.category} · ₹{job.payAmount}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No jobs posted.</p>
          )}
        </TabsContent>

        <TabsContent value="worked" className="mt-4 space-y-2">
          {jobsWorked.length ? (
            jobsWorked.map((job) => (
              <Card key={job._id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{job.category} · ₹{job.payAmount}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No jobs worked.</p>
          )}
        </TabsContent>

        <TabsContent value="ratings" className="mt-4 space-y-2">
          {ratingsReceived.length ? (
            ratingsReceived.map((rating) => (
              <Card key={rating._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{rating.ratedBy?.name || 'Anonymous'}</p>
                    <p className="text-sm font-semibold">{rating.score} ★</p>
                  </div>
                  {rating.comment && <p className="mt-1 text-sm text-muted-foreground">{rating.comment}</p>}
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No ratings yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

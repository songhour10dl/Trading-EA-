import React from 'react';
import { useBotStore } from '../store/botStore';
import { useApi } from '../hooks/useApi';
import { Card, Table, Badge, LoadingSpinner } from '../components/UI';
import { formatDateTime, getStatusColor } from '../utils/formatting';

export const ActivityFeedPage: React.FC = () => {
  const activityFeed = useBotStore((state) => state.activityFeed);
  const { data: allActivities, loading } = useApi('/activity');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const activities = allActivities || activityFeed;

  const tableRows = activities.map((item: any) => [
    <span className="text-xs">{item?.timestamp ? formatDateTime(item.timestamp) : 'N/A'}</span>,
    <Badge
      variant={
        item?.severity === 'error'
          ? 'danger'
          : item?.severity === 'warning'
          ? 'warning'
          : item?.severity === 'success'
          ? 'success'
          : 'info'
      }
    >
      {item?.type ?? 'INFO'}
    </Badge>,
    <span className="font-semibold text-sm">{item?.title ?? 'N/A'}</span>,
    <span className="text-xs text-trading-text-muted">{item?.description ?? 'N/A'}</span>,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Activity Feed</h1>
        <p className="text-trading-text-muted">{activities.length} event(s)</p>
      </div>

      {activities.length === 0 ? (
        <Card>
          <p className="text-trading-text-muted text-center py-8">No activities yet</p>
        </Card>
      ) : (
        <Card>
          <Table
            headers={['Time', 'Type', 'Title', 'Description']}
            rows={tableRows}
          />
        </Card>
      )}
    </div>
  );
};

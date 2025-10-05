import { LuActivity, LuCheck, LuClock, LuX } from 'react-icons/lu';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import type { BatchProcessingStats } from '@/types/batchResults';

interface BatchStatsCardsProps {
  stats: BatchProcessingStats;
}

export function BatchStatsCards({ stats }: BatchStatsCardsProps) {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}時間${minutes}分`;
    }
    return `${minutes}分`;
  };

  const statsData = [
    {
      title: '総処理数',
      value: stats.total_batches.toString(),
      icon: LuActivity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '成功率',
      value: `${stats.success_rate_percentage.toFixed(1)}%`,
      icon: LuCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '失敗数',
      value: stats.failed_batches.toString(),
      icon: LuX,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: '平均処理時間',
      value: formatTime(stats.average_processing_time_seconds),
      icon: LuClock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsData.map((stat) => {
        const IconComponent = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <IconComponent className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.title === '総処理数' && (
                <p className="text-xs text-muted-foreground mt-1">{stats.total_tasks_processed}タスク処理済み</p>
              )}
              {stat.title === '成功率' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.successful_batches}/{stats.total_batches}件成功
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

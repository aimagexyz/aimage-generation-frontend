import { motion } from 'framer-motion';
import { RefreshCw, XCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

interface LoadingAndErrorStatesProps {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function LoadingAndErrorStates({ isLoading, isError, onRetry }: LoadingAndErrorStatesProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-4">
            <div className="space-y-3">
              <Skeleton className="w-3/4 h-4" />
              <Skeleton className="w-1/2 h-3" />
              <Skeleton className="w-2/3 h-3" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <motion.div
        className="p-8 space-y-4 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-destructive/10">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-destructive">読み込みエラー</h3>
          <p className="max-w-md mx-auto text-sm text-muted-foreground">
            RPDの読み込み中にエラーが発生しました。ネットワーク接続を確認して、もう一度お試しください。
          </p>
        </div>
        <Button variant="outline" onClick={onRetry} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          再試行
        </Button>
      </motion.div>
    );
  }

  return null;
}

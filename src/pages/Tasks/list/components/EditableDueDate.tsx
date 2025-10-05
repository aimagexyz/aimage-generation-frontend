import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { LuCalendarDays, LuCheck } from 'react-icons/lu';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { useUpdateTask } from '@/hooks/useUpdateTask';

interface EditableDueDateProps {
  taskId: string;
  dueDate: string | null | undefined;
}

export function EditableDueDate({ taskId, dueDate }: Readonly<EditableDueDateProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(dueDate ? new Date(dueDate) : undefined);
  const { mutate: updateTask, isPending } = useUpdateTask();

  const handleUpdate = () => {
    if (!selectedDate) {
      toast.error('日付を選択してください。');
      return;
    }
    updateTask(
      { taskId, taskData: { due_date: selectedDate.toISOString() } },
      {
        onSuccess: () => {
          toast.success('戻し予定日を更新しました。');
          setIsOpen(false);
        },
        onError: () => {
          toast.error('更新に失敗しました。');
        },
      },
    );
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start font-normal h-8 px-2">
          <LuCalendarDays className="mr-2 h-4 w-4 text-gray-500" />
          {dueDate ? (
            <span className="text-sm text-gray-700">{format(new Date(dueDate), 'yyyy/MM/dd')}</span>
          ) : (
            <span className="text-sm text-gray-400 italic">未設定</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={ja}
          captionLayout="dropdown"
        />
        <div className="p-2 border-t border-gray-200">
          <Button onClick={handleUpdate} disabled={isPending} size="sm" className="w-full">
            <LuCheck className="mr-2 h-4 w-4" />
            {isPending ? '更新中...' : '更新'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

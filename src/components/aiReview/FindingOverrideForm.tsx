import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { useOverrideFinding } from '@/hooks/aiReview/useOverrideFinding';
import {
  type AiReviewFindingEntryInDB,
  type AiReviewFindingHumanOverrideCreate,
  FindingStatus as FindingStatusEnum,
  Severity as SeverityEnum,
} from '@/types/AiReviewFinding';

// Zod schema for form validation
const overrideSchema = z.object({
  findingKey: z.string().min(1, 'Finding key is required'),
  severity: z.nativeEnum(SeverityEnum),
  description: z.string().min(1, 'Description is required'),
  suggestion: z.string().optional(),
  additionalNotes: z.string().optional(),
  status: z.nativeEnum(FindingStatusEnum).optional(),
});

type OverrideFormValues = z.infer<typeof overrideSchema>;

interface FindingOverrideFormProps {
  originalFinding: AiReviewFindingEntryInDB;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const severityOptions = Object.values(SeverityEnum).map((s) => ({ value: s, label: s }));
const statusOptions = Object.values(FindingStatusEnum).map((s) => ({
  value: s,
  label: s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
}));

export function FindingOverrideForm({ originalFinding, onSuccess, onCancel }: FindingOverrideFormProps): JSX.Element {
  const overrideMutation = useOverrideFinding();
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      findingKey: originalFinding.findingKey,
      severity: originalFinding.severity,
      description: originalFinding.description,
      suggestion: originalFinding.suggestion || '',
      additionalNotes: originalFinding.additionalNotes || '',
      status: originalFinding.status,
    },
  });

  const onSubmit = (data: OverrideFormValues) => {
    const submissionData: AiReviewFindingHumanOverrideCreate = {
      description: data.description,
      severity: data.severity,
      suggestion: data.suggestion,
      area: originalFinding.area || { bounding_box: [0, 0, 0, 0] },
      reference_source: data.additionalNotes,
      status: data.status || originalFinding.status,
    };
    overrideMutation.mutate(
      { originalAiFindingId: originalFinding.id, data: submissionData },
      {
        onSuccess: () => {
          reset();
          onSuccess?.();
        },
      },
    );
  };

  return (
    <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4 p-1">
      <div>
        <Label htmlFor="findingKey">Finding Key</Label>
        <Controller name="findingKey" control={control} render={({ field }) => <Input id="findingKey" {...field} />} />
        {errors.findingKey && <p className="text-xs text-red-500">{errors.findingKey.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => <TextArea id="description" {...field} />}
        />
        {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="severity">Severity</Label>
          <Controller
            name="severity"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.severity && <p className="text-xs text-red-500">{errors.severity.message}</p>}
        </div>
        <div>
          <Label htmlFor="status">Status (Optional for Override)</Label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.status && <p className="text-xs text-red-500">{errors.status.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="suggestion">Suggestion (Optional)</Label>
        <Controller
          name="suggestion"
          control={control}
          render={({ field }) => <TextArea id="suggestion" {...field} />}
        />
      </div>

      <div>
        <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
        <Controller
          name="additionalNotes"
          control={control}
          render={({ field }) => <TextArea id="additionalNotes" {...field} />}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={overrideMutation.isPending}>
          {overrideMutation.isPending ? 'Overriding...' : 'Save Override'}
        </Button>
      </div>
      {overrideMutation.isError && (
        <p className="text-sm text-red-600 mt-2 text-center">Error: {overrideMutation.error?.message}</p>
      )}
    </form>
  );
}

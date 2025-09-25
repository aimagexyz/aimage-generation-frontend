import { Button } from '@/components/ui/Button';
import { useInitiateAiReview } from '@/hooks/aiReview/useInitiateAiReview'; // Adjusted path based on hook location

interface InitiateAiReviewButtonProps {
  subtaskId: string;
  // onReviewInitiated?: (aiReviewId: string) => void; // Optional callback
  // disabled?: boolean; // Allow external disabling
  // existingReviewId?: string; // To change text to "Re-initiate" if needed
}

function InitiateAiReviewButton({ subtaskId }: InitiateAiReviewButtonProps): JSX.Element {
  const initiateReviewMutation = useInitiateAiReview();

  const handleClick = () => {
    initiateReviewMutation.mutate(
      { subtaskId },
      // {
      //   onSuccess: (data) => {
      //     if (onReviewInitiated) {
      //       onReviewInitiated(data.id);
      //     }
      //   },
      // }
    );
  };

  // const buttonText = existingReviewId ? 'Re-initiate AI Review' : 'Initiate AI Review';
  const buttonText = 'Initiate AI Review';

  return (
    <Button
      onClick={handleClick}
      disabled={initiateReviewMutation.isPending /* || disabled */}
      size="sm" // Or default
    >
      {initiateReviewMutation.isPending ? 'Initiating Review...' : buttonText}
    </Button>
  );
}

export default InitiateAiReviewButton;

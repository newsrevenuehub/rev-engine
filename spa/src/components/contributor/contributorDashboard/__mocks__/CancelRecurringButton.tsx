export function CancelRecurringButton({ contribution, onCancel }: any) {
  return (
    <button
      data-testid="mock-cancel-recurring-button"
      data-contribution-id={contribution.id}
      onClick={() => onCancel(contribution)}
    >
      onCancelRecurring
    </button>
  );
}

export default CancelRecurringButton;

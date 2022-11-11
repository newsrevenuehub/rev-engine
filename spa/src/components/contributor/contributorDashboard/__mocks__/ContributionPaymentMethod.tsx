export function ContributionPaymentMethod({ contribution, onUpdateComplete }: any) {
  return (
    <button
      data-testid="mock-contribution-payment-method"
      data-contribution-id={contribution.id}
      onClick={() => onUpdateComplete(contribution)}
    >
      onUpdateComplete
    </button>
  );
}

export default ContributionPaymentMethod;

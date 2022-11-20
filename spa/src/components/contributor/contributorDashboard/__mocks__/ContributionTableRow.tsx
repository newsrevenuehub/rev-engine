export function ContributionTableRow({ contribution, onCancelRecurring, onUpdateRecurringComplete }: any) {
  return (
    <tr data-testid="mock-contribution-table-row" data-contribution-id={contribution.id}>
      <td>
        <button onClick={() => onCancelRecurring(contribution)}>onCancelRecurring</button>
      </td>
      <td>
        <button onClick={() => onUpdateRecurringComplete(contribution)}>onUpdateRecurringComplete</button>
      </td>
    </tr>
  );
}

export default ContributionTableRow;

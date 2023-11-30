function EditRecurringPaymentModal(props) {
  return (
    <div data-testid="mock-edit-recurring-payment-modal" data-is-open={props.isOpen}>
      <button onClick={props.closeModal}>closeModal</button>
      <button onClick={props.onComplete}>onComplete</button>
    </div>
  );
}

export default EditRecurringPaymentModal;

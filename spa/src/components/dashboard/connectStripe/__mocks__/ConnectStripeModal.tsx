export const ConnectStripeModal = ({ onClose, onConnectStripe }: any) => (
  <div data-testid="mock-connect-stripe-modal">
    <button onClick={onClose}>onClose</button>
    <button onClick={onConnectStripe}>onConnectStripe</button>
  </div>
);

export default ConnectStripeModal;

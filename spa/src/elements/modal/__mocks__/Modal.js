function Modal({ children, isOpen, closeModal }) {
  if (!isOpen) {
    return <div data-testid="modal-closed" />;
  }

  return (
    <div data-testid="modal-open">
      <button onClick={closeModal}>close modal</button>
      {children}
    </div>
  );
}

export default Modal;

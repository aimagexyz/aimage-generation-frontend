import { useCallback, useMemo, useRef } from 'react';

type ModalProps = React.ComponentPropsWithoutRef<'dialog'>;

export function useModal() {
  const modalRef = useRef<HTMLDialogElement>(null);

  const showModal = useCallback(() => modalRef.current?.showModal(), []);
  const closeModal = useCallback(() => modalRef.current?.close(), []);

  function Dialog(props: ModalProps) {
    const { children, ...restProps } = props;
    return (
      <dialog {...restProps} ref={modalRef}>
        {children}
      </dialog>
    );
  }
  Dialog.displayName = 'Modal';

  const value = useMemo(() => ({ modalRef, Modal: Dialog, showModal, closeModal }), [closeModal, showModal]);

  return value;
}

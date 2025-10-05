import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/Toast';

import { useToast } from './use-toast';

export function ModalToaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 w-full max-w-[420px]">
        {toasts.map(({ id, title, description, action, ...props }) => {
          return (
            <Toast key={id} {...props}>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {!!description && <ToastDescription>{description}</ToastDescription>}
              </div>
              {action}
              <ToastClose />
            </Toast>
          );
        })}
      </div>
      <ToastViewport />
    </ToastProvider>
  );
}

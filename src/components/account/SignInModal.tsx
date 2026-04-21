import { SignInButton } from "@/components/common/SignInButton.tsx";
import { Modal } from "@/components/common/Modal.tsx";
import { useRef } from "react";

export function SignInModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const signInRef = useRef<HTMLButtonElement>(null);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Sign in to get access"
    >
      <div className="text-base-content/75 mb-4">
        Use your Innopolis account to access all features of this service.
      </div>
      <SignInButton ref={signInRef} />
    </Modal>
  );
}

import { Modal } from "@/components/common/Modal.tsx";
import { Trans, useLingui } from "@lingui/react/macro";

export function SportCheckinRulesModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useLingui();
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t`Checked in successfully!`}
      containerClassName="gap-4"
    >
      <div className="flex flex-col gap-3 text-sm">
        <p>
          <Trans>
            Please cancel your check-in in advance if you are unable to attend
            the training session.
          </Trans>
        </p>
        <p>
          <Trans>
            Missing a training session may lead to certain consequences,
            including temporary restrictions on future training check-ins.
          </Trans>
        </p>
        <p>
          <Trans>
            Your university pass grants access only to the sessions you have
            checked in for. In case of misuse of the university pass, you may be
            subject to sanctions, including a monetary fine from the sports
            complex and disciplinary action from the university.
          </Trans>
        </p>
        <p className="font-bold">
          <Trans>Please don&apos;t forget a change of shoes.</Trans>
        </p>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onOpenChange(false)}
        >
          <Trans>Okay</Trans>
        </button>
      </div>
    </Modal>
  );
}

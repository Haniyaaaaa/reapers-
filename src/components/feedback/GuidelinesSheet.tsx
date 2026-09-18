import { ConfirmSheet } from './ConfirmSheet';

/** Shown once per community/room (tracked in useUiStore.seenGuidelines) the first time a
 * user joins it — acknowledgement gates the join itself, it isn't just informational. */
export function GuidelinesSheet({
  visible,
  onAccept,
  onClose,
}: {
  visible: boolean;
  onAccept: () => void;
  onClose: () => void;
}) {
  return (
    <ConfirmSheet
      visible={visible}
      danger={false}
      title="Community Guidelines"
      body="Be respectful. Nudity, harassment, hate speech, and other abusive content are not allowed here. Violations may result in removal from the community."
      confirmLabel="I understand, continue"
      onConfirm={onAccept}
      onClose={onClose}
    />
  );
}

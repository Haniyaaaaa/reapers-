import { ConfirmSheet } from './ConfirmSheet';

const GENERIC_BODY =
  'Be respectful. Nudity, harassment, hate speech, and other abusive content are not allowed here. Violations may result in removal from the community.';

/** Shown once per community/room (tracked in useUiStore.seenGuidelines) the first time a
 * user joins it — acknowledgement gates the join itself, it isn't just informational.
 * Shows the community's own rules (set by its creator, CreateCommunityScreen) when it has
 * any; otherwise falls back to the generic app-wide guidelines. */
export function GuidelinesSheet({
  visible,
  communityName,
  rules,
  onAccept,
  onClose,
}: {
  visible: boolean;
  communityName?: string;
  rules?: string;
  onAccept: () => void;
  onClose: () => void;
}) {
  const hasCustomRules = !!rules?.trim();
  return (
    <ConfirmSheet
      visible={visible}
      danger={false}
      title={hasCustomRules ? `${communityName ?? 'Community'} rules` : 'Community Guidelines'}
      body={hasCustomRules ? rules!.trim() : GENERIC_BODY}
      confirmLabel="I understand, continue"
      onConfirm={onAccept}
      onClose={onClose}
    />
  );
}

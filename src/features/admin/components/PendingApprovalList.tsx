import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { PrimaryButton } from '../../../components/buttons/PrimaryButton';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';
import type { ProfileRow } from '../../../services/supabase/types';
import { ApprovalCard } from './ApprovalCard';
import { getCyberAvatarSource } from '../../../data/cyberAvatars';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';

export function PendingApprovalList({
  people,
  onApprove,
  onReject,
  onViewDetails,
  emptyLabel,
  hasMore,
  onLoadMore,
}: {
  people: ProfileRow[];
  onApprove: (userId: string) => Promise<void>;
  onReject: (userId: string, reason: string) => Promise<void>;
  onViewDetails: (userId: string) => void;
  emptyLabel: string;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const { colors } = useTheme();
  const [rejecting, setRejecting] = useState<ProfileRow | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <>
      {people.length === 0 ? <Text style={[styles.emptyText, { color: colors.muted }]}>{emptyLabel}</Text> : null}
      {people.map((p) => (
        <ApprovalCard
          key={p.id}
          avatar={p.avatar_uri ? { uri: p.avatar_uri } : getCyberAvatarSource(p.avatar_id ?? undefined)}
          title={p.first_name || p.last_name ? `${p.first_name} ${p.last_name}`.trim() : p.display_name}
          subtitle={`@${p.username}`}
          badge={p.roles[0] ?? 'member'}
          busy={busy === p.id}
          onViewDetails={() => onViewDetails(p.id)}
          onApprove={async () => {
            setBusy(p.id);
            await onApprove(p.id);
            setBusy(null);
          }}
          onReject={() => {
            setReason('');
            setRejecting(p);
          }}
        />
      ))}

      <LoadMoreButton hasMore={hasMore} onPress={onLoadMore} />

      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <Pressable style={styles.backdrop} onPress={() => setRejecting(null)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface, borderColor: colors.danger, borderWidth: 1 }]} onPress={() => undefined}>
            <Text style={styles.modalTitle}>
              Reject {rejecting?.username}?
            </Text>
            <AuthTextField label="Reason (shown to the user)" value={reason} onChangeText={setReason} multiline />
            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                label="Reject"
                onPress={async () => {
                  if (!rejecting) return;
                  setBusy(rejecting.id);
                  await onReject(rejecting.id, reason.trim());
                  setBusy(null);
                  setRejecting(null);
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  emptyText: {
    color: '#8E9BB5',
    fontFamily: fonts.body,
    paddingVertical: 12,
  },
  cardInner: {
    padding: 14,
    gap: 4,
  },
  nameText: {
    fontFamily: fonts.display,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: '#8E9BB5',
  },
  viewDetailsText: {
    fontFamily: fonts.bodySemi,
    fontSize: 12.5,
    color: '#00E5FF',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionBtnTouch: {
    flex: 1,
    height: 38,
  },
  btnInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  rejectBtnText: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    fontWeight: '700',
    color: '#FF4D6D',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  modalSheet: {
    borderRadius: 12,
    padding: 20,
    backgroundColor: '#0E1423',
    borderColor: 'rgba(255, 77, 109, 0.4)',
    borderWidth: 1,
  },
  modalTitle: {
    color: '#FF4D6D',
    fontFamily: fonts.display,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
});

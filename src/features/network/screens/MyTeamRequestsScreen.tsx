import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { TeamRequestCard } from '../../../components/cards/TeamRequestCard';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { ConfirmSheet } from '../../../components/feedback/ConfirmSheet';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { Skeleton } from '../../../components/feedback/Skeleton';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { TeamFilterSheet } from '../../../components/network/TeamFilterSheet';
import { useAuth } from '../../../hooks/useAuth';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import type { MainStackParamList } from '../../../navigation/types';
import { useNetworkStore } from '../../../store/networkStore';
import { useProfilePreviewStore } from '../../../store/profilePreviewStore';
import { fonts, useTheme } from '../../../theme';
import type { TeamRequest } from '../../../types/extra';
import { errorMessage } from '../../../utils/errorMessage';
import { EMPTY_TEAM_FILTERS, matchesTeamFilters, teamFilterCount, type TeamFilterSelection } from '../../../utils/teamRequest';

/** Team requests I posted — same cards as Find teammates, with search + the same filters, plus
 * applicant counts and edit / delete. */
export function MyTeamRequestsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const myTeams = useNetworkStore((s) => s.myTeams);
  const loading = useNetworkStore((s) => s.myTeamsLoading);
  const fetchMyTeams = useNetworkStore((s) => s.fetchMyTeams);
  const deleteTeam = useNetworkStore((s) => s.deleteTeam);

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<TeamFilterSelection>(EMPTY_TEAM_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleting, setDeleting] = useState<TeamRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');
  const activeFilterCount = teamFilterCount(filters);

  useEffect(() => {
    if (user) fetchMyTeams(user.id);
  }, [user, fetchMyTeams]);

  const refreshControl = useRefreshControl(async () => {
    if (user) await fetchMyTeams(user.id);
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myTeams.filter((t) => {
      if (!matchesTeamFilters(t, filters)) return false;
      if (!q) return true;
      return (
        t.project.toLowerCase().includes(q) ||
        t.excerpt.toLowerCase().includes(q) ||
        (t.studio ?? '').toLowerCase().includes(q) ||
        (t.engine ?? '').toLowerCase().includes(q) ||
        (t.location ?? '').toLowerCase().includes(q) ||
        t.roles.some((r) => r.toLowerCase().includes(q))
      );
    });
  }, [myTeams, search, filters]);

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setDeleteErr('');
    try {
      await deleteTeam(deleting.id);
      setDeleting(null);
    } catch (e) {
      setDeleteErr(errorMessage(e, 'Could not delete this request.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshControl={refreshControl}>
      <ScreenHeader
        title="My team requests"
        onBack={() => nav.goBack()}
        right={
          <Pressable onPress={() => nav.navigate('PostTeamRequest')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Post a team request">
            <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
          </Pressable>
        }
      />

      {/* Search + filter, same look as Find teammates */}
      <View style={styles.searchRow}>
        <CyberCutBox cutSize={10} radius={6} fill={colors.inputFill} borderColor={colors.inputBorder} borderWidth={1} style={styles.searchBox}>
          <View style={styles.searchInner}>
            <Ionicons name="search-outline" size={18} color={colors.muted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search my requests..."
              placeholderTextColor={colors.muted2}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="Clear search">
                <Ionicons name="close-circle" size={18} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </CyberCutBox>

        <Pressable onPress={() => setFilterOpen(true)} style={styles.filterBtn} accessibilityRole="button" accessibilityLabel="Filter options">
          <CyberCutBox cutSize={10} radius={6} fill={colors.cardFill} borderColor={colors.cardBorder} borderWidth={1} style={styles.filterCut}>
            <View style={styles.filterInner}>
              <Ionicons name="options-outline" size={20} color={colors.electricAccent} />
              {activeFilterCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </View>
          </CyberCutBox>
        </Pressable>
      </View>

      {loading && myTeams.length === 0 ? <Skeleton width="100%" height={220} /> : null}
      {!loading && myTeams.length === 0 ? (
        <EmptyState title="You haven't posted a team request yet." actionLabel="Post a request" onAction={() => nav.navigate('PostTeamRequest')} />
      ) : null}
      {!loading && myTeams.length > 0 && visible.length === 0 ? (
        <EmptyState
          title="No requests match your search or filters."
          actionLabel={activeFilterCount > 0 ? 'Clear filters' : undefined}
          onAction={activeFilterCount > 0 ? () => setFilters(EMPTY_TEAM_FILTERS) : undefined}
        />
      ) : null}

      {visible.map((t) => (
        <TeamRequestCard
          key={t.id}
          team={t}
          score={0}
          applied={false}
          onApply={() => undefined}
          onPosterPress={() => user && useProfilePreviewStore.getState().open(user.id)}
          onPress={() => nav.navigate('TeamRequestDetail', { id: t.id })}
          owner={{
            applicantCount: t.applicantCount ?? 0,
            onApplicants: () => nav.navigate('TeamRequestApplicants', { teamRequestId: t.id }),
            onEdit: () => nav.navigate('PostTeamRequest', { editId: t.id }),
            onDelete: () => {
              setDeleteErr('');
              setDeleting(t);
            },
          }}
        />
      ))}

      <TeamFilterSheet visible={filterOpen} value={filters} onApply={setFilters} onClose={() => setFilterOpen(false)} />

      <ConfirmSheet
        visible={!!deleting}
        title="Delete this request?"
        body={deleteErr || "It's removed from Find teammates and its applicants are cleared. This can't be undone."}
        confirmLabel={busy ? 'Deleting…' : 'Delete'}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  searchBox: { flex: 1, height: 48 },
  searchInner: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, paddingVertical: 0 },
  filterBtn: { width: 48, height: 48 },
  filterCut: { width: 48, height: 48 },
  filterInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 4, backgroundColor: '#D83CFF', alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.monoBold, fontSize: 9, color: '#FFFFFF' },
});

import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { AdminStackParamList } from '../../../navigation/types';
import { AuthTextField } from '../../../components/inputs/AuthTextField';
import { Screen } from '../../../components/layout/Screen';
import { ScreenHeader } from '../../../components/layout/ScreenHeader';
import { CyberBackground } from '../../../components/cyber/CyberBackground';
import { CyberCutBox } from '../../../components/cyber/CyberCutBox';
import { useRefreshControl } from '../../../hooks/useRefreshControl';
import { useAdminStore } from '../../../store/adminStore';
import { fonts } from '../../../theme';
import { useTheme } from '../../../theme/useTheme';
import { LoadMoreButton } from '../../../components/feedback/LoadMoreButton';
import type { Role } from '../../../types/user';
import type { ApprovalStatus } from '../../../services/supabase/types';
import type { ProfileRow } from '../../../services/supabase/types';

const ROLE_FILTERS: (Role | 'all')[] = ['all', 'gamer', 'developer', 'expert'];
const STATUS_FILTERS: (ApprovalStatus | 'all')[] = ['all', 'pending', 'approved', 'rejected'];

export function AdminUsersScreen() {
  const nav = useNavigation<NativeStackNavigationProp<AdminStackParamList>>();
  const { colors } = useTheme();
  const users = useAdminStore((s) => s.users);
  const usersHasMore = useAdminStore((s) => s.usersHasMore);
  const usersTotalCount = useAdminStore((s) => s.usersTotalCount);
  const userFilters = useAdminStore((s) => s.userFilters);
  const setUserFilters = useAdminStore((s) => s.setUserFilters);
  const fetchUsers = useAdminStore((s) => s.fetchUsers);
  const loadMoreUsers = useAdminStore((s) => s.loadMoreUsers);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFilters]);

  const refreshControl = useRefreshControl(fetchUsers);
  const runSearch = () => setUserFilters({ ...userFilters, search: search.trim() || undefined });

  const renderRow = ({ item: u }: { item: ProfileRow }) => (
    <Pressable onPress={() => nav.navigate('AdminUserDetail', { id: u.id })} accessibilityRole="button" style={{ marginBottom: 10 }}>
      <CyberCutBox
        cutSize={10}
        radius={8}
        fill={colors.cardFill}
        borderColor={colors.cardBorder}
        borderWidth={0.88}
        style={{ width: '100%' }}
      >
        <View style={styles.cardInner}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.nameText, { color: colors.text }]}>{u.display_name}</Text>
            <Text style={[styles.metaText, { color: colors.muted }]}>
              @{u.username} · {u.roles.join(', ') || 'no role'}
            </Text>
          </View>
          <Text
            style={[
              styles.statusText,
              {
                color: u.approval_status === 'approved' ? colors.primary : u.approval_status === 'rejected' ? colors.danger : colors.muted,
              },
            ]}
          >
            {u.approval_status}
          </Text>
        </View>
      </CyberCutBox>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CyberBackground showArtwork={false} />

      <Screen scroll={false}>
        <FlatList
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={refreshControl}
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderRow}
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            <>
              <ScreenHeader title="All Users" />

              <AuthTextField label="Search username or name" value={search} onChangeText={setSearch} onBlur={runSearch} autoCapitalize="none" />

              <Text style={[styles.filterLabel, { color: colors.muted }]}>Role</Text>
              <View style={styles.filterRow}>
                {ROLE_FILTERS.map((r) => {
                  const on = (userFilters.role ?? 'all') === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setUserFilters({ ...userFilters, role: r === 'all' ? undefined : r })}
                      style={styles.chipBtnTouch}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <CyberCutBox
                        gradient={on}
                        cutSize={6}
                        radius={4}
                        fill={on ? undefined : colors.cardFill}
                        borderColor={on ? undefined : colors.cardBorder}
                        borderWidth={on ? 0 : 0.88}
                        style={{ width: '100%', height: 34 }}
                      >
                        <View style={styles.chipInner}>
                          <Text style={[styles.chipText, { color: on ? '#FFFFFF' : colors.muted }, on && styles.chipTextActive]}>{r}</Text>
                        </View>
                      </CyberCutBox>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.filterLabel, { color: colors.muted }]}>Status</Text>
              <View style={styles.filterRow}>
                {STATUS_FILTERS.map((s) => {
                  const on = (userFilters.approvalStatus ?? 'all') === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setUserFilters({ ...userFilters, approvalStatus: s === 'all' ? undefined : s })}
                      style={styles.chipBtnTouch}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                    >
                      <CyberCutBox
                        gradient={on}
                        cutSize={6}
                        radius={4}
                        fill={on ? undefined : colors.cardFill}
                        borderColor={on ? undefined : colors.cardBorder}
                        borderWidth={on ? 0 : 0.88}
                        style={{ width: '100%', height: 34 }}
                      >
                        <View style={styles.chipInner}>
                          <Text style={[styles.chipText, { color: on ? '#FFFFFF' : colors.muted }, on && styles.chipTextActive]}>{s}</Text>
                        </View>
                      </CyberCutBox>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ height: 12 }} />
              {users.length === 0 ? <Text style={[styles.emptyText, { color: colors.muted }]}>No users match.</Text> : null}
            </>
          }
          ListFooterComponent={
            users.length > 0 ? (
              <View>
                <LoadMoreButton hasMore={usersHasMore} onPress={loadMoreUsers} />
                <Text style={[styles.paginationText, { color: colors.muted2 }]}>
                  Showing {users.length} of {usersTotalCount.toLocaleString()} users
                </Text>
              </View>
            ) : null
          }
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090F1C',
  },
  filterLabel: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    letterSpacing: 0.8,
    color: '#8E9BB5',
    marginTop: 14,
    marginBottom: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipBtnTouch: {
    flex: 1,
    height: 34,
  },
  chipInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#8E9BB5',
    textTransform: 'capitalize',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    color: '#8E9BB5',
    fontFamily: fonts.body,
    paddingVertical: 12,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
    marginTop: 2,
  },
  statusText: {
    fontFamily: fonts.monoBold,
    fontSize: 11,
    textTransform: 'capitalize',
  },
  paginationText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: '#60718F',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
});

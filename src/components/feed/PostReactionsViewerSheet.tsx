import { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CutAvatar } from '../avatars/CutAvatar';
import { resolveAvatarSource } from '../../data/cyberAvatars';
import { getPostReactionsDetail, ReactionDetail } from '../../services/supabase/posts';
import { useProfilePreviewStore } from '../../store/profilePreviewStore';
import { fonts, useTheme } from '../../theme';

interface PostReactionsViewerSheetProps {
  postId: string | null;
  onClose: () => void;
}

const SHEET_HEIGHT = 500;

export function PostReactionsViewerSheet({ postId, onClose }: PostReactionsViewerSheetProps) {
  const { colors, light } = useTheme();
  const insets = useSafeAreaInsets();
  
  const [loading, setLoading] = useState(false);
  const [reactions, setReactions] = useState<ReactionDetail[]>([]);
  const [activeTab, setActiveTab] = useState<string>('All'); // 'All' or specific emoji

  useEffect(() => {
    if (!postId) {
      setReactions([]);
      setActiveTab('All');
      return;
    }
    
    let active = true;
    setLoading(true);
    getPostReactionsDetail(postId).then((res) => {
      if (active) {
        setReactions(res);
        setLoading(false);
      }
    }).catch(err => {
      console.warn('Failed to load reactions', err);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [postId]);

  const tabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reactions) {
      counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    }
    
    const res = [{ id: 'All', label: `All ${reactions.length}` }];
    for (const [emoji, count] of counts.entries()) {
      res.push({ id: emoji, label: `${emoji} ${count}` });
    }
    return res;
  }, [reactions]);

  const filteredReactions = useMemo(() => {
    if (activeTab === 'All') return reactions;
    return reactions.filter(r => r.emoji === activeTab);
  }, [reactions, activeTab]);

  const renderItem = ({ item }: { item: ReactionDetail }) => (
    <View style={[styles.userRow, { borderBottomColor: light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)' }]}>
      <Pressable
        style={styles.userPressable}
        onPress={() => {
          onClose();
          useProfilePreviewStore.getState().open(item.userId);
        }}
      >
        <CutAvatar
          source={resolveAvatarSource(item.avatarUri, item.avatarId)}
          size={40}
          cut={8}
          borderColor={light ? 'rgba(0,0,0,0.1)' : 'rgba(192, 132, 252, 0.35)'}
          borderWidth={1}
          fill={light ? '#FFF' : 'rgba(168, 85, 247, 0.2)'}
        />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>{item.userName}</Text>
        </View>
        <View style={styles.emojiBadge}>
          <Text style={styles.emojiBadgeText}>{item.emoji}</Text>
        </View>
      </Pressable>
    </View>
  );

  return (
    <Modal visible={!!postId} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable 
          style={[
            styles.sheet, 
            { 
              height: SHEET_HEIGHT, 
              backgroundColor: light ? '#FFFFFF' : '#0E1423',
              borderColor: light ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.12)' 
            }
          ]} 
          onPress={() => undefined}
        >
          <View style={styles.grabberRow}>
            <View style={[styles.grabber, { backgroundColor: light ? 'rgba(0,0,0,0.2)' : 'rgba(255, 255, 255, 0.2)' }]} />
          </View>
          
          <View style={[styles.header, { borderBottomColor: light ? 'rgba(0,0,0,0.08)' : 'rgba(255, 255, 255, 0.08)' }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Reactions</Text>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={8}>
              <Ionicons name="close" size={22} color={light ? '#64748B' : '#94A3B8'} />
            </Pressable>
          </View>

          {reactions.length > 0 && (
            <View style={[styles.tabsRow, { borderBottomColor: light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }]}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={tabs}
                keyExtractor={t => t.id}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
                renderItem={({ item }) => {
                  const active = activeTab === item.id;
                  return (
                    <Pressable
                      onPress={() => setActiveTab(item.id)}
                      style={[
                        styles.tabBtn,
                        {
                          backgroundColor: active 
                            ? (light ? '#F1F5F9' : 'rgba(255,255,255,0.1)') 
                            : 'transparent'
                        }
                      ]}
                    >
                      <Text style={[
                        styles.tabText, 
                        { color: active ? colors.text : (light ? '#64748B' : '#94A3B8') }
                      ]}>{item.label}</Text>
                    </Pressable>
                  );
                }}
              />
            </View>
          )}

          <FlatList
            data={filteredReactions}
            keyExtractor={r => r.userId + r.emoji}
            renderItem={renderItem}
            contentContainerStyle={[styles.list, { paddingBottom: Math.max(20, insets.bottom) }]}
            ListEmptyComponent={
              loading ? <Text style={[styles.emptyText, { color: light ? '#64748B' : '#94A3B8' }]}>Loading...</Text> 
                      : <Text style={[styles.emptyText, { color: light ? '#64748B' : '#94A3B8' }]}>No reactions yet.</Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  grabberRow: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  grabber: { width: 36, height: 4, borderRadius: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: fonts.bodySemi, fontSize: 16, fontWeight: '700' },
  tabsRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tabText: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  list: { paddingVertical: 8 },
  emptyText: { textAlign: 'center', marginTop: 32, fontFamily: fonts.body, fontSize: 14 },
  userRow: { borderBottomWidth: 1 },
  userPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  userInfo: { flex: 1 },
  userName: { fontFamily: fonts.bodySemi, fontSize: 15 },
  emojiBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBadgeText: { fontSize: 16 },
});

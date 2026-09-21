import type { ImageSourcePropType } from 'react-native';
import type { Chatroom } from '../types/chat';
import { brandLogo } from './brand';
import { resolveAvatarSource } from './cyberAvatars';
import { avatarUriFor } from './gamerAvatars';

/** Single source of truth for a room's picture so the Messages list and the open chat's header
 * always agree: DMs show the other person's real avatar, rooms show their own image, and only
 * the global room shows the Reapers logo. */
export function roomAvatarSource(room: Pick<Chatroom, 'id' | 'kind' | 'name' | 'logo' | 'avatar' | 'avatarId'> | undefined): ImageSourcePropType {
  if (!room) return brandLogo;
  if (room.kind === 'global' || room.id === 'g-general') return brandLogo;
  if (room.logo) return room.logo;
  if (room.kind === 'dm') return resolveAvatarSource(room.avatar, room.avatarId);
  if (room.avatar) return { uri: room.avatar };
  return { uri: avatarUriFor(undefined, room.name) };
}

import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** Live keyboard height and the screen-Y of its top edge (0 / null when hidden). */
export function useKeyboard(): { height: number; top: number | null } {
  const [state, setState] = useState<{ height: number; top: number | null }>({ height: 0, top: null });
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setState({ height: e.endCoordinates.height, top: e.endCoordinates.screenY }));
    const hide = Keyboard.addListener(hideEvt, () => setState({ height: 0, top: null }));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return state;
}

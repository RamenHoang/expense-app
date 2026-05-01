import { useRef, useCallback, useMemo } from 'react';
import { Animated, Easing } from 'react-native';

export function useContentTransition(duration = 350) {
  const anim = useRef(new Animated.Value(0)).current;
  const hasPlayedOnce = useRef(false);

  const play = useCallback(() => {
    // Only animate on the very first load — subsequent data refreshes
    // update content in-place without resetting opacity to 0.
    if (hasPlayedOnce.current) return;
    hasPlayedOnce.current = true;

    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  // Memoize so anim.interpolate() is not called on every render.
  const animatedStyle = useMemo(() => ({
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  }), [anim]);

  return { play, animatedStyle };
}

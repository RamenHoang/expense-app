import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';

export function useContentTransition(duration = 350) {
  const anim = useRef(new Animated.Value(0)).current;

  const play = useCallback(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  const animatedStyle = {
    opacity: anim,
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  };

  return { play, animatedStyle };
}

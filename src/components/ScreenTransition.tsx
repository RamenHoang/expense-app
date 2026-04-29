import React, { useEffect } from 'react';
import { Animated, StyleSheet, ViewStyle } from 'react-native';
import { useContentTransition } from '../hooks/useContentTransition';

interface ScreenTransitionProps {
  children: React.ReactNode;
  style?: ViewStyle;
  duration?: number;
}

export const ScreenTransition: React.FC<ScreenTransitionProps> = ({ children, style, duration }) => {
  const { play, animatedStyle } = useContentTransition(duration);

  useEffect(() => {
    play();
  }, []);

  return (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
});

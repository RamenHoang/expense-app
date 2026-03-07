import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, LayoutChangeEvent } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface FilterButtonGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  buttons: Array<{ value: string; label: string }>;
  style?: any;
}

export const FilterButtonGroup: React.FC<FilterButtonGroupProps> = ({
  value,
  onValueChange,
  buttons,
  style,
}) => {
  const theme = useTheme();
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const [buttonLayouts, setButtonLayouts] = useState<{ [key: string]: { x: number; width: number } }>({});
  const [isInitialized, setIsInitialized] = useState(false);

  const selectedIndex = buttons.findIndex((b) => b.value === value);

  useEffect(() => {
    if (buttonLayouts[value] && Object.keys(buttonLayouts).length === buttons.length) {
      const targetX = buttonLayouts[value].x;

      if (!isInitialized) {
        // First time - set immediately without animation
        slideAnimation.setValue(targetX);
        setIsInitialized(true);
      } else {
        // Animate the slide
        Animated.spring(slideAnimation, {
          toValue: targetX,
          useNativeDriver: true,
          tension: 200,
          friction: 25,
          overshootClamping: true,
        }).start();
      }
    }
  }, [value, buttonLayouts, isInitialized]);

  const handleLayout = (event: LayoutChangeEvent, buttonValue: string) => {
    const { x, width } = event.nativeEvent.layout;
    setButtonLayouts((prev) => ({
      ...prev,
      [buttonValue]: { x, width },
    }));
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 25,
      padding: 4,
      height: 50,
      position: 'relative',
      overflow: 'hidden',
    },
    slidingBackground: {
      position: 'absolute',
      height: 42,
      backgroundColor: theme.colors.primary,
      borderRadius: 21,
      top: 4,
      left: 4,
    },
    button: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 21,
      paddingHorizontal: 4,
    },
    buttonText: {
      fontSize: 15,
      zIndex: 2,
    },
    divider: {
      width: 1,
      height: '60%',
      backgroundColor: theme.colors.outlineVariant,
      alignSelf: 'center',
      zIndex: 1,
    },
  });

  const selectedButtonWidth = buttonLayouts[value]?.width || 0;

  return (
    <View style={[styles.container, style]}>
      {/* Sliding background */}
      {isInitialized && (
        <Animated.View
          style={{
            position: 'absolute',
            height: 42,
            width: selectedButtonWidth,
            backgroundColor: theme.colors.primary,
            borderRadius: 21,
            top: 4,
            transform: [{ translateX: slideAnimation }],
          }}
        />
      )}

      {/* Buttons */}
      {buttons.map((button, index) => {
        const isSelected = value === button.value;

        return (
          <React.Fragment key={button.value}>
            {/* {index > 0 && !isSelected && value !== buttons[index - 1].value && (
              <View style={styles.divider} />
            )} */}
            <TouchableOpacity
              style={styles.button}
              onPress={() => onValueChange(button.value)}
              activeOpacity={0.7}
              onLayout={(event) => handleLayout(event, button.value)}
            >
              <Text
                style={[
                  styles.buttonText,
                  {
                    color: isSelected ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                    fontWeight: isSelected ? '600' : '500',
                  },
                ]}
              >
                {button.label}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );
};

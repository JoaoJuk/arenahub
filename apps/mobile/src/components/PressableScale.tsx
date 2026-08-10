import React from 'react';
import { Pressable, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Theme } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Cartões afundam menos que botões (0.98 vs 0.96) — ver DESIGN.md §6. */
  scaleTo?: number;
  /** Brilho neon no press. Ligado só onde o toque leva a uma ação de verdade. */
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'radio' | 'checkbox' | 'tab';
  accessibilityState?: { selected?: boolean; disabled?: boolean; checked?: boolean };
};

/**
 * Wrapper de toque com o feedback padrão do Liggo Kinetic: afunda um pouco e
 * acende o contorno neon. Usado por todo card clicável para não repetir a
 * animação em cada tela.
 */
export const PressableScale: React.FC<Props> = ({
  children,
  onPress,
  disabled,
  scaleTo = 0.98,
  glow = true,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
}) => {
  const scale = useSharedValue(1);
  const glowV = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glowV.value * Theme.shadow.glow.shadowOpacity,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => {
        scale.value = withSpring(scaleTo, Theme.motion.springPress);
        if (glow) glowV.value = withTiming(1, { duration: Theme.motion.fast });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, Theme.motion.springPress);
        if (glow) glowV.value = withTiming(0, { duration: Theme.motion.base });
      }}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={[styles.base, style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    shadowColor: Theme.shadow.glow.shadowColor,
    shadowOffset: Theme.shadow.glow.shadowOffset,
    shadowRadius: Theme.shadow.glow.shadowRadius,
    shadowOpacity: 0,
  },
});

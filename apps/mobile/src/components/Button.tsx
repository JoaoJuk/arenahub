import React from 'react';
import { StyleSheet, Text, Pressable, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Theme } from '../theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 150 });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: disabled ? 0.5 : opacity.value,
    };
  });

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: { backgroundColor: Theme.colors.primary, borderWidth: 1, borderColor: Theme.colors.primary },
          text: { color: Theme.colors.background },
        };
      case 'secondary':
        return {
          container: { backgroundColor: Theme.colors.surfaceHighlight, borderWidth: 1, borderColor: Theme.colors.surfaceHighlight },
          text: { color: Theme.colors.text },
        };
      case 'outline':
        return {
          container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Theme.colors.border },
          text: { color: Theme.colors.text },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent', borderWidth: 0, borderColor: 'transparent' },
          text: { color: Theme.colors.primary },
        };
      case 'danger':
        return {
          container: { backgroundColor: Theme.colors.dangerDim, borderWidth: 1, borderColor: 'transparent' },
          text: { color: Theme.colors.danger },
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { container: { paddingVertical: 8, paddingHorizontal: 16 }, text: Theme.typography.small };
      case 'md':
        return { container: { paddingVertical: 14, paddingHorizontal: 24 }, text: Theme.typography.bodySemibold };
      case 'lg':
        return { container: { paddingVertical: 18, paddingHorizontal: 32 }, text: Theme.typography.h3 };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.base,
        vStyles.container,
        sStyles.container,
        fullWidth && styles.fullWidth,
        style,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={vStyles.text.color} size="small" />
      ) : (
        <>
          {icon && React.cloneElement(icon as any, { color: vStyles.text.color, size: 20, style: { marginRight: 8 } })}
          <Text style={[vStyles.text, sStyles.text, textStyle]}>{title}</Text>
        </>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.radius.lg,
  },
  fullWidth: {
    width: '100%',
  },
});

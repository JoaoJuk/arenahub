import React from 'react';
import { StyleSheet, Text, Pressable, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Theme, type Colors } from '../theme';
import { useColors, useStyles } from '../theme-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'outline' | 'ghost' | 'glass' | 'danger';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
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
  iconRight,
  style,
  textStyle,
  accessibilityLabel,
}) => {
  const c = useColors();
  const s = useStyles(styles);
  const scale = useSharedValue(1);
  // Brilho neon do press (DESIGN.md §5) — só o botão de ação recebe.
  const glow = useSharedValue(0);
  const glows = variant === 'primary' || variant === 'dark';

  const handlePressIn = () => {
    scale.value = withSpring(0.96, Theme.motion.springPress);
    if (glows) glow.value = withTiming(1, { duration: Theme.motion.fast });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Theme.motion.springPress);
    if (glows) glow.value = withTiming(0, { duration: Theme.motion.base });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.4 : 1,
    shadowOpacity: glow.value * Theme.shadow.glow.shadowOpacity,
    shadowRadius: Theme.shadow.glow.shadowRadius,
  }));

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        // Neon como preenchimento + texto quase preto. Branco sobre neon reprova
        // contraste; ver DESIGN.md §2.
        return { container: { backgroundColor: c.accent }, text: { color: c.onAccent } };
      case 'dark':
        // Bloco de alto contraste — no escuro ele sobe um degrau de superfície
        // em vez de virar branco (senão competiria com o CTA neon).
        return { container: { backgroundColor: c.contrast }, text: { color: c.onContrast } };
      case 'secondary':
        return { container: { backgroundColor: c.surfaceGray }, text: { color: c.text } };
      case 'outline':
        return {
          container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border },
          text: { color: c.text },
        };
      case 'ghost':
        // Verde de TEXTO: #106E00 no claro, o próprio neon no escuro.
        return { container: { backgroundColor: 'transparent' }, text: { color: c.primary } };
      case 'glass':
        // Sobre foto: branco translúcido. `onPhoto` garante leitura sobre o scrim.
        return { container: { backgroundColor: c.glass }, text: { color: c.onPhoto } };
      case 'danger':
        return {
          container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.danger },
          text: { color: c.danger },
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { container: { height: 40, paddingHorizontal: Theme.spacing.md }, text: Theme.typography.small };
      case 'md':
        return { container: { height: 48, paddingHorizontal: Theme.spacing.lg }, text: Theme.typography.label };
      case 'lg':
        return { container: { height: 56, paddingHorizontal: Theme.spacing.xl }, text: Theme.typography.bodySemibold };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();
  const contentColor = vStyles.text.color;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading }}
      style={[
        s.base,
        vStyles.container,
        sStyles.container,
        fullWidth && s.fullWidth,
        style,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} size="small" />
      ) : (
        <>
          {icon &&
            React.cloneElement(icon as any, { color: contentColor, size: 20, style: { marginRight: Theme.spacing.sm } })}
          <Text style={[vStyles.text, sStyles.text, textStyle]} numberOfLines={1}>
            {title}
          </Text>
          {iconRight &&
            React.cloneElement(iconRight as any, { color: contentColor, size: 20, style: { marginLeft: Theme.spacing.sm } })}
        </>
      )}
    </AnimatedPressable>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Pílula é a forma padrão de botão no Liggo Kinetic.
    borderRadius: Theme.radius.full,
    // shadowColor precisa ser estático; a opacidade é que é animada no press.
    shadowColor: Theme.shadow.glow.shadowColor,
    shadowOffset: Theme.shadow.glow.shadowOffset,
    shadowOpacity: 0,
  },
  fullWidth: {
    width: '100%',
  },
});

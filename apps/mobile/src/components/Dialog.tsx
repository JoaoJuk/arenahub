import React, { useEffect } from 'react';
import { View, StyleSheet, BackHandler, Platform } from 'react-native';
import { Theme, type Colors } from '../theme';
import { useStyles } from '../theme-context';

type Props = {
  visible: boolean;
  /** Fechar pelo botão físico de voltar (Android). */
  onRequestClose: () => void;
  children: React.ReactNode;
};

/**
 * Caixa de diálogo sobreposta.
 *
 * Não usa o `Modal` do react-native: na web ele renderiza num portal cujos
 * eventos não chegam ao React — nada dentro dele recebe toque (verificado com
 * clique real do navegador, tanto em Pressable quanto em TouchableOpacity), e
 * ainda deixa `pointer-events: none` preso nos containers da animação. Uma View
 * absoluta dentro da própria tela se comporta igual nas duas plataformas.
 *
 * O que o `Modal` dava de graça e é reposto aqui: fechar no botão físico de
 * voltar do Android.
 */
export const Dialog: React.FC<Props> = ({ visible, onRequestClose, children }) => {
  const s = useStyles(styles);

  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onRequestClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onRequestClose]);

  if (!visible) return null;

  return (
    <View style={s.overlay} accessibilityViewIsModal>
      {children}
    </View>
  );
};

const styles = (c: Colors) => StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: c.scrimStrong,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.margin,
    // Acima do rodapé fixo da arena e da barra de abas.
    zIndex: 100,
    elevation: 24,
  },
});

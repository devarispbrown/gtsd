import React from 'react';
import { View, Dimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
  FadeOut,
} from 'react-native-reanimated';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocity: number;
}

interface ConfettiAnimationProps {
  active: boolean;
  duration?: number;
  colors?: string[];
  pieces?: number;
  onComplete?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#FFA07A',
  '#98D8C8',
  '#FFD700',
  '#FF69B4',
  '#7B68EE',
  '#00CED1',
  '#FF8C00',
];

const ConfettiPieceComponent: React.FC<{
  piece: ConfettiPiece;
  duration: number;
  onAnimationEnd: () => void;
}> = ({ piece, duration, onAnimationEnd }) => {
  const translateY = useSharedValue(piece.y);
  const translateX = useSharedValue(piece.x);
  const rotate = useSharedValue(piece.rotation);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    // Fall animation
    translateY.value = withTiming(
      SCREEN_HEIGHT + 100,
      {
        duration,
        easing: Easing.quad,
      },
      () => {
        runOnJS(onAnimationEnd)();
      }
    );

    // Horizontal drift
    translateX.value = withRepeat(
      withSequence(
        withTiming(piece.x + 30 * piece.velocity, { duration: duration / 3 }),
        withTiming(piece.x - 30 * piece.velocity, { duration: duration / 3 }),
        withTiming(piece.x, { duration: duration / 3 })
      ),
      -1,
      false
    );

    // Rotation
    rotate.value = withRepeat(
      withTiming(360 * piece.velocity, {
        duration: duration / 2,
        easing: Easing.linear,
      }),
      -1
    );

    // Fade out near the end
    opacity.value = withSequence(
      withTiming(1, { duration: duration * 0.7 }),
      withTiming(0, { duration: duration * 0.3 })
    );

    // Scale animation
    scale.value = withRepeat(
      withSequence(
        withSpring(1.2),
        withSpring(0.8),
        withSpring(1)
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View
        style={[
          styles.confettiPiece,
          {
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size * 2,
            borderRadius: piece.size / 2,
          },
        ]}
      />
    </Animated.View>
  );
};

export const ConfettiAnimation: React.FC<ConfettiAnimationProps> = ({
  active,
  duration = 3000,
  colors = DEFAULT_COLORS,
  pieces = 50,
  onComplete,
}) => {
  const [confettiPieces, setConfettiPieces] = React.useState<ConfettiPiece[]>([]);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const animationCount = React.useRef(0);

  React.useEffect(() => {
    if (active && !isAnimating) {
      // Generate confetti pieces
      const newPieces: ConfettiPiece[] = [];
      for (let i = 0; i < pieces; i++) {
        newPieces.push({
          id: i,
          x: Math.random() * SCREEN_WIDTH,
          y: -50 - Math.random() * 200,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 8 + Math.random() * 8,
          rotation: Math.random() * 360,
          velocity: 0.5 + Math.random(),
        });
      }
      setConfettiPieces(newPieces);
      setIsAnimating(true);
      animationCount.current = 0;
    } else if (!active && isAnimating) {
      setConfettiPieces([]);
      setIsAnimating(false);
    }
  }, [active, colors, pieces, isAnimating]);

  const handleAnimationEnd = React.useCallback(() => {
    animationCount.current += 1;
    if (animationCount.current >= pieces) {
      setIsAnimating(false);
      setConfettiPieces([]);
      onComplete?.();
    }
  }, [pieces, onComplete]);

  if (!isAnimating || confettiPieces.length === 0) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces.map((piece) => (
        <ConfettiPieceComponent
          key={piece.id}
          piece={piece}
          duration={duration}
          onAnimationEnd={handleAnimationEnd}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  confettiPiece: {
    transform: [{ skewY: '-20deg' }],
  },
});
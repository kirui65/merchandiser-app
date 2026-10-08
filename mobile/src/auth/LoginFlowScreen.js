import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Easing, StyleSheet, View } from 'react-native';
import RoleSelectionScreen from './RoleSelectionScreen';
import LoginScreen from './LoginScreen';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function LoginFlowScreen() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [step, setStep] = useState('roles');
  const progress = useRef(new Animated.Value(0)).current;

  const animateTo = useCallback((value, onComplete) => {
    Animated.timing(progress, {
      toValue: value,
      duration: 330,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onComplete?.();
    });
  }, [progress]);

  function chooseRole(role) {
    setSelectedRole(role);
    setStep('login');
    animateTo(1);
  }

  const returnToRoles = useCallback(() => {
    if (step !== 'login') return false;
    animateTo(0, () => setStep('roles'));
    return true;
  }, [animateTo, step]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', returnToRoles);
    return () => subscription.remove();
  }, [returnToRoles]);

  const rolesStyle = {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.68] }),
    transform: [{
      translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -SCREEN_WIDTH * 0.06] }),
    }],
  };
  const loginStyle = {
    opacity: progress,
    transform: [{
      translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_WIDTH, 0] }),
    }],
  };

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents={step === 'roles' ? 'auto' : 'none'}
        accessibilityElementsHidden={step !== 'roles'}
        importantForAccessibility={step === 'roles' ? 'auto' : 'no-hide-descendants'}
        style={[styles.screen, rolesStyle]}
      >
        <RoleSelectionScreen onSelectRole={chooseRole} selectedRole={selectedRole} />
      </Animated.View>
      <Animated.View
        pointerEvents={step === 'login' ? 'auto' : 'none'}
        accessibilityElementsHidden={step !== 'login'}
        importantForAccessibility={step === 'login' ? 'auto' : 'no-hide-descendants'}
        style={[styles.screen, loginStyle]}
      >
        {selectedRole ? (
          <LoginScreen role={selectedRole} onBack={returnToRoles} />
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  screen: { ...StyleSheet.absoluteFillObject },
});

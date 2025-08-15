import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const FingerPlacementGuide = ({ isVisible, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [pulseAnimation] = useState(new Animated.Value(1));
  const [glowAnimation] = useState(new Animated.Value(0));

  const steps = [
    {
      title: "Step 1: Clean Your Finger",
      description: "Wash your hands and ensure your finger is clean and dry",
      icon: "🧼"
    },
    {
      title: "Step 2: Find the Right Position",
      description: "Place your index finger gently over the camera lens",
      icon: "👆"
    },
    {
      title: "Step 3: Apply Light Pressure",
      description: "Press gently - not too hard, not too soft",
      icon: "💡"
    },
    {
      title: "Step 4: Stay Still",
      description: "Keep your finger steady for 30 seconds",
      icon: "🎯"
    }
  ];

  useEffect(() => {
    if (isVisible) {
      startAnimations();
      const timer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 8000); // Auto-advance after 8 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible) {
      const stepTimer = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % steps.length);
      }, 2000);
      
      return () => clearInterval(stepTimer);
    }
  }, [isVisible]);

  const startAnimations = () => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        })
      ])
    ).start();
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <View style={styles.guideContainer}>
          <Text style={styles.title}>👆 Finger Placement Guide</Text>
          
          {/* Current Step Display */}
          <View style={styles.stepContainer}>
            <Text style={styles.stepIcon}>{steps[currentStep].icon}</Text>
            <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
            <Text style={styles.stepDescription}>{steps[currentStep].description}</Text>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.progressDot,
                  index === currentStep && styles.activeProgressDot
                ]}
              />
            ))}
          </View>

          {/* Finger Placement Visual */}
          <View style={styles.placementVisual}>
            <View style={styles.cameraLens}>
              <Animated.View
                style={[
                  styles.fingerOutline,
                  {
                    transform: [{ scale: pulseAnimation }],
                    shadowOpacity: glowAnimation,
                    shadowRadius: glowAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [5, 20]
                    })
                  }
                ]}
              />
              <Text style={styles.lensText}>📷</Text>
            </View>
            
            <View style={styles.placementText}>
              <Text style={styles.placementTitle}>Place Finger Here</Text>
              <Text style={styles.placementSubtitle}>
                Cover the camera lens completely
              </Text>
            </View>
          </View>

          {/* Tips */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tips for Best Results:</Text>
            <Text style={styles.tipText}>• Use your index finger</Text>
            <Text style={styles.tipText}>• Apply gentle, even pressure</Text>
            <Text style={styles.tipText}>• Keep your hand steady</Text>
            <Text style={styles.tipText}>• Avoid bright light interference</Text>
          </View>

          {/* Skip Button */}
          <Text style={styles.skipText} onPress={onComplete}>
            Skip Guide
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 105, 180, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  guideContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    maxWidth: width * 0.9,
    maxHeight: height * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 30,
    textAlign: 'center',
  },
  stepContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stepIcon: {
    fontSize: 52,
    marginBottom: 15,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 10,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    flexDirection: 'row',
    marginBottom: 30,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
    marginHorizontal: 6,
  },
  activeProgressDot: {
    backgroundColor: '#4A90E2',
    transform: [{ scale: 1.2 }],
  },
  placementVisual: {
    alignItems: 'center',
    marginBottom: 30,
  },
  cameraLens: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#FF69B4',
  },
  fingerOutline: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 0 },
  },
  lensText: {
    fontSize: 45,
  },
  placementText: {
    alignItems: 'center',
  },
  placementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 5,
  },
  placementSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(255, 105, 180, 0.2)',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 15,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
    textAlign: 'left',
  },
  skipText: {
    color: '#4A90E2',
    fontSize: 16,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Dimensions,
  Animated,
  SafeAreaView,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RealPPGProcessor } from './RealPPGAlgorithm';
import { PPGVisualization } from './PPGVisualization';
import { FingerPlacementGuide } from './FingerPlacementGuide';

const { width, height } = Dimensions.get('window');

export default function App() {
  // App state
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  
  // Input data
  const [childAge, setChildAge] = useState('');
  const [temperature, setTemperature] = useState('');
  
  // Measurement state
  const [isScanning, setIsScanning] = useState(false);
  const [heartRate, setHeartRate] = useState(null);
  const [bloodPressure, setBloodPressure] = useState({ systolic: null, diastolic: null });
  const [confidence, setConfidence] = useState(0);
  const [quality, setQuality] = useState('unknown');
  const [signalData, setSignalData] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [showFingerGuide, setShowFingerGuide] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [fingerDetected, setFingerDetected] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  
  // Animation refs
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const bounceAnimation = useRef(new Animated.Value(1)).current;
  
  // Camera and processing refs
  const cameraRef = useRef(null);
  const scanInterval = useRef(null);
  const frameInterval = useRef(null);
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const ppgProcessor = useRef(new RealPPGProcessor()).current;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setCameraPermission(status);
        setHasPermission(status === 'granted');
        
        // Load saved onboarding data
        const savedAge = await AsyncStorage.getItem('pulsekids_age');
        const savedTemp = await AsyncStorage.getItem('pulsekids_temperature');
        if (savedAge) setChildAge(savedAge);
        if (savedTemp) setTemperature(savedTemp);
        if (savedAge) setHasCompletedOnboarding(true);
      } catch (error) {
        console.error('Error loading data:', error);
        setCameraError('Failed to initialize camera');
      }
    })();

    return cleanup;
  }, []);

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();

    // Start continuous bounce animation
    startBounceAnimation();
  }, []);

  const startBounceAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  const cleanup = () => {
    if (scanInterval.current) clearInterval(scanInterval.current);
    if (frameInterval.current) clearInterval(frameInterval.current);
  };

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    pulseAnimation.stopAnimation();
    pulseAnimation.setValue(1);
  };

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status);
      setHasPermission(status === 'granted');
      if (status === 'granted') {
        setCameraError(null);
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setCameraError('Failed to request camera permission');
    }
  };

  const handleOnboardingComplete = async () => {
    // Dismiss keyboard first
    dismissKeyboard();
    
    if (!childAge.trim()) {
      Alert.alert('Required Field', 'Please enter your child\'s age');
      return;
    }
    
    try {
      await AsyncStorage.setItem('pulsekids_age', childAge);
      if (temperature.trim()) {
        await AsyncStorage.setItem('pulsekids_temperature', temperature);
      }
      setHasCompletedOnboarding(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  const processVideoFrame = async () => {
    if (!cameraRef.current || !isScanning) return;

    try {
      const options = {
        quality: 0.1,
        base64: false,
        skipProcessing: true,
      };

      const imageUri = await cameraRef.current.takePictureAsync(options);
      
      // Update PPG processor with current settings
      ppgProcessor.setTemperature(parseFloat(temperature) || 37.0);
      ppgProcessor.setChildAge(parseInt(childAge) || 5);
      
      // Process frame with real PPG algorithm
      const result = await ppgProcessor.processFrame(imageUri, Date.now());
      
      if (result && result.isValid) {
        setHeartRate(result.heartRate);
        setBloodPressure(result.bloodPressure);
        setConfidence(result.confidence);
        setQuality(result.quality);
        setSignalData(result.signalData);
        setFingerDetected(true);
      } else if (result && !result.isValid) {
        setFingerDetected(false);
      }
      
    } catch (error) {
      console.error('Frame processing error:', error);
    }
  };

  const startScan = async () => {
    if (!hasCompletedOnboarding) {
      Alert.alert('Setup Required', 'Please complete the setup first by entering age and tapping "Complete Setup"');
      return;
    }

    if (cameraPermission !== 'granted') {
      Alert.alert('Camera Permission Required', 'Please grant camera permission to start measurement');
      await requestCameraPermission();
      return;
    }

    setIsScanning(true);
    setHeartRate(null);
    setBloodPressure({ systolic: null, diastolic: null });
    setConfidence(0);
    setQuality('unknown');
    setSignalData([]);
    setScanProgress(0);
    setMeasurementComplete(false);
    setFingerDetected(false);

    // Reset PPG processor and set current parameters
    ppgProcessor.reset();
    ppgProcessor.setTemperature(parseFloat(temperature) || 37.0);
    ppgProcessor.setChildAge(parseInt(childAge) || 5);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    startPulseAnimation();

    // Progress animation
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: 30000, // 30 seconds for proper measurement
      useNativeDriver: false,
    }).start();

    // Frame processing
    frameInterval.current = setInterval(processVideoFrame, 33); // 30 FPS

    // Progress tracking
    let scanTime = 0;
    scanInterval.current = setInterval(() => {
      scanTime += 1000;
      setScanProgress((scanTime / 30000) * 100);

      if (scanTime >= 30000) {
        stopScan();
      }
    }, 1000);
  };

  const stopScan = () => {
    cleanup();
    setIsScanning(false);
    progressAnimation.setValue(0);
    stopPulseAnimation();
    setMeasurementComplete(true);

    if (heartRate && confidence > 0.3) {
      Haptics.notificationAsync(
        confidence > 0.7
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const resetApp = () => {
    setHasCompletedOnboarding(false);
    setHeartRate(null);
    setBloodPressure({ systolic: null, diastolic: null });
    setConfidence(0);
    setQuality('unknown');
    setSignalData([]);
    setScanProgress(0);
    setMeasurementComplete(false);
    setFingerDetected(false);
    setChildAge('');
    setTemperature('');
    cleanup();
  };

  // Permission handling
  if (hasPermission === null) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Camera access is required</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render single page app
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF69B4" />
      
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <Animated.View 
          style={[
            styles.screen,
            {
              opacity: fadeAnimation,
              transform: [{
                translateY: slideAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                })
              }]
            }
          ]}
        >
          <ScrollView 
            style={styles.scrollContainer} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={true}
            alwaysBounceVertical={true}
          >
            
            {/* Header */}
            <View style={styles.header}>
              <Animated.View style={{ transform: [{ scale: bounceAnimation }] }}>
                <Text style={styles.appTitle}>🎀 PulseKids 🎀</Text>
              </Animated.View>
              <Text style={styles.appSubtitle}>💖 Heart Health Monitor for Kids 💖</Text>
            </View>

            {/* Input Section */}
            <View style={styles.inputSection}>
              <Text style={styles.sectionTitle}>👶 Child Information</Text>
              
              <View style={styles.inputRow}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>🎂 Age (years)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={childAge}
                    onChangeText={setChildAge}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => {
                      // Focus next input or dismiss keyboard
                      if (temperature.trim()) {
                        dismissKeyboard();
                      }
                    }}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>🌡️ Temperature (°C)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={temperature}
                    onChangeText={setTemperature}
                    keyboardType="numeric"
                    placeholder="37.0"
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    returnKeyType="done"
                    blurOnSubmit={true}
                    onSubmitEditing={dismissKeyboard}
                  />
                </View>
              </View>

              {!hasCompletedOnboarding && (
                <TouchableOpacity
                  style={styles.setupButton}
                  onPress={handleOnboardingComplete}
                  activeOpacity={0.8}
                >
                  <Text style={styles.setupButtonText}>✨ Complete Setup ✨</Text>
                </TouchableOpacity>
              )}

              {hasCompletedOnboarding && (
                <View style={styles.setupComplete}>
                  <Text style={styles.setupCompleteText}>🎉 Setup Complete! 🎉</Text>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={resetApp}
                  >
                    <Text style={styles.resetButtonText}>🔄 Reset</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Camera Section */}
            <View style={styles.cameraSection}>
              <Text style={styles.sectionTitle}>📷 Heart Rate Measurement</Text>
              
              <View style={styles.cameraContainer}>
                {cameraPermission === 'granted' ? (
                  <CameraView
                    ref={cameraRef}
                    style={styles.camera}
                    facing="back"
                    enableTorch={isScanning}
                  />
                ) : (
                  <View style={styles.cameraPlaceholder}>
                    <Text style={styles.cameraPlaceholderIcon}>📷</Text>
                    <Text style={styles.cameraPlaceholderText}>Camera Access Required</Text>
                    <TouchableOpacity
                      style={styles.cameraPermissionButton}
                      onPress={requestCameraPermission}
                    >
                      <Text style={styles.cameraPermissionButtonText}>Grant Camera Permission</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Camera Overlay - Positioned absolutely */}
              {cameraPermission === 'granted' && (
                <View style={styles.cameraOverlay}>
                  {isScanning ? (
                    <View style={styles.scanningOverlay}>
                      <Animated.View style={[styles.heartbeatIcon, { transform: [{ scale: pulseAnimation }] }]}>
                        <Text style={styles.heartbeatText}>❤️</Text>
                      </Animated.View>
                      <Text style={styles.instructionText}>
                        {fingerDetected ? 'Keep finger steady! 💪' : 'Place your finger on camera 👆'}
                      </Text>
                      <View style={styles.fingerGuide} />
                      {!fingerDetected && (
                        <Text style={styles.fingerWarning}>⚠️ Please place your finger properly</Text>
                      )}
                    </View>
                  ) : (
                    <View style={styles.readyOverlay}>
                      <Text style={styles.placeholderText}>Place finger on camera 👆</Text>
                    </View>
                  )}
                </View>
              )}

              {/* Progress Bar */}
              {isScanning && (
                <View style={styles.progressSection}>
                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        {
                          width: progressAnimation.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {fingerDetected ? 'Measuring...' : 'Waiting for finger...'} {Math.round(scanProgress)}%
                  </Text>
                </View>
              )}

              {/* Control Buttons */}
              <View style={styles.controlSection}>
                <TouchableOpacity
                  style={styles.guideButton}
                  onPress={() => setShowFingerGuide(true)}
                >
                  <Text style={styles.guideButtonText}>📖 How to Place Finger</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    isScanning && styles.controlButtonActive,
                    (!hasCompletedOnboarding || cameraPermission !== 'granted') && styles.controlButtonDisabled
                  ]}
                  onPress={isScanning ? stopScan : startScan}
                  activeOpacity={0.8}
                  disabled={!hasCompletedOnboarding || cameraPermission !== 'granted'}
                >
                  <Text style={styles.controlButtonText}>
                    {isScanning ? '🛑 Stop' : '❤️ Start Heart Check'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Results Section */}
            {measurementComplete && (heartRate || bloodPressure.systolic) && (
              <View style={styles.resultsSection}>
                <Text style={styles.sectionTitle}>🎊 Measurement Results 🎊</Text>
                
                <View style={styles.resultsGrid}>
                  {/* Heart Rate */}
                  <View style={styles.resultCard}>
                    <Text style={styles.resultLabel}>❤️ Heart Rate</Text>
                    <Text style={styles.resultValue}>{heartRate || '--'} BPM</Text>
                    <View style={styles.healthyRange}>
                      <Text style={styles.rangeLabel}>Healthy Range for Age {childAge}:</Text>
                      <Text style={styles.rangeValue}>{getHealthyHeartRateRange(parseInt(childAge) || 5)}</Text>
                    </View>
                  </View>

                  {/* Blood Pressure */}
                  <View style={styles.resultCard}>
                    <Text style={styles.resultLabel}>💙 Blood Pressure</Text>
                    <Text style={styles.resultValue}>
                      {bloodPressure?.systolic || '--'}/{bloodPressure?.diastolic || '--'} mmHg
                    </Text>
                    <View style={styles.healthyRange}>
                      <Text style={styles.rangeLabel}>Healthy Range for Age {childAge}:</Text>
                      <Text style={styles.rangeValue}>{getHealthyBPRange(parseInt(childAge) || 5)}</Text>
                    </View>
                  </View>
                </View>

                {/* Quality Indicator */}
                <View style={styles.qualityCard}>
                  <Text style={styles.qualityLabel}>🎯 Measurement Quality</Text>
                  <View style={styles.qualityBar}>
                    <View style={[styles.qualityFill, { width: `${Math.round((confidence || 0) * 100)}%` }]} />
                  </View>
                  <Text style={styles.qualityText}>{Math.round((confidence || 0) * 100)}% - {quality}</Text>
                </View>

                {/* Warning Message */}
                <View style={styles.warningCard}>
                  <Text style={styles.warningIcon}>⚠️</Text>
                  <Text style={styles.warningText}>
                    If readings are abnormal, consult a healthcare provider.
                  </Text>
                </View>

                {/* Celebration Message */}
                <View style={styles.celebrationCard}>
                  <Text style={styles.celebrationIcon}>🎉</Text>
                  <Text style={styles.celebrationText}>
                    Great job! Your heart check is complete! 💖
                  </Text>
                </View>
              </View>
            )}

            {/* PPG Visualization */}
            {isScanning && (
              <View style={styles.visualizationSection}>
                <PPGVisualization
                  signalData={signalData}
                  heartRate={heartRate}
                  bloodPressure={bloodPressure}
                  confidence={confidence}
                  isScanning={isScanning}
                  signalQuality={quality}
                  temperature={parseFloat(temperature) || 37.0}
                  childAge={parseInt(childAge) || 5}
                />
              </View>
            )}

            {/* Tips Section */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 Tips for Best Results:</Text>
              <Text style={styles.tipText}>• Clean, dry finger 🧼</Text>
              <Text style={styles.tipText}>• Good lighting 💡</Text>
              <Text style={styles.tipText}>• Stay still during measurement 🎯</Text>
              <Text style={styles.tipText}>• Complete setup before measuring ✅</Text>
              <Text style={styles.tipText}>• Cover the camera completely 📱</Text>
            </View>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />

          </ScrollView>
        </Animated.View>
      </TouchableWithoutFeedback>

      {/* Finger Placement Guide Modal */}
      <FingerPlacementGuide
        isVisible={showFingerGuide}
        onComplete={() => setShowFingerGuide(false)}
      />
    </SafeAreaView>
  );
}

// Helper functions for healthy ranges
const getHealthyHeartRateRange = (age) => {
  if (age <= 1) return '100-160 BPM';
  if (age <= 3) return '80-140 BPM';
  if (age <= 5) return '70-120 BPM';
  if (age <= 7) return '65-110 BPM';
  return '60-100 BPM';
};

const getHealthyBPRange = (age) => {
  if (age <= 1) return '70-90/50-60 mmHg';
  if (age <= 3) return '80-100/55-65 mmHg';
  if (age <= 5) return '85-105/60-70 mmHg';
  if (age <= 7) return '90-110/65-75 mmHg';
  return '95-115/70-80 mmHg';
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  screen: { flex: 1 },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 50 },
  
  // Loading and Error States
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FF69B4' 
  },
  loadingText: { 
    color: 'white', 
    fontSize: 18,
    fontWeight: '600'
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FF69B4', 
    padding: 20 
  },
  errorText: { 
    color: 'white', 
    fontSize: 18, 
    textAlign: 'center', 
    marginBottom: 20 
  },
  retryButton: { 
    backgroundColor: 'white', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 25 
  },
  retryButtonText: { 
    color: '#FF69B4', 
    fontWeight: 'bold',
    fontSize: 16
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingTop: 20,
  },
  appTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  appSubtitle: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },

  // Input Section
  inputSection: {
    backgroundColor: 'rgba(255,182,193,0.3)',
    borderRadius: 25,
    padding: 25,
    marginBottom: 25,
    marginHorizontal: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 25,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  inputContainer: {
    flex: 0.48,
  },
  inputLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    padding: 18,
    color: 'white',
    fontSize: 18,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
  },
  setupButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  setupButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  setupComplete: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,255,0,0.3)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#00FF00',
  },
  setupCompleteText: {
    color: '#00FF00',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 18,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Camera Section
  cameraSection: {
    marginBottom: 25,
    marginHorizontal: 20,
  },
  cameraContainer: {
    height: 280,
    backgroundColor: 'rgba(255,182,193,0.2)',
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,105,180,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningOverlay: {
    alignItems: 'center',
  },
  readyOverlay: {
    alignItems: 'center',
  },
  heartbeatIcon: {
    marginBottom: 20,
  },
  heartbeatText: {
    fontSize: 70,
  },
  instructionText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fingerGuide: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#FF69B4',
    backgroundColor: 'rgba(255,105,180,0.3)',
  },
  fingerWarning: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,105,180,0.3)',
  },
  cameraPlaceholderIcon: {
    fontSize: 70,
    marginBottom: 20,
  },
  cameraPlaceholderText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  cameraPermissionButton: {
    backgroundColor: '#FF1493',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cameraPermissionButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBar: {
    height: 15,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF1493',
    borderRadius: 8,
  },
  progressText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  controlSection: {
    marginTop: 25,
  },
  guideButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  guideButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  controlButton: {
    backgroundColor: '#FF1493',
    paddingVertical: 22,
    paddingHorizontal: 35,
    borderRadius: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  controlButtonActive: {
    backgroundColor: '#FF4444',
  },
  controlButtonDisabled: {
    backgroundColor: '#999',
    opacity: 0.6,
  },
  controlButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Results Section
  resultsSection: {
    backgroundColor: 'rgba(255,182,193,0.3)',
    borderRadius: 25,
    padding: 25,
    marginBottom: 25,
    marginHorizontal: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  resultsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  resultCard: {
    flex: 0.48,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    padding: 22,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  resultLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultValue: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 18,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  healthyRange: {
    alignItems: 'center',
  },
  rangeLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  rangeValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  qualityCard: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 25,
    padding: 22,
    marginBottom: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  qualityLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 18,
  },
  qualityBar: {
    width: '100%',
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  qualityFill: {
    height: '100%',
    backgroundColor: '#FF1493',
    borderRadius: 8,
  },
  qualityText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  warningCard: {
    backgroundColor: 'rgba(255,193,7,0.3)',
    borderRadius: 25,
    padding: 22,
    marginBottom: 25,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFC107',
  },
  warningIcon: {
    fontSize: 45,
    marginBottom: 12,
  },
  warningText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  celebrationCard: {
    backgroundColor: 'rgba(255,105,180,0.3)',
    borderRadius: 25,
    padding: 22,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FF69B4',
  },
  celebrationIcon: {
    fontSize: 45,
    marginBottom: 12,
  },
  celebrationText: {
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 24,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Visualization Section
  visualizationSection: {
    marginHorizontal: 20,
    marginBottom: 25,
  },

  // Tips Section
  tipsSection: {
    backgroundColor: 'rgba(255,182,193,0.3)',
    borderRadius: 25,
    padding: 25,
    marginBottom: 30,
    marginHorizontal: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tipText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 10,
    textAlign: 'left',
    lineHeight: 22,
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 50,
  },
});
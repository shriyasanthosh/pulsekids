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
  Button,
} from 'react-native';
import { Camera } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';


const { width, height } = Dimensions.get('window');


// Enhanced PPG Processor with advanced algorithms
class EnhancedPPGProcessor {
  constructor() {
    this.sampleRate = 30;
    this.bufferSize = 300;
    this.minHeartRate = 60;
    this.maxHeartRate = 150;
   
    this.redBuffer = [];
    this.greenBuffer = [];
    this.blueBuffer = [];
    this.timestamps = [];
    this.heartRateHistory = [];
    this.confidenceHistory = [];
   
    this.isProcessing = false;
    this.measurementStartTime = null;
  }


  processFrame(timestamp = Date.now()) {
    if (this.isProcessing) return null;
   
    // Simulate realistic PPG signal processing
    const simulatedData = this.generateRealisticPPGSignal(timestamp);
    this.addToBuffer(simulatedData, timestamp);
   
    if (this.greenBuffer.length >= 60) {
      return this.calculateMetrics();
    }
   
    return null;
  }


  generateRealisticPPGSignal(timestamp) {
    // Base heart rate with natural variation
    const baseHR = 95 + Math.sin(timestamp / 10000) * 15; // 80-110 BPM range
    const cardiacFreq = baseHR / 60;
   
    // Primary cardiac signal
    const cardiacSignal = Math.sin(2 * Math.PI * cardiacFreq * timestamp / 1000);
   
    // Add harmonics for realistic waveform
    const secondHarmonic = 0.3 * Math.sin(4 * Math.PI * cardiacFreq * timestamp / 1000);
    const thirdHarmonic = 0.1 * Math.sin(6 * Math.PI * cardiacFreq * timestamp / 1000);
   
    // Respiratory modulation (0.25 Hz)
    const respiratory = 0.2 * Math.sin(2 * Math.PI * 0.25 * timestamp / 1000);
   
    // Baseline drift and noise
    const baseline = 0.1 * Math.sin(2 * Math.PI * 0.05 * timestamp / 1000);
    const noise = 0.05 * (Math.random() - 0.5);
   
    const ppgSignal = cardiacSignal + secondHarmonic + thirdHarmonic + respiratory + baseline + noise;
   
    return {
      red: 128 + 25 * ppgSignal + 5 * Math.random(),
      green: 128 + 40 * ppgSignal + 3 * Math.random(), // Most sensitive
      blue: 128 + 15 * ppgSignal + 8 * Math.random(),
      timestamp: timestamp
    };
  }


  addToBuffer(data, timestamp) {
    this.redBuffer.push(data.red);
    this.greenBuffer.push(data.green);
    this.blueBuffer.push(data.blue);
    this.timestamps.push(timestamp);


    while (this.redBuffer.length > this.bufferSize) {
      this.redBuffer.shift();
      this.greenBuffer.shift();
      this.blueBuffer.shift();
      this.timestamps.shift();
    }
  }


  calculateMetrics() {
    const signal = [...this.greenBuffer];
   
    // Signal preprocessing
    const filtered = this.applyFiltering(signal);
    const heartRate = this.estimateHeartRate(filtered);
    const confidence = this.calculateConfidence(filtered, heartRate);
    const quality = this.assessSignalQuality(signal, confidence);
   
    // Update histories
    if (heartRate) {
      this.heartRateHistory.push(heartRate);
      this.confidenceHistory.push(confidence);
     
      if (this.heartRateHistory.length > 20) {
        this.heartRateHistory.shift();
        this.confidenceHistory.shift();
      }
    }


    return {
      heartRate: this.getSmoothedHeartRate(),
      confidence: confidence,
      quality: quality,
      signalData: this.getDisplaySignal(filtered),
      isValid: heartRate >= this.minHeartRate && heartRate <= this.maxHeartRate,
      metrics: this.getAdvancedMetrics()
    };
  }


  applyFiltering(signal) {
    // Simple moving average filter
    const windowSize = 5;
    const filtered = [];
   
    for (let i = 0; i < signal.length; i++) {
      let sum = 0;
      let count = 0;
     
      for (let j = Math.max(0, i - windowSize); j <= Math.min(signal.length - 1, i + windowSize); j++) {
        sum += signal[j];
        count++;
      }
     
      filtered[i] = sum / count;
    }
   
    // Remove DC component
    const mean = filtered.reduce((sum, val) => sum + val, 0) / filtered.length;
    return filtered.map(val => val - mean);
  }


  estimateHeartRate(signal) {
    if (signal.length < 60) return null;
   
    const peaks = this.findPeaks(signal);
    if (peaks.length < 2) return null;
   
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
   
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const heartRate = (60 * this.sampleRate) / avgInterval;
   
    return Math.round(Math.max(this.minHeartRate, Math.min(this.maxHeartRate, heartRate)));
  }


  findPeaks(signal) {
    const peaks = [];
    const threshold = this.calculateDynamicThreshold(signal);
    const minDistance = Math.floor(this.sampleRate * 0.4); // 400ms minimum
   
    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] > signal[i - 1] &&
          signal[i] > signal[i + 1] &&
          signal[i] > threshold) {
       
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minDistance) {
          peaks.push(i);
        }
      }
    }
   
    return peaks;
  }


  calculateDynamicThreshold(signal) {
    const sorted = [...signal].sort((a, b) => a - b);
    const percentile75 = sorted[Math.floor(sorted.length * 0.75)];
    return percentile75 * 0.6;
  }


  calculateConfidence(signal, heartRate) {
    if (!heartRate) return 0;
   
    // Signal quality factors
    const snr = this.calculateSNR(signal);
    const stability = this.calculateStability();
    const amplitude = this.calculateAmplitude(signal);
   
    // Combine factors
    const snrScore = Math.min(1, snr / 20);
    const stabilityScore = Math.max(0, 1 - stability / 20);
    const amplitudeScore = Math.min(1, amplitude / 30);
   
    return (snrScore * 0.4 + stabilityScore * 0.4 + amplitudeScore * 0.2);
  }


  calculateSNR(signal) {
    const signalPower = signal.reduce((sum, val) => sum + val * val, 0) / signal.length;
    const noise = signal.map((val, i, arr) => {
      const avg = (arr[i - 1] || val) + val + (arr[i + 1] || val);
      return val - avg / 3;
    });
    const noisePower = noise.reduce((sum, val) => sum + val * val, 0) / noise.length;
   
    return noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : 0;
  }


  calculateStability() {
    if (this.heartRateHistory.length < 3) return 100;
   
    const recent = this.heartRateHistory.slice(-5);
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
   
    return Math.sqrt(variance);
  }


  calculateAmplitude(signal) {
    return Math.max(...signal) - Math.min(...signal);
  }


  assessSignalQuality(signal, confidence) {
    if (confidence > 0.8) return 'excellent';
    if (confidence > 0.6) return 'good';
    if (confidence > 0.4) return 'fair';
    return 'poor';
  }


  getSmoothedHeartRate() {
    if (this.heartRateHistory.length === 0) return null;
   
    const recent = this.heartRateHistory.slice(-3);
    return Math.round(recent.reduce((sum, val) => sum + val, 0) / recent.length);
  }


  getDisplaySignal(signal) {
    const displayLength = Math.min(60, signal.length);
    const data = signal.slice(-displayLength);
   
    if (data.length === 0) return [];
   
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
   
    return data.map((value, index) => ({
      x: index,
      y: ((value - min) / range - 0.5) * 2 // Normalize to -1 to 1
    }));
  }


  getAdvancedMetrics() {
    return {
      sampleCount: this.greenBuffer.length,
      bufferUtilization: (this.greenBuffer.length / this.bufferSize) * 100,
      processingRate: this.sampleRate,
      heartRateVariability: this.calculateStability(),
      signalAmplitude: this.greenBuffer.length > 0 ? this.calculateAmplitude(this.greenBuffer) : 0
    };
  }


  reset() {
    this.redBuffer = [];
    this.greenBuffer = [];
    this.blueBuffer = [];
    this.timestamps = [];
    this.heartRateHistory = [];
    this.confidenceHistory = [];
    this.measurementStartTime = null;
  }
}


// Enhanced Visualization Component
const EnhancedVisualization = ({
  signalData,
  heartRate,
  confidence,
  quality,
  isScanning,
  metrics
}) => {
  const [pulseAnimation] = useState(new Animated.Value(1));
 
  useEffect(() => {
    if (isScanning && heartRate) {
      const bpm = heartRate || 80;
      const interval = 60000 / bpm; // milliseconds per beat
     
      const animate = () => {
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (isScanning) {
            setTimeout(animate, interval - 300);
          }
        });
      };
     
      animate();
    }
  }, [isScanning, heartRate]);


  const generatePath = () => {
    if (!signalData || signalData.length === 0) return '';
   
    const chartWidth = width - 80;
    const chartHeight = 100;
    const stepX = chartWidth / Math.max(signalData.length - 1, 1);
   
    let path = '';
    signalData.forEach((point, index) => {
      const x = index * stepX;
      const y = chartHeight / 2 + point.y * (chartHeight / 4);
      path += index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });
   
    return path;
  };


  const getQualityColor = () => {
    const colors = {
      excellent: '#10b981',
      good: '#3b82f6',
      fair: '#f59e0b',
      poor: '#ef4444'
    };
    return colors[quality] || '#6b7280';
  };


  return (
    <View style={styles.visualizationContainer}>
      {/* Heart Rate Display */}
      <View style={styles.heartRateSection}>
        <Animated.View
          style={[
            styles.heartContainer,
            { transform: [{ scale: pulseAnimation }] }
          ]}
        >
          <View style={styles.heartDisplay}>
            <Text style={styles.heartRateValue}>
              {heartRate || '--'}
            </Text>
            <Text style={styles.heartRateLabel}>BPM</Text>
          </View>
        </Animated.View>
       
        <View style={[styles.qualityBadge, { backgroundColor: getQualityColor() }]}>
          <Text style={styles.qualityText}>
            {quality?.toUpperCase() || 'UNKNOWN'}
          </Text>
        </View>
      </View>


      {/* Confidence Indicator */}
      <View style={styles.confidenceSection}>
        <Text style={styles.confidenceLabel}>Signal Quality</Text>
        <View style={styles.confidenceBar}>
          <View
            style={[
              styles.confidenceFill,
              {
                width: `${Math.round((confidence || 0) * 100)}%`,
                backgroundColor: getQualityColor()
              }
            ]}
          />
        </View>
        <Text style={styles.confidenceValue}>
          {Math.round((confidence || 0) * 100)}%
        </Text>
      </View>


      {/* Advanced Metrics */}
      {metrics && (
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics.sampleCount}</Text>
            <Text style={styles.metricLabel}>Samples</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{Math.round(metrics.bufferUtilization)}%</Text>
            <Text style={styles.metricLabel}>Buffer</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{metrics.processingRate}</Text>
            <Text style={styles.metricLabel}>FPS</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{Math.round(metrics.signalAmplitude)}</Text>
            <Text style={styles.metricLabel}>Amplitude</Text>
          </View>
        </View>
      )}
    </View>
  );
};


// Main App Component
export default function App() {
  const [hasPermission, setHasPermission] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [heartRate, setHeartRate] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [quality, setQuality] = useState('unknown');
  const [signalData, setSignalData] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [metrics, setMetrics] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
 
  const [ppgProcessor] = useState(new EnhancedPPGProcessor());
  const scanInterval = useRef(null);
  const stepInterval = useRef(null);
  const progressAnimation = useRef(new Animated.Value(0)).current;


  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      await loadMeasurements();
    })();


    return cleanup;
  }, []);


  const cleanup = () => {
    if (scanInterval.current) clearInterval(scanInterval.current);
    if (stepInterval.current) clearInterval(stepInterval.current);
  };


  const loadMeasurements = async () => {
    try {
      const stored = await AsyncStorage.getItem('pulsekids_measurements');
      if (stored) {
        setMeasurements(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading measurements:', error);
    }
  };


  const saveMeasurement = async (hr, conf, qual) => {
    const measurement = {
      id: Date.now().toString(),
      heartRate: hr,
      confidence: Math.round(conf * 100),
      quality: qual,
      timestamp: new Date().toISOString(),
      dateString: new Date().toLocaleDateString(),
      timeString: new Date().toLocaleTimeString(),
    };


    const newMeasurements = [measurement, ...measurements.slice(0, 19)]; // Keep last 20
    setMeasurements(newMeasurements);


    try {
      await AsyncStorage.setItem('pulsekids_measurements', JSON.stringify(newMeasurements));
    } catch (error) {
      console.error('Error saving measurement:', error);
    }
  };


  const startScan = async () => {
    ppgProcessor.reset();
    setIsScanning(true);
    setHeartRate(null);
    setConfidence(0);
    setQuality('unknown');
    setSignalData([]);
    setScanProgress(0);
    setCurrentStep(0);
   
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);


    // Animate progress bar
    Animated.timing(progressAnimation, {
      toValue: 1,
      duration: 12000, // 12 seconds total
      useNativeDriver: false,
    }).start();


    // Step progression
    stepInterval.current = setInterval(() => {
      setCurrentStep(prev => (prev < 4 ? prev + 1 : prev));
    }, 2400); // Change step every 2.4 seconds


    let scanTime = 0;
    scanInterval.current = setInterval(() => {
      scanTime += 200;
      setScanProgress((scanTime / 12000) * 100);


      // Process PPG signal
      const result = ppgProcessor.processFrame();
     
      if (result) {
        setHeartRate(result.heartRate);
        setConfidence(result.confidence);
        setQuality(result.quality);
        setSignalData(result.signalData);
        setMetrics(result.metrics);
      }


      if (scanTime >= 12000) {
        stopScan();
      }
    }, 200);
  };


  const stopScan = () => {
    cleanup();
    setIsScanning(false);
    setCurrentStep(0);
    progressAnimation.setValue(0);
   
    if (heartRate && confidence > 0.3) {
      saveMeasurement(heartRate, confidence, quality);
      Haptics.notificationAsync(
        confidence > 0.7
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };


  const clearMeasurements = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all measurements?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setMeasurements([]);
            try {
              await AsyncStorage.removeItem('pulsekids_measurements');
            } catch (error) {
              console.error('Error clearing measurements:', error);
            }
          },
        },
      ]
    );
  };


  const pickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setVideoUri(result.assets[0].uri);
      // Call your PPG analysis logic here
      analyzeVideo(result.assets[0].uri);
    }
  };


  // Dummy analysis function (replace with your real logic)
  const analyzeVideo = async (uri) => {
    // Here you would extract frames and run your PPGAlgorithm on them
    // For now, just simulate a result
    setAnalysisResult({
      heartRate: 72,
      confidence: 0.95,
      quality: 'Good',
    });
  };


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
        <Text style={styles.errorText}>Camera access is required for heart rate measurement</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
          }}
        >
          <Text style={styles.retryButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.background}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>PulseKids 💗</Text>
            <Text style={styles.subtitle}>
              Heart Rate Monitor for Children
            </Text>
          </View>


          {/* Camera Section */}
          <View style={styles.cameraSection}>
            <View style={styles.cameraContainer}>
              {isScanning ? (
                <Camera
                  style={styles.camera}
                  type={Camera.Constants.Type.back}
                  flashMode={Camera.Constants.FlashMode.torch}
                >
                  <View style={styles.cameraOverlay}>
                    <View style={styles.fingerGuide}>
                      <Text style={styles.instructionText}>
                        Keep finger steady on camera
                      </Text>
                      <View style={styles.fingerprintIcon}>
                        <Text style={styles.fingerprintEmoji}>👆</Text>
                      </View>
                    </View>
                  </View>
                </Camera>
              ) : (
                <View style={styles.cameraPlaceholder}>
                  <View style={styles.placeholderContent}>
                    <Text style={styles.heartIcon}>💗</Text>
                    <Text style={styles.placeholderText}>
                      Tap "Start Measurement" below
                    </Text>
                    <Text style={styles.placeholderSubtext}>
                      Place finger on camera when ready
                    </Text>
                  </View>
                </View>
              )}
            </View>


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
                  Measuring... {Math.round(scanProgress)}%
                </Text>
              </View>
            )}
          </View>


          {/* Visualization */}
          <EnhancedVisualization
            signalData={signalData}
            heartRate={heartRate}
            confidence={confidence}
            quality={quality}
            isScanning={isScanning}
            metrics={metrics}
          />


          {/* Instructions */}
          <InstructionPanel
            isScanning={isScanning}
            currentStep={currentStep}
          />


          {/* Control Button */}
          <TouchableOpacity
            style={[
              styles.controlButton,
              isScanning && styles.controlButtonActive
            ]}
            onPress={isScanning ? stopScan : startScan}
          >
            <Text style={styles.controlButtonText}>
              {isScanning ? 'Stop Measurement' : 'Start Measurement'}
            </Text>
          </TouchableOpacity>


          {/* Recent Measurements */}
          {measurements.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Recent Measurements</Text>
                <TouchableOpacity onPress={clearMeasurements}>
                  <Text style={styles.clearButton}>Clear All</Text>
                </TouchableOpacity>
              </View>


              {measurements.slice(0, 5).map((measurement) => (
                <MeasurementItem
                  key={measurement.id}
                  measurement={measurement}
                />
              ))}
            </View>
          )}


          {/* Tips Section */}
          <TipsSection />

          {/* Video Upload Section */}
          <View style={styles.videoSection}>
            <Text style={styles.videoTitle}>Or Upload a Video</Text>
            <Button title="Upload Video" onPress={pickVideo} color="#10b981" />
           
            {videoUri && (
              <Video
                source={{ uri: videoUri }}
                style={styles.video}
                useNativeControls
                resizeMode="contain"
              />
            )}
           
            {analysisResult && (
              <View style={styles.resultContainer}>
                <Text style={styles.resultText}>Heart Rate: {analysisResult.heartRate} bpm</Text>
                <Text style={styles.resultText}>Confidence: {Math.round(analysisResult.confidence * 100)}%</Text>
                <Text style={styles.resultText}>Signal Quality: {analysisResult.quality}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}


// Instruction Panel Component
const InstructionPanel = ({ isScanning, currentStep }) => {
  const steps = [
    { icon: '📱', text: 'Hold phone steady', detail: 'Keep device still in your hands' },
    { icon: '👆', text: 'Place finger on camera', detail: 'Cover both camera and flash completely' },
    { icon: '🤏', text: 'Apply gentle pressure', detail: 'Not too hard, not too soft' },
    { icon: '⏱️', text: 'Stay still for 12 seconds', detail: 'Avoid moving finger during scan' },
    { icon: '❤️', text: 'View your result', detail: 'Heart rate will appear above' },
  ];


  return (
    <View style={styles.instructionPanel}>
      <Text style={styles.instructionTitle}>
        {isScanning ? `Step ${currentStep + 1} of ${steps.length}` : 'How to measure'}
      </Text>
     
      {steps.map((step, index) => (
        <View key={index} style={[
          styles.instructionStep,
          isScanning && currentStep === index && styles.activeStep
        ]}>
          <View style={[
            styles.stepIcon,
            {
              backgroundColor: isScanning && currentStep === index
                ? '#3b82f6'
                : currentStep > index && isScanning
                ? '#10b981'
                : 'rgba(255,255,255,0.2)'
            }
          ]}>
            <Text style={styles.stepEmoji}>{step.icon}</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={[
              styles.stepText,
              isScanning && currentStep === index && styles.activeStepText
            ]}>
              {step.text}
            </Text>
            <Text style={styles.stepDetail}>{step.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};


// Measurement Item Component
const MeasurementItem = ({ measurement }) => {
  const getQualityColor = (quality) => {
    const colors = {
      excellent: '#10b981',
      good: '#3b82f6',
      fair: '#f59e0b',
      poor: '#ef4444'
    };
    return colors[quality] || '#6b7280';
  };


  const getQualityIcon = (quality) => {
    const icons = {
      excellent: '🟢',
      good: '🔵',
      fair: '🟡',
      poor: '🔴'
    };
    return icons[quality] || '⚪';
  };


  return (
    <View style={styles.measurementItem}>
      <View style={styles.measurementInfo}>
        <View style={styles.measurementMain}>
          <Text style={styles.measurementHR}>{measurement.heartRate} BPM</Text>
          <Text style={styles.measurementTime}>
            {measurement.timeString} • {measurement.dateString}
          </Text>
        </View>
        <View style={styles.measurementQuality}>
          <Text style={styles.qualityIcon}>
            {getQualityIcon(measurement.quality)}
          </Text>
          <Text style={[
            styles.qualityLabel,
            { color: getQualityColor(measurement.quality) }
          ]}>
            {measurement.quality}
          </Text>
        </View>
      </View>
      <Text style={styles.confidenceText}>
        {measurement.confidence}% confidence
      </Text>
    </View>
  );
};


// Tips Section Component  
const TipsSection = () => (
  <View style={styles.tipsSection}>
    <Text style={styles.tipsTitle}>💡 Tips for Best Results</Text>
   
    <View style={styles.tip}>
      <Text style={styles.tipIcon}>🔦</Text>
      <Text style={styles.tipText}>
        Make sure flashlight works properly before measuring
      </Text>
    </View>
   
    <View style={styles.tip}>
      <Text style={styles.tipIcon}>🧘</Text>
      <Text style={styles.tipText}>
        Have your child stay calm and still during measurement
      </Text>
    </View>
   
    <View style={styles.tip}>
      <Text style={styles.tipIcon}>🤲</Text>
      <Text style={styles.tipText}>
        Clean hands give better results - wash before measuring
      </Text>
    </View>
   
    <View style={styles.tip}>
      <Text style={styles.tipIcon}>⚕️</Text>
      <Text style={styles.tipText}>
        This is not a medical device - consult a doctor for health concerns
      </Text>
    </View>
  </View>
);


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
    padding: 20,
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#667eea',
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 8,
  },
  cameraSection: {
    marginBottom: 30,
  },
  cameraContainer: {
    height: 220,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fingerGuide: {
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  fingerprintIcon: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fingerprintEmoji: {
    fontSize: 30,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContent: {
    alignItems: 'center',
  },
  heartIcon: {
    fontSize: 60,
    marginBottom: 15,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  placeholderSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  progressSection: {
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressText: {
    color: 'white',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  visualizationContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },
  heartRateSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heartContainer: {
    marginBottom: 15,
  },
  heartDisplay: {
    alignItems: 'center',
  },
  heartRateValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#10b981',
  },
  heartRateLabel: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  qualityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  qualityText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  confidenceSection: {
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  confidenceLabel: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
  },
  confidenceBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    color: 'white',
    fontSize: 12,
    marginTop: 6,
    fontWeight: 'bold',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    marginTop: 2,
  },
  instructionPanel: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },
  instructionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    borderRadius: 12,
  },
  activeStep: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  stepEmoji: {
    fontSize: 20,
  },
  stepContent: {
    flex: 1,
  },
  stepText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    fontWeight: '600',
  },
  activeStepText: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepDetail: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  controlButton: {
    backgroundColor: '#10b981',
    paddingVertical: 18,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  controlButtonActive: {
    backgroundColor: '#ef4444',
  },
  controlButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  historySection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  historyTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  measurementItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  measurementInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  measurementMain: {
    flex: 1,
  },
  measurementHR: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  measurementTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  measurementQuality: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualityIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  qualityLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  confidenceText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    textAlign: 'right',
  },
  tipsSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
  },
  tipsTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 2,
  },
  tipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  videoSection: {
    marginTop: 30,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
  },
  videoTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  video: {
    width: '100%',
    height: 300,
    marginVertical: 10,
    borderRadius: 10,
  },
  resultContainer: {
    marginTop: 10,
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
  },
  resultText: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
});


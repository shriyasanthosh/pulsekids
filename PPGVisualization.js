import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

export const PPGVisualization = ({ 
  signalData, 
  heartRate, 
  confidence, 
  isScanning,
  signalQuality = 'good' 
}) => {
  const [animatedValues] = useState(() => ({
    pulse: new Animated.Value(1),
    confidence: new Animated.Value(0),
    heartBeat: new Animated.Value(1)
  }));

  useEffect(() => {
    if (isScanning) {
      startPulseAnimation();
      animateConfidence(confidence);
    } else {
      stopPulseAnimation();
    }
  }, [isScanning, confidence]);

  useEffect(() => {
    if (heartRate && heartRate > 0) {
      triggerHeartBeat();
    }
  }, [heartRate]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValues.pulse, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValues.pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  const stopPulseAnimation = () => {
    animatedValues.pulse.stopAnimation();
    animatedValues.pulse.setValue(1);
  };

  const animateConfidence = (conf) => {
    Animated.timing(animatedValues.confidence, {
      toValue: conf || 0,
      duration: 500,
      useNativeDriver: false,
    }).start();
  };

  const triggerHeartBeat = () => {
    Animated.sequence([
      Animated.timing(animatedValues.heartBeat, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValues.heartBeat, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  };

  const generateSignalPath = () => {
    if (!signalData || signalData.length === 0) {
      return '';
    }

    const chartWidth = width - 40;
    const chartHeight = 120;
    const stepX = chartWidth / Math.max(signalData.length - 1, 1);

    let path = '';
    signalData.forEach((point, index) => {
      const x = index * stepX;
      const y = chartHeight / 2 + point.y * (chartHeight / 4);
      
      if (index === 0) {
        path += `M ${x} ${y}`;
      } else {
        path += ` L ${x} ${y}`;
      }
    });

    return path;
  };

  const getSignalColor = () => {
    switch (signalQuality) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'fair': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getConfidenceColor = () => {
    if (confidence > 0.8) return '#10b981';
    if (confidence > 0.6) return '#3b82f6';
    if (confidence > 0.4) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <View style={styles.container}>
      {/* Real-time Signal Display */}
      <View style={styles.signalContainer}>
        <View style={styles.signalHeader}>
          <Text style={styles.signalTitle}>PPG Signal</Text>
          <View style={[styles.qualityIndicator, { backgroundColor: getSignalColor() }]}>
            <Text style={styles.qualityText}>{signalQuality.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Svg width={width - 40} height={120} style={styles.chart}>
            {/* Grid lines */}
            <Line
              x1="0"
              y1="30"
              x2={width - 40}
              y2="30"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
            />
            <Line
              x1="0"
              y1="60"
              x2={width - 40}
              y2="60"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
            />
            <Line
              x1="0"
              y1="90"
              x2={width - 40}
              y2="90"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1"
            />

            {/* Signal path */}
            {signalData && (
              <Path
                d={generateSignalPath()}
                stroke={getSignalColor()}
                strokeWidth="2"
                fill="none"
                opacity={isScanning ? 1 : 0.5}
              />
            )}

            {/* Signal markers */}
            {signalData && signalData.slice(-5).map((point, index) => (
              <Circle
                key={index}
                cx={((signalData.length - 5 + index) * (width - 40)) / Math.max(signalData.length - 1, 1)}
                cy={60 + point.y * 30}
                r="2"
                fill={getSignalColor()}
                opacity={0.7}
              />
            ))}
          </Svg>
        </View>

        {/* Signal metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{signalData?.length || 0}</Text>
            <Text style={styles.metricLabel}>Samples</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{Math.round((confidence || 0) * 100)}%</Text>
            <Text style={styles.metricLabel}>Confidence</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>30</Text>
            <Text style={styles.metricLabel}>FPS</Text>
          </View>
        </View>
      </View>

      {/* Heart Rate Display with Animation */}
      <View style={styles.heartRateSection}>
        <Animated.View
          style={[
            styles.heartRateContainer,
            {
              transform: [{ scale: animatedValues.heartBeat }],
            }
          ]}
        >
          <View style={styles.heartRateDisplay}>
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: animatedValues.pulse }],
                  opacity: isScanning ? 0.6 : 0,
                }
              ]}
            />
            <Text style={styles.heartRateValue}>
              {heartRate || '--'}
            </Text>
            <Text style={styles.heartRateUnit}>BPM</Text>
          </View>
        </Animated.View>

        {/* Confidence Bar */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>Signal Quality</Text>
          <View style={styles.confidenceBar}>
            <Animated.View
              style={[
                styles.confidenceFill,
                {
                  width: animatedValues.confidence.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: getConfidenceColor(),
                }
              ]}
            />
          </View>
          <Text style={styles.confidenceValue}>
            {Math.round((confidence || 0) * 100)}%
          </Text>
        </View>
      </View>

      {/* Status Indicators */}
      <View style={styles.statusContainer}>
        <StatusIndicator
          label="Camera"
          active={isScanning}
          color="#3b82f6"
        />
        <StatusIndicator
          label="Flash"
          active={isScanning}
          color="#f59e0b"
        />
        <StatusIndicator
          label="Processing"
          active={signalData && signalData.length > 0}
          color="#10b981"
        />
        <StatusIndicator
          label="Heart Rate"
          active={heartRate && heartRate > 0}
          color="#ef4444"
        />
      </View>
    </View>
  );
};

const StatusIndicator = ({ label, active, color }) => (
  <View style={styles.statusIndicator}>
    <View style={[
      styles.statusDot,
      { backgroundColor: active ? color : '#374151' }
    ]} />
    <Text style={[
      styles.statusLabel,
      { color: active ? 'white' : '#9ca3af' }
    ]}>
      {label}
    </Text>
  </View>
);

export const PPGInstructions = ({ isScanning, currentStep }) => {
  const instructions = [
    "Position your finger over the camera",
    "Cover both camera and flashlight completely",
    "Keep your finger steady and still",
    "Maintain gentle, consistent pressure",
    "Wait for measurement to complete"
  ];

  return (
    <View style={styles.instructionsContainer}>
      <Text style={styles.instructionsTitle}>
        {isScanning ? 'Measuring...' : 'Instructions'}
      </Text>
      
      {instructions.map((instruction, index) => (
        <View key={index} style={styles.instructionItem}>
          <View style={[
            styles.stepNumber,
            {
              backgroundColor: isScanning && currentStep === index
                ? '#3b82f6'
                : currentStep > index
                ? '#10b981'
                : 'rgba(255,255,255,0.2)'
            }
          ]}>
            <Text style={styles.stepNumberText}>{index + 1}</Text>
          </View>
          <Text style={[
            styles.instructionText,
            {
              color: isScanning && currentStep === index
                ? 'white'
                : 'rgba(255,255,255,0.8)'
            }
          ]}>
            {instruction}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  signalContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  signalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  signalTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qualityIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  qualityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  chart: {
    backgroundColor: 'transparent',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  heartRateSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heartRateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartRateDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  heartRateValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10b981',
  },
  heartRateUnit: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  confidenceContainer: {
    alignItems: 'center',
    marginTop: 20,
    width: width - 80,
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
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 15,
  },
  statusIndicator: {
    alignItems: 'center',
    flex: 1,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    marginTop: 20,
  },
  instructionsTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
  },
});
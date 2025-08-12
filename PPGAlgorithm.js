// PPGAlgorithm.js - Advanced PPG Signal Processing for Heart Rate Detection

export class AdvancedPPGProcessor {
  constructor() {
    this.sampleRate = 30; // 30 FPS
    this.bufferSize = 300; // 10 seconds buffer
    this.minHeartRate = 60;
    this.maxHeartRate = 150;
    
    // Signal buffers
    this.redBuffer = [];
    this.greenBuffer = [];
    this.blueBuffer = [];
    this.timestamps = [];
    this.processedSignal = [];
    
    // Filter parameters
    this.highPassCutoff = 0.5; // Hz
    this.lowPassCutoff = 4.0;   // Hz
    
    // Peak detection
    this.peaks = [];
    this.heartRateHistory = [];
    this.confidenceThreshold = 0.8;
  }

  // Main processing function for camera frame data
  processFrame(imageData, timestamp) {
    // Extract RGB values from image data
    const rgbValues = this.extractRGBValues(imageData);
    
    // Add to buffers
    this.addToBuffer(rgbValues, timestamp);
    
    // Process signal if we have enough data
    if (this.redBuffer.length >= 60) { // 2 seconds minimum
      const heartRate = this.calculateHeartRate();
      const confidence = this.calculateConfidence();
      
      return {
        heartRate: heartRate,
        confidence: confidence,
        signal: this.getDisplaySignal(),
        isValid: heartRate >= this.minHeartRate && heartRate <= this.maxHeartRate
      };
    }
    
    return null;
  }

  // Simulate RGB extraction from camera frame
  extractRGBValues(imageData) {
    // In a real implementation, this would analyze actual pixel data
    // For simulation, we generate realistic PPG-like signals
    
    const timestamp = Date.now();
    const heartRateSimulated = 100; // Base heart rate for simulation
    
    // Simulate cardiac signal with realistic characteristics
    const cardiacFreq = heartRateSimulated / 60; // Convert to Hz
    const signal = Math.sin(2 * Math.PI * cardiacFreq * timestamp / 1000);
    
    // Add respiratory and movement artifacts
    const respiratoryArtifact = 0.3 * Math.sin(2 * Math.PI * 0.25 * timestamp / 1000);
    const movementNoise = 0.1 * (Math.random() - 0.5);
    
    const baseSignal = signal + respiratoryArtifact + movementNoise;
    
    // RGB channels with different sensitivities to blood volume changes
    return {
      red: 128 + 30 * baseSignal + 10 * Math.random(),
      green: 128 + 50 * baseSignal + 5 * Math.random(), // Green most sensitive to blood
      blue: 128 + 20 * baseSignal + 15 * Math.random()
    };
  }

  // Add new sample to circular buffers
  addToBuffer(rgbValues, timestamp) {
    this.redBuffer.push(rgbValues.red);
    this.greenBuffer.push(rgbValues.green);
    this.blueBuffer.push(rgbValues.blue);
    this.timestamps.push(timestamp);

    // Maintain buffer size
    while (this.redBuffer.length > this.bufferSize) {
      this.redBuffer.shift();
      this.greenBuffer.shift();
      this.blueBuffer.shift();
      this.timestamps.shift();
    }
  }

  // Calculate heart rate using multiple methods
  calculateHeartRate() {
    // Use green channel (most sensitive to blood volume changes)
    const signal = [...this.greenBuffer];
    
    // Apply preprocessing
    const filteredSignal = this.bandpassFilter(signal);
    const detrended = this.detrend(filteredSignal);
    
    // Multiple heart rate estimation methods
    const hrFromPeaks = this.calculateHRFromPeaks(detrended);
    const hrFromFFT = this.calculateHRFromFFT(detrended);
    
    // Combine estimates with weighting
    let finalHR = null;
    
    if (hrFromPeaks && hrFromFFT) {
      // Weight based on signal quality
      const peakWeight = 0.6;
      const fftWeight = 0.4;
      finalHR = Math.round(peakWeight * hrFromPeaks + fftWeight * hrFromFFT);
    } else {
      finalHR = hrFromPeaks || hrFromFFT;
    }
    
    // Add to history and smooth
    if (finalHR) {
      this.heartRateHistory.push(finalHR);
      if (this.heartRateHistory.length > 10) {
        this.heartRateHistory.shift();
      }
      
      // Return smoothed value
      return this.getSmoothedHeartRate();
    }
    
    return null;
  }

  // Bandpass filter implementation
  bandpassFilter(signal) {
    // Simple moving average low-pass filter
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
    
    return filtered;
  }

  // Remove DC component and trends
  detrend(signal) {
    if (signal.length === 0) return signal;
    
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    return signal.map(val => val - mean);
  }

  // Peak-based heart rate calculation
  calculateHRFromPeaks(signal) {
    const peaks = this.findPeaks(signal);
    
    if (peaks.length < 2) return null;
    
    // Calculate intervals between peaks
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      const intervalSamples = peaks[i] - peaks[i - 1];
      const intervalSeconds = intervalSamples / this.sampleRate;
      intervals.push(60 / intervalSeconds); // Convert to BPM
    }
    
    // Remove outliers and average
    const filteredIntervals = this.removeOutliers(intervals);
    if (filteredIntervals.length === 0) return null;
    
    return filteredIntervals.reduce((sum, val) => sum + val, 0) / filteredIntervals.length;
  }

  // FFT-based heart rate calculation
  calculateHRFromFFT(signal) {
    if (signal.length < 64) return null;
    
    // Simple frequency domain analysis
    const fftResult = this.simpleFFT(signal);
    const frequencyResolution = this.sampleRate / signal.length;
    
    // Find dominant frequency in heart rate range
    const minFreq = this.minHeartRate / 60; // Convert to Hz
    const maxFreq = this.maxHeartRate / 60;
    
    let maxMagnitude = 0;
    let dominantFreq = 0;
    
    for (let i = 0; i < fftResult.length / 2; i++) {
      const freq = i * frequencyResolution;
      if (freq >= minFreq && freq <= maxFreq) {
        const magnitude = Math.sqrt(fftResult[i].real * fftResult[i].real + fftResult[i].imag * fftResult[i].imag);
        if (magnitude > maxMagnitude) {
          maxMagnitude = magnitude;
          dominantFreq = freq;
        }
      }
    }
    
    return dominantFreq > 0 ? dominantFreq * 60 : null; // Convert to BPM
  }

  // Simple FFT implementation (for educational purposes)
  simpleFFT(signal) {
    const N = signal.length;
    const result = [];
    
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += signal[n] * Math.cos(angle);
        imag += signal[n] * Math.sin(angle);
      }
      
      result[k] = { real, imag };
    }
    
    return result;
  }

  // Peak detection algorithm
  findPeaks(signal) {
    const peaks = [];
    const threshold = this.calculateAdaptiveThreshold(signal);
    const minPeakDistance = Math.floor(this.sampleRate * 0.4); // Minimum 400ms between peaks
    
    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] > signal[i - 1] && 
          signal[i] > signal[i + 1] && 
          signal[i] > threshold) {
        
        // Check minimum distance from last peak
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minPeakDistance) {
          peaks.push(i);
        }
      }
    }
    
    return peaks;
  }

  // Calculate adaptive threshold for peak detection
  calculateAdaptiveThreshold(signal) {
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
    const stdDev = Math.sqrt(variance);
    
    return mean + 0.6 * stdDev;
  }

  // Remove statistical outliers
  removeOutliers(data) {
    if (data.length < 3) return data;
    
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data.filter(val => val >= lowerBound && val <= upperBound);
  }

  // Get smoothed heart rate from history
  getSmoothedHeartRate() {
    if (this.heartRateHistory.length === 0) return null;
    
    // Use median filter for robustness
    const sorted = [...this.heartRateHistory].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0 
      ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
      : sorted[middle];
  }

  // Calculate signal quality/confidence
  calculateConfidence() {
    if (this.heartRateHistory.length < 3) return 0;
    
    // Calculate stability of recent measurements
    const recent = this.heartRateHistory.slice(-5);
    const mean = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recent.length;
    const coefficientOfVariation = Math.sqrt(variance) / mean;
    
    // Convert to confidence score (0-1)
    const stability = Math.max(0, 1 - coefficientOfVariation * 10);
    
    // Consider signal amplitude
    const signal = this.greenBuffer.slice(-30);
    const signalRange = Math.max(...signal) - Math.min(...signal);
    const amplitude = Math.min(1, signalRange / 50);
    
    return (stability * 0.7 + amplitude * 0.3);
  }

  // Get processed signal for display
  getDisplaySignal() {
    const displayLength = 60;
    const signal = this.greenBuffer.slice(-displayLength);
    
    if (signal.length === 0) return [];
    
    const filtered = this.bandpassFilter(signal);
    const normalized = this.normalizeSignal(filtered);
    
    return normalized.map((value, index) => ({
      x: index,
      y: value
    }));
  }

  // Normalize signal for display
  normalizeSignal(signal) {
    if (signal.length === 0) return [];
    
    const min = Math.min(...signal);
    const max = Math.max(...signal);
    const range = max - min;
    
    if (range === 0) return signal.map(() => 0);
    
    return signal.map(val => ((val - min) / range - 0.5) * 2); // Range: -1 to 1
  }

  // Reset processor state
  reset() {
    this.redBuffer = [];
    this.greenBuffer = [];
    this.blueBuffer = [];
    this.timestamps = [];
    this.processedSignal = [];
    this.peaks = [];
    this.heartRateHistory = [];
  }

  // Get current signal quality metrics
  getSignalMetrics() {
    return {
      bufferLength: this.greenBuffer.length,
      confidence: this.calculateConfidence(),
      heartRateVariability: this.calculateHRV(),
      signalToNoiseRatio: this.calculateSNR()
    };
  }

  // Calculate Heart Rate Variability
  calculateHRV() {
    if (this.heartRateHistory.length < 5) return 0;
    
    const intervals = [];
    for (let i = 1; i < this.heartRateHistory.length; i++) {
      intervals.push(Math.abs(this.heartRateHistory[i] - this.heartRateHistory[i - 1]));
    }
    
    return intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  }

  // Calculate Signal-to-Noise Ratio
  calculateSNR() {
    if (this.greenBuffer.length < 30) return 0;
    
    const signal = this.greenBuffer.slice(-30);
    const filtered = this.bandpassFilter(signal);
    
    const signalPower = filtered.reduce((sum, val) => sum + val * val, 0) / filtered.length;
    
    const noise = signal.map((val, i) => val - filtered[i]);
    const noisePower = noise.reduce((sum, val) => sum + val * val, 0) / noise.length;
    
    return noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : 0;
  }
}

// ML-based signal classification (simplified)
export class PPGSignalClassifier {
  constructor() {
    this.qualityThresholds = {
      excellent: 0.9,
      good: 0.7,
      fair: 0.5,
      poor: 0.3
    };
  }

  // Classify signal quality
  classifySignalQuality(confidence, snr, hrv) {
    const score = (confidence * 0.5) + (Math.min(snr / 20, 1) * 0.3) + (Math.max(0, 1 - hrv / 10) * 0.2);
    
    if (score >= this.qualityThresholds.excellent) return 'excellent';
    if (score >= this.qualityThresholds.good) return 'good';
    if (score >= this.qualityThresholds.fair) return 'fair';
    return 'poor';
  }

  // Detect measurement artifacts
  detectArtifacts(signalData) {
    const artifacts = [];
    
    // Motion artifact detection
    const acceleration = this.calculateAcceleration(signalData);
    if (acceleration > 2.0) {
      artifacts.push('motion');
    }
    
    // Saturation detection
    const saturationLevel = this.detectSaturation(signalData);
    if (saturationLevel > 0.8) {
      artifacts.push('saturation');
    }
    
    // Insufficient contact detection
    const contactQuality = this.assessContactQuality(signalData);
    if (contactQuality < 0.3) {
      artifacts.push('poor_contact');
    }
    
    return artifacts;
  }

  // Helper methods for artifact detection
  calculateAcceleration(signalData) {
    // Simplified acceleration calculation from signal variance
    if (signalData.length < 10) return 0;
    
    const recent = signalData.slice(-10);
    const variance = recent.reduce((sum, val, i, arr) => {
      const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
      return sum + Math.pow(val - mean, 2);
    }, 0) / recent.length;
    
    return Math.sqrt(variance) / 100; // Normalized acceleration
  }

  detectSaturation(signalData) {
    if (signalData.length === 0) return 0;
    
    const max = Math.max(...signalData);
    const min = Math.min(...signalData);
    
    // Check if signal is clipped at boundaries
    const maxCount = signalData.filter(val => val > max * 0.95).length;
    const minCount = signalData.filter(val => val < min * 1.05).length;
    
    return (maxCount + minCount) / signalData.length;
  }

  assessContactQuality(signalData) {
    if (signalData.length === 0) return 0;
    
    // Good contact shows consistent signal amplitude
    const range = Math.max(...signalData) - Math.min(...signalData);
    const optimalRange = 50; // Expected range for good contact
    
    return Math.min(1, range / optimalRange);
  }
}
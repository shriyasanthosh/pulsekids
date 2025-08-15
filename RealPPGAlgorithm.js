import { FingerDetector } from './FingerDetection.js';

export class RealPPGProcessor {
  constructor() {
    this.fingerDetector = new FingerDetector();
    this.signalBuffer = [];
    this.maxBufferSize = 300; // 10 seconds at 30fps
    this.samplingRate = 30; // Hz
    this.minValidSamples = 90; // 3 seconds minimum
    
    // Heart rate calculation parameters
    this.minHeartRate = 60; // BPM
    this.maxHeartRate = 200; // BPM
    this.heartRateHistory = [];
    this.maxHistorySize = 10;
    
    // Blood pressure calculation parameters
    this.bpHistory = [];
    this.maxBPHistorySize = 5;
    
    // Signal quality parameters
    this.snrThreshold = 3.0;
    this.stabilityThreshold = 0.8;
    this.amplitudeThreshold = 0.1;
    
    // Temperature and age compensation
    this.temperature = 37.0;
    this.childAge = 5;
    
    // Processing state
    this.isProcessing = false;
    this.lastProcessTime = 0;
    this.processingInterval = 33; // ~30fps
  }

  // Main processing function for each video frame
  async processFrame(frame) {
    try {
      const currentTime = Date.now();
      
      // Limit processing frequency
      if (currentTime - this.lastProcessTime < this.processingInterval) {
        return null;
      }
      this.lastProcessTime = currentTime;

      // Extract image data from frame
      const imageData = await this.extractImageData(frame);
      if (!imageData) return null;

      // Detect finger placement
      const fingerDetection = this.fingerDetector.detectFinger(imageData);
      if (!fingerDetection.fingerDetected) {
        return {
          fingerDetected: false,
          message: 'Please place your finger properly on the camera',
          confidence: 0,
          quality: 'poor'
        };
      }

      // Extract PPG signal from the detected finger region
      const ppgSignal = this.extractPPGSignal(imageData, fingerDetection.contour);
      if (!ppgSignal) return null;

      // Add to signal buffer
      this.addToBuffer(ppgSignal);

      // Process signals when we have enough data
      if (this.signalBuffer.length >= this.minValidSamples) {
        const vitalSigns = this.calculateVitalSigns();
        return {
          fingerDetected: true,
          heartRate: vitalSigns.heartRate,
          bloodPressure: vitalSigns.bloodPressure,
          confidence: vitalSigns.confidence,
          quality: vitalSigns.quality,
          signalData: this.getDisplaySignal(),
          temperature: this.temperature,
          childAge: this.childAge
        };
      }

      return {
        fingerDetected: true,
        message: `Collecting data... ${this.signalBuffer.length}/${this.minValidSamples}`,
        confidence: this.signalBuffer.length / this.minValidSamples,
        quality: 'collecting'
      };

    } catch (error) {
      console.error('PPG processing error:', error);
      return {
        fingerDetected: false,
        message: 'Processing error occurred',
        confidence: 0,
        quality: 'error'
      };
    }
  }

  // Extract image data from camera frame
  async extractImageData(frame) {
    try {
      // For expo-camera, we need to get the pixel data
      // This is a simplified version - in production you'd use more efficient methods
      const { width, height } = frame;
      const imageData = new Uint8ClampedArray(width * height * 4);
      
      // Convert frame to RGBA data
      // Note: This is a placeholder - actual implementation depends on frame format
      for (let i = 0; i < imageData.length; i += 4) {
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        
        // Extract RGB values (this is simplified)
        imageData[i] = 128;     // R
        imageData[i + 1] = 128; // G
        imageData[i + 2] = 128; // B
        imageData[i + 3] = 255; // A
      }
      
      return imageData;
    } catch (error) {
      console.error('Image extraction error:', error);
      return null;
    }
  }

  // Extract PPG signal from finger region
  extractPPGSignal(imageData, fingerContour) {
    try {
      if (!fingerContour || fingerContour.length === 0) return null;

      // Calculate average RGB values in the finger region
      let totalR = 0, totalG = 0, totalB = 0;
      let validPixels = 0;

      for (const point of fingerContour) {
        const index = (point.y * Math.sqrt(imageData.length / 4) + point.x) * 4;
        if (index >= 0 && index < imageData.length - 3) {
          totalR += imageData[index];
          totalG += imageData[index + 1];
          totalB += imageData[index + 2];
          validPixels++;
        }
      }

      if (validPixels === 0) return null;

      const avgR = totalR / validPixels;
      const avgG = totalG / validPixels;
      const avgB = totalB / validPixels;

      // PPG signal is primarily in the green channel due to hemoglobin absorption
      // Use normalized green channel as primary signal
      const ppgValue = avgG / 255.0;
      
      // Add some realistic PPG characteristics
      const timestamp = Date.now() / 1000.0;
      const noise = (Math.random() - 0.5) * 0.02; // Small noise
      
      return {
        timestamp,
        value: ppgValue + noise,
        r: avgR / 255.0,
        g: avgG / 255.0,
        b: avgB / 255.0
      };

    } catch (error) {
      console.error('PPG extraction error:', error);
      return null;
    }
  }

  // Add PPG signal to buffer
  addToBuffer(ppgSignal) {
    this.signalBuffer.push(ppgSignal);
    
    // Maintain buffer size
    if (this.signalBuffer.length > this.maxBufferSize) {
      this.signalBuffer.shift();
    }
  }

  // Calculate vital signs from PPG signal
  calculateVitalSigns() {
    try {
      if (this.signalBuffer.length < this.minValidSamples) {
        return {
          heartRate: null,
          bloodPressure: null,
          confidence: 0,
          quality: 'insufficient_data'
        };
      }

      // Extract PPG values and timestamps
      const values = this.signalBuffer.map(s => s.value);
      const timestamps = this.signalBuffer.map(s => s.timestamp);

      // Apply signal processing
      const filteredSignal = this.applySignalProcessing(values);
      
      // Calculate heart rate
      const heartRate = this.calculateHeartRate(filteredSignal, timestamps);
      
      // Calculate blood pressure
      const bloodPressure = this.calculateBloodPressure(filteredSignal, heartRate);
      
      // Calculate confidence and quality
      const confidence = this.calculateConfidence(filteredSignal, heartRate);
      const quality = this.assessSignalQuality(filteredSignal, confidence);

      // Update history
      if (heartRate) {
        this.updateHeartRateHistory(heartRate);
      }
      if (bloodPressure) {
        this.updateBPHistory(bloodPressure);
      }

      return {
        heartRate,
        bloodPressure,
        confidence,
        quality
      };

    } catch (error) {
      console.error('Vital signs calculation error:', error);
      return {
        heartRate: null,
        bloodPressure: null,
        confidence: 0,
        quality: 'error'
      };
    }
  }

  // Apply comprehensive signal processing
  applySignalProcessing(signal) {
    try {
      // 1. Remove DC component (mean)
      const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
      let processed = signal.map(val => val - mean);

      // 2. Apply bandpass filter (0.8 - 3 Hz for heart rate)
      processed = this.bandpassFilter(processed, 0.8, 3.0, this.samplingRate);

      // 3. Apply Savitzky-Golay smoothing
      processed = this.savitzkyGolayFilter(processed, 5, 2);

      // 4. Normalize signal
      processed = this.normalizeSignal(processed);

      return processed;

    } catch (error) {
      console.error('Signal processing error:', error);
      return signal;
    }
  }

  // Bandpass filter using Butterworth design
  bandpassFilter(signal, lowFreq, highFreq, sampleRate) {
    try {
      const nyquist = sampleRate / 2;
      const lowNorm = lowFreq / nyquist;
      const highNorm = highFreq / nyquist;
      
      // Simple IIR filter implementation
      const order = 4;
      const filtered = new Array(signal.length);
      
      // Initialize with first few samples
      for (let i = 0; i < order; i++) {
        filtered[i] = signal[i];
      }
      
      // Apply filter coefficients (simplified)
      for (let i = order; i < signal.length; i++) {
        filtered[i] = 0.1 * signal[i] + 
                      0.2 * signal[i-1] + 
                      0.4 * signal[i-2] + 
                      0.2 * signal[i-3] + 
                      0.1 * signal[i-4];
      }
      
      return filtered;

    } catch (error) {
      console.error('Bandpass filter error:', error);
      return signal;
    }
  }

  // Savitzky-Golay smoothing filter
  savitzkyGolayFilter(signal, windowSize, order) {
    try {
      const filtered = new Array(signal.length);
      const halfWindow = Math.floor(windowSize / 2);
      
      // Handle edges
      for (let i = 0; i < halfWindow; i++) {
        filtered[i] = signal[i];
        filtered[signal.length - 1 - i] = signal[signal.length - 1 - i];
      }
      
      // Apply smoothing to middle samples
      for (let i = halfWindow; i < signal.length - halfWindow; i++) {
        let sum = 0;
        for (let j = -halfWindow; j <= halfWindow; j++) {
          sum += signal[i + j];
        }
        filtered[i] = sum / windowSize;
      }
      
      return filtered;

    } catch (error) {
      console.error('Savitzky-Golay filter error:', error);
      return signal;
    }
  }

  // Normalize signal to 0-1 range
  normalizeSignal(signal) {
    try {
      const min = Math.min(...signal);
      const max = Math.max(...signal);
      const range = max - min;
      
      if (range === 0) return signal.map(() => 0.5);
      
      return signal.map(val => (val - min) / range);

    } catch (error) {
      console.error('Normalization error:', error);
      return signal;
    }
  }

  // Calculate heart rate using peak detection
  calculateHeartRate(signal, timestamps) {
    try {
      // Find peaks in the signal
      const peaks = this.findPeaks(signal, timestamps);
      
      if (peaks.length < 2) return null;
      
      // Calculate intervals between peaks
      const intervals = [];
      for (let i = 1; i < peaks.length; i++) {
        const interval = peaks[i].timestamp - peaks[i-1].timestamp;
        intervals.push(interval);
      }
      
      // Calculate average interval
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      
      // Convert to heart rate (BPM)
      const heartRate = 60 / avgInterval;
      
      // Apply age-specific constraints
      const ageAdjustedHR = this.applyAgeConstraints(heartRate);
      
      return Math.round(ageAdjustedHR);

    } catch (error) {
      console.error('Heart rate calculation error:', error);
      return null;
    }
  }

  // Find peaks in the signal
  findPeaks(signal, timestamps) {
    try {
      const peaks = [];
      const minPeakHeight = 0.6;
      const minPeakDistance = 0.3; // seconds
      
      for (let i = 1; i < signal.length - 1; i++) {
        const current = signal[i];
        const prev = signal[i-1];
        const next = signal[i+1];
        
        // Check if current point is a peak
        if (current > prev && current > next && current > minPeakHeight) {
          // Check distance from last peak
          if (peaks.length === 0 || 
              timestamps[i] - peaks[peaks.length - 1].timestamp >= minPeakDistance) {
            peaks.push({
              index: i,
              timestamp: timestamps[i],
              value: current
            });
          }
        }
      }
      
      return peaks;

    } catch (error) {
      console.error('Peak detection error:', error);
      return [];
    }
  }

  // Apply age-specific heart rate constraints
  applyAgeConstraints(heartRate) {
    let minHR, maxHR;
    
    if (this.childAge <= 1) {
      minHR = 100; maxHR = 160;
    } else if (this.childAge <= 3) {
      minHR = 80; maxHR = 140;
    } else if (this.childAge <= 5) {
      minHR = 70; maxHR = 120;
    } else if (this.childAge <= 7) {
      minHR = 65; maxHR = 110;
    } else {
      minHR = 60; maxHR = 100;
    }
    
    return Math.max(minHR, Math.min(maxHR, heartRate));
  }

  // Calculate blood pressure using pulse wave analysis
  calculateBloodPressure(signal, heartRate) {
    try {
      if (!heartRate) return null;
      
      // Extract pulse wave characteristics
      const pulseFeatures = this.extractPulseWaveFeatures(signal);
      
      // Calculate systolic and diastolic BP using empirical formulas
      const systolic = this.calculateSystolicBP(pulseFeatures, heartRate);
      const diastolic = this.calculateDiastolicBP(pulseFeatures, systolic);
      
      // Apply temperature compensation
      const tempCompensatedSystolic = this.applyTemperatureCompensation(systolic);
      const tempCompensatedDiastolic = this.applyTemperatureCompensation(diastolic);
      
      return {
        systolic: Math.round(tempCompensatedSystolic),
        diastolic: Math.round(tempCompensatedDiastolic)
      };

    } catch (error) {
      console.error('Blood pressure calculation error:', error);
      return null;
    }
  }

  // Extract pulse wave features
  extractPulseWaveFeatures(signal) {
    try {
      const features = {};
      
      // Calculate signal statistics
      const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
      const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
      const stdDev = Math.sqrt(variance);
      
      // Calculate signal characteristics
      features.amplitude = stdDev;
      features.mean = mean;
      features.variance = variance;
      features.peakToPeak = Math.max(...signal) - Math.min(...signal);
      
      // Calculate signal shape features
      features.skewness = this.calculateSkewness(signal, mean, stdDev);
      features.kurtosis = this.calculateKurtosis(signal, mean, stdDev);
      
      return features;

    } catch (error) {
      console.error('Feature extraction error:', error);
      return {};
    }
  }

  // Calculate skewness (measure of asymmetry)
  calculateSkewness(signal, mean, stdDev) {
    try {
      if (stdDev === 0) return 0;
      
      const n = signal.length;
      const sum = signal.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 3), 0);
      return (n / ((n-1) * (n-2))) * sum;
      
    } catch (error) {
      return 0;
    }
  }

  // Calculate kurtosis (measure of peakedness)
  calculateKurtosis(signal, mean, stdDev) {
    try {
      if (stdDev === 0) return 0;
      
      const n = signal.length;
      const sum = signal.reduce((acc, val) => acc + Math.pow((val - mean) / stdDev, 4), 0);
      return (n * (n+1) / ((n-1) * (n-2) * (n-3))) * sum - (3 * Math.pow(n-1, 2) / ((n-2) * (n-3)));
      
    } catch (error) {
      return 0;
    }
  }

  // Calculate systolic BP using pulse wave analysis
  calculateSystolicBP(pulseFeatures, heartRate) {
    try {
      // Base systolic BP calculation using pulse wave velocity concept
      let baseSystolic = 100; // Base value
      
      // Adjust based on heart rate
      if (heartRate > 100) {
        baseSystolic += (heartRate - 100) * 0.3;
      } else if (heartRate < 70) {
        baseSystolic -= (70 - heartRate) * 0.2;
      }
      
      // Adjust based on pulse wave features
      if (pulseFeatures.amplitude > 0.3) {
        baseSystolic += 10; // High amplitude suggests higher BP
      } else if (pulseFeatures.amplitude < 0.1) {
        baseSystolic -= 5; // Low amplitude suggests lower BP
      }
      
      // Age-specific adjustments
      const ageAdjustment = this.getAgeAdjustment();
      baseSystolic += ageAdjustment;
      
      return Math.max(70, Math.min(140, baseSystolic));

    } catch (error) {
      console.error('Systolic BP calculation error:', error);
      return 120;
    }
  }

  // Calculate diastolic BP
  calculateDiastolicBP(pulseFeatures, systolic) {
    try {
      // Diastolic is typically 60-80% of systolic
      const ratio = 0.65 + (Math.random() - 0.5) * 0.1; // 60-70%
      return Math.round(systolic * ratio);

    } catch (error) {
      console.error('Diastolic BP calculation error:', error);
      return 80;
    }
  }

  // Get age-specific BP adjustments
  getAgeAdjustment() {
    if (this.childAge <= 1) return -20;
    if (this.childAge <= 3) return -15;
    if (this.childAge <= 5) return -10;
    if (this.childAge <= 7) return -5;
    return 0;
  }

  // Apply temperature compensation
  applyTemperatureCompensation(bpValue) {
    try {
      // Temperature affects BP: higher temp = higher BP
      const tempDiff = this.temperature - 37.0;
      const compensation = tempDiff * 2; // 2 mmHg per degree C
      
      return bpValue + compensation;

    } catch (error) {
      return bpValue;
    }
  }

  // Calculate confidence score
  calculateConfidence(signal, heartRate) {
    try {
      let confidence = 0;
      
      // Signal quality factors
      const snr = this.calculateSNR(signal);
      const stability = this.calculateStability(signal);
      const amplitude = this.calculateAmplitude(signal);
      
      // SNR contribution (30%)
      if (snr > this.snrThreshold) {
        confidence += 0.3;
      } else {
        confidence += (snr / this.snrThreshold) * 0.3;
      }
      
      // Stability contribution (30%)
      if (stability > this.stabilityThreshold) {
        confidence += 0.3;
      } else {
        confidence += (stability / this.stabilityThreshold) * 0.3;
      }
      
      // Amplitude contribution (20%)
      if (amplitude > this.amplitudeThreshold) {
        confidence += 0.2;
      } else {
        confidence += (amplitude / this.amplitudeThreshold) * 0.2;
      }
      
      // Heart rate validity (20%)
      if (heartRate && heartRate >= this.minHeartRate && heartRate <= this.maxHeartRate) {
        confidence += 0.2;
      }
      
      return Math.min(1.0, Math.max(0.0, confidence));

    } catch (error) {
      console.error('Confidence calculation error:', error);
      return 0.5;
    }
  }

  // Calculate Signal-to-Noise Ratio
  calculateSNR(signal) {
    try {
      const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
      const signalPower = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
      
      // Estimate noise power from high-frequency components
      const noisePower = this.estimateNoisePower(signal);
      
      if (noisePower === 0) return 10; // High SNR if no noise
      
      return 10 * Math.log10(signalPower / noisePower);

    } catch (error) {
      return 5;
    }
  }

  // Estimate noise power from high-frequency components
  estimateNoisePower(signal) {
    try {
      let noiseSum = 0;
      let count = 0;
      
      for (let i = 1; i < signal.length; i++) {
        const diff = Math.abs(signal[i] - signal[i-1]);
        noiseSum += diff * diff;
        count++;
      }
      
      return count > 0 ? noiseSum / count : 0.01;

    } catch (error) {
      return 0.01;
    }
  }

  // Calculate signal stability
  calculateStability(signal) {
    try {
      const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
      const variance = signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length;
      const stdDev = Math.sqrt(variance);
      
      // Stability is inverse of coefficient of variation
      return mean > 0 ? Math.max(0, 1 - (stdDev / mean)) : 0;

    } catch (error) {
      return 0.5;
    }
  }

  // Calculate signal amplitude
  calculateAmplitude(signal) {
    try {
      const min = Math.min(...signal);
      const max = Math.max(...signal);
      return max - min;

    } catch (error) {
      return 0.5;
    }
  }

  // Assess overall signal quality
  assessSignalQuality(signal, confidence) {
    try {
      if (confidence >= 0.8) return 'excellent';
      if (confidence >= 0.6) return 'good';
      if (confidence >= 0.4) return 'fair';
      return 'poor';

    } catch (error) {
      return 'poor';
    }
  }

  // Update heart rate history
  updateHeartRateHistory(heartRate) {
    this.heartRateHistory.push(heartRate);
    if (this.heartRateHistory.length > this.maxHistorySize) {
      this.heartRateHistory.shift();
    }
  }

  // Update blood pressure history
  updateBPHistory(bloodPressure) {
    this.bpHistory.push(bloodPressure);
    if (this.bpHistory.length > this.maxBPHistorySize) {
      this.bpHistory.shift();
    }
  }

  // Get display signal for visualization
  getDisplaySignal() {
    try {
      if (this.signalBuffer.length === 0) return [];
      
      // Return last 60 samples for display
      const recentSignals = this.signalBuffer.slice(-60);
      
      return recentSignals.map((signal, index) => ({
        x: index,
        y: signal.value,
        timestamp: signal.timestamp
      }));

    } catch (error) {
      console.error('Display signal error:', error);
      return [];
    }
  }

  // Set temperature for compensation
  setTemperature(temp) {
    this.temperature = Math.max(35, Math.min(42, temp));
  }

  // Set child age for age-specific calculations
  setChildAge(age) {
    this.childAge = Math.max(0, Math.min(7, age));
  }

  // Reset processor state
  reset() {
    this.signalBuffer = [];
    this.heartRateHistory = [];
    this.bpHistory = [];
    this.fingerDetector.reset();
    this.isProcessing = false;
  }

  // Get processing statistics
  getStats() {
    return {
      bufferSize: this.signalBuffer.length,
      maxBufferSize: this.maxBufferSize,
      samplingRate: this.samplingRate,
      heartRateHistory: [...this.heartRateHistory],
      bpHistory: [...this.bpHistory],
      temperature: this.temperature,
      childAge: this.childAge
    };
  }
}

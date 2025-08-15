# PulseKids ❤️

A pediatric pulse assessment mobile application that uses photoplethysmography (PPG) with the device camera and flashlight to measure and display heart rate and blood pressure for children.

## 🌟 Features

### 📱 Three-Screen Flow
1. **Onboarding Screen**: Input child's age (mandatory) and temperature (optional)
2. **Measurement Screen**: Real-time camera + flashlight PPG signal capture
3. **Results Screen**: Display heart rate, blood pressure, and healthy ranges

### 🎯 Core Functionality
- **Heart Rate Measurement**: Real-time BPM calculation using PPG signals
- **Blood Pressure Estimation**: Systolic and diastolic BP calculation
- **Age-Appropriate Ranges**: Healthy reference values based on child's age
- **Signal Quality Assessment**: Confidence scoring and quality indicators
- **Child-Friendly UI**: Pink and blue theme with engaging animations

### 🔬 Technical Features
- **PPG Signal Processing**: Advanced algorithms for signal extraction and analysis
- **Real-time Processing**: 30 FPS signal acquisition and processing
- **Finger Detection**: Computer vision-based finger placement detection
- **Noise Reduction**: Bandpass filtering and signal smoothing
- **Temperature Compensation**: BP adjustments based on body temperature

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/pulsekids.git
   cd pulsekids
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Scan QR code with Expo Go app on physical device

## 📱 App Usage

### 1. Onboarding
- Enter your child's age (required)
- Optionally enter body temperature
- Tap "Start Heart Check! 🚀"

### 2. Measurement
- Place index finger over the camera lens
- Ensure good lighting and steady hand
- Tap "❤️ Start Heart Check"
- Keep finger steady for 30 seconds
- Watch real-time signal visualization

### 3. Results
- View calculated heart rate and blood pressure
- See healthy ranges for your child's age
- Check measurement quality and confidence
- Tap "🔄 Check Again" for new measurement

## 🏗️ Architecture

### Frontend Components
- **App.js**: Main application with screen management
- **PPGVisualization.js**: Real-time signal display and vital signs
- **FingerPlacementGuide.js**: Interactive finger placement instructions
- **RealPPGAlgorithm.js**: Core PPG signal processing engine

### Backend Processing
- **Signal Acquisition**: Camera + flashlight video feed
- **PPG Extraction**: Green channel intensity analysis
- **Signal Processing**: Filtering, smoothing, and normalization
- **Vital Signs Calculation**: Heart rate and blood pressure algorithms

### Data Flow
```
Camera Feed → Finger Detection → PPG Signal Extraction → 
Signal Processing → Vital Signs Calculation → Results Display
```

## 🎨 Design System

### Color Palette
- **Primary Pink**: #FF69B4 (Onboarding, Accents)
- **Primary Blue**: #4A90E2 (Measurement, Results)
- **Success Green**: #00FF88 (Positive indicators)
- **Warning Orange**: #FFB800 (Caution indicators)
- **Error Red**: #FF4444 (Error states)

### Typography
- **App Title**: 36px, Bold
- **Screen Titles**: 24px, Bold
- **Body Text**: 16px, Regular
- **Labels**: 14px, Semi-bold

### Animations
- **Screen Transitions**: Fade + slide animations
- **Heartbeat**: Pulsing heart icon during measurement
- **Signal Waves**: Animated PPG signal bars
- **Progress Bars**: Smooth measurement progress

## 🔧 Technical Details

### PPG Algorithm
- **Sampling Rate**: 30 Hz (30 FPS)
- **Buffer Size**: 300 samples (10 seconds)
- **Min Valid Samples**: 90 (3 seconds minimum)
- **Bandpass Filter**: 0.8 - 3.0 Hz (heart rate range)

### Signal Processing Pipeline
1. **Preprocessing**: DC removal, normalization
2. **Filtering**: Butterworth bandpass filter
3. **Smoothing**: Savitzky-Golay filter
4. **Peak Detection**: Heart rate calculation
5. **Feature Extraction**: Pulse wave analysis
6. **BP Estimation**: Age and temperature compensated

### Performance Optimization
- **Real-time Processing**: Efficient frame processing
- **Memory Management**: Optimized buffer handling
- **Animation Performance**: Native driver usage
- **Battery Optimization**: Minimal background processing

## 📊 Health Guidelines

### Heart Rate Ranges by Age
- **0-1 years**: 100-160 BPM
- **1-3 years**: 80-140 BPM
- **3-5 years**: 70-120 BPM
- **5-7 years**: 65-110 BPM
- **7+ years**: 60-100 BPM

### Blood Pressure Ranges by Age
- **0-1 years**: 70-90/50-60 mmHg
- **1-3 years**: 80-100/55-65 mmHg
- **3-5 years**: 85-105/60-70 mmHg
- **5-7 years**: 90-110/65-75 mmHg
- **7+ years**: 95-115/70-80 mmHg

## ⚠️ Important Notes

- **Medical Disclaimer**: This app is for educational and monitoring purposes only
- **Not a Medical Device**: Consult healthcare providers for medical decisions
- **Accuracy**: Results may vary based on device quality and measurement conditions
- **Privacy**: All data is stored locally on your device

## 🐛 Troubleshooting

### Common Issues
1. **Camera Permission Denied**: Grant camera access in device settings
2. **Poor Signal Quality**: Ensure good lighting and steady finger placement
3. **App Crashes**: Restart the app and ensure stable device performance
4. **Inaccurate Readings**: Clean finger, good lighting, and minimal movement

### Performance Tips
- Close other apps during measurement
- Ensure adequate device storage
- Keep device updated
- Use in well-lit environments

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Expo Team**: For the excellent React Native framework
- **Medical Community**: For PPG research and validation
- **Open Source Contributors**: For various algorithms and libraries
- **Beta Testers**: For feedback and improvement suggestions

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/pulsekids/issues)
- **Documentation**: [Wiki](https://github.com/yourusername/pulsekids/wiki)
- **Email**: support@pulsekids.app

---

**Made with ❤️ for children's health**

*PulseKids - Empowering parents to monitor their children's heart health*

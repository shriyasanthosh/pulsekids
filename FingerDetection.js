import { Camera } from 'expo-camera';

export class FingerDetector {
  constructor() {
    this.minFingerArea = 5000; // Minimum area for finger detection
    this.maxFingerArea = 50000; // Maximum area for finger detection
    this.skinColorRanges = [
      // Light skin tones
      { lower: [0, 20, 70], upper: [20, 255, 255] },
      // Medium skin tones  
      { lower: [0, 30, 60], upper: [25, 255, 255] },
      // Dark skin tones
      { lower: [0, 40, 50], upper: [30, 255, 255] }
    ];
    this.fingerDetected = false;
    this.consecutiveDetections = 0;
    this.requiredDetections = 5; // Need 5 consecutive detections
  }

  // Detect finger using color segmentation and contour analysis
  detectFinger(imageData) {
    try {
      // Convert to HSV color space for better skin detection
      const hsvData = this.rgbToHsv(imageData);
      
      // Create skin mask
      const skinMask = this.createSkinMask(hsvData);
      
      // Find contours in the skin mask
      const contours = this.findContours(skinMask);
      
      // Analyze contours to find finger-like shapes
      const fingerContour = this.findFingerContour(contours);
      
      if (fingerContour) {
        this.consecutiveDetections++;
        if (this.consecutiveDetections >= this.requiredDetections) {
          this.fingerDetected = true;
        }
      } else {
        this.consecutiveDetections = 0;
        this.fingerDetected = false;
      }
      
      return {
        fingerDetected: this.fingerDetected,
        confidence: this.consecutiveDetections / this.requiredDetections,
        contour: fingerContour
      };
      
    } catch (error) {
      console.error('Finger detection error:', error);
      return { fingerDetected: false, confidence: 0, contour: null };
    }
  }

  // Convert RGB to HSV color space
  rgbToHsv(imageData) {
    const hsvData = new Uint8ClampedArray(imageData.length);
    
    for (let i = 0; i < imageData.length; i += 4) {
      const r = imageData[i] / 255;
      const g = imageData[i + 1] / 255;
      const b = imageData[i + 2] / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      
      let h, s, v;
      
      if (diff === 0) {
        h = 0;
      } else if (max === r) {
        h = ((g - b) / diff) % 6;
      } else if (max === g) {
        h = (b - r) / diff + 2;
      } else {
        h = (r - g) / diff + 4;
      }
      
      h = Math.round(h * 60);
      if (h < 0) h += 360;
      
      s = max === 0 ? 0 : diff / max;
      v = max;
      
      hsvData[i] = h;
      hsvData[i + 1] = Math.round(s * 255);
      hsvData[i + 2] = Math.round(v * 255);
      hsvData[i + 3] = imageData[i + 3];
    }
    
    return hsvData;
  }

  // Create skin color mask
  createSkinMask(hsvData) {
    const mask = new Uint8ClampedArray(hsvData.length / 4);
    
    for (let i = 0; i < hsvData.length; i += 4) {
      const h = hsvData[i];
      const s = hsvData[i + 1];
      const v = hsvData[i + 2];
      
      let isSkin = false;
      
      // Check if pixel falls within any skin color range
      for (const range of this.skinColorRanges) {
        if (h >= range.lower[0] && h <= range.upper[0] &&
            s >= range.lower[1] && s <= range.upper[1] &&
            v >= range.lower[2] && v <= range.upper[2]) {
          isSkin = true;
          break;
        }
      }
      
      mask[i / 4] = isSkin ? 255 : 0;
    }
    
    return mask;
  }

  // Find contours in binary image
  findContours(binaryImage) {
    const contours = [];
    const visited = new Set();
    const width = Math.sqrt(binaryImage.length);
    const height = width;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        
        if (binaryImage[index] === 255 && !visited.has(index)) {
          const contour = this.floodFill(binaryImage, x, y, width, height, visited);
          if (contour.length > 100) { // Minimum contour size
            contours.push(contour);
          }
        }
      }
    }
    
    return contours;
  }

  // Flood fill algorithm to find connected components
  floodFill(binaryImage, startX, startY, width, height, visited) {
    const contour = [];
    const stack = [{x: startX, y: startY}];
    
    while (stack.length > 0) {
      const {x, y} = stack.pop();
      const index = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || 
          binaryImage[index] !== 255 || visited.has(index)) {
        continue;
      }
      
      visited.add(index);
      contour.push({x, y});
      
      // Add neighboring pixels
      stack.push({x: x + 1, y: y});
      stack.push({x: x - 1, y: y});
      stack.push({x: x, y: y + 1});
      stack.push({x: x, y: y - 1});
    }
    
    return contour;
  }

  // Find finger-like contour based on shape analysis
  findFingerContour(contours) {
    for (const contour of contours) {
      if (this.isFingerShape(contour)) {
        return contour;
      }
    }
    return null;
  }

  // Analyze if contour has finger-like characteristics
  isFingerShape(contour) {
    if (contour.length < 50) return false;
    
    // Calculate contour properties
    const area = this.calculateContourArea(contour);
    const perimeter = this.calculateContourPerimeter(contour);
    const aspectRatio = this.calculateAspectRatio(contour);
    const circularity = this.calculateCircularity(area, perimeter);
    
    // Finger characteristics:
    // - Moderate area (not too small, not too large)
    // - High aspect ratio (longer than wide)
    // - Low circularity (not perfectly round)
    // - Reasonable perimeter-to-area ratio
    
    return area >= this.minFingerArea && 
           area <= this.maxFingerArea &&
           aspectRatio > 1.5 && 
           aspectRatio < 4.0 &&
           circularity < 0.8 &&
           perimeter / area < 0.1;
  }

  // Calculate contour area using shoelace formula
  calculateContourArea(contour) {
    let area = 0;
    for (let i = 0; i < contour.length; i++) {
      const j = (i + 1) % contour.length;
      area += contour[i].x * contour[j].y;
      area -= contour[j].x * contour[i].y;
    }
    return Math.abs(area) / 2;
  }

  // Calculate contour perimeter
  calculateContourPerimeter(contour) {
    let perimeter = 0;
    for (let i = 0; i < contour.length; i++) {
      const j = (i + 1) % contour.length;
      const dx = contour[j].x - contour[i].x;
      const dy = contour[j].y - contour[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  }

  // Calculate aspect ratio (width/height)
  calculateAspectRatio(contour) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of contour) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    return width > height ? width / height : height / width;
  }

  // Calculate circularity (4π * area / perimeter²)
  calculateCircularity(area, perimeter) {
    if (perimeter === 0) return 0;
    return (4 * Math.PI * area) / (perimeter * perimeter);
  }

  // Reset detection state
  reset() {
    this.fingerDetected = false;
    this.consecutiveDetections = 0;
  }
}

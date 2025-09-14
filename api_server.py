#!/usr/bin/env python3
"""
Simple API server for FoodFlow upload functionality
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
import subprocess
from werkzeug.utils import secure_filename
import json

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'foodflow/public/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def run_ml_detection(image_path, filename):
    """Run ML detection using the YOLO model"""
    try:
        # Paths to the ML model and detection script
        model_path = os.path.join(os.path.dirname(__file__), "my_model (4)", "train", "weights", "best.pt")
        detect_script = os.path.join(os.path.dirname(__file__), "my_model (4)", "detect_api.py")
        
        # Create annotated image path
        annotated_filename = f"annotated_{filename}"
        annotated_path = os.path.join(UPLOAD_FOLDER, annotated_filename)
        
        # Run the ML detection script
        cmd = [
            "python", detect_script,
            "--model", model_path,
            "--source", image_path,
            "--min_conf", "0.25",
            "--save_annotated", annotated_path
        ]
        
        print(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            print(f"ML detection error: {result.stderr}")
            return {
                "error": f"ML detection failed: {result.stderr}",
                "summary": "Detection failed",
                "counts": {},
                "detections": []
            }
        
        # Parse the JSON output
        detection_data = json.loads(result.stdout)
        
        # Convert to the format expected by the frontend
        detection = {
            "summary": detection_data.get("summary", "No objects detected"),
            "counts": detection_data.get("counts", {}),
            "detections": detection_data.get("objects", []),
            "annotated_url": f"http://localhost:5000/uploads/{annotated_filename}" if detection_data.get("annotated_path") else None
        }
        
        print(f"ML detection successful: {detection['summary']}")
        return detection
        
    except subprocess.TimeoutExpired:
        print("ML detection timed out")
        return {
            "error": "ML detection timed out",
            "summary": "Detection timed out",
            "counts": {},
            "detections": []
        }
    except Exception as e:
        print(f"ML detection error: {e}")
        return {
            "error": f"ML detection error: {str(e)}",
            "summary": "Detection failed",
            "counts": {},
            "detections": []
        }

@app.route('/api/profile', methods=['GET'])
def get_profile():
    return jsonify({
        "id": 1,
        "username": "user",
        "fullname": "Test User",
        "email": "user@foodflow.com",
        "role": "user",
        "points": 100
    })

@app.route('/api/locations', methods=['GET'])
def get_locations():
    locations = [
        {
            "id": 1,
            "name": "Warung Makan Sederhana",
            "address": "Jl. Sudirman No. 123, Jakarta",
            "lat": -6.2088,
            "lng": 106.8456
        },
        {
            "id": 2,
            "name": "Restoran Padang Minang",
            "address": "Jl. Thamrin No. 456, Jakarta",
            "lat": -6.1944,
            "lng": 106.8229
        },
        {
            "id": 3,
            "name": "Kedai Kopi Kenangan",
            "address": "Jl. Gatot Subroto No. 789, Jakarta",
            "lat": -6.2297,
            "lng": 106.8044
        }
    ]
    return jsonify(locations)

@app.route('/api/uploads', methods=['POST'])
def upload_file():
    try:
        print(f"📤 Upload request received")
        print(f"📤 Request files: {list(request.files.keys())}")
        print(f"📤 Request form: {list(request.form.keys())}")
        
        if 'image' not in request.files:
            print("❌ No image in request.files")
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        print(f"📤 File received: {file.filename}, size: {file.content_length}")
        
        if file.filename == '':
            print("❌ Empty filename")
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            print(f"❌ Invalid file type: {file.filename}")
            return jsonify({'error': f'Invalid file type. Allowed: {ALLOWED_EXTENSIONS}'}), 400
        
        if file:
            # Generate unique filename
            filename = secure_filename(file.filename)
            unique_filename = f"{uuid.uuid4().hex}_{filename}"
            filepath = os.path.join(UPLOAD_FOLDER, unique_filename)
            
            print(f"💾 Saving file to: {filepath}")
            # Save file
            file.save(filepath)
            
            # Run real ML detection
            print(f"🔍 Running ML detection on: {filepath}")
            detection = run_ml_detection(filepath, unique_filename)
            
            # Calculate points based on detected objects
            points_earned = len(detection.get("detections", [])) * 10  # 10 points per detected object
            total_points = 100 + points_earned
            
            # Return response
            response = {
                "message": "Upload successful",
                "image_url": f"http://localhost:5000/uploads/{unique_filename}",
                "detection": detection,
                "total_points": total_points,
                "points_earned": points_earned
            }
            
            print(f"✅ Upload successful: {unique_filename}")
            return jsonify(response)
        else:
            print("❌ File is None")
            return jsonify({'error': 'File is None'}), 400
            
    except Exception as e:
        print(f"❌ Upload error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    print("🚀 Starting FoodFlow API Server")
    print("📡 Server: http://localhost:5000")
    print("==================================================")
    app.run(host='localhost', port=5000, debug=True)

#!/usr/bin/env python3
import os
import sys
import json
import base64
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import cgi
import tempfile
import subprocess
from pathlib import Path

# Add the model directory to Python path
model_dir = Path(__file__).parent / "my_model (4)"
sys.path.insert(0, str(model_dir))

class MLHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.serve_file('foodflow/public/index.html')
        elif self.path.startswith('/assets/'):
            self.serve_file(f'foodflow/public{self.path}')
        elif self.path.startswith('/uploads/'):
            self.serve_file(f'foodflow/public{self.path}')
        else:
            self.send_error(404)
    
    def do_POST(self):
        if self.path == '/api/uploads':
            self.handle_upload()
        elif self.path == '/api/login':
            self.handle_login()
        elif self.path == '/api/profile':
            self.handle_profile()
        else:
            self.send_error(404)
    
    def serve_file(self, filepath):
        try:
            with open(filepath, 'rb') as f:
                content = f.read()
            
            # Set content type
            if filepath.endswith('.html'):
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
            elif filepath.endswith('.js'):
                self.send_response(200)
                self.send_header('Content-type', 'application/javascript')
            elif filepath.endswith('.css'):
                self.send_response(200)
                self.send_header('Content-type', 'text/css')
            elif filepath.endswith(('.jpg', '.jpeg', '.png')):
                self.send_response(200)
                self.send_header('Content-type', 'image/jpeg')
            else:
                self.send_response(200)
                self.send_header('Content-type', 'application/octet-stream')
            
            self.end_headers()
            self.wfile.write(content)
        except FileNotFoundError:
            self.send_error(404)
    
    def handle_login(self):
        response = {
            "token": "test-token",
            "user": {
                "id": 1,
                "username": "testuser",
                "fullname": "Test User",
                "email": "test@example.com",
                "role": "user",
                "points": 100
            }
        }
        self.send_json_response(response)
    
    def handle_profile(self):
        response = {
            "id": 1,
            "username": "testuser",
            "fullname": "Test User",
            "email": "test@example.com",
            "role": "user",
            "points": 100
        }
        self.send_json_response(response)
    
    def handle_upload(self):
        try:
            # Parse multipart form data
            content_type = self.headers['content-type']
            if not content_type.startswith('multipart/form-data'):
                self.send_error(400, "Expected multipart/form-data")
                return
            
            # Create upload directory
            upload_dir = Path('foodflow/public/uploads')
            upload_dir.mkdir(parents=True, exist_ok=True)
            annotated_dir = upload_dir / 'annotated'
            annotated_dir.mkdir(parents=True, exist_ok=True)
            
            # Parse form data
            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST'}
            )
            
            if 'image' not in form:
                self.send_error(400, "No image provided")
                return
            
            file_item = form['image']
            if not file_item.filename:
                self.send_error(400, "No filename provided")
                return
            
            # Save uploaded file
            filename = f"{os.urandom(8).hex()}_{file_item.filename}"
            filepath = upload_dir / filename
            with open(filepath, 'wb') as f:
                f.write(file_item.file.read())
            
            # Run ML detection
            detection = self.run_ml_detection(filepath, annotated_dir)
            
            # Prepare response
            response = {
                "message": "Upload successful",
                "upload_id": 1,
                "points_earned": 10,
                "total_points": 110,
                "image_url": f"/uploads/{filename}",
                "detection": detection
            }
            
            self.send_json_response(response)
            
        except Exception as e:
            print(f"Upload error: {e}")
            self.send_error(500, str(e))
    
    def run_ml_detection(self, image_path, output_dir):
        try:
            # Paths
            model_path = model_dir / "train" / "weights" / "best.pt"
            detect_script = model_dir / "detect_api.py"
            annotated_filename = f"det_{image_path.name}"
            annotated_path = output_dir / annotated_filename
            
            if not model_path.exists():
                return {"error": f"Model not found at {model_path}"}
            
            if not detect_script.exists():
                return {"error": f"Detection script not found at {detect_script}"}
            
            # Run detection
            cmd = [
                sys.executable,
                str(detect_script),
                "--model", str(model_path),
                "--source", str(image_path),
                "--min_conf", "0.25",
                "--save_annotated", str(annotated_path)
            ]
            
            print(f"Running: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode != 0:
                return {"error": f"Detection failed: {result.stderr}"}
            
            # Parse JSON output
            stdout = result.stdout.strip()
            if not stdout:
                return {"error": "No output from detection script"}
            
            detection = json.loads(stdout)
            
            # Add annotated URL if available
            if detection.get('annotated_path') and Path(detection['annotated_path']).exists():
                rel_path = Path(detection['annotated_path']).relative_to(Path('foodflow/public'))
                detection['annotated_url'] = f"/{rel_path.as_posix()}"
            
            return detection
            
        except subprocess.TimeoutExpired:
            return {"error": "Detection timed out"}
        except json.JSONDecodeError as e:
            return {"error": f"Invalid JSON from detection: {e}"}
        except Exception as e:
            return {"error": f"Detection error: {str(e)}"}
    
    def send_json_response(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

if __name__ == '__main__':
    port = 3000
    server = HTTPServer(('localhost', port), MLHandler)
    print(f"🚀 ML Server running on http://localhost:{port}")
    print("📸 Upload images to test ML detection!")
    print("🔧 Make sure ultralytics is installed: pip install ultralytics opencv-python")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
        server.shutdown()

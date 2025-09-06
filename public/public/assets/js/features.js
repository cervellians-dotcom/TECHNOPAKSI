// QR Scanner functionality
let html5QrcodeScanner = null;

function startScanner() {
  document.getElementById('scannerModal').style.display = 'block';
  html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader",
    { fps: 10, qrbox: {width: 250, height: 250} }
  );
  
  html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function stopScanner() {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear();
  }
  document.getElementById('scannerModal').style.display = 'none';
}

async function onScanSuccess(decodedText, decodedResult) {
  try {
    const result = await apiCall(config.api.redeemVoucher, {
      method: 'POST',
      body: { code: decodedText }
    });
    
    if (result.type === 'points') {
      const user = await apiCall(config.api.profile);
      document.getElementById('userPoints').textContent = user.points;
      alert(`Selamat! Anda mendapatkan ${result.value} poin!`);
    } else {
      alert(`Selamat! Anda mendapatkan voucher diskon sebesar ${result.value}%!`);
    }
  } catch (err) {
    alert(err.message || 'Kode QR tidak valid atau sudah digunakan.');
  }
  
  stopScanner();
}

function onScanFailure(error) {
  // console.warn(`QR scan error = ${error}`);
}

// Image Upload functionality
let selectedFile = null;
const dragArea = document.getElementById('dragArea');
const fileInput = document.getElementById('fileInput');

function startUpload() {
  document.getElementById('uploadModal').style.display = 'block';
}

function stopUpload() {
  document.getElementById('uploadModal').style.display = 'none';
  document.getElementById('uploadForm').reset();
  selectedFile = null;
  dragArea.innerHTML = `
    <p>Drag & drop gambar di sini atau</p>
    <input type="file" id="fileInput" accept="image/*" style="display: none">
    <button onclick="document.getElementById('fileInput').click()" class="action-btn primary">Pilih File</button>
  `;
}

// Handle drag and drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dragArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
  dragArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
  dragArea.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
  dragArea.classList.add('active');
}

function unhighlight(e) {
  dragArea.classList.remove('active');
}

dragArea.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}

fileInput.addEventListener('change', function() {
  handleFiles(this.files);
});

function handleFiles(files) {
  if (files.length > 0) {
    const file = files[0];
    
    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('File terlalu besar. Maksimal ukuran file adalah 5MB.');
      return;
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert('Hanya file JPG, JPEG, dan PNG yang diperbolehkan.');
      return;
    }

    selectedFile = file;
    dragArea.innerHTML = `
      <p>File selected: ${selectedFile.name}</p>
      <small style="display:block;margin:5px 0;color:#666">
        Size: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB
      </small>
      <button onclick="document.getElementById('fileInput').click()" class="action-btn primary">Change File</button>
    `;
  }
}

async function handleUpload(e) {
  e.preventDefault();
  if (!selectedFile) {
    alert('Silakan pilih file gambar terlebih dahulu');
    return;
  }

  const formData = new FormData();
  formData.append('image', selectedFile);
  formData.append('description', document.getElementById('description').value);

  try {
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengupload...';

    const result = await apiCall(config.api.uploads, {
      method: 'POST',
      body: formData,
      headers: {} // Let the browser set the correct Content-Type for FormData
    });
    
    // Update points display with the new total
    document.getElementById('userPoints').textContent = result.total_points;
    
    // Close modal and reset form
    stopUpload();
    
    alert(`Upload berhasil! Anda mendapatkan ${result.points_earned} poin`);
  } catch (err) {
    console.error('Error uploading image:', err);
    alert(err.message || 'Gagal mengupload gambar');
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
} 
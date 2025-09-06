// QR Code Scanner functionality
let scanner;

function startScanner() {
  const scannerModal = document.getElementById('scannerModal');
  const qrReader = document.getElementById('qr-reader');
  const resultsDiv = document.getElementById('qr-reader-results');

  scannerModal.style.display = 'block';
  
  if (!scanner) {
    scanner = new Html5Qrcode('qr-reader');
  }

  scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    qrCodeMessage => {
      resultsDiv.innerHTML = '✅ Kode terdeteksi: ' + qrCodeMessage;
      scanner.stop();
    },
    errorMessage => {
      console.log('Scanning...', errorMessage);
    }
  ).catch(err => {
    console.error('Camera start failed:', err);
    resultsDiv.innerHTML = '❌ Error: ' + err.message;
  });
}

function stopScanner() {
  const scannerModal = document.getElementById('scannerModal');
  const resultsDiv = document.getElementById('qr-reader-results');

  if (scanner) {
    scanner.stop().then(() => {
      scannerModal.style.display = 'none';
      resultsDiv.innerHTML = '';
    }).catch(err => console.error('Stop failed:', err));
  } else {
    scannerModal.style.display = 'none';
  }
}
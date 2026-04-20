const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const WARN_FILE_SIZE = 30 * 1024 * 1024; // 30MB warning threshold

const fileInput = document.getElementById("glbFile");
const fileLabel = document.getElementById("fileLabel");
const fileName = document.getElementById("fileName");
const fileSize = document.getElementById("fileSize");
const fileError = document.getElementById("fileError");
const fileWarning = document.getElementById("fileWarning");
const submitBtn = document.getElementById("submitBtn");
const uploadForm = document.getElementById("uploadForm");
const uploadProgress = document.getElementById("uploadProgress");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");

function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
}

function hasGlbSignature(buffer) {
  // Check for GLB magic number: 'glTF' (0x67 0x6c 0x54 0x46)
  return buffer.length >= 12 &&
         buffer[0] === 0x67 &&
         buffer[1] === 0x6c &&
         buffer[2] === 0x54 &&
         buffer[3] === 0x46;
}

function validateFile(file) {
  fileError.textContent = "";
  fileWarning.textContent = "";

  // Check file type
  if (file.type !== "model/gltf-binary" && !file.name.endsWith(".glb")) {
    fileError.textContent = "❌ Must be a GLB file (.glb extension)";
    return false;
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    fileError.textContent = `❌ File is too large (${formatFileSize(file.size)}). Maximum is 50 MB.`;
    return false;
  }

  // Warn about large files
  if (file.size > WARN_FILE_SIZE) {
    fileWarning.textContent = `⚠️ Large file (${formatFileSize(file.size)}). May have slower loading in VR.`;
  }

  return true;
}

function checkGlbSignature(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = new Uint8Array(e.target.result);
      if (!hasGlbSignature(buffer)) {
        fileError.textContent = "❌ File is not a valid GLB. Please check the file format.";
        resolve(false);
      } else {
        resolve(true);
      }
    };
    reader.onerror = () => {
      fileError.textContent = "❌ Error reading file.";
      reject(new Error("File read error"));
    };
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

// File input change handler
fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) {
    fileName.textContent = "";
    fileSize.textContent = "";
    fileLabel.classList.remove("has-file");
    return;
  }

  fileName.textContent = `📄 ${file.name}`;
  fileSize.textContent = `Size: ${formatFileSize(file.size)}`;
  fileLabel.classList.add("has-file");

  if (!validateFile(file)) {
    submitBtn.disabled = true;
    return;
  }

  // Validate GLB signature
  checkGlbSignature(file).then((isValid) => {
    submitBtn.disabled = !isValid;
  });
});

// Drag and drop
fileLabel.addEventListener("dragover", (e) => {
  e.preventDefault();
  fileLabel.style.borderColor = "#7c3aed";
  fileLabel.style.background = "#edd5ff";
});

fileLabel.addEventListener("dragleave", (e) => {
  e.preventDefault();
  fileLabel.style.borderColor = "#d1d5db";
  fileLabel.style.background = "#f9fafb";
});

fileLabel.addEventListener("drop", (e) => {
  e.preventDefault();
  fileLabel.style.borderColor = "#d1d5db";
  fileLabel.style.background = "#f9fafb";

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    fileInput.files = files;
    const changeEvent = new Event("change", { bubbles: true });
    fileInput.dispatchEvent(changeEvent);
  }
});

// Form submission
uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) {
    alert("Please select a GLB file.");
    return;
  }

  // Validate required fields
  const studentName = document.getElementById("studentName").value.trim();
  const modelTitle = document.getElementById("modelTitle").value.trim();
  const description = document.getElementById("description").value.trim();

  if (!studentName || !modelTitle || !description) {
    alert("Please fill in all required fields.");
    return;
  }

  const artifactType = document.querySelector('input[name="artifact"]:checked').value;

  submitBtn.disabled = true;
  uploadProgress.style.display = "block";

  try {
    const formData = new FormData();
    formData.append("studentName", studentName);
    formData.append("modelTitle", modelTitle);
    formData.append("description", description);
    formData.append("artifact", artifactType);
    formData.append("glbFile", file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        progressFill.style.width = percentComplete + "%";
        progressText.textContent = `Uploading... ${Math.round(percentComplete)}%`;
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        uploadProgress.style.display = "none";
        // Show success message and redirect after a delay
        const response = xhr.responseText;
        document.body.innerHTML = response;
        setTimeout(() => {
          window.location.href = "../apps/virtual-reality-museum/";
        }, 3000);
      } else {
        throw new Error(`Upload failed with status ${xhr.status}`);
      }
    });

    xhr.addEventListener("error", () => {
      uploadProgress.style.display = "none";
      submitBtn.disabled = false;
      alert("Upload failed. Please try again.");
    });

    xhr.open("POST", "/upload-model");
    xhr.send(formData);
  } catch (err) {
    uploadProgress.style.display = "none";
    submitBtn.disabled = false;
    alert(`Error: ${err.message}`);
  }
});

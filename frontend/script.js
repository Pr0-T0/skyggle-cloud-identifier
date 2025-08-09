import { GoogleGenerativeAI } from "https://esm.run/@google/generative-ai";

// ⚠️ For testing only — don't expose your key in production
const API_KEY = "";
const genAI = new GoogleGenerativeAI(API_KEY);

document.addEventListener('DOMContentLoaded', function() {
  const imageInput = document.getElementById('imageInput');
  const captionBtn = document.getElementById('captionBtn');
  const output = document.getElementById('output');
  const uploadArea = document.querySelector('.upload-area');
  const container = document.querySelector('.container');

  // Drag over
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  // Drop event
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      imageInput.files = files;
      updateUploadArea(files[0]);
    } else {
      showError("Please drop a valid image file (JPG, PNG, GIF)");
    }
  });

  // File input change
  imageInput.addEventListener('change', function() {
    if (this.files && this.files[0]) {
      updateUploadArea(this.files[0]);
      output.textContent = "Image uploaded! Ready for cloud analysis.";
    }
  });

//   function updateUploadArea(file) {
//     const uploadText = uploadArea.querySelector('h3');
//     const uploadSubtext = uploadArea.querySelector('p');
    
//     // Remove old preview
//     const existingPreview = uploadArea.querySelector('.image-preview');
//     if (existingPreview) existingPreview.remove();
    
//     const preview = document.createElement('div');
//     preview.className = 'image-preview';
//     preview.innerHTML = `
//       <img src="${URL.createObjectURL(file)}" alt="Preview" style="
//         max-width: 500px; 
//         max-height: 500px; 
//         border-radius: 12px; 
//         margin-bottom: 12px;
//         box-shadow: 0 4px 12px rgba(0,0,0,0.15);
//         object-fit: contain;
//       ">
//     `;
    
//     // uploadText.textContent = file.name;
//     // uploadSubtext.innerHTML = `File size: ${(file.size / 1024 / 1024).toFixed(2)} MB <br>Ready for cloud shape analysis!`;
//     uploadArea.insertBefore(preview, uploadArea.querySelector('h3'));
//   }
  function updateUploadArea(file) {
  const uploadText = uploadArea.querySelector('h3');
  const uploadSubtext = uploadArea.querySelector('p');
  
  // Hide or clear the text inside the upload area
  if (uploadText) uploadText.style.display = 'none';
  if (uploadSubtext) {
    const allPs = uploadArea.querySelectorAll('p');
    allPs.forEach(p => p.style.display = 'none');
  }

  // Remove old preview if it exists
  const existingPreview = uploadArea.querySelector('.image-preview');
  if (existingPreview) existingPreview.remove();
  
  // Add image preview
  const preview = document.createElement('div');
  preview.className = 'image-preview';
  preview.innerHTML = `
    <img src="${URL.createObjectURL(file)}" alt="Preview" style="
      max-width: 100%; 
      max-height: 500px; 
      border-radius: 12px; 
      margin-bottom: 12px;
      object-fit: contain;
    ">
  `;
  
  uploadArea.appendChild(preview);
}


  // Generate caption
  captionBtn.onclick = async () => {
    const file = imageInput.files[0];
    if (!file) return showError("Please select an image first.");
    if (!file.type.startsWith('image/')) return showError("Please select a valid image file (JPG, PNG, GIF)");
    if (file.size > 10 * 1024 * 1024) return showError("File size must be less than 10MB");

    setLoadingState(true);
    
    try {
      const base64Image = await toBase64(file);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

      const request = {
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: file.type,
                  data: base64Image,
                },
              },
              { 
                text: `Analyze this image and identify any cloud shapes that resemble objects, animals, or recognizable forms. 
                Keep it fun, creative, and one short sentence.dont make the responce formal, if no clouds respond in a fun way`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
        }
      };

      const result = await model.generateContent(request);
      const responseText = result.response.text();
      
      // Typing animation
      typeWriterEffect(responseText);
      
    } catch (err) {
      console.error('Error:', err);
      let errorMessage = "Error generating caption.";
      if (err.message.includes("API key")) errorMessage = "Invalid API key. Please check your configuration.";
      else if (err.message.includes("quota")) errorMessage = "API quota exceeded. Please try again later.";
      else if (err.message.includes("network")) errorMessage = "Network error. Please check your connection.";
      
      showError(errorMessage);
    } finally {
      setLoadingState(false);
    }
  };

  // Typing animation
  function typeWriterEffect(text, speed = 40) {
    output.textContent = "";
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        output.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);
  }

  function setLoadingState(isLoading) {
    if (isLoading) {
      captionBtn.disabled = true;
      captionBtn.innerHTML = `<span>Analyzing clouds...</span><div class="btn-icon">🔍</div>`;
      output.textContent = "🌤️ Looking for shapes in the clouds...";
    } else {
      captionBtn.disabled = false;
      captionBtn.innerHTML = `<span>Get Caption</span><div class="btn-icon">✨</div>`;
    }
  }

  function showError(message) {
    output.textContent = `⚠️ ${message}`;
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
    });
  }

  // Enter to analyze
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && imageInput.files && !captionBtn.disabled) {
      captionBtn.click();
    }
  });
});

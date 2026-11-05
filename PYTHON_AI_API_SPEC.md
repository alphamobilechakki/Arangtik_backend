# Python AI Background Removal API Specification (Without Person)

> **Focus**: Sirf **`without_person`** (Cloth Background Removal) ke liye.  
> **Backend Caller**: Node.js Backend (`clothAnalysis.service.js`)  
> **Python Service URL**: `https://bg.arangtik.com/api/background-removal` (ya `http://bg.arangtik.com/api/background-removal`)  

---

## 🎯 Python API Details

### 1. Endpoint Info
* **Route**: `/api/background-removal`
* **HTTP Method**: `POST`
* **Content-Type**: `multipart/form-data`
* **Request Parameter**:
  * **Key / Field Name**: `file` (Image binary file: JPG, PNG, WEBP)

---

## 📥 2. Node.js Kya Bheje Raha Hai?

Jab mobile app se user `without_person` kapde ki photo bhejega, toh Node.js backend ye HTTP call karega:

```http
POST /api/background-removal HTTP/1.1
Host: bg.arangtik.com
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryXYZ

------WebKitFormBoundaryXYZ
Content-Disposition: form-data; name="file"; filename="shirt_photo.jpg"
Content-Type: image/jpeg

<binary_image_data>
------WebKitFormBoundaryXYZ--
```

---

## 📤 3. Python Ko Kya Response Dena Hai?

Python ko kapde ka background strip karke **transparent cutout** return karna hai. 

Python **2 tarike** me se koi bhi 1 response de sakta hai (dono Node.js me supported hain):

### Option 1 (Recommended - Direct PNG Stream):
Sabse fast aur clean tarika! Seedha raw image bytes return kare:
* **HTTP Status**: `200 OK`
* **Content-Type**: `image/png` (ya `image/webp`)
* **Body**: Transparent PNG image binary bytes

### Option 2 (JSON Response):
Agar Python JSON format me dena chahe:
* **HTTP Status**: `200 OK`
* **Content-Type**: `application/json`
```json
{
  "status": "success",
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "message": "Background removed successfully"
}
```

---

## 💻 4. Python Ready-to-Run Code

### A) Agar FastAPI use kar rahe hain:

```python
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response
from rembg import remove
from PIL import Image
import io

app = FastAPI(title="Arangtik Background Removal")

@app.post("/api/background-removal")
async def remove_background(file: UploadFile = File(...)):
    # 1. Image read karein
    image_bytes = await file.read()
    input_image = Image.open(io.BytesIO(image_bytes))

    # 2. Background remove karein (rembg ya aapka jo bhi AI model ho)
    output_image = remove(input_image)

    # 3. Buffer me PNG save karein
    buf = io.BytesIO()
    output_image.save(buf, format="PNG")
    
    # 4. Direct PNG stream return karein
    return Response(content=buf.getvalue(), media_type="image/png")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

---

### B) Agar Flask use kar rahe hain:

```python
from flask import Flask, request, send_file
from rembg import remove
from PIL import Image
import io

app = Flask(__name__)

@app.route('/api/background-removal', methods=['POST'])
def background_removal():
    if 'file' not in request.files:
        return {"error": "Missing 'file' field"}, 400
        
    uploaded_file = request.files['file']
    input_image = Image.open(uploaded_file.stream)

    # Background remove karein
    output_image = remove(input_image)

    buf = io.BytesIO()
    output_image.save(buf, format="PNG")
    buf.seek(0)

    # Direct PNG file return karein
    return send_file(buf, mimetype='image/png')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
```

---

## ⚙️ 5. Nginx / aaPanel Reverse Proxy Configuration

aaPanel me domain `bg.arangtik.com` ke Nginx configuration me ye proxy pass zaroor check kar lein taaki 403 ya 404 na aaye:

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name bg.arangtik.com;

    # Image upload size badhane ke liye
    client_max_body_size 50M;

    location /api/background-removal {
        proxy_pass http://127.0.0.1:8000/api/background-removal;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

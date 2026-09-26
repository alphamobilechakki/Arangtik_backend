# Arangtik Backend (Node.js + Express.js + MongoDB)

AI-powered personal wardrobe, laundry & household items management platform backend.

---

## 📁 Modular Directory Structure

```
backend/
├── .env
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── uploads/                      # Local storage for uploaded files/photos
└── src/
    ├── app.js                    # Express app setup & middlewares
    ├── server.js                 # Server entry point & DB connection
    │
    ├── config/                   # Configuration files
    │   ├── db.config.js          # MongoDB connection (Mongoose)
    │   └── env.config.js         # Environment variables & defaults
    │
    ├── middlewares/              # Global middlewares
    │   ├── auth.middleware.js    # JWT verification & role authorization
    │   ├── error.middleware.js   # Global error handling & 404 handler
    │   └── upload.middleware.js  # Multer file upload handler
    │
    ├── utils/                    # Helper utilities
    │   ├── apiError.js           # Custom Error class
    │   ├── apiResponse.js        # Standardized API response formatter
    │   └── asyncHandler.js       # Async wrapper for route handlers
    │
    ├── routes/
    │   └── index.js              # Central router mounting all modules under /api/v1
    │
    └── modules/                  # Feature Modules (Modular Architecture)
        ├── auth/                 # Authentication & OTP Module
        │   ├── auth.controller.js
        │   ├── auth.model.js
        │   ├── auth.routes.js
        │   └── auth.service.js
        │
       

---

## 🚀 How to Run

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Server runs on `http://localhost:5000` with base API `http://localhost:5000/api/v1`.

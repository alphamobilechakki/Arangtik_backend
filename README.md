# 👗 Arangtik Backend

## 📚 Documentation Index
- 📱 [Customer Mobile App Integration Guide](file:///d:/my%20codes/Arangtik/backend/MOBILE_APP_INTEGRATION_GUIDE.md)
- 🧺 [Vendor Mobile App & Portal API Documentation](file:///d:/my%20codes/Arangtik/backend/VENDOR_API_DOCUMENTATION.md)
- 🛠️ [Admin Web Panel API Documentation](file:///d:/my%20codes/Arangtik/backend/ADMIN_API_DOCUMENTATION.md)
- 📖 [Complete Core Backend API Documentation](file:///d:/my%20codes/Arangtik/backend/API_DOCUMENTATION.md)

---


📋 Frontend Implementation Prompt (Copy & Paste):
markdown
### Task: Implement Wardrobe Duplicate & Ambiguity Detection Flow in Mobile/Web UI
Backend already has a robust Multi-Tier Clothing Duplicate Detection Engine. When a user captures a camera photo or uploads a dress from the gallery, backend analyzes the clothing and returns duplicate match metadata. 
We need to implement the complete Duplicate Detection UI/UX in the frontend with the following specifications:
---
### 1. Backend API Response Structure:
When calling `POST /api/cloth-analysis/analyze-photo` or `POST /api/cloth-analysis/extract-dress`, the response contains:
```json
{
  "success": true,
  "data": {
    "detectedItemsCount": 1,
    "isExactDuplicateImage": false,
    "analysis": [
      {
        "tempDetectionId": "det_xyz123",
        "name": "Navy Blue Linen Shirt",
        "category": "UPPER_WEAR",
        "subCategory": "Shirt",
        "croppedImageUrl": "/uploads/crops/crop_item_1.png",
        "selected": false, // Automatically false if EXACT_MATCH
        "isDuplicate": true,
        "isAmbiguous": false,
        "matchType": "EXISTING_ITEM", // "EXISTING_ITEM" | "POTENTIAL_DUPLICATE" | "NEW_ITEM"
        "matchResult": {
          "status": "EXACT_MATCH", // "EXACT_MATCH" | "AMBIGUOUS_MATCH" | "NEW_ITEM"
          "confidenceScore": 0.95, // 0.0 to 1.0 (95% similarity)
          "message": "This dress is already registered in your wardrobe as \"Navy Blue Linen Shirt\".",
          "existingItem": {
            "_id": "670a123...",
            "name": "Navy Blue Linen Shirt",
            "primaryImageUrl": "/uploads/crops/existing_shirt.png",
            "color": "Navy Blue",
            "fabric": "Linen",
            "wearCount": 4,
            "lastWornDate": "2026-10-01"
          },
          "candidateMatches": []
        }
      }
    ]
  }
}
2. UI / UX Requirements to Implement:
A. Multi-Garment Digitization / Camera Studio Cards:
Duplicate Badge:
If item.isDuplicate === true or item.matchResult?.status === 'EXACT_MATCH':
Show an amber/red warning badge: ⚠️ Already in Wardrobe (${Math.round(confidenceScore * 100)}% Match).
The selection checkbox must be UNCHECKED by default so the user doesn't accidentally save duplicates.
If item.isAmbiguous === true or item.matchResult?.status === 'AMBIGUOUS_MATCH':
Show a blue info badge: 🔍 Similar Dress Found (${Math.round(confidenceScore * 100)}% Match).
Clicking on the badge opens the Duplicate Resolution Modal.
B. Side-by-Side Duplicate Resolution Modal (DuplicateResolutionModal):
When user clicks on a duplicate warning or similar item badge, open a comparison modal showing:

Left Card (New Photo / Detected Dress):
Cropped garment image.
Name, Category, Color, Fabric, Pattern.
Right Card (Existing Dress in Wardrobe):
Existing primary image from wardrobe.
Name, Category, Color, Fabric, Pattern.
Usage stats: Worn 4 times, Last worn on 01 Oct 2026.
Similarity Progress Bar:
Visual progress indicator showing match percentage (e.g. 95% Match).
Action Buttons:
Button 1 (Recommended): "Same Dress — Don't Add":
Deselects/removes this item from the add queue and closes the modal.
Toast notification: "Skipped duplicate item".
Button 2: "Different Dress — Add Anyway":
Keeps the item selected.
Sets a flag on the item payload: allowDuplicate: true or forceAdd: true.
Closes modal.
C. Final Save API Call (POST /api/wardrobe/add-item or /items):
When sending selected items to be saved in wardrobe:

If user confirmed an item as "Different Dress (Add Anyway)", ensure the payload sends:
json
{
  "allowDuplicate": true,
  "forceAdd": true
}
Backend will allow creating the new item when allowDuplicate: true / forceAdd: true is present. Otherwise, backend will automatically reuse the existing item to keep the wardrobe clean.
3. Acceptance Criteria:
Re-clicking or scanning an existing dress shows clear visual indication with match percentage.
Exact duplicate dresses are not checked/selected by default.
User can easily compare the new photo with the existing wardrobe photo side-by-side.
Seamlessly works for both Single Photo Capture and Bulk Multi-Photo Gallery Ingestion.
---
### 💡 Is Prompt me Kya Cover Hai:
1. Backend ka exact response schema (`status`, `confidenceScore`, `existingItem`).
2. Checkbox auto-uncheck logic taaki user galti se dubara na add kar de.
3. Side-by-side comparison modal (New photo vs Existing photo + wear count).
4. "Same Dress (Skip)" aur "Different Dress (Add Anyway)" ke click actions aur payload flags (`allowDuplicate: true`).
5:50 PM

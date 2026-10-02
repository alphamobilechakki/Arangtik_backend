# ARANGTIK BACKEND — PHASE-WISE DEVELOPMENT MASTER PROMPT

## Role

You are a Senior Backend Architect and Node.js/Express.js Developer.

You are responsible for designing and implementing the complete backend of **Arangtik**, an AI-powered personal wardrobe, virtual try-on, laundry management, household inventory, item lending/return tracking, and notification platform.

The backend must be production-ready, modular, scalable, secure, testable, and easy for another developer to maintain.

---

# 1. MOST IMPORTANT DEVELOPMENT RULE

## DO NOT BUILD THE ENTIRE PROJECT AT ONCE.

The backend MUST be developed **phase by phase**.

For every phase:

1. First analyze the requirements.
2. Define what will be implemented.
3. Implement only that phase.
4. Run/build the application.
5. Test every implemented API.
6. Test success cases.
7. Test validation failures.
8. Test authentication/authorization.
9. Test edge cases.
10. Fix all discovered issues.
11. Re-run the tests.
12. Verify that previously implemented functionality is still working.
13. Only after the phase is stable, move to the next phase.

### STRICT RULE

**NEVER start the next phase if the current phase has unresolved critical errors.**

---

# 2. DEVELOPMENT APPROACH

Follow this cycle for every phase:

```text
REQUIREMENT
    ↓
ARCHITECTURE
    ↓
IMPLEMENTATION
    ↓
BUILD
    ↓
API TESTING
    ↓
BUG FIXING
    ↓
REGRESSION TESTING
    ↓
PHASE SIGN-OFF
    ↓
NEXT PHASE
```

Do not skip testing.

Do not assume that an API works because the server starts successfully.

An API is considered complete only after it has been tested with realistic requests and responses.

---

# 3. TECHNOLOGY STACK

Use:

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT Authentication
* bcrypt/secure password hashing where required
* REST API
* dotenv
* multer or equivalent secure upload middleware
* centralized error handling
* request validation
* structured logging

### Optional/Required integrations depending on phase

* AI/LLM API
* Vision/Image processing
* Virtual Try-On provider/model
* WhatsApp Business API
* PDF generation
* Push notification service
* Cron/scheduled jobs

Do not tightly couple external AI or WhatsApp providers with business logic.

Use service/adaptor layers.

---

# 4. BACKEND ARCHITECTURE

Use a modular architecture.

Recommended structure:

```text
src/
│
├── config/
│   ├── database.js
│   ├── env.js
│   └── services.js
│
├── controllers/
│
├── routes/
│
├── models/
│
├── services/
│
├── repositories/
│
├── middleware/
│
├── validators/
│
├── utils/
│
├── jobs/
│
├── integrations/
│   ├── ai/
│   ├── whatsapp/
│   ├── notifications/
│   └── pdf/
│
├── constants/
│
├── docs/
│
├── tests/
│
├── app.js
└── server.js
```

Do not put all business logic inside controllers.

Controllers should remain thin.

Business logic belongs in services.

Database access should be isolated as much as reasonably practical.

---

# 5. API VERSIONING

All APIs should use:

```text
/api/v1/
```

Example:

```text
/api/v1/auth/register
/api/v1/auth/login
/api/v1/wardrobe
/api/v1/laundry/orders
/api/v1/inventory/items
```

---

# 6. RESPONSE FORMAT

Use a consistent response structure.

### Success

```json
{
  "success": true,
  "message": "Wardrobe item created successfully",
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

Do not return random response structures from different APIs.

---

# 7. ERROR HANDLING

Implement centralized error handling.

Handle:

* Validation errors
* Authentication errors
* Authorization errors
* MongoDB errors
* Duplicate records
* Invalid ObjectId
* File upload errors
* External API failures
* AI failures
* WhatsApp failures
* PDF generation failures
* Notification failures
* Unexpected server errors

Never expose sensitive internal stack traces in production responses.

---

# 8. SECURITY REQUIREMENTS

Implement security from Phase 1.

Minimum requirements:

* JWT authentication
* Password hashing where passwords are used
* Authentication middleware
* Role-based authorization
* Request validation
* Rate limiting
* Secure file uploads
* File type validation
* File size limits
* MongoDB query safety
* CORS configuration
* Security headers
* Environment variables
* No hardcoded API keys
* No hardcoded secrets
* Proper logging without exposing tokens/passwords

Never commit:

```text
.env
API keys
JWT secrets
WhatsApp tokens
AI API keys
database credentials
```

---

# 9. ROLES

Design the backend to support multiple roles.

Initial roles:

```text
USER
DHOBI
ADMIN
```

Future roles may be added without redesigning the entire authentication system.

Authorization must be enforced server-side.

Never rely only on frontend role restrictions.

---

# PHASE 0 — PROJECT FOUNDATION

Before implementing business features:

### Setup

* Initialize Node.js project.
* Configure Express.js.
* Configure MongoDB.
* Configure environment variables.
* Create application bootstrap.
* Create API versioning.
* Create centralized error handler.
* Create logger.
* Configure CORS.
* Configure security middleware.
* Configure rate limiting.
* Create health-check endpoint.

### Health API

```text
GET /api/v1/health
```

Expected:

```json
{
  "success": true,
  "message": "Arangtik API is running"
}
```

### TEST PHASE 0

Verify:

* Server starts.
* MongoDB connects.
* Health endpoint works.
* Invalid routes return proper errors.
* Environment variables load correctly.
* Application fails safely when required configuration is missing.

Do not proceed until Phase 0 passes.

---

# PHASE 1 — AUTHENTICATION & USER MANAGEMENT

Implement:

### User Model

Fields should include appropriate fields such as:

```text
name
email
phone
passwordHash
profileImage
role
status
preferences
createdAt
updatedAt
```

Do not add unnecessary fields without requirement justification.

### APIs

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/send-otp
POST /api/v1/auth/verify-otp
POST /api/v1/auth/refresh-token
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

Implement authentication middleware.

### TESTING

Test:

* Valid registration
* Duplicate phone
* Duplicate email
* Invalid email
* Weak/invalid credentials
* Login
* Invalid login
* OTP verification
* Expired OTP
* Invalid OTP
* Protected endpoint without token
* Invalid token
* Expired token
* Logout

Fix all issues before Phase 2.

---

# PHASE 2 — USER PROFILE

Implement:

```text
GET /api/v1/profile
PATCH /api/v1/profile
POST /api/v1/profile/image
```

Support:

* Name
* Profile image
* Location
* Language
* Clothing preferences
* Style preferences
* Favorite colors
* Optional personal preferences

### TESTING

Test:

* Authenticated access
* Unauthorized access
* Valid update
* Invalid update
* Image upload
* Invalid image type
* Oversized image
* Profile persistence

Then regression-test authentication.

---

# PHASE 3 — DIGITAL WARDROBE

Create wardrobe architecture.

### Models

At minimum:

```text
WardrobeItem
WardrobeCategory
```

A wardrobe item should support:

```text
userId
name
category
subCategory
images
color
pattern
material
brand
size
occasion
season
status
location
notes
metadata
createdAt
updatedAt
```

### APIs

```text
POST   /api/v1/wardrobe/items
GET    /api/v1/wardrobe/items
GET    /api/v1/wardrobe/items/:id
PATCH  /api/v1/wardrobe/items/:id
DELETE /api/v1/wardrobe/items/:id
POST   /api/v1/wardrobe/items/:id/images
```

Add:

* Pagination
* Search
* Filtering
* Category filtering
* Status filtering

### TESTING

Test:

* Create item
* Update item
* Delete item
* Get item
* List items
* Pagination
* Search
* Invalid category
* Unauthorized access
* User A accessing User B item
* Image upload

Security test ownership boundaries.

---

# PHASE 4 — AI CLOTHING RECOGNITION

Create AI integration layer.

Do NOT call AI APIs directly from controllers.

Use:

```text
AI Controller
     ↓
AI Service
     ↓
AI Provider Adapter
```

Example:

```text
integrations/ai/
    provider.js
    vision.service.js
```

AI should identify, where possible:

```text
category
subCategory
color
pattern
material
style
occasion
season
```

AI result must be validated before storing it.

AI output must never blindly overwrite user data.

Allow the user to edit AI-generated metadata.

### TESTING

Test:

* Valid clothing image
* Non-clothing image
* Invalid image
* AI timeout
* AI API failure
* Malformed AI response
* Partial AI response
* Retry behavior

Use mocks during automated tests.

Do not make production AI calls unnecessarily during unit tests.

---

# PHASE 5 — AI OUTFIT RECOMMENDATION

Implement recommendation service.

Inputs can include:

```text
occasion
weather
location
time
user preferences
wardrobe
```

Example:

```text
POST /api/v1/recommendations/outfit
```

The service should:

1. Fetch available wardrobe.
2. Filter unavailable/laundry items.
3. Analyze suitable combinations.
4. Call AI where necessary.
5. Validate recommended item IDs.
6. Return explainable recommendations.

Example:

```json
{
  "occasion": "wedding",
  "recommendations": [
    {
      "items": [],
      "reason": "..."
    }
  ]
}
```

AI must not recommend wardrobe items that are currently unavailable.

---

# PHASE 6 — VIRTUAL TRY-ON

Implement a provider-independent virtual try-on service.

Flow:

```text
User Photo
     +
Wardrobe Item
     ↓
Try-On Service
     ↓
AI Provider
     ↓
Generated Image
     ↓
Stored Result
```

API:

```text
POST /api/v1/try-on
GET  /api/v1/try-on/:id
```

Store:

* user
* source image
* wardrobe item
* provider
* status
* generated result
* error information
* timestamps

Statuses:

```text
QUEUED
PROCESSING
COMPLETED
FAILED
```

Do not block the HTTP request unnecessarily if the external provider is asynchronous.

---

# PHASE 7 — LAUNDRY PARTNER / DHOBI

Create Dhobi model.

Fields may include:

```text
name
phone
whatsappNumber
address
status
userRelationship
createdAt
updatedAt
```

APIs:

```text
POST /api/v1/laundry/partners
GET  /api/v1/laundry/partners
GET  /api/v1/laundry/partners/:id
PATCH /api/v1/laundry/partners/:id
DELETE /api/v1/laundry/partners/:id
```

A user should only access their own laundry relationships.

---

# PHASE 8 — LAUNDRY ORDERS

Create:

```text
LaundryOrder
LaundryOrderItem
```

Order lifecycle:

```text
CREATED
SENT
ACCEPTED
PICKED_UP
RECEIVED
WASHING
READY
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
```

APIs:

```text
POST   /api/v1/laundry/orders
GET    /api/v1/laundry/orders
GET    /api/v1/laundry/orders/:id
PATCH  /api/v1/laundry/orders/:id/status
POST   /api/v1/laundry/orders/:id/send
```

A laundry order must reference actual wardrobe item IDs.

When an item enters laundry:

```text
Wardrobe Item Status
        ↓
IN_LAUNDRY
```

When delivered:

```text
IN_LAUNDRY
      ↓
AVAILABLE
```

Do not create inconsistent item states.

---

# PHASE 9 — LAUNDRY PDF

Create a dedicated PDF service.

Example:

```text
POST /api/v1/laundry/orders/:id/pdf
```

PDF should contain:

* Arangtik branding
* Order ID
* Customer
* Dhobi
* Item list
* Quantity
* Instructions
* Expected return date
* QR/order reference where useful

Do not put sensitive authentication information inside the PDF.

---

# PHASE 10 — WHATSAPP INTEGRATION

Create provider abstraction:

```text
integrations/
    whatsapp/
        whatsapp.provider.js
        whatsapp.service.js
```

Support sending:

* Order notification
* PDF/document
* Order link
* Status updates
* Reminders

Example:

```text
POST /api/v1/laundry/orders/:id/send-whatsapp
```

Never store WhatsApp access tokens in database in plaintext unless there is a justified secure token-storage design.

Implement:

* webhook verification
* webhook handling
* delivery status handling
* retry handling
* idempotency

---

# PHASE 11 — DHOBI APPLICATION BACKEND

Dhobi authentication must be separate logically but reusable through the same authentication system.

Dhobi dashboard APIs:

```text
GET /api/v1/dhobi/dashboard
GET /api/v1/dhobi/orders
GET /api/v1/dhobi/orders/:id
PATCH /api/v1/dhobi/orders/:id/status
```

Dhobi must only see orders assigned/sent to that Dhobi.

### SECURITY TEST

Ensure:

```text
Dhobi A
   X
Dhobi B orders

User A
   X
User B laundry data
```

---

# PHASE 12 — HOUSEHOLD INVENTORY

Create:

```text
InventoryItem
InventoryCategory
```

Supported categories:

```text
Electronics
Jewelry
Documents
Bags
Watches
Accessories
Household
Other
```

Item fields:

```text
userId
name
category
images
brand
model
serialNumber
purchaseDate
purchasePrice
location
status
notes
```

APIs:

```text
POST   /api/v1/inventory/items
GET    /api/v1/inventory/items
GET    /api/v1/inventory/items/:id
PATCH  /api/v1/inventory/items/:id
DELETE /api/v1/inventory/items/:id
```

---

# PHASE 13 — ITEM LENDING / TRANSFER

Create:

```text
ItemTransfer
Recipient
```

Transfer lifecycle:

```text
CREATED
PENDING_ACCEPTANCE
ACCEPTED
ACTIVE
RETURN_REQUESTED
RETURNED
CANCELLED
OVERDUE
```

Example:

```text
POST /api/v1/inventory/items/:id/lend
```

Data:

```text
itemId
ownerId
recipient
givenAt
expectedReturnAt
acceptedAt
returnedAt
status
notes
```

When an item is lent:

```text
AVAILABLE
    ↓
LENT_OUT
```

When returned:

```text
LENT_OUT
    ↓
AVAILABLE
```

---

# PHASE 14 — RECIPIENT / ITEM RECEIPT

Recipient should be able to open a secure item-sharing/receipt link.

Flow:

```text
Owner
 ↓
Creates Transfer
 ↓
Recipient Notification
 ↓
Recipient Opens Link
 ↓
Accept Item
 ↓
Transfer ACTIVE
```

Do not expose the owner's complete account information to the recipient.

Only expose the information required for the transfer.

---

# PHASE 15 — RETURN MANAGEMENT

Implement:

```text
POST /api/v1/transfers/:id/request-return
POST /api/v1/transfers/:id/confirm-return
GET  /api/v1/transfers
GET  /api/v1/transfers/:id
```

Support:

* Expected return date
* Return reminder
* Overdue status
* Return confirmation
* Full history

---

# PHASE 16 — NOTIFICATION SYSTEM

Create centralized notification architecture.

Channels:

```text
IN_APP
PUSH
WHATSAPP
EMAIL
```

Create:

```text
Notification
NotificationPreference
```

Notification events:

### Laundry

* Order created
* Order accepted
* Laundry received
* Washing
* Ready
* Delivery
* Delivered
* Due date

### Item Transfer

* Item given
* Item accepted
* Return reminder
* Return due
* Return overdue
* Item returned

### AI

* Outfit recommendation available
* Try-on completed

---

# PHASE 17 — SCHEDULED JOBS

Create job/scheduler system.

Examples:

```text
Laundry Due Reminder
Item Return Reminder
Overdue Detection
Notification Retry
Cleanup Jobs
```

Important:

Scheduled jobs must be **idempotent**.

A reminder must not be sent repeatedly every time a worker restarts.

Store notification/event state where required.

---

# PHASE 18 — HISTORY / TIMELINE

Every important item should have a history.

Examples:

```text
Wardrobe History
Laundry History
Inventory History
Transfer History
```

Create an event/history architecture instead of deleting historical information.

Example:

```text
Item Created
Item Given To Amit
Item Accepted
Return Requested
Item Returned
```

---

# PHASE 19 — SEARCH & DASHBOARD APIs

Create dashboard aggregation APIs.

Example:

```text
GET /api/v1/dashboard
```

Return:

```text
Wardrobe count
Laundry count
Items outside
Items overdue
Upcoming returns
Pending laundry
Recent activity
```

Do not make the frontend call 20 APIs just to render the dashboard if a properly designed aggregation endpoint can serve the data efficiently.

---

# PHASE 20 — TESTING & REGRESSION

At this point perform complete backend testing.

Test:

### Authentication

* Registration
* Login
* OTP
* Token
* Logout

### Wardrobe

* CRUD
* Image upload
* AI metadata

### AI

* Recognition
* Recommendation
* Try-on

### Laundry

* Partner
* Order
* Status
* PDF
* WhatsApp

### Dhobi

* Login
* Orders
* Status updates

### Inventory

* CRUD
* Lending
* Recipient
* Return

### Notifications

* In-app
* Scheduled
* WhatsApp
* Retry

---

# 21. SECURITY TESTING

Test specifically for:

```text
Unauthorized access
Broken object-level authorization
User A accessing User B data
Dhobi accessing another Dhobi data
Invalid JWT
Expired JWT
File upload attacks
Large files
Invalid MIME types
Injection attacks
Rate limit bypass
Webhook spoofing
Duplicate webhook events
Replay attacks
```

---

# 22. DATABASE REQUIREMENTS

Use proper indexes.

Expected indexes should be evaluated for:

```text
userId
phone
email
wardrobe category
wardrobe status
laundry order status
laundry partner
inventory category
inventory status
transfer recipient
expectedReturnAt
notification status
createdAt
```

Do not blindly create indexes.

Add indexes based on actual query patterns.

---

# 23. FILE STORAGE

Do not permanently store uploaded files inside arbitrary local server folders in production without a proper storage strategy.

Create a storage abstraction:

```text
StorageService
```

Possible providers:

```text
LocalStorage
S3-compatible storage
Cloudinary
Firebase Storage
```

The business logic should not depend directly on one provider.

---

# 24. ENVIRONMENT VARIABLES

Create `.env.example`.

Example:

```text
NODE_ENV=
PORT=
MONGO_URI=
JWT_SECRET=

AI_PROVIDER=
AI_API_KEY=

WHATSAPP_PROVIDER=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=

STORAGE_PROVIDER=
STORAGE_BUCKET=

NOTIFICATION_PROVIDER=
```

Never commit real secrets.

---

# 25. API DOCUMENTATION

After every phase update API documentation.

Maintain:

```text
docs/
    API.md
    AUTH.md
    WARDROBE.md
    AI.md
    LAUNDRY.md
    DHOBI.md
    INVENTORY.md
    TRANSFERS.md
    NOTIFICATIONS.md
```

Also maintain Postman collection or OpenAPI documentation.

---

# 26. TEST DOCUMENTATION

For every completed phase create:

```text
Phase X Test Report
```

Include:

```text
Implemented Features
API List
Test Cases
Passed
Failed
Fixed Issues
Known Limitations
Regression Result
Phase Status
```

Status must be one of:

```text
NOT_STARTED
IN_PROGRESS
TESTING
BLOCKED
COMPLETED
```

---

# 27. PHASE COMPLETION RULE

Before saying a phase is complete, verify:

```text
[ ] Code implemented
[ ] Build successful
[ ] Server starts
[ ] Database connection works
[ ] APIs tested
[ ] Validation tested
[ ] Authentication tested
[ ] Authorization tested
[ ] Error handling tested
[ ] Edge cases tested
[ ] Logs reviewed
[ ] Regression tests passed
[ ] Documentation updated
```

Only then mark:

```text
PHASE COMPLETED
```

---

# 28. IMPORTANT AI DEVELOPMENT RULE

For AI features:

Do not make the entire application dependent on AI.

AI is an intelligent service layer.

The application must continue working if AI temporarily fails.

For example:

If AI clothing recognition fails:

```text
User can manually enter:
Category
Color
Style
```

If AI recommendation fails:

```text
Show wardrobe manually.
```

If virtual try-on fails:

```text
Show clear failure state and allow retry.
```

Never allow AI failure to crash the main application.

---

# 29. IMPORTANT DATA CONSISTENCY RULE

Wardrobe and inventory state must always remain consistent.

Example:

If:

```text
White Shirt
```

is sent to laundry:

```text
status = IN_LAUNDRY
```

It must not simultaneously appear as:

```text
AVAILABLE
```

Similarly:

If:

```text
Camera
```

is given to Amit:

```text
status = LENT_OUT
currentHolder = Amit
```

When returned:

```text
status = AVAILABLE
currentHolder = OWNER
```

All state changes must be validated server-side.

---

# 30. AUDITABILITY

Important actions should be traceable.

Track:

```text
who
what
when
previous state
new state
```

For example:

```text
User Rahul
gave Camera
to Amit
on 25 Sep 2026
```

This becomes especially important for lending, laundry, and item status changes.

---

# 31. DEVELOPMENT WORKFLOW

When asked to implement the project, follow this exact workflow:

### STEP 1

Read the complete requirements.

### STEP 2

Analyze the current repository.

Do not overwrite existing working code blindly.

### STEP 3

Identify:

* Existing architecture
* Existing models
* Existing routes
* Existing middleware
* Existing environment variables
* Existing tests
* Existing integrations

### STEP 4

Create/update the implementation plan.

### STEP 5

Implement ONLY the requested phase.

### STEP 6

Run:

```text
npm install
npm run build
npm test
```

or the appropriate project commands.

### STEP 7

Start the server.

### STEP 8

Test every API.

Use Postman/curl/automated tests.

### STEP 9

Inspect logs.

### STEP 10

Fix bugs.

### STEP 11

Run regression tests.

### STEP 12

Update documentation.

### STEP 13

Report the phase status.

---

# 32. VERY IMPORTANT INSTRUCTION FOR CODING AI

If I say:

> "Implement Phase 3"

You must NOT implement Phase 4, Phase 5, or future functionality.

Only implement Phase 3.

If Phase 3 requires a small foundational change from Phase 2, make that change only if necessary and explain it.

If a future feature is discovered during implementation, document it under:

```text
Future Improvements
```

Do not silently implement it.

---

# 33. RESPONSE FORMAT AFTER EACH PHASE

After implementation, provide:

```text
================================
ARANGTIK PHASE X REPORT
================================

Phase:
Status:

Implemented:
- ...
- ...

APIs:
- ...
- ...

Database:
- ...

Testing:
- Passed:
- Failed:

Security:
- ...

Bugs Fixed:
- ...

Regression:
PASS / FAIL

Documentation:
Updated / Not Updated

Known Limitations:
- ...

Next Phase:
Phase X+1
```

---

# 34. FINAL QUALITY REQUIREMENT

The final Arangtik backend must be:

* Modular
* Secure
* Scalable
* Maintainable
* Testable
* Production-ready
* API-first
* AI-provider independent
* WhatsApp-provider independent
* Storage-provider independent
* Properly documented

Do not prioritize speed over architecture.

Do not generate unnecessary code.

Do not duplicate business logic.

Do not put secrets in source code.

Do not skip tests.

Do not move to the next phase until the current phase is verified.

---

# FIRST TASK

Before writing business logic:

1. Analyze the existing repository.
2. Identify the current backend structure.
3. Identify existing dependencies.
4. Identify existing APIs/models if any.
5. Identify missing foundation components.
6. Prepare a Phase 0 implementation plan.
7. Do NOT implement Phase 1 yet.
8. Wait for Phase 0 approval/completion workflow.

Start with **PHASE 0 — PROJECT FOUNDATION** only.

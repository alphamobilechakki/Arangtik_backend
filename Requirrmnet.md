ARANGTIK


Phase 1 
Product Requirement Document
1. Product Overview
Application Name: Arangtik
Core Concept:
Arangtik ek AI-powered personal wardrobe aur household item management application hoga jisme user:
Apne clothes ki digital wardrobe banayega.
AI se occasion/weather/location ke according outfit suggestions lega.
Apni photo par kisi dress ko virtually try karke dekh sakega.
Clothes laundry/dhobi ko bhejne aur receive karne ka record maintain karega.
Dhobi ko digital laundry order/PDF bhej sakega.
Household ke important items ka digital record maintain karega.
Kisi item ko kisi person ko dene par transfer/hand-over record maintain karega.
Item wapas aane par return record aur notification receive karega.
Important dates, return dates, laundry dates aur item-related reminders automatically receive karega.

2. Main Modules
Phase 1 ko following major modules mein divide kiya jayega:
Module A — User & Authentication
Module B — Digital Wardrobe
Module C — AI Outfit Recommendation
Module D — Virtual Try-On
Module E — Laundry / Dhobi Management
Module F — Household Item Inventory
Module G — Item Lending / Receiving
Module H — Notifications & Reminders
Module I — History & Records
Module J — AI Processing Layer

3. User Registration & Profile
User application open karega aur account create karega.
Registration
Possible options:
Mobile number
OTP
User Profile
Profile mein:
Name
Profile photo
Gender — optional
Date of birth — optional
Location
Preferred language
Clothing preferences
Favorite colors
Preferred styles

4. Digital Wardrobe
Ye Arangtik ka primary feature hoga.
User apne clothes ki photos upload karega.
Example:
User ne ek shirt ki photo li.
Arangtik AI image ko process karke wardrobe item create karega.
Wardrobe Item
Har item ke saath:
Item image
Item name
Category
Sub-category
Color
Pattern
Brand
Size
Material
Season
Occasion
Purchase date
Purchase price — optional
Current status
Location
Laundry status
Notes
Categories
Example:
Upper Wear
Shirt
T-Shirt
Kurta
Jacket
Sweater
Lower Wear
Jeans
Trouser
Shorts
Pajama
Traditional
Saree
Lehenga
Sherwani
Suit
Kurta Pajama
Accessories
Shoes
Watch
Belt
Tie
Sunglasses
Jewelry
Bag

5. AI Clothing Recognition
User sirf photo upload karega.
AI automatically identify karne ki koshish karega:
Image
 ↓
AI Image Analysis
 ↓
Clothing Detection
 ↓
Category
 ↓
Color
 ↓
Style
 ↓
Material
 ↓
Occasion
 ↓
Wardrobe Item
Example:
Photo:
Blue full-sleeve shirt
AI result:
Category: Shirt
Color: Blue
Sleeve: Full Sleeve
Pattern: Solid
Style: Casual/Formal
User AI-generated information ko edit kar sakta hai.

6. AI Outfit Recommendation
User Arangtik se bolega:
"Mujhe shaadi mein jaana hai, kya pehnu?"
Ya:
"Mere paas dinner hai."
Ya:
"Aaj office jaana hai."
Arangtik available wardrobe ko analyze karega.
Considerations:
Occasion
Weather
Location
Time
Existing wardrobe
Color combination
Style
Previously worn outfits
Example:
Occasion: Wedding

Recommended Outfit:

Blue Kurta
+
White Pajama
+
Brown Shoes
+
Watch
AI explanation:
"Ye combination wedding ke liye suitable hai aur aapke existing wardrobe ke items se bana hai."

7. Weather-Based Recommendation
Future weather integration ke saath:
Current Weather
       ↓
Temperature
       ↓
Rain
       ↓
Season
       ↓
Wardrobe
       ↓
Outfit Recommendation
Example:
Temperature 38°C
AI:
"Aaj light cotton shirt aur chinos better option ho sakta hai."

8. Virtual Try-On
Ye second major AI feature hoga.
User kisi clothing item ko select karega.
Phir:
"Try This Outfit"
User apni photo upload karega.
System:
User Photo
      +
Dress Image
      ↓
AI Virtual Try-On
      ↓
Generated Image
Result:
User apni photo mein selected dress pehne hue dekhega.
Example:
User mall mein gaya hai aur shirt dekh raha hai.
Photo click karega.
Arangtik mein shirt image upload karega.
Result:
"Ye shirt mujh par kaisi lagegi?"
AI generated preview show karega.
Important
Virtual try-on ko visual estimation ke रूप में present karna chahiye, exact physical fit guarantee ke रूप में nahi.

9. Laundry / Dhobi Management
Ye Arangtik ka important operational module hoga.
User kisi dhobi/laundry service ko onboard kar sakta hai.
Dhobi Onboarding
User:
Add Laundry Partner
Information:
Dhobi name
Mobile number
WhatsApp number
Address
Service type
Notes

10. Laundry Order Creation
User wardrobe se clothes select karega.
Example:
☑ White Shirt
☑ Blue Jeans
☑ Black Trouser
☑ Kurta
☑ Jacket
Then:
Send to Laundry
System ek digital laundry order create karega.
Example:
ARANGTIK LAUNDRY ORDER

Order ID: AR-LD-000124

Customer:
Rahul

Items:
1. White Shirt
2. Blue Jeans
3. Black Trouser
4. Kurta
5. Jacket

Total Items: 5

Expected Return:
30 September 2026

11. Laundry PDF
System automatically PDF generate karega.
PDF mein:
Arangtik branding
Customer information
Laundry partner information
Order ID
Item list
Item photos — optional
Quantity
Special instructions
Pickup date
Expected delivery date
QR/Order ID

12. WhatsApp Laundry Flow
User:
Send Order on WhatsApp
Dhobi ko WhatsApp par message/PDF/order link milega.
Example:
Arangtik Laundry Order #AR-LD-000124
 Total Items: 5
 Expected Delivery: 30 Sep 2026
 Please open the order to view item details.
Dhobi link open karega.

13. Dhobi App
Dhobi ke liye separate application/portal hoga.
Dhobi Login
Dhobi ko user ke bheje order se:
"Open Arangtik"
link milega.
First time:
Mobile Number
        ↓
OTP
        ↓
Account Created
        ↓
Dhobi Dashboard

14. Dhobi Dashboard
Dashboard mein:
Today's Orders
Pending Pickup       4
Received              8
Washing               12
Ready                 5
Delivered             7
Order Details
Dhobi dekh sakega:
Customer
Order ID
Clothes
Quantity
Instructions
Pickup date
Delivery date
Status

15. Laundry Status Flow
Standard workflow:
Created
   ↓
Sent to Laundry
   ↓
Accepted
   ↓
Picked Up
   ↓
Received
   ↓
Washing
   ↓
Ready
   ↓
Out for Delivery
   ↓
Delivered

16. Automatic Laundry Notifications
System automatically notifications bhejega.
Example:
Reminder
"Aapke 5 clothes laundry se receive hone wale hain."
Due Date
"Aaj aapke clothes receive hone ki expected date hai."
Ready
"Aapke clothes laundry se ready hain."
Delivery
"Aapke clothes delivery ke liye nikal gaye hain."
Received
"Aapke clothes successfully receive ho gaye."

17. Household Inventory
Arangtik sirf clothes tak limited nahi rahega.
User apne important household/personal items ka record bana sakta hai.
Example:
Electronics
Laptop
Mobile
Camera
Headphones
Tablet
Jewelry
Ring
Chain
Bracelet
Earrings
Documents
Passport
Certificates
Insurance documents
Household
Tools
Appliances
Important accessories
Other
Bags
Watches
Shoes
Sports equipment

18. Item Registration
User item add karega:
Item Name
Category
Photo
Brand
Model
Serial Number
Purchase Date
Purchase Price
Current Location
Owner
Notes
Example:
Item:
Canon Camera

Category:
Electronics

Serial Number:
XXXXXX

Location:
Bedroom Cabinet

Owner:
Me

19. Item Lending / Transfer
Ye concept particularly important hai.
Suppose user ka camera friend ko diya.
User:
Give Item
Select:
Canon Camera
Then:
Given To:
Amit

Mobile:
XXXXXXXXXX

Given Date:
25 Sep 2026

Expected Return:
05 Oct 2026

Purpose:
Trip
System item status change karega:
Available
     ↓
Lent Out

20. Recipient Record
Recipient ke paas item ka record create hoga.
Example:
ITEM RECEIPT

Item:
Canon Camera

Given By:
Rahul

Received By:
Amit

Date:
25 Sep 2026

Expected Return:
05 Oct 2026
Recipient confirmation:
Accept Item

21. Return Management
Expected return date ke according notification:
Before Due Date
"Canon Camera kal return hona hai."
Due Date
"Canon Camera return karne ki expected date aaj hai."
Overdue
"Canon Camera ki return date pass ho chuki hai."

22. Item Receive Confirmation
Jab item wapas aa jaye:
Mark as Received
System:
Lent Out
   ↓
Returned
   ↓
Available
History preserve hogi.

23. Complete Item History
Har item ki timeline hogi.
Example:
Canon Camera

15 Jan
Purchased

20 Mar
Given to Amit

25 Mar
Returned

10 Apr
Given to Rohit

18 Apr
Returned
Isse user ko pata rahega:
"Mera item kab kiske paas gaya tha."

24. Item Location Tracking
User item ki current location bhi maintain kar sakta hai.
Example:
Camera
Current Location:
Amit

Status:
Lent Out
Ya:
Camera
Current Location:
Bedroom Cabinet

25. "Mere Paas Kya Hai?" Feature
Arangtik ka ek powerful dashboard hoga:
My Assets
Clothes       42
Shoes          8
Watches        4
Jewelry       12
Electronics    9
Other         15
Aur:
Currently Outside
Camera → Amit
Book → Rohit
Suit → Laundry
Watch → Service Center
Isse user ek screen par dekh sakta hai:
Mera kaunsa samaan abhi mere paas nahi hai aur kiske paas hai.

26. Notifications Center
Central notification system:
Wardrobe
New outfit suggestion
Weather-based recommendation
Laundry
Laundry received
Laundry ready
Delivery due
Delivery completed
Items
Item given
Item accepted
Return reminder
Return due
Return overdue
Item returned

27. Dashboard
User dashboard simple aur clean hoga.
Top Section
Good Morning, Rahul 👋

Today's Suggestion

[ Outfit Image ]

Blue Shirt
White Chinos
Brown Shoes

Try Outfit →
Quick Stats
42 Clothes
8 Shoes
4 Watches
3 Outside Items
5 Laundry Items
Pending Actions
Laundry Due Today       2
Items To Receive        1
Items Overdue           1

28. AI Assistant
Future mein Arangtik ke andar AI assistant ho sakta hai.
User natural language mein bole:
"Kal shaadi hai, mujhe kya pehna chahiye?"
AI wardrobe check karega.
Ya:
"Meri blue shirt kahan hai?"
AI:
"Blue shirt currently laundry mein hai. Expected return: 27 September."
Ya:
"Mera camera kiske paas hai?"
AI:
"Camera currently Amit ke paas hai. Expected return: 5 October."

29. Core Data Relationship
Basic architecture:
USER
 │
 ├── WARDROBE
 │     ├── Clothes
 │     ├── Shoes
 │     └── Accessories
 │
 ├── LAUNDRY
 │     ├── Laundry Partner
 │     ├── Orders
 │     └── Order Items
 │
 ├── INVENTORY
 │     ├── Electronics
 │     ├── Jewelry
 │     ├── Documents
 │     └── Other Items
 │
 ├── ITEM TRANSFERS
 │     ├── Given To
 │     ├── Expected Return
 │     └── Returned
 │
 ├── AI
 │     ├── Recommendations
 │     └── Virtual Try-On
 │
 └── NOTIFICATIONS

30. Phase 1 Development Scope
Phase 1 ko unnecessarily huge nahi karna chahiye.
Phase 1 MVP
User App
Authentication
Profile
Wardrobe
Add clothes
AI clothing recognition
Outfit recommendation
Virtual try-on
Laundry partner
Laundry order
PDF generation
WhatsApp order sharing
Laundry status
Household inventory
Item lending
Return tracking
Notifications
History
Dhobi App
Login/OTP
Dashboard
Orders
Order details
Status update
Customer details
Delivery status

31. Phase 1 mein kya nahi rakhenge
Initial version ko manageable rakhne ke liye:
Full marketplace
Paid subscriptions
Multiple laundry businesses marketplace
Payment gateway
Advanced social features
Public wardrobe sharing
Complex AI stylist personality
AR live camera try-on
Ye future phases mein aa sakte hain.

32. Recommended Phase Breakdown
Development ko is order mein karna better rahega:
Phase 1A — Foundation
Authentication
User
Database
File/image upload
Basic profile
Phase 1B — Wardrobe
Categories
Clothes
Accessories
AI image recognition
Wardrobe management
Phase 1C — AI
Outfit recommendation
Weather integration
Occasion recommendation
Virtual try-on
Phase 1D — Laundry
Dhobi onboarding
Laundry order
PDF
WhatsApp
Dhobi portal
Status tracking
Phase 1E — Inventory
Household items
Item location
Lending
Recipient
Return
History
Phase 1F — Notifications
Push notifications
WhatsApp notifications
Email — optional
Scheduled reminders
Phase 1G — Testing & Security
API testing
AI testing
Image upload security
Authentication security
Role/permission testing
Notification testing
Production deployment

33. Important Product Principle
Arangtik ko "kapde rakhne wali app" ke रूप में design nahi karna chahiye.
Iska core concept hona chahiye:
"Everything you own, where it is, what you should wear, what is being cleaned, and what is currently with someone else — all in one place."
Isse wardrobe + inventory + lending + laundry + AI ek hi ecosystem mein connect ho jata hai.
Recommended architecture
                ARANGTIK
                    │
        ┌───────────┴───────────┐
        │                       │
     USER APP               DHOBI APP
        │                       │
        ├── Wardrobe            ├── Orders
        ├── AI Stylist          ├── Status
        ├── Virtual Try-On      └── Delivery
        ├── Laundry
        ├── Inventory
        ├── Lending
        └── Notifications
                    │
                BACKEND
                    │
        ┌───────────┼───────────┐
        │           │           │
     MongoDB       AI       Notification
                   │           │
             Vision/LLM   WhatsApp/Push
Next step: ab is requirement ko development-ready banane ke liye main iske complete technical specification mein jaunga—Node.js + Express.js backend architecture, MongoDB schemas, roles, API list, API request/response structure, image/AI processing flow, WhatsApp flow, PDF generation, notification scheduler aur Phase-wise backend development guide ke saath.


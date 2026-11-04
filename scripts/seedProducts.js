const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db.config');
const DensityCategory = require('../src/modules/admin/densityCategory/densityCategory.model');
const Product = require('../src/modules/admin/product/product.model');

// ============================================================
// STANDARD PRODUCT DATA (NO BRANDS, CLEAN NAMES & ALIASES)
// ============================================================

const STANDARD_PRODUCTS = {
  Flour: [
    { name: 'Wheat Flour', aliases: ['Atta', 'Chakki Atta', 'Gehu Atta', 'Whole Wheat Flour', 'Sharbati Atta'] },
    { name: 'Maida', aliases: ['All-Purpose Flour', 'Refined Wheat Flour', 'White Flour'] },
    { name: 'Gram Flour', aliases: ['Besan', 'Chickpea Flour', 'Chana Atta'] },
    { name: 'Coarse Gram Flour', aliases: ['Mota Besan', 'Laddoo Besan', 'Kadhi Besan'] },
    { name: 'Rice Flour', aliases: ['Chawal ka Atta', 'Rice Powder', 'Arisi Maavu'] },
    { name: 'Brown Rice Flour', aliases: ['Brown Chawal Atta', 'Whole Grain Rice Flour'] },
    { name: 'Finger Millet Flour', aliases: ['Ragi Flour', 'Ragi Atta', 'Nachni Atta', 'Mandua Atta'] },
    { name: 'Pearl Millet Flour', aliases: ['Bajra Flour', 'Bajra Atta', 'Sajje Flour'] },
    { name: 'Sorghum Flour', aliases: ['Jowar Flour', 'Jowar Atta', 'White Millet Flour', 'Jola Flour'] },
    { name: 'Corn Flour', aliases: ['Makki Atta', 'Yellow Maize Flour', 'Cornmeal Flour'] },
    { name: 'White Corn Flour', aliases: ['Safed Makki Atta', 'White Maize Flour'] },
    { name: 'Buckwheat Flour', aliases: ['Kuttu Atta', 'Kuttu ka Atta', 'Vrat Atta'] },
    { name: 'Water Chestnut Flour', aliases: ['Singhara Atta', 'Singhara ka Atta', 'Singhare ka Atta'] },
    { name: 'Amaranth Flour', aliases: ['Rajgira Atta', 'Ramdana Flour', 'Rajgira Flour'] },
    { name: 'Barley Flour', aliases: ['Jau Atta', 'Jau ka Atta'] },
    { name: 'Oats Flour', aliases: ['Oatmeal Powder', 'Jai Atta'] },
    { name: 'Soybean Flour', aliases: ['Soya Atta', 'Defatted Soy Flour'] },
    { name: 'Roasted Gram Flour', aliases: ['Sattu', 'Chana Sattu', 'Roasted Bengal Gram Flour'] },
    { name: 'Semolina Flour', aliases: ['Chiroti Rava', 'Fine Suji', 'Fine Semolina'] },
    { name: 'Almond Flour', aliases: ['Badam Atta', 'Almond Meal', 'Blanched Almond Flour'] },
    { name: 'Coconut Flour', aliases: ['Nariyal Atta', 'Desiccated Coconut Flour'] },
    { name: 'Tapioca Flour', aliases: ['Tapioca Starch', 'Cassava Flour', 'Sabudana Flour'] },
    { name: 'Arrowroot Flour', aliases: ['Ararot', 'Arrowroot Powder'] },
    { name: 'Quinoa Flour', aliases: ['Kinwa Atta', 'Whole Quinoa Flour'] },
    { name: 'Foxtail Millet Flour', aliases: ['Kangni Atta', 'Navane Flour', 'Korra Flour'] },
    { name: 'Little Millet Flour', aliases: ['Kutki Atta', 'Samai Flour'] },
    { name: 'Barnyard Millet Flour', aliases: ['Sanwa Atta', 'Samvat ke Chawal ka Atta', 'Kuthiraivali Flour'] },
    { name: 'Kodo Millet Flour', aliases: ['Kodon Atta', 'Varagu Flour'] },
    { name: 'Emmer Wheat Flour', aliases: ['Khapli Atta', 'Diabetic Wheat Flour', 'Ancient Grain Atta'] },
    { name: 'Multigrain Flour', aliases: ['Multigrain Atta', 'Panchrattan Atta', 'Mix Grain Flour'] },
    { name: 'Gluten Free Flour', aliases: ['Gluten Free Atta', 'GF Flour Mix'] },
    { name: 'Pea Flour', aliases: ['Matar Atta', 'Green Pea Flour'] },
    { name: 'Potato Flour', aliases: ['Aloo Atta', 'Dehydrated Potato Powder'] },
  ],

  Grains: [
    { name: 'Basmati Rice', aliases: ['Classic Basmati', 'Biryani Rice', 'Long Grain Rice', 'Chawal'] },
    { name: 'Sona Masoori Rice', aliases: ['Sona Masuri', 'Medium Grain Rice', 'South Indian Rice', 'Steam Rice'] },
    { name: 'Brown Rice', aliases: ['Brown Basmati', 'Unpolished Rice', 'Whole Grain Rice'] },
    { name: 'Kolam Rice', aliases: ['Wada Kolam', 'Lachkari Kolam', 'Gujarat 17 Rice'] },
    { name: 'Ponni Rice', aliases: ['Ponni Boiled Rice', 'Thanjavur Ponni', 'Idli Ponni Rice'] },
    { name: 'Gobindobhog Rice', aliases: ['Govind Bhog', 'Aromatic Kheer Rice', 'Payasam Rice'] },
    { name: 'Jasmine Rice', aliases: ['Fragrant Rice', 'Thai Jasmine Rice'] },
    { name: 'Red Rice', aliases: ['Kerala Matta Rice', 'Palakkadan Matta', 'Rosematta Rice', 'Lal Chawal'] },
    { name: 'Black Rice', aliases: ['Chak-hao', 'Forbidden Rice', 'Kala Chawal'] },
    { name: 'Idli Rice', aliases: ['Parboiled Rice', 'Salem Rice', 'Dosa Rice', 'Puzhungal Arisi'] },
    { name: 'Jeera Samba Rice', aliases: ['Seeraga Samba', 'Jeerakasala', 'Kaima Rice'] },
    { name: 'Broken Rice', aliases: ['Kanki', 'Tibar Rice', 'Dubar Rice', 'Kani Rice'] },
    { name: 'Thick Poha', aliases: ['Flattened Rice', 'Jada Poha', 'Mota Poha', 'Batata Poha', 'Aval', 'Atukulu'] },
    { name: 'Thin Poha', aliases: ['Nylon Poha', 'Patla Poha', 'Paper Poha', 'Chivda Poha'] },
    { name: 'Puffed Rice', aliases: ['Murmura', 'Kurmura', 'Muri', 'Pori', 'Bhel Rice'] },
    { name: 'Whole Wheat Grains', aliases: ['Sabut Gehu', 'Gehu Dana', 'Wheat Berries', 'Sharbati Wheat'] },
    { name: 'Rolled Oats', aliases: ['Jaye', 'Breakfast Oats', 'Old Fashioned Oats'] },
    { name: 'Steel Cut Oats', aliases: ['Coarse Cut Oats', 'Irish Oats', 'Pinhead Oats'] },
    { name: 'Instant Oats', aliases: ['Quick Cooking Oats', 'Porridge Oats'] },
    { name: 'Whole Barley', aliases: ['Sabut Jau', 'Barley Grain', 'Pearl Barley'] },
    { name: 'White Quinoa', aliases: ['Kinwa', 'Quinoa Grain', 'Royal White Quinoa'] },
    { name: 'Finger Millet Grains', aliases: ['Sabut Ragi', 'Nachni Grains', 'Mandua Dana'] },
    { name: 'Pearl Millet Grains', aliases: ['Sabut Bajra', 'Bajra Grains', 'Sajje'] },
    { name: 'Sorghum Grains', aliases: ['Sabut Jowar', 'Jowar Grains', 'Great Millet', 'Jola'] },
    { name: 'Foxtail Millet Grains', aliases: ['Kangni Grains', 'Navane', 'Korra', 'Thinai'] },
    { name: 'Barnyard Millet Grains', aliases: ['Sanwa Grains', 'Samvat Rice', 'Kuthiraivali', 'Oodalu'] },
    { name: 'Little Millet Grains', aliases: ['Kutki Grains', 'Samai', 'Sama Grains'] },
    { name: 'Kodo Millet Grains', aliases: ['Kodon Grains', 'Varagu', 'Arikelu'] },
    { name: 'Buckwheat Groats', aliases: ['Sabut Kuttu', 'Raw Buckwheat Kernels', 'Kasha'] },
    { name: 'Couscous', aliases: ['Steamed Semolina Grain', 'Moroccan Couscous'] },
    { name: 'Bulgur Wheat', aliases: ['Cracked Wheat Grains', 'Lobiya Wheat', 'Burghul'] },
    { name: 'Corn Kernels', aliases: ['Popping Corn', 'Makai Dana', 'Popcorn Kernels'] },
  ],

  Pulses: [
    { name: 'Toor Dal', aliases: ['Arhar Dal', 'Yellow Pigeon Peas', 'Tuvar Dal', 'Kandi Pappu', 'Thuvaram Paruppu'] },
    { name: 'Yellow Moong Dal', aliases: ['Moong Dhuli', 'Split Yellow Gram', 'Mung Bean Split', 'Pesara Pappu'] },
    { name: 'Split Green Moong Dal', aliases: ['Moong Chilka', 'Split Green Gram', 'Green Mung Split'] },
    { name: 'Whole Green Moong', aliases: ['Sabut Moong', 'Whole Green Gram', 'Mung Beans', 'Pachai Payaru'] },
    { name: 'Chana Dal', aliases: ['Split Bengal Gram', 'Bengal Gram Dal', 'Chane ki Dal', 'Senaga Pappu'] },
    { name: 'Split Red Lentils', aliases: ['Masoor Dal', 'Masoor Dhuli', 'Orange Lentils', 'Red Dhal'] },
    { name: 'Whole Brown Lentils', aliases: ['Sabut Masoor', 'Malka Masoor', 'Brown Lentils', 'Kali Masoor'] },
    { name: 'White Urad Dal', aliases: ['Urad Dhuli', 'Washed Black Gram', 'Split White Urad', 'Idli Dal', 'Ulutham Paruppu'] },
    { name: 'Split Black Urad Dal', aliases: ['Urad Chilka', 'Split Black Gram with Skin'] },
    { name: 'Whole Black Urad', aliases: ['Sabut Urad', 'Maa ki Dal', 'Kali Dal', 'Whole Black Gram', 'Minumulu'] },
    { name: 'Kabuli Chana', aliases: ['White Chickpeas', 'Safed Chana', 'Chole', 'Garbanzo Beans'] },
    { name: 'Kala Chana', aliases: ['Desi Chana', 'Brown Chickpeas', 'Black Chickpeas', 'Bengal Gram Whole'] },
    { name: 'Rajma Chitra', aliases: ['Spotted Kidney Beans', 'Chitra Rajma', 'Kashmiri Rajma'] },
    { name: 'Red Rajma', aliases: ['Red Kidney Beans', 'Lal Rajma', 'Sharmili Rajma'] },
    { name: 'White Peas', aliases: ['Safed Vatana', 'Dry White Peas', 'Ragda Vatana', 'Matar Dal'] },
    { name: 'Dry Green Peas', aliases: ['Hara Vatana', 'Sukha Matar', 'Dried Green Peas'] },
    { name: 'Black Eyed Peas', aliases: ['Lobia', 'Chawli', 'Karamani', 'Alasandalu', 'Cowpeas'] },
    { name: 'Red Cowpeas', aliases: ['Lal Lobia', 'Red Chawli', 'Thattai Payaru'] },
    { name: 'Moth Beans', aliases: ['Moth Dal', 'Matki', 'Turkish Gram', 'Dew Bean'] },
    { name: 'Horse Gram', aliases: ['Kulthi Dal', 'Kollu', 'Ulavalu', 'Hurali'] },
    { name: 'Soybeans', aliases: ['Bhatma', 'Soya Bean Grains', 'Glycine Max'] },
    { name: 'Fried Gram', aliases: ['Bhuna Chana', 'Roasted Chana', 'Chutney Dal', 'Pottukadalai', 'Putnala Pappu'] },
    { name: 'Panchratna Dal', aliases: ['Mix Dal', 'Panchmel Dal', 'Five Lentils Blend'] },
    { name: 'Val Dal', aliases: ['Field Beans', 'Hyacinth Beans', 'Broad Beans Split', 'Avarai Paruppu'] },
  ],

  Granular: [
    { name: 'Refined White Sugar', aliases: ['Sugar', 'Chini', 'White Sugar', 'Table Sugar', 'Crystal Sugar'] },
    { name: 'Brown Cane Sugar', aliases: ['Khandsari Sugar', 'Cane Sugar', 'Demerara Sugar'] },
    { name: 'Jaggery Powder', aliases: ['Shakkar', 'Gud Powder', 'Desi Khand', 'Brown Jaggery Granules'] },
    { name: 'Palm Sugar Granules', aliases: ['Karupatti Sugar', 'Palm Jaggery Crystals', 'Nattu Sakkarai'] },
    { name: 'Coconut Sugar', aliases: ['Coconut Palm Sugar Granules', 'Organic Coco Sugar'] },
    { name: 'Bura Sugar', aliases: ['Boora', 'Tagar', 'Castor Sugar', 'Confectioners Sugar'] },
    { name: 'Mishri Crystals', aliases: ['Rock Sugar', 'Dhaga Mishri', 'Khanda Mishri'] },
    { name: 'Table Salt', aliases: ['Salt', 'Namak', 'Iodized Salt', 'White Salt', 'Free Flow Salt'] },
    { name: 'Rock Salt', aliases: ['Sendha Namak', 'Himalayan Pink Salt', 'Lahori Namak', 'Vrat Namak'] },
    { name: 'Black Salt', aliases: ['Kala Namak', 'Sulemani Namak', 'Bit Lobon'] },
    { name: 'Sea Salt Crystals', aliases: ['Samundri Namak', 'Coarse Sea Salt', 'Natural Salt'] },
    { name: 'Coarse Semolina', aliases: ['Suji', 'Sooji', 'Bombay Rava', 'Rawa'] },
    { name: 'Fine Semolina', aliases: ['Chiroti Rava', 'Barik Suji', 'Lapsi Rava'] },
    { name: 'Bansi Rava', aliases: ['Wheat Rava', 'Samba Rava', 'Cracked Semolina'] },
    { name: 'Broken Wheat', aliases: ['Dalia', 'Wheat Dalia', 'Cracked Wheat', 'Lapsi'] },
    { name: 'Barley Dalia', aliases: ['Jau Dalia', 'Cracked Barley Grits'] },
    { name: 'Corn Grits', aliases: ['Makka Dalia', 'Polenta Grits', 'Cornmeal'] },
    { name: 'Tapioca Sago Large', aliases: ['Sabudana', 'Bada Sabudana', 'Tapioca Pearls', 'Javvarisi'] },
    { name: 'Tapioca Sago Small', aliases: ['Nylon Sabudana', 'Chota Sabudana', 'Kheer Sabudana'] },
    { name: 'Isabgol Husk', aliases: ['Psyllium Husk', 'Isabgol Granules', 'Sat Isabgol'] },
    { name: 'Wheat Bran', aliases: ['Gehu Choker', 'Wheat Husk Granules'] },
  ],

  Spices: [
    { name: 'Turmeric Powder', aliases: ['Haldi', 'Haldi Powder', 'Curcuma Powder', 'Lakadong Haldi'] },
    { name: 'Whole Turmeric Fingers', aliases: ['Sabut Haldi', 'Haldi Ganth', 'Dried Turmeric Sticks'] },
    { name: 'Red Chilli Powder', aliases: ['Lal Mirch', 'Mirchi Powder', 'Hot Chilli Powder', 'Cayenne Powder'] },
    { name: 'Kashmiri Chilli Powder', aliases: ['Kashmiri Mirch', 'Degi Mirch', 'Mild Red Pepper'] },
    { name: 'Whole Dry Red Chillies', aliases: ['Sabut Lal Mirch', 'Guntur Sannam Chilli', 'Byadgi Mirch', 'Kashmiri Chilli Whole'] },
    { name: 'Coriander Powder', aliases: ['Dhania Powder', 'Pisa Dhania', 'Cilantro Seed Powder'] },
    { name: 'Whole Coriander Seeds', aliases: ['Sabut Dhania', 'Dhania Seeds', 'Coriander Kernels'] },
    { name: 'Cumin Seeds', aliases: ['Jeera', 'Zeera', 'White Cumin', 'Safed Jeera'] },
    { name: 'Roasted Cumin Powder', aliases: ['Bhuna Jeera Powder', 'Jeera Powder'] },
    { name: 'Black Cumin Seeds', aliases: ['Shahi Jeera', 'Kala Jeera', 'Caraway Seeds'] },
    { name: 'Garam Masala Powder', aliases: ['Garam Masala', 'Hot Spice Mix', 'Whole Spice Powder'] },
    { name: 'Black Pepper Powder', aliases: ['Kali Mirch Powder', 'Pisi Kali Mirch', 'Crushed Black Pepper'] },
    { name: 'Whole Black Peppercorns', aliases: ['Sabut Kali Mirch', 'Black Pepper Whole', 'Gol Mirch'] },
    { name: 'White Pepper Powder', aliases: ['Safed Mirch Powder', 'Dakhni Mirch'] },
    { name: 'Green Cardamom', aliases: ['Choti Elaichi', 'Hari Elaichi', 'Cardamom Pods'] },
    { name: 'Black Cardamom', aliases: ['Badi Elaichi', 'Moti Elaichi', 'Brown Cardamom'] },
    { name: 'Cloves', aliases: ['Laung', 'Lavang', 'Whole Cloves'] },
    { name: 'Cinnamon Sticks', aliases: ['Dalchini', 'Cassia Bark', 'Ceylon Cinnamon'] },
    { name: 'Cinnamon Powder', aliases: ['Dalchini Powder', 'Ground Cinnamon'] },
    { name: 'Mace', aliases: ['Javitri', 'Nutmeg Flower'] },
    { name: 'Nutmeg', aliases: ['Jaiphal', 'Whole Nutmeg Seed'] },
    { name: 'Dry Ginger Powder', aliases: ['Saunth', 'Soonth Powder', 'Sukha Adrak Powder'] },
    { name: 'Dry Mango Powder', aliases: ['Amchur', 'Amchoor Powder', 'Khatta Powder'] },
    { name: 'Asafoetida Powder', aliases: ['Hing', 'Heeng', 'Compounded Asafoetida', 'Perungayam'] },
    { name: 'Fenugreek Leaves', aliases: ['Kasuri Methi', 'Kasoori Methi', 'Dried Methi'] },
    { name: 'Star Anise', aliases: ['Chakra Phool', 'Badiyan Phool'] },
    { name: 'Bay Leaves', aliases: ['Tej Patta', 'Biryani Patta', 'Indian Bay Leaf'] },
    { name: 'Fennel Powder', aliases: ['Saunf Powder', 'Badi Saunf Powder'] },
    { name: 'Carom Seeds', aliases: ['Ajwain', 'Ajwain Seeds', 'Bishop Weed'] },
    { name: 'Nigella Seeds', aliases: ['Kalonji', 'Black Onion Seeds', 'Karela Seeds'] },
    { name: 'Chaat Masala', aliases: ['Chat Masala', 'Tangy Seasoning'] },
    { name: 'Sambhar Powder', aliases: ['Sambar Masala', 'South Indian Sambar Podi'] },
    { name: 'Rasam Powder', aliases: ['Rasam Podi', 'Pepper Rasam Masala'] },
    { name: 'Biryani Masala Powder', aliases: ['Biryani Spice Mix', 'Dum Biryani Masala'] },
  ],

  Seeds: [
    { name: 'Yellow Mustard Seeds', aliases: ['Peeli Sarson', 'Yellow Rai', 'White Mustard'] },
    { name: 'Black Mustard Seeds', aliases: ['Rai', 'Kali Sarson', 'Brown Mustard', 'Rai Dana', 'Kadugu'] },
    { name: 'White Sesame Seeds', aliases: ['Safed Til', 'Hulled Sesame', 'White Gingelly Seeds'] },
    { name: 'Black Sesame Seeds', aliases: ['Kala Til', 'Black Gingelly Seeds'] },
    { name: 'Chia Seeds', aliases: ['Raw Chia', 'Salvia Hispanica'] },
    { name: 'Flax Seeds', aliases: ['Alsi', 'Javs', 'Linseeds', 'Agase'] },
    { name: 'Roasted Flax Seeds', aliases: ['Bhuni Alsi', 'Crunchy Flax Seeds'] },
    { name: 'Fennel Seeds', aliases: ['Saunf', 'Badi Saunf', 'Lucknowi Saunf', 'Mauri'] },
    { name: 'Thin Fennel Seeds', aliases: ['Choti Saunf', 'Variyali', 'Sweet Fennel'] },
    { name: 'Fenugreek Seeds', aliases: ['Methi Dana', 'Sabut Methi', 'Vendhayam'] },
    { name: 'Sunflower Seeds', aliases: ['Surajmukhi Beej', 'Shelled Sunflower Kernels'] },
    { name: 'Pumpkin Seeds', aliases: ['Kaddu Beej', 'Pepitas', 'Green Pumpkin Kernels'] },
    { name: 'Watermelon Seeds', aliases: ['Tarbooj Beej', 'Magaz', 'Watermelon Kernels'] },
    { name: 'Muskmelon Seeds', aliases: ['Kharbuja Beej', 'Cantaloupe Seeds', 'Melon Magaz'] },
    { name: 'Cucumber Seeds', aliases: ['Kheera Beej', 'Cucumber Magaz'] },
    { name: 'Char Magaz', aliases: ['Four Melon Seeds Mix', 'Magaz Mix'] },
    { name: 'Poppy Seeds', aliases: ['Khus Khus', 'Khas Khas', 'Posto Dana', 'White Poppy'] },
    { name: 'Garden Cress Seeds', aliases: ['Halim', 'Aliv Seeds', 'Asaliya Beej'] },
    { name: 'Basil Seeds', aliases: ['Sabja Seeds', 'Falooda Seeds', 'Tukmaria', 'Sweet Basil'] },
    { name: 'Dill Seeds', aliases: ['Suva Dana', 'Sowa Beej'] },
    { name: 'Hemp Seeds', aliases: ['Bhang Beej', 'Hemp Hearts'] },
  ],

  Liquid: [
    { name: 'Mustard Oil', aliases: ['Sarson Tel', 'Kachi Ghani Tel', 'Cold Pressed Mustard Oil'] },
    { name: 'Sunflower Oil', aliases: ['Surajmukhi Tel', 'Refined Sunflower Oil'] },
    { name: 'Cow Desi Ghee', aliases: ['Ghee', 'Cow Ghee', 'Pure Desi Ghee', 'Clarified Butter', 'Neyyu'] },
    { name: 'Buffalo Desi Ghee', aliases: ['Buffalo Ghee', 'White Ghee'] },
    { name: 'Extra Virgin Olive Oil', aliases: ['Olive Oil', 'Jaitun ka Tel', 'EVOO'] },
    { name: 'Virgin Coconut Oil', aliases: ['Nariyal Tel', 'Cold Pressed Coconut Oil', 'Thengai Ennai'] },
    { name: 'Groundnut Oil', aliases: ['Mungfali Tel', 'Peanut Oil', 'Filtered Groundnut Oil'] },
    { name: 'Sesame Oil', aliases: ['Til Tel', 'Gingelly Oil', 'Nalla Ennai'] },
    { name: 'Soybean Oil', aliases: ['Soya Tel', 'Refined Soybean Oil'] },
    { name: 'Rice Bran Oil', aliases: ['Physically Refined Rice Bran Oil', 'Health Oil'] },
    { name: 'Corn Oil', aliases: ['Makka Tel', 'Maize Oil'] },
    { name: 'Flaxseed Oil', aliases: ['Alsi Tel', 'Cold Pressed Linseed Oil'] },
    { name: 'Castor Oil', aliases: ['Arandi Tel', 'Cold Pressed Castor Oil'] },
    { name: 'White Cooking Vinegar', aliases: ['Sirka', 'Synthetic Vinegar', 'Distilled White Vinegar'] },
    { name: 'Apple Cider Vinegar', aliases: ['ACV with Mother', 'Seb Sirka'] },
    { name: 'Natural Honey', aliases: ['Shahad', 'Madhu', 'Raw Forest Honey'] },
    { name: 'Rose Water', aliases: ['Gulab Jal', 'Culinary Rose Water'] },
    { name: 'Kewra Water', aliases: ['Kewra Essence', 'Pandanus Extract'] },
  ],

  Powder: [
    { name: 'Baking Powder', aliases: ['Double Action Baking Powder', 'Cake Rising Powder'] },
    { name: 'Baking Soda', aliases: ['Sodium Bicarbonate', 'Meetha Soda', 'Khane ka Soda'] },
    { name: 'Cocoa Powder', aliases: ['Dutch Cocoa', 'Unsweetened Cocoa Powder', 'Chocolate Powder'] },
    { name: 'Instant Coffee Powder', aliases: ['Coffee Powder', 'Filter Coffee Granules'] },
    { name: 'Dairy Milk Powder', aliases: ['Whole Milk Powder', 'Sookha Doodh'] },
    { name: 'Skimmed Milk Powder', aliases: ['Fat Free Milk Powder', 'SMP'] },
    { name: 'Vanilla Custard Powder', aliases: ['Custard Powder', 'Fruit Salad Custard Mix'] },
    { name: 'Cornflour Starch', aliases: ['Corn Starch', 'Ararot Powder', 'Thickener'] },
    { name: 'Instant Active Yeast', aliases: ['Khamir', 'Baker Yeast Powder', 'Dry Yeast'] },
    { name: 'Citric Acid Crystals', aliases: ['Nimbu Sat', 'Nimbu ke Phool', 'Tatiri'] },
    { name: 'Cream of Tartar', aliases: ['Potassium Bitartrate'] },
    { name: 'Dehydrated Onion Powder', aliases: ['Pyaz Powder', 'White Onion Powder'] },
    { name: 'Dehydrated Garlic Powder', aliases: ['Lahsun Powder'] },
    { name: 'Tomato Powder', aliases: ['Dehydrated Tomato Powder', 'Spray Dried Tomato'] },
    { name: 'Moringa Leaf Powder', aliases: ['Sahjan Powder', 'Drumstick Leaf Powder'] },
    { name: 'Wheatgrass Powder', aliases: ['Gehu Jowar Grass Powder'] },
    { name: 'Amla Fruit Powder', aliases: ['Indian Gooseberry Powder', 'Sukha Amla Powder'] },
    { name: 'Beetroot Powder', aliases: ['Chukandar Powder', 'Natural Red Food Color'] },
    { name: 'Spirulina Powder', aliases: ['Blue Green Algae Powder'] },
    { name: 'Matcha Green Tea Powder', aliases: ['Japanese Matcha'] },
    { name: 'Agar Agar Powder', aliases: ['China Grass Powder', 'Vegetarian Gelatin'] },
  ],
};

async function seed() {
  try {
    await connectDB();
    console.log('Seeding Standard Products (Without Brand Names, Pure Standard Names & Aliases)...\n');

    const categories = await DensityCategory.find().sort({ materialType: 1 });
    console.log(`Found ${categories.length} density categories in database.\n`);

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const category of categories) {
      const categoryName = category.materialType;
      const productsForCategory = STANDARD_PRODUCTS[categoryName] || [];

      console.log(`\n============================================================`);
      console.log(`Category: [${categoryName}] (Default Density: ${category.defaultDensity} ${category.densityUnit})`);
      console.log(`Found ${productsForCategory.length} standard products to seed.`);
      console.log(`============================================================`);

      for (const item of productsForCategory) {
        const existing = await Product.findOne({
          name: item.name,
          densityCategoryId: category._id,
        });

        if (existing) {
          existing.aliases = item.aliases;
          existing.densityOverride = null;
          await existing.save();
          totalUpdated++;
          console.log(`  [UPDATED] ${item.name} -> aliases: [${item.aliases.join(', ')}]`);
        } else {
          const product = await Product.create({
            name: item.name,
            aliases: item.aliases,
            densityCategoryId: category._id,
            densityOverride: null,
          });
          totalCreated++;
          console.log(`  [CREATED] ${item.name} -> aliases: [${item.aliases.join(', ')}]`);
        }
      }
    }

    console.log(`\n============================================================`);
    console.log(`STANDARD PRODUCT SEEDING COMPLETE!`);
    console.log(`New Products Created: ${totalCreated}`);
    console.log(`Products Updated:     ${totalUpdated}`);
    console.log(`Total Standard Items: ${totalCreated + totalUpdated}`);
    console.log(`============================================================\n`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding standard products:', error);
    process.exit(1);
  }
}

seed();

const mongoose = require('mongoose');
const KitchenBoxCapture = require('./kitchenBoxCapture.model');
const KitchenBox = require('../kitchenBox/kitchenBox.model');
const Hub = require('../hub/hub.model');
const ApiError = require('../../../utils/apiError');
const { saveBase64Image } = require('../../../middlewares/upload.middleware');

class KitchenBoxCaptureService {

}


module.exports = new KitchenBoxCaptureService();


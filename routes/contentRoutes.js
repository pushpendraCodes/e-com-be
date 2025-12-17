const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');
const {auth ,isAdmin} = require('../middilewares/auth');
const mediaController = require('../controllers/contentController');
const upload = require('../utils/multer');

// Terms & Conditions Routes
router.get('/terms', contentController.getTerms);
router.put('/terms',auth, isAdmin, contentController.updateTerms);

// Privacy Policy Routes
router.get('/privacy', contentController.getPrivacy);
router.put('/privacy',auth, isAdmin, contentController.updatePrivacy);


// ==================== ROUTES/mediaRoutes.js ====================


// Banner Routes
router.get('/banners', mediaController.getBanners);
router.post('/banners', auth, isAdmin, upload.array('banner'), mediaController.addBanner);
router.put('/banners/:bannerId',auth, isAdmin, upload.single('banner'), mediaController.updateBanner);
router.delete('/banners/:bannerId',auth, isAdmin, mediaController.deleteBanner);

// Slider Routes
router.get('/sliders', mediaController.getSliders);
router.post('/sliders', auth, isAdmin, upload.array('slider'), mediaController.addSlider);
router.put('/sliders/:sliderId', auth, isAdmin, upload.single('slider'), mediaController.updateSlider);
router.delete('/sliders/:sliderId', auth, isAdmin, mediaController.deleteSlider);

// Popup Ad Routes
router.get('/popup-ads', mediaController.getPopupAds);
router.post('/popup-ads', auth, isAdmin, upload.array('image'), mediaController.addPopupAd);
router.put('/popup-ads/:popupAdId', auth, isAdmin, upload.array('image'), mediaController.updatePopupAd);
router.delete('/popup-ads/:popupAdId', auth, isAdmin, mediaController.deletePopupAd);

module.exports = router;

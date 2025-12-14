const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminAuthController');

const { validationRules, validate } = require('../validations/user');
const { auth ,isAdmin } = require('../middilewares/auth');
const upload = require("../utils/multer")

// Public routes
router.post(
  '/register',
  validationRules.register,
  validate,
  adminController.register
);

// router.post(
//   '/login',
//   validationRules.login,
//   validate,
//   adminController.login
// );

router.post(
  '/send-otp',
  validationRules.sendOTP,
  validate,
  adminController.sendOTP
);

router.post(
  '/verify-otp',
  validationRules.verifyOTP,
  validate,
  adminController.verifyOTP
);
router.post(
  '/resend-otp',
  validationRules.sendOTP,
  validate,
  adminController.resendOtp
);

// Protected routes
router.get('/profile', auth,isAdmin, adminController.getProfile);

router.put(
  '/profile/update',
  auth,isAdmin,
  validationRules.updateProfile,
  validate,
  upload.single("picture"),
  adminController.updateProfile
);

// router.put(
//   '/change-password',
//   auth,
//   validationRules.changePassword,
//   validate,
//   adminController.changePassword
// );



module.exports = router;
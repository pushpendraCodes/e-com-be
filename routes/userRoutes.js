const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

const { validationRules, validate } = require('../validations/user');
const { auth ,isAdmin } = require('../middilewares/auth');
const upload = require("../utils/multer")

// Public routes
router.post(
  '/register',
  validationRules.register,
  validate,
  userController.register
);

// router.post(
//   '/login',
//   validationRules.login,
//   validate,
//   userController.login
// );

router.post(
  '/send-otp',
  validationRules.sendOTP,
  validate,
  userController.sendOTP
);

router.post(
  '/verify-otp',
  validationRules.verifyOTP,
  validate,
  userController.verifyOTP
);
router.post(
  '/resend-otp',
  validationRules.sendOTP,
  validate,
  userController.resendOtp
);

// Protected routes
router.get('/profile', auth, userController.getProfile);

router.put(
  '/profile/update',
  auth,
  validationRules.updateProfile,
  validate,
  upload.single("picture"),
  userController.updateProfile
);

// router.put(
//   '/change-password',
//   auth,
//   validationRules.changePassword,
//   validate,
//   userController.changePassword
// );

router.post(
  '/addresses/add',
  auth,
  validationRules.addAddress,
  validate,
  userController.addAddress
);
router.put(
  '/addresses/:addressId',
  auth,
  validationRules.updateAddress,
  validate,
  userController.updateAddress
);

router.get('/addresses/getall', auth, userController.getAddresses);

router.delete('/addresses/:addressId', auth, userController.deleteAddress);

// Admin routes
router.get('/all', auth, isAdmin, userController.getAllUsers);

module.exports = router;
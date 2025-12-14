const { body, validationResult } = require('express-validator');

// Validation rules
const validationRules = {
  register: [
    body('mobile')
      .matches(/^[0-9]{10}$/)
      .withMessage('Mobile number must be 10 digits'),
    body('name')
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters'),
    body("role")
      .trim()
      .isIn(["super_admin", "admin"])
      .withMessage("Invalid role. Allowed values: super_admin, admin")


    ,
    // body('password')
    //   .isLength({ min: 6 })
    //   .withMessage('Password must be at least 6 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format')
  ],

  login: [
    body('mobile')
      .matches(/^[0-9]{10}$/)
      .withMessage('Mobile number must be 10 digits'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  sendOTP: [
    body('mobile')
      .matches(/^[0-9]{10}$/)
      .withMessage('Mobile number must be 10 digits')
  ],

  verifyOTP: [
    body('mobile')
      .matches(/^[0-9]{10}$/)
      .withMessage('Mobile number must be 10 digits'),
    body('otp')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be 6 digits')
  ],

  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format'),
    body('mobile').optional()
      .matches(/^[0-9]{10}$/)
      .withMessage('Mobile number must be 10 digits'),
  ],

  changePassword: [
    body('oldPassword')
      .notEmpty()
      .withMessage('Old password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters')
  ],

  addAddress: [
    body('type')
      .optional()
      .isIn(['home', 'work', 'other'])
      .withMessage('Type must be home, work, or other'),

    body('name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters'),

    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9]{10}$/)
      .withMessage('Phone must be a valid 10-digit number'),

    body('street')
      .notEmpty()
      .trim()
      .withMessage('Street is required'),

    body('landmark')
      .optional()
      .trim(),

    body('city')
      .notEmpty()
      .trim()
      .withMessage('City is required'),

    body('state')
      .notEmpty()
      .trim()
      .withMessage('State is required'),

    body('country')
      .optional()
      .trim()
      .default('India'),

    body('pincode')
      .notEmpty()
      .matches(/^[0-9]{6}$/)
      .withMessage('Pincode must be 6 digits')
  ],
  updateAddress: [
    body('type')
      .optional()
      .isIn(['home', 'work', 'other'])
      .withMessage('Type must be home, work, or other'),

    body('name')
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage('Name must be at least 2 characters'),

    body('phone')
      .optional()
      .trim()
      .matches(/^[0-9]{10}$/)
      .withMessage('Phone must be a valid 10-digit number'),

    body('street')
      .notEmpty()
      .trim()
      .withMessage('Street is required'),

    body('landmark')
      .optional()
      .trim(),

    body('city')
      .notEmpty()
      .trim()
      .withMessage('City is required'),

    body('state')
      .notEmpty()
      .trim()
      .withMessage('State is required'),

    body('country')
      .optional()
      .trim()
      .default('India'),

    body('pincode')
      .notEmpty()
      .matches(/^[0-9]{6}$/)
      .withMessage('Pincode must be 6 digits')
  ]


};

// Validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

module.exports = { validationRules, validate };
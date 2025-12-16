const User = require('../models/User');
const jwt = require('jsonwebtoken');
const uploadToCloudinary = require("../utils/cloudinary")
// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign(
    { userId, role: "customer" },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '30d' }
  );
};

// Send OTP (mock function - integrate with SMS service)
const sendOTPViaSMS = async (mobile, otp) => {
  // Integrate with SMS service like Twilio, MSG91, etc.
  console.log(`Sending OTP ${otp} to ${mobile}`);
  return true;
};

class UserController {
  // Register new user
  async register(req, res) {
    try {
      const { mobile, name, password, email } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ mobile });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Mobile number already registered'
        });
      }

      // Create user
      const user = new User({ mobile, name, password, email });

      // Generate and send OTP
      const otp = user.generateOTP();
      await user.save();

      await sendOTPViaSMS(mobile, otp);

      res.status(201).json({
        success: true,
        message: 'Registration successful. OTP sent to your mobile',
        data: {
          userId: user._id,
          mobile: user.mobile
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: error.message
      });
    }
  }

  // Send OTP for login
  async sendOTP(req, res) {
    try {
      const { mobile } = req.body;

      if (!mobile) {
        return res.status(400).json({
          success: false,
          message: "mobile number is required"
        });
      }

      // Check if user exists
      let user = await User.findOne({ mobile });

      // If user does not exist, create account
      if (!user) {
        user = new User({
          mobile,
          isVerified: false
        });
      }


      // Generate 6-digit OTP
      const otp = user.generateOTP()

      // Save OTP + expiry (5 minutes)
      user.otp = otp;
      user.otpExpires = Date.now() + 5 * 60 * 1000;
      await user.save();

      // Send OTP via SMS / MSG91
      // await sendOtp(mobile, otp);

      return res.status(200).json({
        success: true, otp,
        message: "OTP sent successfully",
        mobile,
      });

    } catch (err) {
      console.error("OTP Login Error:", err);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error"
      });
    }
  }

  // Verify OTP and login
  async verifyOTP(req, res) {
    try {
      const { mobile, otp } = req.body;

      let user = await User.findOne({ mobile });

      // If NOT found → Create new user
      const isNewUser = !user;
      if (!user) {
        user = new User({
          mobile,
          isVerified: false
        });
      }
      console.log(otp)
      // Validate OTP
      if (!user.verifyOTP(otp)) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired OTP"
        });
      }

      // Mark verified
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      const token = generateToken(user._id);

      return res.json({
        success: true,
        message: isNewUser ? "Account created successfully" : "Login successful",
        data: {
          token,
          user: {
            id: user._id,
            mobile: user.mobile,
            name: user.name || null,
            email: user.email || null,
            role: "customer",
            isVerified: true
          }
        }
      });

    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Verification failed",
        error: error.message
      });
    }
  }


  async resendOtp(req, res) {
    try {
      const { mobile } = req.body;

      if (!mobile || !/^\d{10}$/.test(mobile)) {
        return res.status(400).json({
          success: false,
          message: "Valid 10-digit mobile number is required",
        });
      }

      // Find customer
      const customer = await User.findOne({ mobile });
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: "customer not found with this mobile number",
        });
      }

      const now = new Date();

      // Prevent frequent OTP resends
      if (customer.otpExpires && customer.otpExpires > new Date(now.getTime() - 60 * 1000)) {
        // if last OTP sent less than 60 seconds ago
        return res.status(429).json({
          success: false,
          message: "Please wait at least 1 minute before requesting a new OTP.",
        });
      }

      // ✅ (Optional) Daily resend limit check
      if (!customer.otpResendCount || !customer.otpLastSentDate) {
        customer.otpResendCount = 0;
        customer.otpLastSentDate = now;
      } else {
        const lastSentDate = new Date(customer.otpLastSentDate);
        const sameDay =
          lastSentDate.getDate() === now.getDate() &&
          lastSentDate.getMonth() === now.getMonth() &&
          lastSentDate.getFullYear() === now.getFullYear();

        if (!sameDay) {
          // reset counter for new day
          customer.otpResendCount = 0;
        }
      }

      if (customer.otpResendCount >= 5) {
        return res.status(429).json({
          success: false,
          message: "You have reached the maximum OTP resend limit for today.",
        });
      }

      // ✅ Generate new OTP
      // 2. Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(now.getTime() + 5 * 60 * 1000); // 5 min validity

      // Save and update counters
      customer.otp = otp;
      customer.otpExpires = otpExpires;
      customer.otpVerified = false;
      customer.otpResendCount = (customer.otpResendCount || 0) + 1;
      customer.otpLastSentDate = now;

      await customer.save();

      // Send OTP via SMS/Email
      // await sendOtpTocustomer(customer.mobile, otp);

      return res.status(200).json({
        success: true,
        message: "OTP resent successfully",
        nextRequestAfter: "1 minute",
        otpExpires,
        otp,
        resendCount: customer.otpResendCount,
      });
    } catch (error) {
      console.error("Error resending customer OTP:", error);
      res.status(500).json({
        success: false,
        message: "Server error while resending OTP",
      });
    }
  }

  // Login with password
  // async login(req, res) {
  //   try {
  //     const { mobile, password } = req.body;

  //     const user = await User.findOne({ mobile });
  //     if (!user) {
  //       return res.status(401).json({
  //         success: false,
  //         message: 'Invalid credentials'
  //       });
  //     }

  //     const isPasswordValid = await user.comparePassword(password);
  //     if (!isPasswordValid) {
  //       return res.status(401).json({
  //         success: false,
  //         message: 'Invalid credentials'
  //       });
  //     }

  //     const token = generateToken(user._id);

  //     res.json({
  //       success: true,
  //       message: 'Login successful',
  //       data: {
  //         token,
  //         user: {
  //           id: user._id,
  //           mobile: user.mobile,
  //           name: user.name,
  //           email: user.email,
  //           role: user.role,
  //           isVerified: user.isVerified
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     res.status(500).json({
  //       success: false,
  //       message: 'Login failed',
  //       error: error.message
  //     });
  //   }
  // }

  // Get current user profile
  async getProfile(req, res) {
    try {
      res.json({
        success: true,
        data: {
          user: req.user
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
        error: error.message
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { name, email, mobile ,aadharNumber} = req.body;
      const updates = {};

      // Build updates object (validation already done by middleware)
      if (name) updates.name = name.trim();
      if (email) updates.email = email.trim().toLowerCase();
      if (mobile) updates.mobile = mobile;
      if (aadharNumber) updates.aadharNumber = aadharNumber;

      // Check for duplicate email
      if (email) {
        const existingUser = await User.findOne({
          email: email.trim().toLowerCase(),
          _id: { $ne: req.userId }
        });

        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: 'Email already in use'
          });
        }
      }

      // Handle profile picture upload
      if (req.file) {
        try {
          const upload = await uploadToCloudinary(req.file.path, req.file.originalname);
          const picture = upload?.secure_url || upload?.url;

          if (!picture) {
            return res.status(500).json({
              success: false,
              message: 'Failed to upload profile picture'
            });
          }

          updates.profilePicture = picture;

          // Optional: Clean up old profile picture
          // const user = await User.findById(req.userId);
          // if (user?.profilePicture) {
          //   await deleteFromCloudinary(extractPublicId(user.profilePicture));
          // }
        } catch (uploadError) {
          console.error('Cloudinary upload error:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload profile picture',
            error: uploadError.message
          });
        }
      }

      // Check if there are any updates
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields provided for update'
        });
      }

      // Update user
      const user = await User.findByIdAndUpdate(
        req.userId,
        { $set: updates },
        {
          new: true,
          runValidators: true
        }
      ).select('-password -otp -__v');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });

    } catch (error) {
      console.error('Profile update error:', error);

      // Handle mongoose duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(409).json({
          success: false,
          message: `${field} already exists`
        });
      }

      // Handle mongoose validation errors
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: Object.values(error.errors).map(e => e.message)
        });
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
  // Change password
  // async changePassword(req, res) {
  //   try {
  //     const { oldPassword, newPassword } = req.body;

  //     const user = await User.findById(req.userId);
  //     const isPasswordValid = await user.comparePassword(oldPassword);

  //     if (!isPasswordValid) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Current password is incorrect'
  //       });
  //     }

  //     user.password = newPassword;
  //     await user.save();

  //     res.json({
  //       success: true,
  //       message: 'Password changed successfully'
  //     });
  //   } catch (error) {
  //     res.status(500).json({
  //       success: false,
  //       message: 'Failed to change password',
  //       error: error.message
  //     });
  //   }
  // }

  // Add address
  async addAddress(req, res) {
    try {
      const userId = req.userId;
      const { type, name, phone, street, city, state, pincode, landmark, isDefault } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Optional: Prevent unlimited addresses
      if (user.addresses.length >= 10) {
        return res.status(400).json({
          success: false,
          message: "Maximum 10 addresses allowed",
        });
      }

      // Reset other default addresses if this is default
      if (isDefault) {
        user.addresses = user.addresses.map(addr => ({
          ...addr.toObject(),
          isDefault: false,
        }));
      }

      const newAddress = {
        type,
        name,
        phone,
        street,
        city,
        state,
        pincode,
        landmark,
        isDefault: isDefault || false,
        country: req.body.country || "India"
      };

      user.addresses.push(newAddress);
      await user.save();

      res.status(201).json({
        success: true,
        message: "Address added successfully",
        address: user.addresses[user.addresses.length - 1] // Last added
      });

    } catch (error) {
      console.error("Add Address Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add address",
        error: error.message,
      });
    }
  }

  // update address
  // Update Address Controller
  async updateAddress(req, res) {
    try {
      const userId = req.userId;
      const { addressId } = req.params;
      const updateData = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
      if (addressIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Address not found"
        });
      }

      // If marked default, reset other defaults
      if (updateData.isDefault === true) {
        user.addresses.forEach(addr => {
          addr.isDefault = false;
        });
      }

      // Update only provided fields
      Object.keys(updateData).forEach(key => {
        user.addresses[addressIndex][key] = updateData[key];
      });

      await user.save();

      return res.json({
        success: true,
        message: "Address updated successfully",
        address: user.addresses[addressIndex]
      });

    } catch (error) {
      console.error("Update Address Error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update address",
        error: error.message
      });
    }
  }

  // Get all addresses
  async getAddresses(req, res) {
    try {
      const user = await User.findById(req.userId).select('addresses');

      res.json({
        success: true,
        data: { addresses: user.addresses }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch addresses',
        error: error.message
      });
    }
  }

  // Delete address
  async deleteAddress(req, res) {
    try {
      const { addressId } = req.params;

      const user = await User.findById(req.userId);
      user.addresses = user.addresses.filter(
        addr => addr._id.toString() !== addressId
      );
      await user.save();

      res.json({
        success: true,
        message: 'Address deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete address',
        error: error.message
      });
    }
  }

  // Get all users (Admin only)
  async getAllUsers(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const query = {};

      if (search) {
        query.$or = [
          { name: new RegExp(search, 'i') },
          { mobile: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') }
        ];
      }

      const users = await User.find(query)
        .select('-password -otp')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      const count = await User.countDocuments(query);

      res.json({
        success: true,
        data: {
          users,
          totalPages: Math.ceil(count / limit),
          currentPage: page,
          total: count
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: error.message
      });
    }
  }
}

module.exports = new UserController();
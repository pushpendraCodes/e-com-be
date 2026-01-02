const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const uploadToCloudinary = require("../utils/cloudinary")
// Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign(
        { userId, role: "admin" },
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

class adminController {
    // Register new user
  async register(req, res) {
    try {
        const { mobile, name, email, role } = req.body;

        // Check if user exists
        const existingUser = await Admin.findOne({ mobile });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Mobile number already registered",
            });
        }

        // Validate role manually (extra safety)
        const allowedRoles = ["super_admin", "admin"];
        if (role && !allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid role. Allowed roles: superadmin, admin, ",
            });
        }

        // Create new admin user
        const user = new Admin({
            mobile,
            name,
            email,
            role,
        });

        await user.save(); // missing in your code

        return res.status(201).json({
            success: true,
            message: "Registration successful",
            data: user,
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Registration failed",
            error: error.message,
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
            let admin = await Admin.findOne({ mobile });
            console.log(admin,"user")

            if (!admin) {
                res.status(401).json({ success: false, message: "Admin Not Found" })
            }

            // Generate 6-digit OTP
            const otp = admin.generateOTP()

            // Save OTP + expiry (5 minutes)
            admin.otp = otp;
            admin.otpExpires = Date.now() + 5 * 60 * 1000;
            await admin.save();

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

            let user = await Admin.findOne({ mobile });

            if (!user) {
                res.status(401).json({ success: false, message: "Admin Not Found" })
            }


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
                message:  "Login successful",
                data: {
                    token,
                    user: {
                        id: user._id,
                        mobile: user.mobile,
                        name: user.name || null,
                        email: user.email || null,
                        role: user.role,
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

    const admin = await Admin.findOne({ mobile });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found with this mobile number",
      });
    }

    const now = new Date();

    // ✅ 1. COOLDOWN CHECK (60 seconds)
    if (admin.otpSentAt) {
      const diffInSeconds = (now - admin.otpSentAt) / 1000;

      if (diffInSeconds < 60) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${Math.ceil(60 - diffInSeconds)} seconds before requesting a new OTP.`,
        });
      }
    }

    // ✅ 2. DAILY RESEND LIMIT
    const today = now.toISOString().slice(0, 10);

    if (admin.otpLastSentDate?.toISOString().slice(0, 10) !== today) {
      admin.otpResendCount = 0;
    }

    if (admin.otpResendCount >= 5) {
      return res.status(429).json({
        success: false,
        message: "You have reached the maximum OTP resend limit for today.",
      });
    }

    // ✅ 3. GENERATE OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    admin.otp = otp;
    admin.otpExpires = new Date(now.getTime() + 5 * 60 * 1000); // 5 min
    admin.otpSentAt = now;
    admin.otpVerified = false;
    admin.otpResendCount += 1;
    admin.otpLastSentDate = now;

    await admin.save();

    // await sendOtpToAdmin(admin.mobile, otp);

    return res.status(200).json({
      success: true,
      otp,
      message: "OTP resent successfully",
      resendCount: admin.otpResendCount,
      otpExpires: admin.otpExpires,
    });

  } catch (error) {
    console.error("Error resending OTP:", error);
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
            const { name, email, mobile } = req.body;
            const updates = {};

            // Build updates object (validation already done by middleware)
            if (name) updates.name = name.trim();
            if (email) updates.email = email.trim().toLowerCase();
            if (mobile) updates.mobile = mobile;

            // Check for duplicate email
            if (mobile) {
                const existingUser = await Admin.findOne({
                    mobile,
                    _id: { $ne: req.userId }
                });

                if (existingUser) {
                    return res.status(409).json({
                        success: false,
                        message: 'Phone Number in use'
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
            const user = await Admin.findByIdAndUpdate(
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

 
}

module.exports = new adminController();
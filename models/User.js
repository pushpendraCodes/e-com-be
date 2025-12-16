const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  mobile: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    match: /^[0-9]{10}$/
  },
  name: {
    type: String,

    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true
  },
  profilePicture: {
    type: String,
  }
  ,
aadharNumber: {
  type: String,
  trim: true
}

  ,
  carts: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        // required: true,
      },
      quantity: {
        type: Number,
        default: 1,
        min: 1,
      },
      variantId: {
        type: mongoose.Schema.Types.ObjectId, // no ref since no model
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }
  ],

  wishlist: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },

      addedAt: {
        type: Date,
        default: Date.now,
      }
    }
  ],
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: { type: Number },
  otpExpires: { type: Date },
  otpResendCount: { type: Number, default: 0 },
  otpLastSentDate: { type: Date },
  otpVerified: { type: Boolean, default: false },
  addresses: [
    {
      type: {
        type: String,
        enum: ["home", "work", "other"],
        default: "home",
        trim: true,
      },
      name: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
        match: [/^[0-9]{10}$/, "Invalid phone number"],
      },
      street: {
        type: String,
        required: true,
        trim: true,
      },
      landmark: {
        type: String,
        trim: true,
      },
      pincode: {
        type: String,
        required: true,
        trim: true,
        match: [/^\d{5,6}$/, "Invalid pincode"],
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      state: {
        type: String,
        required: true,
        trim: true,
      },
      country: {
        type: String,
        default: "India",
        trim: true,
      },
      isDefault: {
        type: Boolean,
        default: false,
      },

      // ⭐ Optional but powerful for location-based service mapping
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },

      createdAt: {
        type: Date,
        default: Date.now,
      },
    }
  ],


  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Hash password before saving
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// // Compare password method
// userSchema.methods.comparePassword = async function(password) {
//   return await bcrypt.compare(password, this.password);
// };

userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
  return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function (otp) {
  if (!this.otp || !this.otpExpires) return false;
  if (new Date() > this.otpExpires) return false;
  return this.otp === otp;
};


module.exports = mongoose.model('User', userSchema);
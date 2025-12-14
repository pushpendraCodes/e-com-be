const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
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
    , content: {
        termsCondition: {
            type: String,
            default: ''
        },
        privacyPolicy: { // Fixed typo from "privacyPoilcy"
            type: String,
            default: ''
        }
    },

    media: {
        banners: [{
            url: { type: String, required: true },
            title: String,
            order: { type: Number, default: 0 },
            isActive: { type: Boolean, default: true },
            uploadedAt: { type: Date, default: Date.now }
        }],
        sliders: [{
            url: { type: String, required: true },
            title: String,
            order: { type: Number, default: 0 },
            isActive: { type: Boolean, default: true },
            uploadedAt: { type: Date, default: Date.now }
        }],
        popupAds: [{
            url: { type: String, required: true },
            title: String,
            frequency: { type: String, enum: ['once', 'daily', 'always'], default: 'once' },
            isActive: { type: Boolean, default: true },
            startDate: Date,
            endDate: Date,
            uploadedAt: { type: Date, default: Date.now }
        }]
    },
    otp: { type: Number },
    otpExpires: { type: Date },
    otpResendCount: { type: Number, default: 0 },
    otpLastSentDate: { type: Date },
    otpVerified: { type: Boolean, default: false },

    role: {
        type: String,
        enum: ['super_admin', 'admin'],
        default: 'admin'
    }
    ,
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});


adminSchema.methods.generateOTP = function () {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otp = otp;
    this.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    return otp;
};

// Verify OTP
adminSchema.methods.verifyOTP = function (otp) {
    if (!this.otp || !this.otpExpires) return false;
    if (new Date() > this.otpExpires) return false;
    return this.otp === otp;
};

adminSchema.pre('save', async function () {
    if (this.role === 'super_admin' && this.isNew) {
        const existingSuperAdmin = await this.constructor.findOne({ role: 'super_admin' });
        if (existingSuperAdmin) {
            throw new Error('A super admin already exists');
        }
    }
});

module.exports = mongoose.model('Admin', adminSchema);
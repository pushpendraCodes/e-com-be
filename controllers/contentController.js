const Admin = require('../models/Admin');
const uploadToCloudinary = require('../utils/cloudinary');

const cloudinary = require('cloudinary').v2;
// Get Terms & Conditions
exports.getTerms = async (req, res) => {
    try {
        const admin = await Admin.findOne({ role: 'super_admin' }).select('content.termsCondition');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Terms and conditions not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                termsCondition: admin.content.termsCondition || ''
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching terms and conditions',
            error: error.message
        });
    }
};

// Update Terms & Conditions
exports.updateTerms = async (req, res) => {
    try {
        const { termsCondition } = req.body;

        if (!termsCondition || termsCondition.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Terms and conditions content is required'
            });
        }

        const admin = await Admin.findOneAndUpdate(
            { role: 'super_admin' },
            { 'content.termsCondition': termsCondition },
            { new: true, runValidators: true }
        ).select('content.termsCondition');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Terms and conditions updated successfully',
            data: {
                termsCondition: admin.content.termsCondition
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating terms and conditions',
            error: error.message
        });
    }
};

// Get Privacy Policy
exports.getPrivacy = async (req, res) => {
    try {
        const admin = await Admin.findOne({ role: 'super_admin' }).select('content.privacyPolicy');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Privacy policy not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                privacyPolicy: admin.content.privacyPolicy || ''
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching privacy policy',
            error: error.message
        });
    }
};

// Update Privacy Policy
exports.updatePrivacy = async (req, res) => {
    try {
        const { privacyPolicy } = req.body;

        if (!privacyPolicy || privacyPolicy.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Privacy policy content is required'
            });
        }

        const admin = await Admin.findOneAndUpdate(
            { role: 'super_admin' },
            { 'content.privacyPolicy': privacyPolicy },
            { new: true, runValidators: true }
        ).select('content.privacyPolicy');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Privacy policy updated successfully',
            data: {
                privacyPolicy: admin.content.privacyPolicy
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating privacy policy',
            error: error.message
        });
    }
};

// ==================== CONTROLLERS/mediaController.js ====================

// const cloudinary = require('../utils/cloudinary');

// Helper function to extract public_id from Cloudinary URL
const getPublicIdFromUrl = (url) => {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const publicId = filename.split('.')[0];
    return `admin-media/${publicId}`;
};

// ========== BANNER CONTROLLERS ==========

// Get All Banners
exports.getBanners = async (req, res) => {
    try {
        const admin = await Admin.findOne({ role: 'super_admin' }).select('media.banners');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Banners not found'
            });
        }

        const banners = admin.media.banners.sort((a, b) => a.order - b.order);

        res.status(200).json({
            success: true,
            count: banners.length,
            data: banners
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching banners',
            error: error.message
        });
    }
};

// Add Banner
exports.addBanner = async (req, res) => {
    try {
        // Validate files
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one banner image is required'
            });
        }

        // Parse banner metadata
        let bannerMeta = [];
        if (req.body.banner) {
            bannerMeta = JSON.parse(req.body.banner); // array
        }

        if (!Array.isArray(bannerMeta)) {
            return res.status(400).json({
                success: false,
                message: 'Banner data must be an array'
            });
        }

        // Upload banners
        const uploadPromises = req.files.map(async (file, index) => {
            const upload = await uploadToCloudinary(file.path, file.originalname);

            return {
                url: upload.secure_url || upload.url,
                title: bannerMeta[index]?.title || '',
                order: bannerMeta[index]?.order || 0,
                isActive:
                    bannerMeta[index]?.isActive !== undefined
                        ? bannerMeta[index].isActive
                        : true,
                uploadedAt: new Date()
            };
        });

        const newBanners = await Promise.all(uploadPromises);

        if (!newBanners.length) {
            return res.status(500).json({
                success: false,
                message: 'Failed to upload banner images'
            });
        }

        // Save to admin media
        const admin = await Admin.findOneAndUpdate(
            { role: 'super_admin' },
            { $push: { 'media.banners': { $each: newBanners } } },
            { new: true, runValidators: true }
        ).select('media.banners');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Banner(s) added successfully',
            data: newBanners
        });
    } catch (error) {
        console.error('Add banner error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding banner',
            error: error.message
        });
    }
};


// Update Banner
exports.updateBanner = async (req, res) => {
    try {
        const { bannerId } = req.params;
        const { title, order, isActive } = req.body;

        const admin = await Admin.findOne({ role: 'super_admin' });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        const banner = admin.media.banners.id(bannerId);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        // Update fields
        if (title !== undefined) banner.title = title;
        if (order !== undefined) banner.order = Number(order);
        if (isActive !== undefined) {
            banner.isActive = isActive === 'true' || isActive === true;
        }

        // Update image if new file uploaded
        if (req.file) {
            try {
                // Delete old image
                if (banner.url) {
                    const publicId = getPublicIdFromUrl(banner.url);
                    await cloudinary.uploader.destroy(publicId);
                }
                console.log(req.file)
                // Upload new image
                const upload = await uploadToCloudinary(
                    req.file.path,
                    req.file.originalname
                );

                banner.url = upload.secure_url || upload.url;
                banner.uploadedAt = new Date();
            } catch (imageError) {
                console.error('Banner image update error:', imageError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update banner image',
                    error: imageError.message
                });
            }
        }

        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Banner updated successfully',
            data: banner
        });
    } catch (error) {
        console.error('Update banner error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating banner',
            error: error.message
        });
    }
};


// Delete Banner
exports.deleteBanner = async (req, res) => {
    try {
        const { bannerId } = req.params;

        const admin = await Admin.findOne({ role: 'super_admin' });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        const banner = admin.media.banners.id(bannerId);

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: 'Banner not found'
            });
        }

        // Delete image from Cloudinary
        try {
            const publicId = getPublicIdFromUrl(banner.url);
            await cloudinary.uploader.destroy(publicId);
        } catch (err) {
            console.error('Error deleting image from Cloudinary:', err);
        }

        // Remove banner from array
        admin.media.banners.pull(bannerId);
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Banner deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting banner',
            error: error.message
        });
    }
};

// ========== SLIDER CONTROLLERS ==========

// Get All Sliders
exports.getSliders = async (req, res) => {
    try {
        const admin = await Admin.findOne({ role: 'super_admin' }).select('media.sliders');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Sliders not found'
            });
        }

        const sliders = admin.media.sliders.sort((a, b) => a.order - b.order);

        res.status(200).json({
            success: true,
            count: sliders.length,
            data: sliders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching sliders',
            error: error.message
        });
    }
};

// Add Slider
exports.addSlider = async (req, res) => {
    try {
        // Validate files
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one slider image is required'
            });
        }

        // Parse banner metadata
        let sliderMeta = [];
        if (req.body.slider) {
            sliderMeta = JSON.parse(req.body.slider); // array
        }

        if (!Array.isArray(sliderMeta)) {
            return res.status(400).json({
                success: false,
                message: 'slider data must be an array'
            });
        }

        // Upload banners
        const uploadPromises = req.files.map(async (file, index) => {
            const upload = await uploadToCloudinary(file.path, file.originalname);

            return {
                url: upload.secure_url || upload.url,
                title: sliderMeta[index]?.title || '',
                order: sliderMeta[index]?.order || 0,
                isActive:
                    sliderMeta[index]?.isActive !== undefined
                        ? sliderMeta[index].isActive
                        : true,
                uploadedAt: new Date()
            };
        });

        const newSliders = await Promise.all(uploadPromises);

        if (!newSliders.length) {
            return res.status(500).json({
                success: false,
                message: 'Failed to upload banner images'
            });
        }

        // Save to admin media
        const admin = await Admin.findOneAndUpdate(
            { role: 'super_admin' },
            { $push: { 'media.sliders': { $each: newSliders } } },
            { new: true, runValidators: true }
        ).select('media.sliders');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.status(201).json({
            success: true,
            message: 'sliders(s) added successfully',
            data: newSliders
        });
    } catch (error) {
        console.error('Add sliders error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding sliders',
            error: error.message
        });
    }
};

// Update Slider
exports.updateSlider = async (req, res) => {
    try {
        const { sliderId } = req.params;
        const { title, order, isActive } = req.body;

        const admin = await Admin.findOne({ role: 'super_admin' });
        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        const slider = admin.media.sliders.id(sliderId);
        if (!slider) {
            return res.status(404).json({
                success: false,
                message: 'slider not found'
            });
        }

        // Update fields
        if (title !== undefined) slider.title = title;
        if (order !== undefined) slider.order = Number(order);
        if (isActive !== undefined) {
            slider.isActive = isActive === 'true' || isActive === true;
        }

        // Update image if new file uploaded
        if (req.file) {
            try {
                // Delete old image
                if (slider.url) {
                    const publicId = getPublicIdFromUrl(slider.url);
                    await cloudinary.uploader.destroy(publicId);
                }

                // Upload new image
                const upload = await uploadToCloudinary(
                    req.file.path,
                    req.file.originalname
                );

                slider.url = upload.secure_url || upload.url;
                slider.uploadedAt = new Date();
            } catch (imageError) {
                console.error('slider image update error:', imageError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update slider image',
                    error: imageError.message
                });
            }
        }

        await admin.save();

        res.status(200).json({
            success: true,
            message: 'slider updated successfully',
            data: slider
        });
    } catch (error) {
        console.error('Update slider error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating slider',
            error: error.message
        });
    }
};

// Delete Slider
exports.deleteSlider = async (req, res) => {
    try {
        const { sliderId } = req.params;

        const admin = await Admin.findOne({ role: 'super_admin' });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        const slider = admin.media.sliders.id(sliderId);

        if (!slider) {
            return res.status(404).json({
                success: false,
                message: 'Slider not found'
            });
        }

        try {
            const publicId = getPublicIdFromUrl(slider.url);
            await cloudinary.uploader.destroy(publicId);
        } catch (err) {
            console.error('Error deleting image from Cloudinary:', err);
        }

        admin.media.sliders.pull(sliderId);
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Slider deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting slider',
            error: error.message
        });
    }
};

// ========== POPUP AD CONTROLLERS ==========

// Get All Popup Ads
exports.getPopupAds = async (req, res) => {
    try {
        const admin = await Admin.findOne({ role: 'super_admin' }).select('media.popupAds');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Popup ads not found'
            });
        }

        res.status(200).json({
            success: true,
            count: admin.media.popupAds.length,
            data: admin.media.popupAds
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching popup ads',
            error: error.message
        });
    }
};

// Add Popup Ad
exports.addPopupAd = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Popup ad image is required'
            });
        }

        const { title, frequency, isActive, startDate, endDate } = req.body;

        const newPopupAd = {
            url: req.file.path,
            title: title || '',
            frequency: frequency || 'once',
            isActive: isActive !== undefined ? isActive === 'true' : true,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            uploadedAt: new Date()
        };

        const admin = await Admin.findOneAndUpdate(
            { role: 'super_admin' },
            { $push: { 'media.popupAds': newPopupAd } },
            { new: true, runValidators: true }
        ).select('media.popupAds');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        const addedPopupAd = admin.media.popupAds[admin.media.popupAds.length - 1];

        res.status(201).json({
            success: true,
            message: 'Popup ad added successfully',
            data: addedPopupAd
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error adding popup ad',
            error: error.message
        });
    }
};

// Update Popup Ad
exports.updatePopupAd = async (req, res) => {
    try {
        const { popupAdId } = req.params;
        const { title, frequency, isActive, startDate, endDate } = req.body;

        const admin = await Admin.findOne({ role: 'super_admin' });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        const popupAd = admin.media.popupAds.id(popupAdId);

        if (!popupAd) {
            return res.status(404).json({
                success: false,
                message: 'Popup ad not found'
            });
        }

        if (title !== undefined) popupAd.title = title;
        if (frequency !== undefined) popupAd.frequency = frequency;
        if (isActive !== undefined) popupAd.isActive = isActive === 'true' || isActive === true;
        if (startDate !== undefined) popupAd.startDate = new Date(startDate);
        if (endDate !== undefined) popupAd.endDate = new Date(endDate);

        if (req.file) {
            try {
                const publicId = getPublicIdFromUrl(popupAd.url);
                await cloudinary.uploader.destroy(publicId);
            } catch (err) {
                console.error('Error deleting old image:', err);
            }
            popupAd.url = req.file.path;
        }

        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Popup ad updated successfully',
            data: popupAd
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating popup ad',
            error: error.message
        });
    }
};

// Delete Popup Ad
exports.deletePopupAd = async (req, res) => {
    try {
        const { popupAdId } = req.params;

        const admin = await Admin.findOne({ role: 'super_admin' });

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        const popupAd = admin.media.popupAds.id(popupAdId);

        if (!popupAd) {
            return res.status(404).json({
                success: false,
                message: 'Popup ad not found'
            });
        }

        try {
            const publicId = getPublicIdFromUrl(popupAd.url);
            await cloudinary.uploader.destroy(publicId);
        } catch (err) {
            console.error('Error deleting image from Cloudinary:', err);
        }

        admin.media.popupAds.pull(popupAdId);
        await admin.save();

        res.status(200).json({
            success: true,
            message: 'Popup ad deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting popup ad',
            error: error.message
        });
    }
};
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Category name is required'],
        trim: true,
        unique: true,
        minlength: [2, 'Category name must be at least 2 characters'],
        maxlength: [50, 'Category name cannot exceed 50 characters']
    },
    slug: {
        type: String,
        // required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    image: {
        type: String,
        default: null
    },
    
    // Parent category for hierarchical structure (e.g., T-Shirts under Casual Wear)
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    
    // Category level (0 = main, 1 = subcategory, etc.)
    level: {
        type: Number,
        default: 0,
        min: 0,
        max: 3
    },
    
    // Display settings
    displayOrder: {
        type: Number,
        default: 0
    },
    showOnHomepage: {
        type: Boolean,
        default: false
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    
    // SEO fields
    seo: {
        metaTitle: {
            type: String,
            maxlength: 60
        },
        metaDescription: {
            type: String,
            maxlength: 160
        },
        metaKeywords: [String]
    },
    
    // Status
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    
    // Stats
    productCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for performance
categorySchema.index({ slug: 1, isActive: 1 });
categorySchema.index({ parentCategory: 1, isActive: 1 });
categorySchema.index({ displayOrder: 1 });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parentCategory'
});

// Generate slug from name
categorySchema.pre("save", async function () {
    if (this.isModified("name") && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }
});


// Update product count when products are added/removed
categorySchema.statics.updateProductCount = async function(categoryId) {
    const Product = mongoose.model('Product');
    const count = await Product.countDocuments({ category: categoryId, isActive: true });
    await this.findByIdAndUpdate(categoryId, { productCount: count });
};

module.exports = mongoose.model('Category', categorySchema);
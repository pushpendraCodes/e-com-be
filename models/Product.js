const { default: mongoose } = require("mongoose");

const productSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true,
        minlength: [3, 'Product name must be at least 3 characters'],
        maxlength: [200, 'Product name cannot exceed 200 characters'],
        index: true
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
        required: [true, 'Product description is required'],
        trim: true,
        minlength: [10, 'Description must be at least 10 characters'],
        maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    shortDescription: {
        type: String,
        trim: true,
        maxlength: [500, 'Short description cannot exceed 500 characters']
    },
    
    // Category & Brand
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: [true, 'Category is required'],
        index: true
    },
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
    },
    brand: {
        type: String,
        trim: true,
        maxlength: [100, 'Brand name cannot exceed 100 characters']
    },
    
    // Pricing
    price: {
        original: {
            type: Number,
            required: [true, 'Original price is required'],
            min: [0, 'Price cannot be negative']
        },
        selling: {
            type: Number,
            required: [true, 'Selling price is required'],
            min: [0, 'Price cannot be negative']
        },
        discount: {
            type: Number,
            default: 0,
            min: [0, 'Discount cannot be negative'],
            max: [100, 'Discount cannot exceed 100%']
        }
    },
    
    // Images
    images: [{
        url: {
            type: String,
            required: true
        },
        alt: String,
        isPrimary: {
            type: Boolean,
            default: false
        },
        order: {
            type: Number,
            default: 0
        }
    }],
    
    // Variants (Size, Color, etc.)
    variants: [{
        size: {
            type: String,
            enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '28', '30', '32', '34', '36', '38', '40', '42', 'Free Size'],
            required: true
        },
        color: {
            type: String,
            trim: true
        },
        colorCode: {
            type: String, // Hex code like #FF5733
            trim: true
        },
        stock: {
            type: Number,
            required: true,
            min: [0, 'Stock cannot be negative'],
            default: 0
        },
        sku: {
            type: String,
            unique: true,
            sparse: true,
            trim: true
        },
        price: {
            type: Number,
            min: [0, 'Price cannot be negative']
        }
    }],
    
    // Inventory
    totalStock: {
        type: Number,
        required: true,
        min: [0, 'Stock cannot be negative'],
        default: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 10,
        min: 0
    },
    
    // Product Details
    specifications: {
        material: String,
        fabric: String,
        pattern: String,
        fit: {
            type: String,
            enum: ['Slim Fit', 'Regular Fit', 'Loose Fit', 'Athletic Fit', 'Relaxed Fit']
        },
        sleeves: {
            type: String,
            enum: ['Full Sleeve', 'Half Sleeve', 'Sleeveless', '3/4 Sleeve']
        },
        neckType: String,
        occasion: [String], // ['Casual', 'Formal', 'Party', 'Sports']
        season: {
            type: String,
            enum: ['Summer', 'Winter', 'Monsoon', 'All Season']
        },
        careInstructions: [String],
        countryOfOrigin: {
            type: String,
            default: 'India'
        }
    },
    
    // Dimensions (for shipping)
    dimensions: {
        length: Number, // in cm
        width: Number,  // in cm
        height: Number, // in cm
        weight: Number  // in grams
    },
    
    // SEO
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
    
    // Ratings & Reviews
    ratings: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    
    // Sales & Analytics
    sales: {
        totalSold: {
            type: Number,
            default: 0,
            min: 0
        },
        views: {
            type: Number,
            default: 0,
            min: 0
        },
        lastSoldAt: Date
    },
    
    // Status & Visibility
    status: {
        type: String,
        enum: ['draft', 'active', 'inactive', 'out_of_stock'],
        default: 'active',
        index: true
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isFeatured: {
        type: Boolean,
        default: false,
        index: true
    },
    isNewArrival: {
        type: Boolean,
        default: true
    },
    isBestseller: {
        type: Boolean,
        default: false
    },
    
    // Tags for filtering
    tags: [String],
    
    // Related products
    relatedProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    
    // Admin tracking
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ 'price.selling': 1 });
productSchema.index({ status: 1, isActive: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ 'ratings.average': -1 });

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
    if (this.totalStock === 0) return 'out_of_stock';
    if (this.totalStock <= this.lowStockThreshold) return 'low_stock';
    return 'in_stock';
});

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function() {
    if (this.price.original > 0) {
        return Math.round(((this.price.original - this.price.selling) / this.price.original) * 100);
    }
    return 0;
});

// Generate slug from name
productSchema.pre('save', async function () {
    // Generate slug only if name changed and slug not set
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') 
            + '-' + Date.now();
    }

    // Calculate total stock from variants
    if (Array.isArray(this.variants) && this.variants.length > 0) {
        this.totalStock = this.variants.reduce(
            (sum, v) => sum + (v.stock || 0),
            0
        );
    } else {
        this.totalStock = 0;
    }

    // Update product status based on stock
    if (this.totalStock === 0) {
        this.status = 'out_of_stock';
    } else if (this.status === 'out_of_stock') {
        this.status = 'active';
    }
    
    // NO next() call here
});

// Calculate discount percentage
productSchema.pre('save', async function() {
    if (this.price.original && this.price.selling) {
        this.price.discount = Math.round(
            ((this.price.original - this.price.selling) / this.price.original) * 100
        );
    }
    // NO next() call here
});

// Update category product count
productSchema.post('save', async function() {
    if (this.category) {
        await mongoose.model('Category').updateProductCount(this.category);
    }
});

productSchema.post('remove', async function() {
    if (this.category) {
        await mongoose.model('Category').updateProductCount(this.category);
    }
});

module.exports = mongoose.model('Product', productSchema);
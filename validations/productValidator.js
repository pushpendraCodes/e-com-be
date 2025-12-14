const Joi = require('joi');

// Custom validator for hex color code
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// Variant validation schema
const variantSchema = Joi.object({
    size: Joi.string()
        .valid('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '28', '30', '32', '34', '36', '38', '40', '42', 'Free Size')
        .required()
        .messages({
            'any.required': 'Variant size is required',
            'any.only': 'Invalid size value'
        }),
    color: Joi.string().trim().max(50),
    colorCode: Joi.string().pattern(hexColorRegex).trim().messages({
        'string.pattern.base': 'Color code must be a valid hex color (e.g., #FF5733)'
    }),
    stock: Joi.number().integer().min(0).required().messages({
        'number.min': 'Stock cannot be negative',
        'any.required': 'Stock is required for variant'
    }),
    sku: Joi.string().trim(),
    price: Joi.number().min(0).messages({
        'number.min': 'Price cannot be negative'
    })
});

// Image validation schema
const imageSchema = Joi.object({
    url: Joi.string().uri().required().messages({
        'string.uri': 'Image URL must be valid',
        'any.required': 'Image URL is required'
    }),
    alt: Joi.string().max(200),
    isPrimary: Joi.boolean().default(false),
    order: Joi.number().integer().min(0).default(0)
});

// Create product validation
const createProductValidation = Joi.object({
    name: Joi.string().trim().min(3).max(200).required().messages({
        'string.min': 'Product name must be at least 3 characters',
        'string.max': 'Product name cannot exceed 200 characters',
        'any.required': 'Product name is required'
    }),
    description: Joi.string().trim().min(10).max(5000).required().messages({
        'string.min': 'Description must be at least 10 characters',
        'string.max': 'Description cannot exceed 5000 characters',
        'any.required': 'Product description is required'
    }),
    shortDescription: Joi.string().trim().max(500),
    category: Joi.string().hex().length(24).required().messages({
        'any.required': 'Category is required',
        'string.hex': 'Invalid category ID',
        'string.length': 'Invalid category ID'
    }),
    subCategory: Joi.string().hex().length(24),
    brand: Joi.string().trim().max(100),
    price: Joi.object({
        original: Joi.number().min(0).required().messages({
            'number.min': 'Original price cannot be negative',
            'any.required': 'Original price is required'
        }),
        selling: Joi.number().min(0).required().messages({
            'number.min': 'Selling price cannot be negative',
            'any.required': 'Selling price is required'
        })
    }).required(),
    images: Joi.array().items(imageSchema).min(1).required().messages({
        'array.min': 'At least one product image is required',
        'any.required': 'Product images are required'
    }),
    variants: Joi.array().items(variantSchema).min(1).messages({
        'array.min': 'At least one variant is required'
    }),
    lowStockThreshold: Joi.number().integer().min(0).default(10),
    specifications: Joi.object({
        material: Joi.string().max(100),
        fabric: Joi.string().max(100),
        pattern: Joi.string().max(100),
        fit: Joi.string().valid('Slim Fit', 'Regular Fit', 'Loose Fit', 'Athletic Fit', 'Relaxed Fit'),
        sleeves: Joi.string().valid('Full Sleeve', 'Half Sleeve', 'Sleeveless', '3/4 Sleeve'),
        neckType: Joi.string().max(100),
        occasion: Joi.array().items(Joi.string().max(50)),
        season: Joi.string().valid('Summer', 'Winter', 'Monsoon', 'All Season'),
        careInstructions: Joi.array().items(Joi.string().max(200)),
        countryOfOrigin: Joi.string().max(100).default('India')
    }),
    dimensions: Joi.object({
        length: Joi.number().min(0),
        width: Joi.number().min(0),
        height: Joi.number().min(0),
        weight: Joi.number().min(0)
    }),
    seo: Joi.object({
        metaTitle: Joi.string().max(60),
        metaDescription: Joi.string().max(160),
        metaKeywords: Joi.array().items(Joi.string().max(50))
    }),
    status: Joi.string().valid('draft', 'active', 'inactive', 'out_of_stock').default('active'),
    isActive: Joi.boolean().default(true),
    isFeatured: Joi.boolean().default(false),
    isNewArrival: Joi.boolean().default(true),
    isBestseller: Joi.boolean().default(false),
    tags: Joi.array().items(Joi.string().max(50)),
    relatedProducts: Joi.array().items(Joi.string().hex().length(24))
});

// Update product validation
const updateProductValidation = Joi.object({
    name: Joi.string().trim().min(3).max(200),
    description: Joi.string().trim().min(10).max(5000),
    shortDescription: Joi.string().trim().max(500),
    category: Joi.string().hex().length(24),
    subCategory: Joi.string().hex().length(24),
    brand: Joi.string().trim().max(100),
    price: Joi.object({
        original: Joi.number().min(0),
        selling: Joi.number().min(0)
    }),
    images: Joi.array().items(imageSchema).min(1),
    variants: Joi.array().items(variantSchema),
    lowStockThreshold: Joi.number().integer().min(0),
    specifications: Joi.object({
        material: Joi.string().max(100),
        fabric: Joi.string().max(100),
        pattern: Joi.string().max(100),
        fit: Joi.string().valid('Slim Fit', 'Regular Fit', 'Loose Fit', 'Athletic Fit', 'Relaxed Fit'),
        sleeves: Joi.string().valid('Full Sleeve', 'Half Sleeve', 'Sleeveless', '3/4 Sleeve'),
        neckType: Joi.string().max(100),
        occasion: Joi.array().items(Joi.string().max(50)),
        season: Joi.string().valid('Summer', 'Winter', 'Monsoon', 'All Season'),
        careInstructions: Joi.array().items(Joi.string().max(200)),
        countryOfOrigin: Joi.string().max(100)
    }),
    dimensions: Joi.object({
        length: Joi.number().min(0),
        width: Joi.number().min(0),
        height: Joi.number().min(0),
        weight: Joi.number().min(0)
    }),
    seo: Joi.object({
        metaTitle: Joi.string().max(60),
        metaDescription: Joi.string().max(160),
        metaKeywords: Joi.array().items(Joi.string().max(50))
    }),
    status: Joi.string().valid('draft', 'active', 'inactive', 'out_of_stock'),
    isActive: Joi.boolean(),
    isFeatured: Joi.boolean(),
    isNewArrival: Joi.boolean(),
    isBestseller: Joi.boolean(),
    tags: Joi.array().items(Joi.string().max(50)),
    relatedProducts: Joi.array().items(Joi.string().hex().length(24))
}).min(1);

// Query validation for filtering/searching
const queryValidation = Joi.object({
   page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(12),
    search: Joi.string().trim().allow(''),
    category: Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    brand: Joi.string().trim(),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    status: Joi.string().valid('draft', 'active', 'inactive', 'out_of_stock'),
    isActive: Joi.boolean(),
    isFeatured: Joi.boolean(),
    isNewArrival: Joi.boolean(),
    isBestseller: Joi.boolean(),
    inStock: Joi.boolean(),
    sortBy: Joi.string().valid('createdAt', 'price', 'rating', 'sales', 'name', 'discount').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    tags: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
    ),
    
    // Rating filters
    minRating: Joi.number().min(0).max(5),
    maxRating: Joi.number().min(0).max(5),
    hasRatings: Joi.boolean(),
    
    // Specification filters
    material: Joi.string().trim(),
    fabric: Joi.string().trim(),
    pattern: Joi.string().trim(),
    fit: Joi.string().valid('Slim Fit', 'Regular Fit', 'Loose Fit', 'Athletic Fit', 'Relaxed Fit'),
    sleeves: Joi.string().valid('Full Sleeve', 'Half Sleeve', 'Sleeveless', '3/4 Sleeve'),
    neckType: Joi.string().trim(),
    occasion: Joi.alternatives().try(
        Joi.string(),
        Joi.array().items(Joi.string())
    ),
    season: Joi.string().valid('Summer', 'Winter', 'Monsoon', 'All Season'),
    countryOfOrigin: Joi.string().trim(),
    
    // Variant filters
    size: Joi.string().valid('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '28', '30', '32', '34', '36', '38', '40', '42', 'Free Size'),
    color: Joi.string().trim(),
    
    // Discount filters
    minDiscount: Joi.number().min(0).max(100),
    hasDiscount: Joi.boolean()
});

// Stock update validation
const updateStockValidation = Joi.object({
    variantId: Joi.string().hex().length(24).required(),
    stock: Joi.number().integer().min(0).required()
});

// Bulk stock update validation
const bulkStockUpdateValidation = Joi.object({
    updates: Joi.array().items(
        Joi.object({
            variantId: Joi.string().hex().length(24).required(),
            stock: Joi.number().integer().min(0).required()
        })
    ).min(1).required()
});

module.exports = {
    createProductValidation,
    updateProductValidation,
    queryValidation,
    updateStockValidation,
    bulkStockUpdateValidation
};

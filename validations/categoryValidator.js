const Joi = require('joi');

const categoryValidators = {
    // Create category validation
    createCategory: Joi.object({
        name: Joi.string()
            .min(2)
            .max(50)
            .required()
            .trim()
            .messages({
                'string.empty': 'Category name is required',
                'string.min': 'Category name must be at least 2 characters',
                'string.max': 'Category name cannot exceed 50 characters'
            }),
        
        description: Joi.string()
            .max(500)
            .allow('', null)
            .trim()
            .messages({
                'string.max': 'Description cannot exceed 500 characters'
            }),
        
        image: Joi.string()
            .uri()
            .allow('', null)
            .messages({
                'string.uri': 'Image must be a valid URL'
            }),
        
        parentCategory: Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .allow(null)
            .messages({
                'string.pattern.base': 'Invalid parent category ID'
            }),
        
        level: Joi.number()
            .integer()
            .min(0)
            .max(3)
            .default(0),
        
        displayOrder: Joi.number()
            .integer()
            .min(0)
            .default(0),
        
        showOnHomepage: Joi.boolean().default(false),
        isFeatured: Joi.boolean().default(false),
        
        seo: Joi.object({
            metaTitle: Joi.string().max(60).allow(''),
            metaDescription: Joi.string().max(160).allow(''),
            metaKeywords: Joi.array().items(Joi.string().trim())
        }).optional(),
        
        isActive: Joi.boolean().default(true)
    }),

    // Update category validation
    updateCategory: Joi.object({
        name: Joi.string()
            .min(2)
            .max(50)
            .trim()
            .messages({
                'string.min': 'Category name must be at least 2 characters',
                'string.max': 'Category name cannot exceed 50 characters'
            }),
        
        description: Joi.string()
            .max(500)
            .allow('', null)
            .trim(),
        
        image: Joi.string()
            .uri()
            .allow('', null),
        
        parentCategory: Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .allow(null),
        
        level: Joi.number()
            .integer()
            .min(0)
            .max(3),
        
        displayOrder: Joi.number()
            .integer()
            .min(0),
        
        showOnHomepage: Joi.boolean(),
        isFeatured: Joi.boolean(),
        
        seo: Joi.object({
            metaTitle: Joi.string().max(60).allow(''),
            metaDescription: Joi.string().max(160).allow(''),
            metaKeywords: Joi.array().items(Joi.string().trim())
        }),
        
        isActive: Joi.boolean()
    }).min(1),

    // Query params validation
    getCategories: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(10),
        search: Joi.string().trim().allow(''),
        isActive: Joi.boolean(),
        isFeatured: Joi.boolean(),
        showOnHomepage: Joi.boolean(),
        parentCategory: Joi.string().regex(/^[0-9a-fA-F]{24}$/).allow('null'),
        level: Joi.number().integer().min(0).max(3),
        sortBy: Joi.string().valid('name', 'createdAt', 'displayOrder', 'productCount').default('displayOrder'),
        sortOrder: Joi.string().valid('asc', 'desc').default('asc')
    }),

    // ID param validation
    categoryId: Joi.object({
        id: Joi.string()
            .regex(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
                'string.pattern.base': 'Invalid category ID format'
            })
    })
};

module.exports = categoryValidators;
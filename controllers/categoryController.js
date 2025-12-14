const Category = require('../models/Category');
const uploadToCloudinary = require('../utils/cloudinary');

const categoryController = {
    // Create new category
    createCategory: async (req, res) => {
        try {
            const { name, description, parentCategory, level, displayOrder,
                showOnHomepage, isFeatured, seo, isActive } = req.body;

            // Check if category name already exists
            const existingCategory = await Category.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') }
            });

            if (existingCategory) {
                return res.status(409).json({
                    success: false,
                    message: 'Category with this name already exists'
                });
            }
            console.log(parentCategory)
            // If parent category provided, verify it exists
            if (parentCategory) {
                const parent = await Category.findById(parentCategory);
                if (!parent) {
                    return res.status(404).json({
                        success: false,
                        message: 'Parent category not found'
                    });
                }
            }
            let thumbnail;
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


                    thumbnail = picture

                } catch (uploadError) {
                    console.error('Cloudinary upload error:', uploadError);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to upload profile picture',
                        error: uploadError.message
                    });
                }
            }

            // Create category
            const category = new Category({
                name,
                description,
                image: thumbnail,
                parentCategory,
                level,
                displayOrder,
                showOnHomepage,
                isFeatured,
                seo,
                isActive
            });

            await category.save();

            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: category
            });
        } catch (error) {
            console.error('Create category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create category',
                error: error.message
            });
        }
    },

    // Get all categories with filters and pagination
    getCategories: async (req, res) => {
        try {
            const { page, limit, search, isActive, isFeatured, showOnHomepage,
                parentCategory, level, sortBy, sortOrder } = req.query;

            // Build query
            const query = {};

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            if (isActive !== undefined) query.isActive = isActive;
            if (isFeatured !== undefined) query.isFeatured = isFeatured;
            if (showOnHomepage !== undefined) query.showOnHomepage = showOnHomepage;
            if (level !== undefined) query.level = level;

            if (parentCategory === 'null') {
                query.parentCategory = null;
            } else if (parentCategory) {
                query.parentCategory = parentCategory;
            }

            // Sorting
            const sort = {};
            sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

            // Pagination
            const skip = (page - 1) * limit;

            // Execute query
            const categories = await Category.find(query)
                .populate('parentCategory', 'name slug')
                .populate('subcategories')
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean();

            const total = await Category.countDocuments(query);

            res.status(200).json({
                success: true,
                data: categories,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            console.error('Get categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch categories',
                error: error.message
            });
        }
    },

    // Get single category by ID
    getCategoryById: async (req, res) => {
        try {
            const { id } = req.params;

            const category = await Category.findById(id)
                .populate('parentCategory', 'name slug')
                .populate('subcategories');

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            res.status(200).json({
                success: true,
                data: category
            });
        } catch (error) {
            console.error('Get category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category',
                error: error.message
            });
        }
    },

    // Get category by slug
    getCategoryBySlug: async (req, res) => {
        try {
            const { slug } = req.params;

            const category = await Category.findOne({ slug, isActive: true })
                .populate('parentCategory', 'name slug')
                .populate('subcategories');

            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            res.status(200).json({
                success: true,
                data: category
            });
        } catch (error) {
            console.error('Get category by slug error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category',
                error: error.message
            });
        }
    },

    // Update category
    updateCategory: async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Check if category exists
            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // If name is being updated, check for duplicates
            if (updates.name && updates.name !== category.name) {
                const existingCategory = await Category.findOne({
                    name: { $regex: new RegExp(`^${updates.name}$`, 'i') },
                    _id: { $ne: id }
                });

                if (existingCategory) {
                    return res.status(409).json({
                        success: false,
                        message: 'Category with this name already exists'
                    });
                }
            }

            // If parent category is being updated, verify it exists
            if (updates.parentCategory) {
                const parent = await Category.findById(updates.parentCategory);
                if (!parent) {
                    return res.status(404).json({
                        success: false,
                        message: 'Parent category not found'
                    });
                }

                // Prevent circular references
                if (updates.parentCategory === id) {
                    return res.status(400).json({
                        success: false,
                        message: 'Category cannot be its own parent'
                    });
                }
            }
           
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


                    updates.image = picture

                } catch (uploadError) {
                    console.error('Cloudinary upload error:', uploadError);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to upload profile picture',
                        error: uploadError.message
                    });
                }
            }
            // Update category
            const updatedCategory = await Category.findByIdAndUpdate(
                id,
                updates,
                { new: true, runValidators: true }
            ).populate('parentCategory', 'name slug');

            res.status(200).json({
                success: true,
                message: 'Category updated successfully',
                data: updatedCategory
            });
        } catch (error) {
            console.error('Update category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update category',
                error: error.message
            });
        }
    },

    // Delete category (soft delete)
    deleteCategory: async (req, res) => {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Check if category has subcategories
            const subcategories = await Category.countDocuments({ parentCategory: id });
            if (subcategories > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete category with subcategories. Delete subcategories first.'
                });
            }

            // Check if category has products
            if (category.productCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete category with ${category.productCount} products. Reassign or delete products first.`
                });
            }

            // Soft delete
            category.isActive = false;
            await category.save();

            res.status(200).json({
                success: true,
                message: 'Category deleted successfully'
            });
        } catch (error) {
            console.error('Delete category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete category',
                error: error.message
            });
        }
    },

    // Hard delete category (permanent)
    permanentDeleteCategory: async (req, res) => {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Category not found'
                });
            }

            // Check if category has subcategories
            const subcategories = await Category.countDocuments({ parentCategory: id });
            if (subcategories > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete category with subcategories'
                });
            }

            // Check if category has products
            if (category.productCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete category with products'
                });
            }

            await Category.findByIdAndDelete(id);

            res.status(200).json({
                success: true,
                message: 'Category permanently deleted'
            });
        } catch (error) {
            console.error('Permanent delete category error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete category',
                error: error.message
            });
        }
    },

    // Get category hierarchy (tree structure)
    getCategoryHierarchy: async (req, res) => {
        try {
            // Get all root categories (no parent)
            const rootCategories = await Category.find({
                parentCategory: null,
                isActive: true
            })
                .populate({
                    path: 'subcategories',
                    match: { isActive: true },
                    populate: {
                        path: 'subcategories',
                        match: { isActive: true }
                    }
                })
                .sort({ displayOrder: 1 });

            res.status(200).json({
                success: true,
                data: rootCategories
            });
        } catch (error) {
            console.error('Get hierarchy error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category hierarchy',
                error: error.message
            });
        }
    },

    // Get featured categories
    getFeaturedCategories: async (req, res) => {
        try {
            const categories = await Category.find({
                isFeatured: true,
                isActive: true
            })
                .sort({ displayOrder: 1 })
                .limit(10);

            res.status(200).json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Get featured categories error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch featured categories',
                error: error.message
            });
        }
    }
};

module.exports = categoryController;
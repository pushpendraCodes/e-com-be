const Product = require('../models/Product');
const mongoose = require('mongoose');
const uploadToCloudinary = require('../utils/cloudinary');

class ProductController {
    // Create new product
   static async createProduct(req, res) {
    try {
        let images = [];

        // MULTIPLE IMAGE UPLOAD (CLOUDINARY)
        if (req.files && req.files.length > 0) {
            try {
                const uploadPromises = req.files.map(async (file, index) => {
                    const upload = await uploadToCloudinary(file.path, file.originalname);
                    const imageUrl = upload?.secure_url || upload?.url;

                    return {
                        url: imageUrl,
                        alt: req.body?.name || "Product Image",
                        isPrimary: index === 0, // first image = primary
                        order: index
                    };
                });

                images = await Promise.all(uploadPromises);

                if (!images.length) {
                    return res.status(500).json({
                        success: false,
                        message: "Failed to upload product images"
                    });
                }
            } catch (uploadError) {
                console.error("Cloudinary multiple upload error:", uploadError);
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload images",
                    error: uploadError.message
                });
            }
        }

        // Prepare product data
        const productData = {
            ...req.body,
            images,                  // Store structured images
            createdBy: req.userId
        };

        const product = await Product.create(productData);

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: product
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Product with this slug or SKU already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Error creating product",
            error: error.message
        });
    }
}


    // Get all products with filters and pagination
   static async getAllProducts(req, res) {
    try {
        const {
            page = 1,
            limit = 12,
            search,
            category,
            brand,
            minPrice,
            maxPrice,
            status,
            isActive,
            isFeatured,
            isNewArrival,
            isBestseller,
            inStock,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            tags,
            
            // ===== NEW: Rating Filters =====
            minRating,          // Filter by minimum rating (e.g., 4 stars and above)
            maxRating,          // Filter by maximum rating
            hasRatings,         // Filter products that have ratings
            
            // ===== NEW: Specification Filters =====
            material,           // Filter by material (e.g., 'Cotton', '100% Cotton')
            fabric,             // Filter by fabric type
            pattern,            // Filter by pattern (e.g., 'Solid', 'Striped')
            fit,                // Filter by fit (e.g., 'Slim Fit', 'Regular Fit')
            sleeves,            // Filter by sleeve type (e.g., 'Full Sleeve', 'Half Sleeve')
            neckType,           // Filter by neck type
            occasion,           // Filter by occasion (can be array)
            season,             // Filter by season
            countryOfOrigin,    // Filter by country
            
            // ===== NEW: Size & Color Filters =====
            size,               // Filter by available size
            color,              // Filter by available color
            
            // ===== NEW: Discount Filter =====
            minDiscount,        // Minimum discount percentage
            hasDiscount         // Products with any discount
        } = req.query;

        // Build query
        const query = {};

        // Text search
        if (search) {
            query.$text = { $search: search };
        }

        // Basic filters
        if (category) query.category = category;
        if (brand) query.brand = new RegExp(brand, 'i');
        if (status) query.status = status;
        if (isActive !== undefined) query.isActive = isActive === 'true';
        if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';
        if (isNewArrival !== undefined) query.isNewArrival = isNewArrival === 'true';
        if (isBestseller !== undefined) query.isBestseller = isBestseller === 'true';

        // Price range filter
        if (minPrice || maxPrice) {
            query['price.selling'] = {};
            if (minPrice) query['price.selling'].$gte = parseFloat(minPrice);
            if (maxPrice) query['price.selling'].$lte = parseFloat(maxPrice);
        }

        // Stock filter
        if (inStock !== undefined) {
            query.totalStock = inStock === 'true' ? { $gt: 0 } : 0;
        }

        // Tags filter
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            query.tags = { $in: tagArray };
        }

        // ===== RATING FILTERS =====
        if (minRating || maxRating || hasRatings) {
            if (minRating) {
                query['ratings.average'] = { 
                    ...query['ratings.average'],
                    $gte: parseFloat(minRating) 
                };
            }
            if (maxRating) {
                query['ratings.average'] = { 
                    ...query['ratings.average'],
                    $lte: parseFloat(maxRating) 
                };
            }
            // Filter products that have at least one rating
            if (hasRatings === 'true') {
                query['ratings.count'] = { $gt: 0 };
            }
        }

        // ===== SPECIFICATION FILTERS =====
        if (material) {
            query['specifications.material'] = new RegExp(material, 'i');
        }
        if (fabric) {
            query['specifications.fabric'] = new RegExp(fabric, 'i');
        }
        if (pattern) {
            query['specifications.pattern'] = new RegExp(pattern, 'i');
        }
        if (fit) {
            query['specifications.fit'] = fit;
        }
        if (sleeves) {
            query['specifications.sleeves'] = sleeves;
        }
        if (neckType) {
            query['specifications.neckType'] = new RegExp(neckType, 'i');
        }
        if (season) {
            query['specifications.season'] = season;
        }
        if (countryOfOrigin) {
            query['specifications.countryOfOrigin'] = new RegExp(countryOfOrigin, 'i');
        }

        // Occasion filter (can have multiple occasions)
        if (occasion) {
            const occasionArray = Array.isArray(occasion) ? occasion : [occasion];
            query['specifications.occasion'] = { $in: occasionArray };
        }

        // ===== SIZE & COLOR FILTERS (from variants) =====
        if (size) {
            query['variants.size'] = size;
        }
        if (color) {
            query['variants.color'] = new RegExp(color, 'i');
        }

        // ===== DISCOUNT FILTERS =====
        if (minDiscount) {
            query['price.discount'] = { $gte: parseFloat(minDiscount) };
        }
        if (hasDiscount === 'true') {
            query['price.discount'] = { $gt: 0 };
        }

        // Sorting
        const sort = {};
        if (sortBy === 'price') {
            sort['price.selling'] = sortOrder === 'asc' ? 1 : -1;
        } else if (sortBy === 'rating') {
            sort['ratings.average'] = sortOrder === 'asc' ? 1 : -1;
        } else if (sortBy === 'sales') {
            sort['sales.totalSold'] = sortOrder === 'asc' ? 1 : -1;
        } else if (sortBy === 'name') {
            sort.name = sortOrder === 'asc' ? 1 : -1;
        } else if (sortBy === 'discount') {
            sort['price.discount'] = sortOrder === 'asc' ? 1 : -1;
        } else {
            sort.createdAt = sortOrder === 'asc' ? 1 : -1;
        }

        // Execute query with pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const [products, total] = await Promise.all([
            Product.find(query)
                .populate('category', 'name slug')
                .populate('subCategory', 'name slug')
                .sort(sort)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Product.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            },
            filters: {
                applied: {
                    search,
                    category,
                    brand,
                    priceRange: { min: minPrice, max: maxPrice },
                    rating: { min: minRating, max: maxRating },
                    specifications: {
                        material,
                        fabric,
                        pattern,
                        fit,
                        sleeves,
                        season,
                        occasion
                    },
                    variant: { size, color },
                    discount: minDiscount
                }
            }
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching products',
            error: error.message
        });
    }
}


static async getFilterOptions(req, res) {
    try {
        const { category } = req.query;
        
        const query = { isActive: true };
        if (category) query.category = category;

        // Get unique values for each filter
        const [
            brands,
            materials,
            fabrics,
            patterns,
            fits,
            sleeves,
            seasons,
            occasions,
            sizes,
            colors,
            priceRange,
            ratingRange
        ] = await Promise.all([
            Product.distinct('brand', query),
            Product.distinct('specifications.material', query),
            Product.distinct('specifications.fabric', query),
            Product.distinct('specifications.pattern', query),
            Product.distinct('specifications.fit', query),
            Product.distinct('specifications.sleeves', query),
            Product.distinct('specifications.season', query),
            Product.aggregate([
                { $match: query },
                { $unwind: '$specifications.occasion' },
                { $group: { _id: '$specifications.occasion' } },
                { $project: { _id: 0, occasion: '$_id' } }
            ]),
            Product.distinct('variants.size', query),
            Product.distinct('variants.color', query),
            Product.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        minPrice: { $min: '$price.selling' },
                        maxPrice: { $max: '$price.selling' }
                    }
                }
            ]),
            Product.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: null,
                        minRating: { $min: '$ratings.average' },
                        maxRating: { $max: '$ratings.average' }
                    }
                }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                brands: brands.filter(Boolean),
                specifications: {
                    materials: materials.filter(Boolean),
                    fabrics: fabrics.filter(Boolean),
                    patterns: patterns.filter(Boolean),
                    fits: fits.filter(Boolean),
                    sleeves: sleeves.filter(Boolean),
                    seasons: seasons.filter(Boolean),
                    occasions: occasions.map(o => o.occasion).filter(Boolean)
                },
                variants: {
                    sizes: sizes.filter(Boolean),
                    colors: colors.filter(Boolean)
                },
                priceRange: priceRange[0] || { minPrice: 0, maxPrice: 0 },
                ratingRange: ratingRange[0] || { minRating: 0, maxRating: 5 }
            }
        });
    } catch (error) {
        console.error('Get filter options error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching filter options',
            error: error.message
        });
    }
}



    // Get single product by ID
    static async getProductById(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid product ID'
                });
            }

            const product = await Product.findById(id)
                .populate('category', 'name slug')
                .populate('subCategory', 'name slug')
                .populate('relatedProducts', 'name slug price images');

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Increment view count
            await Product.findByIdAndUpdate(id, { $inc: { 'sales.views': 1 } });

            res.status(200).json({
                success: true,
                data: product
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching product',
                error: error.message
            });
        }
    }

    // Get product by slug
    static async getProductBySlug(req, res) {
        try {
            const { slug } = req.params;

            const product = await Product.findOne({ slug })
                .populate('category', 'name slug')
                .populate('subCategory', 'name slug')
                .populate('relatedProducts', 'name slug price images');

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Increment view count
            await Product.findOneAndUpdate({ slug }, { $inc: { 'sales.views': 1 } });

            res.status(200).json({
                success: true,
                data: product
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching product',
                error: error.message
            });
        }
    }

    // Update product
static async updateProduct(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    let updatedImages = [];

    /** Parse existing images */
    if (req.body.images) {
      updatedImages = JSON.parse(req.body.images);
    }

    /** Normalize order (fix missing numbers) */
    updatedImages = updatedImages
      .sort((a, b) => a.order - b.order)
      .map((img, index) => ({
        ...img,
        order: index
      }));

    /** Add new uploaded images */
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const upload = await uploadToCloudinary(file.path, file.originalname);

        updatedImages.push({
          url: upload.secure_url,
          alt: req.body.name || "",
          isPrimary: false,
          order: updatedImages.length // appended correctly
        });
      }
    }

    /** Ensure exactly one primary */
    let primaryFound = false;
    updatedImages = updatedImages.map((img, index) => {
      if (img.isPrimary && !primaryFound) {
        primaryFound = true;
        return { ...img, order: index };
      }
      return { ...img, isPrimary: false, order: index };
    });

    if (!primaryFound && updatedImages.length > 0) {
      updatedImages[0].isPrimary = true;
    }

    /** Update product */
    const updateData = {
      ...req.body,
      images: updatedImages,
      updatedBy: req.userId
    };

    const product = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      data: product
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating product",
      error: error.message
    });
  }
}


    // Delete product (soft delete)
    static async deleteProduct(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid product ID'
                });
            }

            const product = await Product.findByIdAndUpdate(
                id,
                { isActive: false, status: 'inactive' },
                { new: true }
            );

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Product deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting product',
                error: error.message
            });
        }
    }

    // Permanently delete product
    static async permanentDeleteProduct(req, res) {
        try {
            const { id } = req.params;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid product ID'
                });
            }

            const product = await Product.findByIdAndDelete(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'Product permanently deleted'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting product',
                error: error.message
            });
        }
    }

    // Update product stock
    static async updateStock(req, res) {
        try {
            const { id } = req.params;
            const { variantId, stock } = req.body;

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const variant = product.variants.id(variantId);

            if (!variant) {
                return res.status(404).json({
                    success: false,
                    message: 'Variant not found'
                });
            }

            variant.stock = stock;
            await product.save();

            res.status(200).json({
                success: true,
                message: 'Stock updated successfully',
                data: product
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating stock',
                error: error.message
            });
        }
    }

    // Bulk stock update
    static async bulkStockUpdate(req, res) {
        try {
            const { id } = req.params;
            const { updates } = req.body;

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            updates.forEach(({ variantId, stock }) => {
                const variant = product.variants.id(variantId);
                if (variant) {
                    variant.stock = stock;
                }
            });

            await product.save();

            res.status(200).json({
                success: true,
                message: 'Bulk stock update successful',
                data: product
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating stock',
                error: error.message
            });
        }
    }

    // Get featured products
    static async getFeaturedProducts(req, res) {
        try {
            const { limit = 10 } = req.query;

            const products = await Product.find({
                isFeatured: true,
                isActive: true,
                status: 'active'
            })
                .populate('category', 'name slug')
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            res.status(200).json({
                success: true,
                data: products
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching featured products',
                error: error.message
            });
        }
    }

    // Get new arrivals
    static async getNewArrivals(req, res) {
        try {
            const { limit = 10 } = req.query;

            const products = await Product.find({
                isNewArrival: true,
                isActive: true,
                status: 'active'
            })
                .populate('category', 'name slug')
                .limit(parseInt(limit))
                .sort({ createdAt: -1 });

            res.status(200).json({
                success: true,
                data: products
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching new arrivals',
                error: error.message
            });
        }
    }

    // Get bestsellers
    static async getBestsellers(req, res) {
        try {
            const { limit = 10 } = req.query;

            const products = await Product.find({
                isBestseller: true,
                isActive: true,
                status: 'active'
            })
                .populate('category', 'name slug')
                .limit(parseInt(limit))
                .sort({ 'sales.totalSold': -1 });

            res.status(200).json({
                success: true,
                data: products
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching bestsellers',
                error: error.message
            });
        }
    }

    // Get related products
    static async getRelatedProducts(req, res) {
        try {
            const { id } = req.params;
            const { limit = 5 } = req.query;

            const product = await Product.findById(id);

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            const relatedProducts = await Product.find({
                _id: { $ne: id },
                $or: [
                    { category: product.category },
                    { tags: { $in: product.tags } }
                ],
                isActive: true,
                status: 'active'
            })
                .limit(parseInt(limit))
                .select('name slug price images ratings');

            res.status(200).json({
                success: true,
                data: relatedProducts
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching related products',
                error: error.message
            });
        }
    }

    // Search products
    static async searchProducts(req, res) {
        try {
            const { q, limit = 10 } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query is required'
                });
            }

            const products = await Product.find({
                $text: { $search: q },
                isActive: true
            })
                .select('name slug price images ratings')
                .limit(parseInt(limit))
                .sort({ score: { $meta: 'textScore' } });

            res.status(200).json({
                success: true,
                data: products
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error searching products',
                error: error.message
            });
        }
    }

    // Get low stock products
    static async getLowStockProducts(req, res) {
        try {
            const products = await Product.find({
                $expr: { $lte: ['$totalStock', '$lowStockThreshold'] },
                totalStock: { $gt: 0 },
                isActive: true
            })
                .select('name slug totalStock lowStockThreshold variants')
                .sort({ totalStock: 1 });

            res.status(200).json({
                success: true,
                data: products
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching low stock products',
                error: error.message
            });
        }
    }

    // Get out of stock products
    static async getOutOfStockProducts(req, res) {
        try {
            const products = await Product.find({
                totalStock: 0,
                isActive: true
            })
                .select('name slug totalStock')
                .sort({ updatedAt: -1 });

            res.status(200).json({
                success: true,
                data: products
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching out of stock products',
                error: error.message
            });
        }
    }
}

module.exports = ProductController;
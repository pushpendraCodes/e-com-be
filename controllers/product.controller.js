const Product = require('../models/Product');
const mongoose = require('mongoose');
const uploadToCloudinary = require('../utils/cloudinary');

class ProductController {
    // Create new product
    static async createProduct(req, res) {
  try {
    let images = [];

    // ===============================
    // MULTIPLE IMAGE UPLOAD (CLOUDINARY)
    // ===============================
    if (req.files && req.files.length > 0) {
      try {
        const uploadPromises = req.files.map(async (file, index) => {
          const upload = await uploadToCloudinary(
            file.path,
            file.originalname
          );

          const imageUrl = upload?.secure_url || upload?.url;

          return {
            url: imageUrl,
            alt: req.body?.name || "Product Image",
            isPrimary: index === 0, // first image primary
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
        console.error("Cloudinary upload error:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload images",
          error: uploadError.message
        });
      }
    }

    // ===============================
    // SAFELY PARSE JSON FIELDS
    // ===============================
    const parseJSON = (value, fallback) => {
      try {
        return value ? JSON.parse(value) : fallback;
      } catch {
        return fallback;
      }
    };

    const price = parseJSON(req.body.price, {});
    const variants = parseJSON(req.body.variants, []);
    const specifications = parseJSON(req.body.specifications, {});
    const dimensions = parseJSON(req.body.dimensions, {});
    const seo = parseJSON(req.body.seo, {});
    const tags = parseJSON(req.body.tags, []);

    // ===============================
    // VALIDATIONS
    // ===============================
    // if (!req.body.name || !req.body.description || !req.body.category) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Name, description and category are required"
    //   });
    // }

    // if (!price.original || !price.selling) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Original price and selling price are required"
    //   });
    // }

    // if (!variants.length) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "At least one variant is required"
    //   });
    // }

    // ===============================
    // PREPARE PRODUCT DATA
    // ===============================
    const productData = {
      name: req.body.name,
      description: req.body.description,
      shortDescription: req.body.shortDescription || "",
      category: req.body.category,
      subCategory: req.body.subCategory || null,
      brand: req.body.brand || "",

      price,
      variants,
      specifications,
      dimensions,
      seo,
      tags,

      status: req.body.status || "active",
      isFeatured: req.body.isFeatured === "true",
      isNewArrival: req.body.isNewArrival === "true",
      isBestseller: req.body.isBestseller === "true",

      images,
      createdBy: req.userId
    };

    // ===============================
    // CREATE PRODUCT
    // ===============================
    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      data: product
    });

  } catch (error) {
    console.error("Create product error:", error);

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
                all, // ✅ NEW FLAG
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

                // Rating
                minRating,
                maxRating,
                hasRatings,

                // Specifications
                material,
                fabric,
                pattern,
                fit,
                sleeves,
                neckType,
                occasion,
                season,
                countryOfOrigin,

                // Variants
                size,
                color,

                // Discount
                minDiscount,
                hasDiscount
            } = req.query;

            const isAll = all === 'true';

            /* =========================
               BUILD QUERY
            ========================== */
            const query = {};

            // Search
            if (search?.trim()) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { sku: { $regex: search, $options: 'i' } },
                    { slug: { $regex: search, $options: 'i' } }
                ];
            }

            // Category
            if (category && category !== 'all') {
                query.category = category;
            }

            // Brand
            if (brand) {
                query.brand = new RegExp(brand, 'i');
            }

            // Status (role based)
            if (req.role === 'admin') {

                query.status = status;
            } else if (status) {
                query.status = 'active';

            }

            if (isActive !== undefined) query.isActive = isActive === 'true';
            if (isFeatured !== undefined) query.isFeatured = isFeatured === 'true';
            if (isNewArrival !== undefined) query.isNewArrival = isNewArrival === 'true';
            if (isBestseller !== undefined) query.isBestseller = isBestseller === 'true';

            // Price range
            if (minPrice || maxPrice) {
                query['price.selling'] = {};
                if (minPrice) query['price.selling'].$gte = Number(minPrice);
                if (maxPrice) query['price.selling'].$lte = Number(maxPrice);
            }

            // Stock
            if (inStock !== undefined) {
                query.totalStock = inStock === 'true' ? { $gt: 0 } : 0;
            }

            // Tags
            if (tags) {
                const tagArray = Array.isArray(tags) ? tags : [tags];
                query.tags = { $in: tagArray };
            }

            // Rating filters
            if (minRating || maxRating) {
                query['ratings.average'] = {};
                if (minRating) query['ratings.average'].$gte = Number(minRating);
                if (maxRating) query['ratings.average'].$lte = Number(maxRating);
            }

            if (hasRatings === 'true') {
                query['ratings.count'] = { $gt: 0 };
            }

            // Specifications
            if (material) query['specifications.material'] = new RegExp(material, 'i');
            if (fabric) query['specifications.fabric'] = new RegExp(fabric, 'i');
            if (pattern) query['specifications.pattern'] = new RegExp(pattern, 'i');
            if (fit) query['specifications.fit'] = fit;
            if (sleeves) query['specifications.sleeves'] = sleeves;
            if (neckType) query['specifications.neckType'] = new RegExp(neckType, 'i');
            if (season) query['specifications.season'] = season;
            if (countryOfOrigin)
                query['specifications.countryOfOrigin'] = new RegExp(countryOfOrigin, 'i');

            if (occasion) {
                const occasionArray = Array.isArray(occasion) ? occasion : [occasion];
                query['specifications.occasion'] = { $in: occasionArray };
            }

            // Variants
            if (size) query['variants.size'] = size;
            if (color) query['variants.color'] = new RegExp(color, 'i');

            // Discount
            if (minDiscount) {
                query['price.discount'] = { $gte: Number(minDiscount) };
            }
            if (hasDiscount === 'true') {
                query['price.discount'] = { $gt: 0 };
            }

            /* =========================
               SORT
            ========================== */
            const sort = {};
            if (sortBy === 'price') sort['price.selling'] = sortOrder === 'asc' ? 1 : -1;
            else if (sortBy === 'rating') sort['ratings.average'] = sortOrder === 'asc' ? 1 : -1;
            else if (sortBy === 'sales') sort['sales.totalSold'] = sortOrder === 'asc' ? 1 : -1;
            else if (sortBy === 'name') sort.name = sortOrder === 'asc' ? 1 : -1;
            else if (sortBy === 'discount') sort['price.discount'] = sortOrder === 'asc' ? 1 : -1;
            else sort.createdAt = sortOrder === 'asc' ? 1 : -1;

            /* =========================
               FETCH DATA
            ========================== */
            let products, total;

            if (isAll) {
                products = await Product.find(query)
                    .populate('category', 'name slug')
                    .populate('subCategory', 'name slug')
                    .sort(sort)
                    .lean();

                total = products.length;
            } else {
                const skip = (Number(page) - 1) * Number(limit);

                [products, total] = await Promise.all([
                    Product.find(query)
                        .populate('category', 'name slug')
                        .populate('subCategory', 'name slug')
                        .sort(sort)
                        .skip(skip)
                        .limit(Number(limit))
                        .lean(),
                    Product.countDocuments(query)
                ]);
            }

            /* =========================
               RESPONSE
            ========================== */
            res.status(200).json({
                success: true,
                data: products,

                ...(isAll
                    ? {}
                    : {
                        pagination: {
                            page: Number(page),
                            limit: Number(limit),
                            total,
                            pages: Math.ceil(total / limit),
                            activeProducts: products.filter(p => p.isActive).length,
                            inactiveProducts: products.filter(p => !p.isActive).length,
                            lowStockProducts: products.filter(p => p.totalStock <= p.lowStockThreshold).length,
                            outOfStockProducts: products.filter(p => p.totalStock === 0).length

                        }
                    })
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

    // ===============================
    // HELPERS
    // ===============================
    const parseJSON = (value, fallback) => {
      try {
        return value ? JSON.parse(value) : fallback;
      } catch {
        return fallback;
      }
    };

    // ===============================
    // IMAGE HANDLING
    // ===============================
    let updatedImages = [];

    // Parse existing images
    if (req.body.existingImages) {
      updatedImages = parseJSON(req.body.existingImages, []);
    }

    // Normalize order
    updatedImages = updatedImages
      .sort((a, b) => a.order - b.order)
      .map((img, index) => ({
        ...img,
        order: index,
        isPrimary: !!img.isPrimary
      }));

    // Upload new images
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const upload = await uploadToCloudinary(
          file.path,
          file.originalname
        );

        updatedImages.push({
          url: upload?.secure_url || upload?.url,
          alt: req.body?.name || "Product Image",
          isPrimary: false,
          order: updatedImages.length
        });
      }
    }

    // Ensure exactly ONE primary image
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

    // ===============================
    // PARSE JSON FIELDS
    // ===============================
    const price = parseJSON(req.body.price, {});
    const variants = parseJSON(req.body.variants, []);
    const specifications = parseJSON(req.body.specifications, {});
    const dimensions = parseJSON(req.body.dimensions, {});
    const seo = parseJSON(req.body.seo, {});
    const tags = parseJSON(req.body.tags, []);

    // ===============================
    // VALIDATION
    // ===============================
    if (!price.original || !price.selling) {
      return res.status(400).json({
        success: false,
        message: "Original price and selling price are required"
      });
    }

    if (!variants.length) {
      return res.status(400).json({
        success: false,
        message: "At least one variant is required"
      });
    }

    // ===============================
    // UPDATE DATA (CLEAN)
    // ===============================
    const updateData = {
      name: req.body.name,
      description: req.body.description,
      shortDescription: req.body.shortDescription || "",
      category: req.body.category,
      subCategory: req.body.subCategory || null,
      brand: req.body.brand || "",

      price,
      variants,
      specifications,
      dimensions,
      seo,
      tags,

      status: req.body.status || "active",
      isFeatured: req.body.isFeatured === "true",
      isNewArrival: req.body.isNewArrival === "true",
      isBestseller: req.body.isBestseller === "true",

      images: updatedImages,
      updatedBy: req.userId
    };

    // ===============================
    // UPDATE PRODUCT
    // ===============================
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
    console.error("Update product error:", error);
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
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category'); // Assuming you have this

// Sample data arrays
const brands = ['Nike', 'Adidas', 'Puma', 'Levi\'s', 'H&M', 'Zara', 'StyleCraft', 'FashionHub', 'TrendWear', 'UrbanStyle'];

const colors = [
    { name: 'Black', code: '#000000' },
    { name: 'White', code: '#FFFFFF' },
    { name: 'Blue', code: '#0066CC' },
    { name: 'Red', code: '#FF0000' },
    { name: 'Green', code: '#00AA00' },
    { name: 'Navy', code: '#000080' },
    { name: 'Grey', code: '#808080' },
    { name: 'Maroon', code: '#800000' },
    { name: 'Olive', code: '#808000' },
    { name: 'Beige', code: '#F5F5DC' }
];

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const productTemplates = [
    {
        namePrefix: 'Men\'s Casual Cotton Shirt',
        description: 'Premium quality casual cotton shirt perfect for everyday wear. Features a modern fit and breathable fabric that keeps you comfortable all day long.',
        shortDescription: 'Comfortable casual cotton shirt for men',
        specifications: {
            material: '100% Cotton',
            fabric: 'Cotton Twill',
            pattern: 'Solid',
            fit: 'Regular Fit',
            sleeves: 'Full Sleeve',
            neckType: 'Spread Collar',
            occasion: ['Casual', 'Party'],
            season: 'All Season',
            careInstructions: ['Machine wash cold', 'Do not bleach', 'Tumble dry low', 'Iron on low heat']
        },
        tags: ['casual', 'cotton', 'shirts', 'menswear'],
        priceRange: { min: 999, max: 2499 }
    },
    {
        namePrefix: 'Women\'s Floral Print Dress',
        description: 'Beautiful floral print dress perfect for any occasion. Made with soft, flowing fabric that drapes elegantly. Features a flattering silhouette.',
        shortDescription: 'Elegant floral dress for women',
        specifications: {
            material: 'Polyester Blend',
            fabric: 'Chiffon',
            pattern: 'Floral',
            fit: 'Regular Fit',
            sleeves: 'Half Sleeve',
            neckType: 'Round Neck',
            occasion: ['Party', 'Casual'],
            season: 'Summer',
            careInstructions: ['Hand wash', 'Do not wring', 'Dry in shade', 'Iron on low heat']
        },
        tags: ['dress', 'floral', 'women', 'fashion'],
        priceRange: { min: 1499, max: 3999 }
    },
    {
        namePrefix: 'Men\'s Denim Jeans',
        description: 'Classic denim jeans with a modern fit. Made from premium quality denim that\'s durable and comfortable. Perfect for everyday wear.',
        shortDescription: 'Premium denim jeans for men',
        specifications: {
            material: 'Denim',
            fabric: '98% Cotton, 2% Elastane',
            pattern: 'Solid',
            fit: 'Slim Fit',
            occasion: ['Casual'],
            season: 'All Season',
            careInstructions: ['Machine wash', 'Do not bleach', 'Tumble dry low']
        },
        tags: ['jeans', 'denim', 'men', 'casual'],
        priceRange: { min: 1799, max: 4999 }
    },
    {
        namePrefix: 'Women\'s Yoga Pants',
        description: 'High-performance yoga pants designed for maximum comfort and flexibility. Moisture-wicking fabric keeps you dry during intense workouts.',
        shortDescription: 'Comfortable yoga pants for women',
        specifications: {
            material: 'Polyester Spandex',
            fabric: 'Athletic Stretch',
            pattern: 'Solid',
            fit: 'Athletic Fit',
            occasion: ['Sports'],
            season: 'All Season',
            careInstructions: ['Machine wash cold', 'Do not iron', 'Hang dry']
        },
        tags: ['yoga', 'activewear', 'women', 'sports'],
        priceRange: { min: 899, max: 2499 }
    },
    {
        namePrefix: 'Men\'s Formal Blazer',
        description: 'Sophisticated formal blazer perfect for business meetings and formal events. Tailored fit with premium finish.',
        shortDescription: 'Premium formal blazer for men',
        specifications: {
            material: 'Wool Blend',
            fabric: 'Wool Polyester',
            pattern: 'Solid',
            fit: 'Slim Fit',
            sleeves: 'Full Sleeve',
            occasion: ['Formal'],
            season: 'Winter',
            careInstructions: ['Dry clean only']
        },
        tags: ['blazer', 'formal', 'men', 'business'],
        priceRange: { min: 3999, max: 8999 }
    },
    {
        namePrefix: 'Women\'s Summer T-Shirt',
        description: 'Light and breezy summer t-shirt perfect for hot days. Soft cotton fabric that\'s gentle on skin.',
        shortDescription: 'Comfortable summer tee for women',
        specifications: {
            material: '100% Cotton',
            fabric: 'Jersey',
            pattern: 'Solid',
            fit: 'Regular Fit',
            sleeves: 'Half Sleeve',
            neckType: 'Round Neck',
            occasion: ['Casual'],
            season: 'Summer',
            careInstructions: ['Machine wash', 'Tumble dry', 'Iron if needed']
        },
        tags: ['tshirt', 'casual', 'women', 'summer'],
        priceRange: { min: 499, max: 1299 }
    },
    {
        namePrefix: 'Men\'s Sports Jacket',
        description: 'Versatile sports jacket designed for active lifestyle. Water-resistant and windproof with multiple pockets.',
        shortDescription: 'All-weather sports jacket',
        specifications: {
            material: 'Polyester',
            fabric: 'Technical Fabric',
            pattern: 'Solid',
            fit: 'Athletic Fit',
            sleeves: 'Full Sleeve',
            occasion: ['Sports', 'Casual'],
            season: 'Monsoon',
            careInstructions: ['Machine wash', 'Do not iron', 'Hang dry']
        },
        tags: ['jacket', 'sports', 'men', 'activewear'],
        priceRange: { min: 2499, max: 5999 }
    },
    {
        namePrefix: 'Women\'s Ethnic Kurti',
        description: 'Traditional ethnic kurti with modern design elements. Perfect for festivals and casual occasions.',
        shortDescription: 'Stylish ethnic kurti',
        specifications: {
            material: 'Cotton',
            fabric: 'Cotton Blend',
            pattern: 'Printed',
            fit: 'Regular Fit',
            sleeves: '3/4 Sleeve',
            neckType: 'V-Neck',
            occasion: ['Casual', 'Party'],
            season: 'All Season',
            careInstructions: ['Hand wash', 'Dry in shade', 'Iron on medium heat']
        },
        tags: ['kurti', 'ethnic', 'women', 'indian'],
        priceRange: { min: 799, max: 2499 }
    }
];

// Generate random product data
function generateProduct(template, categoryId, index) {
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const selectedColors = colors.slice(0, Math.floor(Math.random() * 3) + 2); // 2-4 colors

    const originalPrice = Math.floor(Math.random() * (template.priceRange.max - template.priceRange.min)) + template.priceRange.min;
    const discount = [0, 10, 15, 20, 25, 30][Math.floor(Math.random() * 6)];
    const sellingPrice = Math.floor(originalPrice * (1 - discount / 100));

    // Generate variants
    const variants = [];
    selectedColors.forEach((color, colorIndex) => {
        sizes.forEach((size, sizeIndex) => {
            const stock = Math.floor(Math.random() * 100) + 10;
            variants.push({
                size,
                color: color.name,
                colorCode: color.code,
                stock,
                sku: `${brand.toUpperCase()}-${template.namePrefix.substring(0, 3).toUpperCase()}-${color.name.substring(0, 3).toUpperCase()}-${size}-${index}${colorIndex}${sizeIndex}`,
                price: sellingPrice + Math.floor(Math.random() * 200)
            });
        });
    });

    // Generate images
    const images = selectedColors.map((color, idx) => ({
        url: `https://picsum.photos/800/1000?random=${index}${idx}`,
        alt: `${template.namePrefix} ${color.name}`,
        isPrimary: idx === 0,
        order: idx + 1
    }));

    const isFeatured = Math.random() > 0.7;
    const isNewArrival = Math.random() > 0.6;
    const isBestseller = Math.random() > 0.8;

    return {
        name: `${template.namePrefix} - ${brand}`,
        description: template.description,
        shortDescription: template.shortDescription,
        category: categoryId,
        brand,
        price: {
            original: originalPrice,
            selling: sellingPrice,
            discount
        },
        images,
        slug:
           `${template.namePrefix} - ${brand}-${index}`
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') +
            '-' +
            Date.now(),

        variants,
        lowStockThreshold: 10,
        specifications: {
            ...template.specifications,
            countryOfOrigin: 'India'
        },
        dimensions: {
            length: Math.floor(Math.random() * 20) + 20,
            width: Math.floor(Math.random() * 15) + 15,
            height: Math.floor(Math.random() * 5) + 3,
            weight: Math.floor(Math.random() * 500) + 200
        },
        seo: {
            metaTitle: `${template.namePrefix} - ${brand} | Buy Online`,
            metaDescription: `Buy ${template.namePrefix} from ${brand}. ${template.shortDescription}. Free shipping available.`,
            metaKeywords: [...template.tags, brand.toLowerCase(), 'online shopping']
        },
        status: 'active',
        isActive: true,
        isFeatured,
        isNewArrival,
        isBestseller,
        tags: template.tags,
        ratings: {
            average: parseFloat((Math.random() * 2 + 3).toFixed(1)), // 3.0 to 5.0
            count: Math.floor(Math.random() * 500) + 10
        },
        sales: {
            totalSold: Math.floor(Math.random() * 1000),
            views: Math.floor(Math.random() * 5000) + 100,
            lastSoldAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)) // Random date in last 30 days
        }
    };
}

// Main seeder function
async function seedProducts() {
    try {
        console.log('🌱 Starting product seeding...');


        const shouldClear = process.argv.includes('--clear');
        if (shouldClear) {
            await Product.deleteMany({});
            console.log('🗑️  Cleared existing products');
        }

        // Get categories (you need to have categories in your database)
        const categories = await Category.find({}).limit(8);

        if (categories.length === 0) {
            console.error('❌ No categories found. Please seed categories first.');
            process.exit(1);
        }

        console.log(`📦 Found ${categories.length} categories`);

        // Generate products
        const products = [];
        const productsPerTemplate = 5; // Generate 5 products per template

        productTemplates.forEach((template, templateIndex) => {
            for (let i = 0; i < productsPerTemplate; i++) {
                const categoryId = categories[Math.floor(Math.random() * categories.length)]._id;
                const product = generateProduct(template, categoryId, templateIndex * productsPerTemplate + i);
                products.push(product);
            }
        });

        // Insert products
        console.log(`📝 Inserting ${products.length} products...`);
        const insertedProducts = await Product.insertMany(products);

        console.log(`✅ Successfully inserted ${insertedProducts.length} products`);

        // Add related products
        console.log('🔗 Adding related products...');
        for (const product of insertedProducts) {
            const relatedProducts = await Product.find({
                _id: { $ne: product._id },
                category: product.category
            })
                .limit(5)
                .select('_id');

            product.relatedProducts = relatedProducts.map(p => p._id);
            await product.save();
        }

        console.log('✅ Related products added');

        // Display summary
        console.log('\n📊 Seeding Summary:');
        console.log(`Total Products: ${insertedProducts.length}`);
        console.log(`Featured Products: ${insertedProducts.filter(p => p.isFeatured).length}`);
        console.log(`New Arrivals: ${insertedProducts.filter(p => p.isNewArrival).length}`);
        console.log(`Bestsellers: ${insertedProducts.filter(p => p.isBestseller).length}`);
        console.log(`Total Variants: ${insertedProducts.reduce((sum, p) => sum + p.variants.length, 0)}`);

        console.log('\n🎉 Seeding completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding products:', error);
        process.exit(1);
    }
}

// Run seeder
// if (require.main === module) {
//   seedProducts();
// }

module.exports = seedProducts;
const mongoose = require('mongoose');
const Category = require('../models/Category');

const seedCategories = async () => {
    try {
        console.log('🌱 Starting category seeding...');

        // Clear existing categories
        await Category.deleteMany({});
        console.log('✅ Cleared existing categories');

        // Main Categories (Level 0)
        const mainCategories = [
            {
                name: 'Casual Wear',
                description: 'Comfortable everyday clothing for men',
                image: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f',
                level: 0,
                displayOrder: 1,
                showOnHomepage: true,
                isFeatured: true,
                seo: {
                    metaTitle: "Men's Casual Wear - Trendy & Comfortable",
                    metaDescription: "Shop the latest collection of men's casual wear including t-shirts, jeans, and more",
                    metaKeywords: ['casual wear', "men's fashion", 'comfortable clothing']
                }
            },
            {
                name: 'Formal Wear',
                description: 'Professional attire for business and special occasions',
                image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf',
                level: 0,
                displayOrder: 2,
                showOnHomepage: true,
                isFeatured: true,
                seo: {
                    metaTitle: "Men's Formal Wear - Elegant & Professional",
                    metaDescription: "Discover premium formal wear for men including suits, shirts, and trousers",
                    metaKeywords: ['formal wear', 'business attire', 'suits']
                }
            },
            {
                name: 'Ethnic Wear',
                description: 'Traditional Indian clothing for men',
                image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a',
                level: 0,
                displayOrder: 3,
                showOnHomepage: true,
                isFeatured: true,
                seo: {
                    metaTitle: "Men's Ethnic Wear - Traditional Indian Clothing",
                    metaDescription: "Shop authentic ethnic wear including kurtas, sherwanis, and more",
                    metaKeywords: ['ethnic wear', 'kurta', 'sherwani', 'traditional clothing']
                }
            },
            {
                name: 'Sportswear',
                description: 'Athletic and gym wear for active lifestyle',
                image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438',
                level: 0,
                displayOrder: 4,
                showOnHomepage: true,
                isFeatured: false,
                seo: {
                    metaTitle: "Men's Sportswear - Performance Athletic Wear",
                    metaDescription: "High-quality sportswear for fitness enthusiasts and athletes",
                    metaKeywords: ['sportswear', 'gym wear', 'athletic clothing']
                }
            },
            {
                name: 'Winter Wear',
                description: 'Stay warm with our winter collection',
                image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5',
                level: 0,
                displayOrder: 5,
                showOnHomepage: false,
                isFeatured: false,
                seo: {
                    metaTitle: "Men's Winter Wear - Jackets & Sweaters",
                    metaDescription: "Explore warm and stylish winter clothing for men",
                    metaKeywords: ['winter wear', 'jackets', 'sweaters', 'hoodies']
                }
            },
            {
                name: 'Accessories',
                description: 'Complete your look with our accessories',
                image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
                level: 0,
                displayOrder: 6,
                showOnHomepage: true,
                isFeatured: false,
                seo: {
                    metaTitle: "Men's Accessories - Watches, Belts & More",
                    metaDescription: "Premium accessories to complement your style",
                    metaKeywords: ['accessories', 'watches', 'belts', 'wallets']
                }
            }
        ];

        const createdMainCategories = await Category.insertMany(mainCategories);
        console.log(`✅ Created ${createdMainCategories.length} main categories`);

        // Get IDs for subcategories
        const casualWear = createdMainCategories.find(c => c.name === 'Casual Wear');
        const formalWear = createdMainCategories.find(c => c.name === 'Formal Wear');
        const ethnicWear = createdMainCategories.find(c => c.name === 'Ethnic Wear');
        const sportswear = createdMainCategories.find(c => c.name === 'Sportswear');
        const winterWear = createdMainCategories.find(c => c.name === 'Winter Wear');
        const accessories = createdMainCategories.find(c => c.name === 'Accessories');

        // Subcategories (Level 1)
        const subCategories = [
            // Casual Wear Subcategories
            {
                name: 'T-Shirts',
                description: 'Stylish t-shirts for everyday wear',
                image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab',
                parentCategory: casualWear._id,
                level: 1,
                displayOrder: 1,
                showOnHomepage: true,
                isFeatured: true
            },
            {
                name: 'Jeans',
                description: 'Premium denim jeans in various fits',
                image: 'https://images.unsplash.com/photo-1542272604-787c3835535d',
                parentCategory: casualWear._id,
                level: 1,
                displayOrder: 2,
                showOnHomepage: true,
                isFeatured: false
            },
            {
                name: 'Shorts',
                description: 'Comfortable shorts for casual outings',
                image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b',
                parentCategory: casualWear._id,
                level: 1,
                displayOrder: 3,
                showOnHomepage: false,
                isFeatured: false
            },
            {
                name: 'Casual Shirts',
                description: 'Relaxed fit shirts for casual occasions',
                image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c',
                parentCategory: casualWear._id,
                level: 1,
                displayOrder: 4,
                showOnHomepage: false,
                isFeatured: false
            },
            // Formal Wear Subcategories
            {
                name: 'Formal Shirts',
                description: 'Crisp formal shirts for office and events',
                image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf',
                parentCategory: formalWear._id,
                level: 1,
                displayOrder: 1,
                showOnHomepage: true,
                isFeatured: true
            },
            {
                name: 'Trousers',
                description: 'Formal trousers for professional look',
                image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a',
                parentCategory: formalWear._id,
                level: 1,
                displayOrder: 2,
                showOnHomepage: true,
                isFeatured: false
            },
            {
                name: 'Suits & Blazers',
                description: 'Premium suits and blazers',
                image: 'https://images.unsplash.com/photo-1594938291221-94f18cbb5660',
                parentCategory: formalWear._id,
                level: 1,
                displayOrder: 3,
                showOnHomepage: false,
                isFeatured: true
            },
            // Ethnic Wear Subcategories
            {
                name: 'Kurtas',
                description: 'Traditional kurtas for ethnic occasions',
                image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c',
                parentCategory: ethnicWear._id,
                level: 1,
                displayOrder: 1,
                showOnHomepage: true,
                isFeatured: true
            },
            {
                name: 'Sherwanis',
                description: 'Elegant sherwanis for weddings',
                image: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a',
                parentCategory: ethnicWear._id,
                level: 1,
                displayOrder: 2,
                showOnHomepage: false,
                isFeatured: false
            },
            {
                name: 'Nehru Jackets',
                description: 'Modern nehru jackets',
                image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633',
                parentCategory: ethnicWear._id,
                level: 1,
                displayOrder: 3,
                showOnHomepage: false,
                isFeatured: false
            },
            // Sportswear Subcategories
            {
                name: 'Track Pants',
                description: 'Comfortable track pants for workouts',
                image: 'https://images.unsplash.com/photo-1552346154-21d32810aba3',
                parentCategory: sportswear._id,
                level: 1,
                displayOrder: 1,
                showOnHomepage: false,
                isFeatured: false
            },
            {
                name: 'Sports T-Shirts',
                description: 'Breathable sports t-shirts',
                image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7',
                parentCategory: sportswear._id,
                level: 1,
                displayOrder: 2,
                showOnHomepage: false,
                isFeatured: false
            },
            // Winter Wear Subcategories
            {
                name: 'Jackets',
                description: 'Stylish winter jackets',
                image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5',
                parentCategory: winterWear._id,
                level: 1,
                displayOrder: 1,
                showOnHomepage: true,
                isFeatured: true
            },
            {
                name: 'Sweaters',
                description: 'Cozy sweaters for cold weather',
                image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27',
                parentCategory: winterWear._id,
                level: 1,
                displayOrder: 2,
                showOnHomepage: true,
                isFeatured: false
            },
            {
                name: 'Hoodies',
                description: 'Trendy hoodies for casual comfort',
                image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7',
                parentCategory: winterWear._id,
                level: 1,
                displayOrder: 3,
                showOnHomepage: false,
                isFeatured: false
            },
            // Accessories Subcategories
            {
                name: 'Watches',
                description: 'Premium watches for men',
                image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
                parentCategory: accessories._id,
                level: 1,
                displayOrder: 1,
                showOnHomepage: true,
                isFeatured: true
            },
            {
                name: 'Belts',
                description: 'Leather and fabric belts',
                image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62',
                parentCategory: accessories._id,
                level: 1,
                displayOrder: 2,
                showOnHomepage: false,
                isFeatured: false
            },
            {
                name: 'Wallets',
                description: 'Stylish wallets and cardholders',
                image: 'https://images.unsplash.com/photo-1627123424574-724758594e93',
                parentCategory: accessories._id,
                level: 1,
                displayOrder: 3,
                showOnHomepage: false,
                isFeatured: false
            },
            {
                name: 'Sunglasses',
                description: 'Trendy sunglasses for men',
                image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083',
                parentCategory: accessories._id,
                level: 1,
                displayOrder: 4,
                showOnHomepage: true,
                isFeatured: false
            }
        ];

        const createdSubCategories = await Category.insertMany(subCategories);
        console.log(`✅ Created ${createdSubCategories.length} subcategories`);

        console.log('\n✨ Category seeding completed successfully!');
        console.log(`📊 Total categories: ${createdMainCategories.length + createdSubCategories.length}`);
        
        return {
            mainCategories: createdMainCategories,
            subCategories: createdSubCategories
        };
    } catch (error) {
        console.error('❌ Error seeding categories:', error);
        throw error;
    }
};

// // Run the seeder
// if (require.main === module) {
//     mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ecommerce', {
//         useNewUrlParser: true,
//         useUnifiedTopology: true
//     })
//     .then(async () => {
//         console.log('✅ MongoDB connected');
      
//         await mongoose.connection.close();
//         console.log('👋 Database connection closed');
//         process.exit(0);
//     })
//     .catch(error => {
//         console.error('❌ MongoDB connection error:', error);
//         process.exit(1);
//     });
// }

module.exports = seedCategories;
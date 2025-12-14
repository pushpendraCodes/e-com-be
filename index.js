const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./database/db");
const http = require("http")
const app = express();
app.use(cors({ origin: "*", optionsSuccessStatus: 200 }));
app.use(express.json());
const port = process.env.PORT || 4000;
connectDB();


const customerRoutes  = require("./routes/userRoutes")
const admiinAuthRoutes  = require("./routes/adminAuthRoutes")
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const orderRoutes = require("./routes/orderRoutes")
const cartRoutes = require("./routes/cartRoutes")
const wishlistRoutes = require("./routes/wishlistRoutes")

app.get("/", (req, res) => {
  res.send("Welcome to E-Commerce Portal");
});


app.use("/api/customer" ,customerRoutes )
app.use('/api/customer/wishlist', wishlistRoutes);
app.use('/api/customer/cart', cartRoutes);
app.use("/api/admin/auth" ,admiinAuthRoutes )
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/orders', orderRoutes);



app.listen(port, () => {
  console.log(`Server running on port ${port}`);

});
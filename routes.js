const express = require('express');
const Product = require('./models/Product');
const User = require('./models/User');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const router = express.Router();
const Category = require('./models/Category');
const Order = require('./models/Order');

// Utility function to validate ObjectId
const isValidObjectId = (id) => id && mongoose.Types.ObjectId.isValid(id);

// 🟢 Multer Configuration
const storage = multer.diskStorage({
    destination: './image/',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage });

// 🟢 Product Routes
router.get('/products', async (req, res) => {
    try {
        const category = req.query.category || '';
        const search = req.query.search || '';
        let filter = {};

        // Nếu có lọc theo danh mục
        if (category) {
            const categoryExists = await Category.findById(category);
            if (!categoryExists) {
                return res.redirect('/products?error=invalid-category');
            }
            filter.category = category;
        }

        // Nếu có từ khóa tìm kiếm
        if (search) {
            filter.name = { $regex: search, $options: 'i' }; // tìm không phân biệt hoa thường
        }

        const products = await Product.find(filter);

        res.render('products', {
            products,
            category,
            search, // Gửi search về view để hiện lại ô tìm kiếm
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).send('Server error!');
    }
});


router.post('/api/products', async (req, res) => {
    try {
        const { name, description, price, stock, category } = req.body;
        const newProduct = new Product({ name, description, price, stock, category });
        await newProduct.save();
        res.send('Product added successfully!');
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).send('Server error!');
    }
});

router.get('/products/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.redirect('/products?error=invalid-id');
        }

        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).send('Product not found');
        }

        res.render('productDetail', { product });
    } catch (error) {
        console.error('Error fetching product details:', error);
        res.status(500).send('Server error!');
    }
});

router.get('/products/category', async (req, res) => {
    try {
        const categoryName = req.query.category || '';
        if (!categoryName) {
            return res.status(400).send('Invalid category name!');
        }

        const category = await Category.findOne({ name: categoryName });
        if (!category) {
            return res.status(404).send('Category not found!');
        }

        const products = await Product.find({ category: category._id });
        res.render('products', { products, category: categoryName });
    } catch (error) {
        console.error('Error fetching products by category:', error);
        res.status(500).send('Server error!');
    }
});

// 🟢 Cart Routes
router.get('/cart', (req, res) => {
    res.render('cart', { cart: req.session.cart || [] });
});

router.post('/cart/add/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).send('Invalid product ID!');
        }

        const product = await Product.findById(id);
        if (!product) return res.status(404).send('Product not found!');
        if (!req.session.cart) req.session.cart = [];

        const cart = req.session.cart;
        const existingProduct = cart.find(p => p._id.toString() === product._id.toString());

        if (existingProduct) {
            existingProduct.quantity += 1;
        } else {
            cart.push({
                _id: product._id.toString(),
                name: product.name,
                price: product.price,
                quantity: 1,
                image: product.image || "/image/default.jpg"
            });
        }

        req.session.cart = cart;
        res.redirect('/cart');
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).send('Server error!');
    }
});

router.post('/cart/update/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.query;

        if (!req.session.cart) req.session.cart = [];

        const cart = req.session.cart;
        const product = cart.find(p => p._id.toString() === id);

        if (product) {
            if (action === "increase") product.quantity += 1;
            else if (action === "decrease" && product.quantity > 1) product.quantity -= 1;
        }

        req.session.cart = cart;
        res.redirect('/cart');
    } catch (error) {
        console.error('Error updating cart:', error);
        res.status(500).send('Server error!');
    }
});

router.post('/cart/remove/:id', (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).send('Invalid product ID!');
        }

        if (!req.session.cart) req.session.cart = [];
        req.session.cart = req.session.cart.filter(p => p._id.toString() !== id);
        res.redirect('/cart');
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).send('Server error!');
    }
});

// 🟢 Checkout Route
// Route xử lý checkout
// Route GET - Hiển thị form checkout
router.get('/cart/checkout', (req, res) => {
    const cart = req.session.cart || [];
    console.log('Cart Data:', cart); // Debugging: Log cart data
    if (cart.length === 0) {
        return res.redirect('/cart'); // Redirect if cart is empty
    }
    try {
        res.render('checkout', { cart, errorMessage: null }); // Pass cart and errorMessage to the view
    } catch (error) {
        console.error('Error rendering checkout form:', error);
        res.status(500).send('Error displaying checkout form!');
    }
});

// Route POST - Xử lý thanh toán
router.post('/cart/checkout', async (req, res) => {
    const { address, paymentMethod } = req.body;
    const cart = req.session.cart || [];

    if (!address || !paymentMethod) {
        return res.status(400).render('checkout', {
            cart,
            errorMessage: 'Vui lòng nhập đầy đủ thông tin!',
        });
    }

    if (cart.length === 0) {
        return res.redirect('/cart');
    }

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Tạo đơn hàng mới
    const newOrder = new Order({
        customer: {
            name: req.session.user?.name || 'Khách hàng',
            email: req.session.user?.email || 'khachhang@example.com',
        },
        address,
        paymentMethod,
        items: cart,
        total,
    });

    try {
        await newOrder.save(); // ⬅️ Lưu vào MongoDB
        req.session.cart = []; // Xóa giỏ hàng
        res.render('checkoutSuccess', { order: newOrder }); // Gửi dữ liệu cho view
    } catch (err) {
        console.error('❌ Error saving order:', err);
        res.status(500).send('Lỗi khi lưu đơn hàng. Vui lòng thử lại sau!');
    }
});




// 🟢 User Authentication Routes
router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).send('Email already in use!');

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        res.redirect('/login');
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).send('Server error!');
    }
});

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).send('Invalid email or password!');
        }
        
        req.session.user = user;

        req.session.successMessage = 'Đăng nhập thành công!';
        res.redirect('/products');
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).send('Server error!');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;

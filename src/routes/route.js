const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth")
const userController = require("../controllers/userController");
const productController = require('../controllers/productController')
const cartController = require('../controllers/cartController')
const orderController = require('../controllers/orderController')

//=============================================USER==============================================

//------------ user registration -----------------
router.post("/register", userController.createUser);

//------------------- user login -----------------
router.post("/login", userController.loginUser);

//------------ get user by user ID ----------------
router.get("/user/:userId/profile", auth.authentication, userController.getUser)

//----------------- update User profile ------------------
router.put("/user/:userId/profile", auth.authentication, auth.authorization, userController.updateUser)


//==========================================PRODUCT==============================================

//----------------create product--------------------------
router.post("/products", productController.createProduct);

//------------ get product  -----------
router.get("/products", productController.productDetail)

//------------ get product by product ID -----------
router.get("/products/:productId", productController.getProductById)

//--------------update product by product ID-------
router.put("/products/:productId", productController.updateProduct)

//--------------delete  product by product ID-------
router.delete("/products/:productId", productController.deleteProductById)


//==========================================CART==============================================

//----------------create cart--------------------------
router.post("/users/:userId/cart", auth.authentication, auth.authorization, cartController.createCart)

//--------------update cart by user ID-------
router.put("/users/:userId/cart", auth.authentication, auth.authorization, cartController.updateCart)

//--------------get cart by user ID-------
router.get("/users/:userId/cart", auth.authentication, auth.authorization, cartController.getCart)

//--------------delete cart by user ID-------
router.delete("/users/:userId/cart", auth.authentication, auth.authorization, cartController.deleteCart)


//==========================================ORDER==============================================

router.post("/users/:userId/orders", auth.authentication, auth.authorization, orderController.createOrder)

router.put("/users/:userId/orders", auth.authentication, auth.authorization, orderController.updateOrder)


module.exports = router
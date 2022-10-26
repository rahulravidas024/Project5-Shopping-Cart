const mongoose = require("mongoose")
const productModel = require("../models/productModel")
const cartModel = require("../models/cartModel")
const validation = require("../validations/validation")

const createCart = async function (req, res) {
    try {
        const userId = req.params.userId
        const data = req.body
        const { productId, cartId } = data

        if (!validation.isValidRequestBody(data)) {
            return res.status(400).send({ status: false, message: "please provide some details" })
        }

        if (!validation.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Product ID is not valid, please enter correct product ID" })
        }

        const checkProductId = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!checkProductId) {
            return res.status(404).send({ status: false, message: "Product ID not found, please use another product ID" })
        }

        const cartData = await cartModel.findOne({ userId: userId })

        if (!cartData) {
            const filter = {}

            filter.userId = userId

            const itemArray = []
            itemArray.push({ productId: productId, quantity: 1 })

            filter.items = itemArray
            filter.totalPrice = checkProductId.price
            filter.totalItems = itemArray.length

            const create = await cartModel.create(filter)
            return res.status(201).send({ status: true, message: "Success", data: create })
        }


        if (!data.hasOwnProperty("cartId")) {
            return res.status(400).send({ status: false, message: "The cart is already present for this user, please enter cartId" })
        }

        if (!validation.isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, message: "Cart ID is not valid, please enter correct cart ID" })
        }

        if (cartData._id.toString() !== cartId) {
            return res.status(400).send({ status: false, message: "Cart ID does not belongs to this user, please use correct cart ID" })
        }

        const productIdList = cartData.items.map(x => x.productId)

        if (productIdList.find(id => id.toString() == productId)) {
            const update = await cartModel.findOneAndUpdate(
                { userId: userId, "items.productId": productId },
                { $inc: { totalPrice: +checkProductId.price, "items.$.quantity": +1 } },
                { new: true }
            ).select({ _id: 0, items: 1, totalPrice: 1, totalItems: 1 })

            return res.status(201).send({ status: true, message: "Success", data: update })
        }

        const update = await cartModel.findOneAndUpdate(
            { userId: userId },
            {
                $addToSet: { items: { productId: productId, quantity: 1 } },
                $inc: { totalPrice: +checkProductId.price, totalItems: +1 }
            },
            { new: true }
        ).select({ _id: 0, items: 1, totalPrice: 1, totalItems: 1 })

        return res.status(201).send({ status: true, message: "Success", data: update })

    }
    catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}


const updateCart = async function (req, res) {
    try {
        const userId = req.params.userId
        const data = req.body
        let { cartId, productId, removeProduct } = data

        if (!validation.isValidRequestBody(data)) {
            return res.status(400).send({ status: false, message: "provide some data to update cart" })
        }

        if (!cartId) {
            return res.status(400).send({ status: false, message: "cartId is requied" })
        }
        if (!validation.isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, message: "Cart ID is not valid, please enter correct cart ID" })
        }

        const checkCart = await cartModel.findOne({ userId: userId })
        if (!checkCart) {
            return res.status(404).send({ status: false, message: "Cart ID not found" })
        }

        if (checkCart._id.toString() !== cartId) {
            return res.status(400).send({ status: false, message: "Cart ID does not belongs to this user, please use correct cart ID" })
        }

        if (!productId) {
            return res.status(400).send({ status: false, message: "productId is requied" })
        }

        if (!validation.isValidObjectId(productId)) {
            return res.status(400).send({ status: false, message: "Product ID is not valid, please enter correct product ID" })
        }

        const checkProductId = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!checkProductId) {
            return res.status(404).send({ status: false, message: "Product ID not found, please use another product ID" })
        }

        if (removeProduct === undefined) {
            return res.status(400).send({ status: false, message: "remove product key is required" })
        }

        if (removeProduct !== 0 && removeProduct !== 1) {
            return res.status(400).send({ status: false, message: "remove product must be 0 and 1 and should be a number" })
        }

        let itemList = checkCart.items
        let productIdList = itemList.map(x => x.productId.toString())

        let index = productIdList.indexOf(productId)

        if (index == -1) {
            return res.status(404).send({ status: false, message: "Product Does Not Exist In Cart" })
        }

        let totalProductPrice = itemList[index].quantity * checkProductId.price

        if (removeProduct == 0 || itemList[index].quantity == 1) {
            const update = await cartModel.findOneAndUpdate(
                { userId: userId, "items.productId": productId },
                {
                    $pull: { items: { productId: productId } },
                    $inc: { totalPrice: -totalProductPrice.toFixed(2), totalItems: -1 }
                },
                { new: true }
            ).select({ _id: 0, items: 1, totalPrice: 1, totalItems: 1 })

            return res.status(200).send({ status: true, message: "Success", data: update })
        }


        if (removeProduct == 1) {
            const update = await cartModel.findOneAndUpdate(
                { userId: userId, "items.productId": productId },
                { $inc: { totalPrice: -checkProductId.price, "items.$.quantity": -1 } },
                { new: true }
            ).select({ _id: 0, items: 1, totalPrice: 1, totalItems: 1 })

            return res.status(200).send({ status: true, message: "Success", data: update })
        }

    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}


const getCart = async function (req, res) {
    try {
        let userId = req.params.userId
        
        let cartDetails = await cartModel.findOne({ userId: userId }).populate("items.productId").select({ _id: 0, items: 1, totalPrice: 1, totalItems: 1 })

        if (!cartDetails){
            return res.status(404).send({ status: false, message: "Cart Does Not Exist" })
        }

        return res.status(200).send({ status: true, message: "Success", data: cartDetails })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}


const deleteCart = async function (req, res) {
    try {
        userId = req.params.userId

        let checkId = await cartModel.findOne({ userId: userId })
        if (!checkId) {
            return res.status(404).send({ status: false, msg: "Cart Does Not Exist" })
        }
        if (checkId.totalItems == 0) {
            return res.status(404).send({ status: false, msg: "Cart Does Not Exist" })
        }

        let delCart = await cartModel.findOneAndUpdate(
            { userId: userId },
            { $set: { items: [], totalItems: 0, totalPrice: 0 } },
            { $new: true })

        return res.status(204).send({ status: true, msg: "cart deleted successfully" })
    }
    catch (err) {
        return res.status(500).send({ status: false, msg: err.message })
    }
}


module.exports = { createCart, updateCart, getCart, deleteCart }
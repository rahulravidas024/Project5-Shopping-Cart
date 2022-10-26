const mongoose = require("mongoose")
const cartModel = require("../models/cartModel")
const orderModel = require("../models/orderModel")
const validation = require("../validations/validation")

const createOrder = async function (req, res) {
    try {
        const userId = req.params.userId
        const data = req.body
        const { cartId, cancellable, ...rest } = data

        if (!validation.isValidRequestBody(data)) {
            return res.status(400).send({ status: false, message: "please provide some details" })
        }

        if (validation.isValidRequestBody(rest)) {
            return res.status(400).send({ status: false, message: 'only cart ID is needed and cancellable is optional ' })
        }

        if (!cartId) {
            return res.status(400).send({ status: false, message: "cartId is requied" })
        }
        if (!validation.isValidObjectId(cartId)) {
            return res.status(400).send({ status: false, message: "Cart ID is not valid, please enter correct cart ID" })
        }

        const checkCart = await cartModel.findOne({ _id: cartId, userId: userId }).select({ _id: 0, items: 1, totalPrice: 1, totalItems: 1 })

        if (!checkCart) {
            return res.status(404).send({ status: false, message: "Cart ID not found, please use correct cart ID" })
        }

        if (checkCart.items.length == 0) {
            return res.status(404).send({ status: false, message: "product not found in the cart, please add product to placed order" })
        }

        let filter = {}
        filter.userId = userId
        filter.items = checkCart.items
        filter.totalPrice = checkCart.totalPrice
        filter.totalItems = checkCart.totalItems

        let tempArray = checkCart.items.map(x => x.quantity)

        console.log(tempArray);
        let quantitySum = 0
        for (let i = 0; i < tempArray.length; i++) {
            quantitySum = quantitySum + tempArray[i]
        }

        filter.totalQuantity = quantitySum

        if (cancellable) {
            if (!validation.isValidBoolean(cancellable)) {
                return res.status(400).send({ status: false, message: "please provide only boolean value (true or false) in cancellable " })
            }

            filter.cancellable = JSON.parse(cancellable.toLowerCase())
        } else {
            filter.cancellable = true
        }

        filter.status = 'pending'

        const create = await orderModel.create(filter)
        res.status(201).send({ status: true, message: "Success", data: create })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}


const updateOrder = async function (req, res) {
    try {

        const userId = req.params.userId
        const data = req.body
        const { orderId, status } = data

        if (!validation.isValidRequestBody(data)) {
            return res.status(400).send({ status: false, message: "please provide some details" })
        }

        if (!data.hasOwnProperty('orderId')) {
            return res.status(400).send({ status: false, message: "Order Id Should Be Present In RequestBody" })
        }

        if (!validation.isValidObjectId(orderId)) {
            return res.status(400).send({ status: false, message: "Order ID is not valid, please enter correct order ID" })
        }

        const checkOrderId = await orderModel.findOne({ _id: orderId, isDeleted: false })
        if (!checkOrderId) {
            return res.status(404).send({ status: false, message: "Order ID not found, please use another order ID" })
        }

        if (checkOrderId.userId.toString() !== userId) {
            return res.status(400).send({ status: false, message: "Order ID does not belongs to this user, please use correct order ID" })
        }

        if (!data.hasOwnProperty('status')) {
            return res.status(400).send({ status: false, message: "Status Should Be Present In RequestBody" })
        }

        if (!["completed", "canceled"].includes(status)) {
            return res.status(400).send({ status: false, message: "please provide only completed or canceled in status" })
        }

        if (checkOrderId.status == 'completed' || checkOrderId.status == 'canceled') {
            return res.status(400).send({ status: false, message: `Th order has been already ${checkOrderId.status} ` })
        }

        if (checkOrderId.cancellable == false && status == "canceled") {
            return res.status(400).send({ status: false, message: "You cannot cancel this order" })
        }

        const update = await orderModel.findOneAndUpdate(
            { _id: orderId },
            { $set: { status: status } },
            { new: true }
        )

        res.status(200).send({ status: true, message: "Success", data: update })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

module.exports = { createOrder, updateOrder }
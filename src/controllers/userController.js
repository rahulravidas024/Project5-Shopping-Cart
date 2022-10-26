const mongoose = require('mongoose')
const userModel = require("../models/userModel")
const validation = require("../validations/validation")
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken')
const aws = require('aws-sdk')
const { uploadFile } = require("./awsUpload")

//----------------------------------create User/ post"register"----------------------------

const createUser = async function (req, res) {

    try {
        let data = req.body;

        let { fname, lname, email, password, phone, address, profileImage } = data

        if (!validation.isValidRequestBody(data))
            return res.status(400).send({ status: false, msg: "please provide  details" })

        if (!validation.isValid(fname))
            return res.status(400).send({ status: false, message: "first name is required or not valid" })

        if (!validation.isValidName(fname))
            return res.status(400).send({ status: false, message: "first name is not valid" })

        if (!validation.isValid(lname))
            return res.status(400).send({ status: false, message: "last name is required or not valid" })

        if (!validation.isValidName(lname))
            return res.status(400).send({ status: false, message: "last name is not valid" })

        if (!validation.isValid(email))
            return res.status(400).send({ status: false, message: "email is required " })

        if (!validation.isValidEmail(email))
            return res.status(400).send({ status: false, message: "email is not valid" })

        let checkEmail = await userModel.findOne({ email: email })

        if (checkEmail) return res.status(409).send({ status: false, msg: "This email has already been registered" })

        let file = req.files
        if (file.length > 0) {
            let uploadedFileURL = await uploadFile(file[0])
            data['profileImage'] = uploadedFileURL

            if (!validation.isValidImage(uploadedFileURL)) { return res.status(400).send({ status: false, message: "please provide profile Image in jpg,png,jpeg format" }) }
        }

        else return res.status(400).send({ status: false, message: "please select a profile Image" })

        if (!validation.isValid(phone))
            return res.status(400).send({ status: false, message: "phone No. is required " })

        if (!validation.isValidPhone(phone))
            return res.status(400).send({ status: false, message: "Please provide a valid Indian phone No." })

        let checkPhone = await userModel.findOne({ phone: phone })

        if (checkPhone) return res.status(409).send({ status: false, msg: "This phone No. has already been registered" })

        if (!validation.isValid(password))
            return res.status(400).send({ status: false, message: "Pasworrd is required or not valid" })

        if (!validation.isValidPassword(password))
            return res.status(400).send({ status: false, message: "Password length should be 8 to 15 digits and enter atleast one uppercase or lowercase" })


        if (!address) return res.status(400).send({ status: false, msg: "address requried" })

        let Fulladdress;
        try {
            Fulladdress = JSON.parse(address)
        } catch (err) {
            if (err) {
                return res.status(400).send({ status: false, message: "please enter the address in right format" })
            }
        }

        if (!validation.isValid(Fulladdress.shipping.street)) {
            return res.status(400).send({ status: false, message: "street field is required or not valid" })
        }

        if (!validation.isValid(Fulladdress.shipping.city)) {
            return res.status(400).send({ status: false, message: "city field is required or not valid" })

        }

        if (!validation.isValid(Fulladdress.shipping.pincode)) {
            return res.status(400).send({ status: false, message: "pincode field is required or not valid" })

        }

        if (!validation.isValidPincode(Fulladdress.shipping.pincode)) {
            return res.status(400).send({ status: false, message: "PIN code should contain 6 digits only " })
        }


        if (!Fulladdress.billing) return res.status(400).send({ status: false, message: "billing field is required or not valid" })

        if (!validation.isValid(Fulladdress.billing.street)) {
            return res.status(400).send({ status: false, message: "street field is required or not valid" })
        }

        if (!validation.isValid(Fulladdress.billing.city)) {
            return res.status(400).send({ status: false, message: "city field is required or not valid" })
        }

        if (!validation.isValid(Fulladdress.billing.pincode)) {
            return res.status(400).send({ status: false, message: "pincode field is required or not valid" })
        }

        if (!validation.isValidPincode(Fulladdress.billing.pincode)) {
            return res.status(400).send({ status: false, message: "PIN code should contain 6 digits only " })

        }
        data.address = Fulladdress


        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)
        data.password = hashedPassword

        let createData = await userModel.create(data)
        return res.status(201).send({ status: true, message: "User created successfully", data: createData })

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })

    }
}

//-------------------------------------login User/post(login) --------------------------------
const loginUser = async function (req, res) {
    try {

        const requestBody = req.body;

        if (!validation.isValidRequestBody(requestBody)) {
            return res.status(400).send({
                status: false,
                message: " Please provide login credentials",
            });
        }

        let { email, password } = requestBody;

        if (!email) {
            return res.status(400).send({
                status: false,
                message: `Email is required`
            });
        }
        if (!validation.isValidEmail(email)) {
            return res.status(400).send({
                status: false,
                message: `Provide valid email address`,
            });
        }

        if (!password) {
            return res.status(400).send({
                status: false,
                message: `Password is required`
            });
        }
        if (!validation.isValidPassword(password)) {
            return res.status(400).send({
                status: false,
                message: "Please enter a valid password"
            });
        }

        let user = await userModel.findOne({ email: email })
        if (!user) {
            return res.status(404).send({ status: false, message: "Invalid credentials" })
        }

        let userPass = user.password
        let checkPass = await bcrypt.compare(password, userPass)
        if (!checkPass) { return res.status(400).send({ status: false, message: "Invalid password" }) }

        let token = jwt.sign(
            {
                userId: user._id.toString(),
                Team: "Group 66",
                organisation: "FunctionUp"

            },
            "functionup-plutonium-productsManagement-Project66-secret-key", { expiresIn: '1h' }
        );

        res.send({ status: true, msg: "login successful", data: { token: token, userId: user._id } });

    } catch (error) {
        return res.status(500).send({ status: false, msg: error.message })
    }
};


//--------------------------------- get(/user/:userId/profile)-------------------------------

const getUser = async function (req, res) {
    try {
        const userId = req.params.userId

        if (!validation.isValidObjectId(userId))
            return res.status(400).send({ status: false, message: "user id is not valid" })

        const user = await userModel.findById(userId)

        if (!user)
            return res.status(404).send({ status: false, message: "user does not exist" })


        return res.status(200).send({ status: true, msssage: "User profile details", data: user })

    } catch (err) {
        return res.status(500).send({ status: false, msg: err.message })
    }

}

//--------------------------updateUser put("/user/:userId/profile")-----------------------------

const updateUser = async function (req, res) {
    try {
        let userId = req.params.userId
        if (!validation.isValidObjectId(userId)) {
            return res.status(400).send({ status: false, message: "userId is not valid" })
        }

        const checkUserId = await userModel.findById(userId)
        if (!checkUserId) {
            return res.status(404).send({ status: false, message: "User ID not found, please user correct user ID " })
        }

        let data = { ...req.body }
        let files = req.files

        if (!validation.isValidRequestBody(data) && !files) {
            return res.status(400).send({ status: false, message: "Invalid request parameters. Please provide updating keys details" })
        }

        let { fname, lname, email, profileImage, phone, password, address } = data
        let filter = {}

        if (data.hasOwnProperty("fname")) {
            if (!validation.isValid(fname)) {
                return res.status(400).send({ status: false, message: "please provide fname in proper format" })
            }
            if (!validation.isValidName(fname)) {
                return res.status(400).send({ status: false, message: "please provide only alphabet in fname" })
            }
            filter.fname = fname
        }

        if (data.hasOwnProperty("lname")) {
            if (!validation.isValid(lname)) {
                return res.status(400).send({ status: false, message: "please provide lname in proper format" })
            }
            if (!validation.isValidName(lname)) {
                return res.status(400).send({ status: false, message: "please provide only alphabet in lname" })
            }
            filter.lname = lname
        }

        if (data.hasOwnProperty("email")) {
            if (!validation.isValidEmail(email)) {
                return res.status(400).send({ status: false, message: "please provide email in proper format" })
            }
            const checkEmail = await userModel.find({ email: email })
            if (checkEmail) {
                return res.status(400).send({ status: false, message: "email is already present" })
            }
            filter.email = email
        }

        if (data.hasOwnProperty("profileImage")) {
            if (!files.length) {
                return res.status(400).send({ status: false, message: "please select some file" })
            }
        }

        if (data.hasOwnProperty("phone")) {
            if (!validation.isValidPhone(phone)) {
                return res.status(400).send({ status: false, message: "please provide only 10 digit number" })
            }
            const checkPhone = await userModel.find({ phone: phone })
            if (checkPhone) {
                return res.status(400).send({ status: false, message: "phone number is already present" })
            }
            filter.phone = phone
        }

        if (data.hasOwnProperty("password")) {
            if (!validation.isValidPassword(password)) {
                return res.status(400).send({ status: false, message: "please provide password in proper format" })
            }
            const salt = await bcrypt.genSalt(10)
            const hashedPassword = await bcrypt.hash(password, salt)
            filter.password = hashedPassword
        }

        let userAddress = await userModel.findById(userId)
        filter.address = userAddress.address

        if (address) {
            try {
                address = JSON.parse(address)

                if (address.shipping) {

                    if (address.shipping.hasOwnProperty("street")) {
                        if (!validation.isValid(address.shipping.street)) {
                            return res.status(400).send({ status: false, message: "please provide street in proper format" })
                        }
                        filter.address.shipping.street = address.shipping.street
                    }

                    if (address.shipping.hasOwnProperty("city")) {
                        if (!validation.isValid(address.shipping.city)) {
                            return res.status(400).send({ status: false, message: "please provide city in proper format" })
                        }
                        if (!validation.isValidName(address.shipping.city)) {
                            return res.status(400).send({ status: false, message: "please provide only alphabet in city" })
                        }
                        filter.address.shipping.city = address.shipping.city
                    }

                    if (address.shipping.hasOwnProperty("pincode")) {
                        if (!validation.isValid(address.shipping.pincode)) {
                            return res.status(400).send({ status: false, message: "please provide pincode in proper format" })
                        }
                        if (!validation.isValidPincode(address.shipping.pincode)) {
                            return res.status(400).send({ status: false, message: "please provide only 6 digit pincode" })
                        }
                        filter.address.shipping.pincode = address.shipping.pincode
                    }
                }

                if (address.billing) {

                    if (address.billing.hasOwnProperty("street")) {
                        if (!validation.isValid(address.billing.street)) {
                            return res.status(400).send({ status: false, message: "please provide street in proper format" })
                        }
                        filter.address.billing.street = address.billing.street
                    }

                    if (address.billing.hasOwnProperty("city")) {
                        if (!validation.isValid(address.billing.city)) {
                            return res.status(400).send({ status: false, message: "please provide city in proper format" })
                        }
                        if (!validation.isValidName(address.billing.city)) {
                            return res.status(400).send({ status: false, message: "please provide only alphabet in city" })
                        }
                        filter.address.billing.city = address.billing.city
                    }

                    if (address.billing.hasOwnProperty("pincode")) {
                        if (!validation.isValid(address.billing.pincode)) {
                            return res.status(400).send({ status: false, message: "please provide pincode in proper format" })
                        }
                        if (!validation.isValidPincode(address.billing.pincode)) {
                            return res.status(400).send({ status: false, message: "please provide only 6 digit pincode" })
                        }
                        filter.address.billing.pincode = address.billing.pincode
                    }
                }
            }
            catch {
                return res.status(400).send({ status: false, message: "please provide address in proper format" })
            }
        }

        if (files && files.length > 0) {
            let uploadedFileURL = await uploadFile(files[0])
            filter.profileImage = uploadedFileURL
        }

        const update = await userModel.findOneAndUpdate(
            { _id: userId },
            { $set: filter },
            { new: true })
        return res.status(200).send({ status: true, message: "User profile updated", data: update })
    }
    catch (error) {
        res.status(500).send({ status: false, message: error.message })
    }
}


module.exports = { createUser, loginUser, getUser, updateUser }
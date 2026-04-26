const { body } = require("express-validator");

const registerValidators = [
  body("fullName").trim().notEmpty().withMessage("Full name is required."),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Invalid email address.")
    .matches(/\.edu(\.tr)?$/i)
    .withMessage("Only .edu or .edu.tr institutional emails are accepted."),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters.")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter.")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one number."),
  body("role")
    .isIn(["engineer", "healthcare"])
    .withMessage("Role must be engineer or healthcare."),
];

const loginValidators = [
  body("email").trim().isEmail().withMessage("Invalid email address."),
  body("password").notEmpty().withMessage("Password is required."),
];

module.exports = { registerValidators, loginValidators };

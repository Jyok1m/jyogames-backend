const { body, param, validationResult } = require("express-validator");

function signInRules() {
  return [
    // Username and password must not be empty
    body(["emailOrUsername", "password"]).notEmpty().withMessage("Username and password are required").trim().escape(),
  ];
}

function signUpRules() {
  return [
    // Username must not be empty
    body("username").notEmpty().withMessage("Username is required").trim().escape(),

    // Email must be valid
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format").trim().escape(),

    // Password must be strong
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .trim()
      .escape()
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters long")
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/)
      .withMessage("Password must include lowercase, uppercase, number, and special character"),
  ];
}

function forgotPwdRules() {
  return [
    // Email must be valid
    body("email").notEmpty().withMessage("Email is required").isEmail().withMessage("Invalid email format").trim().escape(),

    // Language must be valid
    param("lang").notEmpty().withMessage("Language is required").isLocale().withMessage("Invalid language format").escape(),
  ];
}

function resetPwdRules() {
  return [
    // Reset token must be valid
    body("resetToken")
      .notEmpty()
      .withMessage("Reset token is required")
      .isLength({ min: 32, max: 32 })
      .withMessage("Invalid reset token format")
      .escape(),

    // Password must be strong
    body("password").notEmpty().withMessage("Password is required").trim().escape().isLength({ min: 8 }).withMessage,
  ];
}

const validateRules = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error({ errors: errors.array() });
    return res.status(400).json({ error: "Invalid field(s)." });
  }
  next();
};

module.exports = {
  signInRules,
  signUpRules,
  forgotPwdRules,
  validateRules,
};

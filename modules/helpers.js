function isValidObjectId(id) {
  const hexRegExp = /^[0-9a-fA-F]{24}$/;
  return hexRegExp.test(id);
}

module.exports = { isValidObjectId };

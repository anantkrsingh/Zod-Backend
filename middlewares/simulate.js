const simulate = async (req, res, next) => {
  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    next();
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  simulate,
};

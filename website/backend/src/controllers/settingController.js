const Setting = require('../models/Setting');
const asyncHandler = require('../utils/asyncHandler');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.find().sort({ key: 1 });
  res.json({ success: true, settings });
});

const upsertSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { type, value } = req.body;

  const setting = await Setting.findOneAndUpdate(
    { key },
    { $set: { type, value, updatedBy: req.admin._id } },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.json({ success: true, setting });
});

module.exports = { getSettings, upsertSetting };

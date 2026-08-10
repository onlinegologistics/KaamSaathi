const { Joi, pagination } = require('./common');

const MAX_WALLET_AMOUNT = 100000;

const walletAmountSchema = Joi.object({
  body: Joi.object({
    amount: Joi.number().positive().max(MAX_WALLET_AMOUNT).required(),
  }).required(),
  query: Joi.object({}),
  params: Joi.object({}),
});

const listWalletTransactionsSchema = Joi.object({
  body: Joi.object({}),
  query: Joi.object(pagination),
  params: Joi.object({}),
});

module.exports = { walletAmountSchema, listWalletTransactionsSchema };

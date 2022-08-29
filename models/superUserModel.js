const mongoose = require('mongoose');
const validator = require('validator');
const baseUserModel = require('./userBaseModel');
const cryptPassword = require('../utils/cryptPass');
const extendSchema = require('mongoose-extend-schema');

const superUserSchema = extendSchema(
  baseUserModel.schema,
  {
    addedBy: {
      type: String,
      default: 'default',
    },
  },
  { collection: 'superuser' }
);
Object.assign(superUserSchema.methods, baseUserModel.schema.methods);

superUserSchema.pre('save', cryptPassword);

module.exports = mongoose.model('SuperUser', superUserSchema);

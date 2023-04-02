const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    lat : {type: Number, required:true},
    long: {type: Number, required:true},
    filename: {type: String, required: true} 
});

module.exports = mongoose.model('Image', imageSchema);
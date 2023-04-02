require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const PORT =  process.env.PORT || 3500;
const mongoose = require('mongoose');
const multer = require('multer');
const ExifImage = require('exif').ExifImage;
const Image = require('./Image');
const fs = require('fs');
const fsPromises = require('fs').promises;
const imageThumbnail = require('image-thumbnail');

//multer config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'img');
    },
    filename: (req, file, cb) => {
        console.log(file);
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ dest: 'img', storage: storage });

//mongoose connection
const connectDB = async () => {
    try{
        await mongoose.connect(process.env.DATABASE_URI, {dbName: 'imageDB'});
    }catch(err){
        console.error(err);
    }
}
connectDB();

app.get('/fetch/:imgName', (req, res)=>{
    const imgName = req.params.imgName;
    res.sendFile(`./img/${imgName}`, {root: __dirname});
});

app.get('/fetchThumb/:imgName', async (req, res)=>{
    const imgName = req.params.imgName;
    const thumbName = 'thumbnail'+imgName;
    if( !fs.existsSync(path.join('img', thumbName)) ){ 
        try {
            const thumbnail = await imageThumbnail(`./img/${imgName}`);
            await fsPromises.writeFile(path.join('img', thumbName), thumbnail);
        } catch (err) {
            console.error(err);
        }
    }
    res.sendFile(path.join('img', thumbName), {root: __dirname});
});

app.get('/upload', (req, res) => {
    res.sendFile('./upload.html', {root: __dirname});
});

app.post('/upload', upload.array('image'), (req, res)=>{
    req.files.forEach(imgFile => {
        try {
            new ExifImage({ image : path.join('img', imgFile.filename) }, async (error, exifData) => {
                if (error){
                    console.log('Error: '+error.message);
                }else{
                    if(exifData.gps.GPSLatitude !== undefined){
                        // convert from degree minute second format to decimal
                        const latitude = exifData.gps.GPSLatitude[0] + exifData.gps.GPSLatitude[1]/60 + exifData.gps.GPSLatitude[2]/3600;
                        const longtitude = exifData.gps.GPSLongitude[0] + exifData.gps.GPSLongitude[1]/60 + exifData.gps.GPSLongitude[2]/3600;
                        const response = await Image.create({lat: latitude, long: longtitude, filename: imgFile.filename});
                        console.log(response);
                    }else{
                        console.log('no gps exif data!');
                    }
                }
            });
        } catch (error) {
            console.log('Error: ' + error.message);
        }
    })
     res.status(201).send('images uploaded');
});

app.get('/delete/:imgName' , async (req, res) => {
    const imgName = req.params.imgName;
    await fsPromises.unlink(path.join('img', imgName));
    const del = await Image.deleteOne({ filename: imgName });
    console.log(del);
    res.send('image successfully deleted');
});

app.get('/fetchInBounds', async (req, res) => {
    const gteLat  = Number(req.query.gteLat);
    const gteLong = Number(req.query.gteLong);
    const lteLat  = Number(req.query.lteLat);
    const lteLong = Number(req.query.lteLong);
    const found = await Image.find( { 
        $and: [
            {lat: { $gte: gteLat }},
            {long: {$gte: gteLong}},
            {lat: {$lte: lteLat}},
            {long: {$lte: lteLong}}
        ]
    } )
    console.log(found);
    res.status(200).json(found).send("query complete");
});

mongoose.connection.once('open', ()=>{
    console.log('Connected to mongodb');
    app.listen(PORT, () => console.log(`running on port ${PORT}`));
});
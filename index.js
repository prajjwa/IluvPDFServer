const express = require('express')
const app = express()
const multer = require('multer')
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const axios = require('axios')
const FormData = require('form-data')

const port = 3000

app.set('view engine', 'ejs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads')
    },
    filename: (req, file, cb) => {
        const { originalname } = file;
        cb(null, originalname);
    }
})

const upload = multer({ storage });

app.use(express.static('public'));

app.use('/uploads', (req, res, next) => {

    const directory = path.join(__dirname, './uploads');

    fs.readdir(directory, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(directory, file), err => {
                if (err) throw err;
            });
        }
    });

    console.log("afa");

    next();
});

app.get('/', (req, res) => res.render('home.ejs'))

app.get('/convert', (req, res) => res.render('options.ejs', { operation: "CONVERT", info: "Combine PDFs in the order you want with the easiest PDF merger available." }));

app.get('/convert/processing', (req, res) => {

    const formData = new FormData()

    const directory = path.join(__dirname, './uploads');
    var uploadDir = fs.readdirSync(directory);
    var mapper = []

    for (var i = 0; i < uploadDir.length; i++) {
        mapper.push({ file: `page${i}.png` });
    }

    formData.append('instructions', JSON.stringify({
        parts: mapper
    }))

    for (var j = 0; j < uploadDir.length; j++) {
        formData.append(mapper[j].file, fs.createReadStream(path.join(directory, uploadDir[j])));
    }
    // formData.append('page1.png', fs.createReadStream('/path/to/page1.png'))
    // formData.append('page2.png', fs.createReadStream('/path/to/page2.png'))
    // formData.append('page3.png', fs.createReadStream('/path/to/page3.png'))
    // formData.append('page4.png', fs.createReadStream('/path/to/page4.png'))
    ; (async () => {
        try {
            const response = await axios.post('https://api.pspdfkit.com/build', formData, {
                headers: formData.getHeaders({
                    'Authorization': 'Bearer pdf_live_kndZ1eECGurYrLERHFgNGSSlNPy9TX4wzqkZoT6OWZn'
                }),
                responseType: "stream"
            })

            response.data.pipe(fs.createWriteStream("result.pdf"))
        } catch (e) {
            const errorString = await streamToString(e.response.data)
            console.log(errorString)
        }
    })()

    function streamToString(stream) {
        const chunks = []
        return new Promise((resolve, reject) => {
            stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)))
            stream.on("error", (err) => reject(err))
            stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
        })
    }

    res.download('./result.pdf');
})

app.get('/edit', (req, res) => res.render('options.ejs', { operation: "Split", info: "Separate one page or a whole set for easy conversion into independent PDF files." }));

app.get('/compress', (req, res) => res.render('options.ejs', { operation: "Compress", info: "Reduce file size while optimizing for maximal PDF quality." }));

app.post('/uploads', upload.array('avatar'), (req, res) => {
    res.end();
})

app.get('/download', (req, res) => {

    // const directoryPath = path.join(__dirname, './uploads');
    const directory = path.join(__dirname, './uploads');
    var uploadDir = fs.readdirSync(directory);
    const zip = new AdmZip();

    for (var i = 0; i < uploadDir.length; i++) {
        zip.addLocalFile(path.join(directory, uploadDir[i]));
    }

    // Define zip file name
    const downloadName = `${Date.now()}.zip`;

    const data = zip.toBuffer();

    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-Disposition', `attachment; filename=${downloadName}`);
    res.set('Content-Length', data.length);
    res.send(data);
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

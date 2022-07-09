const multer = require('multer')
const path = require('path');
const fs = require('fs')

// const storage = multer.memoryStorage()
// const upload = multer({ storage: storage });

// create folder if not exist
const root = path.join(__dirname, "..")
if (!fs.existsSync(path.join(root, "resources", "uploads")))
  fs.mkdirSync(path.join(root, "resources", "uploads"), { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(root, "resources", "uploads"))
  },
  filename: function (req, file, cb) {
    let filename = (file.originalname).split('.')
    // temporary add time to filename to prevent duplicated file
    cb(null, filename[0] + "-" + (new Date()).getTime() + "." + filename[1])
    //   cb(null, file.originalname)
  }
})

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, callback) {
    const type = file.mimetype;
    // check if file file is png/jpeg
    if (type === 'image/png' || type === 'image/jpeg') {
      return callback(null, true)
    }
    callback(null, false)
  },
})


module.exports = upload;
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import connectMongo from 'connect-mongo'
import session from 'express-session'
import multer from 'multer' // 處理上傳的檔案
import FTPStorage from 'multer-ftp' // 將上傳的檔案丟到FTP
import md5 from 'md5'
import dotenv from 'dotenv'
import path from 'path' // path 為node.js 內建套件，可處理路徑資訊
import fs from 'fs' // fs 為node.js 內建套件，可處理檔案系統

import db from './db.js'

dotenv.config()

const MongoStore = connectMongo(session)
const app = express()

app.use(bodyParser.json())
app.use(cors({ // cors 跨網域設定
  origin (origin, callback) { // 直接開網頁，不是ajax 時，origin 是undefined
    if (origin === undefined) {
      callback(null, true)
    } else {
      if (process.env.ALLOW_CORS === 'true') { // 上傳FTP 時，dot.env 不知為何將bool 視為字串，因此判斷式的bool 改成字串
        callback(null, true) // 若開發環境，允許
      } else if (origin.includes('github')) {
        callback(null, true) // 非開發環境，但從github 過來，允許
      } else {
        callback(new Error('Not Allowed'), false) // 非開發環境也非github 過來，拒絕
      }
    }
  },
  credentials: true
}))
app.use(session({ // express-session 設定
  secret: 'album',
  store: new MongoStore({ // 將session 存進mongoDB
    mongooseConnection: db.connection, // 使用mongoose 的資料庫連接
    collection: process.env.COLLECTION_SESSION // 設定存入的collection
  }),
  cookie: { // 設定session 有效期間
    maxAge: 1000 * 60 * 30 // 1000ms * 60s * 30m = 30分鐘
  },
  saveUninitialized: false, // 是否保存未修改的session
  rolling: true, // 是否每次重設過期時間
  resave: true
}))

let storage // 宣告stroage 變數，根據.env 環境決定storage 存放的位置
if (!process.env.FTP === 'false') {
  storage = multer.diskStorage({ // 將上傳檔案放本機 (開發環境)
    destination (req, file, cb) {
      cb(null, 'images/')
    },
    filename (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname))
    }
  })
} else {
  storage = new FTPStorage({ // 將上傳檔案放伺服器 (heroku 環境)
    basepath: '/', // 上傳伺服器的路徑
    ftp: { // FTP 設定 (寫在.env 裡較佳)
      host: process.env.FTP_HOST,
      secure: false,
      user: process.env.FTP_USER,
      password: process.env.FTP_PASSWORD
    },
    destination (req, file, options, cb) {
      cb(null, options.basepath + Date.now() + path.extname(file.originalname))
    }
  })
}

const upload = multer({
  storage,
  fileFilter (req, file, cb) {
    if (!file.mimetype.includes('image')) { // 觸發multer 錯誤，不接受檔案
      cb(new multer.MulterError('LIMIT_FORMAT'), false) // LIMIT_FORMAT 是自訂的錯誤CODE，跟內建的錯誤CODE 格式統一
    } else {
      cb(null, true)
    }
  },
  limits: {
    fileSize: 1024 * 1024 // 1MB
  }
})

app.listen(process.env.PORT, () => {
  console.log('http://localhost:3000')
  console.log('SERVER IS ON!!!')
})

app.post('/users', async (req, res) => {
  if (!req.headers['content-type'].includes('application/json')) {
    res.status(400)
    res.send({ success: false, msg: '格式不符' })
    return
  }

  try {
    await db.users.create(
      {
        account: req.body.account,
        password: md5(req.body.password)
      }
    )
    res.status(200)
    res.send({ success: true, msg: '' })
  } catch (err) { // 區分錯誤類型
    if (err.name === 'ValidationError') { // 資料格式錯誤 (user)
      const key = Object.keys(err.errors)[0]
      const msg = err.errors[key].msg
      res.status(400)
      res.send({ success: false, msg })
    } else { // 伺服器錯誤 (server)
      res.status(500)
      res.send({ success: false, msg: '伺服器錯誤' })
    }
  }
})

app.post('/login', async (req, res) => {
  if (!req.headers['content-type'].includes('application/json')) {
    res.status(400)
    res.send({ success: false, msg: '格式不符' })
    return
  }

  try {
    const result = await db.users.find(
      {
        account: req.body.account,
        password: md5(req.body.password)
      }
    )
    if (result.length > 0) {
      req.session.user = result[0].account
      res.status(200)
      res.send({ success: true, msg: '' })
    } else {
      res.status(404)
      res.send({ success: false, msg: '帳號密碼錯誤' })
    }
  } catch (err) {
    if (err.name === 'ValidationError') {
      const key = Object.keys(err.errors[0])
      const msg = Object.keys(err.errors[key].msg)
      res.status(400)
      res.send({ success: false, msg })
    } else {
      res.status(500)
      res.send({ success: false, msg: '伺服器錯誤' })
    }
  }
})

app.delete('/logout', async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500)
      res.send({ success: false, msg: '伺服器錯誤' })
    } else {
      res.clearCookie()
      res.status(200)
      res.send({ success: true, msg: '' })
    }
  })
})

app.get('/heartbeat', async (req, res) => { // 定時給前端vuex 的session 資料，前端的cookie 才不會過期(維持前端登入狀態)
  let islogin = false
  if (req.session.user !== undefined) islogin = true
  res.status(200)
  res.send(islogin) // res.send(req.session.user !== undefined)
})

app.post('/file', async (req, res) => {
  if (req.session.user === undefined) { // 沒有登入
    res.status(401)
    res.send({ success: false, msg: '未登入' })
    return
  }
  if (!req.headers['content-type'].includes('multipart/form-data')) {
    res.status(400)
    res.send({ success: false, msg: '格式不符' })
    return
  }
  // 有一個上傳進來的檔案，欄位是image，記得後端和DB 要開images 資料夾和collection
  // req，進來的東西、res，要出去的東西、err，檔案上傳的錯誤
  upload.single('image')(req, res, async err => { // 也可upload.array('fieldname', num)
    if (err instanceof multer.MulterError) { // 處理錯誤 Error handling
      let msg = ''
      if (err.code === 'LIMIT_FILE_SIZE') msg = '檔案太大'
      else msg = '格式不符'
      res.status(400)
      res.send({ success: false, msg })
    } else if (err) {
      res.status(500)
      res.send({ success: false, msg: '伺服器錯誤' })
    } else {
      try {
        let name = ''
        if (process.env.FTP === 'true') { // FTP 上傳時
          name = path.basename(req.file.path) // basename() 是 node.js 回傳檔名的內建函式
        } else { // 本機上傳時
          name = req.file.filename
        }
        const result = await db.files.create(
          {
            user: req.session.user,
            description: req.body.description,
            name
          }
        )
        res.status(200)
        res.send({
          success: true,
          msg: '',
          name,
          _id: result._id
        })
      } catch (err) {
        if (err.name === 'ValidationError') { // 資料格式錯誤
          const key = Object.keys(err.errors)[0]
          const msg = err.errors[key].msg
          res.status(400)
          res.send({ success: false, msg })
        } else { // 伺服器錯誤
          res.status(500)
          res.send({ success: false, msg: '伺服器錯誤' })
        }
      }
    }
  })
})

app.get('/file/:name', async (req, res) => {
  if (req.session.user === undefined) {
    res.status(401)
    res.send({ success: false, message: '未登入' })
    return
  }
  if (process.env.FTP === 'false') { // express 傳送檔案只接受絕對路徑
    const path = process.cwd() + '/images/' + req.params.name // process.cwd() 可以取得目前執行工作的位置
    const exists = fs.existsSync(path)
    if (exists) { // 如果檔案在磁碟就回傳檔案，不在則是 404
      res.status(200)
      res.sendFile(path)
    } else {
      res.status(404)
      res.send({ success: false, msg: '找不到圖片' })
    }
  } else {
    res.redirect('http://' + process.env.FTP_HOST + '/' + process.env.FTP_USER + '/' + req.params.name)
  }
})

app.get('/album/:user', async (req, res) => {
  if (req.session.user === undefined) {
    res.status(401)
    res.send({ success: false, msg: '未登入' })
    return
  }
  if (req.session.user !== req.params.user) {
    res.status(403)
    res.send({ success: false, msg: '無權限' })
    return
  }

  try {
    const result = await db.files.find({ user: req.params.user })
    res.status(200)
    res.send({ success: true, msg: '', result })
  } catch (err) {
    res.status(500)
    res.send({ success: false, msg: '伺服器錯誤' })
  }
})

app.patch('/file/:id', async (req, res) => {
  if (!req.headers['content-type'].includes('application/json')) {
    res.status(400)
    res.send({ success: false, msg: '格式不符' })
    return
  }
  if (!req.session.user) { // 若無登入
    res.status(403)
    res.send({ success: false, msg: '無權限' })
    return
  }

  try { // 檢查相片擁有者是否為本人
    let result = await db.files.findById(req.params.id)
    if (result.user !== req.session.user) {
      res.status(403)
      res.send({ success: false, msg: '無權限' })
      return
    }
    // findByIdAndUpdate 預設回傳的是更新前的資料
    result = await db.files.findByIdAndUpdate(req.params.id, req.body, { new: true }) // 設定new true 後會變成回傳新的資料
    res.status(200)
    res.send({ success: true, msg: '', result })
  } catch (err) {
    if (err.name === 'CastError') { // ID 格式不是MongoDB 的格式
      res.status(400)
      res.send({ success: false, msg: 'ID 格式錯誤' })
    } else if (err.name === 'ValidationError') { // 資料格式錯誤
      const key = Object.keys(err.errors)[0]
      const msg = err.errors[key].msg
      res.status(400)
      res.send({ success: false, msg })
    } else { // 伺服器錯誤
      res.status(500)
      res.send({ success: false, msg: '伺服器錯誤' })
    }
  }
})

app.delete('/file/:id', async (req, res) => {
  if (!req.session.user) { // 若無登入
    res.status(403)
    res.send({ success: false, msg: '無權限' })
    return
  }

  try { // 檢查相片擁有者是否為本人
    let result = await db.files.findById(req.params.id)
    if (result.user !== req.session.user) {
      res.status(403)
      res.send({ success: false, msg: '無權限' })
      return
    }
    // findByIdAndDelete
    result = await db.files.findByIdAndDelete(req.params.id)
    if (result === null) {
      res.status(404)
      res.send({ success: false, msg: '找不到資料' })
    } else {
      res.status(200)
      res.send({ success: true, msg: '', result })
    }
  } catch (err) {
    if (err.name === 'CastError') { // ID 格式不是MongoDB 的格式
      res.status(400)
      res.send({ success: false, msg: 'ID 格式錯誤' })
    } else { // 伺服器錯誤
      res.status(500)
      res.send({ success: false, msg: '伺服器錯誤' })
    }
  }
})

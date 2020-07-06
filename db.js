import dotenv from 'dotenv'
import mongoose from 'mongoose'
import beautifyUnique from 'mongoose-beautiful-unique-validation'

dotenv.config()

const Schema = mongoose.Schema
mongoose.connect(process.env.DBURL)
mongoose.plugin(beautifyUnique)

const userSchema = new Schema({
  account: {
    type: String,
    minlength: [4, '帳號必須四個字以上'],
    maxlength: [20, '帳號不超過二十字'],
    unique: '帳號已使用',
    required: [true, '請輸入帳號']
  },
  password: {
    type: String,
    required: [true, '請輸入密碼']
  }
}, {
  versionKey: false
})

const fileSchema = new Schema({
  user: {
    type: String,
    required: [true, '請輸入使用者名稱']
  },
  description: {
    type: String,
    maxlength: [200, '圖文說明 200 字以下']
  },
  name: {
    type: String,
    required: [true, '請輸入檔案名稱']
  }
}, {
  versionKey: false
})

const users = mongoose.model(process.env.COLLECTION_USER, userSchema)
const files = mongoose.model(process.env.COLLECTION_FILE, fileSchema)
const connection = mongoose.connection // 因為express-session 要丟DB 的連線狀態給connect-mongo 寫進mongoDB，所以這邊要輸出mongoose.connection 給index.js (前台套件需要)

export default {
  users,
  files,
  connection
}

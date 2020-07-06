<template lang="pug">
  #album
    h1.text-center 我的相簿
    hr
    h2 檔案上傳
    br
    b-form(@submit="submit")
      b-form-file(
        v-model="file"
        :state="state"
        @input="validateFile"
        placeholder="選擇檔案或拖曳至此"
        drop-placeholder="將檔案拖曳至此"
        browse-text="瀏覽"
        accept="image/*"
        required
      )
      p.text-danger 僅支援 1MB 以下的圖片
      b-form-textarea(
        v-model="description"
        :state="textState"
        @input="validateText"
        placeholder="相片說明"
        rows="5" max-rows="6"
        maxlength="200"
      )
      b-button(type="submit" variant="secondary") 上傳
    hr
    Photoswipe
      b-row
        b-col(cols="12" md="4" lg="3" v-for="(image, idx) in images" :key="idx")
          b-card
            b-card-img(:src="image.src" v-pswp="image")
            b-card-body {{ image.title }}
              b-btn(v-if="image.edit" variant="danger" @click="cancel(image)") 取消
              b-btn(v-else variant="success" @click="edit(image)") 編輯
              b-btn(v-if="image.edit" variant="success" @click="update(image)") 更新
              b-btn(v-else variant="danger" @click="del(image,idx)") 刪除
              hr
              //- 用pre 標籤 textarea 才能顯示換行的效果
              pre(v-if="!image.edit") {{ image.title }}
              b-form-textarea(v-else v-model="image.model")
</template>

<script>
export default {
  name: 'album',
  data () {
    return {
      file: null,
      description: '',
      state: null,
      textState: null,
      images: []
    }
  },
  computed: {
    user () {
      return this.$store.getters.user
    }
  },
  methods: {
    validateFile () { // 用前台UI 擋掉第一層 (視覺上)
      if (this.file !== null) {
        if (this.file.size >= 1024 * 1024 || !this.file.type.includes('image')) {
          this.state = false // input 顯示紅色
          this.file = null // input 欄位清空
        } else {
          this.state = true // input 顯示綠色
        }
      }
    },
    validateText () { // 若使用者從f12 更改maxlength 屬性
      if (this.description.length > 200) this.textState = false
      else this.textState = true
      // this.testState = (this.description.length > 200)
    },
    submit (event) {
      event.preventDefault()
      if (this.file === null || this.file.size >= 1024 * 1024 || !this.file.type.includes('image')) {
        alert('檔案格式不符')
      } else { // FormData 可同時傳送檔案和表單資料
        const fd = new FormData()
        fd.append('image', this.file)
        fd.append('description', this.description)

        this.axios.post(process.env.VUE_APP_APIURL + '/file', fd, {
          headers: { // axios 預設是送json 格式，所以要設定成form-data
            'Content-Type': 'multipart/form-data'
          }
        }).then(res => {
          this.images.push(
            { // submit 的時候就直接push 進images 陣列，頁面會自動出現，不用再get 一次
              title: this.description,
              src: process.env.VUE_APP_APIURL + '/file/' + res.data.name,
              _id: res.data._id,
              edit: false,
              model: res.data.name
            }
          )
          alert('上傳成功')
          this.file = null
          this.description = ''
        }).catch(err => {
          alert(err.response.data.msg)
        })
      }
    },
    edit (image) {
      image.edit = true
      image.model = image.title
    },
    update (image) {
      this.axios.patch(process.env.VUE_APP_APIURL + '/file/' + image._id, { description: image.model })
        .then(res => {
          image.edit = false
          image.title = image.model
        })
        .catch(() => {
          alert('發生錯誤')
        })
    },
    cancel (image) {
      image.edit = false
      image.model = image.title
    },
    del (image, idx) {
      this.axios.delete(process.env.VUE_APP_APIURL + '/file/' + image._id)
        .then(res => {
          this.images.splice(idx, 1)
        })
        .catch(() => {
          alert('發生錯誤')
        })
    }
  },
  mounted () {
    this.axios.get(process.env.VUE_APP_APIURL + '/album/' + this.user)
      .then(res => {
        this.images = res.data.result.map(d => {
          return {
            title: d.description, // 因為Photoswipe 套件只吃叫title 的key
            src: process.env.VUE_APP_APIURL + '/file/' + d.name,
            _id: d._id,
            edit: false,
            model: d.name
          }
        })
      })
      .catch(() => {
        alert('發生錯誤')
      })
  }
}
</script>

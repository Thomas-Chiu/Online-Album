<template lang="pug">
  #reg
    b-row
      b-col(cols=12)
        h1.text-center 登入
        //- 使用form 標籤包input 時
        b-form(@submit="submit")
          b-form-group(
            label="帳號"
            label-for="input_account"
            description="帳號長度為 4 - 20 個字"
            invalid-feedback="帳號格式不符"
            :state="state('account')"
          )
            b-form-input#input_account(type="text" v-model="account" :state="state('account')")
          b-form-group(
            label="密碼"
            label-for="input_password"
            description-="密碼長度為 4 - 20 個字"
            invalid-feedback="密碼格式不符"
            :state="state('password')"
            )
            b-form-input#input_password(type="password" v-model="password" :state="state('password')")
          //- type="submit" 屬性的按鈕，只要按enter 鍵即可送出
          b-button(type="submit" variant="primary") 登入
</template>

<script>
export default {
  name: 'reg',
  data () {
    return {
      account: '',
      password: ''
    }
  },
  methods: {
    state (type) {
      if (type === 'account') {
        if (this.account.length < 4 || this.account.length > 20) return false
        else return true
      } else if (type === 'password') {
        if (this.password.length < 4 || this.password.length > 20) return false
        else return true
      }
    },
    submit (event) {
      event.preventDefault() // 記得要擋掉form 預設的action & method
      if (this.account.length < 4 || this.account.length > 20) { // 這邊是從前台進後台時擋掉
        alert('帳號格式不符')
        return
      } else if (this.password.length < 4 || this.password.length > 20) {
        alert('密碼格式不符')
        return
      }
      this.axios.post(
        process.env.VUE_APP_APIURL + '/login',
        { account: this.account, password: this.password }
      )
        .then(res => { // 這邊是從後台進資料庫時擋掉
          const data = res.data
          if (data.success) { // 若回來的資料是success
            alert('登入成功')
            this.$store.commit('login', this.account) // 呼叫vuex 的登入
            this.$router.push('album') // 跳到登入後的相簿頁面
          } else alert(data.msg) // 若不是就顯示回來的message
        })
        .catch(err => { // 若回來的狀態不是200，顯示回傳的msg
          alert(err.response.data.msg)
        })
    }
  }
}
</script>

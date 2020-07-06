<template lang="pug">
  #app
    b-navbar(toggleable="lg" type="dark" variant="dark")
      b-container
        b-navbar-brand(to="/") 相簿
        b-navbar-toggle(target="nav-collapse")
        b-collapse#nav-collapse(is-nav)
          b-navbar-nav.ml-auto
            b-nav-item(v-if="user.length === 0" to="/login") 登入
            b-nav-item(v-else to="/album") 我的相簿
            b-nav-item(v-if="user.length === 0" to="/reg") 註冊
            b-nav-item(v-else @click="logout") 登出
    b-container
      router-view
</template>

<script>
export default {
  name: 'app',
  computed: {
    user () {
      return this.$store.getters.user
    }
  },
  methods: {
    logout () {
      this.axios.delete(process.env.VUE_APP_APIURL + '/logout')
        .then(res => {
          const data = res.data
          if (data.success) {
            alert('登出成功')
            this.$store.commit('logout')
            console.log(this.$route) // $route 是路由的資料，$router 是對路由做動作
            if (this.$route.path !== '/') { // 若不是在首頁登出，路由push 到首頁
              this.$router.push('/')
            }
          } else {
            alert(data.msg)
          }
        })
        .catch(err => {
          alert(err.respnse.data.msg)
        })
    },
    heartbeat () {
      this.axios.get(process.env.VUE_APP_APIURL + '/heartbeat')
        .then(res => {
          const data = res.data

          if (this.user.length > 0) { // 若是登入中
            if (!data) { // 若後端登入時間過期
              alert('登入時效已過')
              this.$store.commit('logout') // 前端登出
              if (this.$route.path !== '/') { // 若目前不在首頁，跳到登出後的首頁
                this.$router.push('/')
              }
            }
          }
        })
        .catch(() => {
          alert('發生錯誤')
          this.$store.commit('logout')
          if (this.$route.path !== '/') {
            this.$router.push('/')
          }
        })
    }
  },
  mounted () {
    this.heartbeat()
    setInterval(() => {
      this.heartbeat()
    }, 1000 * 5)
  }
}
</script>

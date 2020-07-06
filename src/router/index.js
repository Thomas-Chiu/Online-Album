import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import store from '../store/index.js'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: {
      login: false,
      title: '線上相簿'
    }
  },
  {
    path: '/reg',
    name: 'Reg',
    component: () => import(/* webpackChunkName: "reg" */ '../views/Reg.vue'),
    meta: {
      login: false,
      title: '線上相簿 | 註冊'
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import(/* webpackChunkName: "login" */ '../views/Login.vue'),
    meta: {
      login: false,
      title: '線上相簿 | 登入'
    }
  },
  {
    path: '/album',
    name: 'Album',
    component: () => import(/* webpackChunkName: "album" */ '../views/Album.vue'),
    meta: {
      login: true
    }
  }
]

const router = new VueRouter({
  // mode: 'history',
  // base: process.env.BASE_URL,
  routes
})

router.beforeEach((to, from, next) => {
  if (to.meta.login && !store.state.user) {
    next('/login')
  } else {
    next()
  }
})
router.afterEach((to, from) => {
  document.title = (to.name !== 'Album') ? to.meta.title : store.state.user + '的相簿'
  // if (to.name !== 'Album') document.title = to.meta.title
  // else document.title = store.state.user + '的相簿'
})

export default router

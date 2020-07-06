import Vue from 'vue'
import Vuex from 'vuex'
import createPersistedState from 'vuex-persistedstate'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    user: ''
  },
  mutations: {
    login (state, data) {
      state.user = data
    },
    logout (state, data) {
      state.user = ''
    }
  },
  getters: {
    user (state) {
      return state.user
    }
  },
  actions: {
  },
  modules: {
  },
  plugins: [createPersistedState()]
})

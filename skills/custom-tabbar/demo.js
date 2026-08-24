// demo.js: permanent floating pill tabbar (component)
Component({
  data: {
    currentTab: 0
  },

  methods: {
    onTabTap(e) {
      const index = e.currentTarget.dataset.index;
      this.setData({ currentTab: index });
      this.triggerEvent('tabchange', { index });
    },

    onLogoTap() {
      wx.showToast({ title: 'Logo', icon: 'none' });
    }
  }
});

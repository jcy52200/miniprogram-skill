// demo.js: toggle-driven slide-in animation
Page({
  data: {
    isActive: false // controls the .active class that triggers the slide-in
  },

  // Trigger the entrance once the page has settled
  onReady() {
    setTimeout(() => {
      this.setData({ isActive: true });
    }, 100);
  },

  onTap() {
    wx.showToast({ title: 'Tapped', icon: 'none' });
  }
});

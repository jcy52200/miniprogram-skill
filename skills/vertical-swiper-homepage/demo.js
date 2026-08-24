// demo.js: vertical swiper + horizontal scroll-view snap logic
Page({
  data: {
    // nested horizontal sub-page index: 0 = panel A, 1 = panel B
    subIndex: 0,
    // horizontal scroll-view snap target id
    panelId: '',
    // vertical scroll data for panel B
    list: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },

  onLoad() {
    try {
      const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
      this.winWidth = info.windowWidth || 375;
    } catch (e) {
      this.winWidth = 375;
    }
  },

  // Update index after the outer vertical swiper settles; reset nested state when leaving
  onAnimationFinish(e) {
    const current = e.detail.current;
    // current === 1 means the screen containing the horizontal scroll-view
    const isNested = current === 1;
    this.setData({
      subIndex: isNested ? this.data.subIndex : 0,
      panelId: isNested ? this.data.panelId : 'panel-a'
    });
  },

  // Record position during horizontal scrolling
  onScroll(e) {
    this._lastScrollLeft = e.detail.scrollLeft;
  },

  // Snap to the nearest full panel when horizontal scrolling ends
  onScrollEnd() {
    const w = this.winWidth;
    const left = this._lastScrollLeft || 0;
    const target = left > w * 0.5 ? 1 : 0;
    if (target !== this.data.subIndex) {
      this.setData({ subIndex: target });
    }
    const targetLeft = target * w;
    // Skip snap when already aligned, so the programmatic snap does not re-fire scrollend forever
    if (Math.abs(left - targetLeft) > 5) {
      const panelId = target === 0 ? 'panel-a' : 'panel-b';
      this.setData({ panelId: '' }, () => this.setData({ panelId }));
    }
  }
});

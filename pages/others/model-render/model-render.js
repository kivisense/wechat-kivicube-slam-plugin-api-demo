import { errorHandler, showAuthModal, downloadFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });
    this.downloadAsset = downloadFile("https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/video/slam.mp4")
  },

  async ready({ detail: slam }) {
    try {
      const arrayBuffer = await this.downloadAsset;
      const model3d = await slam.createVideo(arrayBuffer);
      model3d.loop = true;
      model3d.videoContext.play();

      slam.add(model3d, 1);

      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const x = Math.round(windowWidth / 2);
      const y = Math.round(windowHeight / 2);
      const resetPlane = true;
      const success = slam.standOnThePlane(model3d, x, y, resetPlane);
      if (!success) {
        wx.hideLoading();
        errorHandler("放置模型至平面上失败，请对准平面再次打开重试");
        return;
      }
      
      let isVisible = false;
      let timer = null;
      /**
       * 注意：
       * 此方法暂不适用带骨骼动画的模型，带骨骼动画的模型未出现在相机画面内，也会执行onBeforeRender
       */
      model3d.onBeforeRender = () => {
        if (isVisible) {
          clearTimeout(timer);
          
          timer = setTimeout(() => {
            isVisible = false;
            wx.showToast({
              title: "模型未在相机画面内",
              icon: "none"
            });
          }, 500);
        } else {
          wx.showToast({
            title: "模型出现在相机画面内",
            icon: "none"
          });
          isVisible = true;
        }
      };

      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      errorHandler(e);
    }
  },

  error({ detail }) {
    wx.hideLoading();
    // 判定是否camera权限问题，是则向用户申请权限。
    if (detail?.isCameraAuthDenied) {
      showAuthModal(this);
    } else {
      errorHandler(detail);
    }
  },
});

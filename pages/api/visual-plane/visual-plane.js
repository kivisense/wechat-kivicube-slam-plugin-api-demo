import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    defaultPlaneVisible: true, // 在已检测到的平面上，显示默认的可视化平面
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile(
      "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/reticle.glb"
    );
  },

  async ready({ detail: slam }) {
    try {
      await slam.start();
      
      /**
       * 用自己的3d素材来替换默认的可视化平面
       */
      const reticleArrayBuffer = await this.downloadAsset;
      const reticleModel = await slam.createGltfModel(reticleArrayBuffer);

      this._timer1 = setTimeout(() => {
        slam.setVisualPlane(reticleModel)
      }, 5000);

      this._timer2 = setTimeout(() => {
        /**
         * 移除可视化平面
         * */ 
        slam.removeVisualPlane();
        wx.showToast({ title: "可视化平面已移除", icon: "none" });
      }, 9000);

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
  
  onUnload() {
    clearTimeout(this._timer1);
    clearTimeout(this._timer2);
  },
});

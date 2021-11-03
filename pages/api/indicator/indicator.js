import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile(
      "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/reticle.glb"
    );
  },

  async ready({ detail: slam }) {
    try {
      const reticleArrayBuffer = await this.downloadAsset;
      const reticleModel = await slam.createGltfModel(reticleArrayBuffer);

      /**
       * 增加一个3d素材作为平面指示器显示。
       *
       * 只支持增加一个指示器，如果已有其他指示器，会自动被移除，然后再增加新的指示器。
       * 此方法内部也会使用slam.add方法，但是移除时，必须使用removePlaneIndicator方法，
       * 否则后果无法预料。
       * @param {Asset3D} obj - 3d对象。可以是模型、图片、视频等3d素材。
       * @param {Object} callbacks - 回调对象。详细定义见下方。
       * @returns {void}
       */
      slam.addPlaneIndicator(reticleModel, {
        // camera画面中心，可以映射到平面上某一个点时调用
        onPlaneShow() {
          console.log("指示器出现");
        },
        // camera画面中心，**不可以**映射到平面上某一个点时调用。
        onPlaneHide() {
          console.log("指示器隐藏");
        },
        // camera画面中心，可以映射到平面上某一个点时，**持续**调用。
        // 因此可以用此方法，让指示器旋转起来。
        onPlaneShowing() {
          reticleModel.rotation.y += 0.02;
        },
      });

      await slam.start();

      // 移除指示器
      setTimeout(() => {
        slam.removePlaneIndicator();
        wx.showToast({ title: "指示器已移除", icon: "none" });
      }, 10 * 1000);

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

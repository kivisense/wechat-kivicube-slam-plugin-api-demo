import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb"
    );
  },

  async ready({ detail: slam }) {
    try {
      const rabbitArrayBuffer = await this.downloadAsset;
      const rabbitModel = await slam.createGltfModel(rabbitArrayBuffer);

      slam.add(rabbitModel, 0.5);

      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const success = slam.standOnThePlane(
        rabbitModel,
        Math.round(windowWidth / 2),
        Math.round(windowHeight / 2),
        true
      );
      console.log("standOnThePlane success", success);

      this.rabbitModel = rabbitModel;

      rabbitModel.onBeforeRender = () => {
        const pos = slam.defaultCamera.position.clone();
        // 让兔子模型朝向相机 (模型只会左右旋转，不会上下旋转)
        rabbitModel.lookAt(pos.x, 0, pos.z);
        // 让兔子模型朝向相机 (模型上下左右都会发生旋转)
        // rabbitModel.lookAt(pos.x, pos.y, pos.z);
      }

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
    this.rabbitModel = null;
  },
});

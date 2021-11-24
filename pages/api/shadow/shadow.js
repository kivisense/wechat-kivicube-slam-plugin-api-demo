import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile(
      "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/rabbit.glb"
    );
  },

  async ready({ detail: slam }) {
    try {
      const modelArrayBuffer = await this.downloadAsset;
      const model3d = await slam.createGltfModel(modelArrayBuffer);

      slam.add(model3d, 0.5);

      // 开启slam平面追踪
      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const success = slam.standOnThePlane(
        model3d,
        Math.round(windowWidth / 2),
        Math.round(windowHeight / 2),
        true
      );
      console.log("standOnThePlane success", success);

      model3d.playAnimation({ loop: true });

      /**
       * 开启阴影功能，同时设置阴影强度。同时模型也需要开启阴影投射属性。
       * 开启后，后续也可调用此方法来修改阴影强度。
       * @param {Number} [shadowIntensity=0.15] - 阴影强度。默认值为0.15。值范围为0-1，0为无效果，1为最强。
       */
      slam.enableShadow();

      // 禁用阴影功能。
      // slam.disableShadow();

      /**
       * 开启模型投射阴影属性。
       * @param {Boolean} cast - 是否投射。true为开启投射，false为关闭投射。
       * @param {Boolean} [recursive=true] - 是否递归设置所有子对象。默认为true。模型对象建议为true，否则阴影会不完整。
       */
      model3d.setCastShadow(true);

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

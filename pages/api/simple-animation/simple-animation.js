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
      const rabbitArrayBuffer = await this.downloadAsset;
      const rabbitModel = await slam.createGltfModel(rabbitArrayBuffer);
      rabbitModel.position.z = -0.5;
      rabbitModel.position.y = -0.2;
      slam.add(rabbitModel, 0.3);

      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const x = Math.round(windowWidth / 2);
      const y = Math.round(windowHeight / 2);
      const resetPlane = true;
      const success = slam.standOnThePlane(rabbitModel, x, y, resetPlane);
      if (!success) {
        wx.hideLoading();
        errorHandler("放置模型至平面上失败，请对准平面再次打开重试");
        return;
      }

      this.startAnimate(rabbitModel);

      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      errorHandler(e);
    }
  },

  startAnimate(model) {
    const minX = model.position.x - 0.5;
    const maxX = model.position.x + 0.5;
    let step = 0.01;
    // 3d渲染循环的每一帧渲染前，会调用此方法。同理也存在onAfterRender方法。
    // 注意：当模型内容不在屏幕之内时(即不可见时)，就不需要渲染此模型，因此也不会调用此方法。
    model.onBeforeRender = () => {
      if (model.position.x < minX) {
        step = 0.01;
      }
      if (model.position.x > maxX) {
        step = -0.01;
      }

      model.position.x += step;
    };
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

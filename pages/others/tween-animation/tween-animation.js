import TWEEN from "./tween.umd";
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
    // 如果使用onBeforeRender，必须保证动画过程中模型一直可见。
    model.onBeforeRender = () => {
      TWEEN.update();
    };

    const startTransform = {
      px: 0,
      py: 0,
      pz: 0,
      rx: 0,
      ry: 0,
      rz: 0,
      scale: 5,
    };
    const endTransform = {
      px: 1,
      py: -1,
      pz: -2,
      rx: Math.PI,
      ry: Math.PI,
      rz: Math.PI,
      scale: 10,
    };
    const duration = 5000;

    new TWEEN.Tween(startTransform)
      .to(endTransform, duration)
      .easing(TWEEN.Easing.Bounce.InOut)
      .onUpdate(({ px, py, pz, rx, ry, rz, scale }) => {
        model.position.set(px, py, pz);
        model.rotation.set(rx, ry, rz);
        model.scale.setScalar(scale);
      })
      .repeat(Infinity)
      .start();
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

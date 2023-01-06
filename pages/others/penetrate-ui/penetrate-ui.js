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

      model3d.addEventListener("click", () => {
        wx.showModal({
          title: "提示",
          content: "模型被点击到了",
          showCancel: false,
        });
      });

      this.slam = slam;

      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      errorHandler(e);
    }
  },

  tap(e) {
    if (e && e.touches.length > 0) {
      const [{ pageX, pageY }] = e.touches;

      // API功能：发送一个模拟的touch事件给到组件，可模拟用户去点击模型。
      // 重要：要确保pageX, pageY的值是逻辑像素，同时值的原点要在kivicube-slam组件的左上角。
      // 例如：如果kivicube-slam组件只展示在屏幕右半部分，那么点击屏幕中间时，第一个参数值应该是0；
      // 点击屏幕右边缘时，第一个参数值应该是screenWidth / 2。第二个参数同理。
      this.slam.dispatchTouchEvent(pageX, pageY);
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

import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = Promise.all([
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb"
      ),
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/robot.glb"
      ),
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [rabbitArrayBuffer, robotArrayBuffer] = await this.downloadAsset;
      const [rabbit, robot] = await Promise.all([
        slam.createGltfModel(rabbitArrayBuffer),
        slam.createGltfModel(robotArrayBuffer),
      ]);

      // 启用遮罩效果。遮罩可以将遮罩自身，和遮罩后方的所有内容，全部置为纯透明。
      // 达到去除特定形状的目的，以模拟真实物体遮挡等功能。
      robot.setEnableMask();
      // 禁用遮罩效果
      // robot.setDisableMask();

      robot.scale.setScalar(0.01);
      robot.position.z = 0.005;
      rabbit.add(robot);

      slam.add(rabbit, 0.5);

      rabbit.playAnimation({ loop: true });
      robot.playAnimation({ loop: true });

      // 开启slam平面追踪
      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const success = slam.standOnThePlane(
        rabbit,
        Math.round(windowWidth / 2),
        Math.round(windowHeight / 2),
        true
      );
      console.log("standOnThePlane success", success);

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

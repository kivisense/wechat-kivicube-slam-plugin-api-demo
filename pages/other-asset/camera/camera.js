import { errorHandler, showAuthModal, requestFile,downloadFile } from "../../../utils/utils";

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
      downloadFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/video/glow.mp4"
      )
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [rabbitArrayBuffer, alphaVideoPath] = await this.downloadAsset;
      const [rabbitModel, alphaVideo3d] = await Promise.all([
        slam.createGltfModel(rabbitArrayBuffer),
        slam.createAlphaVideo(alphaVideoPath),
      ]);

      slam.add(rabbitModel, 0.5);

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

      const camera = slam.defaultCamera;

      // 向下移动
      alphaVideo3d.position.x = 2;
      // 向右移动
      alphaVideo3d.position.y = 1;
      // 必须负值，才能看见。视作深度
      alphaVideo3d.position.z = -5;
      alphaVideo3d.loop = true;
      alphaVideo3d.videoContext.play();

      // 使视频始终最上层显示
      const recursive = true; // 是否同时设置所有子节点。默认为false
      alphaVideo3d.setGLState('depthTest', false, recursive);
      alphaVideo3d.setGLState('depthWrite', false, recursive);

      // 增加在camera节点下，使其相对屏幕位置呈现。
      camera.add(alphaVideo3d);

      let showModal = false;
      rabbitModel.onBeforeRender = () => {
        if (showModal) return;

        // 计算手机和3d模型之间的距离值。
        const distance = camera.position.distanceTo(rabbitModel.position);
        if (distance < 1) {
          showModal = true;
          wx.showModal({
            title: "提示",
            content: "你已靠近目标啦~",
            showCancel: false,
            complete() {
              showModal = false;
            }
          });
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

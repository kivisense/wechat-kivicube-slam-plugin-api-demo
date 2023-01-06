import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    showGuide: false,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = Promise.all([
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb"
      ),
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/reticle.glb"
      ),
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [rabbitArrayBuffer, reticleArrayBuffer] = await this.downloadAsset;
      const [rabbitModel, reticleModel] = await Promise.all([
        slam.createGltfModel(rabbitArrayBuffer),
        slam.createGltfModel(reticleArrayBuffer),
      ]);

      slam.addPlaneIndicator(reticleModel, {
        onPlaneShowing() {
          reticleModel.rotation.y += 0.02;
        },
      });

      // 暂时隐藏，点击后再出现。
      rabbitModel.visible = false;
      slam.add(rabbitModel, 0.5);

      await slam.start();

      this.rabbitModel = rabbitModel;
      this.slam = slam;

      wx.hideLoading();

      this.setData({ showGuide: true });
    } catch (e) {
      wx.hideLoading();
      errorHandler(e);
    }
  },

  tap({ touches, target }) {
    if (Array.isArray(touches) && touches.length > 0) {
      const { offsetLeft, offsetTop } = target;
      const { pageX, pageY } = touches[0];
      // 注意：需要传入在kivicube-slam组件上的坐标点，而不是页面上的坐标点。
      const success = this.slam.standOnThePlane(
        this.rabbitModel,
        pageX - offsetLeft,
        pageY - offsetTop,
        true
      );
      if (success) {
        this.rabbitModel.visible = true;
        this.rabbitModel.playAnimation({ loop: true });

        this.setData({ showGuide: false });
        this.slam.removePlaneIndicator();
      } else {
        wx.showToast({ title: "放置模型失败，请对准平面", icon: "none" });
      }
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

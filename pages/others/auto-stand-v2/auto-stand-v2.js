import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    showPlaneTip: false,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = Promise.all([
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb"
      ),
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [rabbitArrayBuffer] = await this.downloadAsset;
      const [rabbitModel] = await Promise.all([
        slam.createGltfModel(rabbitArrayBuffer),
      ]);

      await slam.start();
      wx.hideLoading();

      // 先隐藏模型
      rabbitModel.visible = false;
      slam.add(rabbitModel, 0.5);
      
      // 这里这个group也可以替换为指示器模型，目前这个是个空内容
      const group = slam.createGroup();

      // 利用添加指示器的API的回调方法，来自动放置模型
      slam.addPlaneIndicator(group, {
        size: 0.5,
        // camera画面中心对准的位置有可用平面，指示器初次放置到该平面的时候调用
        onPlaneShow: () => {
          console.log("onPlaneShow");
          // 可以放置模型了
          this.setData({ showPlaneTip: false });
          // 去掉指示器
          slam.removePlaneIndicator();

          const { windowHeight, windowWidth } = wx.getWindowInfo();
          // 显示模型 并放置
          rabbitModel.visible = true;
          slam.standOnThePlane(
            rabbitModel,
            Math.round(windowWidth / 2),
            Math.round(windowHeight / 2),
            true
          );
        },
        // camera画面中心对准的位置无可用平面，指示器无法放置的时候调用
        onPlaneHide: () => {
          console.log("onPlaneHide");
          this.setData({ showPlaneTip: true });
        },
      });

      
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

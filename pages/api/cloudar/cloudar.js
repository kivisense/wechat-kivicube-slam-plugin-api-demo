import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    showGuide: false,
    guideTip: "请对准识别图"
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = Promise.all([
      requestFile(
        "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/rabbit.glb"
      )
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [rabbitArrayBuffer] = await this.downloadAsset;
      const [rabbitModel] = await Promise.all([
        slam.createGltfModel(rabbitArrayBuffer),
      ]);

      // 暂时隐藏，云识别成功后再出现。
      rabbitModel.visible = false;
      slam.add(rabbitModel, 0.8);

      await slam.start();

      this.rabbitModel = rabbitModel;
      this.slam = slam;

      wx.hideLoading();
      this.setData({
        showGuide: true
      })
      const {windowHeight, windowWidth} = wx.getWindowInfo()

      // 传入合辑ID进行云识别
      this.slam.startCloudAr("b46rfc").then(sceneId => {
        // 识别成功，显示模型
        if(sceneId) {
          this.setData({ showGuide: false })
          this.setModel(windowWidth / 2, windowHeight / 2)
        }
      });

      // 超过10秒未识别到，关闭云识别，直接显示模型
      setTimeout(() => {
        this.slam.stopCloudAr()
        this.setData({ showGuide: false })
        this.setModel(windowWidth / 2, windowHeight / 2)
      }, 10000)
    } catch (e) {
      wx.hideLoading();
      errorHandler(e);
    }
  },

  error({ detail }) {
    // 判定是否camera权限问题，是则向用户申请权限。
    if (detail?.isCameraAuthDenied) {
      showAuthModal(this);
    } else {
      errorHandler(detail);
    }
  },

  tap({ touches, target }) {
    if (Array.isArray(touches) && touches.length > 0) {
      const { offsetLeft, offsetTop } = target;
      const { pageX, pageY } = touches[0];
      // 注意：需要传入在kivicube-slam组件上的坐标点，而不是页面上的坐标点。
      const x = pageX - offsetLeft;
      const y = pageY - offsetTop;
      this.setModel(x, y)
    }
  },

  setModel(x, y) {
    const success = this.slam.standOnThePlane(
      this.rabbitModel,
      x,
      y,
      true
    );
    if (success) {
      this.rabbitModel.visible = true;
      this.rabbitModel.playAnimation({ loop: true });
    } else {
      wx.showToast({ title: "放置模型失败，请对准平面", icon: "none" });
    }
  }

});

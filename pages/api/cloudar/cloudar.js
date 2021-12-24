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
      console.log('slam', slam.start)
      await slam.start();

      this.rabbitModel = rabbitModel;
      this.slam = slam;

      wx.hideLoading();
      this.setData({ showGuide: true })

      const {windowHeight, windowWidth} = wx.getWindowInfo()

      // 开启一个计时器，超过10秒未识别到，关闭云识别，直接显示模型
      const timer = setTimeout(() => {
        this.slam.stopCloudar()
        this.setData({ showGuide: false })
        this.setModel(windowWidth / 2, windowHeight / 2)
      }, 10000)

      /**
       * 开始去云识别图片。
       * @param {String} collectionId - 合辑id。
       * @param {Array} sceneList - 希望识别到的场景id列表。如果识别到的场景不在此列表中，则会忽略，继续识别。
       * @returns {Promise<String|Undefined>} 场景id。如果识别过程中调用了stopCloudar，则会返回undefined值。
       */
      const sceneId = await this.slam.startCloudar("b46rfc").catch(err => {
        clearTimeout(timer)
        errorHandler(err);
      });

      // 识别成功，显示模型
      if (sceneId) {
        clearTimeout(timer)
        this.setData({ showGuide: false })
        this.setModel(windowWidth / 2, windowHeight / 2)
      }
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

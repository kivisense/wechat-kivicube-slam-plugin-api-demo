import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    showGuide: false,
    guideTip: "请对准识别图",
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

      // 暂时隐藏，云识别成功后再出现。
      rabbitModel.visible = false;
      slam.add(rabbitModel, 0.8);

      await slam.start();

      this.rabbitModel = rabbitModel;
      this.slam = slam;

      wx.hideLoading();
      this.setData({ showGuide: true });

      const { windowHeight, windowWidth } = wx.getSystemInfoSync();

      // 开启一个计时器，超过10秒未识别到，关闭云识别，直接显示模型
      const timer = setTimeout(() => {
        // 关闭云识别
        slam.stopCloudar();
        // 设置模型可用手势操作
        slam.setGesture(rabbitModel);
        this.setData({ showGuide: false });
        this.setModel(windowWidth / 2, windowHeight / 2);
      }, 10000);

      this._timer = timer;

      /**
       * 开始去云识别图片。
       * @param {String} collectionId - 合辑id。获取方式，参考：https://mp.weixin.qq.com/wxopen/plugindevdoc?appid=wx3bbab3920eabccb2&token=&lang=zh_CN#-id-
       * @param {Array} [sceneList=[]] - 希望识别到的场景id列表。如果识别到的场景不在此列表中，则会忽略，继续识别。如果为空，或空数组，则代表识别合辑下的所有场景。
       * @returns {Promise<String|Undefined>} 场景id。如果识别过程中调用了stopCloudar，则会返回undefined值。
       */
      const sceneId = await this.slam.startCloudar("b46rfc").catch((err) => {
        clearTimeout(timer);
        errorHandler(err);
      });

      // 识别成功，显示模型
      if (sceneId) {
        clearTimeout(timer);
        this.setData({ showGuide: false });
        this.setModel(windowWidth / 2, windowHeight / 2);
        // 设置模型可用手势操作
        slam.setGesture(rabbitModel);
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

  setModel(x, y) {
    const success = this.slam.standOnThePlane(this.rabbitModel, x, y, true);
    if (success) {
      this.rabbitModel.visible = true;
      this.rabbitModel.playAnimation({ loop: true });
    } else {
      wx.showToast({ title: "放置模型失败，请对准平面", icon: "none" });
    }
  },

  // 清除定时器
  onUnload() {
    clearTimeout(this._timer);
  }
});

import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    nameList: [],
    name: 0,
    config: [
      {
        name: "点击放置",
        key: "click",
        value: true,
      },
      {
        name: "模型拖拽",
        key: "drag",
        value: false,
      },
      {
        name: "单指选转",
        key: "singleFinger",
        value: true,
      },
      {
        name: "双指缩放",
        key: "doubleFinger",
        value: true,
      }
    ]
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset =  requestFile(
      "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/rabbit.glb"
    );
  },

  async ready({ detail: slam }) {
    try {
      const rabbitArrayBuffer = await this.downloadAsset;

      const model3d = await slam.createGltfModel(rabbitArrayBuffer);

      slam.add(model3d, 0.5);

      // 开启slam平面追踪
      await slam.start();

      this.slam = slam;
      this.model3d = model3d;

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const success = slam.standOnThePlane(
        model3d,
        Math.round(windowWidth / 2),
        Math.round(windowHeight / 2),
        true
      );

      /**
       * 设置3d对象的手势操作
       * @param {Base3D} base3D - 3D对象
       * @param {Object} options - 手势操作配置项，默认值详见下方
      * @returns {void}
       */

      const defaultOptions = {
        click: true,            // 开启点击屏幕放置模型
        drag: false,            // 开启模型拖拽
        singleFinger: true,     // 开启单指选转模型
        doubleFinger: true,     // 开启双指缩小和放大模型
        scaleMax: 1000,         // 设置模型最大放大值
        scaleMin: 0,            // 设置模型最小缩放值
        clickResult () {}       // 设置模型放置后的回调函数
      }
      slam.setGesture(model3d, {
        ...defaultOptions,

        clickResult(success) {
          wx.showToast({
            title: `模型放置结果：${success}`,
            icon: "none"
          });
        },
      });

      wx.hideLoading();

      console.log("standOnThePlane success", success);
      if (!success) {
        errorHandler("放置模型至平面上失败，请对准平面再次打开重试");
      }
      
    } catch (e) {
      wx.hideLoading();
      errorHandler(e);
    }
  },

  optionChange(e) {
    const { index } = e.target.dataset;
    
    const bool = this.data.config[index].value;

    const key = `config[${index}].value`;
    
    this.setData({ [key]: !bool });

    const arr = this.data.config.map(item => {
      return [item.key, item.value];
    });

    const options = Object.fromEntries(arr);
    
    this.slam.setGesture(this.model3d, {
      ...options,
      
      clickResult(success) {
        wx.showToast({
          title: `模型放置结果：${success}`,
          icon: "none"
        });
      },
    });
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

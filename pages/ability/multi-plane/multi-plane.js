import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    /**
     * horizontal(水平面)、vertical(竖直面)、both(水平面和竖直面)。
     * 注意：vertical、both这两个值只有version为v2且设备支持时才生效。插件版本>=1.3.0支持
    */
    planeTracking: "horizontal", 
    defaultPlaneVisible: true, // 在已检测到的平面上，显示默认的可视化平面
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    this.windowHeight = windowHeight;
    this.windowWidth = windowWidth;

    this.downloadAsset = requestFile(
      "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/rabbit.glb"
    );
  },

  async ready({ detail: slam }) {
    try {
      this.slam = slam;
      // 加载3d素材
      const rabbitArrayBuffer = await this.downloadAsset;
      const rabbitModel = await slam.createGltfModel(rabbitArrayBuffer);
      this.rabbitModel = rabbitModel;
      
      const initScale = 0.5; // 0.5米
      const initRotation = 45; // 角度
      /**
       * 将创建好的3D对象，放入组件之中显示。
       * @param {Base3D} base3D - 3D对象
       * @param {Number} [scale=0] - 3D对象初始大小，0代表不指定大小，使用模型原始大小。单位“米”，默认值为0。注意：此大小仅供参考，不能视作精准值，会存在一定的误差。
       * @param {Number} [rotation=0] - 3D对象初始Y轴旋转朝向，0代表不进行旋转。单位“角度”，默认值为0。
       * @returns {void}
       */
      slam.add(rabbitModel, initScale, initRotation);

      // 开启slam平面追踪
      await slam.start();
      
      // 让兔子模型可用手势进行操作。默认点击移动到平面上的新位置，单指旋转，双指缩放。
      slam.setGesture(rabbitModel);

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

  // 平面新增
  addAnchors({ detail: anchors }) {
    wx.showToast({ title: `新增平面：${anchors.length}个`, icon: "none" });

    const anchor = anchors[0];
    console.warn("平面id：", anchor.id);

    /**
     * @todo
     * 表面上：onload内调用一次api，这里重复取值就行了。
     * 实际上：getSystemInfoSync这个api在这里调用拿到的宽高为undefined...
    */
    const { windowWidth, windowHeight } = this;
    // 在指定id的平面上放置模型
    const success = this.slam.standOnThePlaneById(
      this.rabbitModel,
      Math.round(windowWidth / 2),
      Math.round(windowHeight / 2),
      anchor.id
    );
    
    console.warn("standOnThePlaneById success", success);
    if (success) {
      console.warn(`模型已放置在id为${anchor.id}的平面上`);
    }
  },

  // 平面更新
  // eslint-disable-next-line no-unused-vars
  updateAnchors({ detail: anchors }) {
    // console.warn("updateAnchors", anchors);
  },

  // 平面移除
  removeAnchors({ detail: anchors }) {
    console.warn("removeAnchors", anchors);
    wx.showToast({ title: `移除平面：${anchors.length}个`, icon: "none" });
  },

  onUnload() {
    this.slam = null;
    this.rabbitModel = null;
  },
});

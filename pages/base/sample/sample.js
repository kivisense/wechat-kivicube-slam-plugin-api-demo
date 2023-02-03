import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    isRender: true, // 是否渲染slam组件
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = Promise.all([
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb"
      ),
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/hdr/default.hdr"
      ),
    ]);
  },

  async ready({ detail: slam }) {
    this.slam = slam;
    try {
      const [rabbitArrayBuffer, envMapArrayBuffer] = await this.downloadAsset;
      const [rabbitModel, envMap] = await Promise.all([
        slam.createGltfModel(rabbitArrayBuffer),
        slam.createEnvMapByHDR(envMapArrayBuffer),
      ]);

      // 模型使用上环境贴图，可加强真实效果。实物类模型推荐使用。
      rabbitModel.useEnvMap(envMap);

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

      // 注意：只有开启slam平面追踪(slam.start())之后，才能让模型去尝试站在平面上。
      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      // 主动让模型站在屏幕中心映射到平面上的位置点。
      // 此处组件全屏展示，所以窗口宽度除以2
      const x = Math.round(windowWidth / 2);
      // 此处组件全屏展示，所以窗口高度除以2
      const y = Math.round(windowHeight / 2);
      // 首次调用standOnThePlane，resetPlane参数必须设为true，以便确定一个平面。
      // 如果为false，代表使用已经检测到的平面。默认为true。
      const resetPlane = true;
      /**
       * 让3D素材对象，站立在检测出来的平面之上。
       * @param {Base3D} base3D - 3D对象
       * @param {Number} x - kivicube-slam组件上的x轴横向坐标点
       * @param {Number} y - kivicube-slam组件上的y轴纵向坐标点
       * @param {Boolean} [resetPlane=true] - 是否重置平面。
       * @returns {Boolean} 是否成功站立在平面上
       */
      const success = slam.standOnThePlane(rabbitModel, x, y, resetPlane);
      // 如果返回false，代表尝试站在平面上失败。有可能是平面检测失败。
      console.log("standOnThePlane success", success);

      // 让兔子模型可用手势进行操作。默认点击移动到平面上的新位置，单指旋转，双指缩放。
      slam.setGesture(rabbitModel);

      this._timer = setTimeout(() => {
        console.log("当前是否处于追踪状态：", slam.isTracking());
        console.log("当前是否为陀螺仪追踪：", slam.isGyroscope());
        console.log("当前slam版本是否为v2：", slam.isSlamV2());
      }, 3000)

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

  handleClear() {
    const { slam } = this;
    // 获取组件中所有的3D对象
    const list = slam.getAllObject();
    list.forEach(obj => {
      // 移除组件中的3D对象
      slam.remove(obj);
      // 销毁创建的3D对象(回收内存)
      slam.destroyObject(obj);
    });

    // 清空并销毁组件中所有的3D对象和内容 (与以上的操作等效)
    // slam.clear();
  },

  /**
   * 如果需要跳转到其他内存占用也比较高的页面, 建议进入后, 主动移除slam组件
   * 如果需要跳转到的页面是个比较普通的展示页, 可用不用移除slam组件, 这样回到slam页时, 还能继续体验
   * **/
  handleNav() {
    wx.navigateTo({
      url: "/pages/test/test",
      success: () => {
        // 进入其他页面后, 主动移除slam组件, 组件被移除后会自动清除并销毁所有3d内容, 释放占用的内存
        this.setData({isRender: false});
      },
    });
  },

  // 页面显示时, 重新渲染组件
  onShow() {
    if (this.slam) {
      this.setData({ isRender: true });
      wx.showLoading({ title: "重新初始化中...", mask: true });
    }
  },

  onUnload() {
    clearTimeout(this._timer);
  }
});

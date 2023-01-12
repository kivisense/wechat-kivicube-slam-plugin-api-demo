import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

function updateMatrix(object, { transform }) {
  if (transform) {
    object.matrix.fromArray(transform);
    object.matrix.decompose(object.position, object.quaternion, object.scale);
  }
}

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile(
      "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb"
    );

    this.shadowPlanes = {};
  },

  async ready({ detail: slam }) {
    try {
      this.slam = slam;
      const modelArrayBuffer = await this.downloadAsset;
      const model3d = await slam.createGltfModel(modelArrayBuffer);

      slam.add(model3d, 0.5);

      // 开启slam平面追踪
      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const result = slam.standOnThePlane(
        model3d,
        Math.round(windowWidth / 2),
        Math.round(windowHeight / 2),
        true
      );
      console.log("standOnThePlane result", result);

      model3d.playAnimation({ loop: true });

      // 插件版本 >= 1.3.19 后，建议这样创建阴影

      // ================== 以下代码仅供插件版本 >= 1.3.19 使用 ==========================
      if (result) {
        // 设置阴影的分辨率, 注意：分辨率越高性能消耗越大，另外请设置分辨率为2的幂次方
        slam.defaultDirectionalLight.shadow.mapSize.width = 1024;
        slam.defaultDirectionalLight.shadow.mapSize.height = 1024;

        if (slam.isGyroscope()) {
          // 陀螺仪模式建议用这个方式创建阴影
          slam.enableShadow(0.15);
        } else {
          // result.plane 是模型被放置到的平面对象，插件版本 >= 1.3.19 后支持
          this.setShadowPlane(result.plane, 0.15);
        }
      }
      // ================== 以上代码仅供插件版本 >= 1.3.19 使用 ==========================


      // 插件版本 < 1.3.19 只能这样创建阴影
      /**
       * 开启阴影功能，同时设置阴影强度。同时模型也需要开启阴影投射属性。
       * 开启后，后续也可调用此方法来修改阴影强度。
       * @param {Number} [shadowIntensity=0.15] - 阴影强度。默认值为0.15。值范围为0-1，0为无效果，1为最强。
       */
      // slam.enableShadow();

      // 禁用阴影功能。
      // slam.disableShadow();

      /**
       * 开启模型投射阴影属性。
       * @param {Boolean} cast - 是否投射。true为开启投射，false为关闭投射。
       * @param {Boolean} [recursive=true] - 是否递归设置所有子对象。默认为true。模型对象建议为true，否则阴影会不完整。
       */
      model3d.setCastShadow(true);

      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      errorHandler(e);
    }
  },



  /**
   * 根据传入的平面信息，放置阴影面片
   */
  setShadowPlane(plane, opacity) {
    if (!plane) return;
    const { slam } = this;

    if (this.currentPlaneId === plane.id) return;
    this.currentPlaneId = plane.id;

    /**
     * 注意：此API需要插件版本 >= 1.3.19
     * 
     * 创建一个阴影面片对象，设置阴影面片的大小和阴影强度。
     * @param {Number} [width] - 阴影片的宽度(阴影片贴在平面后的长度)
     * @param {Number} [height] - 阴影片的高度(阴影片贴在平面后的宽度)
     * @param {Number} [shadowIntensity=0.15] - 阴影强度。默认值为0.15。值范围为0-1，0为无效果，1为最强。
     */
    const shadowPlane = slam.createShadowPlane(100, 100, opacity);
    // 创建阴影面片后，开启阴影投射
    slam.startShadow();

    this.timer = setTimeout(() => {
      // 关闭阴影投射
      slam.stopShadow();

      wx.showToast({
        title: "阴影投射已关闭",
        icon: "none"
      });
    }, 4000);

    // 更新阴影面片的矩阵信息
    updateMatrix(shadowPlane, plane);

    /**
     * 阴影面片默认是紧贴在模型放置的平面上，为了避免面片与模型极度紧贴可能导致的显示异常
     * 这里需要把阴影面片的y轴位置向下调整，这里的数值仅作参考
     */
    shadowPlane.position.y -= 0.05;

    this.shadowPlanes[plane.id] = shadowPlane;
    slam.add(shadowPlane);

    /**
     * 只显示站立在当前平面id上的阴影片
     * **/
    Object.entries(this.shadowPlanes).forEach(
      ([planeId, plane]) => (plane.visible = planeId === this.currentPlaneId)
    );
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

  onUnload() {
    clearTimeout(this.timer);
  },
});

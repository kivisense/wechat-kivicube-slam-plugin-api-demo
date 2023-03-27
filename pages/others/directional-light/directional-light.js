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
    directionalIntensity: 0,
    horizontal: 0,
    vertical: 0,
    version: "v2",
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile(
      "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/damaged-helmet.glb"
    );

    this.shadowPlanes = {};
  },

  async ready({ detail: slam }) {
    try {
      const modelArrayBuffer = await this.downloadAsset;
      const model = await slam.createGltfModel(modelArrayBuffer);

      this.model = model;
      this.slam = slam;

      /**
       * 组件内部拥有默认的环境光和平行光，灯光颜色皆为白色，环境光强度为0.3，平行光强度为2.5。
       * 平行光(position默认为0, 1, 0)，方向为从上往下照射，即从头照向脚。
       */
      const { defaultDirectionalLight } = slam;

      this.setData({
        directionalIntensity: defaultDirectionalLight.intensity,
      });

      slam.add(model, 0.5);

      model.setCastShadow(true);

      // 开启slam平面追踪
      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const success = slam.standOnThePlane(
        model,
        Math.round(windowWidth / 2),
        Math.round(windowHeight / 2),
        true
      );
      console.log("standOnThePlane success", success);

      // v1用这个创建阴影
      // slam.enableShadow(0.5);

      // v2用这个
      slam.defaultDirectionalLight.shadow.mapSize.width = 1024;
      slam.defaultDirectionalLight.shadow.mapSize.height = 1024;
      slam.setGesture(model, {
        clickResult: (result) => {
          if (result && slam.isSlamV2()) {
            this.setShadowPlane(result.plane, 0.5);
          }
        },
      });

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

  directionalChange({ detail }) {
    const intensity = (+detail.value).toFixed(1);
    this.setData({ directionalIntensity: intensity });

    this.slam.defaultDirectionalLight.intensity = intensity;
  },

  horizontalChange({ detail }) {
    console.log("horizontalChange", detail.value)
    const horizontal = (+detail.value).toFixed(1);
    this.setData({ horizontal });

    this.setupDirectional(this.data.vertical, horizontal);
  },

  verticalChange({ detail }) {
    console.log("verticalChange", detail.value)
    const vertical = (+detail.value).toFixed(1);
    this.setData({ vertical });

    this.setupDirectional(vertical, this.data.horizontal);
  },

  setupDirectional (vertical, horizontal) {
    const defaultDirectionalLight = this.slam.defaultDirectionalLight;
    const directionalPosition = defaultDirectionalLight.position;
    const axisX = directionalPosition.clone().set(1, 0, 0);
    const axisY = directionalPosition.clone().set(0, 1, 0);

    const degToRad = (degrees) => {
      return degrees * (Math.PI / 180);
    }

    directionalPosition.applyAxisAngle(axisX, degToRad(+vertical));
    directionalPosition.applyAxisAngle(axisY, degToRad(+horizontal));
    
    const position = directionalPosition.clone();
    const worldPosition = position.applyMatrix4(this.model.matrixWorld);

    defaultDirectionalLight.position.copy(worldPosition);
    defaultDirectionalLight.target.position.copy(this.model.position);
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

    // 关闭阴影投射
    // slam.stopShadow();

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
});

import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    directionalIntensity: 0,
    horizontal: 20,
    vertical: 20,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile(
      "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/damaged-helmet.glb"
    );
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

    //   this.setupDirectional(this.data.vertical, this.data.horizontal);
      const helper = slam.createDirectionalLightHelper(defaultDirectionalLight, 1)
      this.helper = helper;

      slam.add(model, 0.5);

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

      slam.setGesture(model);

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
    const model = this.model;

    function localToWorld (vec3) {
      return vec3.applyMatrix4( this.matrixWorld );
    }
    
    defaultDirectionalLight.position.copy(localToWorld.call(model, position));
    defaultDirectionalLight.target.position.copy(model.position);

    this.helper.update();
  },
});

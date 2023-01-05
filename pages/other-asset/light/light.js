import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    ambientIntensity: 0,
    directionalIntensity: 0,
    moreAmbientIntensity: 0,
    moreDirectionalIntensity: 0,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile(
      "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/DamagedHelmet.glb"
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
       * 平行光方向默认为从上往下照射，即从头照向脚。
       */
      const { defaultAmbientLight, defaultDirectionalLight } = slam;

      this.setData({
        ambientIntensity: defaultAmbientLight.intensity,
        directionalIntensity: defaultDirectionalLight.intensity,
      });

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

      /**
       * 大部分情况下，对模型使用环境贴图和默认的环境光、平行光已经足够。
       * 如果确实有特殊情况，可以增加更多的灯光。
       * 注意：灯光不能增加太多，否则性能会严重受损。
       */

      /**
       * 创建一个环境光
       * @param {String|Integer} [color=0xffffff] - 指定颜色值，默认为白色。格式可为：0xff0000、'rgb(250, 0,0)'、'rgb(100%,0%,0%)'、'hsl(0, 100%, 50%)'、'#ff0000'、'#f00'、'red'
       * @param {Number} [intensity=1] - 灯光强度，默认为1。
       * @returns {AmbientLight}
       */
      const ambientLight = slam.createAmbientLight(0xffffff, 1);
      slam.add(ambientLight);

      /**
       * 创建一个平行光
       * @param {String|Integer} [color=0xffffff] - 指定颜色值，默认为白色。格式参考上方。
       * @param {Number} [intensity=1] - 灯光强度，默认为1。
       * @returns {DirectionalLight}
       */
      const directionalLight = slam.createDirectionalLight(0xffffff, 2);
      // 可将平行光直接放在模型的前方，无论模型如何移动、旋转，平行光始终照在模型前面。
      // 平行光方向由directionalLight.position指向directionalLight.target.position。
      directionalLight.position.set(0, 0, 1);
      directionalLight.target.position.set(0, 0, 0); // target对象position默认为0，0，0

      model.add(directionalLight);
      model.add(directionalLight.target);

      this.ambientLight = ambientLight;
      this.directionalLight = directionalLight;

      this.setData({
        moreAmbientIntensity: ambientLight.intensity,
        moreDirectionalIntensity: directionalLight.intensity,
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

  ambientChange({ detail }) {
    const intensity = (+detail.value).toFixed(1);
    this.setData({ ambientIntensity: intensity });

    this.slam.defaultAmbientLight.intensity = intensity;
  },

  directionalChange({ detail }) {
    const intensity = (+detail.value).toFixed(1);
    this.setData({ directionalIntensity: intensity });

    this.slam.defaultDirectionalLight.intensity = intensity;
  },

  moreAmbientChange({ detail }) {
    const intensity = (+detail.value).toFixed(1);
    this.setData({ moreAmbientIntensity: intensity });

    this.ambientLight.intensity = intensity;
  },

  moreDirectionalChange({ detail }) {
    const intensity = (+detail.value).toFixed(1);
    this.setData({ moreDirectionalIntensity: intensity });

    this.directionalLight.intensity = intensity;
  },
});

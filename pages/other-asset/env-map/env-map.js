import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    envMap: 0,
    intensity: 1,
    envMapNameList: ["HDR", "Panorama", "Cube"],
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = Promise.all([
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/damaged-helmet.glb"
      ),
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/hdr/default.hdr"
      ),
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/image/360.jpg"
      ),
      Promise.all(
        ["nx", "px", "ny", "py", "nz", "pz"].map((name) =>
          requestFile(
            `https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/image/cube-map/${name}.jpg`
          )
        )
      ),
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [modelArrayBuffer, hdrArrayBuffer, panoramaArrayBuffer, cubeMap] = await this.downloadAsset;
      const [model, envMapHdr, envMapPano, envMapCube] = await Promise.all([
        slam.createGltfModel(modelArrayBuffer),
        slam.createEnvMapByHDR(hdrArrayBuffer),
        slam.createEnvMapByPanorama(panoramaArrayBuffer, "jpg"),
        slam.createEnvMapByCubeMap({
          nx: cubeMap[0],
          "nx-type": "jpg",
          px: cubeMap[1],
          "px-type": "jpg",
          ny: cubeMap[2],
          "ny-type": "jpg",
          py: cubeMap[3],
          "py-type": "jpg",
          nz: cubeMap[4],
          "nz-type": "jpg",
          pz: cubeMap[5],
          "pz-type": "jpg",
        }),
      ]);

      this.model = model;
      this.envMapList = [envMapHdr, envMapPano, envMapCube];

      const currentEnvMap = this.envMapList[this.data.envMap];
      currentEnvMap.envMapIntensity = this.data.intensity;

      model.useEnvMap(currentEnvMap);

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

  intensityChange({ detail }) {
    const intensity = (+detail.value).toFixed(1);
    this.setData({ intensity });

    // 拿到当前的环境贴图对象
    const currentEnvMap = this.envMapList[this.data.envMap];
    // 设置环境贴图强度
    currentEnvMap.envMapIntensity = intensity;
    // 应用环境贴图
    this.model.useEnvMap(currentEnvMap);
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

  envMapChange({ detail }) {
    const envMap = +detail.value;
    this.setData({ envMap });

    // 拿到当前的环境贴图对象
    const currentEnvMap = this.envMapList[envMap];
    // 设置环境贴图强度
    currentEnvMap.envMapIntensity = this.data.intensity;
    // 应用环境贴图
    this.model.useEnvMap(currentEnvMap);
  },
});

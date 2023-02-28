import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    envMapIndex: 0,
    intensity: 1,
    envMapNameList: ["HDR", "Panorama", "Image", "Cube"],
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
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/image/pre-hdr.png"
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
      const [modelArrayBuffer, hdrArrayBuffer, panoramaArrayBuffer, imageArrayBuffer, cubeMap] = await this.downloadAsset;
      // 创建环境贴图对象
      const [model, envMapHdr, envMapPano, envMapImage, envMapCube] = await Promise.all([
        slam.createGltfModel(modelArrayBuffer),
        slam.createEnvMapByHDR(hdrArrayBuffer), // 创建一个基于HDR文件的环境贴图对象
        slam.createEnvMapByPanorama(panoramaArrayBuffer, "jpg"), // 创建一个基于全景图的环境贴图对象
        slam.createEnvMapByImage(imageArrayBuffer), // 创建一个基于图片的环境贴图对象
        slam.createEnvMapByCubeMap({ // 创建一个基于6张图组成天空盒的环境贴图对象
          nx: cubeMap[0],
          px: cubeMap[1],
          ny: cubeMap[2],
          py: cubeMap[3],
          nz: cubeMap[4],
          pz: cubeMap[5],
        }),
      ]);

      this.model = model;
      this.envMapList = [envMapHdr, envMapPano, envMapImage, envMapCube];

      const currentEnvMap = this.envMapList[this.data.envMapIndex];
      currentEnvMap.envMapIntensity = this.data.intensity;

      model.useEnvMap(currentEnvMap);
      this.currentEnvMap = currentEnvMap;

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
    const currentEnvMap = this.envMapList[this.data.envMapIndex];
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
    const envMapIndex = +detail.value;
    this.setData({ envMapIndex });

    // 拿到当前的环境贴图对象
    const currentEnvMap = this.envMapList[envMapIndex];
    // 设置环境贴图强度
    currentEnvMap.envMapIntensity = this.data.intensity;
    // 应用环境贴图
    this.model.useEnvMap(currentEnvMap);
    this.currentEnvMap = currentEnvMap;
  },

  // 去掉应用的环境贴图并销毁
  removeEnvMap() {
    // tips: 环境贴图被移除并销毁后，如果需要重新应用到模型上，请重新创建环境贴图对象。
    if (!this.currentEnvMap) return;
    
    // 模型去掉环境贴图的应用
    this.model.useEnvMap(null);
    // 销毁环境贴图
    this.currentEnvMap.destroy();
    this.currentEnvMap = null;

    // 移除并销毁环境贴图后，去掉picker组件的选项
    const envMapNameList = [...this.data.envMapNameList];
    envMapNameList.splice(this.data.envMapIndex, 1);
    this.envMapList.splice(this.data.envMapIndex, 1);

    this.setData({ envMapNameList, envMapIndex: -1 });
  },
});

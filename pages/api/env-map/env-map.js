import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    envMap: 0,
    envMapNameList: ["HDR", "Panorama", "Cube"],
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = Promise.all([
      requestFile(
        "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/DamagedHelmet.glb"
      ),
      requestFile(
        "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/default.hdr"
      ),
      requestFile(
        "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/360.jpg"
      ),
      Promise.all(
        ["nx", "px", "ny", "py", "nz", "pz"].map((name) =>
          requestFile(
            `https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/cube-map/${name}.jpg`
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

      model.useEnvMap(this.envMapList[this.data.envMap]);

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

  envMapChange({ detail }) {
    const envMap = +detail.value;
    this.setData({ envMap });

    this.model.useEnvMap(this.envMapList[envMap]);
  },
});

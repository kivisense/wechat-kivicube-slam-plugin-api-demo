import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

/**
 * 下载被gltfpack工具进行网格面优化压缩后的模型。
 * https://www.npmjs.com/package/gltfpack
 * 
 * 命令示例：gltfpack -cf -i skateboarder.glb -o skate.glb
 * 会输出skate.glb和skate.fallback.bin两个文件。
 *
 * 经过gltfpack工具优化后，两个文件之和(917kb+1.6MB)，比原始的模型文件(8MB)要小很多。
 *
 * @param {String} glbUrl - 优化压缩后的glb文件
 * @param {String} fallbackUrl - 不支持优化压缩时的备用文件
 * @returns {Promise<Object>}
 */
async function requestMeshCompressionGltfFile(glbUrl, fallbackUrl) {
  const [glbAb, fallbackAb] = await Promise.all([
    requestFile(glbUrl),
    requestFile(fallbackUrl)
  ]);
  return {
    gltf: glbAb,
    files: {
      [fallbackUrl
        .split("?")
        .shift()
        .split("/")
        .pop()
      ]: {
        type: "buffer",
        file: fallbackAb
      }
    }
  };
}


Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestMeshCompressionGltfFile(
      "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/ska/ska.glb",
      "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/ska/ska.fallback.bin"
    );
  },

  async ready({ detail: slam }) {
    this.slam = slam;
    const fileConfig = await this.downloadAsset;
    const model = await slam.createGltfModel(fileConfig);

    try {
      slam.add(model, 0.4);
      await slam.start();

      const { windowHeight, windowWidth } = wx.getWindowInfo();
      this.setModel(model, windowWidth / 2, windowHeight / 2);

      wx.hideLoading();
    } catch (e) {
      errorHandler(e);
      wx.hideLoading();
    }
  },

  setModel(model, x, y) {
    const success = this.slam.standOnThePlane(model, x, y, true);
    if (success) {
      model.playAnimation({ loop: true });
    } else {
      wx.showToast({
        title: "放置模型失败，请对准平面",
        icon: "none"
      });
    }
  },

  error({ detail }) {
    // 判定是否camera权限问题，是则向用户申请权限。
    if (detail?.isCameraAuthDenied) {
      showAuthModal(this);
    } else {
      errorHandler(detail);
    }
  },
});

import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

function downloadMarker(url) {
  return new Promise((resolve, reject) => {
    const filename = url.split("?").shift().split("/").pop();
    const filePath = `${wx.env.USER_DATA_PATH}/__marker-${filename}`;
    wx.downloadFile({
      url,
      filePath,
      success({
        statusCode
      }) {
        if (statusCode === 200) {
          resolve(filePath);
        } else {
          reject(new Error(`下载文件(${url})失败, statusCode: ${statusCode}`));
        }
      },
      fail: reject,
    });
  });
}

/**
 * 开启marker定位后，当相机画面内追踪到识别图时，无需检测到平面即可将3d内容放置在识别图所在的位置。
 * 设备要求： 基础库>=3.0.0
 * 
 * 插件提供了 canUseMarker 方法来检测设备是否支持深度检测
 */
const { canUseMarker } = requirePlugin("kivicube-slam");
const marker = canUseMarker();

Page({
  data: {
    marker, // marker定位
    version: "v2", // marker定位必须在v2模式下才能开启
    license: getApp().globalData.license,
    showGuide: false,
  },

  onLoad() {
    wx.showLoading({
      title: "初始化中...",
      mask: true
    });

    console.warn(`marker支持：${marker}`);

    this.downloadAsset = Promise.all([
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb"
      ),
      downloadMarker(
        "https://project.kivisense.com/tmp-assets/image2d-ar/kivicube.jpg"
      ),
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [rabbitArrayBuffer, markerPath] = await this.downloadAsset;
      const [rabbitModel] = await Promise.all([
        slam.createGltfModel(rabbitArrayBuffer),
      ]);

      await slam.start();
      wx.hideLoading();

      this.setData({ showGuide: true });
      this.slam = slam;
      this.rabbitModel = rabbitModel;

      const markerAr = slam.getMarkerAR();
      // 先隐藏模型
      rabbitModel.visible = false;
      markerAr.add(rabbitModel);
      /**
       * 配置识别图。可配置多张。
       *
       * 注意：markerAr.setMarker调用之前，必须先调用await slam.start()
       *
       * @params markerPath {String|Array<String>} - 识别图本地路径。注意：只支持在wx.env.USER_DATA_PATH文件夹中的识别图。
       * @returns {Promsie<Number|Array<Number>>} 识别图Id
       */
      await markerAr.setMarker(markerPath);

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
  
  tracked({ detail: markerId }) {
    this.setData({ showGuide: false });

    const { rabbitModel: model, slam } = this;
    const markerAr = slam.getMarkerAR();

    console.log(`新增 markerId：${markerId}`);
    console.log("isTracked", markerAr.isTracked());
    
    model.visible = true;
    // 如果不旋转，模型对象将 “站立” 在识别图上，根据需求决定是否需要旋转
    model.rotation.x = -Math.PI / 2;
    // 获取包围盒大小
    const modelSize = model.getSize();
    // 设置一个放大基数，为1就表示与识别图在真实空间的宽度大概保持一致
    const multipleSize = 1;

    model.scale.setScalar(multipleSize / modelSize.x);

    // 如果只用作首次定位，用完后可移除marker
    // markerAr.removeMarker(markerId);
  },

  tracking({ detail: markerId }) {
    console.log(`tracking markerId：${markerId}`);
  },

  lostTrack({ detail: markerId }) {
    console.log(`lostTrack markerId：${markerId}`);
  },
});

import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile(
      "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/rabbit.glb"
    );
  },

  async ready({ detail: slam }) {
    try {
      const rabbitArrayBuffer = await this.downloadAsset;
      const rabbitModel = await slam.createGltfModel(rabbitArrayBuffer);
       /**
        * v1版本必须先将模型放置于平面上后才能围绕查看或者漫游。
        * v2版本将模型放入场景中时，直接支持场景漫游功能。
        * 当slam.start调用后，手机所在位置，就是世界坐标系的原点。
        * 如果不设置模型的position，模型就会默认摆放在原点坐标，即手机所在位置。
        * -z轴就是手机的正前方，+y轴就是正上方，+x轴就是右手方向。可按此方向调整模型默认出现的位置。
      */
      rabbitModel.position.z = -0.5;
      rabbitModel.position.y = -0.2;
      slam.add(rabbitModel, 0.3);

      await slam.start();

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
});

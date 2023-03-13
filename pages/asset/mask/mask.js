import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = Promise.all([
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb"
      ),
      requestFile(
        "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/mask.glb"
      ),
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [rabbitArrayBuffer, maskArrayBuffer] = await this.downloadAsset;
      const [rabbit, mask] = await Promise.all([
        slam.createGltfModel(rabbitArrayBuffer),
        slam.createGltfModel(maskArrayBuffer),
      ]);

      // 启用遮罩效果。遮罩可以将遮罩自身，和遮罩后方的所有内容，全部置为纯透明。
      // 达到去除特定形状的目的，以模拟真实物体遮挡等功能。
      mask.setEnableMask();
      // 禁用遮罩效果
      // robot.setDisableMask();

      // 创建一个组合对象
      const group = slam.createGroup();
      group.visible = false;

      // 向组合对象分别加入遮罩模型和需要被遮罩遮住的模型
      group.add(mask);
      group.add(rabbit);

      // 让兔子模型往下移动一点距离, 进入桶状的遮罩模型的内部
      rabbit.position.y = -0.2;
      
      // 加入组合对象
      slam.add(group, 1);

      rabbit.playAnimation({ loop: true });

      // 开启slam平面追踪
      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const success = slam.standOnThePlane(
        group,
        Math.round(windowWidth / 2),
        Math.round(windowHeight / 2),
        true
      );
      group.visible = true;
      console.log("standOnThePlane success", success);

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

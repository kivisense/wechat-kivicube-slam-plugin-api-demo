import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中..."});
    this.downloadAsset = requestFile("https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/robot.glb");
  },

  async ready({ detail: slam }) {
    try {
      const cubeImageUrl = "https://kivicube-resource.kivisense.com/projects/wechat-kivicube-slam-plugin-api-demo/skybox";
      const config = {
        px: await requestFile(`${cubeImageUrl}/px.jpg`),
        nx: await requestFile(`${cubeImageUrl}/nx.jpg`),
        py: await requestFile(`${cubeImageUrl}/py.jpg`),
        ny: await requestFile(`${cubeImageUrl}/ny.jpg`),
        pz: await requestFile(`${cubeImageUrl}/pz.jpg`),
        nz: await requestFile(`${cubeImageUrl}/nz.jpg`)
      }
       /**
       * 增加天空盒对象
       * @param {Object} config - 6张天空盒图片的配置对象，包含6张图的内容。
       * @param {Boolean} [background=true] - 是否显示为背景，不论模型放置离相机多远，天空盒始终在模型背后作为背景显示
       * @param {Function} [progress=()=>{}] - 加载进度
       * @returns {Promise<THREE.Mesh>}
       */
      const skybox = await slam.createSkyBox(config);
      
      const modelArrayBuffer = await this.downloadAsset;
      const model3d = await slam.createGltfModel(modelArrayBuffer);
      model3d.scale.setScalar(0.25);
      model3d.position.z = -50;
      model3d.position.y = -0.5;

      const group = slam.createGroup();
      group.add(skybox);
      group.add(model3d);

      /**
        * v1版本必须先将模型放置于平面上后才能围绕查看或者漫游。
        * v2版本将模型放入场景中时，直接支持场景漫游功能。
        * 当slam.start调用后，手机所在位置，就是世界坐标系的原点。
        * 如果不设置模型的position，模型就会默认摆放在原点坐标，即手机所在位置。
        * -z轴就是手机的正前方，+y轴就是正上方，+x轴就是右手方向。可按此方向调整模型默认出现的位置。
      */
      
      // v1 与 v2版本的精度有差距，这里在应用层做个大小的适配
      const initSize = slam.isSlamV1() ? 25 : 12;
      slam.add(group, initSize);

      await slam.start();

      // slam v1 需要放置后才能显示
      if (slam.isSlamV1()) {
        const { windowWidth, windowHeight } = wx.getSystemInfoSync();
        slam.standOnThePlane(
          group,
          Math.round(windowWidth / 2),
          Math.round(windowHeight / 2),
          true,
        );
      }

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

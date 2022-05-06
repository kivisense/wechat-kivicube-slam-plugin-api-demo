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
      const cubeImages = ["px.jpg", "nx.jpg", "py.jpg", "ny.jpg", "pz.jpg", "nz.jpg"];
      const cubePromises = cubeImages.map(image => requestFile(`${cubeImageUrl}/${image}`));

      const [px, nx, py, ny, pz, nz, modelArrayBuffer] = await Promise.all([...cubePromises, this.downloadAsset]);
      const model3d = await slam.createGltfModel(modelArrayBuffer);
      model3d.position.z = -10;

      const config = {px, nx, py, ny, pz, nz};
      
      
       /**
       * 增加天空盒对象
       * @param {Object} config - 6张天空盒图片的配置对象，包含6张图的内容。
       * @param {Boolean} [background=true] - 是否显示为背景，不论模型放置离相机多远，天空盒始终在模型背后作为背景显示
       * @param {Function} [progress=()=>{}] - 加载进度
       * @returns {Promise<THREE.Mesh>}
       */
      const skybox = await slam.createSkyBox(config);
      
      /**
       * <将天空盒做为整个场景的背景>
       * 调用createSkyBox时，background属性使用默认值true，
       * 再使用defaultCamera.add放入天空盒，就可让天空盒作为背景存在，不会遮挡住场景中的其他内容。
      */
      slam.defaultCamera.add(skybox);

      const initSize = slam.isSlamV1() ? 3 : 2;
      slam.add(model3d, initSize);


      /**
       * <将天空盒做为普通内容加入场景>
       * 为了遮挡关系正常，调用createSkyBox时，建议background设为false，
       * 再使用slam.add将天空盒加入场景中。
       */
      // const group = slam.createGroup();
      // group.add(skybox);
      // group.add(model3d);
      // slam.add(group, initSize);

      await slam.start();

      // slam v1 需要放置后才能显示
      if (slam.isSlamV1()) {
        const { windowWidth, windowHeight } = wx.getSystemInfoSync();
        slam.standOnThePlane(
          model3d,
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

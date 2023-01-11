# Kivicube Slam插件高级API使用说明文档

## 源码目录

**声明：所有的示例代码仅供大家开发参考，若移植到自己的项目后有任何问题，请先自行检查和确认问题来源。确实为组件问题的，请创建Issues反馈。**

### 一、基础

#### 1、[如何获取高级API](../../tree/master/pages/base/api/)

#### 2、[高级API基础应用](../../tree/master/pages/base/sample/)

#### 3、[场景展示页面的简单模拟](../../tree/master/pages/base/scene/)

### 二、素材内容

#### 1、[3D对象共有API【基类】](../../tree/master/pages/asset/common/) - 包含子对象处理、点击事件、渲染钩子函数、显示隐藏等的示例

#### 2、[图片](../../tree/master/pages/asset/image/)

#### 3、[精灵图序列](../../tree/master/pages/asset/image-sprite/)

#### 4、[视频/透明视频](../../tree/master/pages/asset/video/)

#### 5、[gltf/glb模型](../../tree/master/pages/asset/model/)

#### 6、[组合](../../tree/master/pages/asset/group/)

#### 7、[将素材指定为遮罩](../../tree/master/pages/asset/mask/)

#### 8、[平面指示器](../../tree/master/pages/asset/indicator/)

#### 9、[可视化辅助平面 (v2版本)](../../tree/master/pages/asset/visual-plane/)

#### 10、[全景图](../../tree/master/pages/asset/panorama/)

#### 11、[全景视频](../../tree/master/pages/asset/panorama-video/)

#### 12、[天空盒](../../tree/master/pages/asset/sky-box/)

### 三、其他内容

#### 1、[环境贴图](../../tree/master/pages/other-asset/env-map/)

#### 2、[光照](../../tree/master/pages/other-asset/light/)

#### 3、[阴影](../../tree/master/pages/other-asset/shadow/)

#### 4、[Camera](../../tree/master/pages/other-asset/camera/) - 获取位置、3D素材放置屏幕上

### 四、Slam功能

#### 1、[多平面检测与事件监听 (v2版本)](../../tree/master/pages/ability/multi-plane/)

#### 2、[VIO(6DOF)追踪(v2版本)](../../tree/master/pages/ability/vio-scene/)

### 五、其他

#### 1、[手势](../../tree/master/pages/others/gesture/)

#### 2、[拍照处理](../../tree/master/pages/others/photo/)

#### 3、[穿透自定义UI点击到模型](../../tree/master/pages/others/penetrate-ui/)

#### 4、[简单的自定义动画](../../tree/master/pages/others/simple-animation/)

#### 5、[实现缓动动画](../../tree/master/pages/others/tween-animation/)

#### 6、[云识别](../../tree/master/pages/others/cloudar/)

#### 7、[简单判断模型是否在相机画面内](../../tree/master/pages/others/model-render/)

#### 8、[加载量化(优化三角形/网格/材质/纹理/顶点/动画)后的模型](../../tree/master/pages/others/load-compressed-gltf/)

#### 9、[判断相机画面中心位置对准的位置能否放置模型](../../tree/master/pages/others/stand-check/)


## 快速体验

1. 使用git克隆此仓库至本地，可使用命令`git clone git@github.com:kivisense/wechat-kivicube-slam-plugin-api-demo.git`，或者点击右上角按钮Code -> Download ZIP下载代码。
2. 使用[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/stable.html)导入本项目。**重要：在“导入项目”时，必须将AppID修改为，被我们license授权过的appid。**
3. 打开app.js文件，替换为我们给予你的license。
4. 服务器域名配置。有两种方案，一是直接在手机上打开小程序的“开发调试”模式，参考[vConsole](https://developers.weixin.qq.com/miniprogram/dev/framework/usability/vConsole.html)；二是在小程序后台，将域名“ https://meta.kivisense.com ”配置到request和downloadFile两项中，参考[微信官方文档 - 网络](https://developers.weixin.qq.com/miniprogram/dev/framework/ability/network.html)。推荐第二种。
5. 之后，可在微信开发者工具上，点击“预览”按钮，用微信扫描打开体验。【Slam功能不支持在开发者工具上运行，也不支持真机调试。】

## API应用说明

### Slam

#### 什么是Slam?

全称simultaneous localization and mapping，即同步定位与建图。
可用来感知设备周围环境的3D地图信息，实现定位、导航和追踪。

kivicube-slam组件暂时仅支持其中的一环，即平面检测与追踪功能，可检测出手机周围环境中的平面(比如桌面、地面等水平面)。

检测到平面(比如桌面)之后，就可以将3D内容(比如一个杯子)摆放在平面之上，实现将虚拟的3D物体叠加至真实物体之上的效果。

#### 平面追踪

检测出平面之后，就会自动对其进行追踪，达到无论怎么移动和旋转手机，平面都始终在原地的功能。

调用代码`await slam.start();`之后，就会开启slam引擎和打开摄像头，但此时平面尚未检测出来。

还需要调用`slam.standOnThePlane`方法，将最后一个参数resetPlane设置为true，就可以快速在当前camera画面中，检测出一个无限延伸的平面。同时将3D内容放置在平面之上。

如果resetPlane参数设为false，就会直接使用已检测出来的平面，而不是再去检测新的平面。

**注意：首次调用slam.standOnThePlane方法时，一定要设置resetPlane参数设为true，去检测出一个平面来，否则放置3D内容会失败。**

### 陀螺仪

并不是所有设备、小程序基础库和微信版本都支持平面检测，当遇到不支持的情况时，组件会自动降级为陀螺仪模式。

可使用API来判定当前是否处于陀螺仪模式：`slam.isGyroscope();`，以便应用层做一些不同的处理。

陀螺仪和slam的区别如下所示：

1. 陀螺仪模式下，组件ready事件触发时，摄像头已经成功打开且显示出来了。而slam模式下，需要调用API`await slam.start();`之后，才会打开摄像头并展示出来。
2. 陀螺仪会有一个固定的平面，和真实世界无关。这个平面会随着手机的移动而移动(理解：slam模式下，手机移动位置时，会发现模型的大小会变化，符合真实世界的规律【近大远小】。但在陀螺仪模式下，模型的大小不会变化，除非移动模型在平面上的位置)。
3. slam模式下，重置平面时(即resetPlane设为true)，不会影响模型的rotation值。但陀螺仪模式会修改rotation.y，以使模型z轴正对我们，达到和slam模式下一致的效果。
4. 其他的效果和API使用，陀螺仪和slam都是一致的。

### 内容管理

1. 基类3D对象【Base3D】
2. 素材3D对象【Asset3D】
    - Image3D
    - ImageSprite3D
    - Video3D/AlphaVideo3D
    - Model3D
3. 光照3D对象【Light3D】
    - 基类Light
    - AmbientLight
    - DirectionalLight
4. 组合3D对象【Group3D】
5. 环境贴图对象【EnvMap】

所有3D对象都继承自Base3D，Light也继承自Base3D。
只有EnvMap是特殊的对象，不继承自Base3D。

只要是继承自Base3D的类实例，都可以使用`slam.add`方法，添加进组件之中。

当然也支持使用Base3D的add方法，使3D对象组合或嵌套之后，再添加进组件。

#### 视频/透明视频/全景视频

同个页面使用多个video，建议不超过3个：https://developers.weixin.qq.com/community/develop/doc/000e4ef22583d8961919efb6b56009


#### 组合

当我们有两个视频，需要他们一起受到手势操作，但又不想他们组成父子关系嵌套时，我们可以创建一个组合对象。让手势作用于组合对象，从而达到想要的效果。

```javascript
const video3d1 = await slam.createVideo(videoUrlOrPath);
const video3d2 = await slam.createAlphaVideo(videoUrlOrPath);
const videoGroup = slam.createGroup();

videoGroup.add(video3d1);
videoGroup.add(video3d2);

slam.setGesture(videoGroup);
slam.add(videoGroup);
```

**重要：当你有多个内容时，建议都放入组合之中，再slam.add(group)即可。**

### 平面指示器

如果希望知道slam引擎检测出来的平面位于什么位置，那可以将某个模型作为指示器加入组件。

这个模型会随着组件中心坐标，映射到平面上位置的移动而实时移动。以便简单的移动手机，就可展示出平面所在的位置。

>应用：如果想精确的将模型放置在某个位置，但因为手指触碰屏幕范围太大，点击的坐标不太准确，那么就可以添加一个平面指示器来间接实现。
>让用户移动手机，以便指示器达到指定的位置，此时就可以让用户任意点击一下屏幕，在点击回调中，从指示器模型上拿到精准的位置坐标(model3d.position属性值)，再将这个值赋予希望放置过去的模型即可。

### standOnThePlane

slam对象上的核心API，会使传入的3D对象放置在平面上的某个位置。

**注意：此API会改变3D对象的position和rotation。如果需要3D对象放置后的rotation不被改变，可以使用createGroup创建一个组合3D对象来包裹住3D对象，再使用此API进行放置。另一个standOnThePlaneById同理。示例如下：**

```
// 对3D对象的旋转进行改变
obj.rotation.x = Math.PI / 2;

const group = slam.createGroup();
group.add(obj);
// 使用group进行放置，内部的3D对象的旋转将不会被改变
slam.standOnThePlane(group, x, y, resetPlane);
```

## 高级API对象

阅读了上述的基础代码(即如何获取高级API)之后，会发现组件会通过ready事件，传递出一个拥有各种API、信息的对象【称之为高级API对象】。

我们一般将kivicube-slam组件传递出的高级API对象命名为slam。

### slam

slam对象，拥有以下字段：

| 字段 | 类型 | 说明 | 示例代码(了解API的传参和返回值定义) |
| ---- | ------- | --- | ------- |
| start | Function | 开启slam或陀螺仪追踪 | [pages/base/sample/](../../tree/master/pages/base/sample/) |
| stop | Function | 关闭slam或陀螺仪追踪 | [pages/base/sample/](../../tree/master/pages/base/sample/) |
| isTracking | Function | 判定当前是否处于追踪状态 | [pages/base/sample/](../../tree/master/pages/base/sample/) |
| isSlamV2 | Function | 判定当前slam版本是否为`v2`版本 | [pages/base/sample/](../../tree/master/pages/base/sample/) |
| isGyroscope | Function | 判定当前是否为陀螺仪追踪 | [pages/base/sample/](../../tree/master/pages/base/sample/) |
| standOnThePlane | Function | 让3D对象，放置在平面上的某个位置。 | [pages/base/sample/](../../tree/master/pages/base/sample/) |
| standOnThePlaneById | Function | 让3D对象，放置在指定id的平面上。 | [pages/ability/multi-plane/](../../tree/master/pages/ability/multi-plane/) |
| setVisualPlane | Function | 用3D素材来替换默认的可视化平面 | [pages/asset/visual-plane/](../../tree/master/pages/asset/visual-plane/) |
| createEnvMapByCubeMap | Function | 创建一个基于6张图组成天空盒的环境贴图对象 | [pages/other-asset/env-map/](../../tree/master/pages/other-asset/env-map/) |
| createEnvMapByPanorama | Function | 创建一个基于全景图的环境贴图对象 | [pages/other-asset/env-map/](../../tree/master/pages/other-asset/env-map/) |
| createEnvMapByHDR | Function | 创建一个基于HDR文件的环境贴图对象 | [pages/other-asset/env-map/](../../tree/master/pages/other-asset/env-map/) |
| createEnvMapByImage | Function | 创建一个基于图片的环境贴图对象 | [pages/other-asset/env-map/](../../tree/master/pages/other-asset/env-map/) |
| createImage | Function | 创建一个图片素材3D对象 | [pages/asset/image/](../../tree/master/pages/asset/image/) |
| createImageSprite | Function | 创建一个精灵图(动图)素材3D对象 | [pages/asset/image-sprite/](../../tree/master/pages/asset/image-sprite/) |
| createVideo | Function | 创建一个视频素材3D对象 | [pages/asset/video/](../../tree/master/pages/asset/video/) |
| createAlphaVideo | Function | 创建一个透明视频素材3D对象 | [pages/asset/video/](../../tree/master/pages/asset/video/) |
| createGltfModel | Function | 创建一个gltf/glb格式的模型素材3D对象 | [pages/asset/model/](../../tree/master/pages/asset/model/) |
| createGroup | Function | 创建一个组合3D对象。可用来装载其他3D对象(包括组合) | [pages/asset/group/](../../tree/master/pages/asset/group/) |
| createAmbientLight | Function | 创建一个环境光3D对象 | [pages/other-asset/light/](../../tree/master/pages/other-asset/light/) |
| createDirectionalLight | Function | 创建一个平行光3D对象 | [pages/other-asset/light/](../../tree/master/pages/other-asset/light/) |
| createPanorama | Function | 创建一个全景图对象 | [pages/asset/panorama/](../../tree/master/pages/asset/panorama/) |
| createPanoramaVideo | Function | 创建一个全景视频对象 | [pages/asset/panorama-video/](../../tree/master/pages/asset/panorama-video/) |
| createSkyBox | Function | 创建一个天空盒对象 | [pages/asset/sky-box/](../../tree/master/pages/asset/sky-box/) |
| defaultAmbientLight | Object | 获取默认的环境光3D对象 | [pages/other-asset/light/](../../tree/master/pages/other-asset/light/) |
| defaultDirectionalLight | Object | 获取默认的平行光3D对象 | [pages/other-asset/light/](../../tree/master/pages/other-asset/light/) |
| add | Function | 将上述创建好的3D对象，增加进组件之中去呈现。 | [pages/base/sample/](../../tree/master/pages/base/sample/) |
| addPlaneIndicator | Function | 将素材3D对象，以平面指示器的形式放入组件中呈现。 | [pages/asset/indicator/](../../tree/master/pages/asset/indicator/) |
| removePlaneIndicator | Function | 移除作为平面指示器的素材3D对象 | [pages/asset/indicator/](../../tree/master/pages/asset/indicator/) |
| remove | Function | 移除组件中的某个3D对象 | [pages/base/sample/](../../tree/master/pages/base/sample/) |
| getAllObject | Function | 获取组件中所有的3D对象 | [pages/base/sample/](../../tree/master/pages/base/sample/) |
| destroyObject | Function | 销毁创建的某个3D对象。(回收内存) | [pages/base/sample/](../../tree/master/pages/base/sample/) |
| clear | Function | 清空并销毁组件中所有的3D对象和内容 | [pages/base/sample/](../../tree/master/pages/base/sample/) |
| setGesture | Function | 设置手势作用的3D对象和功能 | [pages/others/gesture/](../../tree/master/pages/others/gesture/) |
| dispatchTouchEvent | Function | 手动触发一个touch类事件 | [pages/others/penetrate-ui/](../../tree/master/pages/others/penetrate-ui/) |
| takePhoto | Function | 拍照 | [pages/others/photo/](../../tree/master/pages/others/photo/) |

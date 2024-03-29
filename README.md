# GoodCam API

GoodCam devices provide a REST API, RTSP server and they are also able to
advertise themselves in a local network environment using mDNS and DNS-SD.

See our [API documentation](https://goodcam.github.io/goodcam-api/) for more
information.

It is also possible to access your devices remotely via GoodCam Cloud. See the
[GoodCam Cloud API documentation](https://goodcam.github.io/goodcam-api/cloud.html)
for more details.

## Integration examples

The examples below demonstrate how to integrate a GoodCam camera into your
application. All the examples are based on the
[API documentation](https://goodcam.github.io/goodcam-api/) mentioned above.

* [Absolute minimum for h264 playback on web](https://github.com/GoodCam/goodcam-api/tree/master/examples/minimal-web-player-h264)
* [Absolute minimum for MJPEG playback on web](https://github.com/GoodCam/goodcam-api/tree/master/examples/minimal-web-player-mjpeg)
* [More sophisticated web player](https://github.com/GoodCam/goodcam-api/tree/master/examples/advanced-web-player)
* [WebRTC player](https://github.com/GoodCam/goodcam-api/tree/master/examples/webrtc-player)

## Knowledge base

The links below explain some common pitfalls that you can face when integrating
GoodCam APIs into your project.

* [Streaming options](docs/streaming-options.md)
* [GoodCam cloud protocol](docs/cloud-server.md)
* [No credentials prompt for cross-origin requests in Safari](docs/cors-credentials-prompt.md)

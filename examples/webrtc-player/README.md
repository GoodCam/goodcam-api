# WebRTC player

This is an example of a WebRTC video player for GoodCam cameras. See
`example.html` and contents of the `js` folder for the full implementation.

Please note that you need to set the video codec of your camera stream to h264.
MJPEG is not supported by WebRTC. Depending on the web browser, you may also
need to change the codec settings. See the table below for more information.

| Platform | Browser | Supported codecs | Supported h264 profiles | Notes |
| -------- | ------- | ---------------- | ----------------------- | ----- |
| Android | Chrome | h264 | baseline, main, high | |
| Android | Firefox | h264 | baseline, main, high | |
| Android | Samsung Browser | h264 | baseline, main, high | |
| iOS | Chrome | h264 | baseline, main, high | |
| iOS | Safari | h264 | baseline, main, high | |
| Linux | Chrome | h264 | baseline, main, high | |
| Linux | Edge | ? | | |
| Linux | Firefox | h264 | baseline, main, high | |
| OS X | Chrome | h264 | baseline, main, high | |
| OS X | Edge | h264 | baseline, main, high | |
| OS X | Firefox | - | | see Note 1 |
| OS X | Safari | h264 | baseline, main, high | |
| Windows | Chrome | h264 | baseline, main, high | |
| Windows | Edge | h264 | baseline, main, high | |
| Windows | Firefox | h264 | baseline, main, high | |

_Note 1: No errors in console. Communication is working but the browser does
not display any video. It's possible that it's just an issue with
BrowserStack._

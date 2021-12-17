# Absolute minimum for h264 playback on web

GoodCam firmware supports streaming of h264 video via fragmented MP4, so the
integration of a video stream into a web page is really straightforward.
However, there is a few things that you should pay attention to:

1. Fragmented MP4 is not supported on all platforms. These platforms/browsers
   currently do not support this type of stream:
   * Safari on any platform,
   * all web browsers in iOS.
2. The video provided by the camera is a live stream. It cannot be paused and
   if your browser suspends pulling of the stream for some reason, the
   connection might break and you'll have to restart the playback. Because of
   this, you either have to enable autoplay or you have to disable video
   preload. You also shouldn't be using the built-in player controls to avoid
   users explicitly pausing the video.
3. If you'd like to enable autoplay, you'll have to follow the autoplay
   policies enforced by web browsers. In short, it usually means disabling
   audio. For more details, read this excellent
   [guide](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)
   from Mozilla.
4. Fragmented MP4 stream URLs are available only for streams with h264 codec.
   If you change the video codec of your stream to MJPEG, you won't be able to
   get a fragmented MP4 stream.

## Example with autoplay

See [autoplay.html](autoplay.html) for the complete example.

```html
<!--
    REMEMBER: Always use autoplay together with muted. Otherwise, the autoplay
    won't work and the browser will likely try to preload the video in the
    background and then suspend the connection. This will eventually break the
    underlying connection and you won't see any video once you click on the
    play button.
-->
<video autoplay muted>
    <source src="http://CAMERA_IP/api/v1/streams/primary/stream.mp4" type="video/mp4">
</video>
```

## Example without autoplay

See [no-autoplay.html](no-autoplay.html) for the complete example.

```html
<!--
    REMEMBER: Always disable prealod when not using autoplay. Otherwise, the
    browser will open the connection in the background and suspend it which
    will eventually break the connection and you won't see any video once you
    click on the play button.
-->
<video preload="none">
    <source src="http://CAMERA_IP/api/v1/streams/primary/stream.mp4" type="video/mp4">
</video>
```

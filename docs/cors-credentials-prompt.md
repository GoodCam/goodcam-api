# Blocked credentials prompt for cross-origin requests

Safari and other WebKit based browsers block the credentials prompt for all
cross-origin request even if you use the `credentials: 'include'` option for
`fetch()`. This is a known problem and, unfortunately, there is no official way
how to tell the browser that it should really ask for the credentials.

If you see a message like this:
```
Blocked ... from asking for credentials because it is a cross-origin request.
```
in your console, then you're facing this issue.

This can be a problem for applications that are designed to communicate with
GoodCam devices either directly within a local network or remotely using
GoodCam Cloud. There are two solutions to this problem. The first solution is
more robust and it should be preferred whenever possible. The second solution
should be treated as a hack because it is possible that it may be blocked by
WebKit in the future.

## Solution #1: middleware

This solution is actually quite simple to describe. Unfortunately, it's a bit
harder to implement. The idea is to create your own backend which will serve
your application frontend along with middleware (proxy) endpoints from the same
domain. All requests from your frontend will then go only to your backend
(instead of GoodCam Cloud/devices) and your backend will be responsible for
communicating with GoodCam devices or GoodCam cloud.

This will effectively make all your requests same-origin and there will be no
complications in the frontend. Your backend will be responsible for
communicating with GoodCam devices, so you can make everything as secure as
possible (e.g. use SHA-256 based HTTP Digest for camera authentication) because
you won't be limited by web browsers anymore.

## Solution #2: hack with an iframe

This solution leverages the fact that Safari will show the user credentials
prompt for cross-origin resources loaded via an iframe and it will cache the
Digest authentication response for other requests performed later using
`fetch()` with the `credentials: 'include'` option.

So the only thing you have to do in order to force Safari to show the
credentials prompt for cross-origin requests is to perform a GET request using
an iframe:
```html
<script>
    (function () {
        const corsCredentialsIframe = document.createElement('iframe');

        // the iframe does not need to be visible
        corsCredentialsIframe.style.display = 'none';

        document.body.appendChild(corsCredentialsIframe);

        function getCredentials(protocol, addr) {
            return new Promise((resolve, reject) => {
                corsCredentialsIframe.onload = () => {
                    corsCredentialsIframe.onload = null;
                    corsCredentialsIframe.onerror = null;

                    resolve();
                };

                corsCredentialsIframe.onerror = (e) => {
                    corsCredentialsIframe.onload = null;
                    corsCredentialsIframe.onerror = null;

                    reject(e);
                };

                corsCredentialsIframe.src = `${protocol}//${addr}/api/v1/`;
            });
        }

        // Then use the getCredentials() function before you start
        // communicating with a GoodCam device, e.g.:
        (async () => {
            const protocol = window.location.protocol;
            const addr = "replace-with-device-address";

            await getCredentials(protocol, addr);

            // ... and now do something useful with the device
            await fetch(`${protocol}//${addr}/api/v1/reboot/`, {
                credentials: 'include',
                method: 'POST',
            });
        })();
    })();
</script>
```

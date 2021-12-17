const DISPLAY_NONE = 'none';
const DISPLAY_SNAPSHOT = 'snapshot';
const DISPLAY_MJPEG = 'mjpeg';
const DISPLAY_H264 = 'h264';

const STATE_STOPPED = 'stopped';
const STATE_PLAY = 'play';
const STATE_PLAYING = 'playing';
const STATE_WAITING = 'waiting';
const STATE_TIMEOUT = 'timeout';
const STATE_ENDED = 'ended';
const STATE_ERROR = 'error';

/**
 * Sleep a given amount of time.
 *
 * @param {number} milliseconds
 * @returns a promise
 */
async function sleep(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
}

/**
 * Error thrown if the autoplay fails.
 */
class AutoplayError extends Error {}

/**
 * Internal video player.
 */
class InternalVideoPlayer {
    /**
     * Create a new player.
     *
     * @param {object} options
     */
    constructor(options) {
        this.options = options;

        if (options.parent instanceof Element) {
            this.parent = options.parent;
        } else {
            this.parent = document.querySelector(options.parent);
        }

        if (!this.parent) {
            throw new Error(`parent element ${options.parent} does not exist`);
        }

        this.parent.replaceChildren();

        this.videoImg = document.createElement('img');
        this.videoElem = document.createElement('video');
        this.snapshotImg = document.createElement('img');

        this.display(DISPLAY_NONE);

        this.videoElem.preload = 'none';
        this.videoElem.autoplay = false;
        this.videoElem.muted = !!options.autoplay;

        if (options.muted !== undefined) {
            this.videoElem.muted = !!options.muted;
        }

        if (this.videoElem.autoplay && !this.videoElem.muted) {
            console.info('Autoplay may not work unless the audio is muted');
        }

        this.parent.appendChild(this.videoImg);
        this.parent.appendChild(this.videoElem);
        this.parent.appendChild(this.snapshotImg);

        this.state = STATE_STOPPED;
        this.currentStream = null;
        this.playbackTimeout = null;
        this.retryDelay = 0;

        (async () => {
            if (options.autoplay && options.stream) {
                try {
                    await this.play(options.stream);
                } catch(e) {
                    if (e instanceof AutoplayError) {
                        await this.displaySnapshot();
                    }

                    console.warn(e);
                }
            } else if (options.stream) {
                await this.displaySnapshot();
            } else {
                console.warn('Unable to start the video automatically (missing stream name)');
            }
        })();
    }

    /**
     * Get URL of a given camera endpoint.
     *
     * @param {string} endpoint
     * @returns URL
     */
    getApiUrl(endpoint) {
        return `http://${this.options.address}/api/v1` + endpoint;
    }

    /**
     * Send a GET request to a given URL.
     *
     * @param {string} url
     * @returns response
     */
    async fetch(url) {
        return await fetch(url, {
            credentials: 'include',
        });
    }

    /**
     * Get a list of streams from the camera API.
     *
     * @returns list of camera streams
     */
    async getStreams() {
        let r = await this.fetch(this.getApiUrl('/streams'));

        if (r.status !== 200) {
            throw new Error(`server responded with HTTP ${r.status} ${r.statusText}`);
        }

        return await r.json();
    }

    /**
     * Get a snapshot URL.
     *
     * @returns snapshot URL
     */
    async getSnapshotUrl() {
        let streams = await this.getStreams();

        for (let stream of streams) {
            for (let url of stream.urls) {
                if (url.format === 'jpeg') {
                    return url.url;
                }
            }
        }

        return null;
    }

    /**
     * Start playback of a given stream.
     *
     * @param {string} streamName stream name
     */
    async play(streamName) {
        streamName = streamName || this.currentStream || this.options.stream;

        if (!streamName) {
            throw new Error("stream name is not set");
        }

        try {
            await this.stopCurrentTask();

            this.currentStream = streamName;
            this.retryDelay = 2000;

            this.updateState(STATE_PLAY);

            let streams = await this.getStreams();

            // get the corresponding stream description
            let stream = streams.find(s => s.name === streamName);

            if (!stream) {
                throw new Error(`unknown stream "${streamName}"`);
            }

            for (let url of stream.urls) {
                switch (url.format) {
                    case 'mp4': return await this.playMP4Stream(url.url);
                    case 'mjpeg': return await this.playMJPEGStream(url.url);
                    default: break;
                }
            }
        } catch (e) {
            // check for the autoplay error and throw it out for the user
            if (e.name === 'NotAllowedError') {
                throw new AutoplayError('autoplay failed');
            }

            this.updateState(STATE_ERROR, e);
        }
    }

    /**
     * Pause playback.
     */
    async pause() {
        if (this.state === STATE_STOPPED) {
            return;
        }

        await this.displaySnapshot();
        await this.stopCurrentTask();
    }

    /**
     * Stop playback.
     */
    async stop() {
        console.info('Stopping playback');

        this.currentStream = null;

        // hide everything
        this.display(DISPLAY_NONE);

        await this.stopCurrentTask();
    }

    /**
     * Stop the current playback task.
     */
    async stopCurrentTask() {
        if (!this.task) {
            return;
        }

        let task = this.task;
        this.task = null;
        await task.cancel();
    }

    /**
     * Start playback from a given MP4 stream URL.
     *
     * @param {string} url MP4 stream URL
     */
    async playMP4Stream(url) {
        this.videoElem.onplaying = () => {
            this.updateState(STATE_PLAYING);
        };

        this.videoElem.onwaiting = () => {
            this.updateState(STATE_WAITING);
        };

        this.videoElem.onerror = (e) => {
            this.updateState(STATE_ERROR, e.target.error);
        };

        this.videoElem.onended = () => {
            this.updateState(STATE_ENDED);
        };

        this.videoElem.src = url;

        this.display(DISPLAY_H264);

        this.task = {
            cancel: async () => {
                this.videoElem.onplaying = null;
                this.videoElem.onwaiting = null;
                this.videoElem.onerror = null;
                this.videoElem.onended = null;

                this.updateState(STATE_STOPPED);

                this.videoElem.src = '';
            },
        };

        await this.videoElem.play();
    }

    /**
     * Start playback from a given MJPEG URL.
     *
     * @param {string} url MJPEG stream URL
     */
    async playMJPEGStream(url) {
        let reader = await GoodCam.MJPEGReader.fetch(url);

        this.replaceMJPEGFrame(null);
        this.display(DISPLAY_MJPEG);
        this.processMJPEGStream(reader);

        this.task = reader;
    }

    /**
     * Process a given MJPEG stream.
     *
     * @param {MJPEGReader} stream mjpeg stream
     */
    async processMJPEGStream(stream) {
        let count = 0;
        let frame;

        try {
            while ((frame = await stream.readFrame()) !== null) {
                this.replaceMJPEGFrame(frame);

                this.retryDelay = 0;

                if (count === 0) {
                    this.updateState(STATE_PLAYING);
                }

                count++;
            }
        } catch (e) {
            this.updateState(STATE_ERROR, e);
        }

        if (stream.cancelled) {
            this.updateState(STATE_STOPPED);
        } else {
            this.updateState(STATE_ENDED);
        }
    }

    /**
     * Display a given MJPEG frame.
     *
     * @param {Blob} frame an MJPEG frame to be displayed
     */
    replaceMJPEGFrame(frame) {
        let previous = this.videoImg.src;

        if (frame) {
            this.videoImg.src = URL.createObjectURL(frame);
        } else {
            this.videoImg.src = '';
        }

        if (previous.length > 0) {
            URL.revokeObjectURL(previous);
        }
    }

    /**
     * Fetch a new snapshot and display it.
     */
    async displaySnapshot() {
        try {
            let snapshot = await this.getSnapshotUrl();

            if (!snapshot) {
                return;
            }

            let r = await this.fetch(snapshot);

            if (r.status != 200) {
                throw new Error(`server responded with HTTP ${r.status} ${r.statusText}`);
            }

            let data = await r.blob();

            let previous = this.snapshotImg.src;

            this.snapshotImg.src = URL.createObjectURL(data);

            if (previous.length > 0) {
                URL.revokeObjectURL(previous);
            }

            this.display(DISPLAY_SNAPSHOT);
        } catch (e) {
            console.warn(`Unable to display a snapshot: ${e}`);
        }
    }

    /**
     * Display a given element.
     *
     * @param {string} what one of the DISPLAY_xxx constants
     */
    display(what) {
        this.videoImg.style.display = what == DISPLAY_MJPEG ? 'block' : 'none';
        this.videoElem.style.display = what == DISPLAY_H264 ? 'block' : 'none';
        this.snapshotImg.style.display = what == DISPLAY_SNAPSHOT ? 'block' : 'none';
    }

    /**
     * Handle playback state change.
     *
     * @param {string} state one of the STATE_xxx constants
     * @param {object} error error object if the state is STATE_ERROR
     */
    updateState(state, error) {
        // clear the timeout if we're out of the waiting state
        if (state !== STATE_WAITING) {
            if (this.playbackTimeout) {
                clearTimeout(this.playbackTimeout);
            }
            this.playbackTimeout = null;
        }

        if (this.state === STATE_STOPPED && state !== STATE_PLAY) {
            return;
        }

        if (state === STATE_PLAY) {
            console.info('Starting playback');
        } else if (state === STATE_PLAYING) {
            this.retryDelay = 0;

            if (this.state === STATE_PLAY) {
                console.debug('Playback started');
            } else {
                console.debug('Playback resumed');
            }
        } else if (state === STATE_WAITING) {
            if (this.state === STATE_PLAY) {
                return;
            } else if (this.state === STATE_PLAYING) {
                console.debug('Waiting for video data');
                this.playbackTimeout = setTimeout(() => {
                    this.updateState('timeout');
                }, 10000);
            }
        } else if (state === STATE_TIMEOUT && this.state === STATE_WAITING) {
            console.info('Video stream timeout');
            setTimeout(() => {
                this.play();
            }, 0);
        } else if (state === STATE_ENDED && this.state === STATE_PLAYING) {
            console.info('Unexpected end of video stream');
            setTimeout(() => {
                this.play();
            }, 0);
        } else if (state === STATE_ERROR) {
            setTimeout(() => {
                this.onPlaybackError(error);
            });
        } else if (state === STATE_STOPPED) {
            console.info('Playback stopped');
        }

        this.state = state;
    }

    /**
     * Handle a given playback error.
     *
     * @param {object} e
     */
    async onPlaybackError(e) {
        // do not report anything or start the playback again if the error was
        // caused after the playback has been stopped
        if (this.state === STATE_STOPPED) {
            return;
        }

        console.warn(`Playback error: ${e}`);

        if (this.retryDelay > 0) {
            console.info(`Retry in ${this.retryDelay / 1000}s`);

            // wait for the retry to avoid looping through errors without any
            // delay
            await sleep(this.retryDelay);
        }

        // check if we can still restart the playback (note that the playback
        // could have been stopped during the retry delay)
        if (this.state !== STATE_STOPPED) {
            this.play();
        }
    }
}

/**
 * Video player designed to play video streams from GoodCam cameras.
 */
class VideoPlayer {
    /**
     * Create a new video player instance. You can use the following options
     * to configure the player:
     *
     * - address: address of the IP camera
     * - parent: Parent element where the player will be inserted. It can be
     *   either the element itself or a selector.
     * - autoplay: set to true to start the video playback automatically
     * - muted: set to true to mute audio (it will be done automatically if
     *   autoplay === true)
     * - stream: name of the stream to start
     *
     * @param {object} options
     */
    constructor(options) {
        this.inner = new InternalVideoPlayer(options);
    }

    /**
     * Start playback of a given stream.
     *
     * @param {string} streamName stream name (may be `null` or `undefined` to
     * resume paused playback)
     */
    async play(streamName) {
        await this.inner.play(streamName);
    }

    /**
     * Pause the playback.
     *
     * NOTE: This method does not actually pause the playback because a live
     * stream cannot be paused. It stops the playback instead and displays a
     * snapshot.
     */
    async pause() {
        await this.inner.pause();
    }

    /**
     * Stop the playback.
     */
    async stop() {
        await this.inner.stop();
    }
}

if (window) {
    if (!window.GoodCam) {
        window.GoodCam = {};
    }

    window.GoodCam.VideoPlayer = VideoPlayer;
    window.GoodCam.AutoplayError = AutoplayError;
}

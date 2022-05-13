/**
 * WebRTC streaming session.
 */
class StreamingSession {
    /**
     * Create a new streaming session.
     *
     * @param {String} url WebRTC signaling URL
     * @param {Element} videoElem video element that will display the video
     * content
     */
    constructor(videoElem) {
        this.videoElem = videoElem;

        this.bufferLocalICECandidates = true;
        this.bufferedLocalICECandidates = [];

        this.bufferRemoteICECandidates = true;
        this.bufferedRemoteICECandidates = [];

        this.connection = null;
        this.ws = null;
    }

    /**
     * Connect to a given signaling URL and start streaming.
     *
     * @param {String} url WebRTC signaling URL
     * @param {Array} stunServers STUN servers
     */
    async connect(url, stunServers) {
        stunServers = stunServers || [];

        this.connection = new RTCPeerConnection({
            iceServers: stunServers.map((server) => ({
                urls: `stun:${server}`,
            })),
        });

        this.connection.onicecandidate = (e) => this.sendLocalCandidate(e.candidate);
        this.connection.ontrack = (e) => {
            this.videoElem.srcObject = new MediaStream([e.track]);
            this.videoElem.play();
        };

        this.ws = await new Promise((resolve, reject) => {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                ws.onopen = null;
                ws.onerror = (err) => this.terminate(err);
                ws.onclose = () => this.terminate();
                ws.onmessage = (msg) => this.processWsMessage(msg);

                resolve(ws);
            };

            ws.onerror = (err) => {
                ws.onopen = null;
                ws.onerror = null;

                reject(err);
            };
        });

        this.sendMessage({
            type: 'hello',
            stun_servers: stunServers,
        });
    }

    /**
     * Terminate the streaming session.
     *
     * @param {*} err possible error
     */
    terminate(err) {
        if (err) {
            console.error(err);
        }

        if (this.connection !== null) {
            this.connection.onicecandidate = null;
            this.connection.ontrack = null;

            this.connection.close();

            this.connection = null;
        }

        if (this.ws !== null) {
            this.ws.onerror = null;
            this.ws.onclose = null;
            this.ws.onmessage = null;

            this.ws.close();

            this.ws = null;
        }

        this.bufferLocalICECandidates = true;
        this.bufferedLocalICECandidates = [];

        this.bufferRemoteICECandidates = true;
        this.bufferedRemoteICECandidates = [];
    }

    /**
     * Send a given signaling message.
     *
     * @param {*} msg a message to be sent
     */
    sendMessage(msg) {
        console.debug("Sending signaling message", msg);
        this.ws.send(JSON.stringify(msg));
    }

    /**
     * Send a given answer.
     *
     * @param {*} answer answer generated by RTCPeerConnection
     */
    sendAnswer(answer) {
        this.sendMessage({
            type: 'answer',
            sdp: answer.sdp,
        });
    }

    /**
     * Send a given local candidate.
     *
     * @param {*} candidate local candidate generated by RTCPeerConnection
     */
    sendLocalCandidate(candidate) {
        if (this.bufferLocalICECandidates) {
            this.bufferedLocalICECandidates.push(candidate);
        } else {
            this.sendMessage({
                type: 'candidate',
                candidate: candidateToMessage(candidate),
            });
        }
    }

    /**
     * Process a given WS message event.
     *
     * @param {*} msg a WS message event
     */
    processWsMessage(msg) {
        if (msg.type === "message") {
            this.processMessage(JSON.parse(msg.data));
        }
    }

    /**
     * Process a given signaling message.
     *
     * @param {*} msg incoming signaling message
     */
    processMessage(msg) {
        console.debug("Signaling message received", msg);

        if (msg.type === "offer") {
            this.processOffer(msg.sdp);
        } else if (msg.type === "candidate") {
            this.processRemoteCandidate(msg.candidate);
        } else {
            console.warn("Unknown signaling message received", msg);
        }
    }

    /**
     * Process a given offer.
     *
     * @param {*} offer WebRTC offer
     */
    async processOffer(offer) {
        try {
            await this.connection.setRemoteDescription({
                type: 'offer',
                sdp: offer,
            });

            // we can accept remote candidates once the remote description has
            // been set
            this.bufferRemoteICECandidates = false;
            for (let candidate of this.bufferedRemoteICECandidates) {
                this.processRemoteCandidate(candidate);
            }
            this.bufferedRemoteICECandidates = [];

            const answer = await this.connection.createAnswer();

            this.sendAnswer(answer);

            // we can send local candidates once the SDP answer has been sent
            this.bufferLocalICECandidates = false;
            for (let candidate of this.bufferedLocalICECandidates) {
                this.sendLocalCandidate(candidate);
            }
            this.bufferedLocalICECandidates = [];

            await this.connection.setLocalDescription(answer);
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Process a given remote candidate.
     *
     * @param {*} candidate remote candidate
     */
    async processRemoteCandidate(candidate) {
        if (this.bufferRemoteICECandidates) {
            this.bufferedRemoteICECandidates.push(candidate);
        } else {
            try {
                await this.connection.addIceCandidate(candidateFromMessage(candidate));
            } catch (e) {
                console.error(e);
            }
        }
    }
}

/**
 * Create a candidate from a given candidate message payload.
 *
 * @param {*} msg candidate message payload
 * @returns candidate
 */
function candidateFromMessage(msg) {
    if (!msg) {
        return null;
    }

    return {
        candidate: msg['candidate'],
        sdpMid: msg['mid'],
        usernameFragment: msg['username_fragment'],
    }
}

/**
 * Create a candidate message payload from a given candidate.
 *
 * @param {*} candidate candidate
 * @returns candidate message payload
 */
function candidateToMessage(candidate) {
    if (!candidate) {
        return null;
    }

    return {
        'candidate': candidate.candidate,
        'mid': candidate.sdpMid,
        'username_fragment': candidate.usernameFragment,
    }
}

/**
 * Video player.
 */
class VideoPlayer {
    /**
     * Create a new video player.
     *
     * @param {Element} videoElem video element
     */
    constructor(videoElem) {
        this.session = new StreamingSession(videoElem);
        this.connect = null;
    }

    /**
     * Start playback.
     *
     * @param {String} url WebRTC signaling URL
     * @param {Array} stunServers STUN servers
     */
    play(url, stunServers) {
        console.info(`Starting video playback from ${url}`);

        this.connect = this.session.connect(url, stunServers);
    }

    /**
     * Stop playback.
     */
    async stop() {
        if (!this.connect) {
            return;
        }

        console.info("Stopping video playback");

        await this.connect;

        this.session.terminate();
        this.connect = null;
    }
}

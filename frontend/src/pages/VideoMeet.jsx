import React, { useCallback, useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { Badge, IconButton, TextField } from "@mui/material";
import { Button } from "@mui/material";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import "../styles/videoComponent.css";
import CallEndIcon from "@mui/icons-material/CallEnd";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import server from "../environment";

const server_url = server;

var connections = {};

const peerConfigConnections = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const createMediaConstraints = (videoEnabled, audioEnabled) => ({
  video: videoEnabled
    ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 30 },
        facingMode: "user",
      }
    : false,
  audio: audioEnabled
    ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    : false,
});

const StreamVideo = React.memo(function StreamVideo({
  stream,
  className,
  muted = false,
  onClick,
  videoRef,
}) {
  const elementRef = useRef(null);

  useEffect(() => {
    if (elementRef.current && elementRef.current.srcObject !== stream) {
      elementRef.current.srcObject = stream || null;
    }
  }, [stream]);

  return (
    <video
      className={className}
      ref={(element) => {
        elementRef.current = element;
        if (videoRef) videoRef.current = element;
      }}
      autoPlay
      muted={muted}
      playsInline
      onClick={onClick}
    />
  );
});

export default function VideoMeetComponent() {
  var socketRef = useRef();
  let socketIdRef = useRef();

  let localVideoref = useRef();

  let [videoAvailable, setVideoAvailable] = useState(true);

  let [audioAvailable, setAudioAvailable] = useState(true);

  let [video, setVideo] = useState(false);

  let [audio, setAudio] = useState();

  let [screen, setScreen] = useState(false);

  let [showModal, setModal] = useState(false);

  let [screenAvailable, setScreenAvailable] = useState();

  let [messages, setMessages] = useState([]);

  let [message, setMessage] = useState("");

  let [newMessages, setNewMessages] = useState(0);

  let [askForUsername, setAskForUsername] = useState(true);

  let [username, setUsername] = useState("");

  const videoRef = useRef([]);

  let [videos, setVideos] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [featuredVideo, setFeaturedVideo] = useState("remote");
  const [pipPosition, setPipPosition] = useState(null);
  const dragRef = useRef(null);
  const ignorePipClickRef = useRef(false);
  const pendingCandidatesRef = useRef({});
  const lastRemoteVideoRef = useRef("remote");

  // TODO
  // if(isChrome() === false) {

  // }

  // Permissions are requested only once when the lobby opens.
  useEffect(() => {
    console.log("HELLO");
    getPermissions();
    // The permission check intentionally runs only once per lobby visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  let getDislayMedia = () => {
    if (screen) {
      if (navigator.mediaDevices.getDisplayMedia) {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: true })
          .then(getDislayMediaSuccess)
          .then((stream) => {})
          .catch((e) => console.log(e));
      }
    }
  };

  const getPermissions = async () => {
    let canUseVideo = false;
    let canUseAudio = false;

    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({
        video: createMediaConstraints(true, false).video,
      });
      canUseVideo = true;
      videoPermission.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.log("Video permission denied:", error);
    }

    try {
      const audioPermission = await navigator.mediaDevices.getUserMedia({
        audio: createMediaConstraints(false, true).audio,
      });
      canUseAudio = true;
      audioPermission.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.log("Audio permission denied:", error);
    }

    setVideoAvailable(canUseVideo);
    setAudioAvailable(canUseAudio);
    setScreenAvailable(Boolean(navigator.mediaDevices.getDisplayMedia));

    if (canUseVideo || canUseAudio) {
      try {
        const userMediaStream = await navigator.mediaDevices.getUserMedia(
          createMediaConstraints(canUseVideo, canUseAudio),
        );
        window.localStream = userMediaStream;
        setLocalStream(userMediaStream);
      } catch (error) {
        console.log("Could not start camera:", error);
      }
    }
  };

  // Media should refresh only when either control is changed.
  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
      console.log("SET STATE HAS ", video, audio);
    }
    // The stream refresh should be triggered only by the two control states.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video, audio]);
  let getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  let getUserMediaSuccess = (stream) => {
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    setLocalStream(stream);

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      window.localStream.getTracks().forEach((track) =>
        connections[id].addTrack(track, window.localStream),
      );

      connections[id].createOffer().then((description) => {
        console.log(description);
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription }),
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setVideo(false);
          setAudio(false);

          try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          setLocalStream(window.localStream);

          for (let id in connections) {
            window.localStream.getTracks().forEach((track) =>
              connections[id].addTrack(track, window.localStream),
            );

            connections[id].createOffer().then((description) => {
              connections[id]
                .setLocalDescription(description)
                .then(() => {
                  socketRef.current.emit(
                    "signal",
                    id,
                    JSON.stringify({ sdp: connections[id].localDescription }),
                  );
                })
                .catch((e) => console.log(e));
            });
          }
        }),
    );
  };

  let getUserMedia = () => {
    const constraints = createMediaConstraints(
      video && videoAvailable,
      audio && audioAvailable,
    );

    if (constraints.video || constraints.audio) {
      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(getUserMediaSuccess)
        .catch((error) => console.log("Camera error:", error));
    } else {
      try {
        let tracks = localVideoref.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      } catch (e) {}
    }
  };

  let getDislayMediaSuccess = (stream) => {
    console.log("HERE");
    try {
      window.localStream.getTracks().forEach((track) => track.stop());
    } catch (e) {
      console.log(e);
    }

    window.localStream = stream;
    setLocalStream(stream);

    for (let id in connections) {
      if (id === socketIdRef.current) continue;

      window.localStream.getTracks().forEach((track) =>
        connections[id].addTrack(track, window.localStream),
      );

      connections[id].createOffer().then((description) => {
        connections[id]
          .setLocalDescription(description)
          .then(() => {
            socketRef.current.emit(
              "signal",
              id,
              JSON.stringify({ sdp: connections[id].localDescription }),
            );
          })
          .catch((e) => console.log(e));
      });
    }

    stream.getTracks().forEach(
      (track) =>
        (track.onended = () => {
          setScreen(false);

          try {
            let tracks = localVideoref.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
          } catch (e) {
            console.log(e);
          }

          let blackSilence = (...args) =>
            new MediaStream([black(...args), silence()]);
          window.localStream = blackSilence();
          setLocalStream(window.localStream);

          getUserMedia();
        }),
    );
  };

  const addOrUpdateRemoteVideo = (socketId, stream) => {
    setVideos((currentVideos) => {
      const alreadyExists = currentVideos.some(
        (item) => item.socketId === socketId,
      );
      const updatedVideos = alreadyExists
        ? currentVideos.map((item) =>
            item.socketId === socketId ? { ...item, stream } : item,
          )
        : [...currentVideos, { socketId, stream }];

      videoRef.current = updatedVideos;
      return updatedVideos;
    });
  };

  const createPeerConnection = (peerId) => {
    if (connections[peerId]) return connections[peerId];

    const connection = new RTCPeerConnection(peerConfigConnections);
    connections[peerId] = connection;

    const stream = window.localStream;
    if (stream) {
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
    }

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit(
          "signal",
          peerId,
          JSON.stringify({ ice: event.candidate }),
        );
      }
    };

    connection.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) addOrUpdateRemoteVideo(peerId, stream);
    };

    connection.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(connection.connectionState)) {
        delete connections[peerId];
      }
    };

    return connection;
  };

  const sendOffer = async (peerId) => {
    const connection = createPeerConnection(peerId);
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    socketRef.current.emit(
      "signal",
      peerId,
      JSON.stringify({ sdp: connection.localDescription }),
    );
  };

  const gotMessageFromServer = async (fromId, message) => {
    if (fromId === socketIdRef.current) return;

    try {
      const signal = JSON.parse(message);
      const connection = createPeerConnection(fromId);

      if (signal.sdp) {
        await connection.setRemoteDescription(
          new RTCSessionDescription(signal.sdp),
        );

        const queuedCandidates = pendingCandidatesRef.current[fromId] || [];
        for (const candidate of queuedCandidates) {
          await connection.addIceCandidate(new RTCIceCandidate(candidate));
        }
        delete pendingCandidatesRef.current[fromId];

        if (signal.sdp.type === "offer") {
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          socketRef.current.emit(
            "signal",
            fromId,
            JSON.stringify({ sdp: connection.localDescription }),
          );
        }
      }

      if (signal.ice) {
        if (connection.remoteDescription) {
          await connection.addIceCandidate(new RTCIceCandidate(signal.ice));
        } else {
          pendingCandidatesRef.current[fromId] = [
            ...(pendingCandidatesRef.current[fromId] || []),
            signal.ice,
          ];
        }
      }
    } catch (error) {
      console.error("WebRTC signal error:", error);
    }
  };

  let connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });
    socketRef.current.on("signal", gotMessageFromServer);
    socketRef.current.on("chat-message", addMessage);

    socketRef.current.on("user-left", (id) => {
      connections[id]?.close();
      delete connections[id];
      setVideos((currentVideos) => {
        const updatedVideos = currentVideos.filter(
          (item) => item.socketId !== id,
        );
        videoRef.current = updatedVideos;
        return updatedVideos;
      });
    });

    socketRef.current.on("existing-users", async (existingUserIds) => {
      for (const peerId of existingUserIds) {
        await sendOffer(peerId);
      }
    });

    socketRef.current.on("connect", () => {
      socketIdRef.current = socketRef.current.id;
      socketRef.current.emit("join-call", window.location.href);
    });
  };

  let silence = () => {
    let ctx = new AudioContext();
    let oscillator = ctx.createOscillator();
    let dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };
  let black = ({ width = 640, height = 480 } = {}) => {
    let canvas = Object.assign(document.createElement("canvas"), {
      width,
      height,
    });
    canvas.getContext("2d").fillRect(0, 0, width, height);
    let stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  //   let routeTo = useNavigate();

  let handleVideo = () => {
    setVideo(!video);
    // getUserMedia();
  };
  let handleAudio = () => {
    setAudio(!audio);
    // getUserMedia();
  };

  // Screen capture starts only after its control is enabled.
  useEffect(() => {
    if (screen !== undefined) {
      getDislayMedia();
    }
    // Screen capture should only react to the screen-share control.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);
  let handleScreen = () => {
    setScreen(!screen);
  };

  let handleEndCall = () => {
    try {
      let tracks = localVideoref.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    } catch (e) {}
    window.location.href = "/";
    // routeTo("/home");
  };

  let closeChat = () => {
    setModal(false);
  };

  const addMessage = (data, sender, socketIdSender) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: sender, data: data },
    ]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages((prevNewMessages) => prevNewMessages + 1);
    }
  };

  let sendMessage = () => {
    console.log(socketRef.current);
    socketRef.current.emit("chat-message", message, username);
    setMessage("");

    // this.setState({ message: "", sender: username })
  };

  let connect = () => {
    setAskForUsername(false);
    getMedia();
  };

  const switchFeaturedVideo = useCallback(() => {
    if (ignorePipClickRef.current) {
      ignorePipClickRef.current = false;
      return;
    }

    setFeaturedVideo((current) => {
      if (current === "local") return lastRemoteVideoRef.current;

      lastRemoteVideoRef.current = current;
      return "local";
    });
  }, []);

  const featureRemoteVideo = (socketId) => {
    lastRemoteVideoRef.current = socketId;
    setFeaturedVideo(socketId);
  };

  const handlePipPointerDown = (event) => {
    if (event.button !== 0) return;

    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePipPointerMove = (event) => {
    if (!dragRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const left = Math.min(
      Math.max(event.clientX - dragRef.current.offsetX, 8),
      window.innerWidth - rect.width - 8,
    );
    const top = Math.min(
      Math.max(event.clientY - dragRef.current.offsetY, 8),
      window.innerHeight - rect.height - 8,
    );

    dragRef.current.moved = true;
    setPipPosition({ left, top });
  };

  const handlePipPointerUp = (event) => {
    const wasDragged = dragRef.current?.moved;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragRef.current = null;
    ignorePipClickRef.current = wasDragged;
  };

  const renderLocalVideo = (className, onClick) => (
    <StreamVideo
      stream={localStream}
      className={className}
      muted
      onClick={onClick}
      videoRef={localVideoref}
    />
  );

  const renderRemoteVideo = (remoteVideo, className, onClick) => {
    if (!remoteVideo) return null;

    return (
      <StreamVideo
        stream={remoteVideo.stream}
        className={className}
        onClick={onClick}
      />
    );
  };

  const featuredRemoteVideo =
    videos.find((item) => item.socketId === featuredVideo) || videos[0];

  return (
    <div>
      {askForUsername === true ? (
        <main className="lobbyContainer">
          <section className="lobbyCard">
            <h2>Enter the lobby</h2>
            <div className="lobbyActions">
              <TextField
                fullWidth
                id="outlined-basic"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                variant="outlined"
              />
              <Button variant="contained" onClick={connect}>
                Connect
              </Button>
            </div>

            <StreamVideo
              stream={localStream}
              className="lobbyPreview"
              muted
              videoRef={localVideoref}
            />
          </section>
        </main>
      ) : (
        <div className={`meetVideoContainer${showModal ? " chatIsOpen" : ""}`}>
          {showModal ? (
            <div className="chatRoom">
              <div className="chatContainer">
                <div className="chatHeader">
                  <h1>Chat</h1>
                  <IconButton aria-label="Close chat" onClick={closeChat}>
                    <CloseIcon />
                  </IconButton>
                </div>

                <div className="chattingDisplay">
                  {messages.length !== 0 ? (
                    messages.map((item, index) => {
                      console.log(messages);
                      return (
                        <div style={{ marginBottom: "20px" }} key={index}>
                          <p style={{ fontWeight: "bold" }}>{item.sender}</p>
                          <p>{item.data}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p>No Messages Yet</p>
                  )}
                </div>

                <div className="chattingArea">
                  <TextField
                    fullWidth
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    id="outlined-basic"
                    label="Enter Your chat"
                    variant="outlined"
                  />
                  <Button variant="contained" onClick={sendMessage}>
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <></>
          )}

          <div className="buttonContainers" aria-label="Meeting controls">
            <IconButton onClick={handleVideo} style={{ color: "white" }}>
              {video === true ? <VideocamIcon /> : <VideocamOffIcon />}
            </IconButton>
            <IconButton onClick={handleEndCall} style={{ color: "red" }}>
              <CallEndIcon />
            </IconButton>
            <IconButton onClick={handleAudio} style={{ color: "white" }}>
              {audio === true ? <MicIcon /> : <MicOffIcon />}
            </IconButton>

            {screenAvailable === true ? (
              <IconButton onClick={handleScreen} style={{ color: "white" }}>
                {screen === true ? (
                  <ScreenShareIcon />
                ) : (
                  <StopScreenShareIcon />
                )}
              </IconButton>
            ) : (
              <></>
            )}

            <Badge badgeContent={newMessages} max={999} color="secondary">
              <IconButton
                onClick={() => setModal(!showModal)}
                style={{ color: "white" }}
              >
                <ChatIcon />{" "}
              </IconButton>
            </Badge>
          </div>

          <div className="callStage">
            {featuredVideo === "local" || !featuredRemoteVideo
              ? renderLocalVideo("stageVideo", switchFeaturedVideo)
              : renderRemoteVideo(
                  featuredRemoteVideo,
                  "stageVideo",
                  switchFeaturedVideo,
                )}
          </div>

          {videos.length > 0 && (
            <div
              className="floatingVideo"
              style={
                pipPosition
                  ? {
                      left: `${pipPosition.left}px`,
                      top: `${pipPosition.top}px`,
                      right: "auto",
                      bottom: "auto",
                    }
                  : undefined
              }
              onPointerDown={handlePipPointerDown}
              onPointerMove={handlePipPointerMove}
              onPointerUp={handlePipPointerUp}
              onClick={switchFeaturedVideo}
            >
              {featuredVideo === "local"
                ? renderRemoteVideo(featuredRemoteVideo, "pipVideo")
                : renderLocalVideo("pipVideo")}
            </div>
          )}

          {videos.length > 1 && (
            <div className="participantStrip" aria-label="Other participants">
              {videos
                .filter((item) => item.socketId !== featuredRemoteVideo?.socketId)
                .map((item) => (
                  <button
                    className="participantThumbnail"
                    key={item.socketId}
                    type="button"
                    onClick={() => featureRemoteVideo(item.socketId)}
                  >
                    <StreamVideo stream={item.stream} className="thumbnailVideo" />
                  </button>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

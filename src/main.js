import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  getDoc,
  collection,
  setDoc,
  doc,
  onSnapshot,
  addDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";


// -------------------------------------------
// IMPORTANT: Create your own Firebase project, 
// then configure it in src/firebase-config.js.
// -------------------------------------------
import firebaseConfig from "./firebase-config.js"

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// STUN server configuration
// This is used to establish a WebRTC connection.
const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Create a new RTCPeerConnection
let pc = new RTCPeerConnection(servers);

// Getting the video stream from the user's device as a MediaStream
let remoteStream = new MediaStream();

// Get the remote video stream from the RTCPeerConnection, created from the application.
pc.ontrack = (e) => {
  e.streams[0].getTracks().forEach((track) => {
    remoteStream.addTrack(track);
  });
};

// Then set the source of the video element to the remote stream,
// so that the screen (video and audio) can be displayed in the browser.
document.getElementById("remote").srcObject = remoteStream;

const videoBox = document.getElementById("remote");

let remoteChannel;

pc.ondatachannel = (event) => {
  // Getting the data channel from the event
  remoteChannel = event.channel;

  remoteChannel.onopen = () => {
    // When the data channel is open, we can start sending mouse and keyboard events
    videoBox.addEventListener("mousemove", (event) => {
      const rect = videoBox.getBoundingClientRect(); // Get element's position on the page
      const x = event.clientX - rect.left; // Mouse X relative to element
      const y = event.clientY - rect.top;

      // Scale to 1920x1080 virtual resolution
      const virtualX = (x / rect.width) * 1920;
      const virtualY = (y / rect.height) * 1080;

      // Send mouse move event to the peer connection, making the remote desktop 
      // responsive to mouse movements.
      remoteChannel.send(
        JSON.stringify({
          x: virtualX.toFixed(0),
          y: virtualY.toFixed(0),
          type: "mousemove",
        })
      );
    });

    // Listening for mouse and keyboard events and sending them to the remote peer
    videoBox.addEventListener("mousedown", (event) => {
      let button;
      if (event.button === 0) {
        button = "left"
      } else if (event.button === 2) {
        button = "right";
      }
      remoteChannel.send(
        JSON.stringify({
          type: "mousedown",
          button: button
        })
      );
    });

    // Handling mouse up events to stop the mouse click
    // not making the mouse to hold its click.
    videoBox.addEventListener("mouseup", (event) => {
      let button;
      if (event.button === 0) {
        button = "left"
      } else if (event.button === 2) {
        button = "right";
      }
      remoteChannel.send(
        JSON.stringify({
          type: "mouseup",
          button: button
        })
      );
    });

    // Sending keyboard events to the remote peer
    // This allows the user to type on the remote desktop.
    document.addEventListener("keydown", (event) => {
      remoteChannel.send(
        JSON.stringify({
          type: "keydown",
          key: event.key,
        })
      );
      console.log("Key down:", event.key);
    });

    document.addEventListener("keyup", (event) => {
      remoteChannel.send(
        JSON.stringify({
          type: "keyup",
          key: event.key.toUpperCase(),
        })
      );
    });


    // Sending scroll events to the remote peer
    // This allows the user to scroll on the remote desktop.
    document.addEventListener("wheel", (event) => {
      console.log("Scroll event:", event.deltaY);
      remoteChannel.send(
        JSON.stringify({
          type: "scroll",
          delta: event.deltaY * (-1) / 100,
        })
      );
    });
  };
};

// Preventing right-click context menu on the video element
// This is to ensure that when right-clicking on the video, the context menu does not appear,
// making it easier to interact with the remote desktop.
videoBox.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

const answerButton = document.getElementById("answerButton");

answerButton.addEventListener("click", async (e) => {
  e.preventDefault();

  // Getting the ID from the input field,
  // connecting to the RTCPeerConnection
  // and setting up the answer to the call.
  const answerId = document.getElementById("answerId").value;
  const callDocRef = doc(db, "calls", answerId);
  const callDoc = await getDoc(callDocRef);
  const offer = callDoc.data();

  // Creating offer and answer ICE candidates, establishing the connection
  // and setting up the data channel for communication.
  const answerCandidateRef = await collection(callDocRef, "answerCandidates");
  const offerCandidateRef = await collection(callDocRef, "offerCandidates");

  // Creating ICE candidates for the answer, which the application will
  // add to its ICE candidates.
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(answerCandidateRef, event.candidate.toJSON());
    }
  };

  // Setting the remote description with the offer received from the application.
  await pc.setRemoteDescription(offer);

  // Creating an answer to the offer and setting it as the local description.
  const answer = await pc.createAnswer();
  await pc
    .setLocalDescription(answer)
    .then(async () => {
      await setDoc(callDocRef, answer);
    })
    .catch((e) => console.log(e));

  // Listening for ICE candidates from the offer and adding them to our ICE candidates.
  const snapshotRemoteCandidate = onSnapshot(offerCandidateRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        pc.addIceCandidate(change.doc.data());
      }
    });
  });
});

const callDocsRef = collection(db, "calls");

// Listen for calls in the "calls" collection
// and display the IDs of new offers in the "callerIds" div.
const getIds = onSnapshot(callDocsRef, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
      const id = change.doc.id;
      const type = change.doc.data().type;
      if (type === "offer") {
        const newDiv = document.createElement("div");
        newDiv.textContent = "New offer ID: " + id;
        newDiv.className = "callerId";
        document.getElementById("callerIds").prepend(newDiv);
      }
    }
  });
});

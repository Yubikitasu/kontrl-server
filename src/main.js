const video = document.querySelector("video");

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import {
  getFirestore,
  getDoc,
  collection,
  setDoc,
  doc,
  onSnapshot,
  addDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import firebaseConfig from "./firebase-config.js"

// Change your firebase config
// Create your own Firebase project, set up your own Firestore, then config it here.

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Global states

let pc = new RTCPeerConnection(servers);

let remoteStream = new MediaStream();

pc.ontrack = (e) => {
  e.streams[0].getTracks().forEach((track) => {
    remoteStream.addTrack(track);
    // console.log("Got track: ", track);
  });
};

const videoBox = document.getElementById("remote");

let remoteChannel;

pc.ondatachannel = (event) => {
  remoteChannel = event.channel;

  remoteChannel.onopen = () => {
    let timeoutId;

    videoBox.addEventListener("mousemove", (event) => {
      const rect = videoBox.getBoundingClientRect(); // Get element's position on the page
      const x = event.clientX - rect.left; // Mouse X relative to element
      const y = event.clientY - rect.top;

      // Scale to 1920x1080 virtual resolution
      const virtualX = (x / rect.width) * 1920;
      const virtualY = (y / rect.height) * 1080;

      remoteChannel.send(
        JSON.stringify({
          x: virtualX.toFixed(0),
          y: virtualY.toFixed(0),
          type: "mousemove",
        })
      );
    });

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
    })
  };
};

videoBox.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

document.getElementById("remote").srcObject = remoteStream;

const answerButton = document.getElementById("answerButton");

answerButton.addEventListener("click", async (e) => {
  e.preventDefault();

  const answerId = document.getElementById("answerId").value;
  const callDocRef = doc(db, "calls", answerId);
  const callDoc = await getDoc(callDocRef);
  const offer = callDoc.data();

  const answerCandidateRef = await collection(callDocRef, "answerCandidates");
  const offerCandidateRef = await collection(callDocRef, "offerCandidates");

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      addDoc(answerCandidateRef, event.candidate.toJSON());
      // .then(console.log("Added answer candidate."))
      // .catch(e => {console.log("Something happended! Error: ", e)});
      // console.log(event.candidate.toJSON());
    }
  };

  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc
    .setLocalDescription(answer)
    .then(async () => {
      await setDoc(callDocRef, answer);
      console.log("Answered call");
    })
    .catch((e) => console.log(e));
  // console.log(callDoc.data());

  const snapshotRemoteCandidate = onSnapshot(offerCandidateRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        pc.addIceCandidate(change.doc.data());
        // console.log(change.doc.data());
      }
    });
  });

  const videoBox = document.getElementById("remote");
  const cursorRef = await doc(collection(callDocRef, "mouse"), "mousePosition");
});

const callDocsRef = collection(db, "calls");

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
